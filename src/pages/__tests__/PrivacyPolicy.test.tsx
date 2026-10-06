import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import PrivacyPolicy from '../PrivacyPolicy';

const renderAt = (entries: string[]) => render(
  <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
    <Routes>
      <Route path="/" element={<p>accueil</p>} />
      <Route path="/login" element={<Link to="/privacy-policy">politique</Link>} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
    </Routes>
  </MemoryRouter>
);

describe('PrivacyPolicy back arrow', () => {
  it('opened directly (store link, new tab), it leads into the app', () => {
    renderAt(['/privacy-policy']);
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByText('accueil')).toBeInTheDocument();
  });

  it('opened from the app, it goes back where the user was', () => {
    renderAt(['/login']);
    fireEvent.click(screen.getByText('politique'));
    fireEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByText('politique')).toBeInTheDocument();
  });
});
