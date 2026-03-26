import { useState } from 'react';
import { AlertCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinance } from '../../context/FinanceContext';
import { LimitModal } from '../../components/domain/LimitModal';
import type { BudgetLimit } from '../../types';
import styles from './Limits.module.css';

export function Limits() {
  const { data, currentMonth: selectedMonth, setCurrentMonth: setSelectedMonth } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState<BudgetLimit | undefined>(undefined);

  const handlePrevMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));

  const handleAddLimit = () => {
    setSelectedLimit(undefined);
    setIsModalOpen(true);
  };

  const handleEditLimit = (limit: BudgetLimit) => {
    setSelectedLimit(limit);
    setIsModalOpen(true);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const calculateSpent = (categoryId: string) => {
    const currentMonthNum = selectedMonth.getMonth();
    const currentYearNum = selectedMonth.getFullYear();
    
    let totalSpent = 0;

    // 1. Wallet transactions (conta_unica)
    const walletSpent = data.transactions
      .filter(t => !t.cartaoId && t.type === 'expense' && t.categoryId === categoryId)
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonthNum && d.getFullYear() === currentYearNum;
      })
      .reduce((acc, t) => acc + t.amount, 0);

    totalSpent += walletSpent;

    // 2. Credit card installments (parcelas)
    const parcelasSpent = (data.parcelas || [])
      .filter(p => p.referenciaMes === currentMonthNum && p.referenciaAno === currentYearNum)
      .filter(p => {
        const originalTx = data.transactions.find(t => t.id === p.lancamentoId);
        return originalTx && originalTx.categoryId === categoryId && originalTx.type === 'expense';
      })
      .reduce((acc, p) => acc + p.valorParcela, 0);

    totalSpent += parcelasSpent;

    return totalSpent;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Limites de Gastos</h2>
        <button className={styles.newBtn} onClick={handleAddLimit}>
          <Plus size={16} /> Novo
        </button>
      </div>

      <div className={styles.monthNavContainer}>
        <button className={styles.monthNavBtn} onClick={handlePrevMonth}>
          <ChevronLeft size={20} />
        </button>
        <span className={styles.monthLabel}>
          {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button className={styles.monthNavBtn} onClick={handleNextMonth}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className={styles.list}>
        {data.limits.map(limit => {
          const spent = calculateSpent(limit.categoryId);
          const rawPercentage = limit.amount > 0 ? (spent / limit.amount) * 100 : 0;
          const percentage = Math.min(rawPercentage, 100);
          const isExceeded = spent > limit.amount;
          const isNearLimit = !isExceeded && rawPercentage >= 80;
          const hasWarning = isExceeded || isNearLimit;
          const category = data.categories.find(c => c.id === limit.categoryId);

          return (
            <div 
              key={limit.id} 
              className={styles.card}
              onClick={() => handleEditLimit(limit)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: category?.color || '#555', display: 'inline-block' }} />
                  <h3>{category?.name || 'Desconhecida'}</h3>
                </div>
                <span className={styles.percent}>{percentage.toFixed(0)}%</span>
              </div>
              
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ 
                      width: `${percentage}%`,
                      background: category?.color || 'var(--color-primary-green)'
                    }} 
                  />
                </div>
                <div className={styles.amounts}>
                  <span className={styles.spent}>{formatCurrency(spent)}</span>
                  <span className={styles.target}>{formatCurrency(limit.amount)}</span>
                </div>
              </div>
              
              {hasWarning && (
                <div className={styles.cardFooter}>
                  <div className={styles.criticalWarning}>
                    <AlertCircle size={14} />
                    {isExceeded ? (
                      <span>Ultrapassou {formatCurrency(spent - limit.amount)}</span>
                    ) : (
                      <span>Atenção: Você está próximo do limite estipulado!</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {data.limits.length === 0 && (
          <div className={styles.emptyState}>Nenhum limite configurado ainda.</div>
        )}
      </div>

      <LimitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        limitToEdit={selectedLimit}
      />
    </div>
  );
}
