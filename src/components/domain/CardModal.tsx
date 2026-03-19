import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import type { CreditCard } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';
import styles from './CardModal.module.css';

const CARD_COLORS = [
  '#8A05BE', '#1E88E5', '#FF6D00', '#E53935', '#00C853',
  '#5C6BC0', '#D81B60', '#00897B', '#FFB300', '#37474F',
  '#AB47BC', '#26C6DA', '#FF5722', '#4A148C', '#6D4C41',
];

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit?: CreditCard; 
}

export function CardModal({ isOpen, onClose, cardToEdit }: CardModalProps) {
  const { data, setData, addCard } = useFinance();

  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [color, setColor] = useState('#8A05BE');

  useEffect(() => {
    if (cardToEdit) {
      setTimeout(() => {
        setName(cardToEdit.name);
        setLimit(cardToEdit.limit.toString());
        setClosingDay(cardToEdit.closingDay.toString());
        setDueDay(cardToEdit.dueDay.toString());
        setColor(cardToEdit.color || '#8A05BE');
      }, 0);
    } else {
      setTimeout(() => {
        setName('');
        setLimit('');
        setClosingDay('');
        setDueDay('');
        setColor('#8A05BE');
      }, 0);
    }
  }, [cardToEdit, isOpen]);

  // Removed early return

  const handleSave = () => {
    if (!name || !limit || !closingDay || !dueDay) {
      alert('Preencha todos os campos.');
      return;
    }

    const payload = {
      name,
      color,
      limit: parseFloat(limit),
      closingDay: parseInt(closingDay, 10),
      dueDay: parseInt(dueDay, 10),
    };

    if (cardToEdit) {
      const newCards = data.cards.map(c => c.id === cardToEdit.id ? { ...c, ...payload } : c);
      setData({ ...data, cards: newCards });
    } else {
      addCard(payload);
    }

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
            <div className={styles.colorDotLarge} style={{ backgroundColor: color }} />
            <h2>{cardToEdit ? 'Editar Cartão' : 'Novo Cartão'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.body}>
          <div className={styles.inputGroup}>
            <label>Nome do Cartão</label>
            <input 
              type="text" 
              placeholder="Ex: Nubank, Itaú..." 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Limite Total</label>
            <input 
              type="number" 
              placeholder="R$ 0,00" 
              value={limit} 
              onChange={e => setLimit(e.target.value)} 
            />
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Dia Fechamento</label>
              <input 
                type="number" 
                placeholder="Ex: 25" 
                min="1" max="31"
                value={closingDay} 
                onChange={e => setClosingDay(e.target.value)} 
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Dia Vencimento</label>
              <input 
                type="number" 
                placeholder="Ex: 5" 
                min="1" max="31"
                value={dueDay} 
                onChange={e => setDueDay(e.target.value)} 
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Cor do Cartão</label>
            <div className={styles.colorGrid}>
              {CARD_COLORS.map(c => (
                <button
                  key={c}
                  className={`${styles.colorSwatch} ${color === c ? styles.colorSwatchSelected : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>Cancelar</button>
          <button className={styles.btnSave} onClick={handleSave}>Salvar Cartão</button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
