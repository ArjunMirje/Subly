"use client";
import Image from 'next/image';
import Link from 'next/link';
import { Shield, BarChart3, Bell, CheckCircle2, Calendar, Layers, Tag, FileText, Database, PlusCircle, TrendingUp, Sparkles, LayoutDashboard, Lock } from 'lucide-react';
import styles from './landing.module.css';

export default function Landing() {
  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <Image 
            src="/logo.png" 
            alt="Subly Logo" 
            className={styles.logoImg} 
            width={40} 
            height={40} 
            priority
            unoptimized
          />
          <span className={styles.logoText}>Subly</span>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.loginBtn}>Login</Link>
          <Link href="/signup" className={styles.signupBtn}>Get Started</Link>
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.badge}>Smart Subscription Tracker</span>
            <h1>Stop wasting money on <span className={styles.highlight}>unused</span> subscriptions.</h1>
            <p>Track all your recurring expenses in one place, get notified before renewals, and optimize your spending with ease.</p>
            <div className={styles.ctaGroup}>
              <Link href="/signup" className={styles.primaryBtn}>Create Free Account</Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.dashboardPreview}>
              {/* Stat Cards */}
              <div className={styles.previewStats}>
                <div className={`glass-panel ${styles.previewStatCard}`}>
                  <span className={styles.statLabel}>Monthly Spend</span>
                  <span className={styles.statValue}>₹2,450.00</span>
                </div>
                <div className={`glass-panel ${styles.previewStatCard}`}>
                  <span className={styles.statLabel}>Active</span>
                  <span className={styles.statValue}>8 Tools</span>
                </div>
              </div>

              {/* Subscription List Preview */}
              <div className={styles.previewList}>
                <div className={`glass-panel ${styles.previewItem} ${styles.animateIn1}`}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemIcon}>N</div>
                    <div>
                      <h4>Netflix</h4>
                      <span>Standard Plan</span>
                    </div>
                  </div>
                  <div className={styles.itemMeta}>
                    <span className="status-badge status-active">Active</span>
                    <span className={styles.itemPrice}>₹499/mo</span>
                  </div>
                </div>

                <div className={`glass-panel ${styles.previewItem} ${styles.animateIn2}`}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemIcon}>S</div>
                    <div>
                      <h4>Spotify</h4>
                      <span>Family Plan</span>
                    </div>
                  </div>
                  <div className={styles.itemMeta}>
                    <span className="status-badge status-active">Active</span>
                    <span className={styles.itemPrice}>₹179/mo</span>
                  </div>
                </div>

                <div className={`glass-panel ${styles.previewItem} ${styles.animateIn3}`}>
                  <div className={styles.itemInfo}>
                    <div className={styles.itemIcon}>A</div>
                    <div>
                      <h4>Adobe CC</h4>
                      <span>All Apps</span>
                    </div>
                  </div>
                  <div className={styles.itemMeta}>
                    <span className="status-badge status-warning">Renews Tomorrow</span>
                    <span className={styles.itemPrice}>₹4,230/mo</span>
                  </div>
                </div>
              </div>

              {/* Decorative Glows */}
              <div className={styles.glowPrimary}></div>
              <div className={styles.glowSecondary}></div>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.iconBox}><Bell size={24} /></div>
            <h3>Renewal Alerts</h3>
            <p>Never get surprised by an automatic renewal again with smart notifications.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconBox}><BarChart3 size={24} /></div>
            <h3>Spend Analytics</h3>
            <p>Visual breakdowns of your monthly and yearly subscription costs.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.iconBox}><Shield size={24} /></div>
            <h3>Privacy First</h3>
            <p>Your data is isolated and encrypted. We don't sell your information.</p>
          </div>
        </section>

        {/* SECTION 1 — Subscription Awareness Statistics */}
        <section className={styles.section} style={{ marginTop: '8rem' }}>
          <h2>Small Subscriptions Add Up Faster Than You Think</h2>
          <p className={styles.sectionSub}>
            Recurring payments often go unnoticed. A few forgotten renewals each month can quietly increase your yearly spending.
          </p>
          <div className={styles.statsGrid}>
            <div className={`glass-panel ${styles.statCard}`}>
              <span className={styles.statNumber}>59.9%</span>
              <span className={styles.statDesc}>
                of surveyed users reported paying for at least one unused subscription every month.
              </span>
            </div>
            <div className={`glass-panel ${styles.statCard}`}>
              <span className={styles.statNumber}>2.6</span>
              <span className={styles.statDesc}>
                unused paid subscriptions were reported on average by affected users.
              </span>
            </div>
            <div className={`glass-panel ${styles.statCard}`}>
              <span className={styles.statNumber}>₹13,000–₹15,000</span>
              <span className={styles.statDesc}>
                can be spent annually on only five or six popular OTT subscriptions at higher-tier plans in India.
              </span>
            </div>
          </div>
          <span className={styles.sourceText}>
            Sources: Self Financial subscription survey (2026) and Moneycontrol OTT subscription analysis (2025).
          </span>
        </section>

        {/* SECTION 2 — Problem Statement */}
        <section className={styles.section}>
          <h2>Stop Paying for Subscriptions You Forgot About</h2>
          <p className={styles.sectionSub}>
            Streaming platforms, cloud storage, productivity tools, memberships, and app subscriptions are easy to start but difficult to track. Subly brings your recurring expenses together in one place so you can make informed decisions before the next payment is deducted.
          </p>
          <div className={styles.problemGrid}>
            <div className={`glass-panel ${styles.problemCard}`}>
              <h3>
                <Calendar className={styles.problemIcon} size={20} />
                <span>Forgotten Renewals</span>
              </h3>
              <p>Avoid unexpected deductions by keeping track of upcoming renewal dates.</p>
            </div>
            <div className={`glass-panel ${styles.problemCard}`}>
              <h3>
                <Layers className={styles.problemIcon} size={20} />
                <span>Scattered Subscriptions</span>
              </h3>
              <p>Manage services from different platforms through one organized dashboard.</p>
            </div>
            <div className={`glass-panel ${styles.problemCard}`}>
              <h3>
                <Tag className={styles.problemIcon} size={20} />
                <span>Missed Savings</span>
              </h3>
              <p>Store coupons and monitor expiry dates before valuable offers disappear.</p>
            </div>
          </div>
        </section>

        {/* SECTION 3 — How Subly Works */}
        <section className={styles.section}>
          <h2>Take Control in Three Simple Steps</h2>
          <p className={styles.sectionSub}>
            Set up your dashboard, log your commitments, and let Subly keep track of the details for you.
          </p>
          <div className={styles.stepsGrid}>
            <div className={`glass-panel ${styles.stepCard}`}>
              <span className={styles.stepNumber}>01</span>
              <h3>
                <PlusCircle className={styles.featureIcon} size={20} />
                <span>1. Add or Detect</span>
              </h3>
              <p>Add subscriptions manually or identify recurring payments through transaction-based detection.</p>
            </div>
            <div className={`glass-panel ${styles.stepCard}`}>
              <span className={styles.stepNumber}>02</span>
              <h3>
                <TrendingUp className={styles.featureIcon} size={20} />
                <span>2. Track and Analyze</span>
              </h3>
              <p>View costs, billing cycles, renewal dates, and spending insights in one dashboard.</p>
            </div>
            <div className={`glass-panel ${styles.stepCard}`}>
              <span className={styles.stepNumber}>03</span>
              <h3>
                <Sparkles className={styles.featureIcon} size={20} />
                <span>3. Save More</span>
              </h3>
              <p>Receive renewal alerts, review coupons, and cancel subscriptions you no longer need.</p>
            </div>
          </div>
        </section>

        {/* SECTION 4 — Core Features */}
        <section className={styles.section}>
          <h2>Everything You Need to Stay in Control</h2>
          <p className={styles.sectionSub}>
            Take advantage of all Subly utility tools designed to make personal finance tracking seamless and secure.
          </p>
          <div className={styles.featuresGrid}>
            <div className={`glass-panel ${styles.featureCardNew}`}>
              <h3>
                <LayoutDashboard className={styles.featureIcon} size={20} />
                <span>Centralized Dashboard</span>
              </h3>
              <p>See all subscriptions, costs, and renewal dates at a glance.</p>
            </div>
            <div className={`glass-panel ${styles.featureCardNew}`}>
              <h3>
                <Bell className={styles.featureIcon} size={20} />
                <span>Smart Renewal Alerts</span>
              </h3>
              <p>Get notified when renewals are approaching within 7, 3, or 1 day.</p>
            </div>
            <div className={`glass-panel ${styles.featureCardNew}`}>
              <h3>
                <Tag className={styles.featureIcon} size={20} />
                <span>Coupon Vault</span>
              </h3>
              <p>Store discount codes and track their expiry dates.</p>
            </div>
            <div className={`glass-panel ${styles.featureCardNew}`}>
              <h3>
                <BarChart3 className={styles.featureIcon} size={20} />
                <span>Spending Analytics</span>
              </h3>
              <p>Understand your monthly and yearly subscription expenses.</p>
            </div>
            <div className={`glass-panel ${styles.featureCardNew}`}>
              <h3>
                <FileText className={styles.featureIcon} size={20} />
                <span>CSV Reports</span>
              </h3>
              <p>Export subscription records for personal budgeting and review.</p>
            </div>
            <div className={`glass-panel ${styles.featureCardNew}`}>
              <h3>
                <Database className={styles.featureIcon} size={20} />
                <span>Secure Cloud Storage</span>
              </h3>
              <p>Keep your information available across sessions using Supabase.</p>
            </div>
          </div>
        </section>

        {/* SECTION 5 — Privacy Note */}
        <section className={styles.privacySection}>
          <h2>
            <Lock className={styles.featureIcon} size={24} />
            <span>Your Data, Your Control</span>
          </h2>
          <p>
            Subly is designed to help you understand your recurring expenses. Your account information and subscription records are stored securely, and detected transactions should always be reviewed by the user before being added as subscriptions.
          </p>
        </section>

        {/* SECTION 6 — Final CTA */}
        <section className={styles.ctaSection}>
          <h2>Start Managing Your Subscriptions Smarter</h2>
          <p>Track renewals, reduce unnecessary spending, and understand where your money goes.</p>
          <div className={styles.ctaButtons}>
            <Link href="/signup" className={styles.ctaPrimary}>
              Get Started
            </Link>
            <Link href="/login" className={styles.ctaSecondary}>
              Log In
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span>&copy; 2026 Subly. All rights reserved.</span>
          <span className={styles.footerDivider}>|</span>
          <Link href="/terms" className={styles.footerLink}>Terms of Service</Link>
          <span className={styles.footerDivider}>|</span>
          <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link>
          <span className={styles.footerDivider}>|</span>
          <Link href="/cookies" className={styles.footerLink}>Cookie Policy</Link>
          <span className={styles.footerDivider}>|</span>
          <Link href="/support" className={styles.footerLink}>Help & Support</Link>
          <span className={styles.footerDivider}>|</span>
          <Link href="/contact" className={styles.footerLink}>Contact Us</Link>
        </div>
      </footer>
    </div>
  );
}
