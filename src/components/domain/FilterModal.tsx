import { useState, useEffect, useMemo } from 'react';
import { X, Filter, Wallet, CreditCard } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';
import styles from './FilterModal.module.css';

export type FilterOptions = {
  context: 'all' | 'lancamentos' | 'faturas';
  type: 'all' | 'income' | 'expense';
  status: 'all' | 'paid' | 'pending';
  categoryId: string | null;
  personId: string | null;
  cardId: string | null;
};

export const defaultFilters: FilterOptions = {
  context: 'all',
  type: 'all',
  status: 'all',
  categoryId: null,
  personId: null,
  cardId: null,
};

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: FilterOptions;
  onApply: (filters: FilterOptions) => void;
}

export function FilterModal({ isOpen, onClose, currentFilters, onApply }: FilterModalProps) {
  const { data, currentMonth } = useFinance();
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  useEffect(() => {
    if (isOpen) {
      setFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  // Derived data based on currentMonth and progressively applied filters
  const derivations = useMemo(() => {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();

    // 1. Lançamentos do mês (excluindo faturas diretas)
    const walletTx = data.transactions.filter(t => {
      if (t.cartaoId || t.isInvoicePayment) return false;
      const d = new Date(t.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    // 2. Faturas do mês
    const faturas = (data.faturas || []).filter(
      f => f.referenciaAno === year && f.referenciaMes === month
    );

    // Available cards that actually have invoices this month
    const cardIdsWithInvoices = new Set(faturas.map(f => f.cartaoId));
    const availableCards = data.cards.filter(c => cardIdsWithInvoices.has(c.id));

    // Available categories and persons for walletTx
    const categoryCounts: Record<string, number> = {};
    const personsCounts: Record<string, number> = {};

    walletTx.forEach(t => {
      // Respect 'type' filter
      if (filters.type !== 'all' && t.type !== filters.type) return;
      
      categoryCounts[t.categoryId] = (categoryCounts[t.categoryId] || 0) + 1;
      
      // Respect 'categoryId' filter when counting persons
      if (filters.categoryId && t.categoryId !== filters.categoryId) return;
      
      if (t.personId) {
        personsCounts[t.personId] = (personsCounts[t.personId] || 0) + 1;
      }
    });

    const availableCategories = data.categories
      .filter(c => categoryCounts[c.id] > 0)
      .map(c => ({ ...c, count: categoryCounts[c.id] }))
      .sort((a, b) => b.count - a.count);

    const availablePersons = data.people
      .filter(p => personsCounts[p.id] > 0)
      .map(p => ({ ...p, count: personsCounts[p.id] }))
      .sort((a, b) => b.count - a.count);

    return { availableCards, availableCategories, availablePersons };
  }, [data, currentMonth, filters.type, filters.categoryId]);

  // Removed early return

  // Handlers to clear incompatible downstream filters
  const handleContextChange = (ctx: 'all' | 'lancamentos' | 'faturas') => {
    setFilters(prev => ({
      ...prev,
      context: ctx,
      // Clear dependent fields
      cardId: null,
      type: 'all',
      categoryId: null,
      personId: null
    }));
  };

  const handleTypeChange = (t: 'all' | 'income' | 'expense') => {
    setFilters(prev => ({
      ...prev,
      type: t,
      categoryId: null, // Clear category and person because the available pool changed
      personId: null
    }));
  };

  const handleCategoryChange = (catId: string | null) => {
    setFilters(prev => ({
      ...prev,
      categoryId: catId,
      personId: null // Clear person because available pool changes
    }));
  };

  const handleContextToggle = (ctx: 'lancamentos' | 'faturas') => {
    if (filters.context === ctx) {
      handleContextChange('all');
    } else {
      handleContextChange(ctx);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className={styles.overlay} 
          onClick={onClose}
          variants={modalOverlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div 
            className={styles.modal} 
            onClick={e => e.stopPropagation()}
            variants={bottomSheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <Filter size={24} className={styles.icon} />
            <h2>Filtro Inteligente</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.body}>
          
          {/* STEP 1: Contexto Principal */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>Mostrar em tela</span>
            <div className={styles.pillsRow}>
              <button
                className={`${styles.pill} ${filters.context === 'lancamentos' ? styles.pillActive : ''}`}
                onClick={() => handleContextToggle('lancamentos')}
              >
                <Wallet size={16} style={{ color: filters.context === 'lancamentos' ? 'inherit' : 'var(--color-text-muted)' }} /> 
                Apenas Lançamentos
              </button>
              <button
                className={`${styles.pill} ${filters.context === 'faturas' ? styles.pillActive : ''}`}
                onClick={() => handleContextToggle('faturas')}
              >
                <CreditCard size={16} style={{ color: filters.context === 'faturas' ? 'inherit' : 'var(--color-text-muted)' }} /> 
                Apenas Faturas
              </button>
            </div>
          </div>

          {/* STEP 2A: Se Faturas */}
          {filters.context === 'faturas' && (
            <div className={styles.progressiveBlock}>
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Cartões com fatura neste mês</span>
                <div className={styles.pillsRow}>
                  <button
                    className={`${styles.pill} ${filters.cardId === null ? styles.pillActive : ''}`}
                    onClick={() => setFilters({ ...filters, cardId: null })}
                  >
                    Todos os cartões
                  </button>
                  {derivations.availableCards.map(c => (
                    <button
                      key={c.id}
                      className={`${styles.pill} ${filters.cardId === c.id ? styles.pillActive : ''}`}
                      onClick={() => setFilters({ ...filters, cardId: c.id })}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c.color, display: 'inline-block', marginRight: 6 }} />
                      {c.name}
                    </button>
                  ))}
                  {derivations.availableCards.length === 0 && (
                    <span className={styles.emptyText}>Nenhum cartão usado neste mês.</span>
                  )}
                </div>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionTitle}>Status da Fatura</span>
                <div className={styles.pillsRow}>
                  {(['all', 'paid', 'pending'] as const).map(status => (
                    <button
                      key={status}
                      className={`${styles.pill} ${filters.status === status ? styles.pillActive : ''}`}
                      onClick={() => setFilters({ ...filters, status })}
                    >
                      {status === 'all' ? 'Todas' : status === 'paid' ? 'Pagas' : 'Pendentes'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2B: Se Lançamentos */}
          {filters.context === 'lancamentos' && (
            <div className={styles.progressiveBlock}>
              <div className={styles.section}>
                <span className={styles.sectionTitle}>Tipo de Lançamento</span>
                <div className={styles.pillsRow}>
                  {(['all', 'income', 'expense'] as const).map(type => (
                    <button
                      key={type}
                      className={`${styles.pill} ${filters.type === type ? styles.pillActive : ''}`}
                      onClick={() => handleTypeChange(type)}
                    >
                      {type === 'all' ? 'Todos' : type === 'income' ? 'Receitas' : 'Despesas'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <span className={styles.sectionTitle}>Categorias Utilizadas</span>
                <div className={styles.pillsRow}>
                  <button
                    className={`${styles.pill} ${filters.categoryId === null ? styles.pillActive : ''}`}
                    onClick={() => handleCategoryChange(null)}
                  >
                    Todas
                  </button>
                  {derivations.availableCategories.map(cat => (
                    <button
                      key={cat.id}
                      className={`${styles.pill} ${filters.categoryId === cat.id ? styles.pillActive : ''}`}
                      onClick={() => handleCategoryChange(cat.id)}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cat.color, display: 'inline-block', marginRight: 6 }} />
                      {cat.name} <span className={styles.countBadge}>({cat.count})</span>
                    </button>
                  ))}
                  {derivations.availableCategories.length === 0 && (
                    <span className={styles.emptyText}>Nenhuma categoria registrada nesse filtro.</span>
                  )}
                </div>
              </div>

              {derivations.availablePersons.length > 0 && (
                <div className={styles.section}>
                  <span className={styles.sectionTitle}>Vínculo de Pessoa</span>
                  <div className={styles.pillsRow}>
                    <button
                      className={`${styles.pill} ${filters.personId === null ? styles.pillActive : ''}`}
                      onClick={() => setFilters({ ...filters, personId: null })}
                    >
                      Qualquer pessoa
                    </button>
                    {derivations.availablePersons.map(p => (
                      <button
                        key={p.id}
                        className={`${styles.pill} ${filters.personId === p.id ? styles.pillActive : ''}`}
                        onClick={() => setFilters({ ...filters, personId: p.id })}
                      >
                        {p.name} <span className={styles.countBadge}>({p.count})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button 
            className={styles.btnClear} 
            onClick={() => setFilters(defaultFilters)}
          >
            Limpar tudo
          </button>
          <button 
            className={styles.btnApply} 
            onClick={() => {
              onApply(filters);
              onClose();
            }}
          >
            Aplicar Filtros
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
