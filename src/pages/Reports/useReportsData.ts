import { useMemo } from 'react';
import { subMonths, addMonths } from 'date-fns';
import type { FinanceData } from '../../types';

export function useReportsData(data: FinanceData, targetMonth: Date) {
  return useMemo(() => {
    const getMonthData = (date: Date) => {
      const month = date.getMonth();
      const year = date.getFullYear();

      // Wallet transactions (excluding credit card transactions and invoice payments)
      const walletTransactions = data.transactions.filter(t => {
        if (t.cartaoId || t.isInvoicePayment) return false;
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
      });

      // Credit card invoices for the month
      const faturas = (data.faturas || []).filter(
        f => f.referenciaAno === year && f.referenciaMes === month
      );

      // Metas progress (deposits made this month)
      // Actually, goal progress doesn't have strict dates in the simple model, 
      // but if we assume "transactions linked to categoryId of a goal" or we just sum progress where monthKey matches.
      // Wait, goals have `progress: { monthKey: string, amountSaved: number }[]`
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      const goalsSaved = data.goals.reduce((acc, goal) => {
        const p = goal.progress.find(pr => pr.month === monthKey);
        return acc + (p?.amountSaved || 0);
      }, 0);

      const incomes = walletTransactions.filter(t => t.type === 'income');
      const expenses = walletTransactions.filter(t => t.type === 'expense');

      const totalIncome = incomes.reduce((acc, t) => acc + t.amount, 0);
      const totalWalletExpense = expenses.reduce((acc, t) => acc + t.amount, 0);
      const totalFaturaExpense = faturas.reduce((acc, f) => acc + f.valorTotal, 0);
      const totalExpense = totalWalletExpense + totalFaturaExpense;
      const balance = totalIncome - totalExpense;

      // Group by category (wallet only for now, faturas are tracked separately as Credit)
      const categoryTotals = data.categories.map(cat => {
        let total = 0;
        if (cat.type === 'expense') {
          total = expenses.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
        } else {
          total = incomes.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
        }
        return { id: cat.id, name: cat.name, color: cat.color, type: cat.type, total };
      });

      const expensesByCategory = categoryTotals.filter(c => c.type === 'expense' && c.total > 0).sort((a, b) => b.total - a.total);
      const incomesByCategory = categoryTotals.filter(c => c.type === 'income' && c.total > 0).sort((a, b) => b.total - a.total);

      // Max values for relative bar widths
      const maxExpenseCategory = Math.max(...expensesByCategory.map(c => c.total), 0);
      const maxIncomeCategory = Math.max(...incomesByCategory.map(c => c.total), 0);

      // Group by Person
      const personTotals = data.people.map(p => {
        const spent = expenses.filter(t => t.personId === p.id).reduce((sum, t) => sum + t.amount, 0);
        const received = incomes.filter(t => t.personId === p.id).reduce((sum, t) => sum + t.amount, 0);
        return { id: p.id, name: p.name, spent, received };
      }).filter(p => p.spent > 0 || p.received > 0).sort((a, b) => b.spent - a.spent);

      // Group by Credit Card (using faturas)
      const cardTotals = data.cards.map(c => {
        const currentFatura = faturas.find(f => f.cartaoId === c.id);
        return { 
          id: c.id, 
          name: c.name, 
          color: c.color, 
          spent: currentFatura ? currentFatura.valorTotal : 0,
          limit: c.limit
        };
      }).filter(c => c.spent > 0).sort((a,b) => b.spent - a.spent);

      // Limits tracking
      const limitsTracking = data.limits.map(limit => {
        const cat = data.categories.find(c => c.id === limit.categoryId);
        const spent = categoryTotals.find(c => c.id === limit.categoryId)?.total || 0;
        return {
          id: limit.id,
          categoryId: limit.categoryId,
          categoryName: cat?.name || 'Desconhecida',
          color: cat?.color || 'var(--color-primary-gray)',
          limit: limit.amount,
          spent
        };
      }).sort((a,b) => (b.spent / b.limit) - (a.spent / a.limit));

      return {
        totalIncome,
        totalExpense,
        balance,
        goalsSaved,
        walletTransactions,
        faturas,
        incomes,
        expenses,
        expensesByCategory,
        incomesByCategory,
        maxExpenseCategory,
        maxIncomeCategory,
        personTotals,
        cardTotals,
        limitsTracking
      };
    };

    const current = getMonthData(targetMonth);
    const previous = getMonthData(subMonths(targetMonth, 1));

    const calcVar = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const variations = {
      income: calcVar(current.totalIncome, previous.totalIncome),
      expense: calcVar(current.totalExpense, previous.totalExpense),
      balance: calcVar(current.balance, previous.balance),
      goals: calcVar(current.goalsSaved, previous.goalsSaved)
    };

    const formatCurr = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    // Insights Engine
    const insights: { id: string; title: string; description: string; value?: string; valueColor?: string; type: 'positive' | 'warning' | 'neutral' }[] = [];
    
    if (current.expensesByCategory.length > 0 && current.totalExpense > 0) {
      const biggest = current.expensesByCategory[0];
      const pct = ((biggest.total / current.totalExpense) * 100).toFixed(1);
      insights.push({
        id: 'biggest_expense',
        type: 'neutral',
        title: 'Maior Despesa',
        description: `Sua maior despesa foi com ${biggest.name} (${formatCurr(biggest.total)}), representando ${pct}% do total de gastos.`,
        value: `${pct}%`
      });
    }

    if (variations.expense > 10) {
      insights.push({
        id: 'expense_increase',
        type: 'warning',
        title: 'Alerta de Gastos',
        description: `Atenção: Suas despesas aumentaram ${variations.expense.toFixed(1)}% em relação ao mês anterior.`,
        value: `+${variations.expense.toFixed(1)}%`,
        valueColor: 'var(--color-primary-red)'
      });
    } else if (variations.expense <= -5) {
      insights.push({
        id: 'expense_decrease',
        type: 'positive',
        title: 'Redução de Despesas',
        description: `Excelente! Suas despesas reduziram ${Math.abs(variations.expense).toFixed(1)}% em relação ao mês anterior.`,
        value: `${variations.expense.toFixed(1)}%`,
        valueColor: 'var(--color-primary-green)'
      });
    }

    if (current.cardTotals.length > 0) {
      const topCard = current.cardTotals[0];
      const usage = (topCard.spent / topCard.limit) * 100;
      if (usage > 85) {
        insights.push({
          id: 'card_warning',
          type: 'warning',
          title: 'Limite do Cartão',
          description: `O cartão ${topCard.name} comprometeu ${usage.toFixed(1)}% do limite (${formatCurr(topCard.spent)}). Cuidado com novas compras parceladas.`,
          value: `${usage.toFixed(1)}%`,
          valueColor: 'var(--color-primary-red)'
        });
      }
    }

    if (current.goalsSaved > 0) {
      insights.push({
        id: 'goals_success',
        type: 'positive',
        title: 'Metas e Aportes',
        description: `Parabéns! Você já guardou ${formatCurr(current.goalsSaved)} para suas metas neste mês.`,
        value: formatCurr(current.goalsSaved),
        valueColor: 'var(--color-primary-green)'
      });
    } else if (data.goals.length > 0) {
      insights.push({
        id: 'goals_missing',
        type: 'neutral',
        title: 'Metas e Aportes',
        description: `Você ainda não fez aportes em suas metas neste mês.`,
        value: 'Pendente',
        valueColor: 'var(--color-text-muted)'
      });
    }

    // Evolution Chart (13 months total: 6 back, current, 6 forward)
    const evolution = Array.from({ length: 13 }).map((_, i) => {
      const d = addMonths(targetMonth, i - 6);
      const mData = getMonthData(d);
      return {
        monthLabel: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        income: mData.totalIncome,
        expense: mData.totalExpense,
        isCurrentSelected: i === 6 // 6 is exactly the targetMonth offset (0)
      };
    });

    const maxEvolutionValue = Math.max(...evolution.map(e => Math.max(e.income, e.expense)), 0);

    return {
      current,
      previous,
      variations,
      insights,
      evolution,
      maxEvolutionValue
    };
  }, [data, targetMonth]);
}
