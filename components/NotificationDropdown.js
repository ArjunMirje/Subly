"use client";

import { useState, useEffect, useRef } from 'react';
import { Calendar, Tag, AlertCircle, X, BellOff } from 'lucide-react';
import styles from './NotificationDropdown.module.css';
import { parseJsonResponse } from '@/lib/api-client';

export default function NotificationDropdown({ triggerRef, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const [style, setStyle] = useState({});

  useEffect(() => {
    const handleLayout = () => {
      if (!dropdownRef.current || !triggerRef?.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const isMobile = vw <= 768;
      if (isMobile) {
        const mobileWidth = Math.min(vw * 0.9, 420);
        const left = (vw - mobileWidth) / 2;
        const top = 70;
        setStyle({
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          width: `${mobileWidth}px`,
          maxHeight: '80vh',
          overflowY: 'auto'
        });
      } else {
        const dropdownWidth = 350; // Standard desktop width
        let top = triggerRect.bottom + 10;
        let left = triggerRect.right - dropdownWidth;

        // Overflow adjustments
        if (left + dropdownWidth > vw - 16) {
          left = vw - dropdownWidth - 16;
        }
        if (left < 16) {
          left = 16;
        }
        if (top < 0) {
          top = 10;
        }

        setStyle({
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          width: `${dropdownWidth}px`,
          maxHeight: '80vh',
          overflowY: 'auto'
        });
      }
    };

    handleLayout();
    window.addEventListener('resize', handleLayout);
    return () => window.removeEventListener('resize', handleLayout);
  }, [triggerRef]);

  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/notifications');
      const data = await parseJsonResponse(res, '/api/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Notifications] Error fetching:', err);
      setError(err.message);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      setError(null);
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      await parseJsonResponse(res, `/api/notifications/${id}`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('[Notifications] Error marking as read:', err);
      setError(err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      setError(null);
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      await parseJsonResponse(res, '/api/notifications');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('[Notifications] Error marking all as read:', err);
      setError(err.message);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'renewal': return <Calendar size={16} className={styles.iconRenewal} />;
      case 'coupon':  return <Tag size={16} className={styles.iconCoupon} />;
      default:        return <AlertCircle size={16} className={styles.iconSystem} />;
    }
  };

  const formatRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1)   return 'just now';
    if (diffMins < 60)  return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7)   return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div ref={dropdownRef} style={style} className={`glass-panel ${styles.dropdown}`}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <button
            onClick={onClose}
            className={styles.backBtn}
            aria-label="Close notifications"
          >
            ‹
          </button>
          <span className={styles.headerTitle}>
            Notifications
            {unreadCount > 0 && (
              <span className={styles.headerBadge}>{unreadCount}</span>
            )}
          </span>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className={styles.markAllBtn}>
            Mark all read
          </button>
        )}
      </div>

      {/* ── List ── */}
      <div className={styles.list}>
        {error ? (
          <div className={styles.emptyState}>
            <p className={styles.empty} style={{ color: 'var(--danger, #f7768e)' }}>⚠️ {error}</p>
          </div>
        ) : loading ? (
          <div className={styles.emptyState}>
            <p className={styles.empty}>Loading reminders...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <BellOff size={32} className={styles.emptyIcon} />
            <p className={styles.empty}>No upcoming subscription reminders.</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className={styles.itemIcon}>
                {getIcon(notification.type)}
              </div>
              <div className={styles.itemContent}>
                <div className={styles.itemHeader}>
                  <span className={styles.title}>{notification.title}</span>
                  <span className={styles.time}>
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </div>
                <p className={styles.message}>{notification.message?.split('\u200B')[0]}</p>
              </div>
              {!notification.isRead && <div className={styles.unreadDot} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
