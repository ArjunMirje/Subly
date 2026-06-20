import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/auth';
import { checkSingleSubscriptionNotification, processAutopayRenewals } from '@/lib/cron';

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    const supabase = await createClientServer();
    const { id } = await params;
    const body = await request.json();
    
    const { name, category, cost, billingCycle, renewalDate, url, notes, autopayEnabled,
            couponId, couponCode, couponDiscount } = body;

    // Fetch existing subscription to identify old coupon
    const { data: oldSub } = await supabase
      .from('subscriptions')
      .select('couponId')
      .eq('id', id)
      .eq('userId', user.id)
      .maybeSingle();
    const oldCouponId = oldSub?.couponId || null;

    // Calculate status dynamically based on renewal date
    const [year, month, day] = renewalDate.split('-').map(Number);
    const renewalMidnight = new Date(year, month - 1, day);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const diffMs = renewalMidnight - todayMidnight;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    
    let calculatedStatus = 'active';
    if (autopayEnabled === true) {
      calculatedStatus = 'active';
    } else if (diffDays < 0) {
      calculatedStatus = 'expired';
    } else if (diffDays <= 5) {
      calculatedStatus = 'expiring-soon';
    }

    let { data: updatedSub, error } = await supabase
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

    // Handle coupon lifecycle status updates
    const newCouponId = 'couponId' in body ? (couponId ?? null) : oldCouponId;
    if (newCouponId !== oldCouponId) {
      // If old coupon was replaced, set it back to Available (unless Consumed)
      if (oldCouponId) {
        const { error: oldCouponErr } = await supabase
          .from('coupons')
          .update({ usageStatus: 'Available' })
          .eq('id', oldCouponId)
          .eq('userId', user.id)
          .neq('usageStatus', 'Consumed');
        if (oldCouponErr) {
          console.warn('Failed to reset old coupon status:', oldCouponErr.message);
        }
      }

      // If new coupon was added, set it to In Use
      if (newCouponId) {
        const { error: newCouponErr } = await supabase
          .from('coupons')
          .update({ usageStatus: 'In Use' })
          .eq('id', newCouponId)
          .eq('userId', user.id);
        if (newCouponErr) {
          console.warn('Failed to update new coupon status:', newCouponErr.message);
        }
      }
    }

    if (autopayEnabled === true) {
      await processAutopayRenewals(supabase);
      const { data: refetched } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();
      if (refetched) {
        updatedSub = refetched;
      }
    }

    await checkSingleSubscriptionNotification(updatedSub);

    return NextResponse.json(updatedSub);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
