"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import styles from '@/app/signup/auth.module.css';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const next = searchParams.get('next') || '/dashboard';

      if (code) {
        // The server-side route usually handles this, but we can double check here
        const { data, error } = await supabase.auth.getSession();
        if (data?.session) {
          router.push(next);
        } else {
          // If no session yet, we wait for a bit or let the server route finish
          // In App Router, the server route /api/auth/callback is preferred for PKCE
          // but if they landed here, we can try to exchange or redirect.
          setTimeout(() => router.push(next), 2000);
        }
      } else {
        router.push('/login');
      }
    };

    handleCallback();
  }, [router, searchParams, supabase]);

  return (
    <div className={styles.container}>
      <div className={`glass-panel ${styles.authCard}`} style={{ textAlign: 'center', padding: '3rem' }}>
        <div className={styles.loader}></div>
        <h2 style={{ marginTop: '2rem' }}>Verifying your account...</h2>
        <p style={{ color: 'var(--text-muted)' }}>You will be redirected to the dashboard automatically.</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={`glass-panel ${styles.authCard}`} style={{ textAlign: 'center', padding: '3rem' }}>
          <div className={styles.loader}></div>
          <h2 style={{ marginTop: '2rem' }}>Loading verification...</h2>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
