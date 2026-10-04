import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addDoc, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { createUserTemplate, deleteUserTemplate, updateUserTemplate } from '../templates';
import { saveBodyEntries } from '../bodyMetrics';
import { updateGymSession, deleteGymSession } from '../gymSessions';
import { updateSession, deleteSession, updateUserDocument } from '../firestore';

// Offline, Firestore only settles a write once the server acknowledges it: the UI must not wait forever
const never = () => new Promise<never>(() => {});

describe('user-data writes while offline (no server ack)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    for (const write of [addDoc, deleteDoc, setDoc, updateDoc]) vi.mocked(write).mockImplementation(never);
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
    ['updateSession', () => updateSession('u1', 's1', [], 0)],
    ['deleteSession', () => deleteSession('u1', 's1')],
    ['updateUserDocument', () => updateUserDocument('u1', { weeklyGoal: 3 } as never)],
  ];

  it.each(cases)('%s settles without waiting for the network', async (_, run) => {
    let settled = false;
    run().then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(settled).toBe(true);
  });

  it('createUserTemplate still returns the new id offline', async () => {
    const pending = createUserTemplate('u1', { name: 'Push', type: 'gym', exercises: [] } as never);
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await pending).id).toBeTruthy();
  });
});
