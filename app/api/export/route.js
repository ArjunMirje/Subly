import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { stringify } from 'csv-stringify/sync';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { USE_MOCK_DATA } = await import('@/lib/config');
    let subscriptions = [];

    if (USE_MOCK_DATA) {
      const { getMockSubscriptions } = await import('@/lib/mock-db');
      subscriptions = getMockSubscriptions().filter(s => s.userId === user.id)
        .sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const supabase = await createClientServer();
      const { data: dbSubscriptions, error } = await supabase
        .from('subscriptions')
        .select('name, category, cost, billingCycle, renewalDate, status')
        .eq('userId', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      subscriptions = dbSubscriptions || [];
    }
    
    const data = [

      ['Service Name', 'Category', 'Cost', 'Billing Cycle', 'Next Renewal', 'Status'],
      ...subscriptions.map(sub => [
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
