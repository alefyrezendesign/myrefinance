import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import type { Goal } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';
import styles from './GoalModal.module.css';

interface AddProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal; 
}

export function AddProgressModal({ isOpen, onClose, goal }: AddProgressModalProps) {
  const { data, setData, addTransaction } = useFinance();
  const [amount, setAmount] = useState('');

  // Removed early return

  const handleSave = () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      alert('Informe um valor válido.');
      return;
    }

    // Add progress to goal
    const newGoals = data.goals.map(g => {
      if (g.id === goal.id) {
        return {
          ...g,
          progress: [
            ...g.progress,
            { month: new Date().toISOString(), amountSaved: value, status: 'paid' as const }
          ]
        };
      }
      return g;
    });
    
    setData({ ...data, goals: newGoals });

    // Deduct from balance
    addTransaction({
      type: 'expense',
      amount: value,
      date: new Date().toISOString(),
      description: `Investimento na meta: ${goal.name}`,
      categoryId: 'default_category', // ideally an investment category
      accountId: 'conta_unica',
      isRecurring: false,
      status: 'paid',
      observation: 'Automático via "Guardar Dinheiro"',
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.overlay}
          variants={modalOverlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div 
            className={styles.modal}
            variants={bottomSheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <DollarSign size={24} className={styles.accentIcon} />
            <h2>Guardar Dinheiro</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.body}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16, fontSize: 14 }}>
            Meta: <strong>{goal.name}</strong>
          </p>

          <div className={styles.inputGroup}>
            <label>Valor a guardar (será debitado do Saldo Atual)</label>
            <input 
              type="number" 
              placeholder="R$ 0,00" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave}>Confirmar</button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
