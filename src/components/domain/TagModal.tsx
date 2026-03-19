import { useState, useEffect } from 'react';
import { X, User as UserIcon } from 'lucide-react';
import { generateId } from '../../utils/generateId';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Person } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';
import styles from './CategoryModal.module.css';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  tagToEdit?: Person; 
}

export function TagModal({ isOpen, onClose, tagToEdit }: TagModalProps) {
  const { refreshData } = useFinance();
  const { user } = useAuth();
  const [name, setName] = useState('');

  useEffect(() => {
    if (tagToEdit) {
      setTimeout(() => {
        setName(tagToEdit.name);
      }, 0);
    } else {
      setTimeout(() => {
        setName('');
      }, 0);
    }
  }, [tagToEdit, isOpen]);

  // Removed early return

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      alert('Nome da pessoa/tag é obrigatório.');
      return;
    }

    if (tagToEdit) {
      await supabase.from('people').update({ name }).eq('id', tagToEdit.id);
      await refreshData();
    } else {
      const newPerson = {
        id: generateId(),
        userId: user.id,
        name,
      };
      await supabase.from('people').insert(newPerson);
      await refreshData();
    }

    onClose();
  };

  const handleDelete = async () => {
    if (tagToEdit) {
      await supabase.from('people').delete().eq('id', tagToEdit.id);
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
            <UserIcon size={24} className={styles.accentIcon} />
            <h2>{tagToEdit ? 'Editar Pessoa/Tag' : 'Nova Pessoa/Tag'}</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.body}>
          <div className={styles.inputGroup}>
            <label>Nome</label>
            <input 
              type="text" 
              placeholder="Ex: Alefy, Medley..." 
              value={name} 
              onChange={e => setName(e.target.value)} 
            />
          </div>
        </div>

        <div className={styles.footer}>
          {tagToEdit ? (
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
