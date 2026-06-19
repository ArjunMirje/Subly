import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Check if username already exists (case-insensitive)
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', username)
      .maybeSingle();

    if (error) {
      // Log with proper stringification
      console.error('Username check error:', JSON.stringify(error, null, 2));
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error details:', error?.details);
      // Return false (not taken) on DB error so we don't block signup
      return NextResponse.json({ exists: false, warning: error.message });
    }

    return NextResponse.json({ exists: !!data });
  } catch (err) {
    console.error('Username check exception:', err.message);
    return NextResponse.json({ exists: false, warning: err.message });
  }
}
