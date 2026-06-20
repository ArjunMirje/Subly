import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { stringify } from 'csv-stringify/sync';
import { getAuthUser } from '@/lib/auth';
import { processAutopayRenewals } from '@/lib/cron';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClientServer();
    await processAutopayRenewals(supabase);
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('name, category, cost, billingCycle, renewalDate, status, autopayEnabled')
      .eq('userId', user.id)
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Auto-update statuses based on renewal date (matching GET /api/subscriptions)
    const today = new Date();
    const updatedSubs = (subscriptions || []).map(sub => {
      let status = 'active';
      if (sub.autopayEnabled) {
        status = 'active';
      } else {
        const renewalDate = new Date(sub.renewalDate);
        const diffTime = renewalDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          status = 'expired';
        } else if (diffDays <= 5) {
          status = 'expiring-soon';
        }
      }
      return { ...sub, status };
    });

    const data = [
      ['Service Name', 'Category', 'Cost', 'Billing Cycle', 'Next Renewal', 'Status'],
      ...updatedSubs.map(sub => [
        sub.name,
        sub.category,
        `₹${sub.cost.toFixed(2)}`,
        sub.billingCycle,
        new Date(sub.renewalDate).toLocaleDateString(),
        sub.status
      ])
    ];

    const csvContent = '\ufeff' + stringify(data);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="subly_report.csv"'
      }
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
