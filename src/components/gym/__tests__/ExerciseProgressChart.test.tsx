import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseProgressChart } from '../ExerciseProgressChart';
import { exerciseHistory } from '@/utils/records';
import type { GymSession } from '@/firebase/types';

const daysAgo = (n: number, reps: number) => ({
  date: { toDate: () => new Date(Date.now() - n * 86_400_000) },
  exercises: [{ exerciseId: 'chest_dips', name: 'Dips', emoji: '💪', sets: [{ weight: 0, reps, completed: true }] }],
}) as unknown as GymSession;
const lifted = (n: number, weight: number, reps: number) =>
  ({ ...daysAgo(n, reps), exercises: [{ exerciseId: 'squat', name: 'Squat', emoji: '🏋️', sets: [{ weight, reps, completed: true }] }] }) as unknown as GymSession;

describe('ExerciseProgressChart', () => {
  it('a bodyweight exercise gets a reps curve instead of « Aucune séance sur cette période »', () => {
    render(<ExerciseProgressChart points={exerciseHistory([daysAgo(1, 18), daysAgo(5, 15), daysAgo(10, 12)], 'chest_dips')} />);
    expect(screen.queryByText('Aucune séance sur cette période.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reps max' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Record : 18 reps/)).toBeInTheDocument();
  });

  it('one weighted session does not hide the reps curve of the bodyweight ones', () => {
    const weighted = { ...daysAgo(3, 8), exercises: [{ exerciseId: 'chest_dips', name: 'Dips', emoji: '💪', sets: [{ weight: 10, reps: 8, completed: true }] }] } as unknown as GymSession;
    render(<ExerciseProgressChart points={exerciseHistory([daysAgo(1, 18), weighted, daysAgo(10, 12)], 'chest_dips')} />);
    expect(screen.getByRole('button', { name: '1RM estimé' })).toHaveAttribute('aria-pressed', 'true'); // default unchanged
    expect(screen.getByRole('button', { name: 'Reps max' })).toBeInTheDocument();
  });

  it('keeps half kilos: a 77,5 kg best is not shown as a 78 kg record', () => {
    render(<ExerciseProgressChart points={exerciseHistory([lifted(2, 77.5, 9), lifted(9, 75, 9)], 'squat')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Charge max' }));
    expect(screen.getByText(/Record : 77,5 kg/)).toBeInTheDocument();
    expect(screen.getByText('+2,5 kg sur la période')).toBeInTheDocument();
  });

  it('a change that rounds to zero reads « stable », never « −0 kg »', () => {
    render(<ExerciseProgressChart points={exerciseHistory([lifted(2, 79.96, 1), lifted(9, 80, 1)], 'squat')} />);
    expect(screen.getByText('stable sur la période')).toBeInTheDocument();
    expect(screen.queryByText(/−0/)).not.toBeInTheDocument();
  });

  it('axis: a decimal on a narrow scale (no « 83 / 82 / 82 »), whole kilos on a wide one', () => {
    const { container, unmount } = render(<ExerciseProgressChart points={exerciseHistory([lifted(2, 79.5, 1), lifted(9, 80, 1)], 'squat')} />);
    const ticks = () => [...container.querySelectorAll('svg text[text-anchor="end"]')].slice(0, 3).map((t) => t.textContent);
    expect(ticks()).toEqual(['82,7', '82,4', '82,1']);
    unmount();
    const wide = render(<ExerciseProgressChart points={exerciseHistory([lifted(2, 77.5, 9), lifted(9, 75, 9)], 'squat')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volume' }));
    expect([...wide.container.querySelectorAll('svg text[text-anchor="end"]')].slice(0, 3).map((t) => t.textContent)).toEqual(['701', '686', '672']);
  });

  it('opens on the shortest period that holds the last session, not on an empty « 3 mois »', () => {
    const pressed = () => screen.getAllByRole('button', { pressed: true })[0]!.textContent;
    const { unmount } = render(<ExerciseProgressChart points={exerciseHistory([lifted(140, 125, 5), lifted(150, 120, 5)], 'squat')} />);
    expect(pressed()).toBe('1 an');
    expect(screen.queryByText('Aucune séance sur cette période.')).not.toBeInTheDocument();
    unmount();
    const old = render(<ExerciseProgressChart points={exerciseHistory([lifted(400, 125, 5)], 'squat')} />);
    expect(pressed()).toBe('Tout');
    old.unmount();
    render(<ExerciseProgressChart points={exerciseHistory([lifted(2, 125, 5), lifted(140, 120, 5)], 'squat')} />);
    expect(pressed()).toBe('3 mois');
  });

  it('picks its period when the history arrives after the sheet opened (session resumed, slow network)', () => {
    const { rerender } = render(<ExerciseProgressChart points={[]} />);
    rerender(<ExerciseProgressChart points={exerciseHistory([lifted(120, 125, 5)], 'squat')} />);
    expect(screen.getAllByRole('button', { pressed: true })[0]!.textContent).toBe('1 an');
    expect(screen.queryByText('Aucune séance sur cette période.')).not.toBeInTheDocument();
  });

  it('axis: whole reps on a reps curve, never « 10,3 / 9 / 7,7 »', () => {
    const ticks = (c: HTMLElement) => [...c.querySelectorAll('svg text[text-anchor="end"]')].slice(0, 3).map((t) => t.textContent);
    const { container, unmount } = render(<ExerciseProgressChart points={exerciseHistory([daysAgo(2, 10), daysAgo(9, 8)], 'chest_dips')} />);
    expect(ticks(container)).toEqual(['11', '9', '7']);
    unmount();
    const single = render(<ExerciseProgressChart points={exerciseHistory([daysAgo(2, 12)], 'chest_dips')} />);
    expect(ticks(single.container)).toEqual(['14', '12', '10']);
  });
});
