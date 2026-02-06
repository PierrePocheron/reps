import * as Sentry from '@sentry/react';

/**
 * Service de logging centralisé
 * Remplace console.log/error/warn avec intégration Sentry
 */

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = import.meta.env.MODE === 'development';
  private isSentryEnabled = !!import.meta.env.VITE_SENTRY_DSN;

  /**
   * Log de debug (uniquement en développement)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  }

  /**
   * Log d'information
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, context || '');
    }

    if (this.isSentryEnabled) {
      Sentry.addBreadcrumb({
        message,
        level: 'info',
        data: context,
      });
    }
  }

  /**
   * Log d'avertissement (envoyé à Sentry en prod)
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context || '');

    if (this.isSentryEnabled) {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: context,
      });
    }
  }

  /**
   * Log d'erreur (envoyé à Sentry)
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    console.error(`[ERROR] ${message}`, error, context || '');

    if (this.isSentryEnabled) {
      if (error instanceof Error) {
        Sentry.captureException(error, {
          extra: {
            message,
            ...context,
          },
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: {
            error,
            ...context,
          },
        });
      }
    }
  }

  /**
   * Définir le contexte utilisateur pour Sentry
   */
  setUser(user: { id: string; email?: string; username?: string } | null): void {
    if (this.isSentryEnabled) {
      Sentry.setUser(user);
    }
  }

  /**
   * Ajouter des tags custom pour filtrage dans Sentry
   */
  setTag(key: string, value: string): void {
    if (this.isSentryEnabled) {
      Sentry.setTag(key, value);
    }
  }

  /**
   * Ajouter du contexte global
   */
  setContext(name: string, context: LogContext): void {
    if (this.isSentryEnabled) {
      Sentry.setContext(name, context);
    }
  }

  /**
   * Capturer une exception manuellement
   */
  captureException(error: Error, context?: LogContext): void {
    console.error('[EXCEPTION]', error, context || '');

    if (this.isSentryEnabled) {
      Sentry.captureException(error, {
        extra: context,
      });
    }
  }

  /**
   * Ajouter un breadcrumb (fil d'Ariane) pour debug
   */
  addBreadcrumb(message: string, data?: LogContext): void {
    if (this.isSentryEnabled) {
      Sentry.addBreadcrumb({
        message,
        data,
      });
    }
  }
}

// Export singleton
export const logger = new Logger();

// Export pour compatibilité avec ancien code (migration progressive)
export default logger;
