import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
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
    useUserStore.setState({ stats: { currentStreak: 0, longestStreak: 0, totalReps: 1051, totalSessions: 31, totalCalories: 1234, exercisesDistribution: [
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

  it('recap arrows name the month or the year and stop at the first period with data', () => {
    useUserStore.setState({ user: { uid: 'u1', totalReps: 10, totalSessions: 1, totalCalories: 1, createdAt: { toDate: () => new Date() } } as never });
    renfo = [all[0]!];
    const { unmount } = renderPage();
    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mois suivant' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Année' }));
    expect(screen.getByRole('button', { name: 'Année précédente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Année suivante' })).toBeDisabled();
    unmount();

    // a session imported from before the account: its period stays reachable
    renfo = [all[0]!, { ...all[0]!, sessionId: 'old', date: { toDate: () => day(400) } } as Session];
    renderPage();
    expect(screen.getByRole('button', { name: 'Mois précédent' })).toBeEnabled();
  });

  it('renfo totals come from the computed stats when the user document lags behind (edit then app closed)', () => {
    useUserStore.setState({
      user: { uid: 'u1', totalReps: 7013, totalSessions: 29, totalCalories: 1818 } as never,
      stats: { currentStreak: 0, longestStreak: 0, exercisesDistribution: [], totalReps: 8513, totalSessions: 31, totalCalories: 2027 } as never,
    });
    renderPage();
    const fr = (n: number) => formatNumber(n).replace(/\s/g, ' ');
    expect(screen.getByText(fr(8513))).toBeInTheDocument();
    expect(screen.getByText(fr(2027))).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('65')).toBeInTheDocument(); // 2 027 / 31
    expect(screen.queryByText(fr(7013))).not.toBeInTheDocument();
  });

  it('the calories, reps and average tiles say they count renfo only', () => {
    renderPage();
    expect(screen.getByText("Estimation basée sur tes répétitions en renfo (la muscu n'est pas comptée)")).toBeInTheDocument();
    expect(screen.getByText('Reps renfo')).toBeInTheDocument();
    expect(screen.getByText('Moyenne par séance renfo')).toBeInTheDocument();
  });

  it('a muscu-only user sees no renfo block full of zeros', () => {
    useUserStore.setState({ user: { uid: 'u1', totalReps: 0, totalSessions: 0, totalCalories: 0 } as never });
    renfo = [];
    gym = [{ sessionId: 'g0', date: { toDate: () => day(0) }, totalVolume: 1000, exercises: [] } as unknown as GymSession];
    renderPage();
    expect(screen.getByText('Activité (90 jours)')).toBeInTheDocument();
    expect(screen.queryByText('Calories brûlées')).not.toBeInTheDocument();
    expect(screen.queryByText('Séances renfo')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Moyenne par séance/)).not.toBeInTheDocument();
  });

  it('weekly goal while the sessions load: no « Encore 3 séances » next to « –/3 »', () => {
    useSettingsStore.setState({ weeklyGoal: 3 });
    renfo = []; loading = true;
    renderPage();
    expect(screen.getByText('–/3 séances')).toBeInTheDocument();
    expect(screen.queryByText(/^Encore/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Objectif atteint/)).not.toBeInTheDocument();
  });

  it('the streak cards hold their place with « – » until the stats arrive (no jump of the charts)', () => {
    renderPage();
    expect(screen.getByText('Série actuelle')).toBeInTheDocument();
    expect(screen.getByText('Meilleure série')).toBeInTheDocument();
    expect(screen.getAllByText('–')).toHaveLength(2);
  });

  it('habits: a tie between two slots is not announced as « surtout le matin »', () => {
    const at = (back: number, hour: number) => ({ ...all[back]!, date: { toDate: () => { const d = day(back); d.setHours(hour); return d; } } }) as Session;
    renfo = [at(0, 8), at(1, 8), at(2, 20), at(3, 20)];
    renderPage();
    expect(screen.getByText("Pas de créneau dominant pour l'instant.")).toBeInTheDocument();
    expect(screen.queryByText(/surtout/)).not.toBeInTheDocument();
  });

  it('the heatmap opens on the latest weeks when it is wider than the card (large font)', () => {
    const width = vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(304);
    renderPage();
    const today = frDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' });
    expect(screen.getByRole('button', { name: `${today} : 1 séance` }).closest('.overflow-x-auto')!.scrollLeft).toBe(304);
    width.mockRestore();
  });
});
