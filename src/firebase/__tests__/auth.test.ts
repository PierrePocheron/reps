import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  handleGoogleSignInResult,
  sendPasswordResetEmail,
  signOut,
  getCurrentUser,
  onAuthChange,
  getCurrentUserProfile,
} from '../auth';

// Mock firebase/auth
vi.mock('firebase/auth', () => {
  const GoogleAuthProvider = vi.fn(function (this: any) {
    this.setCustomParameters = vi.fn();
  }) as any;
  GoogleAuthProvider.credential = vi.fn(() => ({}));

  return {
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    signInWithPopup: vi.fn(),
    signInWithCredential: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
    GoogleAuthProvider,
    updateProfile: vi.fn(),
    getAdditionalUserInfo: vi.fn(),
  };
});

vi.mock('../config', () => ({
  auth: { currentUser: null },
}));

vi.mock('../firestore', () => ({
  createUserDocument: vi.fn().mockResolvedValue(undefined),
  getUserDocument: vi.fn().mockResolvedValue(null),
}));

vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: {
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
  },
}));

import * as firebaseAuth from 'firebase/auth';
import * as firestoreModule from '../firestore';
import * as configModule from '../config';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';

const mockUser = {
  uid: 'user123',
  email: 'test@test.com',
  displayName: 'John Doe',
  emailVerified: true,
};

describe('firebase/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  });

  // ==================== SIGN IN WITH EMAIL ====================

  describe('signInWithEmail', () => {
    it('should sign in and return user', async () => {
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValueOnce({
        user: mockUser,
      } as any);
      vi.mocked(firestoreModule.getUserDocument).mockResolvedValueOnce({ uid: 'user123' } as any);

      const user = await signInWithEmail('test@test.com', 'password123');
      expect(user).toEqual(mockUser);
      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    });

    it('should create user document if not exists', async () => {
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockResolvedValueOnce({
        user: mockUser,
      } as any);
      vi.mocked(firestoreModule.getUserDocument).mockResolvedValueOnce(null);

      await signInWithEmail('test@test.com', 'password123');
      expect(firestoreModule.createUserDocument).toHaveBeenCalledTimes(1);
    });

    it('should throw on error', async () => {
      vi.mocked(firebaseAuth.signInWithEmailAndPassword).mockRejectedValueOnce(
        new Error('auth/wrong-password')
      );
      await expect(signInWithEmail('test@test.com', 'wrong')).rejects.toThrow();
    });
  });

  // ==================== SIGN UP WITH EMAIL ====================

  describe('signUpWithEmail', () => {
    it('should create user and return user', async () => {
      const newUser = { ...mockUser, displayName: 'johndoe' };
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValueOnce({
        user: newUser,
      } as any);
      vi.mocked(firebaseAuth.updateProfile).mockResolvedValueOnce(undefined);

      const user = await signUpWithEmail('test@test.com', 'password123', 'John', 'Doe');
      expect(user).toEqual(newUser);
      expect(firebaseAuth.updateProfile).toHaveBeenCalledTimes(1);
      expect(firestoreModule.createUserDocument).toHaveBeenCalledTimes(1);
    });

    it('should generate fallback displayName when name is too short', async () => {
      const newUser = { ...mockUser, displayName: 'ab' };
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValueOnce({
        user: newUser,
      } as any);
      vi.mocked(firebaseAuth.updateProfile).mockResolvedValueOnce(undefined);

      await signUpWithEmail('test@test.com', 'password123', 'A', 'B');
      // displayName should be fallback starting with "user"
      const call = vi.mocked(firebaseAuth.updateProfile).mock.calls[0]!;
      expect((call[1] as any).displayName).toMatch(/^user\d+$/);
    });

    it('should throw on error', async () => {
      vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockRejectedValueOnce(
        new Error('auth/email-already-in-use')
      );
      await expect(signUpWithEmail('test@test.com', 'pass', 'John', 'Doe')).rejects.toThrow();
    });
  });

  // ==================== SIGN IN WITH GOOGLE (WEB) ====================

  describe('signInWithGoogle', () => {
    it('should sign in with popup on web', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      vi.mocked(firebaseAuth.signInWithPopup).mockResolvedValueOnce({
        user: mockUser,
      } as any);
      vi.mocked(firestoreModule.getUserDocument).mockResolvedValueOnce({ uid: 'user123' } as any);
      vi.mocked(firebaseAuth.getAdditionalUserInfo).mockReturnValueOnce(null);

      const user = await signInWithGoogle();
      expect(firebaseAuth.signInWithPopup).toHaveBeenCalledTimes(1);
      expect(user).toEqual(mockUser);
    });

    it('should sign in with SocialLogin on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(SocialLogin.login).mockResolvedValueOnce({
        result: {
          responseType: 'online',
          idToken: 'fake-id-token',
        },
      } as any);
      vi.mocked(firebaseAuth.GoogleAuthProvider.credential).mockReturnValueOnce({} as any);
      vi.mocked(firebaseAuth.signInWithCredential).mockResolvedValueOnce({
        user: mockUser,
      } as any);
      vi.mocked(firestoreModule.getUserDocument).mockResolvedValueOnce({ uid: 'user123' } as any);
      vi.mocked(firebaseAuth.getAdditionalUserInfo).mockReturnValueOnce(null);

      const user = await signInWithGoogle();
      expect(SocialLogin.login).toHaveBeenCalledTimes(1);
      expect(user).toEqual(mockUser);
    });

    it('should throw if offline mode on native', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(SocialLogin.login).mockResolvedValueOnce({
        result: {
          responseType: 'offline',
          idToken: null,
        },
      } as any);

      await expect(signInWithGoogle()).rejects.toThrow('offline mode');
    });

    it('should throw if no idToken on native', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(SocialLogin.login).mockResolvedValueOnce({
        result: {
          responseType: 'online',
          idToken: null,
        },
      } as any);

      await expect(signInWithGoogle()).rejects.toThrow('No idToken');
    });
  });

  // ==================== HANDLE GOOGLE SIGN IN RESULT ====================

  describe('handleGoogleSignInResult', () => {
    it('should return user if already exists in Firestore', async () => {
      vi.mocked(firestoreModule.getUserDocument).mockResolvedValueOnce({ uid: 'user123' } as any);
      vi.mocked(firebaseAuth.getAdditionalUserInfo).mockReturnValueOnce(null);

      const user = await handleGoogleSignInResult(mockUser as any);
      expect(user).toEqual(mockUser);
      expect(firestoreModule.createUserDocument).not.toHaveBeenCalled();
    });

    it('should create user document if not exists', async () => {
      vi.mocked(firestoreModule.getUserDocument).mockResolvedValueOnce(null);
      vi.mocked(firebaseAuth.getAdditionalUserInfo).mockReturnValueOnce(null);

      await handleGoogleSignInResult(mockUser as any);
      expect(firestoreModule.createUserDocument).toHaveBeenCalledTimes(1);
    });

    it('should create user document when result provided and user not in Firestore', async () => {
      vi.mocked(firestoreModule.getUserDocument).mockResolvedValueOnce(null);
      vi.mocked(firebaseAuth.getAdditionalUserInfo).mockReturnValueOnce(null);

      await handleGoogleSignInResult(mockUser as any, { some: 'result' } as unknown as import('firebase/auth').UserCredential);
      expect(firestoreModule.createUserDocument).toHaveBeenCalledTimes(1);
      expect(vi.mocked(firestoreModule.createUserDocument).mock.calls[0]![0]).toBe('user123');
    });

    it('should fallback to displayName when no profile info', async () => {
      const userWithName = { ...mockUser, displayName: 'Jane Smith' };
      vi.mocked(firestoreModule.getUserDocument).mockResolvedValueOnce(null);
      vi.mocked(firebaseAuth.getAdditionalUserInfo).mockReturnValueOnce(null);

      await handleGoogleSignInResult(userWithName as any);
      const call = vi.mocked(firestoreModule.createUserDocument).mock.calls[0]!;
      expect((call[1] as any).firstName).toBe('Jane');
    });
  });

  // ==================== SEND PASSWORD RESET EMAIL ====================

  describe('sendPasswordResetEmail', () => {
    it('should call firebase sendPasswordResetEmail', async () => {
      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockResolvedValueOnce(undefined);
      await sendPasswordResetEmail('test@test.com');
      expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it('should throw on error', async () => {
      vi.mocked(firebaseAuth.sendPasswordResetEmail).mockRejectedValueOnce(
        new Error('auth/user-not-found')
      );
      await expect(sendPasswordResetEmail('unknown@test.com')).rejects.toThrow();
    });
  });

  // ==================== SIGN OUT ====================

  describe('signOut', () => {
    it('should call firebase signOut on web', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      vi.mocked(firebaseAuth.signOut).mockResolvedValueOnce(undefined);

      await signOut();
      expect(firebaseAuth.signOut).toHaveBeenCalledTimes(1);
      expect(SocialLogin.logout).not.toHaveBeenCalled();
    });

    it('should call SocialLogin.logout on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(SocialLogin.logout).mockResolvedValueOnce(undefined);
      vi.mocked(firebaseAuth.signOut).mockResolvedValueOnce(undefined);

      await signOut();
      expect(SocialLogin.logout).toHaveBeenCalledTimes(1);
      expect(firebaseAuth.signOut).toHaveBeenCalledTimes(1);
    });

    it('should continue firebase signOut even if SocialLogin.logout fails', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(SocialLogin.logout).mockRejectedValueOnce(new Error('plugin error'));
      vi.mocked(firebaseAuth.signOut).mockResolvedValueOnce(undefined);

      await signOut();
      expect(firebaseAuth.signOut).toHaveBeenCalledTimes(1);
    });

    it('should throw if firebase signOut fails', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      vi.mocked(firebaseAuth.signOut).mockRejectedValueOnce(new Error('signOut error'));
      await expect(signOut()).rejects.toThrow();
    });
  });

  // ==================== GET CURRENT USER ====================

  describe('getCurrentUser', () => {
    it('should return currentUser from auth', () => {
      (configModule.auth as any).currentUser = mockUser;
      const user = getCurrentUser();
      expect(user).toEqual(mockUser);
    });

    it('should return null when no user', () => {
      (configModule.auth as any).currentUser = null;
      const user = getCurrentUser();
      expect(user).toBeNull();
    });
  });

  // ==================== ON AUTH CHANGE ====================

  describe('onAuthChange', () => {
    it('should call onAuthStateChanged and return unsubscribe', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(firebaseAuth.onAuthStateChanged).mockReturnValueOnce(mockUnsubscribe as any);

      const callback = vi.fn();
      const unsubscribe = onAuthChange(callback);

      expect(firebaseAuth.onAuthStateChanged).toHaveBeenCalledTimes(1);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  // ==================== GET CURRENT USER PROFILE ====================

  describe('getCurrentUserProfile', () => {
    it('should return null if no user connected', async () => {
      (configModule.auth as any).currentUser = null;
      const profile = await getCurrentUserProfile();
      expect(profile).toBeNull();
    });

    it('should return user profile from Firestore', async () => {
      (configModule.auth as any).currentUser = mockUser;
      const mockProfile = { uid: 'user123', displayName: 'John' };
      vi.mocked(firestoreModule.getUserDocument).mockResolvedValueOnce(mockProfile as any);

      const profile = await getCurrentUserProfile();
      expect(profile).toEqual(mockProfile);
    });
  });
});
