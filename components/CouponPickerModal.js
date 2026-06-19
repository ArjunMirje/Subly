"use client";

/**
 * CouponPickerModal
 *
 * A modal overlay that lists all coupons belonging to the current user.
 * – Expired coupons are shown but cannot be selected.
 * – Coupons whose `service` matches `subscriptionName` get a "Recommended" badge.
 * – Has a live search filter.
 *
 * Props:
 *   subscriptionName {string}            – current subscription name (for Recommended badge)
 *   onSelect         {(coupon) => void}  – called with the chosen coupon object
 *   onClose          {() => void}        – closes the modal without selecting
 */

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { parseJsonResponse } from '@/lib/api-client';
import styles from './CouponPickerModal.module.css';

export default function CouponPickerModal({ subscriptionName = '', onSelect, onClose }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [search, setSearch] = useState('');

  // ── Fetch user's coupons ────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/coupons')
      .then(res => parseJsonResponse(res, '/api/coupons'))
      .then(data => {
        const today = new Date();
        const enriched = (data || []).map(c => {
          let isExpired = false;
          if (c.expiryDate) {
            const exp = new Date(c.expiryDate);
            isExpired = exp < today;
          }
          return { ...c, isExpired };
        });
        // Sort: valid first, then expired
        enriched.sort((a, b) => (a.isExpired ? 1 : 0) - (b.isExpired ? 1 : 0));
        setCoupons(enriched);
        setLoading(false);
      })
      .catch(err => {
        console.error('CouponPickerModal fetch error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // ── Live search filter ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter(c =>
      c.code?.toLowerCase().includes(q) ||
      c.service?.toLowerCase().includes(q) ||
      c.discount?.toLowerCase().includes(q)
    );
  }, [coupons, search]);

  // ── "Recommended" badge helper ──────────────────────────────────────────
  const isRecommended = (coupon) => {
    if (!subscriptionName || !coupon.service) return false;
    return coupon.service.toLowerCase().trim() === subscriptionName.toLowerCase().trim();
  };

  // ── Keyboard close ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Render ──────────────────────────────────────────────────────────────
  const content = (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Select a Coupon">

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>🏷️ Select a Coupon</h2>
            <p>Choose a coupon to apply to this subscription</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close coupon picker">
            &times;
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by code, service, or discount…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* List */}
        <div className={styles.list}>
          {loading && (
            <p className={styles.empty}>Loading coupons…</p>
          )}

          {!loading && error && (
            <p className={styles.empty}>⚠️ {error}</p>
          )}

          {!loading && !error && filtered.length === 0 && (
            <p className={styles.empty}>
              {coupons.length === 0
                ? 'No coupons in your Coupon Vault yet. Add coupons on the Coupons page.'
                : 'No coupons match your search.'}
            </p>
          )}

          {!loading && !error && filtered.map(coupon => {
            const recommended = isRecommended(coupon);
            const expiry = coupon.expiryDate
              ? new Date(coupon.expiryDate).toLocaleDateString()
              : 'No expiry';

            return (
              <div
                key={coupon.id}
                className={`${styles.couponRow} ${coupon.isExpired ? styles.disabled : ''}`}
                onClick={() => !coupon.isExpired && onSelect(coupon)}
                role="button"
                tabIndex={coupon.isExpired ? -1 : 0}
                aria-disabled={coupon.isExpired}
                onKeyDown={e => { if (!coupon.isExpired && (e.key === 'Enter' || e.key === ' ')) onSelect(coupon); }}
              >
                {/* Discount badge */}
                <div className={`${styles.discountBadge} ${coupon.isExpired ? styles.disabledBadge : ''}`}>
                  {coupon.discount || '—'} OFF
                </div>

                {/* Info */}
                <div className={styles.couponInfo}>
                  <div className={styles.couponCode}>{coupon.code}</div>
                  <div className={styles.couponMeta}>
                    {coupon.service ? `${coupon.service} · ` : ''}{expiry}
                  </div>
                </div>

                {/* Right badges */}
                <div className={styles.badgesRight}>
                  {recommended && !coupon.isExpired && (
                    <span className={styles.recommendedBadge}>⭐ Recommended</span>
                  )}
                  {coupon.isExpired && (
                    <span className={styles.expiredLabel}>Expired</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(content, document.body);
}
