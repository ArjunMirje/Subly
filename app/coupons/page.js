"use client";

import { useEffect, useState } from 'react';
import { Ticket, Scissors, ScanLine } from 'lucide-react';
import styles from './page.module.css';
import CouponModal from '@/components/CouponModal';
import CouponScanner from '@/components/CouponScanner';
import { parseJsonResponse } from '@/lib/api-client';

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [error, setError] = useState(null);

  const fetchCoupons = () => {
    setError(null);
    fetch('/api/coupons')
      .then(res => parseJsonResponse(res, '/api/coupons'))
      .then(data => {
        const today = new Date();
        const updatedCoupons = (data || []).map(coupon => {
          let status = 'valid';
          if (coupon.expiryDate) {
            const expiryDate = new Date(coupon.expiryDate);
            const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) status = 'expired';
            else if (diffDays <= 7) status = 'expiring-soon';
          }
          return { ...coupon, status };
        });
        setCoupons(updatedCoupons);
      })
      .catch(err => {
        console.error('Error fetching coupons:', err);
        setError(err.message);
        setCoupons([]);
      });
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingCoupon(null);
    setIsModalOpen(true);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
  };

  const openScannerModal = () => setIsScannerOpen(true);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      setError(null);
      // Optimistic: remove immediately so there is no flash or reload feel
      setCoupons(prev => prev.filter(c => c.id !== id));
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      await parseJsonResponse(res, `/api/coupons/${id}`);
      // Silent background sync
      fetchCoupons();
    } catch (err) {
      console.error('Error deleting coupon:', err);
      setError(err.message);
      // Revert by re-fetching
      fetchCoupons();
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Coupon Vault</h1>
          <p>Store, track, and use your discount codes effectively.</p>
        </div>

        <div className={styles.headerButtons}>
          <button onClick={openScannerModal} className={styles.scanCouponBtn}>
            <ScanLine size={16} />
            Scan Coupon
          </button>
          <button onClick={openAddModal} className={styles.addCouponBtn}>
            + Add Coupon
          </button>
        </div>
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
          <button onClick={() => fetchCoupons()} style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}>Retry</button>
        </div>
      )}

      <div className={styles.grid}>
        {coupons.length === 0 ? (
          <div className={styles.emptyState}>No coupons saved. Add one to start saving!</div>
        ) : (
          coupons.map(coupon => (
            <div key={coupon.id} className={`glass-panel ${styles.couponCard}`}>
              {/* ── Top row: service tag + status badge ── */}
              <div className={styles.cardTop}>
                <div className={styles.serviceTag}>{coupon.service || 'Global'}</div>
                <span className={`status-badge status-${coupon.status === 'valid' ? 'active' : coupon.status === 'expired' ? 'danger' : 'warning'}`}>
                  {coupon.status.replace('-', ' ')}
                </span>
              </div>

              {/* ── Centre: discount amount ── */}
              <div className={styles.cardCenter}>
                <Ticket size={24} className={styles.icon} />
                <h2>{coupon.discount || '—'} OFF</h2>
              </div>

              {/* ── Bottom: code + expiry ── */}
              <div className={styles.cardBottom}>
                <div className={styles.codeContainer}>
                  <Scissors size={14} className={styles.scissors} />
                  <span className={styles.code}>{coupon.code}</span>
                </div>
                <div className={styles.expiryLabel}>
                  Expires: {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString() : 'Not Specified'}
                </div>
              </div>

              {/* ── Actions: Edit + Delete ── */}
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={() => openEditModal(coupon)}
                  aria-label={`Edit ${coupon.code}`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(coupon.id)}
                  aria-label={`Delete ${coupon.code}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <CouponModal
          coupon={editingCoupon}
          onClose={closeModal}
          onSave={fetchCoupons}
        />
      )}

      {isScannerOpen && (
        <CouponScanner
          onClose={() => setIsScannerOpen(false)}
          onSave={fetchCoupons}
          existingCoupons={coupons}
        />
      )}
    </div>
  );
}
