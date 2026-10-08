import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

  it('after reopening, a template already in my templates stays « Copié » (a second tap made a duplicate)', async () => {
    const { id, userId, createdAt, ...copy } = push;
    void id; void userId; void createdAt;
    const other = { ...push, id: 't2', muscuExercises: [{ exerciseId: 'squat', sets: [] }] }; // same name, other exercises
    templatesOf([push, other], [{ ...copy, id: 'mine1', userId: 'me' }]);
    render(<FriendTemplatesDialog friend={friend} onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Push copié' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Copier Push' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Push copié' }));
    expect(createUserTemplate).not.toHaveBeenCalled();
  });

  it('copies only the template fields, typed (a friend could plant any field, or a tracking image, in my copy)', async () => {
    const cdn = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/0001.jpg';
    const planted = { ...push, id: 't9', userId: 'alice', junk: 'x', emoji: { a: 1 }, exerciseIds: ['pushups'], muscuExercises: [
      { exerciseId: 'lib_0001', name: 'Curl', emoji: '💪', imageUrl: cdn, timed: false, sets: [{ reps: 8, weight: 10, junk: 1 }], junk: 1 },
      { exerciseId: 'bench_press', emoji: { a: 1 }, imageUrl: 'https://tracker.example/p.gif', sets: [{ reps: '8', weight: null }] },
      null,
    ] } as never;
    templatesOf([planted]);
    vi.mocked(createUserTemplate).mockResolvedValue({ ...push, id: 'c1' });
    render(<FriendTemplatesDialog friend={friend} onClose={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Copier Push' })); // a map emoji no longer breaks the list
    expect(vi.mocked(createUserTemplate).mock.calls[0]![1]).toEqual({ name: 'Push', description: '', emoji: '🏋️', workoutType: 'musculation',
      muscuExercises: [
        { exerciseId: 'lib_0001', name: 'Curl', emoji: '💪', imageUrl: cdn, timed: false, sets: [{ reps: 8, weight: 10 }] },
        { exerciseId: 'bench_press', sets: [{ reps: 0, weight: 0 }] },
      ] });
  });

  it('offline with nothing cached says the templates are unavailable, not that there are none', async () => {
    templatesOf([]);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<FriendTemplatesDialog friend={friend} onClose={() => {}} />);
    await act(async () => {});
    expect(screen.getByText(/Modèles indisponibles/)).toBeInTheDocument();
    expect(screen.queryByText(/n'a pas encore créé de modèle/)).not.toBeInTheDocument();
  });

  it('online, an empty list still says the friend has no template yet', async () => {
    templatesOf([]);
    render(<FriendTemplatesDialog friend={friend} onClose={() => {}} />);
    expect(await screen.findByText(/n'a pas encore créé de modèle/)).toBeInTheDocument();
  });
});
