import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/auth';
import { checkSingleCouponNotification, processAutopayRenewals } from '@/lib/cron';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClientServer();
    await processAutopayRenewals(supabase);
    
    // Safely query coupons with dynamic fallback if column doesn't exist
    let couponsResult;
    let hasUsageStatusColumn = true;
    
    let queryResult = await supabase
      .from('coupons')
      .select('id, userId, code, discount, expiryDate, service, created_at, usageStatus')
      .eq('userId', user.id)
      .order('expiryDate', { ascending: true });

    if (queryResult.error && queryResult.error.message.includes('usageStatus')) {
      hasUsageStatusColumn = false;
      queryResult = await supabase
        .from('coupons')
        .select('id, userId, code, discount, expiryDate, service, created_at')
        .eq('userId', user.id)
        .order('expiryDate', { ascending: true });
    }

    if (queryResult.error) throw queryResult.error;
    const rawCoupons = queryResult.data || [];

    // Fetch user subscriptions to run lifecycle synchronization
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('id, status, renewalDate, couponId, autopayEnabled')
      .eq('userId', user.id);

    if (subsError) throw subsError;
    const safeSubs = subscriptions || [];

    // Synchronize statuses in real-time
    const updatedCoupons = await Promise.all(rawCoupons.map(async (coupon) => {
      let dbStatus = hasUsageStatusColumn ? (coupon.usageStatus || 'Available') : 'Available';
      
      const linkedSub = safeSubs.find(sub => sub.couponId === coupon.id);
      let computedStatus = dbStatus;

      if (linkedSub) {
        let isCycleCompleted = false;
        if (linkedSub.autopayEnabled) {
          isCycleCompleted = false;
        } else if (linkedSub.status === 'expired') {
          isCycleCompleted = true;
        } else if (linkedSub.renewalDate) {
          const [y, m, d] = linkedSub.renewalDate.split('-').map(Number);
          const renewalMidnight = new Date(y, m - 1, d);
          const todayMidnight = new Date();
          todayMidnight.setHours(0, 0, 0, 0);
          isCycleCompleted = todayMidnight >= renewalMidnight;
        }

        if (isCycleCompleted) {
          computedStatus = 'Consumed';
        } else {
          computedStatus = 'In Use';
        }
      } else {
        if (dbStatus === 'Consumed') {
          computedStatus = 'Consumed';
        } else {
          computedStatus = 'Available';
        }
      }

      if (hasUsageStatusColumn && computedStatus !== dbStatus) {
        await supabase
          .from('coupons')
          .update({ usageStatus: computedStatus })
          .eq('id', coupon.id);
      }

      return {
        ...coupon,
        usageStatus: computedStatus
      };
    }));

    return NextResponse.json(updatedCoupons);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClientServer();
    const body = await request.json();
    const { code, discount, expiryDate, service } = body;

    const dbExpiryDate = (expiryDate === 'Not Specified' || !expiryDate) ? null : expiryDate;

    // Check if duplicate already exists (handle null value check correctly)
    let dupQuery = supabase
      .from('coupons')
      .select('id')
      .eq('userId', user.id)
      .eq('code', code)
      .eq('service', service || '');

    if (dbExpiryDate === null) {
      dupQuery = dupQuery.is('expiryDate', null);
    } else {
      dupQuery = dupQuery.eq('expiryDate', dbExpiryDate);
    }

    const { data: existing, error: checkError } = await dupQuery.maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      return NextResponse.json({ error: 'This coupon already exists.' }, { status: 400 });
    }

    const { data: newCoupon, error } = await supabase
      .from('coupons')
      .insert([{ userId: user.id, code, discount, expiryDate: dbExpiryDate, service: service || '' }])
      .select()
      .single();

    if (error) throw error;

    // Trigger immediate expiry notification checks
    await checkSingleCouponNotification(newCoupon);

    return NextResponse.json(newCoupon, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
