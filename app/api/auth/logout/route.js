import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { USE_MOCK_DATA } from '@/lib/config';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    console.log('[API/LOGOUT] Processing user logout request.');

    if (USE_MOCK_DATA) {
      const cookieStore = await cookies();
      cookieStore.delete('mock-session');
      console.log('[API/LOGOUT] Mock logout successful. Cookie cleared.');
      return NextResponse.json({ message: 'Logged out successfully' });
    }

    const supabase = await createClientServer();

    
    // Call Supabase signOut to automatically clear all sb-*-auth-token cookies
    await supabase.auth.signOut();
    
    console.log('[API/LOGOUT] SignOut successful. Cookies cleared.');
    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[API/LOGOUT] Exception during logout:', error);
    return NextResponse.json({ error: 'An unexpected error occurred during logout' }, { status: 500 });
  }
}
