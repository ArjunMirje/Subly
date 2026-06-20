import cron from 'node-cron';
import { supabase } from './supabase.js';
import mailer from './mailer.js';

// Reminder windows in days (days before renewal to fire notification)
const REMINDER_DAYS = [7, 3, 1, 0];

// ─── Public API ──────────────────────────────────────────────────────────────

export function initCron() {
  // Run every hour
  cron.schedule('0 * * * *', () => {
    checkAndGenerateNotifications().catch(err =>
      console.error('[CRON] Unhandled error in scheduled check:', err)
    );
  });

  // Also run immediately on server startup
  checkAndGenerateNotifications().catch(err =>
    console.error('[CRON] Unhandled error in startup check:', err)
  );
}

// Exported so API routes can trigger an on-demand check before returning data
export async function checkAndGenerateNotifications() {
  try {
    await processAutopayRenewals();
    await checkSubscriptionReminders();
    await checkExpiredSubscriptions();
    await checkCouponReminders();
  } catch (err) {
    console.error('[CRON] Error in checkAndGenerateNotifications:', err);
  }
}


/**
 * Immediately checks and generates a notification for a single subscription.
 * Called after add or edit so the user sees the notification right away
 * without waiting for the hourly cron or a full panel reload.
 *
 * @param {{ id: string, userId: string, name: string, renewalDate: string }} sub
 */
export async function checkSingleSubscriptionNotification(sub) {
  try {
    if (!sub?.renewalDate || !sub?.userId) return;

    const days      = daysDiff(sub.renewalDate);
    const threshold = getReminderThreshold(days);

    if (threshold === null) return; // not within reminder window

    if (sub.autopayEnabled) {
      const title = 'AutoPay Renewal Reminder';
      const baseMessage = buildAutoPayMessage(sub.name, sub.renewalDate, threshold, days);
      const message = baseMessage + '\u200B' + sub.id + '\u200B' + threshold + '\u200B' + sub.renewalDate + '\u200B' + (sub.autopayEnabled ? '1' : '0');
      await createNotificationIfNew(sub.userId, title, message, 'renewal');
    } else {
      const title   = 'Upcoming Renewal';
      const message = buildRenewalMessage(sub.name, threshold);
      await createNotificationIfNew(sub.userId, title, message, 'renewal');
    }
  } catch (err) {
    console.error('[CRON] checkSingleSubscriptionNotification error:', err);
  }
}

/**
 * Immediately checks and generates a notification for a single coupon.
 * Called after saving a coupon.
 *
 * @param {{ id: string, userId: string, code: string, service: string, expiryDate: string }} coupon
 */
export async function checkSingleCouponNotification(coupon) {
  try {
    if (!coupon?.expiryDate || !coupon?.userId) return;

    const days      = daysDiff(coupon.expiryDate);
    const threshold = getReminderThreshold(days);

    if (threshold === null) return; // not within reminder window

    const title = 'Coupon Expiring Soon';
    let message = '';

    if (days <= 1) {
      message = `Your coupon ${coupon.code} expires tomorrow.`;
    } else {
      const [year, month, day] = coupon.expiryDate.split('-').map(Number);
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = monthNames[month - 1];
      const formattedDate = `${day} ${monthName} ${year}`;
      
      const servicePart = (coupon.service && coupon.service !== 'Other') 
        ? ` for ${coupon.service}` 
        : '';
      message = `Your coupon ${coupon.code}${servicePart} expires on ${formattedDate}.`;
    }

    await createNotificationIfNew(coupon.userId, title, message, 'coupon');
  } catch (err) {
    console.error('[CRON] checkSingleCouponNotification error:', err);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Pure-date difference in whole days (ignores time / timezone).
 * Returns a non-negative integer, or -1 if renewalDateStr is in the past.
 */
function daysDiff(renewalDateStr) {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  // Parse as local midnight to avoid UTC-shift issues
  const [year, month, day] = renewalDateStr.split('-').map(Number);
  const renewalMidnight = new Date(year, month - 1, day);

  const diffMs = renewalMidnight - todayMidnight;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns the threshold bucket (1, 3, or 7) for the given days count,
 * implementing priority: only the single most-urgent bucket fires.
 * Returns null if the subscription is not within the 7-day window (or is in the past).
 */
function getReminderThreshold(days) {
  if (days < 0) return null;  // already expired — handled elsewhere
  if (days <= 1) return 1;    // highest priority: tomorrow or today
  if (days <= 3) return 3;
  if (days <= 7) return 7;
  return null;                // more than 7 days away — no reminder yet
}

/**
 * Builds the human-readable notification message per the user spec.
 * Examples:
 *   "Netflix renews in 7 days or less."
 *   "Spotify renews in 3 days or less."
 *   "Prime renews tomorrow or today."
 */
function buildRenewalMessage(subName, threshold) {
  if (threshold === 1) return `${subName} renews tomorrow or today.`;
  if (threshold === 3) return `${subName} renews in 3 days or less.`;
  return `${subName} renews in 7 days or less.`;
}

const shortMonthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function formatRenewalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const monthName = shortMonthNames[month - 1];
  return `${day} ${monthName} ${year}`;
}

function buildAutoPayMessage(subName, renewalDateStr, threshold, days) {
  const formattedRenewalDate = formatRenewalDate(renewalDateStr);

  if (threshold === 1) {
    return `Your autopay-enabled ${subName} subscription will automatically renew tomorrow (${formattedRenewalDate}). This is a reminder.`;
  }
  if (threshold === 3) {
    return `Your autopay-enabled ${subName} subscription will automatically renew in 3 days on ${formattedRenewalDate}. This is a reminder.`;
  }
  return `Your autopay-enabled ${subName} subscription will automatically renew on ${formattedRenewalDate}. This is a reminder.`;
}

// ─── Notification Checks ─────────────────────────────────────────────────────

async function checkSubscriptionReminders() {
  // Fetch all non-expired subscriptions that renew within the next 7 days
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const sevenDaysYear = sevenDaysOut.getFullYear();
  const sevenDaysMonth = String(sevenDaysOut.getMonth() + 1).padStart(2, '0');
  const sevenDaysDay = String(sevenDaysOut.getDate()).padStart(2, '0');
  const sevenDaysStr = `${sevenDaysYear}-${sevenDaysMonth}-${sevenDaysDay}`;

  const { data: upcomingSubs, error } = await supabase
    .from('subscriptions')
    .select('*')
    .gte('renewalDate', todayStr)
    .lte('renewalDate', sevenDaysStr)
    .neq('status', 'expired');

  if (error) {
    console.error('[CRON] Error fetching upcoming subscriptions:', error.message);
    return;
  }

  for (const sub of (upcomingSubs || [])) {
    const days      = daysDiff(sub.renewalDate);
    const threshold = getReminderThreshold(days);
    if (threshold === null) continue; // outside all reminder windows

    if (sub.autopayEnabled) {
      const title = 'AutoPay Renewal Reminder';
      const baseMessage = buildAutoPayMessage(sub.name, sub.renewalDate, threshold, days);
      const message = baseMessage + '\u200B' + sub.id + '\u200B' + threshold + '\u200B' + sub.renewalDate + '\u200B' + (sub.autopayEnabled ? '1' : '0');
      await createNotificationIfNew(sub.userId, title, message, 'renewal');
    } else {
      const title   = 'Upcoming Renewal';
      const message = buildRenewalMessage(sub.name, threshold);
      await createNotificationIfNew(sub.userId, title, message, 'renewal');
    }
  }
}


async function checkExpiredSubscriptions() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const { data: expiredSubs, error } = await supabase
    .from('subscriptions')
    .select('*')
    .lt('renewalDate', todayStr)
    .neq('status', 'expired')
    .eq('autopayEnabled', false);

  if (error) {
    console.error('[CRON] Error fetching expired subscriptions:', error.message);
    return;
  }

  for (const sub of (expiredSubs || [])) {
    // Mark as expired in DB
    await supabase
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('id', sub.id);

    const title   = 'Subscription Expired';
    const message = `${sub.name} subscription has expired.`;
    await createNotificationIfNew(sub.userId, title, message, 'renewal');
  }
}

async function checkCouponReminders() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const sevenDaysYear = sevenDaysOut.getFullYear();
  const sevenDaysMonth = String(sevenDaysOut.getMonth() + 1).padStart(2, '0');
  const sevenDaysDay = String(sevenDaysOut.getDate()).padStart(2, '0');
  const sevenDaysStr = `${sevenDaysYear}-${sevenDaysMonth}-${sevenDaysDay}`;

  const { data: expiringCoupons, error } = await supabase
    .from('coupons')
    .select('*')
    .gte('expiryDate', todayStr)
    .lte('expiryDate', sevenDaysStr);

  if (error) {
    console.error('[CRON] Error fetching expiring coupons:', error.message);
    return;
  }

  for (const coupon of (expiringCoupons || [])) {
    await checkSingleCouponNotification(coupon);
  }
}

// ─── Persistence ─────────────────────────────────────────────────────────────

/**
 * Inserts a notification only if an identical one has NOT been created
 * in the last 15 days. This prevents duplicates across server restarts
 * and repeated page loads while still allowing future billing cycles.
 */
async function createNotificationIfNew(userId, title, message, type, supabaseClient) {
  if (!userId) return;

  const client = supabaseClient || supabase;
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const lookbackStr = fifteenDaysAgo.toISOString();


  const { data: existing } = await client
    .from('notifications')
    .select('id')
    .eq('userId', userId)
    .eq('message', message)           // message is unique per stage + subscription
    .gte('created_at', lookbackStr)
    .maybeSingle();                   // maybeSingle() never throws on no-rows

  if (existing) {
    // Duplicate — skip silently
    return;
  }

  const { error: insertError } = await client
    .from('notifications')
    .insert([{ userId, title, message, type }]);

  if (insertError) {
    console.error('[CRON] Failed to insert notification:', insertError.message);
    return;
  }

  // Attempt to send email notification
  try {
    const { data: profile } = await client
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.email) {
      const displayMessage = message.split('\u200B')[0];
      await mailer.sendNotificationEmail(profile.email, title, displayMessage, `<p>${displayMessage}</p>`);
    }
  } catch (err) {
    console.error('[CRON] Failed to send notification email:', err.message);
  }
}

function getNextRenewalDate(currentRenewalDateStr, billingCycle) {
  const [year, month, day] = currentRenewalDateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (billingCycle === 'monthly') {
    const expectedMonth = (date.getMonth() + 1) % 12;
    date.setMonth(date.getMonth() + 1);
    if (date.getMonth() !== expectedMonth) {
      date.setDate(0);
    }
  } else if (billingCycle === 'half-yearly') {
    const expectedMonth = (date.getMonth() + 6) % 12;
    date.setMonth(date.getMonth() + 6);
    if (date.getMonth() !== expectedMonth) {
      date.setDate(0);
    }
  } else if (billingCycle === 'yearly') {
    const expectedMonth = date.getMonth();
    date.setFullYear(date.getFullYear() + 1);
    if (date.getMonth() !== expectedMonth) {
      date.setDate(0);
    }
  }

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export async function processAutopayRenewals(supabaseClient) {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const client = supabaseClient || supabase;

    const { data: subsToRenew, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('autopayEnabled', true)
      .lte('renewalDate', todayStr);

    if (error) {
      console.error('[CRON] Error fetching subscriptions for autopay renewal:', error.message);
      return;
    }

    for (const sub of (subsToRenew || [])) {
      let currentRenewalDate = sub.renewalDate;
      const originalRenewalDate = sub.renewalDate;
      let renewed = false;
      let loopCount = 0;

      while (currentRenewalDate <= todayStr && loopCount < 100) {
        currentRenewalDate = getNextRenewalDate(currentRenewalDate, sub.billingCycle);
        renewed = true;
        loopCount++;
      }

      if (renewed) {
        const { error: updateError } = await client
          .from('subscriptions')
          .update({
            renewalDate: currentRenewalDate,
            status: 'active'
          })
          .eq('id', sub.id);

        if (updateError) {
          console.error(`[CRON] Error updating subscription ${sub.id} for autopay:`, updateError.message);
          continue;
        }

        const formattedNextDate = formatRenewalDate(currentRenewalDate);
        const title = 'AutoPay Renewed';
        const baseMessage = `Your autopay-enabled ${sub.name} subscription has been automatically renewed. The next renewal date is ${formattedNextDate}.`;
        const threshold = 0;
        const message = baseMessage + '\u200B' + sub.id + '\u200B' + threshold + '\u200B' + originalRenewalDate + '\u200B1';

        await createNotificationIfNew(sub.userId, title, message, 'renewal', client);
      }
    }
  } catch (err) {
    console.error('[CRON] processAutopayRenewals error:', err);
  }
}

