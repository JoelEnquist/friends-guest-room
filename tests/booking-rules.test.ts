import { describe, expect, it } from 'vitest';

import { MAX_STAY_NIGHTS, validateBookingDateRange } from '@/lib/booking-rules';

describe('validateBookingDateRange', () => {
  it('allows stays up to 5 nights', () => {
    const result = validateBookingDateRange('2026-02-01', '2026-02-06');
    expect(result.nights).toBe(MAX_STAY_NIGHTS);
  });

  it('rejects stays longer than 5 nights', () => {
    expect(() => validateBookingDateRange('2026-02-01', '2026-02-07')).toThrow(
      'Maximum stay is 5 nights.',
    );
  });
});
