import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, useNavigate, useSearchParams } from 'react-router-dom';
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

describe('Layout scroll on navigation', () => {
  beforeEach(() => localStorage.setItem('reps_onboarding_v2', '1'));

  it('a new page opens at the top, a URL change on the same page (tab, filter, « plus anciennes ») keeps the position', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    function Page() {
      const navigate = useNavigate();
      const [, setParams] = useSearchParams();
      return <><button onClick={() => setParams({ n: '200' }, { replace: true })}>plus</button><button onClick={() => navigate('/stats')}>stats</button></>;
    }
    render(<MemoryRouter initialEntries={['/history']}><Layout><Page /></Layout></MemoryRouter>);

    fireEvent.click(screen.getByText('plus'));
    expect(scrollTo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('stats'));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scrollTo.mockRestore();
  });
});
