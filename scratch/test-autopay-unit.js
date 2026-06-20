const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Load environment variables for the supabase client imports
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

// Helper to create a fluent query chain
function createChain(resolver) {
  const chain = {};
  const methods = ['select', 'eq', 'neq', 'lte', 'gte', 'lt', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'delete'];
  methods.forEach(m => {
    chain[m] = (arg1, arg2) => {
      // If we are executing the query, return the resolver's promise
      if (m === 'single' || m === 'maybeSingle') {
        return resolver();
      }
      return chain;
    };
  });
  // Make the chain directly thenable (e.g. await query)
  chain.then = (onfulfilled, onrejected) => resolver().then(onfulfilled, onrejected);
  return chain;
}

async function runTests() {
  console.log('=== STARTING AUTOPAY UNIT TESTS ===');

  // Dynamic import of cron.js ESM
  const cron = await import('../lib/cron.js');
  const processAutopayRenewals = cron.processAutopayRenewals;

  let updateCalled = false;
  let updatePayload = null;
  let insertCalled = false;
  let insertPayload = null;

  const mockSupabase = {
    from(table) {
      if (table === 'subscriptions') {
        return {
          select: () => createChain(() => Promise.resolve({
            data: [{
              id: 123,
              userId: 'user-456',
              name: 'Netflix',
              cost: 199,
              billingCycle: 'monthly',
              renewalDate: '2026-05-15',
              status: 'active',
              autopayEnabled: true
            }],
            error: null
          })),
          update: (payload) => {
            updateCalled = true;
            updatePayload = payload;
            return createChain(() => Promise.resolve({ error: null }));
          }
        };
      }
      if (table === 'notifications') {
        return {
          select: () => createChain(() => Promise.resolve({ data: null, error: null })),
          insert: (payloads) => {
            insertCalled = true;
            insertPayload = payloads[0];
            return createChain(() => Promise.resolve({ error: null }));
          }
        };
      }
      if (table === 'profiles') {
        return {
          select: () => createChain(() => Promise.resolve({ data: { email: 'test@example.com' }, error: null }))
        };
      }
    }
  };

  // Run the renewals processor
  await processAutopayRenewals(mockSupabase);

  // Assertions
  try {
    assert.strictEqual(updateCalled, true, 'Database update was not called.');
    console.log('PASS: Database update was called.');

    assert.strictEqual(updatePayload.renewalDate, '2026-07-15', `Expected renewalDate '2026-07-15', got '${updatePayload.renewalDate}'`);
    console.log('PASS: Date advanced correctly from 2026-05-15 to 2026-07-15.');

    assert.strictEqual(updatePayload.status, 'active', `Expected status to remain 'active', got '${updatePayload.status}'`);
    console.log('PASS: Status remains active.');

    assert.strictEqual(insertCalled, true, 'Notification insert was not called.');
    console.log('PASS: Notification insert was called.');

    const displayMsg = insertPayload.message.split('\u200B')[0];
    const expectedMsg = 'Your autopay-enabled Netflix subscription will automatically renew tomorrow (15 Jul 2026). This is a reminder.';
    
    // Wait, let's verify what notification got inserted.
    // When the subscription is updated, processAutopayRenewals calculates the new renewalDate (2026-07-15).
    // And it inserts a notification: "Your autopay-enabled Netflix subscription has been automatically renewed. The next renewal date is 15 Jul 2026."
    const expectedSuccessMsg = 'Your autopay-enabled Netflix subscription has been automatically renewed. The next renewal date is 15 Jul 2026.';
    assert.strictEqual(displayMsg, expectedSuccessMsg, `Expected success message "${expectedSuccessMsg}", got "${displayMsg}"`);
    console.log('PASS: Notification message is correct.');

    assert.strictEqual(insertPayload.title, 'AutoPay Renewed', `Expected title 'AutoPay Renewed', got '${insertPayload.title}'`);
    console.log('PASS: Notification title is correct.');

  } catch (err) {
    console.error('FAIL:', err.message);
    process.exit(1);
  }

  // --- Date Math Edge Case Verification ---
  
  const testCycles = [
    { cycle: 'monthly', start: '2026-05-25', expected: '2026-06-25', desc: 'Monthly standard' },
    { cycle: 'monthly', start: '2026-05-31', expected: '2026-06-30', desc: 'Monthly end-of-month clamp' },
    { cycle: 'half-yearly', start: '2025-12-15', expected: '2026-12-15', desc: 'Half-yearly standard' },
    { cycle: 'half-yearly', start: '2025-08-31', expected: '2026-08-28', desc: 'Half-yearly clamp (leap year/Feb check)' },
    { cycle: 'yearly', start: '2025-06-15', expected: '2027-06-15', desc: 'Yearly standard' },
    { cycle: 'yearly', start: '2024-02-29', expected: '2027-02-28', desc: 'Yearly leap-year clamp' }
  ];

  console.log('\n--- Testing Billing Cycle Date Calculations ---');

  for (const t of testCycles) {
    let resultingDate = null;
    const mockClientForCycle = {
      from(table) {
        if (table === 'subscriptions') {
          return {
            select: () => createChain(() => Promise.resolve({
              data: [{
                id: 999,
                userId: 'user-456',
                name: 'TestSub',
                cost: 100,
                billingCycle: t.cycle,
                renewalDate: t.start,
                status: 'active',
                autopayEnabled: true
              }],
              error: null
            })),
            update: (payload) => {
              resultingDate = payload.renewalDate;
              return createChain(() => Promise.resolve({ error: null }));
            }
          };
        }
        if (table === 'notifications') {
          return {
            select: () => createChain(() => Promise.resolve({ data: null, error: null })),
            insert: () => createChain(() => Promise.resolve({ error: null }))
          };
        }
        if (table === 'profiles') {
          return {
            select: () => createChain(() => Promise.resolve({ data: null, error: null }))
          };
        }
      }
    };

    await processAutopayRenewals(mockClientForCycle);

    try {
      assert.strictEqual(resultingDate, t.expected, `Failed ${t.desc}: expected ${t.expected}, got ${resultingDate}`);
      console.log(`PASS: ${t.desc} (${t.start} -> ${resultingDate})`);
    } catch (err) {
      console.error('FAIL:', err.message);
      process.exit(1);
    }
  }

  console.log('\n=== ALL UNIT TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
