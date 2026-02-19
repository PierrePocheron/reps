import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { logger } from '@/utils/logger';
import { AlertCircle, Bug, CheckCircle } from 'lucide-react';

/**
 * Page de test Sentry (à supprimer en production)
 * Accessible via /sentry-test
 */
export default function SentryTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults((prev) => [...prev, message]);
  };

  const testError = () => {
    try {
      logger.error('Test error from Sentry Test page', new Error('This is a test error'));
      addResult('✅ Error logged to Sentry');
    } catch (e) {
      addResult('❌ Failed to log error');
    }
  };

  const testWarning = () => {
    logger.warn('Test warning from Sentry Test page', { test: true });
    addResult('✅ Warning logged to Sentry');
  };

  const testInfo = () => {
    logger.info('Test info breadcrumb', { action: 'button_click' });
    addResult('✅ Info breadcrumb added');
  };

  const testCrash = () => {
    // Force crash to test Error Boundary
    throw new Error('Intentional crash to test Error Boundary');
  };

  const testUndefined = () => {
    // Force a null reference error to test Error Boundary
    const obj = null as unknown as { property: { nested: unknown } };
    logger.debug(String(obj.property.nested)); // Will crash at runtime (null.property)
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Bug className="h-8 w-8 text-orange-600" />
            <div>
              <h1 className="text-2xl font-bold">Sentry Test Page</h1>
              <p className="text-sm text-gray-600">
                Test error tracking & monitoring
              </p>
            </div>
          </div>
        </Card>

        {/* Sentry Status */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Configuration</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {import.meta.env.VITE_SENTRY_DSN ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm">Sentry DSN configuré</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-sm">Sentry DSN manquant</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm">Environment: {import.meta.env.MODE}</span>
            </div>
          </div>
        </Card>

        {/* Test Buttons */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Tests</h2>
          <div className="grid gap-3">
            <Button onClick={testInfo} variant="outline" className="justify-start">
              📝 Test Info Breadcrumb
            </Button>
            <Button onClick={testWarning} variant="outline" className="justify-start">
              ⚠️ Test Warning
            </Button>
            <Button onClick={testError} variant="outline" className="justify-start">
              ❌ Test Error
            </Button>
            <Button onClick={testUndefined} variant="destructive" className="justify-start">
              💥 Test Undefined Error (caught by Error Boundary)
            </Button>
            <Button onClick={testCrash} variant="destructive" className="justify-start">
              🔥 Test Crash (Error Boundary)
            </Button>
          </div>
        </Card>

        {/* Results */}
        {testResults.length > 0 && (
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Résultats</h2>
              <Button onClick={clearResults} variant="ghost" size="sm">
                Clear
              </Button>
            </div>
            <div className="space-y-2">
              {testResults.map((result, i) => (
                <div key={i} className="rounded bg-gray-100 p-2 text-sm">
                  {result}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Instructions</h2>
          <ol className="space-y-2 text-sm text-gray-600">
            <li>1. Cliquez sur les boutons de test ci-dessus</li>
            <li>2. Allez sur Sentry.io → Issues pour voir les erreurs capturées</li>
            <li>3. Les breadcrumbs/info apparaissent dans le contexte des erreurs</li>
            <li>4. L'Error Boundary affiche une UI de fallback lors d'un crash</li>
            <li className="mt-4 font-semibold text-orange-600">
              ⚠️ À SUPPRIMER avant production !
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
