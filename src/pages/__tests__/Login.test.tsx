import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigationType } from 'react-router-dom';
import Login from '../Login';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'alice' }, isLoading: false }) }));
vi.mock('@/components/AuthForm', () => ({ AuthForm: () => null }));

function HomeProbe() {
  return <p>home via {useNavigationType()}</p>;
}

describe('Login', () => {
  it('replaces itself with Home once signed in, so back does not bounce through the login screen', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeProbe />} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText('home via REPLACE')).toBeInTheDocument();
  });
});
