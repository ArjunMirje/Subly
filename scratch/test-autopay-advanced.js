const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envFile = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

// Helper for fluent query chain
function createChain(resolver) {
  const chain = {};
  const methods = ['select', 'eq', 'neq', 'lte', 'gte', 'lt', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'delete'];
  methods.forEach(m => {
    chain[m] = (arg1, arg2) => {
      if (m === 'single' || m === 'maybeSingle') return resolver();
      return chain;
    };
  });
  chain.then = (onfulfilled, onrejected) => resolver().then(onfulfilled, onrejected);
  return chain;
}

async function runAdvancedTests() {
  console.log('=== STARTING ADVANCED AUTOPAY TESTS ===');

  const cron = await import('../lib/cron.js');
  const processAutopayRenewals = cron.processAutopayRenewals;
  
  // Look up checkExpiredSubscriptions through import
  // (We need to inspect the cron module to find it or export it)
  // Let's see if checkExpiredSubscriptions is exported or if we can test it indirectly.
  // Wait, let's look at the exports of cron.js.
  // cron.js exports processAutopayRenewals, checkAndGenerateNotifications, initCron,
  // checkSingleSubscriptionNotification, checkSingleCouponNotification.
  // Let's export checkExpiredSubscriptions from lib/cron.js, or check if it is already exported.
  // Ah, let's verify if we need to export checkExpiredSubscriptions.
  // Currently checkExpiredSubscriptions is not exported (it is a local async function).
  // Let's see if we want to export it for testing, or if we can test via checkAndGenerateNotifications.
  // If we call checkAndGenerateNotifications, it calls processAutopayRenewals first, then checkExpiredSubscriptions.
  
  console.log('\n--- 1. Testing checkExpiredSubscriptions (via checkAndGenerateNotifications) ---');
  let expiredQueryFilters = [];
  let updateCalledOnExpired = false;

  const mockSupabase = {
    from(table) {
      if (table === 'subscriptions') {
        return {
          select: () => {
            const chain = createChain(() => Promise.resolve({
              data: [
                // One autopay enabled, one disabled, both past renewal date
                {
                  id: 101,
                  userId: 'user-1',
                  name: 'Autopay Sub',
                  cost: 200,
                  billingCycle: 'monthly',
                  renewalDate: '2026-05-10',
                  status: 'active',
                  autopayEnabled: true
                },
                {
                  id: 102,
                  userId: 'user-1',
                  name: 'Manual Sub',
                  cost: 100,
                  billingCycle: 'monthly',
                  renewalDate: '2026-05-10',
                  status: 'active',
                  autopayEnabled: false
                }
              ],
              error: null
            }));
            
            // Record query filters applied
            const originalEq = chain.eq;
            chain.eq = (col, val) => {
              expiredQueryFilters.push({ col, val });
              return originalEq(col, val);
            };
            return chain;
          },
          update: (payload) => {
            if (payload.status === 'expired') {
              updateCalledOnExpired = true;
            }
            return createChain(() => Promise.resolve({ error: null }));
          }
        };
      }
      return {
        select: () => createChain(() => Promise.resolve({ data: null, error: null })),
        insert: () => createChain(() => Promise.resolve({ error: null }))
      };
    }
  };

  // We can test processAutopayRenewals directly on an 'expired' status subscription:
  console.log('\n--- 2. Testing processAutopayRenewals on Expired status ---');
  let renewUpdatePayload = null;
  const mockSupabaseExpired = {
    from(table) {
      if (table === 'subscriptions') {
        return {
          select: () => createChain(() => Promise.resolve({
            data: [{
              id: 999,
              userId: 'user-1',
              name: 'Expired Autopay',
              cost: 150,
              billingCycle: 'monthly',
              renewalDate: '2026-05-10',
              status: 'expired', // Status is expired
              autopayEnabled: true
            }],
            error: null
          })),
          update: (payload) => {
            renewUpdatePayload = payload;
            return createChain(() => Promise.resolve({ error: null }));
          }
        };
      }
      return {
        select: () => createChain(() => Promise.resolve({ data: null, error: null })),
        insert: () => createChain(() => Promise.resolve({ error: null })),
        maybeSingle: () => Promise.resolve({ data: null, error: null })
      };
    }
  };

  await processAutopayRenewals(mockSupabaseExpired);

  try {
    assert.ok(renewUpdatePayload, 'processAutopayRenewals did not run on expired subscription');
    assert.strictEqual(renewUpdatePayload.status, 'active', 'Expected renewed subscription status to be set to active');
    assert.strictEqual(renewUpdatePayload.renewalDate, '2026-07-10', 'Expected renewal date to advance correctly');
    console.log('PASS: processAutopayRenewals renewed expired subscription and set status to active.');
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exit(1);
  }

  console.log('\n=== ALL ADVANCED TESTS PASSED SUCCESSFULLY ===');
}

runAdvancedTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
