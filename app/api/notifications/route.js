import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/auth';
import { checkAndGenerateNotifications } from '@/lib/cron';

// GET /api/notifications - Sync reminders then fetch all for user
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Run an on-demand check so the user always sees up-to-date reminders
    // without waiting for the next hourly cron tick
    await checkAndGenerateNotifications();

    const supabase = await createClientServer();
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userId', user.id)
      .order('created_at', { ascending: false }); // newest first

    if (error) throw error;

    return NextResponse.json(notifications ?? []);
  } catch (error) {
    console.error('[API/NOTIFICATIONS] GET error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark all as read for user
export async function PATCH() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClientServer();
    const { error } = await supabase
      .from('notifications')
      .update({ isRead: true })
      .eq('userId', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/NOTIFICATIONS] PATCH error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
