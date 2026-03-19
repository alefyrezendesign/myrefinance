import { useState, useEffect } from 'react';
import { CreditCard as CardIcon, Plus, ChevronRight, Edit3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import { CardModal } from '../../components/domain/CardModal';
import type { CreditCard } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { listItemVariants } from '../../styles/motion';
import styles from './Cards.module.css';

export function Cards() {
  const { data } = useFinance();
  const navigate = useNavigate();
  const location = useLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCard | undefined>(undefined);

  useEffect(() => {
    if (location.state?.openCreateModal) {
      setTimeout(() => {
        setSelectedCard(undefined);
        setIsModalOpen(true);
        navigate(location.pathname, { replace: true, state: {} });
      }, 0);
    }
  }, [location, navigate]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleAddCard = () => {
    setSelectedCard(undefined);
    setIsModalOpen(true);
  };

  const handleEditCard = (e: React.MouseEvent, card: CreditCard) => {
    e.stopPropagation();
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  return (
    <div className={styles.container}>
      <motion.header variants={listItemVariants} className={styles.header}>
        <h1 className={styles.title}>Meus Cartões</h1>
        <button className={styles.addButton} onClick={handleAddCard}>
          <Plus size={16} /> Novo
        </button>
      </motion.header>

      <div className={styles.cardsList}>
        <AnimatePresence mode="popLayout">
          {data.cards.length === 0 ? (
            <motion.div 
              key="empty"
              variants={listItemVariants} 
              initial="initial" animate="animate" exit="exit"
              className={styles.emptyState}
            >
              Nenhum cartão de crédito cadastrado.
            </motion.div>
          ) : (
          data.cards.map(card => {
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
              <motion.div 
                layout
                variants={listItemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                key={card.id} 
                className={styles.cardItem} 
                onClick={() => navigate(`/cards/${card.id}/invoice`)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <CardIcon size={20} style={{ color: card.color || '#8A05BE' }} />
                    <span>{card.name}</span>
                  </div>
                  <button 
                    className={styles.editButton} 
                    onClick={(e) => handleEditCard(e, card)}
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
                
                <div className={styles.cardDetails}>
                  <div className={styles.detailGroup}>
                    <span className={styles.label}>Limite Total</span>
                    <span className={styles.value}>{formatCurrency(card.limit)}</span>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.label}>Disponível</span>
                    <span className={styles.valueGreen}>{formatCurrency(availableLimit)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  <span>Fechamento <span style={{ color: 'var(--color-text-secondary)' }}>Dia {card.closingDay}</span></span>
                  <span>Vencimento <span style={{ color: 'var(--color-text-secondary)' }}>Dia {card.dueDay}</span></span>
                </div>

                <div className={styles.cardFooter}>
                  <span>Fatura atual: <strong>{formatCurrency(invoiceValue)}</strong></span>
                  <div className={styles.footerRight}>
                    <span>Ver fatura</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        </AnimatePresence>
      </div>

      <div className={styles.paddingBottom} />
      
      <CardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        cardToEdit={selectedCard} 
      />
    </div>
  );
}
