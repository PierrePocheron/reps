import '@testing-library/jest-dom';
import { vi } from 'vitest';

// --- MOCKS ---

// 1. Mock Canvas (for confetti)
HTMLCanvasElement.prototype.getContext = vi.fn();

// 2. Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
    signOut: vi.fn(),
  })),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: class {
    setCustomParameters = vi.fn();
  },
  onAuthStateChanged: vi.fn(() => vi.fn()), // Returns unsubscribe function
}));

const mockDoc = {
  id: 'mock-doc-id',
  exists: () => true,
  data: () => ({}),
};

const mockCollection = {
    doc: vi.fn(() => mockDoc)
};

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(() => mockCollection),
  doc: vi.fn(() => mockDoc),
  getDoc: vi.fn(() => Promise.resolve(mockDoc)),
  getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true, forEach: vi.fn() })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
  onSnapshot: vi.fn(() => vi.fn()), // Unsubscribe
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date(), seconds: 0, nanoseconds: 0 }),
    fromDate: (date: Date) => ({ toDate: () => date, seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 }),
  },
  arrayUnion: vi.fn((...args) => args),
  arrayRemove: vi.fn((...args) => args),
  increment: vi.fn((n) => n),
  documentId: vi.fn(() => '__name__'),
  collectionGroup: vi.fn(() => ({})),
  runTransaction: vi.fn(async (_db, fn) => fn({ get: vi.fn(), set: vi.fn(), update: vi.fn() })),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(() => Promise.resolve()),
  })),
  serverTimestamp: vi.fn(),
  initializeFirestore: vi.fn(() => ({})),
  persistentLocalCache: vi.fn(() => ({})),
  persistentMultipleTabManager: vi.fn(() => ({})),
}));

// 3. Mock Sound (useSound hook is a wrapper, but we might want to mock the native Audio if used directly)
// If we use 'use-sound' or similar, we might need a specific mock.
// For now, let's just mock the Audio constructor globally.
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  volume: 1,
  src: '',
}));

// 4. Mock @capgo/capacitor-social-login
vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: {
    initialize: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue({
      provider: 'google',
      result: {
        responseType: 'online',
        idToken: 'mock-id-token',
        accessToken: {
          token: 'mock-access-token',
        },
        profile: {
          email: 'test@example.com',
          familyName: 'Doe',
          givenName: 'John',
          id: 'mock-google-id',
          name: 'John Doe',
          imageUrl: 'https://example.com/avatar.jpg',
        },
      },
    }),
    logout: vi.fn().mockResolvedValue(undefined),
  },
}));
