import fs from 'fs';
import path from 'path';

const MOCK_DATA_DIR = path.join(process.cwd(), 'data');

if (!fs.existsSync(MOCK_DATA_DIR)) {
  fs.mkdirSync(MOCK_DATA_DIR, { recursive: true });
}

function getRelativeDateStr(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitialSubscriptions() {
  return [
    {
      id: 'sub-netflix',
      userId: 'mock-user-uuid',
      name: 'Netflix',
      category: 'Entertainment',
      cost: 649,
      billingCycle: 'monthly',
      renewalDate: getRelativeDateStr(1), // Tomorrow
      status: 'active',
      autopayEnabled: true,
      url: 'https://netflix.com',
      notes: 'Standard HD plan',
      created_at: new Date().toISOString()
    },
    {
      id: 'sub-spotify',
      userId: 'mock-user-uuid',
      name: 'Spotify',
      category: 'Music',
      cost: 179,
      billingCycle: 'monthly',
      renewalDate: getRelativeDateStr(3), // 3 days from now
      status: 'active',
      autopayEnabled: false,
      url: 'https://spotify.com',
      notes: 'Premium Duo plan',
      created_at: new Date().toISOString()
    },
    {
      id: 'sub-youtube',
      userId: 'mock-user-uuid',
      name: 'YouTube Premium',
      category: 'Music',
      cost: 129,
      billingCycle: 'monthly',
      renewalDate: getRelativeDateStr(10), // 10 days from now
      status: 'active',
      autopayEnabled: true,
      url: 'https://youtube.com',
      notes: 'Individual plan',
      created_at: new Date().toISOString()
    },
    {
      id: 'sub-copilot',
      userId: 'mock-user-uuid',
      name: 'GitHub Copilot',
      category: 'Software',
      cost: 820,
      billingCycle: 'monthly',
      renewalDate: getRelativeDateStr(-5), // Expired 5 days ago
      status: 'expired',
      autopayEnabled: false,
      url: 'https://github.com',
      notes: 'Expired trial',
      created_at: new Date().toISOString()
    }
  ];
}

function getInitialCoupons() {
  return [
    {
      id: 'coupon-netflix',
      userId: 'mock-user-uuid',
      code: 'NETFLIX50',
      discount: '50%',
      expiryDate: '', // Global/No expiry
      service: 'Netflix',
      created_at: new Date().toISOString()
    },
    {
      id: 'coupon-spotify',
      userId: 'mock-user-uuid',
      code: 'SPOTIFYFREE',
      discount: '100%',
      expiryDate: getRelativeDateStr(3), // Expires in 3 days
      service: 'Spotify',
      created_at: new Date().toISOString()
    }
  ];
}

function getInitialNotifications() {
  return [
    {
      id: 'notif-1',
      userId: 'mock-user-uuid',
      title: 'AutoPay Renewal Reminder',
      message: `Your AutoPay subscription of Netflix is going to auto-renew on ${new Date(getRelativeDateStr(1)).toLocaleDateString()}. This is just a reminder.`,
      isRead: false,
      type: 'renewal',
      created_at: new Date().toISOString()
    },
    {
      id: 'notif-2',
      userId: 'mock-user-uuid',
      title: 'Upcoming Renewal',
      message: 'Spotify renews in 3 days or less.',
      isRead: false,
      type: 'renewal',
      created_at: new Date().toISOString()
    }
  ];
}

function readJsonFile(filename, defaultValGenerator) {
  const filePath = path.join(MOCK_DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    const initialData = defaultValGenerator();
    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return defaultValGenerator();
  }
}

function writeJsonFile(filename, data) {
  const filePath = path.join(MOCK_DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function getMockSubscriptions() {
  return readJsonFile('mock_subscriptions.json', getInitialSubscriptions);
}

export function saveMockSubscription(sub) {
  const subs = getMockSubscriptions();
  if (sub.id) {
    const index = subs.findIndex(s => s.id === sub.id);
    if (index !== -1) {
      subs[index] = { ...subs[index], ...sub };
    } else {
      subs.push(sub);
    }
  } else {
    sub.id = 'sub-' + Date.now().toString();
    sub.created_at = new Date().toISOString();
    subs.push(sub);
  }
  writeJsonFile('mock_subscriptions.json', subs);
  return sub;
}

export function deleteMockSubscription(id) {
  const subs = getMockSubscriptions();
  const filtered = subs.filter(s => s.id !== id);
  writeJsonFile('mock_subscriptions.json', filtered);
  return true;
}

export function getMockCoupons() {
  return readJsonFile('mock_coupons.json', getInitialCoupons);
}

export function saveMockCoupon(coupon) {
  const coupons = getMockCoupons();
  if (coupon.id) {
    const index = coupons.findIndex(c => c.id === coupon.id);
    if (index !== -1) {
      coupons[index] = { ...coupons[index], ...coupon };
    } else {
      coupons.push(coupon);
    }
  } else {
    coupon.id = 'coupon-' + Date.now().toString();
    coupon.created_at = new Date().toISOString();
    coupons.push(coupon);
  }
  writeJsonFile('mock_coupons.json', coupons);
  return coupon;
}

export function getMockNotifications() {
  return readJsonFile('mock_notifications.json', getInitialNotifications);
}

export function saveMockNotification(notif) {
  const notifs = getMockNotifications();
  if (notif.id) {
    const index = notifs.findIndex(n => n.id === notif.id);
    if (index !== -1) {
      notifs[index] = { ...notifs[index], ...notif };
    } else {
      notifs.push(notif);
    }
  } else {
    notif.id = 'notif-' + Date.now().toString();
    notif.created_at = new Date().toISOString();
    notifs.push(notif);
  }
  writeJsonFile('mock_notifications.json', notifs);
  return notif;
}

export function markMockNotificationsAsRead() {
  const notifs = getMockNotifications();
  const updated = notifs.map(n => ({ ...n, isRead: true }));
  writeJsonFile('mock_notifications.json', updated);
  return true;
}

export function markMockNotificationAsRead(id) {
  const notifs = getMockNotifications();
  const updated = notifs.map(n => n.id === id ? { ...n, isRead: true } : n);
  writeJsonFile('mock_notifications.json', updated);
  return true;
}
