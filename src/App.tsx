import { Routes, Route, useLocation } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';
import { Toaster } from '@/components/ui/toaster';
import { AppInitializer } from '@/components/AppInitializer';
import { Layout } from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import Home from './pages/Home';
import Login from './pages/Login';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { lazy, Suspense, useEffect } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { initializeAdMob } from '@/utils/admob';

// Accueil et connexion chargés d'emblée, le reste à la demande (bundle initial plus léger)
const Session = lazy(() => import('./pages/Session'));
const GymSession = lazy(() => import('./pages/GymSession'));
const Templates = lazy(() => import('./pages/Templates'));
const Profil = lazy(() => import('./pages/Profil'));
const Settings = lazy(() => import('./pages/Settings'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Statistics = lazy(() => import('./pages/Statistics'));
const Friends = lazy(() => import('./pages/Friends'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Challenges = lazy(() => import('./pages/Challenges'));
const History = lazy(() => import('./pages/History'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const SentryTest = lazy(() => import('./pages/SentryTest'));
const OnboardingSlides = lazy(() => import('@/components/Onboarding').then((m) => ({ default: m.OnboardingSlides })));

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Chargement">
      <LoadingSpinner size="lg" />
    </div>
  );
}

function App() {
  const location = useLocation();

  useEffect(() => {
    initializeAdMob();
  }, []);

  return (
    <ErrorBoundary>
      <AppInitializer />
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={
          <PageTransition>
            <Login />
          </PageTransition>
        } />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

        {/* Sentry Test Page (DEV ONLY - à supprimer en prod) */}
        {import.meta.env.MODE === 'development' && (
          <Route path="/sentry-test" element={
            <PageTransition>
              <SentryTest />
            </PageTransition>
          } />
        )}

        {/* Prévisualisation du tutoriel (DEV ONLY) */}
        {import.meta.env.MODE === 'development' && (
          <Route path="/onboarding-preview" element={
            <OnboardingSlides onFinish={() => window.history.back()} />
          } />
        )}

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                {/* inside the layout: a page that fails keeps the bottom bar, and changing page resets it */}
                <ErrorBoundary compact key={location.pathname}>
                <Suspense fallback={<PageFallback />}>
                <>
                  <Routes location={location} key={location.pathname}>
                    <Route
                      path="/"
                      element={
                        <PageTransition>
                          <Home />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/session"
                      element={
                        <PageTransition>
                          <Session />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/gym"
                      element={
                        <PageTransition>
                          <GymSession />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/templates"
                      element={
                        <PageTransition>
                          <Templates />
                        </PageTransition>
                      }
                    />

                    <Route
                      path="/profil"
                      element={
                        <PageTransition>
                          <div className="safe-area-top">
                            <Profil />
                          </div>
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/achievements"
                      element={
                        <PageTransition>
                          <Achievements />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/friends"
                      element={
                        <PageTransition>
                          <Friends />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/leaderboard"
                      element={
                        <PageTransition>
                          <Leaderboard />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/statistics"
                      element={
                        <PageTransition>
                          <Statistics />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/history"
                      element={
                        <PageTransition>
                          <History />
                        </PageTransition>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <PageTransition>
                          <Settings />
                        </PageTransition>
                      }
                    />
                      <Route
                        path="/challenges"
                        element={
                          <PageTransition>
                            <div className="safe-area-top">
                              <Challenges />
                            </div>
                          </PageTransition>
                        }
                      />
                  </Routes>
                </>
                </Suspense>
                </ErrorBoundary>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      </Suspense>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;

