import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route, Link, useSearchParams } from 'react-router-dom';
import { PageLayout } from '../layout/PageLayout';

const renderAt = (entry: string, variant: 'default' | 'secondary') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/" element={<p>accueil</p>} />
      <Route path="/stats" element={<Link to="/history">historique</Link>} />
      <Route path="/history" element={<PageLayout title="HISTORIQUE" backButton variant={variant}>contenu</PageLayout>} />
    </Routes>
  </MemoryRouter>
);

function TabButton() {
  const [, setParams] = useSearchParams();
  return <button onClick={() => setParams({ tab: 'renforcement' }, { replace: true })}>Renfo</button>;
}

describe.each(['default', 'secondary'] as const)('PageLayout back arrow (%s)', (variant) => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('opened directly (link, bookmark, reopened tab), it leads into the app instead of leaving it', () => {
    renderAt('/history', variant);
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByText('accueil')).toBeInTheDocument();
  });

  it('opened from the app, it goes back where the user was', () => {
    renderAt('/stats', variant);
    fireEvent.click(screen.getByText('historique'));
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByText('historique')).toBeInTheDocument();
  });

  it('opened directly, it still leads into the app after a tab or filter rewrote the URL', () => {
    window.history.replaceState(null, '', '/history'); // a bookmark: the first entry of the tab
    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<p>accueil</p>} />
          <Route path="/history" element={<PageLayout title="HISTORIQUE" backButton variant={variant}><TabButton /></PageLayout>} />
        </Routes>
      </BrowserRouter>
    );
    fireEvent.click(screen.getByText('Renfo'));
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByText('accueil')).toBeInTheDocument();
  });
});
