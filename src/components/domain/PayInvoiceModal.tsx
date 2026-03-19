import { X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';
import styles from './PayInvoiceModal.module.css';

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  invoiceTotal: number;
}

export function PayInvoiceModal({ isOpen, onClose, onConfirm, invoiceTotal }: PayInvoiceModalProps) {
  // Removed early return

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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
            variants={bottomSheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <CheckCircle size={24} className={styles.accentIcon} />
            <h2>Confirmar Pagamento</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.body}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 16, lineHeight: '1.5' }}>
            Pagar fatura de <strong style={{color: 'var(--color-primary-green)', fontSize: 18}}>{formatCurrency(invoiceTotal)}</strong>?<br/><br/>
            Esse valor será debitado do seu saldo atual da conta principal.
          </p>
        </div>

        <div className={styles.footer}>
          <div />
          <div className={styles.footerRight}>
            <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
            <button className={styles.btnSave} onClick={() => { onConfirm(); onClose(); }}>Confirmar</button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
