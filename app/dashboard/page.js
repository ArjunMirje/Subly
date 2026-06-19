"use client";

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { parseJsonResponse } from '@/lib/api-client';
import { cycleLabel } from '@/lib/billing-labels';

export default function Dashboard() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  const fetchDashboard = () => {
    setError(null);
    setLoading(true);
    fetch('/api/subscriptions')
      .then(res => parseJsonResponse(res, '/api/subscriptions'))
      .then(data => {
        setSubscriptions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Dashboard fetch error:', err);
        setError(err.message);
        setSubscriptions([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Loading Dashboard...</div>;
  }

  // Defensive handling before filtering
  const safeSubscriptions = Array.isArray(subscriptions) ? subscriptions : [];

  // Calculate Stats
  const activeSubs = safeSubscriptions.filter(s => s.status !== 'expired');
  const monthlySpendCtx = activeSubs.reduce((acc, sub) => {
    if (sub.billingCycle === 'yearly') {
      return acc + (sub.cost / 12);
    } else if (sub.billingCycle === 'half-yearly') {
      return acc + (sub.cost / 6);
    } else {
      return acc + sub.cost;
    }
  }, 0);
  
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const upcomingRenewals = safeSubscriptions
    .filter(sub => {
      if (!sub.renewalDate) return false;
      const [y, m, d] = sub.renewalDate.split('-').map(Number);
      const subDate = new Date(y, m - 1, d);
      return sub.status !== 'expired' && subDate >= todayMidnight;
    })
    .sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate));

  const expiredRenewals = safeSubscriptions
    .filter(sub => {
      if (!sub.renewalDate) return false;
      const [y, m, d] = sub.renewalDate.split('-').map(Number);
      const subDate = new Date(y, m - 1, d);
      return sub.status === 'expired' || subDate < todayMidnight;
    })
    .sort((a, b) => new Date(b.renewalDate) - new Date(a.renewalDate));

  const displayedSubs = activeTab === 'upcoming' ? upcomingRenewals : expiredRenewals;

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1>Overview</h1>
        <p>Monitor your active subscriptions and upcoming charges.</p>
      </header>

      {error && (
        <div className="error-banner" style={{
          backgroundColor: 'rgba(247, 118, 142, 0.1)',
          border: '1px solid var(--danger, #f7768e)',
          color: 'var(--danger, #f7768e)',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⚠️ {error}</span>
          <button type="button" onClick={fetchDashboard} style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}>Retry</button>
        </div>
      )}

      <div className={styles.statsGrid}>
        <div className={`glass-panel ${styles.statCard}`}>
          <h3>Monthly Spending</h3>
          <div className={styles.statValue}>{monthlySpendCtx.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</div>
        </div>
        <div className={`glass-panel ${styles.statCard}`}>
          <h3>Active Subscriptions</h3>
          <div className={styles.statValue}>{activeSubs.length}</div>
        </div>
        <div className={`glass-panel ${styles.statCard}`}>
          <h3>Total Yearly Estimate</h3>
          <div className={styles.statValue}>{(monthlySpendCtx * 12).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.tabsContainer}>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'upcoming' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Renewals
          </button>
          <button 
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'expired' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('expired')}
          >
            Expired Subscriptions
          </button>
        </div>

        <div className={`glass-panel ${styles.tableContainer}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Service</th>
                <th>Category</th>
                <th>Cost</th>
                <th>Cycle</th>
                <th>{activeTab === 'upcoming' ? 'Renewal Date' : 'Expired On'}</th>
                <th>AutoPay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedSubs.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyState}>
                    {activeTab === 'upcoming' ? 'No upcoming renewals.' : 'No expired subscriptions found.'}
                  </td>
                </tr>
              ) : (
                displayedSubs.map(sub => (
                  <tr key={sub.id}>
                    <td><strong>{sub.name}</strong></td>
                    <td>{sub.category}</td>
                    <td>{Number(sub.cost || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span>{cycleLabel(sub.billingCycle)}</span>
                        {sub.couponCode && (
                          <span style={{
                            background: 'rgba(122,162,247,0.12)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(122,162,247,0.3)',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '10px',
                            whiteSpace: 'nowrap',
                          }}>🏷️ Coupon Applied</span>
                        )}
                      </div>
                    </td>
                    <td>{new Date(sub.renewalDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge ${sub.autopayEnabled ? 'autopay-on' : 'autopay-off'}`}>
                        {sub.autopayEnabled ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${sub.status === 'active' ? 'active' : sub.status === 'expired' ? 'danger' : 'warning'}`}>
                        {sub.status.replace('-', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
