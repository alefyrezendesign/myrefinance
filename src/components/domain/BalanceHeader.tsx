import { Eye, EyeOff, ArrowUpCircle, ArrowDownCircle, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinance } from '../../context/FinanceContext';
import { AdjustBalanceModal } from './AdjustBalanceModal';
import styles from './BalanceHeader.module.css';

export function BalanceHeader() {
  const { data, currentMonth, setCurrentMonth } = useFinance();
  const [showBalance, setShowBalance] = useState(true);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  
  const monthTransactions = data.transactions.filter(t => t.date.startsWith(currentMonthStr));
  
  // Receita: apenas do mês selecionado COM STATUS RECEBIDO 
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income' && !t.cartaoId && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);
  
  // Despesa do mês: despesas normais pagas + faturas pagas (sem duplicar pagamento da fatura)
  const normalExpenses = monthTransactions
    .filter(t => t.type === 'expense' && !t.cartaoId && !t.description.startsWith('Fatura ') && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthFaturas = (data.faturas || [])
    .filter(f => f.referenciaAno === currentMonth.getFullYear() && f.referenciaMes === currentMonth.getMonth() && f.status === 'paga')
    .reduce((acc, f) => acc + f.valorTotal, 0);

  const totalExpense = normalExpenses + monthFaturas;

  // Saldo Atual: Fixo e permanente (todas as transações realizadas, independente do mês)
  const computedBalance = data.transactions
    .filter(t => !t.cartaoId && t.status === 'paid')
    .reduce((acc, t) => {
      if (t.type === 'income') return acc + t.amount;
      if (t.type === 'expense') return acc - t.amount;
      return acc;
    }, 0);

  const hidden = '•••••';

  return (
    <div className={styles.container}>
      {/* Saldo Atual */}
      <div className={styles.balanceSection}>
        <div className={styles.monthSelector}>
          <button className={styles.monthNav} onClick={handlePrevMonth}>
            <ChevronLeft size={20} />
          </button>
          <span className={styles.monthName}>
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button className={styles.monthNav} onClick={handleNextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>

        <span className={styles.label}>Saldo atual</span>
        <div className={styles.balanceRow}>
          <h1 className={styles.balance}>
            {showBalance ? formatCurrency(computedBalance) : `R$ ${hidden}`}
          </h1>
          <button 
            className={styles.eyeButton} 
            onClick={() => setShowBalance(!showBalance)}
            aria-label={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
          >
            {showBalance ? <Eye size={22} /> : <EyeOff size={22} />}
          </button>
        </div>
        <button className={styles.adjustButton} onClick={() => setIsAdjustModalOpen(true)}>
          <Plus size={14} /> Ajustar saldo
        </button>
      </div>

      {/* Receitas / Despesas do mês */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIconIncome}>
            <ArrowUpCircle size={22} />
          </div>
          <div className={styles.summaryInfo}>
            <span className={styles.summaryLabel}>Receitas</span>
            <span className={styles.summaryValueIncome}>
              {showBalance ? formatCurrency(totalIncome) : `R$ ${hidden}`}
            </span>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIconExpense}>
            <ArrowDownCircle size={22} />
          </div>
          <div className={styles.summaryInfo}>
            <span className={styles.summaryLabel}>Despesas</span>
            <span className={styles.summaryValueExpense}>
              {showBalance ? formatCurrency(totalExpense) : `R$ ${hidden}`}
            </span>
          </div>
        </div>
      </div>

      <AdjustBalanceModal 
        isOpen={isAdjustModalOpen} 
        onClose={() => setIsAdjustModalOpen(false)} 
      />
    </div>
  );
}
