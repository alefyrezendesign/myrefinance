import { useState } from 'react';
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, TrendingDown, Layers, Users, CreditCard, Sparkles, Activity, LineChart, Target, AlertTriangle, PieChart } from 'lucide-react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinance } from '../../context/FinanceContext';
import { useReportsData } from './useReportsData';
import styles from './Reports.module.css';

export function Reports() {
  const { data, currentMonth, setCurrentMonth } = useFinance();
  // Using an internal localMonth if we don't want to change the global month just by viewing reports,
  // but keeping it synced with global is better UX so it matches CashFlow
  const [localMonth, setLocalMonth] = useState(currentMonth);

  const handlePrevMonth = () => {
    setLocalMonth(prev => subMonths(prev, 1));
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setLocalMonth(prev => addMonths(prev, 1));
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const { current, previous, variations, insights, evolution, maxEvolutionValue } = useReportsData(data, localMonth);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const renderVariation = (value: number, invertColors = false) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    const isGood = invertColors ? !isPositive : isPositive;
    return (
      <div className={`${styles.variationBadge} ${isGood ? styles.varPositive : styles.varNegative}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.monthNav} onClick={handlePrevMonth}>
          <ChevronLeft size={24} />
        </button>
        <h2 className={styles.monthTitle}>
          {format(localMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button className={styles.monthNav} onClick={handleNextMonth}>
          <ChevronRight size={24} />
        </button>
      </header>

      <div className={styles.content}>
        {/* Evolução Financeira */}
        <div className={styles.section}>
          <div className={styles.sectionHeader} style={{ justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LineChart size={18} className="text-muted" />
              <span className={styles.sectionTitle}>Evolução Financeira</span>
            </div>
            <div className={styles.chartControls}>
              <button 
                className={styles.chartArrow}
                onClick={() => document.getElementById('evolution-scroll')?.scrollBy({ left: -150, behavior: 'smooth' })}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                className={styles.chartArrow}
                onClick={() => document.getElementById('evolution-scroll')?.scrollBy({ left: 150, behavior: 'smooth' })}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.evolutionChart}>
              <div id="evolution-scroll" className={styles.chartBars}>
                {evolution.map((point, i) => {
                  const incomeHeight = maxEvolutionValue > 0 ? (point.income / maxEvolutionValue) * 100 : 0;
                  const expenseHeight = maxEvolutionValue > 0 ? (point.expense / maxEvolutionValue) * 100 : 0;
                  return (
                    <div key={i} className={`${styles.chartCol} ${point.isCurrentSelected ? styles.chartColSelected : ''}`}>
                      <div className={styles.barWrapper}>
                        <div className={styles.barIncome} style={{ height: `${incomeHeight}%` }} />
                        <div className={styles.barExpense} style={{ height: `${expenseHeight}%` }} />
                      </div>
                      <span className={styles.chartLabel}>{point.monthLabel}</span>
                    </div>
                  );
                })}
              </div>
              <div className={styles.chartLegend}>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: 'var(--color-primary-green)' }} />
                  <span>Receitas</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: 'var(--color-primary-red)' }} />
                  <span>Despesas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <BarChart3 size={18} className={styles.iconBlue} />
            <span className={styles.sectionTitle}>Resumo do Mês</span>
          </div>
          
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Receitas</span>
              <div className={styles.summaryMain}>
                <span className={styles.summaryValuePos}>{formatCurrency(current.totalIncome)}</span>
                {renderVariation(variations.income)}
              </div>
              <span className={styles.summaryCompare}>vs {formatCurrency(previous.totalIncome)} no mês passado</span>
            </div>

            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Despesas</span>
              <div className={styles.summaryMain}>
                <span className={styles.summaryValueNeg}>{formatCurrency(current.totalExpense)}</span>
                {renderVariation(variations.expense, true)}
              </div>
              <span className={styles.summaryCompare}>vs {formatCurrency(previous.totalExpense)} no mês passado</span>
            </div>


          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Sparkles size={18} className={styles.iconBlue} />
              <span className={styles.sectionTitle}>Insights</span>
            </div>
            <div className={styles.insightsList}>
              {insights.map((insight, idx) => {
                const renderIcon = () => {
                   switch (insight.id) {
                     case 'biggest_expense': return <PieChart size={20} className="text-muted" />;
                     case 'expense_increase': return <AlertTriangle size={20} style={{ color: 'var(--color-primary-red)' }} />;
                     case 'expense_decrease': return <TrendingDown size={20} style={{ color: 'var(--color-primary-green)' }} />;
                     case 'card_warning': return <CreditCard size={20} style={{ color: 'var(--color-primary-red)' }} />;
                     case 'goals_success': return <Target size={20} style={{ color: 'var(--color-primary-green)' }} />;
                     case 'goals_missing': return <Target size={20} className="text-muted" />;
                     default: return <Sparkles size={20} className="text-muted" />;
                   }
                };
                return (
                  <div key={idx} className={styles.insightCard}>
                    <div className={styles.insightIconCircle}>
                      {renderIcon()}
                    </div>
                    <div className={styles.insightContent}>
                      <div className={styles.insightHeader}>
                        <span className={styles.insightTitle}>{insight.title}</span>
                        {insight.value && (
                          <span className={styles.insightValue} style={{ color: insight.valueColor || 'var(--color-text-primary)' }}>
                            {insight.value}
                          </span>
                        )}
                      </div>
                      <span className={styles.insightDesc}>{insight.description}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Despesas por Categoria */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Layers size={18} className="text-muted" />
            <span className={styles.sectionTitle}>Despesas por Categoria</span>
          </div>
          
          <div className={styles.card}>
            {current.expensesByCategory.length === 0 ? (
              <p className="text-muted text-sm text-center">Nenhuma despesa no período.</p>
            ) : (
              <div className={styles.rankingList}>
                {current.expensesByCategory.map(cat => {
                  const percentOfTotal = ((cat.total / current.totalExpense) * 100).toFixed(1);
                  const barWidth = `${(cat.total / current.maxExpenseCategory) * 100}%`;
                  
                  return (
                    <div key={cat.id} className={styles.rankingItem}>
                      <div className={styles.rankingHeader}>
                        <div className={styles.rankingName}>
                          <div className={styles.categoryDot} style={{ backgroundColor: cat.color }} />
                          <span>{cat.name}</span>
                        </div>
                        <div className={styles.rankingValues}>
                          <span className={styles.rankingAmount}>{formatCurrency(cat.total)}</span>
                        </div>
                      </div>
                      <div className={styles.rankingBarBg}>
                        <div 
                          className={styles.rankingBarFill} 
                          style={{ width: barWidth, backgroundColor: cat.color }} 
                        />
                      </div>
                      <div className={styles.rankingFooter}>
                        <span className={styles.rankingPercent}>{percentOfTotal}% do total de despesas</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Receitas por Categoria */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Layers size={18} className="text-muted" />
            <span className={styles.sectionTitle}>Receitas por Categoria</span>
          </div>
          
          <div className={styles.card}>
            {current.incomesByCategory.length === 0 ? (
              <p className="text-muted text-sm text-center">Nenhuma receita no período.</p>
            ) : (
              <div className={styles.rankingList}>
                {current.incomesByCategory.map(cat => {
                  const percentOfTotal = ((cat.total / current.totalIncome) * 100).toFixed(1);
                  const barWidth = `${(cat.total / current.maxIncomeCategory) * 100}%`;
                  
                  return (
                    <div key={cat.id} className={styles.rankingItem}>
                      <div className={styles.rankingHeader}>
                        <div className={styles.rankingName}>
                          <div className={styles.categoryDot} style={{ backgroundColor: cat.color }} />
                          <span>{cat.name}</span>
                        </div>
                        <div className={styles.rankingValues}>
                          <span className={styles.rankingAmount}>{formatCurrency(cat.total)}</span>
                        </div>
                      </div>
                      <div className={styles.rankingBarBg}>
                        <div 
                          className={styles.rankingBarFill} 
                          style={{ width: barWidth, backgroundColor: cat.color }} 
                        />
                      </div>
                      <div className={styles.rankingFooter}>
                        <span className={styles.rankingPercent}>{percentOfTotal}% do total de receitas</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Análise por Pessoa */}
        {current.personTotals.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Users size={18} className="text-muted" />
              <span className={styles.sectionTitle}>Análise por Pessoa</span>
            </div>
            <div className={styles.card}>
              <div className={styles.personGrid}>
                {current.personTotals.map(p => (
                  <div key={p.id} className={styles.personItem}>
                    <div className={styles.personHeader}>
                      <span className={styles.personName}>{p.name}</span>
                    </div>
                    <div className={styles.personStats}>
                      <div className={styles.personStatCol}>
                        <span className={styles.personStatLabel}>Recebeu</span>
                        <span className={styles.personStatValPos}>{formatCurrency(p.received)}</span>
                      </div>
                      <div className={styles.personStatCol}>
                        <span className={styles.personStatLabel}>Gastou</span>
                        <span className={styles.personStatValNeg}>{formatCurrency(p.spent)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Análise por Cartão */}
        {current.cardTotals.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <CreditCard size={18} className="text-muted" />
              <span className={styles.sectionTitle}>Uso de Cartão de Crédito</span>
            </div>
            <div className={styles.card}>
              <div className={styles.cardList}>
                {current.cardTotals.map(c => {
                  const usagePercent = Math.min((c.spent / c.limit) * 100, 100);
                  const isNearLimit = usagePercent > 80;
                  return (
                    <div key={c.id} className={styles.cardItem}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardName}>
                          <div className={styles.categoryDot} style={{ backgroundColor: c.color }} />
                          <span>{c.name}</span>
                        </div>
                        <span className={styles.cardAmount}>{formatCurrency(c.spent)}</span>
                      </div>
                      <div className={styles.cardBarBg}>
                        <div 
                          className={`${styles.cardBarFill} ${isNearLimit ? styles.cardBarFillWarn : ''}`}
                          style={{ width: `${usagePercent}%`, backgroundColor: isNearLimit ? 'var(--color-primary-red)' : c.color }} 
                        />
                      </div>
                      <div className={styles.cardFooter}>
                        <span className={styles.cardLimitText}>{usagePercent.toFixed(1)}% do limite de {formatCurrency(c.limit)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Limites de Orçamento */}
        {current.limitsTracking.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Activity size={18} className="text-muted" />
              <span className={styles.sectionTitle}>Limites de Orçamento</span>
            </div>
            <div className={styles.card}>
              <div className={styles.cardList}>
                {current.limitsTracking.map(limit => {
                  const usagePercent = Math.min((limit.spent / limit.limit) * 100, 100);
                  const isExceeded = usagePercent >= 100;
                  const isWarning = usagePercent >= 80 && !isExceeded;
                  let dotColor = limit.color;
                  if (isExceeded) dotColor = 'var(--color-primary-red)';
                  else if (isWarning) dotColor = 'var(--color-warning, #f5a623)';

                  return (
                    <div key={limit.id} className={styles.cardItem}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardName}>
                          <div className={styles.categoryDot} style={{ backgroundColor: limit.color }} />
                          <span>{limit.categoryName}</span>
                        </div>
                        <span className={isExceeded ? styles.rankingAmountExceeded : styles.cardAmount}>
                          {formatCurrency(limit.spent)}
                        </span>
                      </div>
                      <div className={styles.cardBarBg}>
                        <div 
                          className={`${styles.cardBarFill} ${isExceeded ? styles.cardBarFillExceeded : (isWarning ? styles.cardBarFillWarn : '')}`}
                          style={{ width: `${usagePercent}%`, backgroundColor: dotColor }} 
                        />
                      </div>
                      <div className={styles.cardFooter}>
                        <span className={styles.cardLimitText}>
                          {usagePercent.toFixed(1)}% do limite de {formatCurrency(limit.limit)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}



      </div>
    </div>
  );
}
