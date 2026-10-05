import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Inside the page area (bottom bar stays usable) rather than full screen */
  compact?: boolean;
}

// A page chunk that failed to load (offline, or a tab left open over a deploy): re-rendering throws it again
const isChunkError = (error: Error | null) =>
  !!error && /dynamically imported module|Importing a module script failed|Loading chunk|module script/i.test(error.message);

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary React avec intégration Sentry
 * Capture les erreurs React et affiche une UI de fallback
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log vers Sentry
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Log console en dev
    if (import.meta.env.MODE === 'development') {
      console.error('Error Boundary caught:', error, errorInfo);
    }
  }

  handleReset = (): void => {
    if (isChunkError(this.state.error)) { window.location.reload(); return; }
    this.setState({
      hasError: false,
      error: null,
    });
  };

  handleGoHome = (): void => {
    this.handleReset();
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      return (
        <div className={`flex items-center justify-center p-4 ${this.props.compact ? 'py-16' : 'min-h-screen bg-background'}`}>
          <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-sm">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertCircle className="h-12 w-12 text-destructive" aria-hidden />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-foreground">Oups, une erreur s'est produite</h1>
              <p className="text-sm text-muted-foreground">
                {offline
                  ? 'Tu es hors ligne. Reconnecte-toi puis réessaie.'
                  : "Quelque chose s'est mal passé, l'erreur nous a été signalée."}
              </p>
            </div>

            {/* Error details (dev only) */}
            {import.meta.env.MODE === 'development' && this.state.error && (
              <div className="rounded-lg bg-destructive/10 p-4">
                <p className="mb-2 text-xs font-semibold text-destructive">Erreur (dev only) :</p>
                <pre className="overflow-auto text-xs text-destructive">{this.state.error.message}</pre>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button onClick={this.handleReset} className="w-full min-h-11" variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
              <Button onClick={this.handleGoHome} className="w-full min-h-11" variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">Si le problème persiste, contacte-nous.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
