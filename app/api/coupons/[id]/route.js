import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/auth';
import { checkSingleCouponNotification } from '@/lib/cron';

export async function DELETE(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClientServer();
    const { id } = await params;

    const { error } = await supabase
      .from('coupons')
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
    const { code, discount, expiryDate, service } = body;

    // Normalise "Not Specified" / empty string -> null
    const dbExpiryDate = (expiryDate === 'Not Specified' || !expiryDate) ? null : expiryDate;

    const { data: updatedCoupon, error } = await supabase
      .from('coupons')
      .update({
        code,
        discount: discount || '',
        expiryDate: dbExpiryDate,
        service: service || '',
      })
      .eq('id', id)
      .eq('userId', user.id)
      .select()
      .single();

    if (error) throw error;

    // Delete stale coupon expiry notifications for this coupon so they can be
    // re-generated based on the updated expiry date.
    await supabase
      .from('notifications')
      .delete()
      .eq('userId', user.id)
      .eq('type', 'coupon')
      .like('message', `%${code}%`);

    // Trigger fresh notification check with the updated coupon data
    await checkSingleCouponNotification(updatedCoupon);

    return NextResponse.json(updatedCoupon);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
