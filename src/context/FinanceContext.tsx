/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { generateId } from '../utils/generateId';
import type { FinanceData, CreditCard, Transaction, Category, FaturaCartao, ParcelaCartao } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface FinanceContextProps {
  data: FinanceData;
  setData: (data: FinanceData | ((prev: FinanceData) => FinanceData)) => void;
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addTransactionsBatch: (transactions: Omit<Transaction, 'id'>[]) => void;
  editTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string, cascadeMode?: 'this' | 'future' | 'all') => void;
  addCard: (card: Omit<CreditCard, 'id' | 'currentInvoiceBalance'>) => void;
  payInvoice: (faturaId: string) => void;
  unpayInvoice: (faturaId: string) => void;
  toggleTransactionStatus: (id: string) => void;
  addGoalProgress: (goalId: string, month: string, amount: number, isFullyPaid?: boolean) => void;
  setGoalProgress: (goalId: string, month: string, newAmountSaved: number, isFullyPaid?: boolean) => void;
  skipGoalMonth: (goalId: string, month: string, skipType: 'rollover' | 'extend') => void;
}

const DEFAULT_CATEGORIES: Category[] = [
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
  categories: DEFAULT_CATEGORIES,
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

// --- Helpers para Lógica de Cartão ---
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
    if (cycleMonth > 11) {
      cycleMonth = 0;
      cycleYear += 1;
    }
  }

  // Incrementa a quantidade de meses do offset (parcelas)
  cycleMonth += installmentOffset;
  cycleYear += Math.floor(cycleMonth / 12);
  cycleMonth = cycleMonth % 12;

  let dueMonth = cycleMonth;
  let dueYear = cycleYear;
  if (dueDay <= closingDay) {
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }

  const closingDate = new Date(cycleYear, cycleMonth, closingDay, 23, 59, 59);
  const dueDate = new Date(dueYear, dueMonth, dueDay, 23, 59, 59);

  return { year: dueYear, month: dueMonth, closingDate, dueDate };
}

function removeTransactionFromState(state: FinanceData, txId: string): FinanceData {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return state;

  const newState = { ...state };
  newState.transactions = newState.transactions.filter(t => t.id !== txId);

  if (!tx.cartaoId) {
    if (tx.status === 'paid' && tx.accountId === 'conta_unica') {
      if (tx.type === 'income') newState.balance -= tx.amount;
      else if (tx.type === 'expense') newState.balance += tx.amount;
    }
  } else {
    // Remove parcelas
    const parcelasToKeep = [];
    const parcelasToRemove = [];
    for (const p of newState.parcelas || []) {
      if (p.lancamentoId === txId) parcelasToRemove.push(p);
      else parcelasToKeep.push(p);
    }
    newState.parcelas = parcelasToKeep;

    // Subtrai das faturas
    const faturaUpdates = new Map<string, number>();
    for (const p of parcelasToRemove) {
      faturaUpdates.set(p.faturaId, (faturaUpdates.get(p.faturaId) || 0) + p.valorParcela);
    }

    newState.faturas = (newState.faturas || []).map(f => {
      const subtractAmount = faturaUpdates.get(f.id);
      if (subtractAmount !== undefined) {
        return { ...f, valorTotal: f.valorTotal - subtractAmount };
      }
      return f;
    });
  }
  return newState;
}

function addTransactionToState(state: FinanceData, tx: Transaction): FinanceData {
  const newState = { ...state };
  newState.transactions = [...newState.transactions, tx];
  
  // Wallet
  if (!tx.cartaoId) {
    if (tx.status === 'paid' && tx.accountId === 'conta_unica') {
      if (tx.type === 'income') newState.balance += tx.amount;
      else if (tx.type === 'expense') newState.balance -= tx.amount;
    }
    return newState;
  }

  // Card
  const card = newState.cards.find(c => c.id === tx.cartaoId);
  if (!card) return newState;

  const parcelasCount = tx.parcelado && tx.quantidadeParcelas ? tx.quantidadeParcelas : 1;
  const isIncome = tx.type === 'income';
  const parcelBaseValue = tx.amount / parcelasCount;
  
  const newFaturas = [...(newState.faturas || [])];
  const newParcelas = [...(newState.parcelas || [])];

  const purchaseDate = new Date(tx.date);

  let baseYear = purchaseDate.getFullYear();
  let baseMonth = purchaseDate.getMonth();

  if (tx.invoiceDate) {
    const [invYear, invMonth] = tx.invoiceDate.split('-');
    baseYear = parseInt(invYear, 10);
    baseMonth = parseInt(invMonth, 10) - 1; // 0-11 JS months
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
    
    const existingFaturaIndex = newFaturas.findIndex(f => f.cartaoId === card.id && f.referenciaAno === year && f.referenciaMes === month);
    let fatura: FaturaCartao;
    
    if (existingFaturaIndex === -1) {
      fatura = {
        id: generateId(),
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
      fatura = { ...newFaturas[existingFaturaIndex] };
      newFaturas[existingFaturaIndex] = fatura;
    }

    const parcela: ParcelaCartao = {
      id: generateId(),
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

    fatura.valorTotal += parcela.valorParcela;
  }

  newState.faturas = newFaturas;
  newState.parcelas = newParcelas;

  return newState;
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useLocalStorage<FinanceData>('RefinanceDB', initialData);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const addTransaction = (transactionData: Omit<Transaction, 'id'>) => {
    setData(prev => {
      const newTx: Transaction = {
        ...transactionData,
        id: generateId(),
      };
      return addTransactionToState(prev, newTx);
    });
  };

  const addTransactionsBatch = (transactionsData: Omit<Transaction, 'id'>[]) => {
    setData(prev => {
      let newState = prev;
      for (const td of transactionsData) {
        const newTx: Transaction = { ...td, id: generateId() };
        newState = addTransactionToState(newState, newTx);
      }
      return newState;
    });
  };

  const editTransaction = (updatedTx: Transaction) => {
    setData(prev => {
      // Remover os efeitos da transação antiga
      const intermediateState = removeTransactionFromState(prev, updatedTx.id);
      // Adicionar os efeitos da nova transação
      return addTransactionToState(intermediateState, updatedTx);
    });
  };

  const deleteTransaction = (id: string, cascadeMode: 'this' | 'future' | 'all' = 'this') => {
    setData(prev => {
      const tx = prev.transactions.find(t => t.id === id);
      if (!tx) return prev;

      if (cascadeMode === 'this') {
         return removeTransactionFromState(prev, id);
      }
      
      const isMatch = (t: Transaction) => {
        if (tx.seriesId) return t.seriesId === tx.seriesId;
        // Heuristic fallback for legacy transactions that lack seriesId
        return t.description === tx.description && 
               t.amount === tx.amount && 
               t.categoryId === tx.categoryId && 
               t.type === tx.type &&
               (t.isRecurring || t.parcelado);
      };
      
      let newState = prev;
      if (cascadeMode === 'all') {
         const idsToDelete = newState.transactions.filter(isMatch).map(t => t.id);
         for (const tId of idsToDelete) {
           newState = removeTransactionFromState(newState, tId);
         }
      } else if (cascadeMode === 'future') {
         const txDate = new Date(tx.date).getTime();
         const idsToDelete = newState.transactions.filter(t => isMatch(t) && new Date(t.date).getTime() >= txDate).map(t => t.id);
         for (const tId of idsToDelete) {
           newState = removeTransactionFromState(newState, tId);
         }
      }
      return newState;
    });
  };

  const addCard = (cardData: Omit<CreditCard, 'id' | 'currentInvoiceBalance'>) => {
    const newCard: CreditCard = {
      ...cardData,
      id: generateId(),
      currentInvoiceBalance: 0,
    };
    setData(prev => ({ ...prev, cards: [...prev.cards, newCard] }));
  };

  const payInvoice = (faturaId: string) => {
    setData(prev => {
      const fatura = (prev.faturas || []).find(f => f.id === faturaId);
      if (!fatura || fatura.status === 'paga') return prev;

      const card = prev.cards.find(c => c.id === fatura.cartaoId);
      if (!card) return prev;

      const invoiceTotal = fatura.valorTotal;

      const paymentTxId = generateId();
      const paymentTx: Transaction = {
        id: paymentTxId,
        type: 'expense',
        amount: invoiceTotal,
        date: new Date().toISOString(),
        description: `Fatura ${card.name} — ${String(fatura.referenciaMes + 1).padStart(2, '0')}/${fatura.referenciaAno}`,
        categoryId: 'c_ajuste_neg',
        accountId: 'conta_unica',
        isRecurring: false,
        status: 'paid',
      };

      const newState = { ...prev };
      newState.transactions = [...newState.transactions, paymentTx];
      newState.balance -= invoiceTotal;
      
      newState.faturas = newState.faturas.map(f => 
        f.id === faturaId ? { ...f, status: 'paga', pagoEm: paymentTx.date, paymentTxId } : f
      );

      return newState;
    });
  };

  const unpayInvoice = (faturaId: string) => {
    setData(prev => {
      const fatura = (prev.faturas || []).find(f => f.id === faturaId);
      if (!fatura || fatura.status !== 'paga') return prev;

      const newState = { ...prev };
      
      if (fatura.paymentTxId) {
        const tx = newState.transactions.find(t => t.id === fatura.paymentTxId);
        if (tx) {
          newState.transactions = newState.transactions.filter(t => t.id !== fatura.paymentTxId);
          newState.balance += tx.amount;
        }
      } else {
        // Fallback for older paid invoices
        const card = prev.cards.find(c => c.id === fatura.cartaoId);
        if (card) {
          const expectedDesc = `Fatura ${card.name} — ${String(fatura.referenciaMes + 1).padStart(2, '0')}/${fatura.referenciaAno}`;
          const txIndex = newState.transactions.findIndex(t => t.description === expectedDesc && t.date === fatura.pagoEm && t.amount === fatura.valorTotal);
          if (txIndex !== -1) {
            const tx = newState.transactions[txIndex];
            newState.transactions.splice(txIndex, 1);
            newState.balance += tx.amount;
          }
        }
      }

      newState.faturas = newState.faturas.map(f => {
        if (f.id === faturaId) {
          const rest = { ...f, status: 'aberta' as const };
          delete rest.pagoEm;
          delete rest.paymentTxId;
          return rest;
        }
        return f;
      });

      return newState;
    });
  };

  const toggleTransactionStatus = (id: string) => {
    setData(prev => {
      const txIndex = prev.transactions.findIndex(t => t.id === id);
      if (txIndex === -1) return prev;
      
      const tx = prev.transactions[txIndex];
      // Apenas transações de carteira (sem cartaoId) ou faturas podem ter status modificado desta forma, mas faturas no contexto de itens não deveriam. 
      // Com base na regra, cartaoId desabilita alteração de status direto no item, então nem deveria chegar aqui, mas vamos proteger:
      if (tx.cartaoId) return prev;

      const newStatus = tx.status === 'paid' ? 'pending' : 'paid';
      
      const newState = { ...prev };
      newState.transactions = [...newState.transactions];
      newState.transactions[txIndex] = { ...tx, status: newStatus };

      if (tx.accountId === 'conta_unica') {
        if (newStatus === 'paid') {
          if (tx.type === 'income') newState.balance += tx.amount;
          if (tx.type === 'expense') newState.balance -= tx.amount;
        } else {
          if (tx.type === 'income') newState.balance -= tx.amount;
          if (tx.type === 'expense') newState.balance += tx.amount;
        }
      }

      return newState;
    });
  };

  const addGoalProgress = (goalId: string, month: string, amount: number, isFullyPaid: boolean = false) => {
    setData(prev => {
      const goals = prev.goals.map(g => {
        if (g.id !== goalId) return g;
        
        const existingProgress = g.progress.find(p => p.month === month);
        const filteredProgress = g.progress.filter(p => p.month !== month);
        
        const currentSaved = existingProgress ? existingProgress.amountSaved : 0;
        const newTotalSaved = currentSaved + amount;

        filteredProgress.push({
          month,
          status: isFullyPaid ? 'paid' : (existingProgress?.status && existingProgress.status !== 'skipped' ? existingProgress.status : 'pending'),
          amountSaved: newTotalSaved
        });
        
        return { ...g, progress: filteredProgress };
      });
      return { ...prev, goals };
    });
  };

  const setGoalProgress = (goalId: string, month: string, newAmountSaved: number, isFullyPaid: boolean = false) => {
    setData(prev => {
      const goals = prev.goals.map(g => {
        if (g.id !== goalId) return g;
        
        const filteredProgress = g.progress.filter(p => p.month !== month);
        
        const newStatus = isFullyPaid ? 'paid' : 'pending';
        // If they just removed the money but the month was skipped, resetting the amount doesn't change it to skipped 
        // unless they explicitly skip it again. It returns to 'pending'.

        filteredProgress.push({
          month,
          status: newStatus as 'paid' | 'pending',
          amountSaved: newAmountSaved
        });
        
        return { ...g, progress: filteredProgress };
      });
      return { ...prev, goals };
    });
  };

  const skipGoalMonth = (goalId: string, month: string, skipType: 'rollover' | 'extend') => {
    setData(prev => {
      const goals = prev.goals.map(g => {
        if (g.id !== goalId) return g;
        
        const existingProgress = g.progress.find(p => p.month === month);
        const filteredProgress = g.progress.filter(p => p.month !== month);
        
        filteredProgress.push({
          month,
          status: 'skipped',
          amountSaved: existingProgress ? existingProgress.amountSaved : 0,
          skipType
        });
        
        return { ...g, progress: filteredProgress };
      });
      return { ...prev, goals };
    });
  };

  useEffect(() => {
    setData(prev => {
      let needsUpdate = false;
      const updated = { ...prev };
      
      if (!updated.faturas) { updated.faturas = []; needsUpdate = true; }
      if (!updated.parcelas) { updated.parcelas = []; needsUpdate = true; }

      if ('tags' in updated && !updated.people) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updated.people = (updated as any).tags || initialData.people;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (updated as any).tags;
        needsUpdate = true;
      }
      if (!updated.people) {
        updated.people = initialData.people;
        needsUpdate = true;
      }

      if (!updated.invoicePayments) {
        updated.invoicePayments = [];
        needsUpdate = true;
      }
      
      const existingIds = new Set((updated.categories || []).map(c => c.id));
      const missingDefaults = DEFAULT_CATEGORIES.filter(d => !existingIds.has(d.id));
      
      if (missingDefaults.length > 0 || !updated.categories) {
        updated.categories = [...(updated.categories || []), ...missingDefaults];
        needsUpdate = true;
      }

      const colorMigrationDone = localStorage.getItem('_colorMigrationV2');
      if (!colorMigrationDone) {
        const defaultMap = new Map(DEFAULT_CATEGORIES.map(d => [d.id, d]));
        updated.categories = updated.categories.map(c => {
          const def = defaultMap.get(c.id);
          if (def) return { ...c, color: def.color };
          return c;
        });
        localStorage.setItem('_colorMigrationV2', '1');
        needsUpdate = true;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasIcon = updated.categories.some((c: any) => 'icon' in c);
      if (hasIcon) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updated.categories = updated.categories.map((c: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { icon, ...rest } = c;
          return rest;
        });
        needsUpdate = true;
      }

      if (updated.cards && updated.cards.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cardsNeedMigration = updated.cards.some((c: any) => 'icon' in c || !c.color);
        if (cardsNeedMigration) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          updated.cards = updated.cards.map((c: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { icon, ...rest } = c;
            return { ...rest, color: rest.color || '#8A05BE' };
          });
          needsUpdate = true;
        }
      }

      return needsUpdate ? updated : prev;
    });
  }, [setData]);

  return (
    <FinanceContext.Provider value={{ data, setData, currentMonth, setCurrentMonth, addTransaction, addTransactionsBatch, editTransaction, deleteTransaction, addCard, payInvoice, unpayInvoice, toggleTransactionStatus, addGoalProgress, setGoalProgress, skipGoalMonth }}>
      {children}
    </FinanceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
