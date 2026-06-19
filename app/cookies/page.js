"use client";
import Link from 'next/link';
import Image from 'next/image';
import styles from '../signup/auth.module.css';

export default function CookiePolicy() {
  return (
    <div className={styles.container}>
      <div className={`glass-panel ${styles.authCard}`} style={{ maxWidth: '600px', padding: '3rem 2.5rem' }}>
        <Link href="/" className={styles.backBtn}>
          ‹ Back
        </Link>
        <div className={styles.header}>
          <div className={styles.brand}>
            <Image src="/logo.png" alt="Subly Logo" width={48} height={48} priority unoptimized />
            <span className={styles.brandName} style={{ fontSize: '1.8rem' }}>Subly</span>
          </div>
          <h1>Cookie Policy</h1>
          <p>Last updated: June 1, 2026</p>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>This Cookie Policy explains how Subly uses cookies to optimize login session persistence and security controls.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>1. What are Cookies?</h3>
          <p>Cookies are small text files stored on your local browser to identify sessions and remember your login state across tabs.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>2. Essential Cookies</h3>
          <p>We use essential cookies strictly to maintain user authentication state and secure endpoints from unauthorized requests.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>3. How to Disable</h3>
          <p>You can adjust your browser settings to reject cookies, though doing so will prevent dashboard access and logout authentication controls from working.</p>
        </div>
      </div>
    </div>
  );
}
