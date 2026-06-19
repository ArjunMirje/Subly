import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/auth';
import { checkSingleCouponNotification } from '@/lib/cron';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClientServer();
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('userId', user.id)
      .order('expiryDate', { ascending: true });

    if (error) throw error;

    return NextResponse.json(coupons);
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
