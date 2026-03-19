import { useFinance } from '../../context/FinanceContext';
import { Target } from 'lucide-react';
import styles from './LimitsSummary.module.css';
import { useNavigate } from 'react-router-dom';

export function LimitsSummary() {
  const { data, currentMonth: globalMonth } = useFinance();
  const navigate = useNavigate();

  if (data.limits.length === 0) {
    return (
      <div className={styles.emptyCard} onClick={() => navigate('/planning')}>
        <Target size={24} className={styles.emptyIcon} />
        <p>Nenhum limite configurado</p>
        <span className={styles.linkText}>Criar limite</span>
      </div>
    );
  }

  const currentMonth = globalMonth.getMonth();
  const currentYear = globalMonth.getFullYear();

  return (
    <div className={styles.container}>
      {data.limits.slice(0, 3).map(limit => {
        const category = data.categories.find(c => c.id === limit.categoryId);
        if (!category) return null;

        let spent = 0;

        // 1. Wallet transactions (conta_unica)
        const walletSpent = data.transactions
          .filter(t => !t.cartaoId && t.type === 'expense' && t.categoryId === category.id)
          .filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          })
          .reduce((sum, t) => sum + t.amount, 0);

        spent += walletSpent;

        // 2. Credit card installments (parcelas)
        const parcelasSpent = (data.parcelas || [])
          .filter(p => p.referenciaMes === currentMonth && p.referenciaAno === currentYear)
          .filter(p => {
            const originalTx = data.transactions.find(t => t.id === p.lancamentoId);
            return originalTx && originalTx.categoryId === category.id && originalTx.type === 'expense';
          })
          .reduce((sum, p) => sum + p.valorParcela, 0);

        spent += parcelasSpent;

        const progressPercent = Math.min((spent / limit.amount) * 100, 100);
        const isExceeded = spent > limit.amount;
        const remaining = limit.amount - spent;

        const formatCurrency = (val: number) => 
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

        return (
          <div key={limit.id} className={styles.limitCard} onClick={() => navigate('/planning')}>
            <div className={styles.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: category.color, display: 'inline-block', flexShrink: 0 }} />
                <span className={styles.categoryName}>{category.name}</span>
              </div>
            </div>
            
            <div className={styles.values}>
              <span className={isExceeded ? styles.spentExceeded : styles.spentText}>
                {formatCurrency(spent)}
              </span>
              <span className={styles.totalText}> / {formatCurrency(limit.amount)}</span>
            </div>

            <div className={styles.progressBarBg}>
              <div 
                className={isExceeded ? styles.progressBarDanger : styles.progressBarFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className={styles.footer}>
              {isExceeded ? (
                <span className={styles.exceededText}>Ultrapassou {formatCurrency(Math.abs(remaining))}</span>
              ) : (
                <span className={styles.remainingText}>Falta {formatCurrency(remaining)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
