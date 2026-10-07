import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserStore } from '../userStore';
import * as firebase from '@/firebase';
import * as themeUtils from '@/utils/theme-colors';
import { updateWidget } from '@/utils/widget';
import { ThemeColor } from '@/utils/theme-colors';
import { useSettingsStore } from '../settingsStore';

// Mock dependencies
vi.mock('@/firebase', () => ({
  onAuthChange: vi.fn(),
  getCurrentUserProfile: vi.fn(),
  updateUserDocument: vi.fn(),
  calculateUserStats: vi.fn(),
  subscribeToUser: vi.fn(() => () => {}),
  markBadgesAsSeen: vi.fn(),
  createUserDocument: vi.fn(),
  clearCurrentSessionFromLocal: vi.fn(),
  onUserStatsComputed: vi.fn(),
  updateUserStatsAfterSession: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/utils/theme-colors', () => ({
  applyThemeColor: vi.fn(),
}));

vi.mock('@/utils/widget', () => ({
  updateWidget: vi.fn(),
}));

describe('userStore', () => {
    beforeEach(() => {
        useUserStore.setState({
            user: null,
            currentUser: null,
            stats: null,
            friendRequests: [],
            isLoading: true,
            isAuthenticated: false
        });
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const state = useUserStore.getState();
        expect(state.user).toBeNull();
        expect(state.isLoading).toBe(true);
    });

    describe('initializeAuth', () => {
        it('should handle auth state change (user connected)', async () => {
             const mockUser = { uid: 'u1', displayName: 'Test' } as any;
             const mockProfile = { uid: 'u1', displayName: 'Test', colorTheme: 'violet' } as any;

             let authCallback: any;
             (firebase.onAuthChange as any).mockImplementation((cb: any) => {
                 authCallback = cb;
                 return () => {};
             });
             (firebase.getCurrentUserProfile as any).mockResolvedValue(mockProfile);
             (firebase.calculateUserStats as any).mockResolvedValue({ totalReps: 100 });

             // Start init but don't await yet if logic waits for callback?
             // Logic in store: initializeAuth calls arrow func that calls onAuthChange.
             // We need to trigger callback manually.

             const initPromise = useUserStore.getState().initializeAuth();

             // Trigger callback manually
             expect(authCallback).toBeDefined();
             await authCallback(mockUser);

             // Now await promise
             await initPromise;

             const state = useUserStore.getState();
             expect(state.currentUser).toEqual(mockUser);
             expect(state.isAuthenticated).toBe(true);
             expect(state.isLoading).toBe(false);

             expect(firebase.getCurrentUserProfile).toHaveBeenCalled();
             expect(themeUtils.applyThemeColor).toHaveBeenCalledWith('violet');
        });

        it('should handle auth state change (user disconnected)', async () => {
             let authCallback: any;
             (firebase.onAuthChange as any).mockImplementation((cb: any) => {
                 authCallback = cb;
                 return () => {};
             });

             const resetSpy = vi.spyOn(useUserStore.getState(), 'reset');

             const initPromise = useUserStore.getState().initializeAuth();

             expect(authCallback).toBeDefined();
             await authCallback(null);
             await initPromise;

             const state = useUserStore.getState();
             expect(state.currentUser).toBeNull();
             expect(state.isAuthenticated).toBe(false);
             expect(state.isLoading).toBe(false);
             expect(resetSpy).toHaveBeenCalled();
        });
    });

    describe('initializeAuth', () => {
        it('replaces its auth listener instead of stacking one per call', async () => {
            // AppInitializer used to re-run it on every theme change, login and logout: one more listener each time
            const unsubscribe = vi.fn();
            (firebase.onAuthChange as any).mockReturnValue(unsubscribe);
            await useUserStore.getState().initializeAuth();
            await useUserStore.getState().initializeAuth();
            expect(unsubscribe).toHaveBeenCalledTimes(1);
        });
    });

    describe('user document listener', () => {
        it('is stopped on reset and never stacked across loads', async () => {
            const unsubscribe = vi.fn();
            (firebase.subscribeToUser as any).mockReturnValue(unsubscribe);
            (firebase.getCurrentUserProfile as any).mockResolvedValue({ uid: 'u1', displayName: 'P' });
            (firebase.calculateUserStats as any).mockResolvedValue({ totalReps: 0 });
            useUserStore.setState({ currentUser: { uid: 'u1' } as any });

            await useUserStore.getState().loadUserProfile();
            await useUserStore.getState().loadUserProfile(); // e.g. profile reloaded: previous listener replaced
            expect(unsubscribe).toHaveBeenCalledTimes(1);

            useUserStore.getState().reset(); // sign-out: without this the listener hit permission-denied
            expect(unsubscribe).toHaveBeenCalledTimes(2);
        });
    });

    describe('app shown again on a later day', () => {
        it('recomputes the stats once per new day, not on every return, and stops on sign-out', async () => {
            // Android back only minimises the app: Statistics kept an 8-day streak while the header said 0
            vi.useFakeTimers({ toFake: ['Date'] });
            const shown = (visible = true) => {
                Object.defineProperty(document, 'visibilityState', { value: visible ? 'visible' : 'hidden', configurable: true });
                document.dispatchEvent(new Event('visibilitychange'));
            };
            try {
                useUserStore.getState().reset(); // a listener left by an earlier test
                vi.setSystemTime(new Date(2026, 9, 5, 20, 0));
                (firebase.subscribeToUser as any).mockReturnValue(() => {});
                (firebase.getCurrentUserProfile as any).mockResolvedValue({ uid: 'u1', displayName: 'P' });
                (firebase.calculateUserStats as any).mockResolvedValue({ totalReps: 0, currentStreak: 8 });
                useUserStore.setState({ currentUser: { uid: 'u1' } as any });
                await useUserStore.getState().loadUserProfile();
                await useUserStore.getState().loadUserProfile(); // listener replaced, not stacked
                expect(firebase.calculateUserStats).toHaveBeenCalledTimes(2);

                shown(); // same day
                vi.setSystemTime(new Date(2026, 9, 8, 9, 0));
                shown(false); // hidden: nothing to show
                expect(firebase.calculateUserStats).toHaveBeenCalledTimes(2);

                shown(); // Thursday
                await vi.waitFor(() => expect(firebase.calculateUserStats).toHaveBeenCalledTimes(3));
                shown(); // Thursday again
                expect(firebase.calculateUserStats).toHaveBeenCalledTimes(3);

                useUserStore.getState().reset();
                vi.setSystemTime(new Date(2026, 9, 9, 9, 0));
                shown();
                expect(firebase.calculateUserStats).toHaveBeenCalledTimes(3);
            } finally {
                vi.useRealTimers();
                Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
            }
        });
    });

    describe('loadUserProfile', () => {
        it('should load profile and stats if current user exists', async () => {
            useUserStore.setState({ currentUser: { uid: 'u1' } as any });

            const mockProfile = { uid: 'u1', displayName: 'P' } as any;
            (firebase.getCurrentUserProfile as any).mockResolvedValue(mockProfile);
            (firebase.calculateUserStats as any).mockResolvedValue({ totalReps: 50 });

            await useUserStore.getState().loadUserProfile();

            const state = useUserStore.getState();
            expect(state.user).toEqual(mockProfile);
            expect(state.stats).toEqual({ totalReps: 50 });
        });

        it('should handle profile not found (retry logic)', async () => {
             useUserStore.setState({ currentUser: { uid: 'u1' } as any });

             const mockProfile = { uid: 'u1' } as any;
             (firebase.getCurrentUserProfile as any)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(mockProfile);

             await useUserStore.getState().loadUserProfile();

             const state = useUserStore.getState();
             // It will retry
             expect(firebase.getCurrentUserProfile).toHaveBeenCalledTimes(2);
             expect(state.user).toEqual(mockProfile);
        });

        it('sign-out during the stats reload: the old account is not brought back', async () => {
            let resolveStats!: (s: unknown) => void;
            (firebase.getCurrentUserProfile as any).mockResolvedValue({ uid: 'A', displayName: 'alice' });
            (firebase.calculateUserStats as any).mockReturnValue(new Promise((r) => { resolveStats = r; }));
            (firebase.subscribeToUser as any).mockReturnValue(() => {});
            useUserStore.setState({ currentUser: { uid: 'A' } as any });

            const loading = useUserStore.getState().loadUserProfile();
            await vi.waitFor(() => expect(firebase.calculateUserStats).toHaveBeenCalled());
            useUserStore.getState().reset();
            resolveStats({ totalReps: 1234 });
            await loading;

            const state = useUserStore.getState();
            expect(state.stats).toBeNull();
            expect(state.user).toBeNull();
            expect(firebase.subscribeToUser).not.toHaveBeenCalled();
        });

        it('sign-out during the profile fetch: the old profile is not set', async () => {
            let resolveProfile!: (p: unknown) => void;
            (firebase.getCurrentUserProfile as any).mockReturnValue(new Promise((r) => { resolveProfile = r; }));
            useUserStore.setState({ currentUser: { uid: 'A' } as any });

            const loading = useUserStore.getState().loadUserProfile();
            useUserStore.getState().reset();
            resolveProfile({ uid: 'A', displayName: 'alice' });
            await loading;

            expect(useUserStore.getState().user).toBeNull();
            expect(useUserStore.getState().isAuthenticated).toBe(false);
        });

        it('should handle profile loading error', async () => {
             useUserStore.setState({ currentUser: { uid: 'u1' } as any });
             (firebase.getCurrentUserProfile as any).mockRejectedValue(new Error('Fail'));

             await useUserStore.getState().loadUserProfile();

             const state = useUserStore.getState();
             expect(state.isLoading).toBe(false);
             expect(state.user).toBeNull();
        });
    });

    describe('updateProfile', () => {
        it('should update profile locally and remotely', async () => {
            useUserStore.setState({
                user: { uid: 'u1', displayName: 'Old' } as any,
                currentUser: { uid: 'u1' } as any,
                isAuthenticated: true
            });

            (firebase.getCurrentUserProfile as any).mockResolvedValue({ uid: 'u1', displayName: 'New' });

            await useUserStore.getState().updateProfile({ displayName: 'New' });

            expect(firebase.updateUserDocument).toHaveBeenCalledWith('u1', { displayName: 'New' });
            expect(firebase.getCurrentUserProfile).toHaveBeenCalled();
        });

        it('should throw error if no user', async () => {
             // Ensure user is null
             useUserStore.setState({ user: null });

             await expect(useUserStore.getState().updateProfile({})).rejects.toThrow('Aucun utilisateur connecté');
        });
    });

    describe('updateThemeColor', () => {
        it('should apply theme color and save it', async () => {
             useUserStore.setState({
                 user: { uid: 'u1' } as any,
                 currentUser: { uid: 'u1' } as any
             });

             (firebase.getCurrentUserProfile as any).mockResolvedValue({ uid: 'u1' });

             const color: ThemeColor = 'pink';

             await useUserStore.getState().updateThemeColor(color);

             expect(themeUtils.applyThemeColor).toHaveBeenCalledWith(color);
             expect(firebase.updateUserDocument).toHaveBeenCalledWith('u1', { colorTheme: color });
        });
    });

    describe('markBadgesAsSeen', () => {
        it('should call firebase and update local state', async () => {
            useUserStore.setState({ user: { uid: 'u1', newBadgeIds: ['b1'] } as any });

            await useUserStore.getState().markBadgesAsSeen();

            expect(firebase.markBadgesAsSeen).toHaveBeenCalledWith('u1');
            expect(useUserStore.getState().user?.newBadgeIds).toEqual([]);
        });
    });

    it('a weekly goal set from any screen recomputes the weekly streak and the widget (welcome questionnaire)', () => {
        useUserStore.setState({ currentUser: { uid: 'u1' } as any });
        const goal = useSettingsStore.getState().weeklyGoal;
        useSettingsStore.getState().setWeeklyGoal(goal);
        expect(firebase.updateUserStatsAfterSession).not.toHaveBeenCalled(); // unchanged
        useSettingsStore.getState().setWeeklyGoal(goal === 5 ? 4 : 5);
        expect(firebase.updateUserStatsAfterSession).toHaveBeenCalledWith('u1', 0);
        useSettingsStore.getState().setStreakMode(useSettingsStore.getState().streakMode === 'daily' ? 'weekly' : 'daily');
        expect(firebase.updateUserStatsAfterSession).toHaveBeenCalledTimes(2);
        useUserStore.setState({ currentUser: null });
        useSettingsStore.getState().setWeeklyGoal(2);
        expect(firebase.updateUserStatsAfterSession).toHaveBeenCalledTimes(2); // signed out: nothing to recompute
    });

    describe('weekly goal and streak mode follow the account', () => {
        // A new device came back to 3× and « Jours »: the weekly streak was then recomputed with the wrong goal
        beforeEach(() => { useUserStore.getState().reset(); vi.clearAllMocks(); });
        const cached = () => JSON.parse(localStorage.getItem('reps_settings') ?? '{}');

        it('saves a change to the private profile when signed in, only locally when signed out', async () => {
            useUserStore.setState({ currentUser: { uid: 'u1' } as any });
            useSettingsStore.getState().setWeeklyGoal(2);
            await vi.waitFor(() => expect(firebase.updateUserDocument).toHaveBeenCalledWith('u1', { weeklyGoal: 2 }));
            useSettingsStore.getState().setStreakMode('weekly');
            await vi.waitFor(() => expect(firebase.updateUserDocument).toHaveBeenCalledWith('u1', { streakMode: 'weekly' }));

            useUserStore.setState({ currentUser: null });
            useSettingsStore.getState().setWeeklyGoal(4);
            await new Promise((r) => setTimeout(r, 0));
            expect(firebase.updateUserDocument).toHaveBeenCalledTimes(2);
            expect(cached().weeklyGoal).toBe(4);
        });

        it('at sign-in the account values win over the device ones, stay cached, and are not written back', async () => {
            useSettingsStore.setState({ weeklyGoal: 3, streakMode: 'daily' });
            (firebase.getCurrentUserProfile as any).mockResolvedValue({ uid: 'u1', displayName: 'P', weeklyGoal: 0, streakMode: 'weekly' });
            (firebase.calculateUserStats as any).mockResolvedValue({ totalReps: 0 });
            useUserStore.setState({ currentUser: { uid: 'u1' } as any });

            await useUserStore.getState().loadUserProfile();

            expect(useSettingsStore.getState()).toMatchObject({ weeklyGoal: 0, streakMode: 'weekly' });
            expect(cached()).toMatchObject({ weeklyGoal: 0, streakMode: 'weekly' });
            expect(firebase.updateUserStatsAfterSession).toHaveBeenCalledWith('u1', 0); // streak recomputed with the account goal
            await new Promise((r) => setTimeout(r, 0));
            expect(firebase.updateUserDocument).not.toHaveBeenCalled();
        });

        it('an account that never saved them (older versions) keeps the device values and uploads them on cold start', async () => {
            // Without the upload, another account signing in on this device (or a new device) replaced them for good
            useSettingsStore.setState({ weeklyGoal: 5, streakMode: 'weekly' });
            (firebase.getCurrentUserProfile as any).mockResolvedValue({ uid: 'u1', displayName: 'P' });
            (firebase.calculateUserStats as any).mockResolvedValue({ totalReps: 0 });
            useUserStore.setState({ currentUser: { uid: 'u1' } as any });

            await useUserStore.getState().loadUserProfile();

            expect(useSettingsStore.getState()).toMatchObject({ weeklyGoal: 5, streakMode: 'weekly' });
            await vi.waitFor(() => expect(firebase.updateUserDocument).toHaveBeenCalledWith('u1', { weeklyGoal: 5, streakMode: 'weekly' }));
            expect(firebase.updateUserStatsAfterSession).not.toHaveBeenCalled(); // nothing changed on the device
        });

        // Fake backend: what is uploaded to an account comes back at its next sign-in
        let accounts: Record<string, object> = {};
        beforeEach(() => { accounts = {}; });
        const signIn = async (uid: string, held: object = {}) => {
            accounts[uid] = { ...accounts[uid], ...held };
            (firebase.updateUserDocument as any).mockImplementation(async (id: string, change: object) => {
                accounts[id] = { ...accounts[id], ...change };
            });
            (firebase.getCurrentUserProfile as any).mockResolvedValue({ uid, displayName: uid, ...accounts[uid] });
            (firebase.calculateUserStats as any).mockResolvedValue({ totalReps: 0 });
            useUserStore.setState({ currentUser: { uid } as any });
            await useUserStore.getState().loadUserProfile();
            await new Promise((r) => setTimeout(r, 0)); // upload, if any
        };

        it('sign-out puts the device back to the defaults: the next account does not inherit them', async () => {
            useSettingsStore.setState({ weeklyGoal: 2, streakMode: 'daily' });
            await signIn('A', { weeklyGoal: 5, streakMode: 'weekly' });
            vi.clearAllMocks();

            useUserStore.getState().reset();

            expect(useSettingsStore.getState()).toMatchObject({ weeklyGoal: 3, streakMode: 'daily' });
            expect(cached()).toMatchObject({ weeklyGoal: 3, streakMode: 'daily' });
            expect(firebase.updateUserStatsAfterSession).not.toHaveBeenCalled(); // signed out: no streak to recompute
            await new Promise((r) => setTimeout(r, 0));
            expect(firebase.updateUserDocument).not.toHaveBeenCalled(); // A keeps its own values

            await signIn('B'); // holds none: gets the defaults, not A's goal
            expect(useSettingsStore.getState()).toMatchObject({ weeklyGoal: 3, streakMode: 'daily' });
            expect(firebase.updateUserDocument).toHaveBeenCalledWith('B', { weeklyGoal: 3, streakMode: 'daily' });
        });

        it('shared device A → B → A: each account comes back with its own values', async () => {
            useSettingsStore.setState({ weeklyGoal: 5, streakMode: 'weekly' }); // A chose them before this version
            await signIn('A'); // cold start
            useUserStore.getState().reset();
            await signIn('B', { weeklyGoal: 2, streakMode: 'daily' });
            expect(useSettingsStore.getState()).toMatchObject({ weeklyGoal: 2, streakMode: 'daily' });
            useUserStore.getState().reset();

            await signIn('A');

            expect(useSettingsStore.getState()).toMatchObject({ weeklyGoal: 5, streakMode: 'weekly' });
            expect(cached()).toMatchObject({ weeklyGoal: 5, streakMode: 'weekly' });
            expect(accounts['B']).toMatchObject({ weeklyGoal: 2, streakMode: 'daily' });
        });

        it('app left open: a change made on another device applies, a local change is never undone', async () => {
            // The phone kept 3× until a cold start, and its next session rewrote the weekly streak with that goal
            let emit!: (user: object) => void;
            (firebase.subscribeToUser as any).mockImplementation((_uid: string, cb: (user: object) => void) => {
                emit = cb;
                return () => {};
            });
            useSettingsStore.setState({ weeklyGoal: 3, streakMode: 'daily' });
            await signIn('u1', { weeklyGoal: 3, streakMode: 'daily' });
            vi.clearAllMocks();

            emit({ uid: 'u1', displayName: 'u1', weeklyGoal: 5, streakMode: 'weekly' }); // set on the tablet
            expect(useSettingsStore.getState()).toMatchObject({ weeklyGoal: 5, streakMode: 'weekly' });
            expect(cached()).toMatchObject({ weeklyGoal: 5, streakMode: 'weekly' });
            expect(firebase.updateUserStatsAfterSession).toHaveBeenCalledWith('u1', 0);

            useSettingsStore.getState().setStreakMode('daily'); // here, before its echo...
            emit({ uid: 'u1', displayName: 'u1', weeklyGoal: 5, streakMode: 'weekly', totalReps: 10 }); // ...a public-doc update
            expect(useSettingsStore.getState().streakMode).toBe('daily');
            emit({ uid: 'u1', displayName: 'u1', weeklyGoal: 5, streakMode: 'daily', totalReps: 10 }); // the echo
            emit({ uid: 'u1', displayName: 'u1', totalReps: 10 }); // public doc before the private one (listener restarted)
            expect(useSettingsStore.getState()).toMatchObject({ weeklyGoal: 5, streakMode: 'daily' });
            await new Promise((r) => setTimeout(r, 0));
            expect(firebase.updateUserDocument).toHaveBeenCalledTimes(1); // the local change only: nothing written back
        });
    });

    it('reset: pending friend requests do not carry over to the next account', () => {
        useUserStore.setState({ friendRequests: [{ id: 'x_A', fromUserName: 'alice', toUserId: 'A' } as any] });
        useUserStore.getState().reset();
        expect(useUserStore.getState().friendRequests).toEqual([]);
    });

    it('reset: the home-screen widget no longer shows the previous account streak', () => {
        useUserStore.getState().reset();
        expect(updateWidget).toHaveBeenCalledWith(expect.objectContaining({ streak: 0, weekDone: 0 }));
    });

    it('reset : la séance muscu en cours ne passe pas au compte suivant', async () => {
        const { useGymSessionStore } = await import('../gymSessionStore');
        useGymSessionStore.getState().startFreeSession();
        expect(useGymSessionStore.getState().phase).not.toBe('idle');
        useUserStore.getState().reset();
        await vi.waitFor(() => expect(useGymSessionStore.getState().phase).toBe('idle'));
    });
});
