import { ArrowUpCircle, ArrowDownCircle, Plus } from 'lucide-react';
import styles from './TransactionMenu.module.css';

interface TransactionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'income' | 'expense') => void;
}

export function TransactionMenu({ isOpen, onClose, onSelectType }: TransactionMenuProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.menuContainer}>
        {/* Receita option */}
        <button 
          className={`${styles.optionBtn} ${styles.incomeBtn}`}
          onClick={(e) => { e.stopPropagation(); onSelectType('income'); }}
        >
          <div className={styles.iconWrapper}><ArrowUpCircle size={32} /></div>
          <span>Receita</span>
        </button>
        
        {/* Despesa option */}
        <button 
          className={`${styles.optionBtn} ${styles.expenseBtn}`}
          onClick={(e) => { e.stopPropagation(); onSelectType('expense'); }}
        >
          <div className={styles.iconWrapper}><ArrowDownCircle size={32} /></div>
          <span>Despesa</span>
        </button>
      </div>

      {/* FAB idêntico e na mesma posição do BottomBar para imitar a transição */}
      <div className={styles.closeFabWrapper}>
        <div className={styles.closeFabContainer}>
          <button className={styles.closeFab} onClick={onClose} aria-label="Fechar menu">
            <Plus size={32} />
          </button>
        </div>
      </div>
    </div>
  );
}
