import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/PageTransition';
import { Toaster } from '@/components/ui/toaster';
import { AppInitializer } from '@/components/AppInitializer';
import { Layout } from '@/components/Layout';
import ErrorBoundary from '@/components/ErrorBoundary';
import Home from './pages/Home';
import Session from './pages/Session';
import Profil from './pages/Profil';
import Settings from './pages/Settings';
import Achievements from './pages/Achievements';
import Statistics from './pages/Statistics';
import Friends from './pages/Friends';
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';
import Challenges from './pages/Challenges';
import SentryTest from './pages/SentryTest';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { useEffect } from 'react';
import { initializeAdMob } from '@/utils/admob';

function App() {
  const location = useLocation();

  useEffect(() => {
    initializeAdMob();
  }, []);

  return (
    <ErrorBoundary>
      <AppInitializer />
      <Routes>
        <Route path="/login" element={
          <PageTransition>
            <Login />
          </PageTransition>
        } />

        {/* Sentry Test Page (DEV ONLY - à supprimer en prod) */}
        {import.meta.env.MODE === 'development' && (
          <Route path="/sentry-test" element={
            <PageTransition>
              <SentryTest />
            </PageTransition>
          } />
        )}

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <AnimatePresence mode="wait">
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
                </AnimatePresence>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;

