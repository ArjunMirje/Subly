import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';

export async function POST() {
  try {
    console.log('[API/LOGOUT] Processing user logout request.');
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
