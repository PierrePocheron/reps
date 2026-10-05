import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { User } from '@/firebase/types';
import { ProfilEditForm } from '../ProfilEditForm';

const db = vi.hoisted(() => ({ updateUserDocument: vi.fn(async () => {}), checkUsernameAvailability: vi.fn(async () => true) }));
vi.mock('@/firebase/firestore', () => db);

const user = { uid: 'u1', displayName: 'jeandupont', weight: 82, height: 180, birthDate: '1990-05-12', badges: ['poussin'] } as User;

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
});
