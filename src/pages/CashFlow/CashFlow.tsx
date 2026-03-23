import { useState } from 'react';
import { ChevronLeft, ChevronRight, CreditCard, ChevronUp, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useFinance } from '../../context/FinanceContext';
import { TransactionModal } from '../../components/domain/TransactionModal';
import { TransactionActionModal } from '../../components/domain/TransactionActionModal';
import { FilterModal, type FilterOptions, defaultFilters } from '../../components/domain/FilterModal';
import { Filter, X } from 'lucide-react';
import type { Transaction, FaturaCartao } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { listItemVariants } from '../../styles/motion';
import styles from './CashFlow.module.css';

type UnifiedListItem = Transaction | (FaturaCartao & { isFatura: true });

export function CashFlow() {
  const { data, currentMonth, setCurrentMonth } = useFinance();
  const navigate = useNavigate();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedActionTransaction, setSelectedActionTransaction] = useState<Transaction | null>(null);
  const [isFooterExpanded, setIsFooterExpanded] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>(defaultFilters);

  const hasActiveFilters = 
    activeFilters.context !== 'all' || 
    activeFilters.type !== 'all' || 
    activeFilters.status !== 'all' || 
    activeFilters.categoryId !== null ||
    activeFilters.personId !== null ||
    activeFilters.cardId !== null;

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  // Normal wallet transactions for the month
  const walletTransactions = data.transactions.filter(t => {
    // Ignore direct card transactions (they go to the invoice) AND ignore invoice payments to avoid double counting
    if (t.cartaoId || t.isInvoicePayment) return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
  });

  // Credit card invoices for the month
  const currentMonthFaturas = (data.faturas || []).filter(
    f => f.referenciaAno === currentMonth.getFullYear() && f.referenciaMes === currentMonth.getMonth()
  );

  const paidIncomesMonth = walletTransactions
    .filter(t => t.type === 'income' && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingIncomesMonth = walletTransactions
    .filter(t => t.type === 'income' && t.status === 'pending')
    .reduce((acc, t) => acc + t.amount, 0);

  // Despesas pagas (do mês + faturas)
  const monthlyPaidExpenses = walletTransactions
    .filter(t => t.type === 'expense' && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);
  const paidInvoiceExpenses = currentMonthFaturas.filter(f => f.status === 'paga').reduce((acc, f) => acc + f.valorTotal, 0);
  const totalPaidExpenses = monthlyPaidExpenses + paidInvoiceExpenses;

  // Prev. Despesas (Pagas + pendentes + faturas)
  const predictedExpensesMonth = walletTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0)
    + currentMonthFaturas.reduce((acc, f) => acc + f.valorTotal, 0);

  // Saldo Atual = soma de TODAS as receitas recebidas - TODAS as despesas pagas - TODAS as faturas pagas (global, todos os meses)
  const allPaidIncomes = data.transactions
    .filter(t => !t.cartaoId && !t.isInvoicePayment && t.type === 'income' && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);
  const allPaidExpenses = data.transactions
    .filter(t => !t.cartaoId && !t.isInvoicePayment && t.type === 'expense' && t.status === 'paid')
    .reduce((acc, t) => acc + t.amount, 0);
  const allPaidInvoices = (data.faturas || [])
    .filter(f => f.status === 'paga')
    .reduce((acc, f) => acc + f.valorTotal, 0);
  const currentBalance = allPaidIncomes - allPaidExpenses - allPaidInvoices;

  // Prev. Receitas
  const predictedIncomesMonth = paidIncomesMonth + pendingIncomesMonth;

  const pendingExpensesMonth = walletTransactions
    .filter(t => t.type === 'expense' && t.status === 'pending')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const pendingFaturasMonth = currentMonthFaturas
    .filter(f => f.status !== 'paga')
    .reduce((acc, f) => acc + f.valorTotal, 0);

  // Prev. Saldo (Saldo real acumulado + Receitas pendentes do mês - Despesas e faturas pendentes do mês)
  const predictedBalance = currentBalance + pendingIncomesMonth - pendingExpensesMonth - pendingFaturasMonth;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Helper: compute the REAL due date for an invoice based on the card's CURRENT dueDay setting
  const getFaturaDueDate = (f: FaturaCartao): string => {
    const card = data.cards.find(c => c.id === f.cartaoId);
    if (!card) return f.dataVencimento; // fallback
    let dueMonth = f.referenciaMes;
    let dueYear = f.referenciaAno;
    if (card.dueDay <= card.closingDay) {
      dueMonth += 1;
      if (dueMonth > 11) { dueMonth = 0; dueYear += 1; }
    }
    return new Date(dueYear, dueMonth, card.dueDay, 23, 59, 59).toISOString();
  };

  // Unified List combining wallet transactions and invoices
  const unifiedList: UnifiedListItem[] = [
    ...walletTransactions,
    ...currentMonthFaturas.map(f => ({ ...f, isFatura: true as const }))
  ].sort((a, b) => {
    const dateA = new Date('isFatura' in a ? getFaturaDueDate(a) : a.date).getTime();
    const dateB = new Date('isFatura' in b ? getFaturaDueDate(b) : b.date).getTime();
    return dateA - dateB;
  });

  const filteredList = unifiedList.filter(item => {
    const isFatura = 'isFatura' in item;
    
    // 1. Context Filter
    if (activeFilters.context === 'lancamentos' && isFatura) return false;
    if (activeFilters.context === 'faturas' && !isFatura) return false;

    // 2. Type Filter (Only applies to 'lancamentos' and 'all')
    const itemType = isFatura ? 'expense' : item.type;
    if (activeFilters.context !== 'faturas') {
      if (activeFilters.type !== 'all') {
        if (isFatura) return false; 
        if (!isFatura && itemType !== activeFilters.type) return false;
      }
    }

    // 3. Status Filter
    const isPaid = isFatura ? item.status === 'paga' : item.status === 'paid';
    if (activeFilters.status === 'paid' && !isPaid) return false;
    if (activeFilters.status === 'pending' && isPaid) return false;

    // 4. Category Filter
    if (activeFilters.categoryId !== null) {
       if (isFatura) return false;
       if (!isFatura && item.categoryId !== activeFilters.categoryId) return false;
    }

    // 5. Person Filter
    if (activeFilters.personId !== null) {
       if (isFatura) return false;
       if (!isFatura && item.personId !== activeFilters.personId) return false;
    }

    // 6. Card Filter
    if (activeFilters.cardId !== null) {
       if (!isFatura) return false;
       if (isFatura && item.cartaoId !== activeFilters.cardId) return false;
    }

    return true;
  });

  // Group by date
  const grouped: Record<string, UnifiedListItem[]> = {};
  filteredList.forEach(item => {
    const rawDate = 'isFatura' in item ? getFaturaDueDate(item) : item.date;
    const dateKey = format(new Date(rawDate), 'yyyy-MM-dd');
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.monthNav} onClick={handlePrevMonth}>
          <ChevronLeft size={24} />
        </button>
        <h2 className={styles.monthTitle}>
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button className={styles.monthNav} onClick={handleNextMonth}>
          <ChevronRight size={24} />
        </button>
      </header>

      <div className={styles.actionBar}>
        {hasActiveFilters && (
          <button 
            className={styles.clearFilterBtn} 
            onClick={() => setActiveFilters(defaultFilters)}
            aria-label="Limpar Filtros"
            title="Limpar Filtros"
          >
            <X size={16} />
          </button>
        )}
        <button 
          className={`${styles.filterBtn} ${hasActiveFilters ? styles.filterBtnActive : ''}`} 
          onClick={() => setIsFilterOpen(true)}
        >
          <Filter size={16} />
          {hasActiveFilters ? 'Filtros Ativos' : 'Filtrar'}
        </button>
      </div>

      <div className={styles.transactionsList}>
        <AnimatePresence mode="popLayout">
          {filteredList.length === 0 ? (
            <motion.div 
              key="empty"
              variants={listItemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={styles.emptyState}
            >
              Nenhum lançamento neste mês.
            </motion.div>
          ) : (
            Object.entries(grouped).map(([dateKey, items]) => (
              <motion.div layout="position" key={dateKey} className={styles.dateGroup}>
              <div className={styles.dateDivider}>
                <span className={styles.dateLabel}>
                  {dateKey === today 
                    ? 'Hoje' 
                    : format(new Date(dateKey + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
              {items.map(item => {
                if ('isFatura' in item) {
                  const card = data.cards.find(c => c.id === item.cartaoId);
                  const isPaid = item.status === 'paga';
                  // Get card color
                  const catColor = card?.color || '#8A05BE';
                  
                  let statusText = isPaid ? 'pago' : 'pendente';
                  let statusColorStyle: React.CSSProperties | undefined = undefined;
                  
                  if (!isPaid) {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const dueDate = new Date(getFaturaDueDate(item));
                    dueDate.setHours(0,0,0,0);
                    
                    const diffTime = dueDate.getTime() - today.getTime();
                    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays < 0) {
                      statusText = 'atrasado';
                      statusColorStyle = { color: 'var(--color-primary-red)', fontWeight: 600 };
                    } else if (diffDays <= 5) {
                      statusText = 'próx. vencimento';
                    }
                  }

                  return (
                    <motion.div 
                      layout
                      variants={listItemVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      key={item.id} 
                      className={styles.transactionCard}
                      onClick={() => navigate(`/cards/${item.cartaoId}/invoice`, { state: { month: currentMonth.toISOString() } })}
                    >
                      <div style={{ width: 14, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                        <CreditCard size={18} color={catColor} />
                      </div>
                      <div className={styles.tDetails}>
                        <p className={styles.tDesc}>Fatura {card?.name || 'Cartão'}</p>
                        <p className={styles.tMeta}>Cartão de Crédito</p>
                      </div>
                      <div className={styles.tAmountGroup}>
                        <p className={styles.tAmountNeg}>
                          -{formatCurrency(item.valorTotal)}
                        </p>
                        <p className={`${styles.tStatus} ${!isPaid ? styles.tStatusPending : ''}`} style={statusColorStyle}>
                          {statusText}
                        </p>
                      </div>
                    </motion.div>
                  );
                }

                // Normal transaction
                const category = data.categories.find(c => c.id === item.categoryId);
                const catColor = category?.color || '#555';
                const isPaid = item.status === 'paid';
                return (
                  <motion.div 
                    layout
                    variants={listItemVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    key={item.id} 
                    className={styles.transactionCard}
                    onClick={() => setSelectedActionTransaction(item)}
                  >
                    <div className={styles.tDot} style={{ backgroundColor: catColor }} />
                    <div className={styles.tDetails}>
                      <p className={styles.tDesc}>{item.description}</p>
                      <p className={styles.tMeta}>{category?.name || 'Sem categoria'} • Carteira</p>
                    </div>
                    <div className={styles.tAmountGroup}>
                      <p className={item.type === 'income' ? styles.tAmountPos : styles.tAmountNeg}>
                        {item.type === 'expense' ? '- ' : ''}{formatCurrency(item.amount)}
                      </p>
                      <p className={`${styles.tStatus} ${!isPaid ? styles.tStatusPending : ''}`}>
                        {item.type === 'income' ? (isPaid ? 'recebido' : 'pendente') : (isPaid ? 'pago' : 'pendente')}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {createPortal(
        <motion.div 
          className={styles.summaryFooter} 
          style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '20px' }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        >
          
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-20px' }}>
            <button 
              onClick={() => setIsFooterExpanded(!isFooterExpanded)}
              style={{ 
                background: 'var(--color-surface)', 
                border: '1px solid var(--color-border)', 
                borderRadius: '50%', 
                width: 28, height: 28, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                zIndex: 10
              }}
            >
              {isFooterExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '480px', margin: '0 auto', width: '100%' }}>
            <div className={styles.summaryCard} style={{ padding: '8px 4px', alignItems: 'center', textAlign: 'center' }}>
              <span className={styles.summaryLabel} style={{ fontSize: '10px' }}>Despesas</span>
              <span className={styles.summaryValueNeg} style={{ fontSize: '14px' }}>{formatCurrency(totalPaidExpenses)}</span>
            </div>
            <div className={styles.summaryCard} style={{ padding: '8px 4px', alignItems: 'center', textAlign: 'center' }}>
              <span className={styles.summaryLabel} style={{ fontSize: '10px' }}>Receitas</span>
              <span className={styles.summaryValuePos} style={{ fontSize: '14px' }}>{formatCurrency(paidIncomesMonth)}</span>
            </div>
            <div className={styles.summaryCard} style={{ padding: '8px 4px', alignItems: 'center', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.15)' }}>
              <span className={styles.summaryLabel} style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '10px' }}>Saldo Atual</span>
              <span className={styles.summaryValue} style={{ fontSize: '16px' }}>{formatCurrency(currentBalance)}</span>
            </div>
          </div>

          <div style={{ 
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: '480px', margin: '0 auto', width: '100%',
            overflow: 'hidden',
            transition: 'all 0.3s ease-in-out',
            maxHeight: isFooterExpanded ? '100px' : '0px',
            opacity: isFooterExpanded ? 1 : 0,
            marginTop: isFooterExpanded ? '0px' : '-12px'
          }}>
            <div className={styles.summaryCard} style={{ padding: '8px 4px', alignItems: 'center', textAlign: 'center' }}>
              <span className={styles.summaryLabel} style={{ fontSize: '9px' }}>Prev. Desp</span>
              <span className={styles.summaryValueMuted} style={{ fontSize: '13px' }}>{formatCurrency(predictedExpensesMonth)}</span>
            </div>
            <div className={styles.summaryCard} style={{ padding: '8px 4px', alignItems: 'center', textAlign: 'center' }}>
              <span className={styles.summaryLabel} style={{ fontSize: '9px' }}>Prev. Rec</span>
              <span className={styles.summaryValueMuted} style={{ fontSize: '13px' }}>{formatCurrency(predictedIncomesMonth)}</span>
            </div>
            <div className={styles.summaryCard} style={{ padding: '8px 4px', alignItems: 'center', textAlign: 'center' }}>
              <span className={styles.summaryLabel} style={{ fontSize: '9px' }}>Prev. Saldo</span>
              <span className={styles.summaryValueMuted} style={{ fontSize: '13px' }}>{formatCurrency(predictedBalance)}</span>
            </div>
          </div>
        </motion.div>,
        document.body
      )}

      <TransactionActionModal
        isOpen={!!selectedActionTransaction}
        transaction={selectedActionTransaction}
        onClose={() => setSelectedActionTransaction(null)}
        onEdit={() => {
          setEditingTransaction(selectedActionTransaction);
          setSelectedActionTransaction(null);
        }}
      />
      <TransactionModal 
        isOpen={!!editingTransaction}
        type={editingTransaction?.type || null}
        editTransactionId={editingTransaction?.id}
        onClose={() => setEditingTransaction(null)}
      />

      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        currentFilters={activeFilters}
        onApply={setActiveFilters}
      />
    </div>
  );
}
