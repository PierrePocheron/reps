import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
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

describe.each(['default', 'secondary'] as const)('PageLayout back arrow (%s)', (variant) => {
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
});
