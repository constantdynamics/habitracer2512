import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { loadOnboardingState, loadSettings } from './store/uiSlice';
import { initializeDatabase } from './db';
import { Dashboard } from './pages/Dashboard';
import { HabitDetail } from './pages/HabitDetail';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';

function App() {
  const dispatch = useAppDispatch();
  const { onboarding, isLoading } = useAppSelector((state) => state.ui);
  const [initialized, setInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      await dispatch(loadOnboardingState());
      await dispatch(loadSettings());
      setInitialized(true);
    };
    init();
  }, [dispatch]);

  useEffect(() => {
    if (initialized && !isLoading) {
      setShowOnboarding(!onboarding.completed);
    }
  }, [initialized, isLoading, onboarding.completed]);

  // Loading state
  if (!initialized || isLoading) {
    return (
      <div className="min-h-screen bg-vapor-gradient flex items-center justify-center">
        <div className="grid-overlay" />
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🏎️</div>
          <div className="font-display text-xl text-white">
            Loading<span className="text-vapor-cyan">...</span>
          </div>
        </div>
      </div>
    );
  }

  // Onboarding
  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  // Main app
  return (
    <div className="min-h-screen bg-vapor-gradient">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/habit/:habitId" element={<HabitDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
}

export default App;
