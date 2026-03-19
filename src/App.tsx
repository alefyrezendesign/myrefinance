import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
// Force TS server refresh
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/layout/PageTransition';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/cashflow" element={<PageTransition><CashFlow /></PageTransition>} />
        <Route path="/planning" element={<PageTransition><Planning /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/menu" element={<PageTransition><Menu /></PageTransition>} />
        <Route path="/cards" element={<PageTransition><Cards /></PageTransition>} />
        <Route path="/cards/:id/invoice" element={<PageTransition><Invoice /></PageTransition>} />
        <Route path="/goals/:id" element={<PageTransition><GoalDetails /></PageTransition>} />
        <Route path="/reports" element={<PageTransition><Reports /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </Router>
  );
}

export default App;
