import { Profiler } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Templates from '../Templates';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { useSessionStore } from '@/store/sessionStore';

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

  it('« Séance libre » on the Musculation tab starts a free session (it bounced back to Home)', () => {
    useGymSessionStore.setState({ phase: 'idle' });
    render(
      <MemoryRouter initialEntries={['/templates']}>
        <Routes>
          <Route path="/templates" element={<Templates />} />
          <Route path="/gym" element={<p>séance muscu</p>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Musculation' }));
    fireEvent.click(screen.getByRole('button', { name: /Séance libre/ }));
    expect(screen.getByText('séance muscu')).toBeInTheDocument();
    expect(useGymSessionStore.getState().phase).toBe('execute');
  });

  it('a running renfo session does not re-render the page every second (its timer is not shown here)', () => {
    useSessionStore.setState({ isActive: true, duration: 0 });
    const onRender = vi.fn();
    render(<MemoryRouter><Profiler id="templates" onRender={onRender}><Templates /></Profiler></MemoryRouter>);
    onRender.mockClear();
    act(() => useSessionStore.setState({ duration: 1 })); // useSession's 1 s tick, from the bottom bar
    expect(onRender).not.toHaveBeenCalled();
    useSessionStore.setState({ isActive: false });
  });
});
