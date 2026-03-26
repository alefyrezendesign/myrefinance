import { useFinance } from '../../context/FinanceContext';
import { Target, CheckCircle2 } from 'lucide-react';
import styles from './GoalsSummary.module.css';
import { useNavigate } from 'react-router-dom';
import { generateGoalSchedule } from '../../utils/goalSchedule';
import { format, isBefore, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function GoalsSummary() {
  const { data, currentMonth } = useFinance();
  const navigate = useNavigate();

  if (data.goals.length === 0) {
    return (
      <div className={styles.emptyCard} onClick={() => navigate('/planning')}>
        <Target size={24} className={styles.emptyIcon} />
        <p>Nenhum objetivo configurado</p>
        <span className={styles.linkText}>Criar objetivo</span>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className={styles.container}>
      {data.goals.slice(0, 3).map(goal => {
        const totalSaved = goal.progress.reduce((sum, p) => sum + p.amountSaved, 0);
        const progressPercent = Math.min((totalSaved / goal.targetAmount) * 100, 100);
        
        const schedule = generateGoalSchedule(goal);
        const currentMonthKey = format(currentMonth, 'yyyy-MM');
        const currentMonthData = schedule.find(s => s.monthKey === currentMonthKey);

        return (
          <div key={goal.id} className={styles.goalCard} onClick={() => navigate(`/goals/${goal.id}`)} style={{ borderColor: `${goal.color || '#00E676'}33` }}>
            <div className={styles.header}>
              <span className={styles.goalName}>{goal.name}</span>
              <span className={styles.durationText} style={{ color: goal.color || undefined, backgroundColor: goal.color ? `${goal.color}1A` : undefined, borderColor: goal.color ? `${goal.color}33` : undefined }}>Prazo: {goal.durationMonths} meses</span>
            </div>
            
            <div className={styles.values}>
              <span className={styles.savedText} style={{ background: goal.color ? 'transparent' : undefined, color: goal.color || undefined }}>{formatCurrency(totalSaved)}</span>
              <span className={styles.totalText}> / {formatCurrency(goal.targetAmount)}</span>
            </div>

            <div className={styles.progressBarBg}>
              <div 
                className={styles.progressBarFill}
                style={{ width: `${progressPercent}%`, background: goal.color || undefined }}
              />
            </div>
            
            <div className={styles.footerWrapper}>
              <div className={styles.totalMissingRow}>
                {Math.max(0, goal.targetAmount - totalSaved) > 0 ? (
                  <span className={styles.totalMissingText}>Falta no total: <strong>{formatCurrency(Math.max(0, goal.targetAmount - totalSaved))}</strong></span>
                ) : (
                  <span className={styles.totalMissingText} style={{ color: 'var(--color-primary-green)' }}>Meta atingida!</span>
                )}
                <span className={styles.percentText} style={{ color: goal.color || undefined }}>{progressPercent.toFixed(0)}% concluído</span>
              </div>
              
              <div className={styles.monthStatusBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className={styles.monthStatusLabel}>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                  {currentMonthData?.status === 'paid' && <span className={styles.monthStatusSuccess} style={{marginTop: 0, fontSize: '11px', color: goal.color || undefined}}><CheckCircle2 size={12}/> Concluído</span>}
                  {currentMonthData?.status === 'pending' && currentMonthData.paidAmount > 0 && <span className={styles.monthStatusMuted} style={{marginTop: 0, fontSize: '11px'}}>Em Andamento</span>}
                  {currentMonthData?.status === 'skipped' && <span className={styles.monthStatusMuted} style={{marginTop: 0, fontSize: '11px'}}>Mês Pulado</span>}
                </div>
                
                {currentMonthData ? (
                  <div className={styles.monthDataGrid}>
                    <div className={styles.monthCol}>
                      <span className={styles.monthColLabel}>Meta do mês</span>
                      <span className={styles.monthColValue}>{formatCurrency(currentMonthData.expectedAmount)}</span>
                    </div>
                    <div className={styles.monthCol}>
                      <span className={styles.monthColLabel}>Já guardado</span>
                      <span className={styles.monthColValueSuccess} style={{ color: goal.color || undefined }}>{formatCurrency(currentMonthData.paidAmount)}</span>
                    </div>
                    <div className={styles.monthCol}>
                      {currentMonthData.status === 'skipped' ? (
                         <>
                           <span className={styles.monthColLabel}>Adiado</span>
                           <span className={styles.monthColValueMuted}>{formatCurrency(currentMonthData.expectedAmount - currentMonthData.paidAmount)}</span>
                         </>
                      ) : (
                         <>
                           <span className={styles.monthColLabel}>Faltam</span>
                           {currentMonthData.expectedAmount - currentMonthData.paidAmount > 0 ? (
                             <span className={styles.monthColValueDanger}>{formatCurrency(currentMonthData.expectedAmount - currentMonthData.paidAmount)}</span>
                           ) : (
                             <span className={styles.monthColValueSuccess} style={{ color: goal.color || undefined }}>R$ 0,00</span>
                           )}
                         </>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {!currentMonthData && isBefore(currentMonth, startOfMonth(new Date(goal.startDate))) && (
                       <div className={styles.monthStatusMuted}>Ainda não iniciado</div>
                    )}
                    {!currentMonthData && !isBefore(currentMonth, startOfMonth(new Date(goal.startDate))) && (
                       <div className={styles.monthStatusMuted}>Fora do prazo</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
