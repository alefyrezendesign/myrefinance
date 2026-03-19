import { format, addMonths } from 'date-fns';
import type { Goal } from '../types';

export interface GoalScheduleItem {
  // Logic updated to force pending if underpaid
  monthKey: string; // 'yyyy-MM'
  status: 'paid' | 'skipped' | 'pending';
  expectedAmount: number;
  paidAmount: number;
  skipType?: 'rollover' | 'extend';
}

export function generateGoalSchedule(goal: Goal): GoalScheduleItem[] {
  const schedule: GoalScheduleItem[] = [];
  const baseMonthly = goal.targetAmount / goal.durationMonths;
  let currentMonth = new Date(goal.startDate);
  
  let rolloverDebt = 0;
  const extendDebts: number[] = [];
  
  let totalMonths = goal.durationMonths;
  
  // We will loop through the original duration + any extended months
  let i = 0;
  while (i < totalMonths) {
    const monthKey = format(currentMonth, 'yyyy-MM');
    const existingProgress = goal.progress.find(p => p.month === monthKey);
    
    const isExtensionMonth = i >= goal.durationMonths;
    let expectedThisMonth = 0;
    
    if (isExtensionMonth) {
      const extIndex = i - goal.durationMonths;
      expectedThisMonth = (extendDebts[extIndex] || 0) + rolloverDebt;
    } else {
      expectedThisMonth = baseMonthly + rolloverDebt;
    }

    // Reset rollover for this iteration since we've already added it to expectedThisMonth
    rolloverDebt = 0; 
    
    let paidAmount = 0;
    let status: 'paid' | 'skipped' | 'pending' = 'pending';
    let skipType: 'rollover' | 'extend' | undefined;

    if (existingProgress) {
      paidAmount = existingProgress.amountSaved;
      status = existingProgress.status;
      skipType = existingProgress.skipType;

      // DEFENSIVE CHECK: If it's marked as paid but doesn't hit the target, 
      // treat it as pending so the user can finish it. (Handling float precision with 0.01)
      if (status === 'paid' && paidAmount < (expectedThisMonth - 0.01)) {
          status = 'pending';
      }

      if (status === 'skipped') {
        const remaining = Math.max(0, expectedThisMonth - paidAmount);
        if (skipType === 'extend') {
          extendDebts.push(remaining);
          totalMonths++; // Increase loop limit
        } else {
          // Default to rollover
          rolloverDebt = remaining;
        }
      }
    }

    schedule.push({
      monthKey,
      status,
      expectedAmount: expectedThisMonth,
      paidAmount,
      skipType
    });
    
    currentMonth = addMonths(currentMonth, 1);
    i++;
  }
  
  return schedule;
}
