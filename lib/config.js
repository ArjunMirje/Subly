/**
 * AUTH CONFIGURATION
 * ==================
 * Toggle email verification ON or OFF.
 *
 * false → Development Mode
 *   - Accounts are usable immediately after signup
 *   - No verification emails are sent
 *   - UI shows a single clean dev-mode message
 *
 * true → Production Mode
 *   - Supabase sends a verification email on signup
 *   - Protected routes are blocked until email is verified
 *   - Full auth callback flow is active
 *
 * Change this ONE value to switch modes. Default: OFF (false).
 */
export const REQUIRE_EMAIL_VERIFICATION = false;
