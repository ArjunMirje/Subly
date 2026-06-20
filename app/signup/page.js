"use client";
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Mail, User, MapPin, Phone, Calendar, Shield, CheckCircle2 } from 'lucide-react';
import styles from './auth.module.css';
import { REQUIRE_EMAIL_VERIFICATION } from '@/lib/config';
import { parseJsonResponse } from '@/lib/api-client';

export default function Signup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    dob: '',
    gender: '',
    address: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // --- Input Sanitizers ---

  const handleUsernameChange = (e) => {
    // Only allow letters, numbers, underscore — no spaces, no special chars
    const cleaned = e.target.value.replace(/[^A-Za-z0-9_]/g, '');
    setFormData({ ...formData, username: cleaned });
  };

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    // Allow only digits and a single leading +
    let cleaned = val.replace(/[^\d+]/g, '');
    if (cleaned.indexOf('+') > 0) {
      // + must only be at position 0
      cleaned = cleaned.replace(/\+/g, '');
    }
    setFormData({ ...formData, phone: cleaned });
  };

  // --- Step 1 → Step 2 transition ---

  const handleNext = async () => {
    setError('');

    // Basic required field check
    if (!formData.username || !formData.dob || !formData.gender || !formData.phone) {
      setError('Please fill in all required fields.');
      return;
    }

    // Username format validation
    // Rules: min 8 chars, must start with letter or underscore, at least one letter, only letters/digits/underscore
    const usernameRegex = /^(?=.*[A-Za-z])[A-Za-z_][A-Za-z0-9_]{7,}$/;
    if (!usernameRegex.test(formData.username)) {
      setError(
        'Username must be at least 8 characters, start with a letter or underscore, ' +
        'contain at least one letter, and use only letters, numbers, or underscores.'
      );
      return;
    }

    // Phone number validation: digits only with optional leading +, 7–15 digits
    const phoneRegex = /^\+?\d{7,15}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid phone number (7–15 digits, optional + prefix).');
      return;
    }

    setLoading(true);

    try {
      // Server-side username duplicate check via API
      const res = await fetch(
        `/api/auth/check-username?username=${encodeURIComponent(formData.username)}`
      );
      const data = await parseJsonResponse(res, `/api/auth/check-username`);

      if (data.exists) {
        setError('Username already exists, Try another username.');
        return;
      }

      // Username is available — move to step 2
      setStep(2);
    } catch (err) {
      console.error('Username check network error:', err.message);
      // Network failure: don't block the user, proceed with a warning
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2 submission (full signup via API) ---

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          dob: formData.dob || null,
          gender: formData.gender || null,
          phone: formData.phone || null,
          address: formData.address || null,
        }),
      });

      // Special handling: if res.status is 207, we want to parse it as JSON but treat it as success.
      // parseJsonResponse throws on !res.ok, so for 207 (which has !res.ok is false, wait, 207 is res.ok === true since it is in 2xx range!)
      // Yes! 2xx status codes (like 200-299) have res.ok === true! So 207 is perfectly fine and won't throw inside parseJsonResponse.
      const data = await parseJsonResponse(res, '/api/auth/signup');

      if (res.status === 207) {
        // Profile creation failed but auth succeeded — show database error but continue
        console.warn('Profile setup issue:', data.profileError);
        setError(data.error || 'Account created but profile setup failed.');
        setMessage('');
        setStep(3);
        return;
      }

      // Full success
      setError('');
      setMessage('');
      setStep(3);
      // Only set message when verification is actually required
      if (REQUIRE_EMAIL_VERIFICATION) {
        setMessage(`Verification email sent to ${formData.email}. Check your inbox.`);
      } else {
        setMessage('Gmail verification is turned off as the email rate has been exceeded. Your account has been created successfully and you may log in immediately.');
      }
    } catch (err) {
      console.error('Signup submit error:', err.message);
      if (err.message.includes('rate limit') || err.message.includes('Gmail verification is turned off')) {
        setMessage('Gmail verification is turned off as the email rate has been exceeded. Your account has been created successfully and you may log in immediately.');
        setError('');
        setStep(3);
      } else {
        setError(err.message || 'Network error. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---

  return (
    <div className={styles.container}>
      <div
        className={`glass-panel ${styles.authCard}`}
        style={{ maxWidth: step === 1 ? '500px' : '420px' }}
      >
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={16} /> Back
        </Link>

        <div className={styles.header}>
          <div className={styles.brand}>
            <Image src="/logo.png" alt="Subly Logo" width={56} height={56} priority unoptimized />
            <span className={styles.brandName}>Subly</span>
          </div>
          <h1>
            {step === 1 ? 'Get Started' : step === 2 ? 'Account Security' : REQUIRE_EMAIL_VERIFICATION ? 'Check Your Email' : 'Account Created!'}
          </h1>
          <p>
            {step === 1
              ? 'Join Subly and take control of your expenses.'
              : step === 2
              ? 'Set up your credentials and email.'
              : REQUIRE_EMAIL_VERIFICATION
              ? `We've sent a verification link to ${formData.email}`
              : 'Gmail verification is turned off as the email rate has been exceeded.'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className={styles.stepIndicator}>
          <div className={`${styles.stepDot} ${step >= 1 ? styles.stepDotActive : ''}`} />
          <div className={`${styles.stepDot} ${step >= 2 ? styles.stepDotActive : ''}`} />
          <div className={`${styles.stepDot} ${step >= 3 ? styles.stepDotActive : ''}`} />
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {message && (
          <div
            className={styles.success}
            style={{
              color: 'var(--primary)',
              textAlign: 'center',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}
          >
            {message}
          </div>
        )}

        <div className={styles.form}>

          {/* ── Step 1: Profile Info ── */}
          {step === 1 && (
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>
                  <User size={14} /> <span>Username</span>
                </label>
                <input
                  id="signup-username"
                  type="text"
                  placeholder="subly_user"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  autoComplete="username"
                  required
                />
                <p className={styles.helperText}>
                  Min 8 chars · letters, numbers, underscore only · must start with a letter
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label>
                    <Calendar size={14} /> <span>Date of Birth</span>
                  </label>
                  <input
                    id="signup-dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Gender</label>
                  <select
                    id="signup-gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    required
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>
                  <Phone size={14} /> <span>Phone Number</span>
                </label>
                <input
                  id="signup-phone"
                  type="tel"
                  placeholder="+919876543210"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  required
                />
              </div>

              <button
                id="signup-next-btn"
                onClick={handleNext}
                disabled={loading}
                className={styles.submitBtn}
              >
                {loading ? 'Checking...' : 'Continue'}{' '}
                {!loading && <ArrowRight size={16} style={{ marginLeft: '8px' }} />}
              </button>
            </div>
          )}

          {/* ── Step 2: Email + Password ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>
                  <Mail size={14} /> <span>Email Address</span>
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  autoComplete="email"
                  required
                />
                <p className={styles.helperText}>We will send a verification link to this email.</p>
              </div>

              <div className={styles.formGroup}>
                <label>
                  <MapPin size={14} /> <span>Address (Optional)</span>
                </label>
                <input
                  id="signup-address"
                  type="text"
                  placeholder="123 Street, City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Create Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Confirm Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className={styles.secondaryBtn}
                >
                  Back
                </button>
                <button
                  id="signup-submit-btn"
                  type="submit"
                  disabled={loading}
                  className={styles.submitBtn}
                  style={{ flex: 2 }}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Result Screen ── */}
          {step === 3 && (
            <div className={styles.formGrid} style={{ textAlign: 'center', padding: '1rem 0' }}>
              {error ? (
                // Case A: Profile / Database Setup Error
                <>
                  <div style={{ margin: '0 auto 1.5rem', color: 'var(--danger)' }}>
                    <Shield size={64} strokeWidth={1.5} />
                  </div>
                  <h2 style={{ color: 'var(--danger)', fontSize: '1.5rem', marginBottom: '1rem' }}>
                    Database Setup Needed
                  </h2>
                  <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
                    Your authentication account was created, but we could not set up your profile because the database schema is not ready.
                  </p>
                  <div
                    className="glass-panel"
                    style={{
                      padding: '1rem',
                      background: 'rgba(247, 118, 142, 0.05)',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      color: 'var(--danger)',
                      border: '1px solid rgba(247, 118, 142, 0.2)',
                      textAlign: 'left',
                      marginBottom: '1.5rem',
                      lineHeight: '1.5'
                    }}
                  >
                    <strong>Error details:</strong> {error}
                    <br /><br />
                    Please run the database migration in Supabase SQL editor using the script at <code>data/supabase_schema.sql</code> and try logging in.
                  </div>
                  <button
                    id="signup-return-login-btn"
                    onClick={() => router.push('/login')}
                    className={styles.submitBtn}
                    style={{ width: '100%' }}
                  >
                    Proceed to Login
                  </button>
                </>
              ) : !REQUIRE_EMAIL_VERIFICATION ? (
                // Case B: Dev Mode — email verification is OFF
                <>
                  <div style={{ margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
                    <CheckCircle2 size={64} strokeWidth={1.5} />
                  </div>
                  <h2 style={{ color: 'var(--primary)', fontSize: '1.5rem', marginBottom: '1rem' }}>
                    Account Created!
                  </h2>
                  <p style={{
                    marginBottom: '2rem',
                    lineHeight: '1.6',
                    fontSize: '0.95rem',
                    color: 'var(--text-muted)',
                    padding: '0.75rem 1rem',
                    background: 'rgba(122, 162, 247, 0.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(122, 162, 247, 0.15)',
                  }}>
                    Gmail verification is turned off as the email rate has been exceeded. Your account has been created successfully and you may log in immediately.
                  </p>
                  <button
                    id="signup-return-login-btn"
                    onClick={() => router.push('/login')}
                    className={styles.submitBtn}
                    style={{ width: '100%' }}
                  >
                    Proceed to Login
                  </button>
                </>
              ) : (
                // Case C: Production / Strict Email Verification Mode
                <>
                  <div style={{ margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
                    <Mail size={64} strokeWidth={1.5} />
                  </div>
                  <h2 style={{ color: 'var(--primary)', fontSize: '1.5rem', marginBottom: '1rem' }}>
                    Verify Your Email
                  </h2>
                  <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
                    We&apos;ve sent a verification link to <strong>{formData.email}</strong>.
                  </p>
                  <div
                    className="glass-panel"
                    style={{
                      padding: '1rem',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      fontSize: '0.9rem',
                      color: 'var(--text-muted)',
                      marginBottom: '1.5rem'
                    }}
                  >
                    After clicking the verification link, you will be redirected back to Subly automatically.
                  </div>
                  <button
                    id="signup-return-login-btn"
                    onClick={() => router.push('/login')}
                    className={styles.secondaryBtn}
                    style={{ width: '100%' }}
                  >
                    Return to Login
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <p>
            Already have an account? <Link href="/login">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
