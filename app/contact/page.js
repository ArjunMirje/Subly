"use client";
import Link from 'next/link';
import Image from 'next/image';
import styles from '../signup/auth.module.css';

export default function ContactUs() {
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
          <h1>Contact Us</h1>
          <p>Get in touch with the Subly team.</p>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>Have general feedback, questions, business proposals, or bug reports? We would love to hear from you!</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>Email Support</h3>
          <p>Send an email to: <span style={{ color: 'var(--primary)', fontWeight: '600' }}>support@subly.com</span></p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>Corporate Office</h3>
          <p>Subly Inc., 100 Financial Avenue, Suite 500, New York, NY 10001</p>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginTop: '0.5rem', marginBottom: '0.2rem' }}>Social Media</h3>
          <p>Find us on Twitter/X, GitHub, and LinkedIn as @sublyapp.</p>
        </div>
      </div>
    </div>
  );
}
