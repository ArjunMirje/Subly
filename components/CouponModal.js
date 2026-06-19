"use client";
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';
import { parseJsonResponse } from '@/lib/api-client';

/**
 * CouponModal handles both Add (coupon === null) and Edit (coupon !== null).
 *
 * Props:
 *  coupon   – existing coupon object for editing, or null/undefined for adding
 *  onClose  – callback to close the modal
 *  onSave   – callback after a successful save (refreshes the list)
 */
export default function CouponModal({ coupon = null, onClose, onSave }) {
  const isEditing = !!coupon;

  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount: '',
    service: '',
    expiryDate: '',
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill form when editing
  useEffect(() => {
    if (coupon) {
      setFormData({
        code: coupon.code || '',
        discount: coupon.discount || '',
        service: coupon.service || '',
        // null → display as empty string so the date input works correctly
        expiryDate: coupon.expiryDate || '',
      });
    }
  }, [coupon]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Normalise expiry: empty string → null (stored as "Not Specified")
      const payload = {
        ...formData,
        expiryDate: formData.expiryDate.trim() === '' ? null : formData.expiryDate,
      };

      const url    = isEditing ? `/api/coupons/${coupon.id}` : '/api/coupons';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await parseJsonResponse(res, url);

      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving coupon:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className={styles.overlay} style={{ zIndex: 9999 }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEditing ? 'Edit Coupon' : 'Add New Coupon'}</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Close">&times;</button>
        </div>

        {error && (
          <div className="error-banner" style={{
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
          {/* Coupon Code */}
          <div className={styles.formGroup}>
            <label htmlFor="cm-code">Coupon Code</label>
            <input
              id="cm-code"
              type="text"
              name="code"
              required
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g. FREE50"
              autoComplete="off"
            />
          </div>

          {/* Discount */}
          <div className={styles.formGroup}>
            <label htmlFor="cm-discount">Discount Amount / Percentage</label>
            <input
              id="cm-discount"
              type="text"
              name="discount"
              value={formData.discount}
              onChange={handleChange}
              placeholder="e.g. 20% or ₹15 (optional)"
            />
          </div>

          {/* Service */}
          <div className={styles.formGroup}>
            <label htmlFor="cm-service">Applicable Service</label>
            <input
              id="cm-service"
              type="text"
              name="service"
              required
              value={formData.service}
              onChange={handleChange}
              placeholder="e.g. Netflix, Spotify"
            />
          </div>

          {/* Expiry Date — optional; empty = Not Specified */}
          <div className={styles.formGroup}>
            <label htmlFor="cm-expiry">
              Expiry Date{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                (leave blank for Not Specified)
              </span>
            </label>
            <input
              id="cm-expiry"
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
            />
            {formData.expiryDate === '' && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Currently: Not Specified
              </span>
            )}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={saving}
            >
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
