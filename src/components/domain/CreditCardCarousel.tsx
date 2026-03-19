import { CreditCard as CardIcon, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import styles from './CreditCardCarousel.module.css';

export function CreditCardCarousel() {
  const { data } = useFinance();
  const navigate = useNavigate();
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.carouselHeader}>
        <button className={styles.manageButton} onClick={() => navigate('/cards')}>
          Gerenciar Cartões
        </button>
      </div>
      {data.cards.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}><CardIcon size={32} /></div>
          <p>Nenhum cartão cadastrado</p>
          <button className={styles.addButton} onClick={() => navigate('/cards', { state: { openCreateModal: true } })}>
            <Plus size={16} /> Adicionar Cartão
          </button>
        </div>
      ) : (
        <div className={styles.cardsList}>
          {data.cards.map(card => {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();

            const currentInvoice = (data.faturas || []).find(
              f => f.cartaoId === card.id && f.referenciaAno === currentYear && f.referenciaMes === currentMonth
            );
            const invoiceValue = currentInvoice ? currentInvoice.valorTotal : 0;
            
            const usedLimit = (data.faturas || [])
              .filter(f => f.cartaoId === card.id && f.status !== 'paga')
              .reduce((acc, f) => acc + f.valorTotal, 0);

            const availableLimit = card.limit - usedLimit;

            return (
              <div 
                key={card.id} 
                className={styles.card} 
                onClick={() => navigate(`/cards/${card.id}/invoice`)}
                role="button"
                tabIndex={0}
              >
                <div className={styles.cardHeader} style={{ justifyContent: 'space-between' }}>
                  <div className={styles.cardTitle}>
                    <div className={styles.iconWrapper}>
                      <CardIcon size={16} style={{ color: card.color || '#8A05BE' }} />
                    </div>
                    <span>{card.name}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontSize: '11px' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Fechamento  <span style={{ color: 'var(--color-text-secondary)' }}>Dia {card.closingDay}</span></span>
                    <span style={{ color: 'var(--color-text-muted)' }}>Vencimento  <span style={{ color: 'var(--color-text-secondary)' }}>Dia {card.dueDay}</span></span>
                  </div>
                </div>
                
                <div className={styles.cardContent}>
                  <div className={styles.invoiceSection}>
                    <p className={styles.cardLabel}>Fatura Atual</p>
                    <p className={styles.invoiceAmount}>{formatCurrency(invoiceValue)}</p>
                  </div>
                  
                  <div className={styles.limitsSection}>
                    <div className={styles.limitRow}>
                      <span className={styles.limitLabel}>Disponível</span>
                      <span className={styles.limitValueAvailable}>{formatCurrency(availableLimit)}</span>
                    </div>
                    <div className={styles.limitRow}>
                      <span className={styles.limitLabel}>Total</span>
                      <span className={styles.limitValueTotal}>{formatCurrency(card.limit)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div className={styles.addCardButtonHorizontal} onClick={() => navigate('/cards', { state: { openCreateModal: true } })}>
            <Plus size={18} />
            <span>Adicionar novo cartão</span>
          </div>
        </div>
      )}
    </div>
  );
}
