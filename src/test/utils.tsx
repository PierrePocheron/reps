import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
// Vi import removed

import { useUserStore } from '@/store/userStore';
import type { User, UserStats } from '@/firebase/types';

// Wrapper for components using Router
export function renderWithRouter(ui: React.ReactElement) {
  return render(ui, { wrapper: BrowserRouter });
}

// Store Mocks Helpers
export const mockUser: User = {
  uid: 'test-user-uid',
  email: 'test@example.com',
  displayName: 'Test User',
  totalReps: 100,
  totalSessions: 5,
  badges: [],
  friends: [],
  currentStreak: 2,
  longestStreak: 5,
  createdAt: { toDate: () => new Date(), seconds: 0, nanoseconds: 0 } as any,
  updatedAt: { toDate: () => new Date(), seconds: 0, nanoseconds: 0 } as any,
  lastConnection: null,
  newBadgeIds: [],
};

export const mockStats: UserStats = {
  totalReps: 100,
  totalSessions: 5,
  totalCalories: 500,
  averageRepsPerSession: 20,
  averageDuration: 300,
  averageExercises: 4,
  currentStreak: 2,
  longestStreak: 5,
  exercisesDistribution: [],
  morningSessions: 1,
  lunchSessions: 1,
  nightSessions: 0,
};

export const setupStore = (overrides?: { user?: Partial<User>; stats?: Partial<UserStats> }) => {
  const initialState = useUserStore.getState();

  useUserStore.setState({
    ...initialState,
    user: overrides?.user ? { ...mockUser, ...overrides.user } : mockUser,
    stats: overrides?.stats ? { ...mockStats, ...overrides.stats } : mockStats,
    isLoading: false,
    isAuthenticated: true,
  });

  return {
    reset: () => useUserStore.setState(initialState),
  };
};

export const resetStore = () => {
    useUserStore.setState({
        user: null,
        stats: null,
        isLoading: true,
        isAuthenticated: false,
    });
};
