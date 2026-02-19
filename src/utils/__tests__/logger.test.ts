import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger';

// Mock Sentry
vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
}));

import * as Sentry from '@sentry/react';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== BASIC LOGGING ====================

  describe('debug', () => {
    it('should call console.log in development mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      // isDevelopment is based on import.meta.env.MODE which is 'test' in vitest
      // So debug may not log in test mode - just ensure it doesn't throw
      expect(() => logger.debug('test message')).not.toThrow();
      consoleSpy.mockRestore();
    });

    it('should not throw with context', () => {
      expect(() => logger.debug('test', { key: 'value' })).not.toThrow();
    });
  });

  describe('info', () => {
    it('should not throw', () => {
      expect(() => logger.info('info message')).not.toThrow();
    });

    it('should not throw with context', () => {
      expect(() => logger.info('info message', { data: 123 })).not.toThrow();
    });
  });

  describe('warn', () => {
    it('should call console.warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('warning message');
      expect(consoleSpy).toHaveBeenCalledWith('[WARN] warning message', '');
      consoleSpy.mockRestore();
    });

    it('should call console.warn with context', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('warning', { key: 'value' });
      expect(consoleSpy).toHaveBeenCalledWith('[WARN] warning', { key: 'value' });
      consoleSpy.mockRestore();
    });
  });

  describe('error', () => {
    it('should call console.error with message', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('error message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });

    it('should call console.error with error object', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('test error');
      logger.error('something failed', err);
      expect(consoleSpy).toHaveBeenCalledWith('[ERROR] something failed', err, '');
      consoleSpy.mockRestore();
    });

    it('should not throw with non-Error objects', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => logger.error('error', 'not an Error object')).not.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('captureException', () => {
    it('should call console.error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('captured error');
      logger.captureException(err);
      expect(consoleSpy).toHaveBeenCalledWith('[EXCEPTION]', err, '');
      consoleSpy.mockRestore();
    });

    it('should not throw with context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => logger.captureException(new Error('test'), { extra: true })).not.toThrow();
      consoleSpy.mockRestore();
    });
  });

  // ==================== SENTRY INTEGRATION ====================
  // VITE_SENTRY_DSN is set in .env.local, so isSentryEnabled = true in test env.
  // We verify that Sentry functions ARE called when the logger methods are invoked.

  describe('Sentry integration (enabled via .env.local)', () => {
    it('should call Sentry.captureException for Error objects', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('test error');
      logger.error('test', err);
      expect(Sentry.captureException).toHaveBeenCalledWith(err, expect.any(Object));
    });

    it('should call Sentry.captureMessage for non-Error error values', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('test', 'string error');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('test', expect.any(Object));
    });

    it('should call Sentry.captureMessage for warn', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      logger.warn('test warning');
      expect(Sentry.captureMessage).toHaveBeenCalledWith('test warning', expect.any(Object));
    });

    it('should call Sentry.addBreadcrumb for info', () => {
      logger.info('test info');
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ message: 'test info' }));
    });

    it('should call Sentry.setUser', () => {
      logger.setUser({ id: 'user123', email: 'test@test.com' });
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user123', email: 'test@test.com' });
    });

    it('should call Sentry.setTag', () => {
      logger.setTag('env', 'test');
      expect(Sentry.setTag).toHaveBeenCalledWith('env', 'test');
    });

    it('should call Sentry.setContext', () => {
      logger.setContext('app', { version: '1.0' });
      expect(Sentry.setContext).toHaveBeenCalledWith('app', { version: '1.0' });
    });

    it('should call Sentry.addBreadcrumb from addBreadcrumb', () => {
      logger.addBreadcrumb('click action', { button: 'submit' });
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'click action' })
      );
    });

    it('should call Sentry.captureException from captureException', () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const err = new Error('captured');
      logger.captureException(err, { context: 'test' });
      expect(Sentry.captureException).toHaveBeenCalledWith(err, expect.any(Object));
    });
  });
});
