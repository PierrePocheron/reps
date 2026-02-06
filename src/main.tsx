import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import {
  BrowserRouter,
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from 'react-router-dom';
import * as Sentry from '@sentry/react';

// Initialiser Sentry pour monitoring production
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,

    // Intégrations
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0, // 10% en prod, 100% en dev

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% des sessions
    replaysOnErrorSampleRate: 1.0, // 100% des sessions avec erreur

    // Release tracking
    release: `reps@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,

    // Filtrer les erreurs non critiques
    beforeSend(event, hint) {
      // Ignorer les erreurs de réseau (offline, etc.)
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
          return null;
        }
      }
      return event;
    },
  });
}

// Wrapper BrowserRouter avec Sentry pour tracking navigation
const SentryBrowserRouter = Sentry.withSentryRouting(BrowserRouter);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SentryBrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </SentryBrowserRouter>
  </React.StrictMode>
);

