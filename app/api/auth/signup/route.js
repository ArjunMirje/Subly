import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { EMAIL_VERIFICATION_ENABLED } from '@/lib/config';

function logSupabaseError(label, error) {
  console.error(`=== ${label} ===`);
  console.error('Type:', typeof error);
  console.error('Is null:', error === null);
  try {
    console.error('JSON:', JSON.stringify(error, null, 2));
  } catch (e) {
    console.error('(not JSON serializable)');
  }
  if (error && typeof error === 'object') {
    console.error('message:', error.message);
    console.error('code:', error.code);
    console.error('details:', error.details);
    console.error('hint:', error.hint);
    console.error('status:', error.status);
  }
  console.error('=== END ===');
}

export async function POST(request) {
  try {
    const supabase = await createClientServer();
    const body = await request.json();
    const { username, email, password, dob, gender, phone, address } = body;

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email and password are required' }, { status: 400 });
    }



    // 1. Check if username already taken (server-side, bypasses client RLS issues)
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', username)
      .maybeSingle();

    if (checkError) {
      logSupabaseError('Username duplicate check error', checkError);
      // If the profiles table doesn't exist yet, log and continue
      // The error will surface clearly in logs
      if (checkError.code !== 'PGRST116' && !checkError.message?.includes('does not exist')) {
        // Only block on real errors, not "no rows" responses
        console.warn('Username check failed but continuing signup...');
      }
    } else if (existingUser) {
      return NextResponse.json({ error: 'Username already exists, Try another username.' }, { status: 409 });
    }

    // 2. Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: username,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback`,
      },
    });

    if (authError) {
      logSupabaseError('Supabase auth.signUp error', authError);
      if (authError.message.includes('rate limit') && !EMAIL_VERIFICATION_ENABLED) {
        return NextResponse.json({ error: 'Gmail verification is turned off as the email rate has been exceeded.' }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Signup failed — no user returned from Auth' }, { status: 500 });
    }

    // 3. Insert profile into profiles table
    const profilePayload = {
      id: authData.user.id,
      username: username,
      email: email,
      dob: dob || null,
      gender: gender || null,
      phone: phone || null,
      address: address || null,
    };

    let isProfileCreated = false;
    let finalProfileError = null;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([profilePayload]);

    if (profileError) {
      if (profileError.code === '23505') {
        console.log('Profile already exists (duplicate key error 23505), treating as success.');
        isProfileCreated = true;
      } else {
        logSupabaseError('Profile insert error', profileError);
        finalProfileError = profileError;
      }
    } else {
      isProfileCreated = true;
    }

    if (!isProfileCreated && finalProfileError) {
      // Return the actual error message so the client can display it
      return NextResponse.json({
        error: `Account created but profile setup failed: ${finalProfileError.message || 'Unknown database error'}. Please contact support.`,
        profileError: {
          message: finalProfileError.message,
          code: finalProfileError.code,
          details: finalProfileError.details,
          hint: finalProfileError.hint,
        },
        user: authData.user,
      }, { status: 207 }); // 207 Multi-Status: auth worked but profile didn't
    }

    console.log('Profile created successfully for user:', authData.user.id);

    const successMsg = EMAIL_VERIFICATION_ENABLED
      ? 'Account created! Verification email sent. Please check your inbox.'
      : 'Gmail verification is turned off as the email rate has been exceeded. Your account has been created successfully and you may log in immediately.';

    return NextResponse.json({
      message: successMsg,
      user: authData.user,
    }, { status: 201 });

  } catch (error) {
    console.error('Signup route unhandled exception:', error.message, error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
