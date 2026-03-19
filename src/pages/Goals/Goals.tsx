import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import { Target, Plus, Edit2 } from 'lucide-react';
import { GoalModal } from '../../components/domain/GoalModal';
import type { Goal } from '../../types';
import styles from './Goals.module.css';

export function Goals() {
  const { data } = useFinance();
  const navigate = useNavigate();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Meus Objetivos</h2>
        <button className={styles.newBtn} onClick={() => setIsGoalModalOpen(true)}>
          <Plus size={16} /> Nova
        </button>
      </div>

      <div className={styles.list}>
        {data.goals?.map(goal => {
          const totalSaved = goal.progress.reduce((acc, p) => acc + p.amountSaved, 0);
          const percent = goal.targetAmount > 0 ? (totalSaved / goal.targetAmount) * 100 : 0;
          
          return (
            <div key={goal.id} className={styles.card} onClick={() => navigate(`/goals/${goal.id}`)}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <Target size={20} className={styles.icon} />
                  <h3>{goal.name}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingGoal(goal); }} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '4px' }}
                  >
                    <Edit2 size={16} />
                  </button>
                  <span className={styles.percent}>{percent.toFixed(0)}%</span>
                </div>
              </div>
              
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
                <div className={styles.amounts}>
                  <span className={styles.saved}>Guardado: <strong>{formatCurrency(totalSaved)}</strong></span>
                  <span className={styles.target}>{formatCurrency(goal.targetAmount)}</span>
                </div>
                {Math.max(0, goal.targetAmount - totalSaved) > 0 && (
                  <div className={styles.missingTotalRow}>
                    <span className={styles.missingTotalLabel}>Falta para a meta:</span>
                    <span className={styles.missingTotalValue}>{formatCurrency(Math.max(0, goal.targetAmount - totalSaved))}</span>
                  </div>
                )}
              </div>
              
              <div className={styles.cardFooter}>
                <div className={styles.footerInfo}>
                  <p>Duração: {goal.durationMonths} meses</p>
                  <p className={styles.suggestion}>Meta mensal: {formatCurrency(goal.targetAmount / goal.durationMonths)}</p>
                </div>
                <button 
                  className={styles.addBtn}
                  onClick={(e) => { e.stopPropagation(); navigate(`/goals/${goal.id}`); }}
                >
                  Ver objetivo
                </button>
              </div>
            </div>
          );
        })}
        {(!data.goals || data.goals.length === 0) && (
          <div className={styles.emptyState}>Nenhum objetivo criado ainda.</div>
        )}
      </div>

      <GoalModal 
        isOpen={isGoalModalOpen || !!editingGoal} 
        onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }}
        goalToEdit={editingGoal || undefined}
      />
    </div>
  );
}
