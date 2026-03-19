import { useState, useEffect, useRef } from 'react';
import { X, Target, ChevronDown } from 'lucide-react';
import { generateId } from '../../utils/generateId';
import { useFinance } from '../../context/FinanceContext';
import type { BudgetLimit } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';
import styles from './LimitModal.module.css';

interface LimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitToEdit?: BudgetLimit; 
}

export function LimitModal({ isOpen, onClose, limitToEdit }: LimitModalProps) {
  const { data, setData } = useFinance();

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const expenseCategories = data.categories.filter(c => c.type === 'expense');

  // Fix re-render block on input by dropping unstable array references
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (limitToEdit) {
          setCategoryId(limitToEdit.categoryId);
          setAmount(limitToEdit.amount.toString());
        } else {
          const defaultCat = data.categories.find(c => c.type === 'expense')?.id || '';
          setCategoryId(defaultCat);
          setAmount('');
        }
        setIsDropdownOpen(false);
      }, 0);
    }
  }, [isOpen, limitToEdit, data.categories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Removed early return

  const handleSave = () => {
    if (!categoryId || !amount) {
      alert('Selecione uma categoria e informe o limite.');
      return;
    }

    if (limitToEdit) {
      const newLimits = data.limits.map(l => 
        l.id === limitToEdit.id ? { ...l, categoryId, amount: parseFloat(amount) } : l
      );
      setData({ ...data, limits: newLimits });
    } else {
      if (data.limits.some(l => l.categoryId === categoryId)) {
        alert('Já existe um limite para esta categoria.');
        return;
      }

      const newLimit: BudgetLimit = {
        id: generateId(),
        categoryId,
        amount: parseFloat(amount),
      };
      setData({ ...data, limits: [...data.limits, newLimit] });
    }

    onClose();
  };

  const handleDelete = () => {
    if (limitToEdit) {
      const newLimits = data.limits.filter(l => l.id !== limitToEdit.id);
      setData({ ...data, limits: newLimits });
      onClose();
    }
  };

  const selectedCategoryName = expenseCategories.find(c => c.id === categoryId)?.name || 'Selecione uma categoria';

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
            <Target size={24} className={styles.accentIcon} />
            <h2>{limitToEdit ? 'Editar Limite' : 'Novo Limite'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.body}>
          <div className={styles.inputGroup}>
            <label>Categoria (Apenas Despesas)</label>
            <div className={styles.customSelectWrapper} ref={dropdownRef}>
              <div 
                className={`${styles.customSelectValue} ${limitToEdit ? styles.disabled : ''}`} 
                onClick={() => { if (!limitToEdit) setIsDropdownOpen(!isDropdownOpen) }}
              >
                <span>{selectedCategoryName}</span>
                <ChevronDown size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              {isDropdownOpen && (
                <div className={styles.customSelectList}>
                  {expenseCategories.map(c => (
                    <div 
                      key={c.id} 
                      className={styles.customSelectOption}
                      onClick={() => { setCategoryId(c.id); setIsDropdownOpen(false); }}
                    >
                      {c.name}
                    </div>
                  ))}
                  {expenseCategories.length === 0 && (
                    <div className={styles.customSelectOption}>Nenhuma categoria disponível</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Valor Limite (Mensal)</label>
            <input 
              type="number" 
              placeholder="R$ 0,00" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
            />
          </div>
        </div>

        <div className={styles.footer}>
          {limitToEdit ? (
            <button className={styles.btnDelete} onClick={handleDelete}>Excluir</button>
          ) : <div />}
          <div className={styles.footerRight}>
            <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
            <button className={styles.btnSave} onClick={handleSave}>Salvar</button>
          </div>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
