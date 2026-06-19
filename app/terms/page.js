"use client";
import Link from 'next/link';
import Image from 'next/image';
import styles from '../signup/auth.module.css';

export default function TermsOfService() {
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
          <h1>Terms of Service</h1>
          <p>Last updated: June 1, 2026</p>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>Welcome to Subly! By accessing and using our application, you agree to be bound by the following terms and conditions.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>1. Terms of Use</h3>
          <p>You agree to use Subly solely for personal, non-commercial subscription tracking and financial overview purposes.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>2. Account Security</h3>
          <p>You are responsible for keeping your login credentials secure. Subly cannot be held liable for any unauthorized access resulting from user negligence.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>3. Service Changes</h3>
          <p>We reserve the right to modify, suspend, or discontinue any aspect of our tracking services at any time.</p>
        </div>
      </div>
    </div>
  );
}
