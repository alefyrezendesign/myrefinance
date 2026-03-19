import { useState } from 'react';
import { Edit3, Trash2, CheckCircle, XCircle } from 'lucide-react';
import type { Transaction } from '../../types';
import styles from './TransactionActionModal.module.css';
import { useFinance } from '../../context/FinanceContext';
import { DeleteRecurrenceModal } from './DeleteRecurrenceModal';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';

interface Props {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  hideStatusToggle?: boolean;
}

export function TransactionActionModal({ transaction, isOpen, onClose, onEdit, hideStatusToggle }: Props) {
  const { toggleTransactionStatus, deleteTransaction } = useFinance();
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';
  const isPaid = transaction.status === 'paid';

  const handleToggleStatus = () => {
    toggleTransactionStatus(transaction.id);
    onClose();
  };

  const isCardTx = !!transaction.cartaoId;
  const looksRecurring = transaction.seriesId || transaction.isRecurring || transaction.parcelado;

  const handleDelete = () => {
    if (looksRecurring && !isCardTx) {
      setShowRecurrenceOptions(true);
      return;
    }
    
    // Explicit explanation for Card parcel deletions protecting the user from silent destructive actions
    if (isCardTx) {
       if (window.confirm('Excluir esta parcela apagará a compra inteira do cartão. Tem certeza?')) {
         deleteTransaction(transaction.id);
         onClose();
       }
       return;
    }

    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      deleteTransaction(transaction.id);
      onClose();
    }
  };

  const handleRecurrenceDelete = (mode: 'this' | 'future' | 'all') => {
    deleteTransaction(transaction.id, mode);
    setShowRecurrenceOptions(false);
    onClose();
  };

  const handleEdit = () => {
    onEdit();
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && transaction && (
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
              variants={bottomSheetVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className={styles.title}>{transaction.description}</div>
          
          <div className={styles.actionList}>
            {!hideStatusToggle && (
              <button className={styles.actionButton} onClick={handleToggleStatus}>
                {isPaid ? <XCircle size={20} color="var(--color-primary-red)" /> : <CheckCircle size={20} color="var(--color-primary-green)" />}
                <span>
                  {isPaid 
                    ? `Desmarcar como ${isIncome ? 'recebido' : 'pago'}`
                    : `Marcar como ${isIncome ? 'recebido' : 'pago'}`}
                </span>
              </button>
            )}

            <button className={styles.actionButton} onClick={handleEdit}>
              <Edit3 size={20} color="#78909C" />
              <span>Editar lançamento</span>
            </button>

            <button className={`${styles.actionButton} ${styles.dangerButton}`} onClick={handleDelete}>
              <Trash2 size={20} color="var(--color-primary-red)" />
              <span>Excluir lançamento</span>
            </button>
          </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {transaction && (
        <DeleteRecurrenceModal 
          isOpen={showRecurrenceOptions} 
          onClose={() => setShowRecurrenceOptions(false)}
          onConfirm={handleRecurrenceDelete}
        />
      )}
    </>
  );
}
