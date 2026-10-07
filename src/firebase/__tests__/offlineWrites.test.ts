import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addDoc, deleteDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { createUserTemplate, deleteUserTemplate, updateUserTemplate } from '../templates';
import { saveBodyEntries } from '../bodyMetrics';
import { updateGymSession, deleteGymSession, importGymSessions } from '../gymSessions';
import { updateSession, deleteSession, updateUserDocument, sendFriendRequest, declineFriendRequest } from '../firestore';
import { joinChallenge, createCustomChallenge, abandonChallenge } from '../challenges';

// Offline, Firestore only settles a write once the server acknowledges it: the UI must not wait forever
const never = () => new Promise<never>(() => {});

describe('user-data writes while offline (no server ack)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    for (const write of [addDoc, deleteDoc, setDoc, updateDoc]) vi.mocked(write).mockImplementation(never);
    vi.mocked(writeBatch).mockImplementation(() => ({ set: vi.fn(), delete: vi.fn(), commit: never }) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const cases: [string, () => Promise<unknown>][] = [
    ['createUserTemplate', () => createUserTemplate('u1', { name: 'Push', type: 'gym', exercises: [] } as never)],
    ['updateUserTemplate', () => updateUserTemplate('u1', 't1', { name: 'Push', type: 'gym', exercises: [] } as never)],
    ['deleteUserTemplate', () => deleteUserTemplate('u1', 't1')],
    ['saveBodyEntries', () => saveBodyEntries('u1', [])],
    ['updateGymSession', () => updateGymSession('u1', 's1', [])],
    ['deleteGymSession', () => deleteGymSession('u1', 's1')],
    ['importGymSessions', () => importGymSessions('u1', [{ date: new Date(2026, 0, 5), duration: 3600, exercises: [] }], [])],
    ['updateSession', () => updateSession('u1', 's1', [], 0)],
    ['deleteSession', () => deleteSession('u1', 's1')],
    ['updateUserDocument', () => updateUserDocument('u1', { weeklyGoal: 3 } as never)],
    ['joinChallenge', () => joinChallenge('u1', 'c_squats_easy')],
    ['createCustomChallenge', () => createCustomChallenge('u1', 'pushups', 30, 'easy')],
    ['abandonChallenge', () => abandonChallenge('c1')],
    ['sendFriendRequest', () => sendFriendRequest({ uid: 'alice', displayName: 'alice', friends: [] } as never, 'bob')],
    ['declineFriendRequest', () => declineFriendRequest('bob_alice')],
  ];

  it.each(cases)('%s settles without waiting for the network', async (_, run) => {
    let settled = false;
    run().then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(settled).toBe(true);
  });

  it('deleteSession does not hang on its kudos read when the network is dead (12.5 s spinner)', async () => {
    vi.mocked(getDocs).mockImplementation(never);
    let settled = false;
    deleteSession('u1', 's1').then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(5_500);
    expect(settled).toBe(true);
  });

  it('createUserTemplate still returns the new id offline', async () => {
    const pending = createUserTemplate('u1', { name: 'Push', type: 'gym', exercises: [] } as never);
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await pending).id).toBeTruthy();
  });
});
