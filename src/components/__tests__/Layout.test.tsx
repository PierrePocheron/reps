import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../Layout';

vi.mock('@/components/BottomNav', () => ({ BottomNav: () => null }));

describe('Layout first-run onboarding', () => {
  beforeEach(() => localStorage.clear());

  it('the start questionnaire survives a network change (it used to vanish for good)', async () => {
    render(<MemoryRouter><Layout><div /></Layout></MemoryRouter>);
    fireEvent.click(await screen.findByText('Passer'));
    expect(await screen.findByText('Ton objectif ?')).toBeInTheDocument();

    act(() => { window.dispatchEvent(new Event('offline')); });

    expect(screen.getByText('Ton objectif ?')).toBeInTheDocument();
  });
});
