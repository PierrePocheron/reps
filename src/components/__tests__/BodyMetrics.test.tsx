import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useUserStore } from '@/store/userStore';
import { BodyMetrics } from '../BodyMetrics';

const store = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn(async () => {}) }));
vi.mock('@/firebase/bodyMetrics', () => ({ getBodyEntries: store.get, saveBodyEntries: store.save }));

const addButton = () => screen.getByRole('button', { name: /Mesure$/ });

describe('BodyMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({ user: { uid: 'u1', weight: 70 } as never });
  });

  it("n'écrase pas l'historique avant son chargement : ajout impossible tant qu'il n'est pas lu", () => {
    store.get.mockReturnValue(new Promise(() => {})); // slow network
    render(<BodyMetrics />);
    expect(addButton()).toBeDisabled();
  });

  it("après un échec de lecture, propose de réessayer au lieu de partir d'un historique vide", async () => {
    store.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{ date: '2026-09-01', weight: 72 }]);
    render(<BodyMetrics />);
    fireEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(addButton()).toBeEnabled());
    expect(store.save).not.toHaveBeenCalled();
  });
});
