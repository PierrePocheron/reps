import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { frDate, formatNumber } from '@/utils/formatters';
import type { Session, GymSession } from '@/firebase/types';

// One renfo session a day for 90 days; the page only holds the latest 20 (challenge validations fill it fast)
const day = (back: number) => { const d = new Date(); d.setDate(d.getDate() - back); d.setHours(12, 0, 0, 0); return d; };
const all = Array.from({ length: 90 }, (_, i) => ({ sessionId: `s${i}`, date: { toDate: () => day(i) }, totalReps: 10, exercises: [] }) as unknown as Session);

// The whole history of the test user; the page holds its latest 20, a period read gets its whole range
let renfo: Session[] = all;
let gym: GymSession[] = [];
let loading = false;
const inRange = (from: Date, to: Date) => (s: Session | GymSession) => s.date.toDate() >= from && s.date.toDate() < to;
vi.mock('@/hooks/useSessionHistory', () => ({
  useSessionHistory: () => ({ sessions: renfo.slice(0, 20), gymSessions: gym.slice(0, 20), loading, error: false, refetch: vi.fn() }),
  usePeriodHistory: (from: Date, to: Date) => ({
    sessions: renfo.filter(inRange(from, to)), gymSessions: gym.filter(inRange(from, to)), loaded: true,
  }),
}));
vi.mock('@/components/AdSpace', () => ({ AdSpace: () => null }));

import Statistics from '../Statistics';

const renderPage = () => render(<BrowserRouter><Statistics /></BrowserRouter>);
// A finger tap fires mouseenter and focus before the click
const tap = (el: HTMLElement) => { fireEvent.mouseEnter(el); fireEvent.focus(el); fireEvent.click(el); };

describe('Statistics', () => {
  beforeEach(() => {
    renfo = all; gym = []; loading = false;
    useUserStore.setState({ user: { uid: 'u1', totalReps: 900, totalSessions: 90, totalCalories: 100 } as never, stats: null });
  });

  it('builds the 90-day heatmap and the 8-week chart from the date range, not the latest page', () => {
    renderPage();
    expect(screen.getByText(/^90 jours d'entraînement/)).toBeInTheDocument();
    // every one of the 8 weeks has sessions: none of the bars is empty
    const bars = screen.getAllByRole('button', { name: /^(Semaine du|Cette semaine)/ });
    expect(bars).toHaveLength(8);
    for (const bar of bars) expect(bar).not.toHaveAccessibleName(/ : 0 reps$/);
  });

  it('a tap on a heatmap day or a weekly bar shows its detail at once', () => {
    renderPage();
    const today = frDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
    tap(screen.getByRole('button', { name: `${today} : 1 séance` }));
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === `${today} — 1 séance`)).toBeInTheDocument();

    const bar = screen.getByRole('button', { name: /^Cette semaine/ });
    tap(bar);
    expect(bar).toHaveAttribute('aria-pressed', 'true');
  });

  it('recap of a renfo-only month: singular labels, reps instead of a 0 kg volume', () => {
    renfo = [all[0]!];
    renderPage();
    expect(screen.getByText('Séance')).toBeInTheDocument();
    expect(screen.getByText("Jour d'entraînement")).toBeInTheDocument();
    expect(screen.getByText('Répétitions')).toBeInTheDocument();
    expect(screen.queryByText('Volume')).not.toBeInTheDocument();
  });

  it('the calories example table follows the formula (75 kg, 175 cm man) and names sex as a factor', () => {
    renderPage();
    const details = within(screen.getByText(/^Comment sont calculées les calories/).closest('details')!);
    const kcal = (name: string) => details.getByText(name).parentElement;
    expect(kcal('Tractions')).toHaveTextContent('~5,3 kcal');
    expect(kcal('Dips')).toHaveTextContent('~3,8 kcal');
    expect(kcal('Squats')).toHaveTextContent('~2,7 kcal');
    expect(kcal('Pompes')).toHaveTextContent('~2,2 kcal');
    expect(kcal('Abdos')).toHaveTextContent('~1,3 kcal');
    expect(kcal('Fentes')).toHaveTextContent('~2,2 kcal');
    expect(details.getByText(/\(poids, taille, sexe\)/)).toBeInTheDocument();
    expect(details.getByText(/Facteurs.*Sexe/)).toBeInTheDocument();
  });

  it('favourite exercises: French thousands separator and a reps unit under the podium numbers', () => {
    useUserStore.setState({ stats: { currentStreak: 0, longestStreak: 0, exercisesDistribution: [
      { name: 'Pompes', emoji: '💪', totalReps: 1050, totalCalories: 1234, count: 30 },
      { name: 'Squats', emoji: '🦵', totalReps: 1, totalCalories: 0, count: 1 },
    ] } as never });
    renderPage();
    const favourites = within(screen.getByText('Exercices favoris').parentElement!);
    const fr = (n: number) => formatNumber(n).replace(/\s/g, ' '); // the query collapses the narrow no-break space
    expect(favourites.getAllByText(fr(1050))).toHaveLength(2); // podium and list
    expect(favourites.getByText(fr(1234))).toBeInTheDocument();
    expect(favourites.getByText('reps')).toBeInTheDocument();
    expect(favourites.getByText('rep')).toBeInTheDocument();
  });

  it('weekly volume is rounded to the kilo, like the recap', () => {
    renfo = [];
    gym = [{ sessionId: 'g0', date: { toDate: () => day(0) }, totalVolume: 15382.5, exercises: [] } as unknown as GymSession];
    renderPage();
    expect(screen.getByRole('button', { name: /^Cette semaine/ })).toHaveAccessibleName(/^Cette semaine : 15\s383 kg$/);
    expect(screen.getByText(/^15\s383 kg soulevés$/)).toBeInTheDocument();
  });
});
