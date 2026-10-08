import { describe, it, expect, vi } from 'vitest';
import { useGymSessionStore } from '../gymSessionStore';
import { useUserStore } from '../userStore';
import { cancelRestEnd } from '@/utils/restNotification';
import { createGymSession } from '@/firebase/gymSessions';
import { updateUserStatsAfterSession } from '@/firebase/firestore';

vi.mock('@/utils/restNotification', () => ({ scheduleRestEnd: vi.fn(), cancelRestEnd: vi.fn() }));
vi.mock('@/firebase/gymSessions', async (orig) => ({ ...(await orig<typeof import('@/firebase/gymSessions')>()), createGymSession: vi.fn().mockResolvedValue('id') }));
vi.mock('@/firebase/firestore', async (orig) => ({ ...(await orig<typeof import('@/firebase/firestore')>()), updateUserStatsAfterSession: vi.fn() }));

describe('gymSessionStore — persistance de la séance en cours', () => {
  it('sauvegarde séries, chrono et repos en cours (rechargement ou WebView arrêtée en plein repos)', () => {
    useGymSessionStore.setState({
      phase: 'execute',
      startTime: 123,
      showRestTimer: true,
      restEndsAt: 456,
      restExerciseId: 'bench_press',
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ weight: 60, reps: 8, completed: true }] }],
    });
    const saved = JSON.parse(localStorage.getItem('reps_gym_session') ?? '{}').state;
    expect(saved.phase).toBe('execute');
    expect(saved.startTime).toBe(123);
    expect(saved.exercises[0].sets[0].completed).toBe(true);
    expect(saved).toMatchObject({ showRestTimer: true, restEndsAt: 456, restExerciseId: 'bench_press' });
    expect(saved).not.toHaveProperty('duration'); // the store keeps no running duration: it derives from startTime
  });
});

describe('gymSessionStore — minuteur de repos', () => {
  it('fixe l\'heure de fin, la recalcule quand la durée change et l\'efface à l\'arrêt', () => {
    const { startRestTimer, setRestDuration, dismissRestTimer } = useGymSessionStore.getState();
    useGymSessionStore.setState({ restDuration: 90 });
    const t0 = Date.now();
    startRestTimer();
    expect(useGymSessionStore.getState().restEndsAt).toBeGreaterThanOrEqual(t0 + 90_000);

    setRestDuration(180);
    expect(useGymSessionStore.getState().restEndsAt).toBeGreaterThanOrEqual(t0 + 180_000);

    dismissRestTimer();
    expect(useGymSessionStore.getState()).toMatchObject({ showRestTimer: false, restEndsAt: null });
  });
});

describe('gymSessionStore — notification de fin de repos', () => {
  it('annule la notification si le repos est arrêté avant la fin, la garde s\'il est terminé', () => {
    const { startRestTimer, dismissRestTimer } = useGymSessionStore.getState();
    vi.mocked(cancelRestEnd).mockClear();
    startRestTimer();
    dismissRestTimer(); // arrêt anticipé
    expect(cancelRestEnd).toHaveBeenCalledTimes(1);

    useGymSessionStore.setState({ showRestTimer: true, restEndsAt: Date.now() - 1000 });
    dismissRestTimer(); // repos écoulé : la notification affichée doit rester
    expect(cancelRestEnd).toHaveBeenCalledTimes(1);
  });
});

describe('gymSessionStore — repos par exercice (#49)', () => {
  it('retient la durée changée pendant le repos d\'un exercice, garde la durée par défaut ailleurs', () => {
    const { startRestTimer, setRestDuration, dismissRestTimer } = useGymSessionStore.getState();
    useGymSessionStore.setState({ restDuration: 90, restByExercise: {} });
    const left = () => (useGymSessionStore.getState().restEndsAt ?? 0) - Date.now();

    startRestTimer('barbell_squat');
    setRestDuration(180); // pendant le repos du squat
    dismissRestTimer();
    expect(useGymSessionStore.getState()).toMatchObject({ restDuration: 90, restByExercise: { barbell_squat: 180 } });

    startRestTimer('barbell_squat');
    expect(left()).toBeGreaterThan(170_000);
    startRestTimer('barbell_curl');
    expect(left()).toBeLessThanOrEqual(90_000);

    startRestTimer(); // repos lancé à la main : change la durée par défaut
    setRestDuration(60);
    expect(useGymSessionStore.getState().restDuration).toBe(60);
    dismissRestTimer();

    const saved = JSON.parse(localStorage.getItem('reps_gym_session') ?? '{}').state;
    expect(saved.restByExercise).toEqual({ barbell_squat: 180 });
  });
});

describe('gymSessionStore — repos −15 s / +15 s (#51)', () => {
  it('décale la fin sans relancer le décompte, sans passer avant maintenant, et suit la notification', async () => {
    const { scheduleRestEnd } = await import('@/utils/restNotification');
    const { adjustRest } = useGymSessionStore.getState();
    const end = Date.now() + 30_000;
    useGymSessionStore.setState({ showRestTimer: true, restEndsAt: end });
    vi.mocked(scheduleRestEnd).mockClear();

    adjustRest(15);
    expect(useGymSessionStore.getState().restEndsAt).toBe(end + 15_000);
    expect(scheduleRestEnd).toHaveBeenLastCalledWith(end + 15_000);

    adjustRest(-15); adjustRest(-15); adjustRest(-15);
    expect(useGymSessionStore.getState().restEndsAt).toBeGreaterThanOrEqual(Date.now() - 50);
    expect(useGymSessionStore.getState().restEndsAt).toBeLessThanOrEqual(Date.now());

    useGymSessionStore.setState({ showRestTimer: false, restEndsAt: null });
    adjustRest(15); // pas de repos en cours : rien
    expect(useGymSessionStore.getState().restEndsAt).toBeNull();
  });
});

describe('gymSessionStore — remplacer un exercice (#62)', () => {
  it('garde séries, superset et place ; oublie note, unité et trophées ; refuse un exercice déjà présent', () => {
    useGymSessionStore.setState({ exercises: [
      { exerciseId: 'barbell_squat', name: 'Squat', emoji: '🏋️', note: 'rack 4', supersetId: 's1', timed: false, sets: [{ weight: 100, reps: 5, completed: true, isRecord: true }, { weight: 100, reps: 5, completed: false }] },
      { exerciseId: 'leg_press', name: 'Presse', emoji: '🦵', supersetId: 's1', sets: [] },
    ] });
    const { replaceExercise } = useGymSessionStore.getState();
    replaceExercise('barbell_squat', { id: 'hack_squat', name: 'Hack squat', emoji: '🦵', category: 'legs', workoutType: 'musculation' } as never);
    const [ex] = useGymSessionStore.getState().exercises;
    expect(ex).toMatchObject({ exerciseId: 'hack_squat', name: 'Hack squat', supersetId: 's1', note: undefined, timed: undefined });
    expect(ex!.sets).toEqual([{ weight: 100, reps: 5, completed: true, isRecord: false }, { weight: 100, reps: 5, completed: false, isRecord: false }]);

    replaceExercise('hack_squat', { id: 'leg_press', name: 'Presse', emoji: '🦵' } as never); // déjà dans la séance
    expect(useGymSessionStore.getState().exercises[0]!.exerciseId).toBe('hack_squat');
  });
});

describe('gymSessionStore — chrono d\'un exercice en durée (#59)', () => {
  it('est sauvegardé avec la séance et oublié quand elle se termine', () => {
    useGymSessionStore.getState().setChrono('plank', { setIndex: 0, startedAt: 789 });
    const saved = JSON.parse(localStorage.getItem('reps_gym_session') ?? '{}').state;
    expect(saved.chronos).toEqual({ plank: { setIndex: 0, startedAt: 789 } });

    useGymSessionStore.getState().cancelSession();
    expect(useGymSessionStore.getState().chronos).toEqual({});
  });

  it('un chrono par exercice : lancer celui d\'un autre exercice ne coupe pas le premier', () => {
    const { setChrono } = useGymSessionStore.getState();
    setChrono('plank', { setIndex: 0, startedAt: 1 });
    setChrono('side_plank', { setIndex: 0, startedAt: 2 });
    expect(useGymSessionStore.getState().chronos).toEqual({ plank: { setIndex: 0, startedAt: 1 }, side_plank: { setIndex: 0, startedAt: 2 } });
    setChrono('plank', null);
    expect(useGymSessionStore.getState().chronos).toEqual({ side_plank: { setIndex: 0, startedAt: 2 } });
  });

  it('s\'arrête avec la série qu\'il mesure : retirée, validée autrement, ou son exercice retiré', () => {
    const plank = { exerciseId: 'plank', name: 'Gainage', emoji: '🧘', timed: true, sets: [{ weight: 0, reps: 60, completed: true }, { weight: 0, reps: 60, completed: false }] };
    const store = useGymSessionStore.getState;
    const run = () => store().setChrono('plank', { setIndex: 1, startedAt: 1 });
    useGymSessionStore.setState({ exercises: [plank], chronos: { side_plank: { setIndex: 0, startedAt: 2 } } });

    run();
    store().removeSet('plank', 1);
    expect(store().chronos.plank).toBeUndefined();
    store().addSet('plank', { weight: 0, reps: 60 }); // the new set 2 does not inherit the time
    expect(store().chronos.plank).toBeUndefined();

    run();
    store().completeSetAt('plank', 0, 60, 0); // another set: keeps running
    expect(store().chronos.plank).toEqual({ setIndex: 1, startedAt: 1 });
    store().completeSetAt('plank', 1, 45, 0); // its set validated with the check
    expect(store().chronos.plank).toBeUndefined();

    useGymSessionStore.setState({ exercises: [plank] });
    run();
    store().removeExercise('plank');
    expect(store().chronos).toEqual({ side_plank: { setIndex: 0, startedAt: 2 } }); // the other exercise's chrono runs on
  });

  it('relit sans planter l\'ancien chrono unique sauvegardé ({ exerciseId, startedAt })', async () => {
    useGymSessionStore.setState({ chronos: {} });
    localStorage.setItem('reps_gym_session', JSON.stringify({ state: { phase: 'execute', chrono: { exerciseId: 'plank', startedAt: 1 } }, version: 0 }));
    await useGymSessionStore.persist.rehydrate();
    expect(useGymSessionStore.getState().chronos).toEqual({});
    expect(useGymSessionStore.getState().phase).toBe('execute');
  });
});

describe('gymSessionStore — retirer un exercice', () => {
  it('délie son partenaire de superset resté seul', () => {
    useGymSessionStore.setState({ exercises: [
      { exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', supersetId: 'ss1', sets: [] },
      { exerciseId: 'barbell_curl', name: 'Curl barre', emoji: '💪', supersetId: 'ss1', sets: [] },
    ] });
    useGymSessionStore.getState().removeExercise('bench_press');
    expect(useGymSessionStore.getState().exercises).toEqual([{ exerciseId: 'barbell_curl', name: 'Curl barre', emoji: '💪', supersetId: undefined, sets: [] }]);
  });
});

describe('gymSessionStore — dé-valider une série', () => {
  it('remet la série à faire en gardant les valeurs saisies', () => {
    useGymSessionStore.setState({ exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [
      { weight: 60, reps: 8, completed: true, actualWeight: 62.5, actualReps: 7, rpe: 8 },
      { weight: 60, reps: 8, completed: true },
    ] }] });
    useGymSessionStore.getState().uncompleteSet('bench_press', 0);
    expect(useGymSessionStore.getState().exercises[0]!.sets).toEqual([
      { weight: 60, reps: 8, completed: false, actualWeight: 62.5, actualReps: 7, rpe: 8 },
      { weight: 60, reps: 8, completed: true },
    ]);
  });
});

describe('gymSessionStore — séance libre', () => {
  it('ne remplace pas une séance déjà en cours (exécution ou planification)', () => {
    const bench = { exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ weight: 60, reps: 8, completed: true }] };
    useGymSessionStore.setState({ phase: 'execute', startTime: 123, exercises: [bench] });
    useGymSessionStore.getState().startFreeSession();
    expect(useGymSessionStore.getState()).toMatchObject({ phase: 'execute', startTime: 123, exercises: [bench] });

    useGymSessionStore.setState({ phase: 'plan', startTime: null, exercises: [bench] });
    useGymSessionStore.getState().startFreeSession();
    expect(useGymSessionStore.getState()).toMatchObject({ phase: 'plan', exercises: [bench] });

    useGymSessionStore.setState({ phase: 'idle', exercises: [] });
    useGymSessionStore.getState().startFreeSession();
    expect(useGymSessionStore.getState()).toMatchObject({ phase: 'execute', exercises: [] });
  });
});

describe('gymSessionStore — fin de séance', () => {
  it('n\'attend pas la mise à jour des stats (hors ligne, elle attendait encore 2,5 s)', async () => {
    useUserStore.setState({ currentUser: { uid: 'u1' } as never });
    useGymSessionStore.setState({
      phase: 'execute', startTime: Date.now() - 5000, backdate: null,
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ weight: 60, reps: 8, completed: true }] }],
    });
    vi.mocked(updateUserStatsAfterSession).mockReturnValue(new Promise(() => {})); // never settles
    const ended = await Promise.race([
      useGymSessionStore.getState().endSession().then(() => true),
      new Promise<boolean>((r) => setTimeout(() => r(false), 50)),
    ]);
    expect(ended).toBe(true);
    expect(createGymSession).toHaveBeenCalled();
    expect(updateUserStatsAfterSession).toHaveBeenCalledWith('u1', 0);
    expect(useGymSessionStore.getState().phase).toBe('idle');
  });
});
