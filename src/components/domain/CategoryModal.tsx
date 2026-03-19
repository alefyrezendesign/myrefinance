import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { generateId } from '../../utils/generateId';
import { useFinance } from '../../context/FinanceContext';
import type { Category, TransactionType } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';
import styles from './CategoryModal.module.css';

const COLOR_PALETTE = [
  // Row 1 — Pastéis
  '#F8BBD0', '#FFCCBC', '#FFF9C4', '#C8E6C9', '#B2EBF2',
  // Row 2 — Claros vibrantes
  '#FF7043', '#FFB300', '#66BB6A', '#29B6F6', '#AB47BC',
  // Row 3 — Saturados
  '#E53935', '#FF6D00', '#FDD835', '#00C853', '#2979FF',
  // Row 4 — Médios ricos
  '#D81B60', '#8E24AA', '#00897B', '#5C6BC0', '#6D4C41',
  // Row 5 — Escuros elegantes
  '#B71C1C', '#4A148C', '#1B5E20', '#0D47A1', '#263238',
  // Row 6 — Especiais
  '#EC407A', '#26C6DA', '#9CCC65', '#78909C', '#37474F',
];

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category; 
}

export function CategoryModal({ isOpen, onClose, categoryToEdit }: CategoryModalProps) {
  const { data, setData } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState('#E53935');

  useEffect(() => {
    if (categoryToEdit) {
      setTimeout(() => {
        setName(categoryToEdit.name);
        setType(categoryToEdit.type);
        setColor(categoryToEdit.color);
      }, 0);
    } else {
      setTimeout(() => {
        setName('');
        setType('expense');
        setColor('#E53935');
      }, 0);
    }
  }, [categoryToEdit, isOpen]);

  // Removed early return

  const handleSave = () => {
    if (categoryToEdit?.isProtected) {
      onClose();
      return;
    }

    if (!name.trim()) {
      alert('Nome da categoria é obrigatório.');
      return;
    }

    if (categoryToEdit) {
      const newCats = data.categories.map(c => 
        c.id === categoryToEdit.id ? { ...c, name, type, color } : c
      );
      setData({ ...data, categories: newCats });
    } else {
      const newCategory: Category = {
        id: generateId(),
        name,
        type,
        color,
      };
      setData({ ...data, categories: [...data.categories, newCategory] });
    }

    onClose();
  };

  const handleDelete = () => {
    if (categoryToEdit) {
      const newCats = data.categories.filter(c => c.id !== categoryToEdit.id);
      setData({ ...data, categories: newCats });
      onClose();
    }
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
            <div className={styles.colorDotLarge} style={{ backgroundColor: color }} />
            <h2>{categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.body}>
          <div className={styles.typeSelector}>
            <button 
              className={type === 'expense' ? styles.typeBtnActive : styles.typeBtn}
              onClick={() => (!categoryToEdit?.isProtected) && setType('expense')}
              disabled={categoryToEdit?.isProtected}
              style={categoryToEdit?.isProtected ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              Despesa
            </button>
            <button 
              className={type === 'income' ? styles.typeBtnActive : styles.typeBtn}
              onClick={() => (!categoryToEdit?.isProtected) && setType('income')}
              disabled={categoryToEdit?.isProtected}
              style={categoryToEdit?.isProtected ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              Receita
            </button>
          </div>

          <div className={styles.inputGroup}>
            <label>Nome da Categoria</label>
            <input 
              type="text" 
              placeholder="Ex: Alimentação, Trabalho..." 
              value={name} 
              onChange={e => setName(e.target.value)} 
              disabled={categoryToEdit?.isProtected}
              style={categoryToEdit?.isProtected ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Cor da Categoria</label>
            <div className={styles.colorGrid}>
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  className={`${styles.colorSwatch} ${color === c ? styles.colorSwatchSelected : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  disabled={categoryToEdit?.isProtected}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          {categoryToEdit && !categoryToEdit.isProtected && (
            <button className={styles.btnDelete} onClick={handleDelete}>Excluir</button>
          )}
          {categoryToEdit && categoryToEdit.isProtected && (
            <div /> // Pushes save to right 
          )}
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
