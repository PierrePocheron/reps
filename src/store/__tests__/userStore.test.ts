import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUserStore } from '../userStore';
import * as firebase from '@/firebase';
import * as themeUtils from '@/utils/theme-colors';
import { ThemeColor } from '@/utils/theme-colors';

// Mock dependencies
vi.mock('@/firebase', () => ({
  onAuthChange: vi.fn(),
  getCurrentUserProfile: vi.fn(),
  updateUserDocument: vi.fn(),
  calculateUserStats: vi.fn(),
  subscribeToUser: vi.fn(),
  markBadgesAsSeen: vi.fn(),
  createUserDocument: vi.fn(),
  clearCurrentSessionFromLocal: vi.fn(),
}));

vi.mock('@/utils/theme-colors', () => ({
  applyThemeColor: vi.fn(),
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
});
