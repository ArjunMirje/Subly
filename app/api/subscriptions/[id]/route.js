import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/auth';
import { checkSingleSubscriptionNotification } from '@/lib/cron';

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { USE_MOCK_DATA } = await import('@/lib/config');
    if (USE_MOCK_DATA) {
      const { id } = await params;
      const { deleteMockSubscription } = await import('@/lib/mock-db');
      deleteMockSubscription(id);
      return NextResponse.json({ success: true });
    }

    const supabase = await createClientServer();
    const { id } = await params;
    
    const { error, count } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id)
      .eq('userId', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { USE_MOCK_DATA } = await import('@/lib/config');
    if (USE_MOCK_DATA) {
      const { id } = await params;
      const body = await request.json();
      const { name, category, cost, billingCycle, renewalDate, url, notes, autopayEnabled,
              couponId, couponCode, couponDiscount } = body;
              
      // Calculate status dynamically based on renewal date
      const [year, month, day] = renewalDate.split('-').map(Number);
      const renewalMidnight = new Date(year, month - 1, day);
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const diffMs = renewalMidnight - todayMidnight;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      
      let calculatedStatus = 'active';
      if (diffDays < 0) {
        calculatedStatus = 'expired';
      } else if (diffDays <= 5) {
        calculatedStatus = 'expiring-soon';
      }
      
      const { saveMockSubscription } = await import('@/lib/mock-db');
      const updatedSub = saveMockSubscription({
        id,
        name,
        category,
        cost: parseFloat(cost),
        billingCycle,
        renewalDate,
        status: calculatedStatus,
        autopayEnabled: autopayEnabled === true,
        url: url || null,
        notes: notes || null,
        couponId:       'couponId'       in body ? (couponId       ?? null) : undefined,
        couponCode:     'couponCode'     in body ? (couponCode     ?? null) : undefined,
        couponDiscount: 'couponDiscount' in body ? (couponDiscount ?? null) : undefined,
      });
      
      await checkSingleSubscriptionNotification(updatedSub);
      
      return NextResponse.json(updatedSub);
    }

    const supabase = await createClientServer();
    const { id } = await params;
    const body = await request.json();
    
    const { name, category, cost, billingCycle, renewalDate, url, notes, autopayEnabled,
            couponId, couponCode, couponDiscount } = body;

    // Calculate status dynamically based on renewal date
    const [year, month, day] = renewalDate.split('-').map(Number);
    const renewalMidnight = new Date(year, month - 1, day);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const diffMs = renewalMidnight - todayMidnight;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    let calculatedStatus = 'active';
    if (diffDays < 0) {
      calculatedStatus = 'expired';
    } else if (diffDays <= 5) {
      calculatedStatus = 'expiring-soon';
    }

    const { data: updatedSub, error } = await supabase
      .from('subscriptions')
      .update({
        name,
        category,
        cost: parseFloat(cost),
        billingCycle,
        renewalDate,
        status: calculatedStatus,
        autopayEnabled: autopayEnabled === true,
        url: url || null,
        notes: notes || null,
        couponId:       'couponId'       in body ? (couponId       ?? null) : undefined,
        couponCode:     'couponCode'     in body ? (couponCode     ?? null) : undefined,
        couponDiscount: 'couponDiscount' in body ? (couponDiscount ?? null) : undefined,
      })
      .eq('id', id)
      .eq('userId', user.id)
      .select()
      .single();

    if (error) throw error;

    await checkSingleSubscriptionNotification(updatedSub);

    return NextResponse.json(updatedSub);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

