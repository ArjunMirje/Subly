"use client";
import Link from 'next/link';
import Image from 'next/image';
import styles from '../signup/auth.module.css';

export default function HelpSupport() {
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
          <h1>Help & Support</h1>
          <p>We are here to help you get the most out of Subly.</p>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>Need assistance or have questions about subscription management? Browse our frequently asked topics below.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>1. How do I add a subscription?</h3>
          <p>Go to your dashboard, navigate to the Subscriptions tab, click on the &quot;Add Subscription&quot; button, fill in the details, and save.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>2. When will I get renewal alerts?</h3>
          <p>By default, Subly triggers notifications 7 days, 3 days, and 1 day before your scheduled renewal dates.</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>3. How can I manage expiring coupons?</h3>
          <p>Save coupon details under the Coupons tab and check notifications for warnings about expiring codes.</p>
        </div>
      </div>
    </div>
  );
}
