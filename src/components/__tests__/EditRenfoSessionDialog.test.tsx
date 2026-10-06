import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditRenfoSessionDialog } from '../EditRenfoSessionDialog';
import type { Session } from '@/firebase/types';

const session = {
  date: { toDate: () => new Date(2026, 9, 1) },
  exercises: [{ name: 'Pompes', emoji: '💪', reps: 30 }, { name: 'Burpees', emoji: '💀', reps: 20 }],
} as unknown as Session;

describe('EditRenfoSessionDialog', () => {
  it('a tap outside or Escape no longer throws typed corrections away; ✕ still closes', async () => {
    const onCancel = vi.fn();
    render(<EditRenfoSessionDialog session={session} onCancel={onCancel} onSave={async () => {}} />);
    await new Promise((r) => setTimeout(r, 0)); // Radix listens for outside taps from the next tick
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1); // nothing changed yet: closes as before
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Répétitions de Pompes' }), { target: { value: '35' } });
    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.pointerDown(document.body);
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
