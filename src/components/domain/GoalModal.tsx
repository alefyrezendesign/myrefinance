import { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { generateId } from '../../utils/generateId';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
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
  const { refreshData } = useFinance();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [durationMonths, setDurationMonths] = useState('');
  const [selMonth, setSelMonth] = useState(new Date().getMonth());
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [color, setColor] = useState('#00D26A');

  const goalColors = [
    '#00D26A', '#00BFFF', '#FF6B6B', '#FFD93D',
    '#A78BFA', '#FF8C42', '#00E5CC', '#FF63B8',
  ];

  useEffect(() => {
    if (goalToEdit) {
      setTimeout(() => {
        const date = new Date(goalToEdit.startDate);
        setName(goalToEdit.name);
        setTargetAmount(goalToEdit.targetAmount.toString());
        setDurationMonths(goalToEdit.durationMonths.toString());
        setSelMonth(date.getMonth());
        setSelYear(date.getFullYear());
        setColor(goalToEdit.color || '#00D26A');
      }, 0);
    } else {
      setTimeout(() => {
        setName('');
        setTargetAmount('');
        setDurationMonths('');
        setColor('#00D26A');
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

  const handleSave = async () => {
    if (!user) return;
    if (!name || !targetAmount || !durationMonths) {
      alert('Preencha os campos obrigatórios.');
      return;
    }
    
    const start = new Date(selYear, selMonth, 1);

    if (goalToEdit) {
      const newEndDate = addMonths(start, parseInt(durationMonths)).toISOString();
      await supabase.from('goals').update({
        name, 
        targetAmount: parseFloat(targetAmount), 
        durationMonths: parseInt(durationMonths),
        startDate: start.toISOString(),
        endDate: newEndDate,
        color
      }).eq('id', goalToEdit.id);
      await refreshData();
    } else {
      const end = addMonths(start, parseInt(durationMonths));

      const newGoal = {
        id: generateId(),
        userId: user.id,
        name,
        targetAmount: parseFloat(targetAmount),
        durationMonths: parseInt(durationMonths),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        progress: [],
        color,
      };
      await supabase.from('goals').insert(newGoal);
      await refreshData();
    }

    onClose();
  };

  const handleDelete = async () => {
    if (goalToEdit) {
      await supabase.from('goals').delete().eq('id', goalToEdit.id);
      await refreshData();
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

          <div className={styles.inputGroup}>
            <label>Cor do Objetivo</label>
            <div className={styles.colorPicker}>
              {goalColors.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorSwatch} ${color === c ? styles.colorSwatchSelected : ''}`}
                  style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px var(--color-background), 0 0 0 4px ${c}` : 'none' }}
                  onClick={() => setColor(c)}
                />
              ))}
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
