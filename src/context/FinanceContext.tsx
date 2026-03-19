/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { generateId } from '../utils/generateId';
import type { FinanceData, CreditCard, Transaction, Category, FaturaCartao, ParcelaCartao, Person, Goal, BudgetLimit, GoalMonth } from '../types';
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
  { id: 'c_salario', type: 'income', name: 'Salário', color: '#00C853' },
  { id: 'c_freela', type: 'income', name: 'Freelancer', color: '#00897B' },
  { id: 'c_emprestimo_rec', type: 'income', name: 'Empréstimo', color: '#29B6F6' },
  { id: 'c_aluguel', type: 'income', name: 'Aluguel', color: '#9CCC65' },
  { id: 'c_ajuste_pos', type: 'income', name: 'Ajuste de saldo', color: '#78909C', isProtected: true },

  { id: 'c_mercado', type: 'expense', name: 'Mercado', color: '#E53935' },
  { id: 'c_padaria', type: 'expense', name: 'Padaria', color: '#FF7043' },
  { id: 'c_restaurante', type: 'expense', name: 'Restaurante', color: '#D81B60' },
  { id: 'c_transporte', type: 'expense', name: 'Transporte', color: '#2979FF' },
  { id: 'c_energia', type: 'expense', name: 'Energia', color: '#FFF9C4' },
  { id: 'c_assinaturas', type: 'expense', name: 'Assinaturas', color: '#7E57C2' },
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
        status: 'aberta'
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
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('faturas').select('*'),
        supabase.from('parcelas').select('*'),
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
        if (!tx.cartaoId && tx.status === 'paid' && tx.accountId === 'conta_unica') {
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

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'userId'>) => {
    if (!user) return;
    const newTx: Transaction = { ...transactionData, id: generateId(), userId: user.id };
    
    // Simulate locally to find exactly what faturas/parcelas to upsert
    const oldParcelasLength = data.parcelas.length;
    const newState = addTransactionToState(data, newTx);
    const newParcelas = newState.parcelas.slice(oldParcelasLength);
    
    await supabase.from('transactions').insert(newTx);
    
    if (newTx.cartaoId) {
       const relevantFaturas = newState.faturas.filter(f => f.cartaoId === newTx.cartaoId);
       if (relevantFaturas.length > 0) {
         await supabase.from('faturas').upsert(relevantFaturas);
       }
       if (newParcelas.length > 0) {
         await supabase.from('parcelas').insert(newParcelas);
       }
    }
    await refreshData();
  };

  const addTransactionsBatch = async (transactionsData: Omit<Transaction, 'id' | 'userId'>[]) => {
    if (!user) return;
    const newTxs = transactionsData.map(td => ({ ...td, id: generateId(), userId: user.id }));
    let tempState = data;
    for (const tx of newTxs) {
       tempState = addTransactionToState(tempState, tx);
    }
    
    await supabase.from('transactions').insert(newTxs);
    
    // Simplification for batch (usually recurring Wallet transactions, no cards)
    const cardTxs = newTxs.filter(t => t.cartaoId);
    if (cardTxs.length > 0) {
       const relevantCards = [...new Set(cardTxs.map(t => t.cartaoId))];
       const relevantFaturas = tempState.faturas.filter(f => relevantCards.includes(f.cartaoId));
       const newParcelas = tempState.parcelas.filter(p => newTxs.map(t => t.id).includes(p.lancamentoId));
       
       if (relevantFaturas.length > 0) await supabase.from('faturas').upsert(relevantFaturas);
       if (newParcelas.length > 0) await supabase.from('parcelas').insert(newParcelas);
    }
    await refreshData();
  };

  const editTransaction = async (updatedTx: Transaction) => {
    if (!user) return;
    
    if (!updatedTx.cartaoId) {
      await supabase.from('transactions').update(updatedTx).eq('id', updatedTx.id);
    } else {
      const oldParcelas = data.parcelas.filter(p => p.lancamentoId === updatedTx.id);
      if (oldParcelas.length > 0) {
        await supabase.from('parcelas').delete().in('id', oldParcelas.map(p => p.id));
      }
      
      const intermediateState = removeTransactionFromState(data, updatedTx.id);
      const newState = addTransactionToState(intermediateState, updatedTx);
      
      const oldTx = data.transactions.find(t => t.id === updatedTx.id);
      const relevantCartaoIds = [oldTx?.cartaoId, updatedTx.cartaoId].filter(Boolean);
      const modifiedFaturas = newState.faturas.filter(f => relevantCartaoIds.includes(f.cartaoId));
      
      if (modifiedFaturas.length > 0) await supabase.from('faturas').upsert(modifiedFaturas);
      
      const newParcelas = newState.parcelas.filter(p => p.lancamentoId === updatedTx.id);
      if (newParcelas.length > 0) await supabase.from('parcelas').insert(newParcelas);
      
      await supabase.from('transactions').update(updatedTx).eq('id', updatedTx.id);
    }
    await refreshData();
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
    
    const parcelasToDelete = data.parcelas.filter(p => idsToDelete.includes(p.lancamentoId));
    
    if (parcelasToDelete.length > 0) {
      let tempState = data;
      for (const tId of idsToDelete) {
         tempState = removeTransactionFromState(tempState, tId);
      }
      
      const affectedCards = [...new Set(parcelasToDelete.map(p => p.cartaoId))];
      const modifiedFaturas = tempState.faturas.filter(f => affectedCards.includes(f.cartaoId));
      
      if (modifiedFaturas.length > 0) await supabase.from('faturas').upsert(modifiedFaturas);
      await supabase.from('parcelas').delete().in('id', parcelasToDelete.map(p => p.id));
    }
    
    await supabase.from('transactions').delete().in('id', idsToDelete);
    await refreshData();
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
