import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from '../AuthForm';

const toast = vi.fn();
const signInWithGoogle = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ signInWithGoogle, signInWithEmail: vi.fn(), signUpWithEmail: vi.fn() }) }));

const clickGoogle = async (error: unknown) => {
  signInWithGoogle.mockRejectedValueOnce(error);
  render(<AuthForm />);
  fireEvent.click(screen.getByRole('button', { name: /Continuer avec Google/ }));
  await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByRole('button', { name: /Continuer avec Google/ })).toBeEnabled());
};

describe('AuthForm Google sign-in', () => {
  beforeEach(() => vi.clearAllMocks());

  it('closing the Google popup (web) shows no error', async () => {
    await clickGoogle(Object.assign(new Error('Firebase: Error (auth/popup-closed-by-user).'), { code: 'auth/popup-closed-by-user' }));
    expect(toast).not.toHaveBeenCalled();
  });

  it('dismissing the account chooser (Android) shows no error', async () => {
    await clickGoogle(new Error('Google Sign-In failed: activity is cancelled by the user.'));
    expect(toast).not.toHaveBeenCalled();
  });

  it('a real failure shows a French message, not the raw Firebase text', async () => {
    await clickGoogle(Object.assign(new Error('Firebase: Error (auth/network-request-failed).'), { code: 'auth/network-request-failed' }));
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0]![0].description).not.toMatch(/Firebase/);
  });
});
