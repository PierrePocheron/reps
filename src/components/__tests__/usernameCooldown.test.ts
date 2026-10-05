import { describe, it, expect } from 'vitest';
import { daysBeforeUsernameChange } from '@/utils/formatters';

const H = 3_600_000;
describe('daysBeforeUsernameChange', () => {
  it('waits the full 7 days the hint announces', () => {
    const last = new Date(2026, 9, 1, 12);
    expect(daysBeforeUsernameChange(last, new Date(last.getTime() + 1 * H))).toBe(7);        // said 6
    expect(daysBeforeUsernameChange(last, new Date(last.getTime() + (6 * 24 + 1) * H))).toBe(1); // unlocked a day early
    expect(daysBeforeUsernameChange(last, new Date(last.getTime() + 7 * 24 * H))).toBe(0);
  });
});
