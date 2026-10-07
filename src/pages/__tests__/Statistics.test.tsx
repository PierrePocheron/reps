import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import type { Session } from '@/firebase/types';

// One renfo session a day for 90 days; the page only holds the latest 20 (challenge validations fill it fast)
const day = (back: number) => { const d = new Date(); d.setDate(d.getDate() - back); d.setHours(12, 0, 0, 0); return d; };
const all = Array.from({ length: 90 }, (_, i) => ({ sessionId: `s${i}`, date: { toDate: () => day(i) }, totalReps: 10, exercises: [] }) as unknown as Session);

vi.mock('@/hooks/useSessionHistory', () => ({
  useSessionHistory: () => ({ sessions: all.slice(0, 20), gymSessions: [], loading: false, error: false, refetch: vi.fn() }),
  usePeriodHistory: (from: Date, to: Date) => ({
    sessions: all.filter((s) => s.date.toDate() >= from && s.date.toDate() < to), gymSessions: [], loaded: true,
  }),
}));
vi.mock('@/components/AdSpace', () => ({ AdSpace: () => null }));

import Statistics from '../Statistics';

describe('Statistics', () => {
  beforeEach(() => useUserStore.setState({ user: { uid: 'u1', totalReps: 900, totalSessions: 90, totalCalories: 100 } as never, stats: null }));

  it('builds the 90-day heatmap and the 8-week chart from the date range, not the latest page', () => {
    render(<BrowserRouter><Statistics /></BrowserRouter>);
    expect(screen.getByText(/^90 jours d'entraînement/)).toBeInTheDocument();
    // every one of the 8 weeks has sessions: none of the bars is empty
    const bars = screen.getAllByRole('button', { name: /^(Semaine du|Cette semaine)/ });
    expect(bars).toHaveLength(8);
    for (const bar of bars) expect(bar).not.toHaveAccessibleName(/ : 0 reps$/);
  });
});
