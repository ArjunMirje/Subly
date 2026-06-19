"use client";
import { useState, useEffect } from 'react';
import styles from './Modal.module.css';
import couponStyles from './SubscriptionModal.module.css';
import { parseJsonResponse } from '@/lib/api-client';
import CouponPickerModal from './CouponPickerModal';

// ── Cost estimation ─────────────────────────────────────────────────────────
/**
 * Calculate the discounted cost given the original cost and a discount string.
 *
 * Supported formats:
 *   "20%"         → percentage off
 *   "20% OFF"     → percentage off
 *   "₹100"        → flat amount off
 *   "100"         → flat amount off
 *   "₹100 OFF"    → flat amount off
 *
 * Returns null if the discount string is unparseable.
 *
 * @param {number} cost
 * @param {string} discount
 * @returns {number|null}
 */
function calcDiscountedCost(cost, discount) {
  if (!cost || !discount) return null;
  const raw = discount.toString().replace(/off/i, '').trim();

  // Percentage: ends with %
  if (raw.endsWith('%')) {
    const pct = parseFloat(raw);
    if (isNaN(pct)) return null;
    return Math.max(0, cost * (1 - pct / 100));
  }

  // Flat amount: strip ₹, $, Rs, etc.
  const flat = parseFloat(raw.replace(/[₹$£€Rs,\s]/gi, ''));
  if (!isNaN(flat)) {
    return Math.max(0, cost - flat);
  }

  return null;
}

// ── Main component ──────────────────────────────────────────────────────────
export default function SubscriptionModal({ subscription, onClose, onSave }) {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Entertainment',
    cost: '',
    billingCycle: 'monthly',
    renewalDate: '',
    url: '',
    notes: '',
    autopayEnabled: false,
  });

  // Coupon state
  const [selectedCoupon, setSelectedCoupon] = useState(null);  // { id, code, discount, service, … }
  const [isCouponPickerOpen, setIsCouponPickerOpen] = useState(false);

  const [error, setError] = useState(null);

  // ── Initialise form data ──────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);

    if (subscription) {
      setFormData({
        ...subscription,
        autopayEnabled: subscription.autopayEnabled ?? false,
      });

      // Pre-populate coupon if editing a subscription that already has one
      if (subscription.couponCode) {
        setSelectedCoupon({
          id:       subscription.couponId       ?? null,
          code:     subscription.couponCode     ?? '',
          discount: subscription.couponDiscount ?? '',
          service:  '',   // service not stored on subscription; picker will re-fetch when opened
        });
      }
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      setFormData(prev => ({
        ...prev,
        renewalDate: d.toISOString().split('T')[0],
        autopayEnabled: false,
      }));
    }
  }, [subscription]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCouponSelect = (coupon) => {
    setSelectedCoupon(coupon);
    setIsCouponPickerOpen(false);
  };

  const handleRemoveCoupon = () => {
    setSelectedCoupon(null);
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const isEditing = !!subscription;
      const url    = isEditing ? `/api/subscriptions/${subscription.id}` : '/api/subscriptions';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        couponId:       selectedCoupon?.id       ?? null,
        couponCode:     selectedCoupon?.code     ?? null,
        couponDiscount: selectedCoupon?.discount ?? null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await parseJsonResponse(res, url);
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving subscription:', err);
      setError(err.message);
    }
  };

  // ── Discount display helpers ──────────────────────────────────────────────
  const originalCost = parseFloat(formData.cost) || 0;
  const estimatedCost = selectedCoupon
    ? calcDiscountedCost(originalCost, selectedCoupon.discount)
    : null;

  const fmt = (n) =>
    Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  if (!mounted) return null;

  return (
    <>
      <div className={styles.overlay} style={{ zIndex: 9999 }}>
        <div className={`${styles.modal} ${couponStyles.modal}`}>
          <div className={styles.header}>
            <h2>{subscription ? 'Edit Subscription' : 'Add Subscription'}</h2>
            <button type="button" onClick={onClose} className={styles.closeBtn}>&times;</button>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'rgba(247, 118, 142, 0.1)',
              border: '1px solid var(--danger, #f7768e)',
              color: 'var(--danger, #f7768e)',
              padding: '0.75rem 1rem',
              margin: '0 1.5rem 1rem 1.5rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* ── Service Name ── */}
            <div className={styles.formGroup}>
              <label>Service Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Netflix, Spotify"
              />
            </div>

            {/* ── Category + Cost ── */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Category</label>
                <select
                  name="category"
                  value={formData.category === 'Utility' ? 'Utilities' : formData.category}
                  onChange={handleChange}
                >
                  <option value="Entertainment">Entertainment</option>
                  <option value="Music">Music</option>
                  <option value="Software">Software</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Fitness">Fitness</option>
                  <option value="Work">Work</option>
                  <option value="Education">Education</option>
                  <option value="Cloud &amp; Storage">Cloud &amp; Storage</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Finance">Finance</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Cost (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  name="cost"
                  required
                  value={formData.cost}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={styles.noSpin}
                />
              </div>
            </div>

            {/* ── Billing Cycle + Renewal Date ── */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Billing Cycle</label>
                <select name="billingCycle" value={formData.billingCycle} onChange={handleChange}>
                  <option value="monthly">Monthly</option>
                  <option value="half-yearly">Half-Yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Renewal Date</label>
                <input
                  type="date"
                  name="renewalDate"
                  required
                  value={formData.renewalDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* ── AutoPay ── */}
            <div className={styles.formGroup}>
              <label>AutoPay</label>
              <select
                name="autopayEnabled"
                value={formData.autopayEnabled ? 'true' : 'false'}
                onChange={(e) =>
                  setFormData(prev => ({ ...prev, autopayEnabled: e.target.value === 'true' }))
                }
              >
                <option value="false">OFF</option>
                <option value="true">ON</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #565f89)', marginTop: '4px', display: 'block' }}>
                Enable this if the subscription renews automatically. For tracking and reminders only.
              </span>
            </div>

            {/* ── Use Coupon ─────────────────────────────────────────────── */}
            <div className={couponStyles.couponSection}>
              <div className={couponStyles.couponSectionLabel}>🏷️ Use Coupon</div>

              {!selectedCoupon ? (
                /* ── No coupon selected ── */
                <div className={couponStyles.couponEmpty}>
                  <span className={couponStyles.noCouponText}>No Coupon Selected</span>
                  <button
                    type="button"
                    className={couponStyles.selectCouponBtn}
                    onClick={() => setIsCouponPickerOpen(true)}
                  >
                    Select Coupon
                  </button>
                </div>
              ) : (
                /* ── Coupon applied ── */
                <div className={couponStyles.couponApplied}>
                  <div className={couponStyles.couponAppliedHeader}>
                    <div className={couponStyles.couponAppliedBadge}>
                      <span className={couponStyles.couponAppliedCode}>{selectedCoupon.code}</span>
                      <span className={couponStyles.couponAppliedDiscount}>{selectedCoupon.discount} OFF</span>
                    </div>
                    {selectedCoupon.service && (
                      <span className={couponStyles.couponAppliedService}>{selectedCoupon.service}</span>
                    )}
                  </div>

                  {/* ── Cost breakdown ── */}
                  {originalCost > 0 && (
                    <div className={couponStyles.costBreakdown}>
                      <div className={couponStyles.costRow}>
                        <span>Original Cost</span>
                        <span>{fmt(originalCost)}</span>
                      </div>
                      <div className={couponStyles.costRow}>
                        <span>Discount</span>
                        <span className={couponStyles.discountValue}>
                          {selectedCoupon.discount} OFF
                        </span>
                      </div>
                      <div className={`${couponStyles.costRow} ${couponStyles.estimatedRow}`}>
                        <span>Estimated After Coupon</span>
                        <span className={couponStyles.estimatedValue}>
                          {estimatedCost !== null ? fmt(estimatedCost) : '—'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── Action buttons ── */}
                  <div className={couponStyles.couponActions}>
                    <button
                      type="button"
                      className={couponStyles.changeCouponBtn}
                      onClick={() => setIsCouponPickerOpen(true)}
                    >
                      Change Coupon
                    </button>
                    <button
                      type="button"
                      className={couponStyles.removeCouponBtn}
                      onClick={handleRemoveCoupon}
                    >
                      Remove Coupon
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className={styles.footer}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>Cancel</button>
              <button type="submit" className={styles.submitBtn}>
                {subscription ? 'Save Changes' : 'Add Subscription'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Coupon Picker overlay ── */}
      {isCouponPickerOpen && (
        <CouponPickerModal
          subscriptionName={formData.name}
          onSelect={handleCouponSelect}
          onClose={() => setIsCouponPickerOpen(false)}
        />
      )}
    </>
  );
}
