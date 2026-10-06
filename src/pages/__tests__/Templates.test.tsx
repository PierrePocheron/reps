import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Templates from '../Templates';

vi.mock('@/hooks/useUserTemplates', () => ({
  useUserTemplates: () => ({ templates: [], loading: false, create: vi.fn(), remove: vi.fn(), update: vi.fn() }),
}));

const renderPage = (url = '/templates') => render(<MemoryRouter initialEntries={[url]}><Templates /></MemoryRouter>);
const selectedTab = () => screen.getByRole('tab', { selected: true }).textContent;

describe('Templates tabs', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('reopens on the last tab used on this device (no extra tap, no same-name trap)', () => {
    const first = renderPage();
    expect(selectedTab()).toBe('Renforcement');
    fireEvent.click(screen.getByRole('tab', { name: 'Musculation' }));
    first.unmount();
    renderPage();
    expect(selectedTab()).toBe('Musculation');
  });

  it('a questionnaire suggestion still picks its own tab', () => {
    const first = renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Musculation' }));
    first.unmount();
    renderPage('/templates?suggest=renfo_full_body');
    expect(selectedTab()).toBe('Renforcement');
  });

  it('works when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    renderPage();
    expect(selectedTab()).toBe('Renforcement');
    fireEvent.click(screen.getByRole('tab', { name: 'Musculation' }));
    expect(selectedTab()).toBe('Musculation');
  });
});
