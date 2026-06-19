"use client";
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, WalletCards, Tags, BarChart3, FileText, Bell, LogOut, Menu, X } from 'lucide-react';
import styles from './MainLayout.module.css';
import { useState, useEffect } from 'react';
import SubscriptionModal from '@/components/SubscriptionModal';
import NotificationDropdown from '@/components/NotificationDropdown';
import { parseJsonResponse } from '@/lib/api-client';

const NavigationLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/subscriptions', label: 'Subscriptions', icon: WalletCards },
  { href: '/coupons', label: 'Coupons', icon: Tags },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/reports', label: 'Reports', icon: FileText },
];

export default function MainLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check if current route is a public/auth route
  const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (!isPublicRoute) {
      fetchUser();
    } else {
      setUser(null);
    }
  }, [isPublicRoute]);

  useEffect(() => {
    if (!isPublicRoute && user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [isPublicRoute, user]);

  // Close notifications dropdown and sidebar when navigating/changing tabs
  useEffect(() => {
    setIsNotifOpen(false);
    setIsSidebarOpen(false);
  }, [pathname]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.status === 401) {
        console.warn('[MainLayout] User session unauthorized (401). Redirecting to login page.');
        router.push('/login');
        return;
      }
      
      const data = await parseJsonResponse(res, '/api/auth/me');
      setUser(data);
    } catch (err) {
      console.error('[MainLayout] Failed to fetch user session:', err);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await fetch('/api/notifications');
      if (res.status === 401 || res.status === 403) {
        console.warn('[MainLayout] Unread notification count API returned unauthorized status:', res.status);
        setUnreadCount(0);
        return;
      }
      const data = await parseJsonResponse(res, '/api/notifications');
      const unread = Array.isArray(data) ? data.filter(n => !n.isRead).length : 0;
      setUnreadCount(unread);
    } catch (error) {
      console.warn('[MainLayout] Safe warning: Failed to fetch notification count:', error.message);
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    try {
      setUser(null);
      setUnreadCount(0);
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      await parseJsonResponse(res, '/api/auth/logout');
    } catch (err) {
      console.error('[MainLayout] Failed logout call:', err);
    } finally {
      router.push('/');
      router.refresh();
    }
  };

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className={styles.container}>
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className={styles.sidebarOverlay} 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
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
          <h1 className={styles.logoText}>Subly</h1>
          <button 
            type="button"
            className={styles.closeSidebarBtn} 
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          <ul>
            {NavigationLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link href={link.href} className={`${styles.navLink} ${isActive ? styles.active : ''}`}>
                    <Icon size={20} className={styles.navIcon} />
                    <span>{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>{user?.name?.charAt(0) || 'U'}</div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user?.name || 'Loading...'}</p>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        <header className={styles.header}>
          <button 
            type="button"
            className={styles.hamburger} 
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open Sidebar"
          >
            <Menu size={24} />
          </button>

          <div className={styles.headerActions}>
            <div className={styles.notifWrapper}>
              <button 
                className={styles.iconButton} 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
              </button>
              {isNotifOpen && (
                <NotificationDropdown onClose={() => setIsNotifOpen(false)} />
              )}
            </div>
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
