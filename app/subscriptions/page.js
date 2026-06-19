"use client";

import { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import styles from './page.module.css';
import SubscriptionModal from '@/components/SubscriptionModal';
import { parseJsonResponse } from '@/lib/api-client';
import { cycleLabel } from '@/lib/billing-labels';

// ─── Cost estimation (mirrors the same logic in SubscriptionModal) ────────────
function calcDiscountedCost(cost, discount) {
  if (!cost || !discount) return null;
  const raw = discount.toString().replace(/off/i, '').trim();
  if (raw.endsWith('%')) {
    const pct = parseFloat(raw);
    if (isNaN(pct)) return null;
    return Math.max(0, cost * (1 - pct / 100));
  }
  const flat = parseFloat(raw.replace(/[₹$£€Rs,\s]/gi, ''));
  if (!isNaN(flat)) return Math.max(0, cost - flat);
  return null;
}

const fmt = (n) =>
  Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [view, setView] = useState('card');
  const [filter, setFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch subscriptions from the API.
   * silent=true → keep existing list visible (no flash), used after CRUD.
   * silent=false → show loading spinner (initial load / filter change).
   */
  const fetchSubscriptions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fetch(`/api/subscriptions?filter=${filter}`);
      const data = await parseJsonResponse(res, `/api/subscriptions?filter=${filter}`);
      setSubscriptions(Array.isArray(data) ? data : data.subscriptions || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(err.message);
      if (!silent) setSubscriptions([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;
    try {
      setError(null);
      setSubscriptions(prev => prev.filter(s => s.id !== id));
      const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      await parseJsonResponse(res, `/api/subscriptions/${id}`);
      fetchSubscriptions(true);
    } catch (err) {
      console.error('Error deleting subscription:', err);
      setError(err.message);
      fetchSubscriptions(false);
    }
  };

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const openAddModal  = ()    => { setEditingSub(null);  setIsModalOpen(true); };
  const openEditModal = (sub) => { setEditingSub(sub);   setIsModalOpen(true); };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Subscriptions</h1>
          <p>Manage all your digital subscriptions.</p>
        </div>
        <button type="button" onClick={openAddModal} className={styles.addSubscriptionBtn}>
          + Add Subscription
        </button>
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
          alignItems: 'center',
        }}>
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => fetchSubscriptions(false)} style={{
            background: 'none', border: 'none', color: 'inherit',
            textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem',
          }}>Retry</button>
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.filters}>
          <button type="button" className={`${styles.filterBtn} ${filter === 'all'          ? styles.activeFilter : ''}`} onClick={() => setFilter('all')}>All</button>
          <button type="button" className={`${styles.filterBtn} ${filter === 'monthly'      ? styles.activeFilter : ''}`} onClick={() => setFilter('monthly')}>Monthly</button>
          <button type="button" className={`${styles.filterBtn} ${filter === 'half-yearly'  ? styles.activeFilter : ''}`} onClick={() => setFilter('half-yearly')}>Half-Yearly</button>
          <button type="button" className={`${styles.filterBtn} ${filter === 'yearly'       ? styles.activeFilter : ''}`} onClick={() => setFilter('yearly')}>Yearly</button>
        </div>

        <div className={styles.viewToggles}>
          <button type="button" className={`${styles.toggleBtn} ${view === 'card'  ? styles.activeToggle : ''}`} onClick={() => setView('card')}>
            <LayoutGrid size={18} />
          </button>
          <button type="button" className={`${styles.toggleBtn} ${view === 'table' ? styles.activeToggle : ''}`} onClick={() => setView('table')}>
            <List size={18} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className={styles.contentArea}>
        {loading && <p style={{ textAlign: 'center' }}>Loading...</p>}

        {/* ══ Card view ══════════════════════════════════════════════════════ */}
        {!loading && view === 'card' && (
          <div className={styles.cardGrid}>
            {subscriptions.length === 0 ? (
              <p className={styles.empty}>No subscriptions found</p>
            ) : (
              subscriptions.map(sub => {
                const estimated = sub.couponCode
                  ? calcDiscountedCost(Number(sub.cost), sub.couponDiscount)
                  : null;

                return (
                  <div key={sub.id} className={`glass-panel ${styles.card}`}>
                    {/* ── Card header ── */}
                    <div className={styles.cardHeader}>
                      <h3>{sub.name}</h3>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {sub.couponCode && (
                          <span className="status-badge" style={{
                            background: 'rgba(122,162,247,0.13)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(122,162,247,0.3)',
                            fontSize: '0.68rem',
                          }}>
                            🏷️ Coupon Applied
                          </span>
                        )}
                        <span className={`status-badge ${sub.autopayEnabled ? 'autopay-on' : 'autopay-off'}`}>
                          AutoPay {sub.autopayEnabled ? 'ON' : 'OFF'}
                        </span>
                        <span className={`status-badge status-${
                          sub.status === 'active' ? 'active' :
                          sub.status === 'expired' ? 'danger' : 'warning'
                        }`}>
                          {sub.status?.replace('-', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* ── Card body ── */}
                    <div className={styles.cardBody}>
                      <p><strong>Category:</strong> {sub.category}</p>
                      <p>
                        <strong>Cost:</strong>{' '}
                        {fmt(sub.cost)} / {cycleLabel(sub.billingCycle)}
                      </p>
                      <p><strong>Renews:</strong> {new Date(sub.renewalDate).toLocaleDateString()}</p>

                      {/* Coupon info */}
                      {sub.couponCode ? (
                        <>
                          <p>
                            <strong>Coupon:</strong>{' '}
                            <span style={{
                              fontFamily: 'monospace',
                              background: 'rgba(122,162,247,0.1)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              color: 'var(--primary)',
                              fontWeight: 700,
                            }}>
                              {sub.couponCode}
                            </span>
                            {sub.couponDiscount && (
                              <span style={{ marginLeft: '6px', fontSize: '0.8rem', color: '#9ece6a' }}>
                                {sub.couponDiscount} OFF
                              </span>
                            )}
                          </p>
                          {estimated !== null && (
                            <p>
                              <strong>Est. After Coupon:</strong>{' '}
                              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                {fmt(estimated)}
                              </span>
                            </p>
                          )}
                        </>
                      ) : (
                        <p style={{ color: 'var(--text-muted, #565f89)', fontSize: '0.85rem' }}>
                          No Coupon Applied
                        </p>
                      )}
                    </div>

                    {/* ── Card actions ── */}
                    <div className={styles.cardActions}>
                      <button type="button" onClick={() => openEditModal(sub)} className={styles.editBtn}>Edit</button>
                      <button type="button" onClick={() => handleDelete(sub.id)} className={styles.deleteBtn}>Delete</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══ Table view ═════════════════════════════════════════════════════ */}
        {!loading && view === 'table' && (
          <div className="glass-panel tableContainer">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Cost</th>
                  <th>Cycle</th>
                  <th>Renewal Date</th>
                  <th>Coupon</th>
                  <th>Est. After Coupon</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center' }}>No subscriptions found</td>
                  </tr>
                ) : (
                  subscriptions.map(sub => {
                    const estimated = sub.couponCode
                      ? calcDiscountedCost(Number(sub.cost), sub.couponDiscount)
                      : null;

                    return (
                      <tr key={sub.id}>
                        <td><strong>{sub.name}</strong></td>
                        <td>{sub.category}</td>
                        <td>{fmt(sub.cost)}</td>
                        <td>{cycleLabel(sub.billingCycle)}</td>
                        <td>{new Date(sub.renewalDate).toLocaleDateString()}</td>
                        <td>
                          {sub.couponCode ? (
                            <span style={{
                              fontFamily: 'monospace',
                              background: 'rgba(122,162,247,0.1)',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                            }}>
                              {sub.couponCode}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted, #565f89)', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          {estimated !== null ? (
                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{fmt(estimated)}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted, #565f89)', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className={`status-badge ${sub.autopayEnabled ? 'autopay-on' : 'autopay-off'}`}>
                              AutoPay {sub.autopayEnabled ? 'ON' : 'OFF'}
                            </span>
                            <span className={`status-badge status-${
                              sub.status === 'active' ? 'active' :
                              sub.status === 'expired' ? 'danger' : 'warning'
                            }`}>
                              {sub.status?.replace('-', ' ')}
                            </span>
                          </div>
                        </td>
                        <td>
                          <button type="button" onClick={() => openEditModal(sub)} className={styles.textBtn}>Edit</button>
                          <button type="button" onClick={() => handleDelete(sub.id)} className={`${styles.textBtn} ${styles.dangerText}`}>Delete</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <SubscriptionModal
          subscription={editingSub}
          onClose={() => setIsModalOpen(false)}
          onSave={() => fetchSubscriptions(true)}
        />
      )}
    </div>
  );
}