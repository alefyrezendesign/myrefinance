import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, CheckCircle2, Calendar, 
  AlignLeft, Bookmark, 
  Pin, Repeat, ChevronRight, ChevronDown, ChevronUp, User, Mic, CreditCard, Receipt, Pencil, Wallet, X
} from 'lucide-react';
import { addMonths, addDays, addWeeks, addYears } from 'date-fns';
import { useFinance } from '../../context/FinanceContext';
import { DeleteRecurrenceModal } from './DeleteRecurrenceModal';
import { generateId } from '../../utils/generateId';
import type { Transaction } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { modalOverlayVariants, bottomSheetVariants } from '../../styles/motion';
import styles from './TransactionModal.module.css';

interface TransactionModalProps {
  isOpen: boolean;
  type: 'income' | 'expense' | null;
  onClose: () => void;
  editTransactionId?: string;
}

export function TransactionModal({ isOpen, type, onClose, editTransactionId }: TransactionModalProps) {
  const { data, addTransaction, addTransactionsBatch, editTransaction, deleteTransaction } = useFinance();
  
  // Base States
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('conta_unica'); 
  const [observation, setObservation] = useState('');
  const [isFixed, setIsFixed] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [personId, setPersonId] = useState<string | undefined>(undefined);
  
  // Income specific
  const [isReceived, setIsReceived] = useState(true);
  const [isRepeat, setIsRepeat] = useState(false);
  const [repeatQuantity, setRepeatQuantity] = useState(2);
  const [repeatPeriod, setRepeatPeriod] = useState('Mensal');
  
  // Expense specific
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(2);
  const [invoiceMonth, setInvoiceMonth] = useState('');

  // Inline dropdown state (replaces full-screen overlays for account + person)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [showRecurrenceOptions, setShowRecurrenceOptions] = useState(false);

  // Category still uses full-screen (many items)
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  // Close dropdowns on outside click
  const accountDropdownRef = useRef<HTMLDivElement>(null);
  const personDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const invoiceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setShowAccountDropdown(false);
      }
      if (personDropdownRef.current && !personDropdownRef.current.contains(e.target as Node)) {
        setShowPersonDropdown(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setShowPeriodDropdown(false);
      }
      if (invoiceDropdownRef.current && !invoiceDropdownRef.current.contains(e.target as Node)) {
        setShowInvoiceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (editTransactionId) {
          const t = data.transactions.find(tx => tx.id === editTransactionId);
          if (t) {
            setAmount(t.amount.toString());
            setDescription(t.description);
            setCategoryId(t.categoryId);
            setAccountId(t.cartaoId || t.accountId);
            setObservation(t.observation || '');
            setPersonId(t.personId);
            setIsFixed(t.isRecurring);
            if (t.type === 'expense') {
              setIsInstallment(t.parcelado || false);
              setInstallmentsCount(t.quantidadeParcelas || 2);
              // Detect if it was a repeat (has seriesId, not installment, not fixed)
              if (t.seriesId && !t.parcelado && !t.isRecurring) {
                setIsRepeat(true);
                if (t.quantidadeParcelas) setRepeatQuantity(t.quantidadeParcelas);
              }
            } else {
              setIsReceived(t.status === 'paid');
              setIsRepeat(t.isRecurring);
              if (t.quantidadeParcelas) setRepeatQuantity(t.quantidadeParcelas);
            }
            setDate(t.date.split('T')[0]);
          }
        } else {
          setAmount('');
          setDescription('');
          setCategoryId('');
          setAccountId('conta_unica');
          setObservation('');
          setPersonId(undefined);
          setIsFixed(false);
          setIsReceived(true);
          setIsRepeat(false);
          setIsInstallment(false);
          setInvoiceMonth(new Date().toISOString().slice(0, 7));
          setDate(new Date().toISOString().split('T')[0]);
        }
        setShowAccountDropdown(false);
        setShowPersonDropdown(false);
        setShowCategorySelector(false);
      }, 0);
    }
  }, [isOpen, editTransactionId, data.transactions]);

  // Removed early return !isOpen

  const isExpense = type === 'expense';
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setAmount('');
      return;
    }
    const numValue = (parseInt(value, 10) / 100).toFixed(2);
    setAmount(numValue);
  };

  const formattedAmount = amount === '' ? '0,00' : amount.replace('.', ',');

  const handleSave = () => {
    const rawAmount = parseFloat(amount) || 0;
    if (rawAmount === 0 || !description || !categoryId) {
      alert('Preencha o valor, a descrição e a categoria.');
      return;
    }

    const isCard = isExpense && accountId !== 'conta_unica';

    const existingTx = editTransactionId ? data.transactions.find(t => t.id === editTransactionId) : null;

    const txData = {
      type: type as 'income' | 'expense',
      amount: rawAmount,
      date: new Date(date + 'T12:00:00').toISOString(),
      description,
      categoryId,
      personId: personId || null,
      accountId: isCard ? 'conta_unica' : accountId,
      cartaoId: isCard ? accountId : null,
      invoiceDate: isCard ? invoiceMonth : null,
      observation: observation || null,
      isRecurring: isFixed,
      isInvoicePayment: false,
      parcelado: isExpense ? isInstallment : isRepeat,
      quantidadeParcelas: isExpense 
        ? (isInstallment ? installmentsCount : (isRepeat ? repeatQuantity : null)) 
        : (isRepeat ? repeatQuantity : null),
      seriesId: existingTx ? existingTx.seriesId : null,
      status: (isFixed || isRepeat || isInstallment) ? 'pending' : (isExpense ? 'paid' : (isReceived ? 'paid' : 'pending')),
    };

    if (editTransactionId) {
      // Preserve userId, createdAt, and other DB-only fields from the existing transaction
      const preserved = {
        userId: existingTx?.userId,
        createdAt: existingTx?.createdAt,
      };
      editTransaction({ ...existingTx, ...txData, ...preserved, id: editTransactionId } as Transaction);
    } else {
      if (isCard && !isFixed && !isRepeat) {
        // Card simple purchase or manual installment (handled internally by FinanceContext)
        addTransaction(txData as Omit<Transaction, 'id'>);
      } else {
        // Wallet Transactions generate copies physically here
        const seriesId = generateId();
        if (isFixed) {
          // Fixed generates 60 monthly copies
          const batch: Omit<Transaction, 'id'>[] = [];
          for (let i = 0; i < 60; i++) {
            const d = addMonths(new Date(txData.date), i);
            
            let currentInvoiceDate = txData.invoiceDate;
            if (currentInvoiceDate) {
              const [iy, im] = currentInvoiceDate.split('-');
              const newInvDate = new Date(parseInt(iy), parseInt(im) - 1 + i, 1);
              currentInvoiceDate = `${newInvDate.getFullYear()}-${String(newInvDate.getMonth() + 1).padStart(2, '0')}`;
            }
            batch.push({ ...txData, seriesId, date: d.toISOString(), invoiceDate: currentInvoiceDate } as Omit<Transaction, 'id'>);
          }
          addTransactionsBatch(batch);
        } else if (isRepeat) {
          // Repeats by period limit (income or expense — same full value each time)
          const batch: Omit<Transaction, 'id'>[] = [];
          for (let i = 0; i < repeatQuantity; i++) {
            let d: Date;
            const baseDate = new Date(txData.date);
            if (repeatPeriod === 'Diário') d = addDays(baseDate, i);
            else if (repeatPeriod === 'Semanal') d = addWeeks(baseDate, i);
            else if (repeatPeriod === 'Anual') d = addYears(baseDate, i);
            else d = addMonths(baseDate, i); // Mensal (default)
            
            let currentInvoiceDate = txData.invoiceDate;
            if (currentInvoiceDate && (repeatPeriod === 'Mensal' || repeatPeriod === 'Anual')) {
              const [iy, im] = currentInvoiceDate.split('-');
              const mOffset = repeatPeriod === 'Anual' ? i * 12 : i;
              const newInvDate = new Date(parseInt(iy), parseInt(im) - 1 + mOffset, 1);
              currentInvoiceDate = `${newInvDate.getFullYear()}-${String(newInvDate.getMonth() + 1).padStart(2, '0')}`;
            }
            
            batch.push({ ...txData, seriesId, date: d.toISOString(), invoiceDate: currentInvoiceDate } as Omit<Transaction, 'id'>);
          }
          addTransactionsBatch(batch);
        } else if (isExpense && isInstallment) {
          // Wallet expense manual installments
          const batch: Omit<Transaction, 'id'>[] = [];
          const splitAmount = parseFloat((rawAmount / installmentsCount).toFixed(2));
          for (let i = 0; i < installmentsCount; i++) {
            const d = addMonths(new Date(txData.date), i);
            batch.push({ 
              ...txData, 
              amount: splitAmount, 
              seriesId,
              date: d.toISOString(),
              description: `${txData.description} (${i + 1}/${installmentsCount})` // Distinguishes them natively
            } as Omit<Transaction, 'id'>);
          }
          addTransactionsBatch(batch);
        } else {
          addTransaction(txData as Omit<Transaction, 'id'>);
        }
      }
    }
    
    onClose();
  };

  const handleDelete = () => {
    if (!editTransactionId) return;
    const tx = data.transactions.find(t => t.id === editTransactionId);
    
    const isCardTx = !!tx?.cartaoId;
    const looksRecurring = tx?.seriesId || tx?.isRecurring || tx?.parcelado;

    if (looksRecurring && !isCardTx) {
      setShowRecurrenceOptions(true);
      return;
    }
    
    if (isCardTx) {
       if (window.confirm('Excluir esta parcela apagará a compra inteira do cartão. Tem certeza?')) {
         deleteTransaction(editTransactionId);
         onClose();
       }
       return;
    }
    
    if (window.confirm('Tem certeza que deseja excluir?')) {
      deleteTransaction(editTransactionId);
      onClose();
    }
  };

  const handleRecurrenceDelete = (mode: 'this' | 'future' | 'all') => {
    if (editTransactionId) {
      deleteTransaction(editTransactionId, mode);
      setShowRecurrenceOptions(false);
      onClose();
    }
  };

  const filteredCategories = data.categories.filter(c => c.type === type);
  const selectedCategory = data.categories.find(c => c.id === categoryId);
  const selectedPerson = data.people.find(p => p.id === personId);
  const selectedAccount = accountId === 'conta_unica' ? null : data.cards.find(c => c.id === accountId);

  // Installment value preview
  const rawAmount = parseFloat(amount) || 0;
  const installmentValue = isInstallment && installmentsCount > 0 ? rawAmount / installmentsCount : 0;
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <AnimatePresence>
      {isOpen && type && (
        <motion.div 
          className={styles.overlay}
          variants={modalOverlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div 
            className={styles.modalContent}
            variants={bottomSheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}><ArrowLeft size={24} /></button>
          <span className={styles.headerTitle}>
            Nova {isExpense ? 'despesa' : 'receita'}
          </span>
          <div style={{ width: 40 }} />
        </header>

        <section className={styles.amountSection}>
          <div className={styles.amountLabelRow}>
            <span className={styles.amountLabel}>Valor da {isExpense ? 'despesa' : 'receita'}</span>
          </div>
          <div className={styles.amountInputWrapper}>
            <div className={styles.currencyBlock}>
              <span className={styles.currencySymbol}>R$</span>
              <input 
                type="text" 
                className={styles.amountInput}
                value={formattedAmount}
                onChange={handleAmountChange}
                inputMode="numeric"
                placeholder="0,00"
              />
            </div>
            <span className={styles.currencyCode}>BRL</span>
          </div>
        </section>

        <div className={`${styles.formBody} no-scrollbar`}>
          <div className={styles.listContainer}>
            
            {/* INCOME ONLY: Recebido */}
            {!isExpense && (
              <div className={styles.listItem}>
                <div className={styles.listIcon}>
                  <CheckCircle2 size={24} />
                </div>
                <div className={styles.listContent}>
                  <span className={styles.listText}>Recebido</span>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={isReceived} onChange={() => setIsReceived(!isReceived)} />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            )}

            {/* Date */}
            <div className={styles.listItem}>
              <div className={styles.listIcon}>
                <Calendar size={24} />
              </div>
              <div className={styles.listContent}>
                <input 
                  type="date" 
                  className={styles.dateInput}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Descrição */}
            <div className={styles.listItem}>
              <div className={styles.listIcon}>
                {isExpense ? <Mic size={24} /> : <AlignLeft size={24} />}
              </div>
              <div className={styles.listContent}>
                <input 
                  type="text" 
                  className={styles.textInput} 
                  placeholder="Descrição" 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Categoria (full screen for many items) */}
            <div className={styles.listItem} onClick={() => setShowCategorySelector(true)}>
              <div className={styles.listIcon}>
                <Bookmark size={24} />
              </div>
              <div className={styles.listContent}>
                <button className={styles.pillSelector}>
                  <span className={styles.colorDot} style={{ backgroundColor: selectedCategory ? selectedCategory.color : '#555' }} />
                  <span>{selectedCategory ? selectedCategory.name : 'Selecionar Categoria'}</span>
                </button>
                <ChevronRight size={20} className={styles.listChevron} />
              </div>
            </div>

            {/* Conta - Inline Dropdown */}
            {isExpense && (
              <div className={styles.listItem} style={{ position: 'relative' }} ref={accountDropdownRef}>
                <div className={styles.listIcon}>
                  {accountId === 'conta_unica' ? <Wallet size={24} /> : <CreditCard size={24} />}
                </div>
                <div className={styles.listContent} onClick={() => setShowAccountDropdown(!showAccountDropdown)}>
                  <button className={styles.pillSelector}>
                    {accountId === 'conta_unica' 
                      ? <Wallet size={16} color="#1E88E5" />
                      : <CreditCard size={16} color={selectedAccount?.color || '#8A05BE'} />
                    }
                    <span>{accountId === 'conta_unica' ? 'Carteira' : (selectedAccount?.name || 'Cartão')}</span>
                  </button>
                  <ChevronDown size={20} className={styles.listChevron} style={{ transform: showAccountDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                {showAccountDropdown && (
                  <div className={styles.inlineDropdown}>
                    <div 
                      className={`${styles.dropdownItem} ${accountId === 'conta_unica' ? styles.dropdownItemActive : ''}`}
                      onClick={() => { setAccountId('conta_unica'); setInvoiceMonth(''); setShowAccountDropdown(false); }}
                    >
                      <Wallet size={16} color="#1E88E5" />
                      <span>Carteira</span>
                    </div>
                    {data.cards.map(c => (
                      <div 
                        key={c.id} 
                        className={`${styles.dropdownItem} ${accountId === c.id ? styles.dropdownItemActive : ''}`}
                        onClick={() => { 
                          setAccountId(c.id); 
                          if (!invoiceMonth) setInvoiceMonth(new Date().toISOString().slice(0, 7));
                          setShowAccountDropdown(false); 
                        }}
                      >
                        <CreditCard size={16} color={c.color || '#8A05BE'} />
                        <span>{c.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fatura (If Card selected) */}
            {isExpense && accountId !== 'conta_unica' && (
              <div className={styles.listItem} style={{ position: 'relative' }} ref={invoiceDropdownRef}>
                <div className={styles.listIcon}>
                  <Receipt size={24} />
                </div>
                <div className={styles.listContent} onClick={() => setShowInvoiceDropdown(!showInvoiceDropdown)}>
                  <span className={styles.listText}>
                    Fatura de {invoiceMonth 
                      ? new Date(invoiceMonth + '-01T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                      : '—'}
                  </span>
                  <ChevronDown size={20} className={styles.listChevron} style={{ transform: showInvoiceDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
                {showInvoiceDropdown && (
                  <div className={styles.inlineDropdown}>
                    {Array.from({ length: 12 }, (_, i) => {
                      const d = new Date();
                      d.setMonth(d.getMonth() + i - 1);
                      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                      return (
                        <div
                          key={val}
                          className={`${styles.dropdownItem} ${invoiceMonth === val ? styles.dropdownItemActive : ''}`}
                          onClick={() => { setInvoiceMonth(val); setShowInvoiceDropdown(false); }}
                        >
                          <span style={{ textTransform: 'capitalize' }}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* EXPENSE ONLY: Parcelado */}
            {isExpense && (
              <div className={styles.listItem}>
                <div className={styles.listIcon}>
                  <Repeat size={24} />
                </div>
                <div className={styles.listContent} style={{ borderBottom: isInstallment ? 'none' : ''}}>
                  <span className={styles.listText}>Parcelado</span>
                  <label className={styles.switch}>
                    <input type="checkbox" checked={isInstallment} onChange={() => {
                      const val = !isInstallment;
                      setIsInstallment(val);
                      if (val) { setIsFixed(false); setIsRepeat(false); }
                    }} />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>
            )}

            {/* Parcelado Expanded + Valor da Parcela */}
            {isExpense && isInstallment && (
              <div className={styles.repeatExpanded}>
                <div className={styles.repeatRow}>
                  <div className={styles.repeatIcon}><Repeat size={20} /></div>
                  <div className={styles.repeatField}>
                    <span>Parcelas</span>
                    <div className={styles.quantityControl}>
                      <ChevronDown size={20} onClick={() => setInstallmentsCount(Math.max(2, installmentsCount - 1))} />
                      <span>{installmentsCount}x</span>
                      <ChevronUp size={20} onClick={() => setInstallmentsCount(installmentsCount + 1)} />
                    </div>
                  </div>
                </div>
                {rawAmount > 0 && (
                  <div className={styles.installmentPreview}>
                    {installmentsCount}x de <strong>{formatCurrency(installmentValue)}</strong>
                  </div>
                )}
              </div>
            )}

            {/* EXPENSE ONLY: Repetir */}
            {isExpense && (
              <>
                <div className={styles.listItem}>
                  <div className={styles.listIcon}>
                    <Repeat size={24} />
                  </div>
                  <div className={styles.listContent} style={{ borderBottom: isRepeat ? 'none' : ''}}>
                    <span className={styles.listText}>Repetir</span>
                    <label className={styles.switch}>
                      <input type="checkbox" checked={isRepeat} onChange={() => {
                        const val = !isRepeat;
                        setIsRepeat(val);
                        if (val) { setIsFixed(false); setIsInstallment(false); }
                      }} />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>
                {isRepeat && (
                  <div className={styles.repeatExpanded}>
                    <p className={styles.repeatLabel}>Como sua despesa se repete?</p>
                    <div className={styles.repeatRow}>
                      <div className={styles.repeatIcon}><Repeat size={20} /></div>
                      <div className={styles.repeatField}>
                        <span>Quantidade</span>
                        <div className={styles.quantityControl}>
                          <ChevronDown size={20} onClick={() => setRepeatQuantity(Math.max(2, repeatQuantity - 1))} />
                          <span>{repeatQuantity}</span>
                          <ChevronUp size={20} onClick={() => setRepeatQuantity(repeatQuantity + 1)} />
                        </div>
                      </div>
                    </div>
                    <div className={styles.repeatRow} style={{ position: 'relative' }} ref={periodDropdownRef}>
                      <div className={styles.repeatIcon}><Repeat size={20} /></div>
                      <div className={styles.repeatField} onClick={() => setShowPeriodDropdown(!showPeriodDropdown)} style={{ cursor: 'pointer' }}>
                        <span>Período</span>
                        <div className={styles.periodControl}>
                          <span>{repeatPeriod}</span>
                          <ChevronDown size={16} style={{ transform: showPeriodDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                      </div>
                      {showPeriodDropdown && (
                        <div className={styles.inlineDropdown} style={{ left: 0, right: 0, top: '100%' }}>
                          {['Diário', 'Semanal', 'Mensal', 'Anual'].map(p => (
                            <div
                              key={p}
                              className={`${styles.dropdownItem} ${repeatPeriod === p ? styles.dropdownItemActive : ''}`}
                              onClick={() => { setRepeatPeriod(p); setShowPeriodDropdown(false); }}
                            >
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {rawAmount > 0 && (
                      <div className={styles.installmentPreview}>
                        {repeatQuantity}x de <strong>{formatCurrency(rawAmount)}</strong> (mesmo valor)
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Fixa */}
            <div className={styles.listItem}>
              <div className={styles.listIcon}>
                <Pin size={24} />
              </div>
              <div className={styles.listContent}>
                <span className={styles.listText}>{isExpense ? 'Despesa fixa' : 'Receita fixa'}</span>
                <label className={styles.switch}>
                  <input type="checkbox" checked={isFixed} onChange={() => {
                    const val = !isFixed;
                    setIsFixed(val);
                    if (val) {
                      setIsInstallment(false);
                      setIsRepeat(false);
                      if (!isExpense) setIsReceived(false);
                    }
                  }} />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>

            {/* INCOME ONLY: Repetir */}
            {!isExpense && (
              <>
                <div className={styles.listItem}>
                  <div className={styles.listIcon}>
                    <Repeat size={24} />
                  </div>
                  <div className={styles.listContent} style={{ borderBottom: isRepeat ? 'none' : ''}}>
                    <span className={styles.listText}>Repetir</span>
                    <label className={styles.switch}>
                      <input type="checkbox" checked={isRepeat} onChange={() => {
                        const val = !isRepeat;
                        setIsRepeat(val);
                        if (val) {
                          setIsFixed(false);
                          setIsReceived(false);
                        }
                      }} />
                      <span className={styles.slider}></span>
                    </label>
                  </div>
                </div>
                {isRepeat && (
                  <div className={styles.repeatExpanded}>
                    <p className={styles.repeatLabel}>Como sua transação se repete?</p>
                    <div className={styles.repeatRow}>
                      <div className={styles.repeatIcon}><Repeat size={20} /></div>
                      <div className={styles.repeatField}>
                        <span>Quantidade</span>
                        <div className={styles.quantityControl}>
                          <ChevronDown size={20} onClick={() => setRepeatQuantity(Math.max(2, repeatQuantity - 1))} />
                          <span>{repeatQuantity}</span>
                          <ChevronUp size={20} onClick={() => setRepeatQuantity(repeatQuantity + 1)} />
                        </div>
                      </div>
                    </div>
                    <div className={styles.repeatRow} style={{ position: 'relative' }} ref={periodDropdownRef}>
                      <div className={styles.repeatIcon}><Repeat size={20} /></div>
                      <div className={styles.repeatField} onClick={() => setShowPeriodDropdown(!showPeriodDropdown)} style={{ cursor: 'pointer' }}>
                        <span>Período</span>
                        <div className={styles.periodControl}>
                          <span>{repeatPeriod}</span>
                          <ChevronDown size={16} style={{ transform: showPeriodDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </div>
                      </div>
                      {showPeriodDropdown && (
                        <div className={styles.inlineDropdown} style={{ left: 0, right: 0, top: '100%' }}>
                          {['Diário', 'Semanal', 'Mensal', 'Anual'].map(p => (
                            <div
                              key={p}
                              className={`${styles.dropdownItem} ${repeatPeriod === p ? styles.dropdownItemActive : ''}`}
                              onClick={() => { setRepeatPeriod(p); setShowPeriodDropdown(false); }}
                            >
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Observação */}
            <div className={styles.listItem}>
              <div className={styles.listIcon}>
                <Pencil size={24} />
              </div>
              <div className={styles.listContent}>
                <input 
                  type="text" 
                  className={styles.textInput} 
                  placeholder="Observação" 
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                />
              </div>
            </div>

            {/* Pessoa - Inline Dropdown */}
            <div className={styles.listItem} style={{ position: 'relative' }} ref={personDropdownRef}>
              <div className={styles.listIcon}>
                <User size={24} />
              </div>
              <div className={styles.listContent} onClick={() => setShowPersonDropdown(!showPersonDropdown)}>
                <button className={styles.pillSelector} style={!selectedPerson ? { borderColor: '#4F4F6A', borderStyle: 'dashed', opacity: 0.8 } : {}}>
                  <div className={styles.pillIcon} style={{backgroundColor: '#2F2F3D'}}>
                    <User size={12} color="#7A7A8A"/>
                  </div>
                  <span style={!selectedPerson ? { color: '#7A7A8A' } : {}}>{selectedPerson ? selectedPerson.name : 'Vincular Pessoa'}</span>
                </button>
                <ChevronDown size={20} className={styles.listChevron} style={{ transform: showPersonDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {showPersonDropdown && (
                <div className={styles.inlineDropdown}>
                  {data.people.map(p => (
                    <div 
                      key={p.id} 
                      className={`${styles.dropdownItem} ${personId === p.id ? styles.dropdownItemActive : ''}`}
                      onClick={() => { setPersonId(p.id); setShowPersonDropdown(false); }}
                    >
                      <User size={16} color="#7A7A8A" />
                      <span>{p.name}</span>
                    </div>
                  ))}
                  {personId && (
                    <div 
                      className={styles.dropdownItem}
                      onClick={() => { setPersonId(undefined); setShowPersonDropdown(false); }}
                      style={{ justifyContent: 'center' }}
                    >
                      <X size={14} color="var(--color-primary-red)" />
                      <span style={{ color: 'var(--color-primary-red)', fontSize: 13 }}>Remover pessoa</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          </div>
        </div>

        <footer className={styles.footer}>
          {editTransactionId && (
            <button className={styles.deleteButton} onClick={handleDelete} style={{ backgroundColor: 'transparent', color: 'var(--color-primary-red)', padding: '16px', fontWeight: 600 }}>
              EXCLUIR
            </button>
          )}
          <button className={styles.saveButton} onClick={handleSave} style={{ flex: 1 }}>
            CONCLUÍDO
          </button>
        </footer>
      </motion.div>

      {/* Category Selector - Full Screen (many items) */}
      <AnimatePresence>
        {showCategorySelector && (
          <motion.div 
            className={styles.selectorOverlay}
            variants={modalOverlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
          <header className={styles.header}>
            <button className={styles.backBtn} onClick={() => setShowCategorySelector(false)}><ArrowLeft size={24} /></button>
            <span className={styles.headerTitle}>
              Selecionar Categoria
            </span>
            <div style={{ width: 40 }} />
          </header>
          
          <div className={`${styles.selectorList} no-scrollbar`}>
            {filteredCategories.map(c => (
              <div key={c.id} className={styles.selectorItem} onClick={() => { setCategoryId(c.id); setShowCategorySelector(false); }}>
                <span className={styles.colorDot} style={{ backgroundColor: c.color }} />
                <span>{c.name}</span>
              </div>
            ))}
            
            {categoryId && (
               <div className={styles.selectorEmpty} onClick={() => { setCategoryId(''); setShowCategorySelector(false); }}>
                 <span style={{color: 'var(--color-primary-red)'}}>Limpar Seleção</span>
               </div>
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteRecurrenceModal 
        isOpen={showRecurrenceOptions} 
        onClose={() => setShowRecurrenceOptions(false)}
        onConfirm={handleRecurrenceDelete}
      />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
