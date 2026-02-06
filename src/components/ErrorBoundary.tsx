import React, { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

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
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-red-100 p-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Oups, une erreur s'est produite !
              </h1>
              <p className="text-sm text-gray-600">
                Quelque chose s'est mal passé. Nous avons été notifiés et travaillons sur une
                solution.
              </p>
            </div>

            {/* Error details (dev only) */}
            {import.meta.env.MODE === 'development' && this.state.error && (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="mb-2 text-xs font-semibold text-red-800">Erreur (dev only):</p>
                <pre className="overflow-auto text-xs text-red-700">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleReset}
                className="w-full"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>

              <Button
                onClick={this.handleGoHome}
                className="w-full"
                variant="outline"
              >
                <Home className="mr-2 h-4 w-4" />
                Retour à l'accueil
              </Button>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-500">
              Si le problème persiste, contactez le support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Export HOC Sentry wrapper (optionnel, pour wrapping spécifique)
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return Sentry.withErrorBoundary(Component, {
    fallback: ({ error, resetError }: { error: unknown; resetError: () => void }) => (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md space-y-4 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="text-xl font-bold">Erreur</h2>
          <p className="text-sm text-gray-600">
            {error instanceof Error ? error.message : 'Une erreur est survenue'}
          </p>
          <Button onClick={resetError}>Réessayer</Button>
        </div>
      </div>
    ),
  });
};
