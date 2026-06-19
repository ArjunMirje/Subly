"use client";

import { useState, useEffect } from 'react';
import { Calendar, Tag, AlertCircle, X, BellOff } from 'lucide-react';
import styles from './NotificationDropdown.module.css';
import { parseJsonResponse } from '@/lib/api-client';

export default function NotificationDropdown({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div className={`glass-panel ${styles.dropdown}`}>
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
