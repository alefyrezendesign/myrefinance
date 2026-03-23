export interface BaseEntity {
  id: string;
  userId?: string; // Futuro tenant ID
  createdAt?: string; // ISO DB default
  updatedAt?: string; // ISO DB default
}

export type TransactionType = 'income' | 'expense';

export interface Category extends BaseEntity {
  type: TransactionType;
  name: string;
  color: string;
  isProtected?: boolean; // Bloqueia edição/exclusão da main engine
}

export interface Person extends BaseEntity {
  name: string;
}

export interface CreditCard extends BaseEntity {
  name: string;
  color: string;
  limit: number;
  closingDay: number; 
  dueDay: number;     
  currentInvoiceBalance: number; // For Local MVP. On DB, derive from Fatura
}

export interface Transaction extends BaseEntity {
  type: TransactionType;
  amount: number; 
  date: string; 
  description: string;
  categoryId: string;
  
  accountId: string; // fallback if no card
  
  cartaoId?: string; 
  invoiceDate?: string; // "YYYY-MM"
  
  isRecurring: boolean;
  parcelado?: boolean;
  quantidadeParcelas?: number;
  
  parentId?: string; // original recurring master
  seriesId?: string; // group
  
  observation?: string;
  personId?: string;
  
  isInvoicePayment?: boolean; // True for auto-generated invoice payment transactions
  status: 'paid' | 'pending'; 
}

export interface FaturaCartao extends BaseEntity {
  cartaoId: string;
  referenciaAno: number;
  referenciaMes: number; 
  dataFechamento: string; 
  dataVencimento: string; 
  valorTotal: number;
  status: 'aberta' | 'fechada' | 'paga' | 'vencida';
  pagoEm?: string; 
  paymentTxId?: string; // Inverse link
}

export interface ParcelaCartao extends BaseEntity {
  lancamentoId: string; // ID da Transaction original (Wallet)
  cartaoId: string;
  faturaId: string;
  numeroParcela: number; 
  totalParcelas: number;
  valorParcela: number;
  dataCompra: string; 
  referenciaAno: number;
  referenciaMes: number; 
}

export interface GoalMonth {
  month: string; // 'YYYY-MM'
  status: 'paid' | 'skipped' | 'pending';
  amountSaved: number;
  skipType?: 'rollover' | 'extend';
}

export interface Goal extends BaseEntity {
  name: string;
  description?: string;
  targetAmount: number;
  durationMonths: number;
  startDate: string; 
  endDate: string; 
  progress: GoalMonth[];
}

export interface InvoicePayment extends BaseEntity {
  cardId: string;
  month: string; // 'YYYY-MM'
  paidAt: string; 
  transactionId: string; // Wallet expense ID
}

export interface BudgetLimit extends BaseEntity {
  categoryId: string;
  amount: number;
}

export interface FinanceData {
  balance: number;
  categories: Category[];
  people: Person[];
  cards: CreditCard[];
  transactions: Transaction[];
  faturas: FaturaCartao[];
  parcelas: ParcelaCartao[];
  invoicePayments: InvoicePayment[];
  goals: Goal[];
  limits: BudgetLimit[];
}
