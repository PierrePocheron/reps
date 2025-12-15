import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/PageTransition';
import { Toaster } from '@/components/ui/toaster';
import { AppInitializer } from '@/components/AppInitializer';
import { Layout } from '@/components/Layout';
import Home from './pages/Home';
import Session from './pages/Session';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Achievements from './pages/Achievements';
import Friends from './pages/Friends';

function App() {
  const location = useLocation();

  return (
    <>
      <AppInitializer />
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
              path="/profile"
              element={
                <PageTransition>
                  <Profile />
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
              path="/settings"
              element={
                <PageTransition>
                  <Settings />
                </PageTransition>
              }
            />
          </Routes>
        </AnimatePresence>
      </Layout>
      <Toaster />
    </>
  );
}

export default App;

