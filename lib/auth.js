import { createClientServer } from './supabase-server';
import { REQUIRE_EMAIL_VERIFICATION, USE_MOCK_DATA } from './config';
import { cookies } from 'next/headers';

// Helper for server actions, server components, and API routes
export async function getAuthUser() {
  try {
    if (USE_MOCK_DATA) {
      const cookieStore = await cookies();
      const hasMockSession = cookieStore.get('mock-session')?.value === 'true';
      if (!hasMockSession) return null;
      return {
        id: 'mock-user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        email_confirmed_at: new Date().toISOString()
      };
    }

    const supabase = await createClientServer();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    // Map Supabase user to the expected format
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0],
      email_confirmed_at: REQUIRE_EMAIL_VERIFICATION ? user.email_confirmed_at : (user.email_confirmed_at || new Date().toISOString())
    };
  } catch (error) {
    console.error('getAuthUser error:', error);
    return null;
  }
}

// These are no longer needed as Supabase handles cookies automatically via @supabase/ssr
export async function clearAuthCookie() {
  if (USE_MOCK_DATA) {
    // Handled in logout route by clearing cookies
    return;
  }
  const supabase = await createClientServer();
  await supabase.auth.signOut();
}

// Keep constants for reference if needed
export const COOKIE_NAME = 'sb-access-token'; // Default name used by many Supabase integrations

