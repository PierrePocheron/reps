import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { User } from '@/firebase/types';
import { ProfilEditForm } from '../ProfilEditForm';

const db = vi.hoisted(() => ({ updateUserDocument: vi.fn(async () => {}), checkUsernameAvailability: vi.fn(async () => true) }));
vi.mock('@/firebase/firestore', () => db);
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const user = { uid: 'u1', displayName: 'jeandupont', weight: 82, height: 180, birthDate: '1990-05-12', badges: ['poussin'] } as User;

// Born on 1 January, `years` ago: the same age whatever today's date
const pickBirthDate = (years: number) => {
  fireEvent.change(screen.getByLabelText('Jour de naissance'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Mois de naissance'), { target: { value: '1' } });
  fireEvent.change(screen.getByLabelText('Année de naissance'), { target: { value: String(new Date().getFullYear() - years) } });
};

const submit = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(() => expect(db.updateUserDocument).toHaveBeenCalled());
  return (db.updateUserDocument.mock.calls[0] as unknown as [string, Partial<User>])[1];
};

describe('ProfilEditForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('an emptied weight is removed, not kept', async () => {
    render(<ProfilEditForm user={user} />);
    fireEvent.change(screen.getByLabelText('Poids (kg)'), { target: { value: '' } });
    expect((await submit()).weight).toBe('__deleteField__');
  });

  it('setting the day back to « Jour » removes the birth date', async () => {
    render(<ProfilEditForm user={user} />);
    fireEvent.change(screen.getByLabelText('Jour de naissance'), { target: { value: '' } });
    expect((await submit()).birthDate).toBe('__deleteField__');
  });

  it('a 🔥 avatar is named after the badge the user owns (« Fournaise », not « Le début »)', () => {
    render(<ProfilEditForm user={{ ...user, avatarEmoji: '🔥', badges: ['poussin', 'cal-fire'] }} />);
    expect(screen.getByText('Fournaise')).toBeInTheDocument();
  });

  it('a new user with only the chick is told how to get more avatars', () => {
    render(<ProfilEditForm user={user} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByText(/Débloque des badges/)).toBeInTheDocument();
  });

  it('under 13 is refused, as the privacy policy says (nothing saved)', async () => {
    render(<ProfilEditForm user={user} />);
    pickBirthDate(12);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(db.updateUserDocument).not.toHaveBeenCalled();
  });

  it('13 is old enough', async () => {
    render(<ProfilEditForm user={user} />);
    pickBirthDate(13);
    expect((await submit()).birthDate).toBe(`${new Date().getFullYear() - 13}-01-01`);
  });

  it('a weight typed with the French comma is kept (« 72,5 » is not 72)', async () => {
    render(<ProfilEditForm user={user} onSuccess={() => {}} />);
    fireEvent.change(screen.getByLabelText('Poids (kg)'), { target: { value: '72,5' } });
    expect((await submit()).weight).toBe(72.5);
  });
});
