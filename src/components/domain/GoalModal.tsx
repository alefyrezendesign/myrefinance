import { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { generateId } from '../../utils/generateId';
import { useFinance } from '../../context/FinanceContext';
import { addMonths } from 'date-fns';
import type { Goal } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';
import styles from './GoalModal.module.css';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal; 
}

export function GoalModal({ isOpen, onClose, goalToEdit }: GoalModalProps) {
  const { data, setData } = useFinance();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [selMonth, setSelMonth] = useState(new Date().getMonth()); // 0-11
  const [selYear, setSelYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (goalToEdit) {
      setTimeout(() => {
        const date = new Date(goalToEdit.startDate);
        setName(goalToEdit.name);
        setTargetAmount(goalToEdit.targetAmount.toString());
        setDurationMonths(goalToEdit.durationMonths.toString());
        setSelMonth(date.getMonth());
        setSelYear(date.getFullYear());
      }, 0);
    } else {
      setTimeout(() => {
        setName('');
        setTargetAmount('');
        setDurationMonths('');
        const now = new Date();
        setSelMonth(now.getMonth());
        setSelYear(now.getFullYear());
      }, 0);
    }
  }, [goalToEdit, isOpen]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 2 + i); // From 2 years ago to 8 years in future

  // Removed early return

  const handleSave = () => {
    if (!name || !targetAmount || !durationMonths) {
      alert('Preencha os campos obrigatórios.');
      return;
    }
    
    const start = new Date(selYear, selMonth, 1);

    if (goalToEdit) {
      const newGoals = data.goals.map(g => {
        if (g.id === goalToEdit.id) {
          const newEndDate = addMonths(start, parseInt(durationMonths)).toISOString();
          return { 
            ...g, 
            name, 
            targetAmount: parseFloat(targetAmount), 
            durationMonths: parseInt(durationMonths),
            startDate: start.toISOString(),
            endDate: newEndDate 
          };
        }
        return g;
      });
      setData({ ...data, goals: newGoals });
    } else {
      const end = addMonths(start, parseInt(durationMonths));

      const newGoal: Goal = {
        id: generateId(),
        name,
        targetAmount: parseFloat(targetAmount),
        durationMonths: parseInt(durationMonths),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        progress: [],
      };
      setData({ ...data, goals: [...data.goals, newGoal] });
    }

    onClose();
  };

  const handleDelete = () => {
    if (goalToEdit) {
      const newGoals = data.goals.filter(g => g.id !== goalToEdit.id);
      setData({ ...data, goals: newGoals });
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
            <Trophy size={24} className={styles.accentIcon} />
            <h2>{goalToEdit ? 'Editar Meta' : 'Nova Meta'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.body}>
          <div className={styles.inputGroup}>
            <label>Nome da Meta (Ex: Carro Novo)</label>
            <input 
              type="text" 
              placeholder="Digite o nome..." 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Valor Desejado</label>
            <input 
              type="number" 
              placeholder="R$ 0,00" 
              value={targetAmount} 
              onChange={e => setTargetAmount(e.target.value)} 
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Duração (Meses)</label>
            <input 
              type="number" 
              placeholder="Ex: 12" 
              value={durationMonths} 
              onChange={e => setDurationMonths(e.target.value)} 
            />
          </div>
          <div className={styles.inputGroup}>
            <label>Mês de Início</label>
            <div className={styles.dateSelectorRow}>
              <select 
                value={selMonth} 
                onChange={e => setSelMonth(parseInt(e.target.value))}
                className={styles.monthSelect}
              >
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select 
                value={selYear} 
                onChange={e => setSelYear(parseInt(e.target.value))}
                className={styles.yearSelect}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          {goalToEdit ? (
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
