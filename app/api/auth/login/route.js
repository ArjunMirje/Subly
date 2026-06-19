import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { REQUIRE_EMAIL_VERIFICATION } from '@/lib/config';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    console.log(`[API/LOGIN] Processing login attempt for: ${email}`);

    if (!email || !password) {
      console.warn('[API/LOGIN] Login attempt failed: missing email or password');
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Initialize server-side Supabase client with cookies integration
    const supabase = await createClientServer();

    // Sign in with Supabase Auth
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.warn(`[API/LOGIN] Supabase signInWithPassword failed for ${email}: ${authError.message}`);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check email verification only when enabled
    if (REQUIRE_EMAIL_VERIFICATION && !data.user.email_confirmed_at) {
      console.warn(`[API/LOGIN] Login blocked for ${email}: Email verification required.`);
      return NextResponse.json({
        error: 'Please verify your email address before logging in.',
      }, { status: 403 });
    }

    console.log(`[API/LOGIN] Login successful for user ID: ${data.user.id}. Session cookies successfully registered.`);

    return NextResponse.json({
      user: data.user,
      session: data.session,
    });

  } catch (error) {
    console.error('[API/LOGIN] Unhandled exception during login:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
