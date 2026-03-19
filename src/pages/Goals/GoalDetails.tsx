import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFinance } from '../../context/FinanceContext';
import { generateGoalSchedule } from '../../utils/goalSchedule';
import { format, isFuture, isPast, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, CheckCircle2, Target, Calendar, PiggyBank, Clock, FastForward, SkipForward, Pencil } from 'lucide-react';
import styles from './GoalDetails.module.css';

export function GoalDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, addGoalProgress, setGoalProgress, skipGoalMonth } = useFinance();

  const goal = data.goals.find(g => g.id === id);

  const [activeDepositMonth, setActiveDepositMonth] = useState<string | null>(null);
  const [activeSkipMonth, setActiveSkipMonth] = useState<string | null>(null);
  const [activeEditMonth, setActiveEditMonth] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [editAmount, setEditAmount] = useState('');

  const schedule = useMemo(() => {
    if (!goal) return [];
    return generateGoalSchedule(goal);
  }, [goal]);

  if (!goal) {
    return (
      <div className={styles.container}>
        <div className={styles.notFoundCard}>
          <p>Objetivo não encontrado.</p>
          <button className={styles.backBtn} onClick={() => navigate('/planning')}>
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleMaskCurrency = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, '');
    const numberValue = Number(onlyNumbers) / 100;
    setDepositAmount(numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  const parseCurrency = (value: string) => {
    return Number(value.replace(/\./g, '').replace(',', '.'));
  };

  const handleDepositSubmit = (monthKey: string, expectedAmount: number, currentPaidAmount: number) => {
    const amount = parseCurrency(depositAmount);
    if (amount > 0) {
      const isFullyPaid = (currentPaidAmount + amount) >= expectedAmount;
      addGoalProgress(goal.id, monthKey, amount, isFullyPaid);
      setActiveDepositMonth(null);
      setDepositAmount('');
    }
  };

  const handleSkipSubmit = (monthKey: string, skipType: 'rollover' | 'extend') => {
    skipGoalMonth(goal.id, monthKey, skipType);
    setActiveSkipMonth(null);
  };

  const totalSaved = goal.progress.reduce((sum, p) => sum + p.amountSaved, 0);
  const percent = Math.min((totalSaved / goal.targetAmount) * 100, 100);
  const baseMonthly = goal.targetAmount / goal.durationMonths;
  const startMonthDate = new Date(goal.startDate);
  const now = new Date();

  const isGoalStarted = isPast(startMonthDate) || isSameMonth(now, startMonthDate);

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={() => navigate('/planning')}>
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* PREMIUM HEADER */}
      <div className={styles.headerPremium}>
        <div className={styles.headerTop}>
          <div className={styles.titleWrapper}>
            <div className={styles.titleIcon}>
              <Target size={28} />
            </div>
            <div className={styles.titleContent}>
              <h1>{goal.name}</h1>
              {!isGoalStarted && <span className={styles.badgeWaitingHeader}>Aguardando Início</span>}
            </div>
          </div>
          <div className={styles.progressCircleContainer}>
            <div className={styles.progressPercentage}>
              <span className={styles.percentValue}>{percent.toFixed(1)}</span>
              <span className={styles.percentSymbol}>%</span>
            </div>
            <span className={styles.progressLabel}>Concluído</span>
          </div>
        </div>

        <div className={styles.progressTrackContainer}>
          <div className={styles.progressLabelsRow}>
            <span className={styles.progressLabelLeft}>Progresso Total</span>
            <span className={styles.progressLabelRight}>Meta: {formatCurrency(goal.targetAmount)}</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${percent}%` }} />
          </div>
        </div>
        
        <div className={styles.statsPremiumGrid}>
          <div className={styles.statPrimaryBox}>
            <div className={styles.statIconWrapper}>
              <PiggyBank size={18} />
            </div>
            <div className={styles.statPrimaryContent}>
              <span className={styles.statLabel}>Valor Acumulado</span>
              <span className={styles.statValueAccumulated}>{formatCurrency(totalSaved)}</span>
            </div>
          </div>

          {(goal.targetAmount - totalSaved) > 0 && (
            <>
              <div className={styles.statDivider} />
              
              <div className={styles.statPrimaryBox}>
                <div className={styles.statIconWrapper} style={{ color: 'var(--color-primary-red)', background: 'rgba(255, 82, 82, 0.1)' }}>
                  <Target size={18} />
                </div>
                <div className={styles.statPrimaryContent}>
                  <span className={styles.statLabel}>Faltam</span>
                  <span className={styles.statValueMissing}>{formatCurrency(goal.targetAmount - totalSaved)}</span>
                </div>
              </div>
            </>
          )}

        </div>

        <div className={styles.metaInfoBand}>
          <div className={styles.metaItem}>
            <Calendar size={14} />
            <span>Mês de Início: {format(startMonthDate, 'MMM/yyyy', { locale: ptBR })}</span>
          </div>
          <div className={styles.metaItem}>
            <Clock size={14} />
            <span>Duração: {goal.durationMonths} meses</span>
          </div>
          <div className={styles.metaItem}>
            <Target size={14} />
            <span>Base Mensal: {formatCurrency(baseMonthly)}</span>
          </div>
        </div>
      </div>
      
      <div className={styles.sectionTitle}>
        <h2>Cronograma</h2>
        <p>Acompanhe e gerencie os depósitos mensais planejados.</p>
      </div>

      <div className={styles.timeline}>
        {schedule.map((item, index) => {
          const [year, month] = item.monthKey.split('-');
          const monthDate = new Date(parseInt(year), parseInt(month) - 1);
          const isFutureMonth = isFuture(monthDate) && !isSameMonth(now, monthDate);
          const isUnstartedTimeline = !isGoalStarted && isFutureMonth;
          
          return (
            <div key={`${item.monthKey}-${index}`} className={styles.monthCardWrapper}>
              <div className={`${styles.monthCard} ${activeDepositMonth === item.monthKey || activeSkipMonth === item.monthKey ? styles.monthCardActive : ''}`}>
                
                {/* Visual side indicator for status */}
                <div className={`${styles.statusIndicator} ${
                   item.status === 'paid' && item.paidAmount >= (item.expectedAmount - 0.01) ? styles.indicatorPaid :
                   item.status === 'skipped' ? styles.indicatorSkipped :
                   isSameMonth(now, monthDate) ? styles.indicatorCurrent :
                   item.status === 'pending' && item.paidAmount > 0 ? styles.indicatorProgress :
                   styles.indicatorWaiting
                }`} />

                <div className={styles.monthContent}>
                  <div className={styles.monthHeaderRow}>
                    <div className={styles.monthNameContainer}>
                      <span className={styles.monthNameText}>{format(monthDate, 'MMMM', { locale: ptBR })}</span>
                      <span className={styles.monthYearText}>{format(monthDate, 'yyyy')}</span>
                    </div>
                    
                    <div className={styles.statusBadgeArea}>
                      {item.status === 'paid' && item.paidAmount >= (item.expectedAmount - 0.01) && (
                        <div className={styles.badgePaid}><CheckCircle2 size={14} /> Mês Concluído</div>
                      )}
                      {item.status === 'skipped' && (
                        <div className={styles.badgeSkipped}>
                          {item.skipType === 'extend' ? <><FastForward size={14} /> Pulado p/ o fim</> : <><SkipForward size={14} /> Pulado p/ próx.</>}
                        </div>
                      )}
                      
                      {item.status === 'pending' && (
                        <>
                          {isUnstartedTimeline ? (
                            <span className={styles.badgeWaiting}>Aguardando</span>
                          ) : (
                            <>
                              {isSameMonth(now, monthDate) && (
                                <span className={styles.badgeCurrent}>Mês Atual</span>
                              )}
                              {item.paidAmount > 0 && (
                                <span className={styles.badgeProgress}>Em Andamento</span>
                              )}
                              {!isSameMonth(now, monthDate) && item.paidAmount === 0 && (
                                <span className={styles.badgeWaiting}>Aguardando</span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.monthDataGrid}>
                    <div className={styles.dataBlock}>
                      <span className={styles.dataBlockLabel}>Meta do Mês</span>
                      <span className={styles.dataBlockValueBase}>{formatCurrency(item.expectedAmount)}</span>
                    </div>
                    <div className={styles.dataBlock}>
                      <span className={styles.dataBlockLabel}>Já Guardado</span>
                      <div className={styles.dataBlockValueWrapper}>
                        <span className={`${styles.dataBlockValueSaved} ${item.paidAmount > 0 ? styles.valueActive : ''}`}>
                          {formatCurrency(item.paidAmount)}
                        </span>
                        {(item.paidAmount > 0 || item.status === 'paid' || item.status === 'skipped') && activeEditMonth !== item.monthKey && activeDepositMonth !== item.monthKey && activeSkipMonth !== item.monthKey && (
                          <button 
                            className={styles.inlineEditBtn} 
                            title="Corrigir valor guardado"
                            onClick={(e) => {
                               e.stopPropagation();
                               setActiveEditMonth(item.monthKey);
                               setEditAmount(item.paidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            }}>
                            <Pencil size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {item.status === 'pending' && (item.expectedAmount - item.paidAmount) > 0 && !isUnstartedTimeline ? (
                      <div className={styles.dataBlock}>
                        <span className={styles.dataBlockLabel}>Faltam</span>
                        <span className={styles.dataBlockValueMissing}>{formatCurrency(item.expectedAmount - item.paidAmount)}</span>
                      </div>
                    ) : (
                      <div className={styles.dataBlockPlaceholder} />
                    )}
                  </div>

                  {item.status === 'pending' && !isUnstartedTimeline && activeDepositMonth !== item.monthKey && activeSkipMonth !== item.monthKey && activeEditMonth !== item.monthKey && (
                    <div className={styles.cardActionsRow}>
                      <button 
                        className={styles.actionBtnSkip} 
                        onClick={() => setActiveSkipMonth(item.monthKey)}>
                        Pular Mês
                      </button>
                      <button 
                        className={styles.actionBtnPrimary} 
                        onClick={() => {
                          setActiveDepositMonth(item.monthKey);
                          setDepositAmount(Math.max(0, item.expectedAmount - item.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                        }}>
                        Adicionar Valor
                      </button>
                    </div>
                  )}

                  {activeDepositMonth === item.monthKey && (
                    <div className={styles.inlineActionArea}>
                      <div className={styles.inlineFormHeader}>
                        <span>Adicionando valor a {format(monthDate, 'MMMM/yy', { locale: ptBR })}</span>
                      </div>
                      <div className={styles.inlineDepositForm}>
                        <div className={styles.inputWrapper}>
                          <span className={styles.currencySymbol}>R$</span>
                          <input 
                            type="text" 
                            className={styles.inlineAmountInput} 
                            value={depositAmount} 
                            onChange={e => handleMaskCurrency(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className={styles.inlineFormActions}>
                          <button className={styles.inlineBtnCancel} onClick={() => setActiveDepositMonth(null)}>
                            Cancelar
                          </button>
                          <button className={styles.inlineBtnConfirm} onClick={() => handleDepositSubmit(item.monthKey, item.expectedAmount, item.paidAmount)}>
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeEditMonth === item.monthKey && (
                    <div className={styles.inlineActionArea}>
                      <div className={styles.inlineFormHeader}>
                        <span>Corrigir valor de {format(monthDate, 'MMMM/yy', { locale: ptBR })}</span>
                      </div>
                      <div className={styles.inlineDepositForm}>
                        <div className={styles.inputWrapper}>
                          <span className={styles.currencySymbol}>R$</span>
                          <input 
                            type="text" 
                            className={styles.inlineAmountInput} 
                            value={editAmount} 
                            onChange={e => {
                               const v = e.target.value.replace(/\D/g, '');
                               const num = parseInt(v, 10);
                               if (isNaN(num)) { setEditAmount(''); return; }
                               setEditAmount((num / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                            }}
                            autoFocus
                          />
                        </div>
                        <div className={styles.inlineFormActions}>
                          <button className={styles.inlineBtnCancel} onClick={() => setActiveEditMonth(null)}>
                            Cancelar
                          </button>
                          <button className={styles.inlineBtnConfirm} onClick={() => {
                            const amt = parseFloat(editAmount.replace(/\./g, '').replace(',', '.'));
                            if (!isNaN(amt)) {
                              const isFullyPaid = amt >= item.expectedAmount;
                              setGoalProgress(goal.id, item.monthKey, amt, isFullyPaid);
                              setActiveEditMonth(null);
                              setEditAmount('');
                            }
                          }}>
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSkipMonth === item.monthKey && (
                    <div className={styles.inlineActionArea}>
                      <div className={styles.inlineFormHeader}>
                        <span>Opções para pular {format(monthDate, 'MMMM/yy', { locale: ptBR })}</span>
                      </div>
                      <div className={styles.inlineSkipForm}>
                        <button className={styles.skipChoiceBtn} onClick={() => handleSkipSubmit(item.monthKey, 'rollover')}>
                          <div className={styles.skipChoiceIcon}><SkipForward size={18} /></div>
                          <div className={styles.skipChoiceText}>
                            <strong>Jogar para o mês seguinte</strong>
                            <p>O valor será somado à meta do próximo mês.</p>
                          </div>
                        </button>
                        <button className={styles.skipChoiceBtn} onClick={() => handleSkipSubmit(item.monthKey, 'extend')}>
                          <div className={styles.skipChoiceIcon}><FastForward size={18} /></div>
                          <div className={styles.skipChoiceText}>
                            <strong>Adicionar ao fim do cronograma</strong>
                            <p>Aumenta a duração do objetivo em 1 mês.</p>
                          </div>
                        </button>
                        <button className={styles.inlineBtnCancelFull} onClick={() => setActiveSkipMonth(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
