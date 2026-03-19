import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';
import styles from './TransactionActionModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'this' | 'future' | 'all') => void;
}

export function DeleteRecurrenceModal({ isOpen, onClose, onConfirm }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.overlay} 
          onClick={onClose} 
          style={{ zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}
          variants={modalOverlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div 
            className={styles.modal} 
            onClick={e => e.stopPropagation()} 
            style={{ paddingBottom: '32px' }}
            variants={bottomSheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
        <div className={styles.title} style={{ marginBottom: 16 }}>Excluir lançamento recorrente</div>
        
        <div className={styles.actionList}>
          <button className={styles.actionButton} onClick={() => onConfirm('this')}>
            <span>Excluir apenas este</span>
          </button>
          
          <button className={styles.actionButton} onClick={() => onConfirm('future')}>
            <span>Excluir este e os futuros</span>
          </button>
          
          <button className={styles.actionButton} onClick={() => onConfirm('all')}>
            <span>Excluir todos</span>
          </button>

          <button className={styles.actionButton} onClick={onClose} style={{justifyContent: 'center', backgroundColor: 'var(--color-surface-hover)', marginTop: 8}}>
            <span>Cancelar</span>
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
