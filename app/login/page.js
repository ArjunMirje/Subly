"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import styles from '../signup/auth.module.css';
import { parseJsonResponse } from '@/lib/api-client';
import { REQUIRE_EMAIL_VERIFICATION } from '@/lib/config';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Handle redirect with error parameters dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (REQUIRE_EMAIL_VERIFICATION && params.get('error') === 'verify') {
        setError('Please verify your email address before logging in.');
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await parseJsonResponse(res, '/api/auth/login');

      console.log('[LOGIN] Login API response successful. Triggering router refresh...');
      router.refresh();
      
      console.log('[LOGIN] Navigating to /dashboard.');
      router.push('/dashboard');
    } catch (err) {
      console.error('[LOGIN] Error during form submission:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`glass-panel ${styles.authCard}`}>
        <Link href="/" className={styles.backBtn}>
          &lt; Back
        </Link>
        <div className={styles.header}>
          <div className={styles.brand}>
            <Image
              src="/logo.png"
              alt="Subly Logo"
              className={styles.authLogo}
              width={56}
              height={56}
              priority
              unoptimized
            />
            <span className={styles.brandName}>Subly</span>
          </div>
          <h1>Welcome Back</h1>
          <p>Login to manage your subscriptions.</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              required
              placeholder="name@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="login-password">Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>Don&apos;t have an account? <Link href="/signup">Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
}
