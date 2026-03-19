import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { CashFlow } from './pages/CashFlow/CashFlow';
import { Planning } from './pages/Planning/Planning';
import { Menu } from './pages/Menu/Menu';
import { Settings } from './pages/Settings/Settings';
import { Cards } from './pages/Cards/Cards';
import { Invoice } from './pages/Cards/Invoice';
import { GoalDetails } from './pages/Goals/GoalDetails';
import { Reports } from './pages/Reports/Reports';
import { Login } from './pages/Login/Login';
import { useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
// Force TS server refresh
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/layout/PageTransition';
import { SplashScreen } from './components/layout/SplashScreen';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        
        <Route path="/" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
        <Route path="/cashflow" element={<ProtectedRoute><PageTransition><CashFlow /></PageTransition></ProtectedRoute>} />
        <Route path="/planning" element={<ProtectedRoute><PageTransition><Planning /></PageTransition></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
        <Route path="/menu" element={<ProtectedRoute><PageTransition><Menu /></PageTransition></ProtectedRoute>} />
        <Route path="/cards" element={<ProtectedRoute><PageTransition><Cards /></PageTransition></ProtectedRoute>} />
        <Route path="/cards/:id/invoice" element={<ProtectedRoute><PageTransition><Invoice /></PageTransition></ProtectedRoute>} />
        <Route path="/goals/:id" element={<ProtectedRoute><PageTransition><GoalDetails /></PageTransition></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><PageTransition><Reports /></PageTransition></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Only show splash screen on fresh app load
    const hasSeenSplash = sessionStorage.getItem('myrefinance_splash_seen');
    if (hasSeenSplash) {
      setShowSplash(false);
    } else {
      sessionStorage.setItem('myrefinance_splash_seen', 'true');
    }
  }, []);

  return (
    <Router>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>
      {!showSplash && (
        <Layout>
          <AnimatedRoutes />
        </Layout>
      )}
    </Router>
  );
}

export default App;
