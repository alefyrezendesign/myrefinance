import { NavLink } from 'react-router-dom';
import { Home, ArrowLeftRight, Plus, Target, PieChart } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { buttonScaleVariants } from '../../styles/motion';
import styles from './BottomBar.module.css';

interface BottomBarProps {
  onFabClick: () => void;
}

export function BottomBar({ onFabClick }: BottomBarProps) {
  return (
    <nav className={styles.bottomBar}>
      <NavLink 
        to="/" 
        className={({ isActive }) => clsx(styles.navItem, isActive && styles.active)}
      >
        {({ isActive }) => (
          <>
            {isActive && <motion.div layoutId="bottom-nav-indicator" className={styles.activeIndicator} />}
            <Home size={24} />
            <span>Início</span>
          </>
        )}
      </NavLink>
      
      <NavLink 
        to="/cashflow" 
        className={({ isActive }) => clsx(styles.navItem, isActive && styles.active)}
      >
        {({ isActive }) => (
          <>
            {isActive && <motion.div layoutId="bottom-nav-indicator" className={styles.activeIndicator} />}
            <ArrowLeftRight size={24} />
            <span>Fluxo</span>
          </>
        )}
      </NavLink>

      <div className={styles.fabContainer}>
        <motion.button 
          className={styles.fab} 
          onClick={onFabClick} 
          aria-label="Nova Transação"
          variants={buttonScaleVariants}
          whileHover="hover"
          whileTap="tap"
        >
          <Plus size={32} />
        </motion.button>
      </div>

      <NavLink 
        to="/planning" 
        className={({ isActive }) => clsx(styles.navItem, isActive && styles.active)}
      >
        {({ isActive }) => (
          <>
            {isActive && <motion.div layoutId="bottom-nav-indicator" className={styles.activeIndicator} />}
            <Target size={24} />
            <span>Metas</span>
          </>
        )}
      </NavLink>

      <NavLink 
        to="/menu" 
        className={({ isActive }) => clsx(styles.navItem, isActive && styles.active)}
      >
        {({ isActive }) => (
          <>
            {isActive && <motion.div layoutId="bottom-nav-indicator" className={styles.activeIndicator} />}
            <PieChart size={24} />
            <span>Mais</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
