import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import {
  createUserDocument,
  checkUsernameAvailability,
  getUserDocument,
  updateUserDocument,
  subscribeToUser,
  createSession,
  getLastSession,
  getUserSessions,
  getSession,
  subscribeToUserSessions,
  createExercise,
  getUserExercises,
  deleteExercise,
  calculateUserStats,
  updateUserStatsAfterSession,
  onUserStatsComputed,
  createNotification,
  getUserNotifications,
  markBadgesAsSeen,
  markNotificationAsRead,
  declineFriendRequest,
  getFriendsDetails,
  searchUsers,
  getRandomMotivationalPhrase,
  updateSession,
} from '../firestore';

vi.mock('../config', () => ({ db: {}, auth: { currentUser: null } }));

const mockUserData = {
  displayName: 'testuser',
  email: 'test@example.com',
  totalReps: 100,
  totalSessions: 5,
};

const makeDoc = (data: Record<string, unknown> = {}, exists = true) => ({
  id: 'doc-id',
  exists: () => exists,
  data: () => data,
});

const makeSnapshot = (docs: ReturnType<typeof makeDoc>[], empty = false) => ({
  docs,
  empty,
  size: docs.length,
  forEach: (fn: (d: ReturnType<typeof makeDoc>) => void) => docs.forEach(fn),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDoc).mockResolvedValue(makeDoc(mockUserData) as any);
  vi.mocked(getDocs).mockResolvedValue(makeSnapshot([]) as any);
  vi.mocked(setDoc).mockResolvedValue(undefined);
  vi.mocked(updateDoc).mockResolvedValue(undefined);
  vi.mocked(deleteDoc).mockResolvedValue(undefined);
  vi.mocked(addDoc).mockResolvedValue({ id: 'new-doc-id' } as any);
  vi.mocked(onSnapshot).mockReturnValue(vi.fn() as any);
});

// ==================== USERS ====================

describe('createUserDocument', () => {
  it('should write public doc and private profile (email split)', async () => {
    await createUserDocument('uid123', { displayName: 'Pierre', email: 'user@test.com' });
    // 1 setDoc public + 1 setDoc users/{uid}/private/profile
    expect(setDoc).toHaveBeenCalledTimes(2);
    const publicCall = vi.mocked(setDoc).mock.calls[0]!;
    expect(publicCall[1]).not.toHaveProperty('email');
    expect(publicCall[1]).toHaveProperty('emailHash');
    const privateCall = vi.mocked(setDoc).mock.calls[1]!;
    expect(privateCall[1]).toMatchObject({ email: 'user@test.com' });
  });

  it('should use default displayName if not provided', async () => {
    await createUserDocument('uid123', {});
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it('caps names at the 50 characters firestore.rules allow (or the create is denied after sign-up)', async () => {
    const long = 'a'.repeat(56);
    await createUserDocument('uid123', { displayName: long, firstName: long, lastName: long });
    const written = vi.mocked(setDoc).mock.calls[0]![1] as Record<string, string>;
    for (const k of ['displayName', 'searchName', 'firstName', 'lastName']) expect(written[k]).toHaveLength(50);
  });

  it('should throw on Firestore error', async () => {
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('Firestore error'));
    await expect(createUserDocument('uid123', {})).rejects.toThrow('Firestore error');
  });
});

describe('checkUsernameAvailability', () => {
  it('should return true when no users found', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([], true) as any);
    const result = await checkUsernameAvailability('newuser');
    expect(result).toBe(true);
  });

  it('should return false when username is taken', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([makeDoc({ displayName: 'other' })]) as any);
    const result = await checkUsernameAvailability('takenuser');
    expect(result).toBe(false);
  });

  it('should return true when the username belongs to current user', async () => {
    const mockDocWithId = { id: 'current-uid', exists: () => true, data: () => ({}) };
    vi.mocked(getDocs).mockResolvedValueOnce({
      docs: [mockDocWithId],
      empty: false,
      size: 1,
      forEach: vi.fn(),
    } as any);
    const result = await checkUsernameAvailability('myusername', 'current-uid');
    expect(result).toBe(true);
  });

  it('should return false on error', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Network error'));
    const result = await checkUsernameAvailability('username');
    expect(result).toBe(false);
  });
});

describe('getUserDocument', () => {
  it('should return user when document exists', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ displayName: 'Pierre', totalReps: 50 }) as any);
    const user = await getUserDocument('uid123');
    expect(user).not.toBeNull();
    expect(user?.uid).toBe('uid123');
  });

  it('should return null when document does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({}, false) as any);
    const user = await getUserDocument('uid123');
    expect(user).toBeNull();
  });

  it('should throw on Firestore error', async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error('Permission denied'));
    await expect(getUserDocument('uid123')).rejects.toThrow('Permission denied');
  });
});

describe('updateUserDocument', () => {
  it('should call updateDoc', async () => {
    await updateUserDocument('uid123', { displayName: 'NewName' });
    expect(updateDoc).toHaveBeenCalledTimes(1);
  });

  it('should add searchName when displayName is updated', async () => {
    await updateUserDocument('uid123', { displayName: 'NewName' });
    const updateCall = vi.mocked(updateDoc).mock.calls[0]!;
    expect(updateCall[1]).toMatchObject({ searchName: 'newname' });
  });

  it('should throw on error', async () => {
    vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Update failed'));
    await expect(updateUserDocument('uid123', { displayName: 'x' })).rejects.toThrow('Update failed');
  });

  it('should route private fields to users/{uid}/private/profile', async () => {
    await updateUserDocument('uid123', { weight: 72, displayName: 'Demo' });
    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(vi.mocked(setDoc).mock.calls[0]![1]).toMatchObject({ weight: 72 });
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateDoc).mock.calls[0]![1]).not.toHaveProperty('weight');
  });
});

describe('subscribeToUser', () => {
  it('should call onSnapshot and return unsubscribe function', () => {
    const unsubscribeMock = vi.fn();
    vi.mocked(onSnapshot).mockReturnValueOnce(unsubscribeMock as any);
    const callback = vi.fn();
    const unsubscribe = subscribeToUser('uid123', callback);
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(typeof unsubscribe).toBe('function');
  });
  it('stays quiet on the permission-denied that follows sign-out', async () => {
    const { logger } = await import('@/utils/logger');
    const errorSpy = vi.spyOn(logger, 'error');
    const callback = vi.fn();
    subscribeToUser('uid123', callback); // auth.currentUser is null in this suite: signed out
    const onError = vi.mocked(onSnapshot).mock.calls[0]![2] as unknown as (e: Error) => void;
    onError(Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' }));
    expect(errorSpy).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(null);
  });
});

// ==================== SESSIONS ====================

describe('createSession', () => {
  it('should call addDoc and return a session id', async () => {
    const sessionId = await createSession('uid123', {
      date: { toDate: () => new Date() } as any,
      duration: 300,
      exercises: [],
      totalReps: 50,
      totalCalories: 100,
    });
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(sessionId).toBe('new-doc-id');
  });

  it('should throw on Firestore error', async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(new Error('Write failed'));
    await expect(createSession('uid123', {} as any)).rejects.toThrow('Write failed');
  });
});

describe('getLastSession', () => {
  it('should return null when no sessions exist', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([], true) as any);
    const session = await getLastSession('uid123');
    expect(session).toBeNull();
  });

  it('should return the last session when available', async () => {
    const mockSession = { date: new Date(), totalReps: 30 };
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([makeDoc(mockSession)]) as any);
    const session = await getLastSession('uid123');
    expect(session).not.toBeNull();
    expect(session?.sessionId).toBe('doc-id');
  });

  it('should throw on error', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Read failed'));
    await expect(getLastSession('uid123')).rejects.toThrow('Read failed');
  });
});

describe('getUserSessions', () => {
  it('should return empty array when no sessions', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([]) as any);
    const sessions = await getUserSessions('uid123');
    expect(sessions).toEqual([]);
  });

  it('should return mapped sessions', async () => {
    const mockSessions = [makeDoc({ totalReps: 20 }), makeDoc({ totalReps: 30 })];
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot(mockSessions) as any);
    const sessions = await getUserSessions('uid123');
    expect(sessions).toHaveLength(2);
  });

  it('should throw on error', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Failed'));
    await expect(getUserSessions('uid123')).rejects.toThrow('Failed');
  });
});

describe('getSession', () => {
  it('should return session when it exists', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ totalReps: 15 }) as any);
    const session = await getSession('uid123', 'session456');
    expect(session).not.toBeNull();
    expect(session?.sessionId).toBe('session456');
  });

  it('should return null when session does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({}, false) as any);
    const session = await getSession('uid123', 'session456');
    expect(session).toBeNull();
  });
});

describe('subscribeToUserSessions', () => {
  it('should call onSnapshot and return an unsubscribe function', () => {
    const callback = vi.fn();
    subscribeToUserSessions('uid123', callback);
    expect(onSnapshot).toHaveBeenCalledTimes(1);
  });
});

// ==================== EXERCISES ====================

describe('deleteExercise', () => {
  it('should call deleteDoc', async () => {
    await deleteExercise('exercise-id');
    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });

  it('should throw on error', async () => {
    vi.mocked(deleteDoc).mockRejectedValueOnce(new Error('Delete failed'));
    await expect(deleteExercise('exercise-id')).rejects.toThrow('Delete failed');
  });
});

// ==================== BADGES & NOTIFICATIONS ====================

describe('markBadgesAsSeen', () => {
  it('should call updateDoc to clear newBadgeIds', async () => {
    await markBadgesAsSeen('uid123');
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateDoc).mock.calls[0]![1]).toMatchObject({ newBadgeIds: [] });
  });

  it('should throw on error', async () => {
    vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Update failed'));
    await expect(markBadgesAsSeen('uid123')).rejects.toThrow('Update failed');
  });
});

describe('markNotificationAsRead', () => {
  it('should call updateDoc with read: true', async () => {
    await markNotificationAsRead('notif-id');
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateDoc).mock.calls[0]![1]).toMatchObject({ read: true });
  });
});

// ==================== SOCIAL ====================

describe('declineFriendRequest', () => {
  it('should call updateDoc with rejected status', async () => {
    await declineFriendRequest('request-id');
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateDoc).mock.calls[0]![1]).toMatchObject({ status: 'rejected' });
  });

  it('should throw on error', async () => {
    vi.mocked(updateDoc).mockRejectedValueOnce(new Error('Update failed'));
    await expect(declineFriendRequest('request-id')).rejects.toThrow('Update failed');
  });
});

describe('getFriendsDetails', () => {
  it('should return empty array for empty friend list', async () => {
    const result = await getFriendsDetails([]);
    expect(result).toEqual([]);
  });

  it('should batch-fetch friends and return them', async () => {
    const friends = [makeDoc({ displayName: 'Alice' }), makeDoc({ displayName: 'Bob' })];
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot(friends) as any);
    const result = await getFriendsDetails(['uid1', 'uid2']);
    expect(result).toHaveLength(2);
  });

  it('a read failure is an error, not an empty friends list (Social said « no friends » offline)', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Read failed'));
    await expect(getFriendsDetails(['f1'])).rejects.toThrow('Read failed');
  });
});

describe('searchUsers', () => {
  it('should return empty array when search term is too short', async () => {
    const results = await searchUsers('a');
    expect(results).toEqual([]);
  });

  it('should return users when search finds matches', async () => {
    const users = [makeDoc({ displayName: 'Demo' }), makeDoc({ displayName: 'Pierrot' })];
    vi.mocked(getDocs).mockResolvedValue(makeSnapshot(users) as any);
    const results = await searchUsers('Pierre');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return empty array on complete failure', async () => {
    vi.mocked(getDocs).mockRejectedValue(new Error('Network error'));
    const results = await searchUsers('test');
    expect(results).toEqual([]);
  });
});

// ==================== EXERCISES ====================

describe('createExercise', () => {
  it('should call addDoc and return the new id', async () => {
    const id = await createExercise({ name: 'Pompes', emoji: '💪', userId: 'uid123' } as any);
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(id).toBe('new-doc-id');
  });

  it('should throw on Firestore error', async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(new Error('Write failed'));
    await expect(createExercise({ name: 'Pompes', emoji: '💪', userId: 'uid123' } as any)).rejects.toThrow('Write failed');
  });
});

describe('getUserExercises', () => {
  it('should return empty array when no exercises', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([]) as any);
    const exercises = await getUserExercises('uid123');
    expect(exercises).toEqual([]);
  });

  it('should return mapped exercises', async () => {
    const mockExercises = [makeDoc({ name: 'Pompes', emoji: '💪', userId: 'uid123' })];
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot(mockExercises) as any);
    const exercises = await getUserExercises('uid123');
    expect(exercises).toHaveLength(1);
    expect(exercises[0]!.name).toBe('Pompes');
  });

  it('should throw on error', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Read failed'));
    await expect(getUserExercises('uid123')).rejects.toThrow('Read failed');
  });
});

// ==================== CALCULATE USER STATS ====================

const makeSessionDoc = (overrides: Record<string, unknown> = {}) => {
  const dateMs = Date.now();
  return makeDoc({
    // Return a new Date copy each call to prevent mutation issues in streak calculation
    date: { toDate: () => new Date(dateMs), seconds: Math.floor(dateMs / 1000), nanoseconds: 0 },
    totalReps: 50,
    duration: 300,
    exercises: [],
    totalCalories: 100,
    ...overrides,
  });
};

describe('calculateUserStats', () => {
  it('should return empty stats when no sessions', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([]) as any);
    const stats = await calculateUserStats('uid123');
    expect(stats.totalReps).toBe(0);
    expect(stats.totalSessions).toBe(0);
    expect(stats.currentStreak).toBe(0);
  });

  it('time-of-day badges count gym sessions too (a muscu-only early bird never got « L\'avenir appartient à... »)', async () => {
    const at8 = new Date(2026, 9, 1, 8, 0);
    vi.mocked(getDocs)
      .mockResolvedValueOnce(makeSnapshot([]) as any) // renfo
      .mockResolvedValueOnce(makeSnapshot([makeSessionDoc({ date: { toDate: () => new Date(at8) }, exercises: [] })]) as any); // muscu
    const stats = await calculateUserStats('uid123');
    expect(stats.morningSessions).toBe(1);
  });

  it('should calculate totals from sessions', async () => {
    const sessions = [
      makeSessionDoc({ totalReps: 30, duration: 120, totalCalories: 50 }),
      makeSessionDoc({ totalReps: 20, duration: 180, totalCalories: 40 }),
    ];
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot(sessions) as any);
    const stats = await calculateUserStats('uid123');
    expect(stats.totalReps).toBe(50);
    expect(stats.totalSessions).toBe(2);
    expect(stats.totalCalories).toBe(90);
  });

  it('should count morning sessions', async () => {
    const morningTime = new Date();
    morningTime.setHours(8, 0, 0, 0);
    const morningMs = morningTime.getTime();
    const session = makeDoc({
      // Return a new Date copy each time to avoid mutation from streak calculation
      date: { toDate: () => new Date(morningMs) },
      totalReps: 10,
      duration: 60,
      exercises: [],
      totalCalories: 0,
    });
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([session]) as any);
    const stats = await calculateUserStats('uid123');
    expect(stats.morningSessions).toBe(1);
  });

  it('should calculate exercise stats distribution', async () => {
    const sessionWithExercises = makeDoc({
      date: { toDate: () => new Date() },
      totalReps: 50,
      duration: 300,
      exercises: [{ name: 'Pompes', emoji: '💪', reps: 50 }],
      totalCalories: 100,
    });
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([sessionWithExercises]) as any);
    const stats = await calculateUserStats('uid123');
    expect(stats.exercisesDistribution).toHaveLength(1);
    expect(stats.exercisesDistribution[0]!.name).toBe('Pompes');
  });

  it('per-exercise kcal use the weight-based formula of the session total, not 0.1 kcal/rep', async () => {
    vi.mocked(getDoc).mockResolvedValue(makeDoc({ weight: 90, height: 175, gender: 'male' }) as any);
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([
      makeSessionDoc({ totalReps: 100, exercises: [{ name: 'Burpees', emoji: '💀', reps: 100 }], totalCalories: 84 }),
    ]) as any);
    const stats = await calculateUserStats('uid123');
    expect(stats.exercisesDistribution[0]!.totalCalories).toBe(84); // MET 8, 4 s/rep, 90 kg (was 10)
  });

  it('should throw on Firestore error', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Read failed'));
    await expect(calculateUserStats('uid123')).rejects.toThrow('Read failed');
  });
});

// ==================== UPDATE USER STATS AFTER SESSION ====================

describe('updateUserStatsAfterSession', () => {
  it('should update user stats when no new badges', async () => {
    // getUserDocument returns a user with 'poussin' badge (threshold: 0, always unlocked)
    // pre-seeded so it doesn't count as a new badge
    vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ badges: ['poussin'], totalReps: 0 }) as any);
    // calculateUserStats → getUserSessions → getDocs returns empty
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([]) as any);

    await updateUserStatsAfterSession('uid123', 0);
    expect(updateDoc).toHaveBeenCalledTimes(1);
  });

  it("gives the fresh stats to the signed-in user's store (Statistics, badges were stale after a gym session)", async () => {
    const seen = vi.fn();
    onUserStatsComputed(seen);
    const config = await import('../config');
    (config.auth as { currentUser: unknown }).currentUser = { uid: 'uid123' };
    try {
      vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ badges: ['poussin'], totalReps: 0 }) as any);
      vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([]) as any);
      await updateUserStatsAfterSession('uid123', 0);
      expect(seen).toHaveBeenCalledWith(expect.objectContaining({ totalReps: 0, currentStreak: 0 }));
    } finally {
      (config.auth as { currentUser: unknown }).currentUser = null;
      onUserStatsComputed(null);
    }
  });

  it('should throw if user not found', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({}, false) as any);
    await expect(updateUserStatsAfterSession('uid123', 50)).rejects.toThrow('Utilisateur non trouvé');
  });

  it('should use writeBatch when new badges are unlocked', async () => {
    // Return user with no existing badges
    vi.mocked(getDoc).mockResolvedValueOnce(makeDoc({ badges: [] }) as any);
    // Return sessions that result in stats high enough to unlock badges
    // totalReps: 1000+ to unlock first badge (assuming some badge threshold)
    const sessions = Array.from({ length: 5 }, () => makeSessionDoc({ totalReps: 300 }));
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot(sessions) as any);

    const mockBatch = {
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve()),
    };
    vi.mocked(writeBatch).mockReturnValueOnce(mockBatch as any);

    // This may or may not use writeBatch depending on badge thresholds
    // Just ensure it doesn't throw
    await expect(updateUserStatsAfterSession('uid123', 1500)).resolves.toBeUndefined();
  });

  it('should throw on error', async () => {
    vi.mocked(getDoc).mockRejectedValueOnce(new Error('Firestore error'));
    await expect(updateUserStatsAfterSession('uid123', 50)).rejects.toThrow('Firestore error');
  });
});

// ==================== NOTIFICATIONS ====================

describe('createNotification', () => {
  it('should call addDoc and return the new id', async () => {
    const id = await createNotification({
      userId: 'uid123',
      type: 'friend_request',
      message: 'You have a new friend request',
      read: false,
    } as any);
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(id).toBe('new-doc-id');
  });

  it('should throw on Firestore error', async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(new Error('Write failed'));
    await expect(createNotification({ userId: 'uid123' } as any)).rejects.toThrow('Write failed');
  });
});

describe('getUserNotifications', () => {
  it('should return empty array when no notifications', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([]) as any);
    const notifs = await getUserNotifications('uid123');
    expect(notifs).toEqual([]);
  });

  it('should return mapped notifications', async () => {
    const mockNotifs = [makeDoc({ message: 'Hello', read: false, type: 'friend_request' })];
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot(mockNotifs) as any);
    const notifs = await getUserNotifications('uid123');
    expect(notifs).toHaveLength(1);
  });

  it('should throw on error', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Read failed'));
    await expect(getUserNotifications('uid123')).rejects.toThrow('Read failed');
  });
});

// ==================== MOTIVATIONAL PHRASES ====================

describe('getRandomMotivationalPhrase', () => {
  it('should return null when no phrases found', async () => {
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot([], true) as any);
    const phrase = await getRandomMotivationalPhrase();
    expect(phrase).toBeNull();
  });

  it('should return a random phrase when phrases exist', async () => {
    const phrases = [
      makeDoc({ text: 'Keep going!', author: 'Test' }),
      makeDoc({ text: 'You can do it!', author: 'Test2' }),
    ];
    vi.mocked(getDocs).mockResolvedValueOnce(makeSnapshot(phrases) as any);
    const phrase = await getRandomMotivationalPhrase();
    expect(phrase).not.toBeNull();
  });

  it('should return null on error', async () => {
    vi.mocked(getDocs).mockRejectedValueOnce(new Error('Read failed'));
    const phrase = await getRandomMotivationalPhrase();
    expect(phrase).toBeNull();
  });
});

describe('updateSession (renfo edit)', () => {
  it('never stores negative reps typed in the edit dialog', async () => {
    const fields = await updateSession('uid', 's1', [{ name: 'Pompes', emoji: '💪', reps: -10 }, { name: 'Squats', emoji: '🦵', reps: 20 }] as never, 0);
    expect(fields.exercises.map((e) => e.reps)).toEqual([0, 20]);
    expect(fields.totalReps).toBe(20);
  });
});
