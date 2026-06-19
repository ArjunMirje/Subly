"use client";
import Link from 'next/link';
import Image from 'next/image';
import styles from '../signup/auth.module.css';

export default function PrivacyPolicy() {
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
          <h1>Privacy Policy</h1>
          <p>Last updated: June 1, 2026</p>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>At Subly, your privacy is our absolute priority. We protect your personal data and ensure total confidentiality.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>1. Data Collection</h3>
          <p>We only collect the details necessary to provide you with active renewal reminders, email notifications, and spend analysis summaries.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>2. Data Isolation</h3>
          <p>All subscription details and coupon codes remain isolated in your personal secure space and are never shared with third parties.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>3. Cookies & Security</h3>
          <p>We use secure tokens to authorize access to your dashboard and manage active login sessions.</p>
        </div>
      </div>
    </div>
  );
}
