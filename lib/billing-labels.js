/**
 * billing-labels.js
 *
 * Single source of truth for billing-cycle display labels.
 * Maps every possible DB value (including legacy short codes) to a
 * human-readable string.  Import `cycleLabel` wherever a cycle needs
 * to be shown to the user.
 *
 * DB value   → Display
 * ---------    --------
 * monthly    → Monthly
 * yearly     → Yearly
 * half-yearly→ Half-Yearly
 * mo         → Monthly    (legacy)
 * yr         → Yearly     (legacy)
 * half-year  → Half-Yearly(legacy)
 */

export const CYCLE_LABELS = {
  monthly:      'Monthly',
  yearly:       'Yearly',
  'half-yearly':'Half-Yearly',
  // legacy short codes that may still exist in some rows
  mo:           'Monthly',
  yr:           'Yearly',
  'half-year':  'Half-Yearly',
};

/**
 * Returns the display label for a billing cycle value.
 * Falls back to the raw value if unrecognised.
 * @param {string} cycle
 * @returns {string}
 */
export function cycleLabel(cycle) {
  return CYCLE_LABELS[cycle] ?? cycle ?? '—';
}
