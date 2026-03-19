import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, modalContentVariants } from '../../styles/motion';
import styles from './AdjustBalanceModal.module.css';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdjustBalanceModal({ isOpen, onClose }: AdjustBalanceModalProps) {
  const { data, addTransaction } = useFinance();
  const [newBalance, setNewBalance] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setNewBalance(data.balance.toString());
      }, 0);
    }
  }, [isOpen, data.balance]);

  // Removed early return

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetBalance = Number(newBalance);
    
    if (isNaN(targetBalance)) return;

    const difference = targetBalance - data.balance;

    if (difference !== 0) {
      addTransaction({
        type: difference > 0 ? 'income' : 'expense',
        amount: Math.abs(difference),
        date: new Date().toISOString(),
        description: 'Ajuste de saldo',
        categoryId: difference > 0 ? 'c_ajuste_pos' : 'c_ajuste_neg',
        accountId: 'conta_unica',
        isRecurring: false,
        status: 'paid',
        observation: 'Ajuste de saldo manual gerado pelo sistema',
      });
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.overlay} 
          onClick={onClose}
          variants={modalOverlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div 
            className={styles.modal} 
            onClick={e => e.stopPropagation()}
            variants={modalContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
        <div className={styles.header}>
          <h2>Ajustar Saldo</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.infoBox}>
            <p>Saldo Atual: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.balance)}</strong></p>
            <p className={styles.hint}>Informe abaixo o valor exato que está na sua conta real. O sistema vai gerar um lançamento para cobrir a diferença.</p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="newBalance">Novo Saldo Real (R$)</label>
            <input
              type="number"
              id="newBalance"
              step="0.01"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          <button type="submit" className={styles.submitButton}>
            Confirmar Ajuste
          </button>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
