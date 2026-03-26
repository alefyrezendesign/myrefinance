import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft, CheckCircle, CreditCard } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinance } from '../../context/FinanceContext';
import { TransactionModal } from '../../components/domain/TransactionModal';
import { TransactionActionModal } from '../../components/domain/TransactionActionModal';
import { PayInvoiceModal } from '../../components/domain/PayInvoiceModal';
import type { Transaction } from '../../types';
import styles from './Invoice.module.css';

export function Invoice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, payInvoice, unpayInvoice } = useFinance();
  
  const [currentMonth, setCurrentMonth] = useState(() => {
    return location.state?.month ? new Date(location.state.month) : new Date();
  });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedActionTransaction, setSelectedActionTransaction] = useState<Transaction | null>(null);
  const [isPayInvoiceModalOpen, setIsPayInvoiceModalOpen] = useState(false);

  const card = data.cards.find(c => c.id === id);

  if (!card) {
    return <div className={styles.emptyState}>Cartão não encontrado!</div>;
  }

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const currentYear = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();

  const fatura = (data.faturas || []).find(
    f => f.cartaoId === card.id && f.referenciaAno === currentYear && f.referenciaMes === monthIndex
  );

  const invoiceParcelas = (data.parcelas || []).filter(
    p => p.cartaoId === card.id && p.referenciaAno === currentYear && p.referenciaMes === monthIndex
  );

  const invoiceTotal = fatura ? fatura.valorTotal : 0;
  const paid = fatura ? fatura.status === 'paga' : false;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getInvoiceStatus = () => {
    if (paid) return { text: 'Pago', color: 'var(--color-primary-green)' };
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Compute closing date for this invoice month
    const closingDate = new Date(currentYear, monthIndex, card.closingDay);
    closingDate.setHours(0,0,0,0);

    // Compute due date from card's current dueDay
    let dueMonth = monthIndex;
    let dueYear = currentYear;
    if (card.dueDay <= card.closingDay) {
      dueMonth += 1;
      if (dueMonth > 11) { dueMonth = 0; dueYear += 1; }
    }
    const dueDate = new Date(dueYear, dueMonth, card.dueDay);
    dueDate.setHours(0,0,0,0);

    // After due date → Atrasado ONLY if there's an unpaid fatura with value
    if (today > dueDate) {
      if (fatura && fatura.valorTotal > 0) {
        return { text: 'Atrasado', color: 'var(--color-primary-red)' };
      }
      return { text: 'Fechado', color: '#FFB300' };
    }

    // After closing date but before/on due date → Fechado
    if (today >= closingDate) {
      return { text: 'Fechado', color: '#FFB300' };
    }

    // Before closing date → Aberto
    return { text: 'Aberto', color: 'var(--color-text-primary)' };
  };
  
  const statusLabel = getInvoiceStatus();

  const handlePayInvoice = () => {
    if (invoiceTotal <= 0 || !fatura) {
      alert('A fatura não possui valor a pagar.');
      return;
    }
    if (paid) {
      alert('Esta fatura já foi paga.');
      return;
    }
    
    setIsPayInvoiceModalOpen(true);
  };

  const handleUnpayInvoice = () => {
    if (!paid || !fatura) return;
    if (window.confirm(`Desfazer o pagamento desta fatura? O valor de ${formatCurrency(invoiceTotal)} retornará ao saldo atual.`)) {
      unpayInvoice(fatura.id);
    }
  };

  const usedTotal = (data.faturas || [])
    .filter(f => f.cartaoId === card.id && f.status !== 'paga')
    .reduce((acc, f) => acc + f.valorTotal, 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className={styles.titleIconBadge} style={{ borderLeftColor: card.color, borderLeftWidth: '3px' }}>
            <CreditCard size={14} color={card.color} />
          </div>
          Fatura: {card.name}
        </h1>
        <div style={{ width: 24 }} />
      </header>

      <div className={styles.monthSelector}>
        <button className={styles.monthNav} onClick={handlePrevMonth}>
          <ChevronLeft size={24} />
        </button>
        <div className={styles.monthInfo}>
          <span className={styles.monthName}>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
        </div>
        <button className={styles.monthNav} onClick={handleNextMonth}>
          <ChevronRight size={24} />
        </button>
      </div>

      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', margin: '0 0 12px',
        background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-light)', fontSize: '13px'
      }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
          Fechamento <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Dia {card.closingDay}</span>
          <span style={{ margin: '0 6px', opacity: 0.4 }}>•</span>
          Vencimento <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>Dia {card.dueDay}</span>
        </span>
        <span style={{ 
          color: statusLabel.color, fontWeight: 600, fontSize: '12px',
          padding: '3px 10px', borderRadius: '12px',
          backgroundColor: statusLabel.text === 'Pago' ? 'rgba(0,200,83,0.12)' 
            : statusLabel.text === 'Fechado' ? 'rgba(255,179,0,0.12)' 
            : statusLabel.text === 'Atrasado' ? 'rgba(255,82,82,0.12)'
            : 'rgba(255,255,255,0.06)'
        }}>
          {statusLabel.text}
        </span>
      </div>

      <div className={styles.invoiceSummary} style={{ borderColor: statusLabel.color }}>
        <p className={styles.summaryLabel}>Total da fatura</p>
        <h2 className={styles.summaryAmount} style={{ color: statusLabel.color }}>{formatCurrency(invoiceTotal)}</h2>
        <p className={styles.summarySub}>Disponível Geral: {formatCurrency(card.limit - usedTotal)}</p>
        
        {invoiceParcelas.length > 0 && (
          paid ? (
            <button
              onClick={handleUnpayInvoice}
              style={{ 
              marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, padding: '12px', background: 'rgba(0,200,83,0.15)', border: '1px solid rgba(0,200,83,0.4)',
              color: 'var(--color-primary-green)', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer'
            }}>
              <CheckCircle size={20} /> Fatura Paga (Toque para desfazer)
            </button>
          ) : (
            <button 
              onClick={handlePayInvoice}
              style={{ 
                marginTop: 16, width: '100%', padding: '12px', background: 'var(--color-primary-green)', 
                color: '#000', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer'
              }}
            >
              Pagar Fatura
            </button>
          )
        )}
      </div>

      <div className={styles.transactionsList}>
        {invoiceParcelas.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhuma despesa para esta fatura.
          </div>
        ) : (
          invoiceParcelas.map(p => {
            const t = data.transactions.find(tx => tx.id === p.lancamentoId);
            if (!t) return null;
            
            return (
              <div 
                key={p.id} 
                className={styles.transactionItem}
                onClick={() => setSelectedActionTransaction(t)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.tDate}>
                  <span>{format(new Date(t.date), 'dd')}</span>
                  <span>{format(new Date(t.date), 'MMM').toUpperCase()}</span>
                </div>
                <div className={styles.tDetails}>
                  <p className={styles.tDesc}>{t.description}</p>
                  <p className={styles.tInstallment} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: data.categories.find(c => c.id === t.categoryId)?.color || '#555', display: 'inline-block' }} />
                    {data.categories.find(c => c.id === t.categoryId)?.name || ''}
                  </p>
                  {t.parcelado && t.quantidadeParcelas && (
                    <p className={styles.tInstallment}>Parcela {p.numeroParcela}/{p.totalParcelas}</p>
                  )}
                </div>
                <div className={styles.tAmount}>
                  {formatCurrency(p.valorParcela)}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <TransactionActionModal 
        isOpen={!!selectedActionTransaction}
        transaction={selectedActionTransaction}
        onClose={() => setSelectedActionTransaction(null)}
        onEdit={() => {
          setEditingTransaction(selectedActionTransaction);
          setSelectedActionTransaction(null);
        }}
        hideStatusToggle={true}
      />
      <TransactionModal 
        isOpen={!!editingTransaction}
        type={editingTransaction?.type || null}
        editTransactionId={editingTransaction?.id}
        onClose={() => setEditingTransaction(null)}
      />
      <PayInvoiceModal
        isOpen={isPayInvoiceModalOpen}
        onClose={() => setIsPayInvoiceModalOpen(false)}
        onConfirm={() => {
          if (fatura) payInvoice(fatura.id);
        }}
        invoiceTotal={invoiceTotal}
      />
    </div>
  );
}
