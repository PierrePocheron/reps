import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

const Boom = ({ message }: { message: string }) => { throw new Error(message); };
const original = { onLine: Object.getOwnPropertyDescriptor(window.navigator, 'onLine'), location: window.location };

describe('ErrorBoundary', () => {
  afterEach(() => {
    if (original.onLine) Object.defineProperty(window.navigator, 'onLine', original.onLine);
    Object.defineProperty(window, 'location', { configurable: true, value: original.location });
  });

  it('« Réessayer » reloads when a page chunk failed to load (it re-threw the same error forever)', () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original.location, reload } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom message="Failed to fetch dynamically imported module: /assets/Statistics-x.js" /></ErrorBoundary>);
    fireEvent.click(screen.getByRole('button', { name: /Réessayer/ }));
    expect(reload).toHaveBeenCalled();
  });

  it('says so when offline, and speaks like the rest of the app', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary compact><Boom message="boom" /></ErrorBoundary>);
    expect(screen.getByText(/Tu es hors ligne/)).toBeInTheDocument();
    expect(screen.getByText(/contacte-nous/)).toBeInTheDocument();
  });
});
