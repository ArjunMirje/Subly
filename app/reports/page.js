"use client";

import { Download, FileText } from 'lucide-react';
import styles from './page.module.css';

export default function Reports() {
  const handleExportCSV = () => {
    // Navigating to the export endpoint triggers the file download
    window.location.href = '/api/export';
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Reports</h1>
          <p>Export your subscription and spending data.</p>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={`glass-panel ${styles.reportCard}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
              <FileText size={32} color="var(--primary)" />
            </div>
            <h2>Complete Subscription Report</h2>
          </div>
          <p>Download a comprehensive CSV file containing all your active, expiring, and past subscriptions along with their costs and categories.</p>
          <button onClick={handleExportCSV} className={styles.downloadBtn}>
            <Download size={18} />
            Download to CSV
          </button>
        </div>

        <div className={`glass-panel ${styles.reportCard} ${styles.disabled}`}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
              <FileText size={32} color="var(--secondary)" />
            </div>
            <h2>PDF Summary (Coming Soon)</h2>
          </div>
          <p>A beautifully formatted PDF document showing charts, spending breakdowns, and upcoming renewals.</p>
          <button disabled className={styles.downloadBtn}>
            Available in Pro
          </button>
        </div>
      </div>
    </div>
  );
}
