import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SessionTypePicker } from '../SessionTypePicker';

const renderPicker = (onClose = vi.fn()) => {
  render(<MemoryRouter><SessionTypePicker open onClose={onClose} /></MemoryRouter>);
  return onClose;
};

describe('SessionTypePicker', () => {
  it('is announced as a named modal dialog', () => {
    renderPicker();
    const dialog = screen.getByRole('dialog', { name: 'Choisir le type de séance' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('closes from a labelled button', () => {
    const onClose = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes with Escape', () => {
    const onClose = renderPicker();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
