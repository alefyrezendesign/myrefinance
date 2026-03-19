import { BalanceHeader } from '../../components/domain/BalanceHeader';
import { CreditCardCarousel } from '../../components/domain/CreditCardCarousel';
import { LimitsSummary } from '../../components/domain/LimitsSummary';
import { GoalsSummary } from '../../components/domain/GoalsSummary';
import styles from './Dashboard.module.css';
import { useFinance } from '../../context/FinanceContext';
import { motion } from 'framer-motion';
import { listItemVariants } from '../../styles/motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Dashboard() {
  const { currentMonth } = useFinance();

  return (
    <div className={styles.container}>
      <motion.header variants={listItemVariants} className={styles.topHeader}>
        <img src="/logo-myrefinance.png" alt="MyRefinance Logo" className={styles.appLogo} />
        <h1 className={styles.appTitle}>MyRefinance</h1>
      </motion.header>
      
      <motion.div variants={listItemVariants}>
        <BalanceHeader />
      </motion.div>
      
      <motion.section variants={listItemVariants} className={styles.section}>
        <h2 className={styles.sectionTitle}>Cartões</h2>
        <CreditCardCarousel />
      </motion.section>

      <motion.section variants={listItemVariants} className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>Limites de Gastos</h2>
          <span className={styles.sectionBadge}>{format(currentMonth, 'MMM/yyyy', { locale: ptBR })}</span>
        </div>
        <LimitsSummary />
      </motion.section>

      <motion.section variants={listItemVariants} className={styles.section}>
        <h2 className={styles.sectionTitle}>Objetivos ativos</h2>
        <GoalsSummary />
      </motion.section>
    </div>
  );
}
