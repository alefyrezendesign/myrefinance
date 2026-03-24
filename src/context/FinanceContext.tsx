/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { generateId } from '../utils/generateId';
import type { FinanceData, CreditCard, Transaction, Category, FaturaCartao, ParcelaCartao, Person, Goal, BudgetLimit } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface FinanceContextProps {
  data: FinanceData;
  isLoading: boolean;
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  addTransactionsBatch: (transactions: Omit<Transaction, 'id' | 'userId'>[]) => Promise<void>;
  editTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string, cascadeMode?: 'this' | 'future' | 'all') => Promise<void>;
  addCard: (card: Omit<CreditCard, 'id' | 'currentInvoiceBalance' | 'userId'>) => Promise<void>;
  payInvoice: (faturaId: string) => Promise<void>;
  unpayInvoice: (faturaId: string) => Promise<void>;
  toggleTransactionStatus: (id: string) => Promise<void>;
  addGoalProgress: (goalId: string, month: string, amount: number, isFullyPaid?: boolean) => Promise<void>;
  setGoalProgress: (goalId: string, month: string, newAmountSaved: number, isFullyPaid?: boolean) => Promise<void>;
  skipGoalMonth: (goalId: string, month: string, skipType: 'rollover' | 'extend') => Promise<void>;
  refreshData: () => Promise<void>;
}

const DEFAULT_CATEGORIES: Omit<Category, 'userId'>[] = [
  // --- Receitas ---
  { id: 'c_salario', type: 'income', name: 'Salário', color: '#00C853' },
  { id: 'c_freela', type: 'income', name: 'Freelancer', color: '#00897B' },
  { id: 'c_emprestimo_rec', type: 'income', name: 'Empréstimo', color: '#29B6F6' },
  { id: 'c_aluguel', type: 'income', name: 'Aluguel', color: '#9CCC65' },
  { id: 'c_presente_rec', type: 'income', name: 'Presente', color: '#FDD835' },
  { id: 'c_premio', type: 'income', name: 'Premiação', color: '#FFB300' },
  { id: 'c_beneficio', type: 'income', name: 'Benefício', color: '#66BB6A' },
  { id: 'c_reembolso', type: 'income', name: 'Reembolso', color: '#26C6DA' },
  { id: 'c_venda', type: 'income', name: 'Venda', color: '#AB47BC' },
  { id: 'c_rendimentos', type: 'income', name: 'Rendimentos', color: '#5C6BC0' },
  { id: 'c_ajuste_pos', type: 'income', name: 'Ajuste de saldo', color: '#78909C', isProtected: true },

  // --- Despesas ---
  { id: 'c_mercado', type: 'expense', name: 'Mercado', color: '#E53935' },
  { id: 'c_padaria', type: 'expense', name: 'Padaria', color: '#FF7043' },
  { id: 'c_hortifruti', type: 'expense', name: 'Hortifrúti', color: '#1B5E20' },
  { id: 'c_restaurante', type: 'expense', name: 'Restaurante', color: '#D81B60' },
  { id: 'c_lanche', type: 'expense', name: 'Lanche', color: '#FFCCBC' },
  { id: 'c_transporte', type: 'expense', name: 'Transporte', color: '#2979FF' },
  { id: 'c_combustivel', type: 'expense', name: 'Combustível', color: '#37474F' },
  { id: 'c_carro', type: 'expense', name: 'Carro', color: '#0D47A1' },
  { id: 'c_uber', type: 'expense', name: 'Uber', color: '#263238' },
  { id: 'c_reforma', type: 'expense', name: 'Reforma', color: '#FF6D00' },
  { id: 'c_energia', type: 'expense', name: 'Energia', color: '#FFF9C4' },
  { id: 'c_internet', type: 'expense', name: 'Internet', color: '#B2EBF2' },
  { id: 'c_planomovel', type: 'expense', name: 'Plano Móvel', color: '#8E24AA' },
  { id: 'c_saude', type: 'expense', name: 'Saúde', color: '#EC407A' },
  { id: 'c_farmacia', type: 'expense', name: 'Farmácia', color: '#F8BBD0' },
  { id: 'c_curso', type: 'expense', name: 'Curso', color: '#4A148C' },
  { id: 'c_lazer', type: 'expense', name: 'Lazer', color: '#C8E6C9' },
  { id: 'c_assinaturas', type: 'expense', name: 'Assinaturas', color: '#7E57C2' },
  { id: 'c_roupas', type: 'expense', name: 'Roupas', color: '#FF5722' },
  { id: 'c_maite', type: 'expense', name: 'Maitê', color: '#F48FB1' },
  { id: 'c_pets', type: 'expense', name: 'Pets', color: '#4DB6AC' },
  { id: 'c_presentes', type: 'expense', name: 'Presentes', color: '#BA68C8' },
  { id: 'c_impostos', type: 'expense', name: 'Impostos', color: '#6D4C41' },
  { id: 'c_dividas', type: 'expense', name: 'Dívidas', color: '#B71C1C' },
  { id: 'c_reserva', type: 'expense', name: 'Reserva', color: '#C8E6C9' },
  { id: 'c_ajuste_neg', type: 'expense', name: 'Ajuste de saldo', color: '#78909C', isProtected: true },
];

const initialData: FinanceData = {
  balance: 0,
  categories: [],
  people: [
    { id: 't1', name: 'Alefy' },
    { id: 't2', name: 'Medley' },
  ],
  cards: [],
  transactions: [],
  faturas: [],
  parcelas: [],
  invoicePayments: [],
  goals: [],
  limits: [],
};

const FinanceContext = createContext<FinanceContextProps | undefined>(undefined);

// --- Helpers para Lógica de Cartão Pura ---
export function getInvoiceReferenceMonth(
  purchaseDate: Date,
  closingDay: number,
  dueDay: number,
  installmentOffset: number = 0
): { year: number; month: number; closingDate: Date; dueDate: Date } {
  const isNextCycle = purchaseDate.getDate() > closingDay;
  let cycleMonth = purchaseDate.getMonth();
  let cycleYear = purchaseDate.getFullYear();
  if (isNextCycle) {
    cycleMonth += 1;
    if (cycleMonth > 11) { cycleMonth = 0; cycleYear += 1; }
  }
  cycleMonth += installmentOffset;
  cycleYear += Math.floor(cycleMonth / 12);
  cycleMonth = cycleMonth % 12;

  let dueMonth = cycleMonth;
  let dueYear = cycleYear;
  if (dueDay <= closingDay) {
    dueMonth += 1;
    if (dueMonth > 11) { dueMonth = 0; dueYear += 1; }
  }
  return { year: dueYear, month: dueMonth, closingDate: new Date(cycleYear, cycleMonth, closingDay, 23, 59, 59), dueDate: new Date(dueYear, dueMonth, dueDay, 23, 59, 59) };
}

function removeTransactionFromState(state: FinanceData, txId: string): FinanceData {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return state;

  const newState = { ...state };
  newState.transactions = newState.transactions.filter(t => t.id !== txId);

  if (tx.cartaoId) {
    const parcelasToKeep = [];
    const parcelasToRemove = [];
    for (const p of newState.parcelas) {
      if (p.lancamentoId === txId) parcelasToRemove.push(p);
      else parcelasToKeep.push(p);
    }
    newState.parcelas = parcelasToKeep;

    const faturaUpdates = new Map<string, number>();
    for (const p of parcelasToRemove) {
      faturaUpdates.set(p.faturaId, (faturaUpdates.get(p.faturaId) || 0) + Number(p.valorParcela));
    }

    newState.faturas = newState.faturas.map(f => {
      const subtractAmount = faturaUpdates.get(f.id);
      if (subtractAmount !== undefined) {
        return { ...f, valorTotal: Number(f.valorTotal) - subtractAmount };
      }
      return f;
    });
  }
  return newState;
}

function addTransactionToState(state: FinanceData, tx: Transaction): FinanceData {
  const newState = { ...state };
  newState.transactions = [...newState.transactions, tx];
  
  if (!tx.cartaoId) return newState;

  const card = newState.cards.find(c => c.id === tx.cartaoId);
  if (!card) return newState;

  const parcelasCount = tx.parcelado && tx.quantidadeParcelas ? tx.quantidadeParcelas : 1;
  const isIncome = tx.type === 'income';
  const amountNum = Number(tx.amount);
  const parcelBaseValue = amountNum / parcelasCount;
  
  const newFaturas = [...newState.faturas];
  const newParcelas = [...newState.parcelas];
  const purchaseDate = new Date(tx.date);

  let baseYear = purchaseDate.getFullYear();
  let baseMonth = purchaseDate.getMonth();

  if (tx.invoiceDate) {
    const [invYear, invMonth] = tx.invoiceDate.split('-');
    baseYear = parseInt(invYear, 10);
    baseMonth = parseInt(invMonth, 10) - 1;
  }

  for (let i = 0; i < parcelasCount; i++) {
    let year = baseYear;
    let month = baseMonth + i;
    year += Math.floor(month / 12);
    month = month % 12;

    const closingDate = new Date(year, month, card.closingDay, 23, 59, 59);
    let dueMonth = month;
    let dueYear = year;
    if (card.dueDay <= card.closingDay) {
      dueMonth += 1;
      if (dueMonth > 11) { dueMonth = 0; dueYear += 1; }
    }
    const dueDate = new Date(dueYear, dueMonth, card.dueDay, 23, 59, 59);
    
    let fatura = newFaturas.find(f => f.cartaoId === card.id && f.referenciaAno === year && f.referenciaMes === month);
    if (!fatura) {
      fatura = {
        id: generateId(),
        userId: tx.userId,
        cartaoId: card.id,
        referenciaAno: year,
        referenciaMes: month,
        dataFechamento: closingDate.toISOString(),
        dataVencimento: dueDate.toISOString(),
        valorTotal: 0,
        status: 'aberta',
        createdAt: new Date().toISOString()
      };
      newFaturas.push(fatura);
    } else {
      newFaturas.splice(newFaturas.indexOf(fatura), 1);
      fatura = { ...fatura };
      newFaturas.push(fatura);
    }

    const parcela: ParcelaCartao = {
      id: generateId(),
      userId: tx.userId,
      lancamentoId: tx.id,
      cartaoId: card.id,
      faturaId: fatura.id,
      numeroParcela: i + 1,
      totalParcelas: parcelasCount,
      valorParcela: isIncome ? -parcelBaseValue : parcelBaseValue,
      dataCompra: tx.date,
      referenciaAno: year,
      referenciaMes: month,
      createdAt: new Date().toISOString()
    };
    newParcelas.push(parcela);

    fatura.valorTotal = Number(fatura.valorTotal) + parcela.valorParcela;
  }

  newState.faturas = newFaturas;
  newState.parcelas = newParcelas;
  return newState;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FinanceData>(initialData);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchAllData = async () => {
    if (!user) return;
    
    try {
      const [
        { data: cats }, { data: ppl }, { data: crds }, 
        { data: txs }, { data: fts }, { data: prcs }, 
        { data: gls }, { data: lms }
      ] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('people').select('*'),
        supabase.from('cards').select('*'),
        supabase.from('transactions').select('*').order('date', { ascending: false }).limit(3000),
        supabase.from('faturas').select('*').limit(3000),
        supabase.from('parcelas').select('*').limit(3000),
        supabase.from('goals').select('*'),
        supabase.from('limits').select('*'),
      ]);

      let categories = cats as Category[] || [];
      if (categories.length === 0) {
        const defaultCatsWithUser = DEFAULT_CATEGORIES.map(c => ({...c, userId: user.id}));
        await supabase.from('categories').insert(defaultCatsWithUser);
        categories = defaultCatsWithUser as Category[];
      }

      let people = ppl as Person[] || [];
      if (people.length === 0) {
        const defaultPplWithUser = initialData.people.map(p => ({...p, userId: user.id}));
        await supabase.from('people').insert(defaultPplWithUser);
        people = defaultPplWithUser as Person[];
      }

      let balance = 0;
      const parsedTxs = (txs as Transaction[] || []).map(t => ({
         ...t, 
         amount: Number(t.amount), 
         quantidadeParcelas: t.quantidadeParcelas ? Number(t.quantidadeParcelas) : undefined 
      }));

      parsedTxs.forEach(tx => {
        // Only wallet transactions (no cartaoId) that are paid affect the balance.
        // Invoice payments (isInvoicePayment) are wallet expenses so they are included here.
        if (!tx.cartaoId && tx.status === 'paid') {
          if (tx.type === 'income') balance += tx.amount;
          else if (tx.type === 'expense') balance -= tx.amount;
        }
      });

      setData({
        balance,
        categories,
        people,
        cards: (crds as CreditCard[] || []).map(c => ({ ...c, limit: Number(c.limit) })),
        transactions: parsedTxs,
        faturas: (fts as FaturaCartao[] || []).map(f => ({ ...f, valorTotal: Number(f.valorTotal) })),
        parcelas: (prcs as ParcelaCartao[] || []).map(p => ({ ...p, valorParcela: Number(p.valorParcela) })),
        invoicePayments: [],
        goals: (gls as Goal[] || []).map(g => ({ ...g, targetAmount: Number(g.targetAmount) })),
        limits: (lms as BudgetLimit[] || []).map(l => ({ ...l, amount: Number(l.amount) }))
      });
    } catch (e) {
      console.error('Error fetching Supabase data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      setData(initialData);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refreshData = async () => {
    await fetchAllData();
  };

  const checkBudgetLimit = async (categoryId: string) => {
    if (!user) return;
    const limit = data.limits.find(l => l.categoryId === categoryId);
    if (!limit) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();
    
    // Calculate total spent for this category in the current month across ALL transactions
    // (Wait for refreshData to ensure state is fresh)
    const totalSpent = data.transactions
      .filter(t => 
        t.categoryId === categoryId && 
        t.type === 'expense' && 
        new Date(t.date).getFullYear() === currentYear && 
        new Date(t.date).getMonth() === currentMonthNum
      )
      .reduce((acc, t) => acc + t.amount, 0);

    const percentage = (totalSpent / limit.amount) * 100;
    
    if (percentage >= 85) {
      const monthYear = `${currentYear}-${String(currentMonthNum + 1).padStart(2, '0')}`;
      
      // Check if already notified this month to avoid spam
      const { data: alreadyNotified } = await supabase
        .from('notifications_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('type', 'limite_85')
        .eq('reference_id', categoryId)
        .eq('month_year', monthYear)
        .maybeSingle();

      if (!alreadyNotified) {
        const categoryName = data.categories.find(c => c.id === categoryId)?.name || 'Categoria';
        
        // Trigger Edge Function for Push Notification
        try {
          await supabase.functions.invoke('send-notification', {
            body: { 
              type: 'limite_85', 
              categoryId, 
              percentage: Math.round(percentage),
              categoryName,
              userId: user.id
            }
          });
          
          // Log the notification
          await supabase.from('notifications_log').insert({
            user_id: user.id,
            type: 'limite_85',
            reference_id: categoryId,
            month_year: monthYear
          });
        } catch (err) {
          console.error('Failed to trigger limit notification:', err);
        }
      }
    }
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'userId'>) => {
    if (!user) return;
    const newTx: Transaction = { ...transactionData, id: generateId(), userId: user.id, createdAt: new Date().toISOString() };
    
    // Simulate locally to find exactly what faturas/parcelas to upsert
    const oldParcelasLength = data.parcelas.length;
    const newState = addTransactionToState(data, newTx);
    const newParcelas = newState.parcelas.slice(oldParcelasLength);
    
    try {
      if (newTx.cartaoId) {
        // Order: 1. Faturas (must exist before parcelas reference them)
        const relevantFaturas = newState.faturas.filter(f => f.cartaoId === newTx.cartaoId && newParcelas.some(p => p.faturaId === f.id));
        if (relevantFaturas.length > 0) {
          const { error: fatErr } = await supabase.from('faturas').upsert(relevantFaturas);
          if (fatErr) throw new Error(`Faturas: ${fatErr.message}`);
        }
        // 2. Transaction
        const { error: txErr } = await supabase.from('transactions').insert(newTx);
        if (txErr) throw new Error(`Transaction: ${txErr.message}`);
        // 3. Parcelas (depend on both fatura + transaction existing)
        if (newParcelas.length > 0) {
          const { error: pErr } = await supabase.from('parcelas').insert(newParcelas);
          if (pErr) {
            // Rollback: remove the transaction we just inserted
            await supabase.from('transactions').delete().eq('id', newTx.id);
            throw new Error(`Parcelas: ${pErr.message}`);
          }
        }
      } else {
        // Simple wallet transaction — single insert
        const { error: txErr } = await supabase.from('transactions').insert(newTx);
        if (txErr) throw new Error(`Transaction: ${txErr.message}`);
      }
    } catch (err) {
      console.error('Error adding transaction:', err);
    } finally {
      await refreshData();
    }
    
    // Check limit after refresh
    if (newTx.type === 'expense' && !newTx.cartaoId) {
      await checkBudgetLimit(newTx.categoryId);
    }
  };

  const addTransactionsBatch = async (transactionsData: Omit<Transaction, 'id' | 'userId'>[]) => {
    if (!user) return;
    const newTxs = transactionsData.map(td => ({ ...td, id: generateId(), userId: user.id, createdAt: new Date().toISOString() }));
    let tempState = data;
    for (const tx of newTxs) {
       tempState = addTransactionToState(tempState, tx);
    }
    
    try {
      const cardTxs = newTxs.filter(t => t.cartaoId);
      
      if (cardTxs.length > 0) {
        // Order: faturas → transactions → parcelas
        const relevantCards = [...new Set(cardTxs.map(t => t.cartaoId))];
        const txIds = new Set(newTxs.map(t => t.id));
        const newParcelas = tempState.parcelas.filter(p => txIds.has(p.lancamentoId));
        const relevantFaturas = tempState.faturas.filter(f => relevantCards.includes(f.cartaoId) && newParcelas.some(p => p.faturaId === f.id));
        
        // 1. Faturas first
        if (relevantFaturas.length > 0) {
          const { error: fatErr } = await supabase.from('faturas').upsert(relevantFaturas);
          if (fatErr) throw new Error(`Faturas: ${fatErr.message}`);
        }
        // 2. Transactions
        const { error: txErr } = await supabase.from('transactions').insert(newTxs);
        if (txErr) throw new Error(`Transactions: ${txErr.message}`);
        // 3. Parcelas
        if (newParcelas.length > 0) {
          const { error: pErr } = await supabase.from('parcelas').insert(newParcelas);
          if (pErr) {
            // Rollback transactions
            await supabase.from('transactions').delete().in('id', newTxs.map(t => t.id));
            throw new Error(`Parcelas: ${pErr.message}`);
          }
        }
      } else {
        // All wallet — single batch insert
        const { error: txErr } = await supabase.from('transactions').insert(newTxs);
        if (txErr) throw new Error(`Transactions: ${txErr.message}`);
      }
    } catch (err) {
      console.error('Error saving batch transactions:', err);
    } finally {
      await refreshData();
    }

    // Check limits for impacted categories
    const expenseCategories = [...new Set(newTxs.filter(t => t.type === 'expense' && !t.cartaoId).map(t => t.categoryId))];
    for (const catId of expenseCategories) {
      await checkBudgetLimit(catId);
    }
  };

  const editTransaction = async (updatedTx: Transaction) => {
    if (!user) return;
    
    // Ensure userId is always present for RLS compliance
    if (!updatedTx.userId) updatedTx.userId = user.id;
    
    // Sanitize: remove undefined values so Supabase receives explicit null for cleared fields
    const sanitized = Object.fromEntries(
      Object.entries(updatedTx).filter(([, v]) => v !== undefined)
    ) as Transaction;
    
    try {
      if (!sanitized.cartaoId) {
        const { error } = await supabase.from('transactions').update(sanitized).eq('id', sanitized.id);
        if (error) throw new Error(`Update: ${error.message}`);
      } else {
        const oldParcelas = data.parcelas.filter(p => p.lancamentoId === sanitized.id);
        
        // 1. Delete old parcelas first
        if (oldParcelas.length > 0) {
          const { error: delErr } = await supabase.from('parcelas').delete().in('id', oldParcelas.map(p => p.id));
          if (delErr) throw new Error(`Delete parcelas: ${delErr.message}`);
        }
        
        // 2. Compute new state
        const intermediateState = removeTransactionFromState(data, sanitized.id);
        const newState = addTransactionToState(intermediateState, sanitized);
        
        const oldTx = data.transactions.find(t => t.id === sanitized.id);
        const relevantCartaoIds = [oldTx?.cartaoId, sanitized.cartaoId].filter(Boolean);
        
        const newParcelas = newState.parcelas.filter(p => p.lancamentoId === sanitized.id);
        const relevantFaturasIdSet = new Set([...oldParcelas.map(p => p.faturaId), ...newParcelas.map(p => p.faturaId)]);
        const modifiedFaturas = newState.faturas.filter(f => relevantCartaoIds.includes(f.cartaoId) && relevantFaturasIdSet.has(f.id));
        
        // 3. Upsert faturas
        if (modifiedFaturas.length > 0) {
          const { error: fatErr } = await supabase.from('faturas').upsert(modifiedFaturas);
          if (fatErr) throw new Error(`Faturas upsert: ${fatErr.message}`);
        }
        
        // 4. Update the transaction
        const { error: txErr } = await supabase.from('transactions').update(sanitized).eq('id', sanitized.id);
        if (txErr) throw new Error(`Transaction update: ${txErr.message}`);
        
        // 5. Insert new parcelas
        if (newParcelas.length > 0) {
          const { error: pErr } = await supabase.from('parcelas').insert(newParcelas);
          if (pErr) throw new Error(`Parcelas insert: ${pErr.message}`);
        }
      }
    } catch (err) {
      console.error('Error editing transaction:', err);
    } finally {
      // ALWAYS refresh to sync UI with actual DB state
      await refreshData();
    }
  };

  const deleteTransaction = async (id: string, cascadeMode: 'this' | 'future' | 'all' = 'this') => {
    if (!user) return;
    const tx = data.transactions.find(t => t.id === id);
    if (!tx) return;

    let idsToDelete = [id];
    
    if (cascadeMode !== 'this') {
      const isMatch = (t: Transaction) => {
        if (tx.seriesId) return t.seriesId === tx.seriesId;
        return t.description === tx.description && t.amount === tx.amount && t.categoryId === tx.categoryId && t.type === tx.type && (t.isRecurring || t.parcelado);
      };
      if (cascadeMode === 'all') {
        idsToDelete = data.transactions.filter(isMatch).map(t => t.id);
      } else if (cascadeMode === 'future') {
        const txDate = new Date(tx.date).getTime();
        idsToDelete = data.transactions.filter(t => isMatch(t) && new Date(t.date).getTime() >= txDate).map(t => t.id);
      }
    }
    
    try {
      const parcelasToDelete = data.parcelas.filter(p => idsToDelete.includes(p.lancamentoId));
      
      if (parcelasToDelete.length > 0) {
        // 1. Delete parcelas first (child records)
        const { error: pErr } = await supabase.from('parcelas').delete().in('id', parcelasToDelete.map(p => p.id));
        if (pErr) throw new Error(`Parcelas delete: ${pErr.message}`);
        
        // 2. Update faturas totals
        let tempState = data;
        for (const tId of idsToDelete) {
           tempState = removeTransactionFromState(tempState, tId);
        }
        
        const affectedCards = [...new Set(parcelasToDelete.map(p => p.cartaoId))];
        const faturaIdsToUpdate = new Set(parcelasToDelete.map(p => p.faturaId));
        const modifiedFaturas = tempState.faturas.filter(f => affectedCards.includes(f.cartaoId) && faturaIdsToUpdate.has(f.id));
        
        if (modifiedFaturas.length > 0) {
          const { error: fatErr } = await supabase.from('faturas').upsert(modifiedFaturas);
          if (fatErr) throw new Error(`Faturas update: ${fatErr.message}`);
        }
      }
      
      // 3. Delete transactions last (parent records)
      const { error: txErr } = await supabase.from('transactions').delete().in('id', idsToDelete);
      if (txErr) throw new Error(`Transactions delete: ${txErr.message}`);
    } catch (err) {
      console.error('Error deleting transactions:', err);
    } finally {
      await refreshData();
    }
  };

  const addCard = async (cardData: Omit<CreditCard, 'id' | 'currentInvoiceBalance' | 'userId'>) => {
    if (!user) return;
    const newCard = { ...cardData, id: generateId(), userId: user.id };
    await supabase.from('cards').insert(newCard);
    await refreshData();
  };

  const payInvoice = async (faturaId: string) => {
    if (!user) return;
    const fatura = data.faturas.find(f => f.id === faturaId);
    if (!fatura || fatura.status === 'paga') return;

    const card = data.cards.find(c => c.id === fatura.cartaoId);
    if (!card) return;

    const paymentTxId = generateId();
    const paymentTx: Transaction = {
      id: paymentTxId,
      userId: user.id,
      type: 'expense',
      amount: fatura.valorTotal,
      date: new Date().toISOString(),
      description: `Fatura ${card.name} — ${String(fatura.referenciaMes + 1).padStart(2, '0')}/${fatura.referenciaAno}`,
      categoryId: 'c_ajuste_neg',
      accountId: 'conta_unica',
      isRecurring: false,
      isInvoicePayment: true,
      status: 'paid',
    };

    await supabase.from('transactions').insert(paymentTx);
    await supabase.from('faturas').update({ status: 'paga', pagoEm: paymentTx.date, paymentTxId }).eq('id', faturaId);
    await refreshData();
  };

  const unpayInvoice = async (faturaId: string) => {
    const fatura = data.faturas.find(f => f.id === faturaId);
    if (!fatura || fatura.status !== 'paga') return;

    if (fatura.paymentTxId) {
      await supabase.from('transactions').delete().eq('id', fatura.paymentTxId);
    }
    await supabase.from('faturas').update({ status: 'aberta', pagoEm: null, paymentTxId: null }).eq('id', faturaId);
    await refreshData();
  };

  const toggleTransactionStatus = async (id: string) => {
    const tx = data.transactions.find(t => t.id === id);
    if (!tx || tx.cartaoId) return;
    
    const newStatus = tx.status === 'paid' ? 'pending' : 'paid';
    await supabase.from('transactions').update({ status: newStatus }).eq('id', id);
    await refreshData();
  };

  const addGoalProgress = async (goalId: string, month: string, amount: number, isFullyPaid: boolean = false) => {
    const goal = data.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const existing = goal.progress.find(p => p.month === month);
    const filtered = goal.progress.filter(p => p.month !== month);
    const newSaved = (existing ? existing.amountSaved : 0) + amount;
    
    filtered.push({
      month,
      status: isFullyPaid ? 'paid' : (existing?.status && existing.status !== 'skipped' ? existing.status : 'pending'),
      amountSaved: newSaved
    });
    
    await supabase.from('goals').update({ progress: filtered }).eq('id', goalId);
    await refreshData();
  };

  const setGoalProgress = async (goalId: string, month: string, newAmountSaved: number, isFullyPaid: boolean = false) => {
    const goal = data.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const filtered = goal.progress.filter(p => p.month !== month);
    filtered.push({ month, status: isFullyPaid ? 'paid' : 'pending', amountSaved: newAmountSaved });
    
    await supabase.from('goals').update({ progress: filtered }).eq('id', goalId);
    await refreshData();
  };

  const skipGoalMonth = async (goalId: string, month: string, skipType: 'rollover' | 'extend') => {
    const goal = data.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const existing = goal.progress.find(p => p.month === month);
    const filtered = goal.progress.filter(p => p.month !== month);
    
    filtered.push({ month, status: 'skipped', amountSaved: existing ? existing.amountSaved : 0, skipType });
    
    await supabase.from('goals').update({ progress: filtered }).eq('id', goalId);
    await refreshData();
  };

  return (
    <FinanceContext.Provider value={{ data, isLoading, currentMonth, setCurrentMonth, addTransaction, addTransactionsBatch, editTransaction, deleteTransaction, addCard, payInvoice, unpayInvoice, toggleTransactionStatus, addGoalProgress, setGoalProgress, skipGoalMonth, refreshData }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
}
