import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { getAuthUser } from '@/lib/auth';

// PATCH /api/notifications/[id] - Mark specific notification as read for user
export async function PATCH(request, { params }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = await createClientServer();
    const { id } = await params;
    const { error } = await supabase
      .from('notifications')
      .update({ isRead: true })
      .eq('id', id)
      .eq('userId', user.id);
    
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
