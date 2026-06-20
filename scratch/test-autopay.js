const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = 'test_coupon_lifecycle_1781929724430@gmail.com';
  const password = 'Password123';

  console.log('Signing in user:', email);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Sign in failed:', signInError.message);
    process.exit(1);
  }

  const userId = signInData.user.id;
  console.log('Signed in successfully. User ID:', userId);

  // Clean up any stale test subscriptions
  await supabase.from('subscriptions').delete().eq('userId', userId).eq('name', 'TEST_AUTOPAY_FLOW');
  await supabase.from('notifications').delete().eq('userId', userId).ilike('message', '%TEST_AUTOPAY_FLOW%');

  // Insert a test subscription
  // Let's set renewal date to a past date, e.g. 2026-05-15 (today is 2026-06-20).
  // So it should renew twice: 2026-05-15 -> 2026-06-15 -> 2026-07-15.
  console.log('Inserting test subscription...');
  const { data: newSub, error: insertError } = await supabase
    .from('subscriptions')
    .insert([{
      userId,
      name: 'TEST_AUTOPAY_FLOW',
      category: 'Software',
      cost: 500,
      billingCycle: 'monthly',
      renewalDate: '2026-05-15',
      status: 'active',
      autopayEnabled: true,
    }])
    .select()
    .single();

  if (insertError) {
    console.error('Insert error:', insertError.message);
    process.exit(1);
  }

  console.log('Inserted subscription:', newSub);

  // Dynamic import of processAutopayRenewals from lib/cron.js
  console.log('Importing processAutopayRenewals...');
  const cronModule = await import('../lib/cron.js');
  const processAutopayRenewals = cronModule.processAutopayRenewals;

  console.log('Running processAutopayRenewals...');
  await processAutopayRenewals(supabase);

  // Verify database state
  console.log('Fetching subscription from database to verify...');
  const { data: updatedSub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', newSub.id)
    .single();

  if (fetchError) {
    console.error('Fetch error:', fetchError.message);
    process.exit(1);
  }

  console.log('Updated subscription from database:', updatedSub);

  // Verify notifications
  console.log('Fetching notifications to verify...');
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('userId', userId)
    .ilike('message', '%TEST_AUTOPAY_FLOW%');

  if (notifError) {
    console.error('Notifications fetch error:', notifError.message);
    process.exit(1);
  }

  console.log('Inserted notifications matching test subscription:', notifications);

  // ASSERTIONS
  console.log('--- TEST RESULTS ---');
  let passed = true;

  // Since original date was 2026-05-15 and today is 2026-06-20,
  // renewal should advance: 2026-05-15 -> 2026-06-15 -> 2026-07-15.
  const expectedRenewalDate = '2026-07-15';
  if (updatedSub.renewalDate !== expectedRenewalDate) {
    console.error(`FAIL: expected renewalDate to be ${expectedRenewalDate}, got ${updatedSub.renewalDate}`);
    passed = false;
  } else {
    console.log('PASS: renewalDate advanced correctly to 2026-07-15.');
  }

  if (updatedSub.status !== 'active') {
    console.error(`FAIL: expected status to be 'active', got ${updatedSub.status}`);
    passed = false;
  } else {
    console.log('PASS: status is active.');
  }

  if (notifications.length === 0) {
    console.error('FAIL: no notification was created for the automatic renewal.');
    passed = false;
  } else {
    const displayMsg = notifications[0].message.split('\u200B')[0];
    const expectedMsg = 'Your autopay-enabled TEST_AUTOPAY_FLOW subscription has been automatically renewed. The next renewal date is 15 Jul 2026.';
    if (displayMsg !== expectedMsg) {
      console.error(`FAIL: notification message was "${displayMsg}", expected "${expectedMsg}"`);
      passed = false;
    } else {
      console.log('PASS: notification message is correct.');
    }
  }

  // Clean up
  console.log('Cleaning up test data...');
  await supabase.from('subscriptions').delete().eq('id', newSub.id);
  await supabase.from('notifications').delete().eq('userId', userId).ilike('message', '%TEST_AUTOPAY_FLOW%');
  console.log('Clean up complete.');

  if (passed) {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('SOME TESTS FAILED.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Unhandled run error:', err);
  process.exit(1);
});
