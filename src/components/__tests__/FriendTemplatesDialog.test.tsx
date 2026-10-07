import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FriendTemplatesDialog } from '../FriendTemplatesDialog';
import { useUserStore } from '@/store/userStore';
import { createUserTemplate, getUserTemplates } from '@/firebase/templates';
import type { WorkoutTemplate } from '@/firebase/types';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/firebase/templates', () => ({ createUserTemplate: vi.fn(), getUserTemplates: vi.fn() }));

const push: WorkoutTemplate = { id: 't1', name: 'Push', description: '', emoji: '💪', workoutType: 'musculation',
  muscuExercises: [{ exerciseId: 'bench_press', sets: [{ reps: 8, weight: 60 }] }, { exerciseId: 'dips', sets: [] }, { exerciseId: 'pushup', sets: [] }] };
const friend = { uid: 'alice', displayName: 'alice' } as never;
/** alice's templates, then mine */
const templatesOf = (hers: WorkoutTemplate[], mine: WorkoutTemplate[] = []) =>
  vi.mocked(getUserTemplates).mockImplementation(async (uid) => (uid === 'alice' ? hers : mine));

describe('FriendTemplatesDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({ user: { uid: 'me' } as never });
  });
  afterEach(() => vi.restoreAllMocks());

  it('a double tap on « Copier » copies the template once', async () => {
    templatesOf([push]);
    vi.mocked(createUserTemplate).mockReturnValue(new Promise(() => {})); // slow network / offline: still copying
    render(<FriendTemplatesDialog friend={friend} onClose={() => {}} />);
    const copy = await screen.findByRole('button', { name: 'Copier Push' });
    fireEvent.click(copy);
    fireEvent.click(copy);
    expect(createUserTemplate).toHaveBeenCalledTimes(1);
  });

  it('keeps the count and its unit together', async () => {
    templatesOf([push]);
    render(<FriendTemplatesDialog friend={friend} onClose={() => {}} />);
    expect((await screen.findByText(/exercices/)).textContent).toContain('3 exercices');
  });

  it('a copied template reads « Copié » and stays readable (not a lone faded check)', async () => {
    templatesOf([push]);
    vi.mocked(createUserTemplate).mockResolvedValue({ ...push, id: 'c1' });
    render(<FriendTemplatesDialog friend={friend} onClose={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Copier Push' }));
    const done = await screen.findByRole('button', { name: 'Push copié' });
    expect(done).toHaveTextContent('Copié');
    expect(done).not.toBeDisabled();
    expect(done).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(done);
    expect(createUserTemplate).toHaveBeenCalledTimes(1);
  });
});
