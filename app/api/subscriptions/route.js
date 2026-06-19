import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/auth';
import { checkSingleSubscriptionNotification } from '@/lib/cron';

export async function GET(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClientServer();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    let query = supabase
      .from('subscriptions')
      .select('*')
      .eq('userId', user.id)
      .order('renewalDate', { ascending: true });

    if (filter === 'monthly') {
      query = query.ilike('billingCycle', 'monthly');
    } else if (filter === 'yearly') {
      query = query.ilike('billingCycle', 'yearly');
    } else if (filter === 'half-yearly') {
      query = query.ilike('billingCycle', 'half-yearly');
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;
    
    const safeData = subscriptions || [];
    
    // Auto-update statuses based on renewal date
    const today = new Date();
    const updatedSubscriptions = safeData.map(sub => {
      let status = 'active';
      const renewalDate = new Date(sub.renewalDate);
      const diffTime = renewalDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        status = 'expired';
      } else if (diffDays <= 5) {
        status = 'expiring-soon';
      }
      return { ...sub, status };
    });

    return NextResponse.json(updatedSubscriptions);
  } catch (error) {
    console.error("GET /api/subscriptions error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClientServer();
    const body = await request.json();
    const { name, category, cost, billingCycle, renewalDate, url, notes, autopayEnabled,
            couponId, couponCode, couponDiscount } = body;

    // Calculate initial status dynamically based on renewal date
    const [year, month, day] = renewalDate.split('-').map(Number);
    const renewalMidnight = new Date(year, month - 1, day);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const diffMs = renewalMidnight - todayMidnight;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    let initialStatus = 'active';
    if (diffDays < 0) {
      initialStatus = 'expired';
    } else if (diffDays <= 5) {
      initialStatus = 'expiring-soon';
    }

    const { data: newSub, error } = await supabase
      .from('subscriptions')
      .insert([
        { 
          userId: user.id, 
          name, 
          category, 
          cost: parseFloat(cost), 
          billingCycle, 
          renewalDate, 
          status: initialStatus, 
          autopayEnabled: autopayEnabled === true,
          url: url || null, 
          notes: notes || null,
          couponId:       couponId       ?? null,
          couponCode:     couponCode     ?? null,
          couponDiscount: couponDiscount ?? null,
        }
      ])
      .select()
      .single();

    if (error) throw error;

    await checkSingleSubscriptionNotification(newSub);

    return NextResponse.json(newSub, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
