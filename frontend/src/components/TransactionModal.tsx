import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Check, AlertCircle, X, Repeat } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { useVoiceForm } from '../hooks/useVoiceForm';
import { sendVoiceTransaction, sendVoiceTransactionUpdate } from '../services/voiceService';
import { getAccounts } from '../services/accountService';
import { getCreditCards } from '../services/creditCardService';
import { getRecurringInstances } from '../services/transactionService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Transaction, Category, Account, CreditCard } from '../types';
import { cn } from '../utils/cn';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  categories: Category[];
  onSave: (transaction: Partial<Transaction>) => void;
  onVoiceUpdate?: (updates: Partial<Transaction>) => void;
  userId: string;
  autoStartRecording?: boolean;
}

export function TransactionModal({
  isOpen,
  onClose,
  transaction,
  categories,
  onSave,
  onVoiceUpdate,
  userId,
  autoStartRecording = false,
}: TransactionModalProps) {
  const { t, i18n } = useTranslation();
  const isEditing = !!transaction;

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense' | 'transfer',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [recurrenceDay, setRecurrenceDay] = useState<number | ''>('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');
  const [recurringCount, setRecurringCount] = useState<number | ''>('');
  const [recurringMode, setRecurringMode] = useState<'count' | 'date'>('date');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>('');
  
  // Credit card states
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card'>('account');

  // Estados para edição em massa de transações recorrentes
  const [editMode, setEditMode] = useState<'single' | 'forward' | 'all'>('forward');
  const [affectedCount, setAffectedCount] = useState<number>(0);
  const [seriesTransactions, setSeriesTransactions] = useState<Transaction[]>([]);

  const voice = useVoiceForm({ autoStartRecording });

  useEffect(() => {
    if (isOpen && userId) {
      const fetchAccounts = async () => {
        try {
          const userAccounts = await getAccounts(userId);
          const sortedAccounts = userAccounts.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          );
          setAccounts(sortedAccounts);

          if (transaction?.accountId) {
            setSelectedAccountId(transaction.accountId);
          } else {
            const defaultAccount = userAccounts.find(acc => acc.isDefault);
            if (defaultAccount) setSelectedAccountId(defaultAccount.id);
          }
          if (transaction?.toAccountId) {
            setSelectedToAccountId(transaction.toAccountId);
          }
        } catch (error) {
          console.error('Error fetching accounts:', error);
        }
      };
      
      const fetchCreditCards = async () => {
        try {
          const userCreditCards = await getCreditCards(userId);
          setCreditCards(userCreditCards);
          
          if (transaction?.creditCardId) {
            setSelectedCreditCardId(transaction.creditCardId);
            setPaymentMethod('credit_card');
          }
        } catch (error) {
          console.error('Error fetching credit cards:', error);
        }
      };
      
      fetchAccounts();
      fetchCreditCards();
    }
  }, [isOpen, userId, transaction]);

  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description || '',
        amount: transaction.amount?.toString() || '',
        type: transaction.type || 'expense',
        categoryId: transaction.categoryId || '',
        date: transaction.date || new Date().toISOString().split('T')[0],
      });
      setIsRecurring(transaction.isRecurring || false);
      setRecurrencePattern(transaction.recurrencePattern || 'monthly');
      setRecurrenceDay(transaction.recurrenceDay ?? '');
      setRecurrenceEndDate(transaction.recurrenceEndDate || '');
      setRecurringCount(transaction.recurringCount ?? '');
      setRecurringMode(transaction.recurringCount ? 'count' : 'date');
    } else {
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        categoryId: '',
        date: new Date().toISOString().split('T')[0],
      });
      setIsRecurring(false);
      setRecurrencePattern('monthly');
      setRecurrenceDay('');
      setRecurrenceEndDate('');
      setRecurringCount('');
      setRecurringMode('date');
      setSelectedToAccountId('');
      setSelectedCreditCardId('');
      setPaymentMethod('account');
    }
    voice.resetVoice();
  }, [transaction, isOpen]);

  // Load series transactions when editing a recurring transaction
  useEffect(() => {
    const loadSeriesData = async () => {
      if (isEditing && transaction && userId) {
        const isRecurringTransaction = transaction.isRecurring ||
          transaction.parentTransactionId ||
          transaction.isRecurringInstance;

        if (isRecurringTransaction) {
          const parentId = transaction.parentTransactionId || transaction.id;
          try {
            const instances = await getRecurringInstances(userId, parentId);
            // Include parent transaction in the series
            const allSeries = transaction.parentTransactionId
              ? instances // If editing a child, instances already include parent
              : instances;
            setSeriesTransactions(allSeries);
            
            // Set default edit mode to 'single' for child instances
            if (transaction.parentTransactionId || transaction.isRecurringInstance) {
              setEditMode('single');
            } else {
              setEditMode('forward');
            }
          } catch (error) {
            console.error('Error loading series data:', error);
            setSeriesTransactions([]);
          }
        } else {
          setSeriesTransactions([]);
        }
      } else {
        setSeriesTransactions([]);
        setEditMode('forward');
        setAffectedCount(0);
      }
    };

    loadSeriesData();
  }, [isEditing, transaction, userId]);

  // Calculate affected count when editMode or series changes
  useEffect(() => {
    if (isEditing && seriesTransactions.length > 0 && transaction) {
      const currentInstallment = transaction.installmentNumber || 1;

      if (editMode === 'single') {
        setAffectedCount(1);
      } else if (editMode === 'forward') {
        const count = seriesTransactions.filter(
          (t) => (t.installmentNumber || 1) >= currentInstallment
        ).length;
        setAffectedCount(count);
      } else if (editMode === 'all') {
        setAffectedCount(seriesTransactions.length);
      }
    }
  }, [editMode, seriesTransactions, transaction, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure type is valid
    let validType = formData.type;
    const lowerType = String(formData.type).toLowerCase();

    if (lowerType === 'receita' || lowerType === 'income' || lowerType === 'entrada') {
      validType = 'income';
    } else if (lowerType === 'transfer' || lowerType === 'transferencia' || lowerType === 'transferência' || lowerType === 'saque') {
      validType = 'transfer';
    } else {
      validType = 'expense';
    }

    const transactionData: Partial<Transaction> = {
      ...formData,
      type: validType,
      amount: parseFloat(formData.amount.toString().replace(',', '.')),
    };
    
    // Add credit card or account info based on payment method
    if (paymentMethod === 'credit_card' && selectedCreditCardId) {
      transactionData.creditCardId = selectedCreditCardId;
      // Don't set accountId for credit card transactions
    } else {
      transactionData.accountId = selectedAccountId || undefined;
      if (validType === 'transfer') {
        transactionData.toAccountId = selectedToAccountId || undefined;
      }
    }

    if (isRecurring && !isEditing) {
      transactionData.isRecurring = true;
      transactionData.recurrencePattern = recurrencePattern;
      if (recurrenceDay !== '') {
        transactionData.recurrenceDay = recurrenceDay;
      }
      if (recurrenceEndDate) {
        transactionData.recurrenceEndDate = recurrenceEndDate;
      }
      // Só adicionar recurringCount se tiver valor válido (>= 2)
      if (recurringCount !== '' && recurringCount >= 2) {
        transactionData.recurringCount = recurringCount;
      }
    }

    // Adicionar editMode quando estiver editando transação recorrente
    if (isEditing) {
      const isRecurringTransaction = transaction?.isRecurring ||
        transaction?.parentTransactionId ||
        transaction?.isRecurringInstance;

      if (isRecurringTransaction) {
        (transactionData as Record<string, unknown>).editMode = editMode;
      }
    }

    onSave(transactionData);
  };

  const getMaxDay = () => {
    switch (recurrencePattern) {
      case 'weekly': return 7;
      case 'monthly': return 31;
      case 'yearly': return 366;
      default: return 31;
    }
  };

  const getDayLabel = () => {
    switch (recurrencePattern) {
      case 'weekly': return t('transactions.form.recurrenceDayWeekly') || 'Day of Week (1-7)';
      case 'monthly': return t('transactions.form.recurrenceDayMonthly') || 'Day of Month (1-31)';
      case 'yearly': return t('transactions.form.recurrenceDayYearly') || 'Day of Year (1-366)';
      default: return t('transactions.form.recurrenceDay') || 'Day';
    }
  };

  // Calculate recurringCount from start date and end date based on recurrence pattern
  const calculateRecurringCount = (startDateStr: string, endDateStr: string, pattern: string): number => {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    let count = 1; // Include the first transaction

    const currentDate = new Date(startDate);

    while (currentDate < endDate) {
      switch (pattern) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        case 'monthly':
        default:
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
      if (currentDate <= endDate) {
        count++;
      }
    }

    return count;
  };

  // Calculate end date from start date and recurring count based on recurrence pattern
  const calculateEndDate = (startDateStr: string, count: number, pattern: string): string => {
    const startDate = new Date(startDateStr);
    const currentDate = new Date(startDate);

    // Subtract 1 because the first transaction is already counted
    for (let i = 0; i < count - 1; i++) {
      switch (pattern) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
        case 'monthly':
        default:
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }

    return currentDate.toISOString().split('T')[0];
  };

  // Handle recurringCount change
  const handleRecurringCountChange = (value: string) => {
    const count = value === '' ? '' : Math.max(2, Math.min(60, parseInt(value) || 2));
    setRecurringCount(count);

    // Auto-calculate end date if count is valid
    if (count !== '' && count >= 2 && count <= 60) {
      const newEndDate = calculateEndDate(formData.date, count, recurrencePattern);
      setRecurrenceEndDate(newEndDate);
    }
  };

  // Handle recurrenceEndDate change
  const handleRecurrenceEndDateChange = (value: string) => {
    setRecurrenceEndDate(value);

    // Auto-calculate recurring count if date is valid and after start date
    if (value && value > formData.date) {
      const count = calculateRecurringCount(formData.date, value, recurrencePattern);
      setRecurringCount(count);
    } else {
      setRecurringCount('');
    }
  };

  // Handle recurrencePattern change - recalculate if needed
  const handleRecurrencePatternChange = (newPattern: 'monthly' | 'weekly' | 'yearly') => {
    setRecurrencePattern(newPattern);
    setRecurrenceDay('');

    // Recalculate based on current mode
    if (recurringMode === 'count' && recurringCount !== '' && recurringCount >= 2) {
      const newEndDate = calculateEndDate(formData.date, recurringCount, newPattern);
      setRecurrenceEndDate(newEndDate);
    } else if (recurringMode === 'date' && recurrenceEndDate && recurrenceEndDate > formData.date) {
      const count = calculateRecurringCount(formData.date, recurrenceEndDate, newPattern);
      setRecurringCount(count);
    }
  };

  const handleVoiceInput = useCallback(async () => {
    if (voice.voiceState === 'recording') {
      const audioBlob = await voice.stopRecording();
      if (audioBlob) {
        voice.setProcessing(true);
        try {
          const result = await sendVoiceTransaction(audioBlob, i18n.language);
          if (result.success && result.data) {
            const parsedTransaction = result.data;

            // Normalize type
            let normalizedType = parsedTransaction.type || formData.type;
            if (parsedTransaction.type) {
              const t = String(parsedTransaction.type).toLowerCase();
              if (t.includes('receita') || t.includes('income')) normalizedType = 'income';
              else if (t.includes('transfer') || t.includes('transferencia') || t.includes('saque')) normalizedType = 'transfer';
              else if (t.includes('despesa') || t.includes('expense')) normalizedType = 'expense';
            }

            // For transfers: auto-fill missing toAccountId and categoryId
            let finalCategoryId = parsedTransaction.categoryId;
            let finalToAccountId = parsedTransaction.toAccountId || '';

            if (normalizedType === 'transfer') {
              // If GPT didn't return a toAccountId, auto-select cash account for the source currency
              if (!finalToAccountId && parsedTransaction.accountId) {
                const sourceAccount = accounts.find(a => a.id === parsedTransaction.accountId);
                if (sourceAccount) {
                  const cashAccount = accounts.find(a => a.isCash === true && a.currency === sourceAccount.currency);
                  if (cashAccount) finalToAccountId = cashAccount.id;
                }
              }
              // If GPT didn't return a categoryId, auto-select the best transfer category
              if (!finalCategoryId) {
                const desc = (parsedTransaction.description || '').toLowerCase();
                const isWithdrawal = desc.includes('saque') || desc.includes('withdraw') || desc.includes('retir');
                const withdrawalCategory = categories.find(c => c.type === 'transfer' && c.name === 'Withdrawal');
                const genericTransferCategory = categories.find(c => c.type === 'transfer' && c.name === 'Transfer');
                if (isWithdrawal && withdrawalCategory) {
                  finalCategoryId = withdrawalCategory.id;
                } else {
                  finalCategoryId = (genericTransferCategory || categories.find(c => c.type === 'transfer'))?.id || '';
                }
              }
            }

            setFormData(prev => ({
              ...prev,
              description: parsedTransaction.description || prev.description,
              amount: parsedTransaction.amount?.toString() || prev.amount,
              type: normalizedType as 'income' | 'expense' | 'transfer',
              categoryId: finalCategoryId || prev.categoryId,
              date: parsedTransaction.date || prev.date,
            }));
            if (parsedTransaction.accountId) {
              setSelectedAccountId(parsedTransaction.accountId);
            } else {
              // Fall back to the default account when voice doesn't specify one
              const defaultAccount = accounts.find(a => a.isDefault);
              if (defaultAccount) setSelectedAccountId(defaultAccount.id);
            }
            if (finalToAccountId) setSelectedToAccountId(finalToAccountId);

            if (parsedTransaction.isRecurring) {
              setIsRecurring(true);
              if (parsedTransaction.recurrencePattern) setRecurrencePattern(parsedTransaction.recurrencePattern);
              if (parsedTransaction.recurrenceDay !== undefined && parsedTransaction.recurrenceDay !== null) setRecurrenceDay(parsedTransaction.recurrenceDay);
              if (parsedTransaction.recurrenceEndDate) setRecurrenceEndDate(parsedTransaction.recurrenceEndDate);
            }

            voice.setVoiceDataReceived();
            voice.showFeedback('success', result.message || t('voice.updateSuccess'));
          } else {
            voice.showFeedback('error', result.error || t('voice.error'));
          }
        } catch (error) {
          console.error('Voice processing error:', error);
          voice.showFeedback('error', t('voice.error'));
        } finally {
          voice.setProcessing(false);
        }
      }
    } else if (voice.voiceState === 'idle' || voice.voiceState === 'error') {
      voice.clearFeedback();
      await voice.startRecording();
    }
  }, [voice, i18n.language, t, accounts, categories]);

  const handleVoiceUpdate = useCallback(async () => {
    if (voice.voiceState === 'recording') {
      const audioBlob = await voice.stopRecording();
      if (audioBlob) {
        voice.setProcessing(true);

        // Build current transaction context from formData (for new) or existing transaction (for edit)
        const currentContext: Transaction = transaction || {
          id: '',
          userId: userId,
          description: formData.description,
          amount: parseFloat(formData.amount.toString().replace(',', '.')) || 0,
          type: formData.type,
          categoryId: formData.categoryId,
          date: formData.date,
          accountId: selectedAccountId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const result = await sendVoiceTransactionUpdate(audioBlob, i18n.language, currentContext, categories);
        voice.setProcessing(false);

        if (result.success && result.data) {
          voice.showFeedback('success', result.message || t('voice.updateSuccess'));
          voice.setVoiceDataReceived(); // Mark as having voice data

          const updates: Partial<Transaction> = {};
          if (result.data.description) { updates.description = result.data.description; setFormData(prev => ({ ...prev, description: result.data!.description! })); }
          if (result.data.amount) { updates.amount = result.data.amount; setFormData(prev => ({ ...prev, amount: result.data!.amount!.toString() })); }
          if (result.data.type) { updates.type = result.data.type; setFormData(prev => ({ ...prev, type: result.data!.type! })); }
          if (result.data.categoryId) { updates.categoryId = result.data.categoryId; setFormData(prev => ({ ...prev, categoryId: result.data!.categoryId! })); }
          if (result.data.date) { updates.date = result.data.date; setFormData(prev => ({ ...prev, date: result.data!.date! })); }
          if (result.data.accountId) { updates.accountId = result.data.accountId; setSelectedAccountId(result.data.accountId); }
          if (result.data.toAccountId) { updates.toAccountId = result.data.toAccountId; setSelectedToAccountId(result.data.toAccountId); }

          if (onVoiceUpdate && Object.keys(updates).length > 0) onVoiceUpdate(updates);
        } else {
          voice.showFeedback('error', result.error || t('voice.error'));
        }
      }
    } else if (voice.voiceState === 'idle' || voice.voiceState === 'error') {
      voice.clearFeedback();
      await voice.startRecording();
    }
  }, [voice, i18n.language, transaction, categories, t, onVoiceUpdate, formData, userId, selectedAccountId]);

  // Auto-select destination cash account only for withdrawal transfers
  useEffect(() => {
    if (formData.type === 'transfer' && selectedAccountId && accounts.length > 0 && formData.categoryId) {
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      if (selectedCategory?.name === 'Withdrawal') {
        const sourceAccount = accounts.find(a => a.id === selectedAccountId);
        if (sourceAccount) {
          const cashAccount = accounts.find(a => a.isCash === true && a.currency === sourceAccount.currency && a.id !== selectedAccountId);
          if (cashAccount && selectedToAccountId !== cashAccount.id) {
            setSelectedToAccountId(cashAccount.id);
          }
        }
      }
    }
  }, [formData.type, formData.categoryId, selectedAccountId, accounts, categories]);

  const filteredCategories = categories
    .filter(c => c.type === formData.type)
    .sort((a, b) =>
      t(getTranslatedCategoryName(a.name)).localeCompare(
        t(getTranslatedCategoryName(b.name)),
        undefined,
        { sensitivity: 'base' }
      )
    );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEditing ? t('transactions.editTransaction') : t('transactions.addNew')}
      hasVoiceData={voice.hasVoiceData}
      isEditing={isEditing}
      submitLabel={voice.hasVoiceData ? t('common.update') : (isEditing ? t('common.update') : t('common.create'))}
      cancelLabel={t('common.cancel')}
      isRecording={voice.voiceState === 'recording'}
      onCancelRecording={voice.cancelRecording}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Input
          label={t('transactions.form.title')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
        <Input
          label={t('transactions.form.amount')}
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
        <div className="col-span-1 sm:col-span-2">
          <div className="grid grid-cols-[2fr_3fr] gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('transactions.form.type')}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' | 'transfer', categoryId: '' })}
                className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all"
              >
                <option value="expense">{t('common.expense')}</option>
                <option value="income">{t('common.income')}</option>
                <option value="transfer">{t('common.transfer')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('transactions.form.category')}</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all"
                required
              >
                <option value="">{t('transactions.form.selectCategory')}</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>{t(getTranslatedCategoryName(category.name))}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Payment Method Selection - Only for expenses */}
        {formData.type === 'expense' && creditCards.length > 0 && (
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1.5">
              {t('transactions.form.paymentMethod') || 'Forma de Pagamento'}
            </label>
            <div className="flex gap-2 p-1 bg-slate/5 rounded-lg">
              <button
                type="button"
                onClick={() => setPaymentMethod('account')}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  paymentMethod === 'account'
                    ? 'bg-white text-blue shadow-sm'
                    : 'text-slate hover:text-ink'
                )}
              >
                {t('transactions.form.payWithAccount') || 'Conta/Débito'}
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  paymentMethod === 'credit_card'
                    ? 'bg-white text-blue shadow-sm'
                    : 'text-slate hover:text-ink'
                )}
              >
                {t('transactions.form.payWithCreditCard') || 'Cartão de Crédito'}
              </button>
            </div>
          </div>
        )}

        <div className="col-span-1 sm:col-span-2">
          <div className={`grid ${formData.type === 'transfer' ? 'grid-cols-1 sm:grid-cols-3' : paymentMethod === 'credit_card' ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
            {/* Show account selection for transfers or when payment method is account */}
            {(formData.type === 'transfer' || paymentMethod === 'account') && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  {formData.type === 'transfer' ? t('transactions.form.sourceAccount') || t('transactions.form.account') : t('transactions.form.account')}
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all"
                >
                  <option value="">{t('transactions.form.selectAccount')}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name} {account.isDefault ? `(${t('common.default')})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Show credit card selection when payment method is credit card */}
            {formData.type === 'expense' && paymentMethod === 'credit_card' && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  {t('transactions.form.selectCreditCard') || 'Cartão de Crédito'}
                </label>
                <select
                  value={selectedCreditCardId}
                  onChange={(e) => setSelectedCreditCardId(e.target.value)}
                  className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all"
                  required={paymentMethod === 'credit_card'}
                >
                  <option value="">{t('transactions.form.selectCreditCard') || 'Selecione um cartão'}</option>
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))}
                </select>
              </div>
            )}
            {formData.type === 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">{t('transactions.form.destinationAccount')}</label>
                <select
                  value={selectedToAccountId}
                  onChange={(e) => setSelectedToAccountId(e.target.value)}
                  className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all"
                  required
                >
                  <option value="">{t('transactions.form.selectDestinationAccount')}</option>
                  {accounts
                    .filter(acc => acc.id !== selectedAccountId)
                    .map((account) => (
                      <option key={account.id} value={account.id}>{account.name} {account.isCash ? `(${t('accounts.cashBadge')})` : ''}</option>
                    ))}
                </select>
              </div>
            )}
            <Input
              label={t('transactions.form.date')}
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      {/* Edit Mode Selector - only when editing recurring transaction */}
      {isEditing && seriesTransactions.length > 0 && (
        <div className="border-t border-slate/10 pt-3 mt-3 sm:pt-4 sm:mt-4">
          <label className="block text-sm font-medium text-ink mb-2">
            {t('transactions.form.editMode.label') || 'Modo de Edição'}
          </label>
          <div className="space-y-2">
            {/* Single */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="editMode"
                value="single"
                checked={editMode === 'single'}
                onChange={(e) => setEditMode(e.target.value as 'single' | 'forward' | 'all')}
                className="h-4 w-4 text-blue focus:ring-blue border-gray-300"
              />
              <span className="text-sm text-ink group-hover:text-blue transition-colors">
                {t('transactions.form.editMode.single') || 'Somente esta'}
              </span>
            </label>

            {/* Forward (recommended) */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="editMode"
                value="forward"
                checked={editMode === 'forward'}
                onChange={(e) => setEditMode(e.target.value as 'single' | 'forward' | 'all')}
                className="h-4 w-4 text-blue focus:ring-blue border-gray-300"
              />
              <span className="text-sm text-ink group-hover:text-blue transition-colors">
                {t('transactions.form.editMode.forward') || 'Esta e seguintes'}
                <span className="text-emerald ml-1">
                  {t('transactions.form.editMode.recommended') || '(recomendado)'}
                </span>
              </span>
            </label>

            {/* All (not recommended) */}
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="editMode"
                value="all"
                checked={editMode === 'all'}
                onChange={(e) => setEditMode(e.target.value as 'single' | 'forward' | 'all')}
                className="h-4 w-4 text-blue focus:ring-blue border-gray-300"
              />
              <span className="text-sm text-ink group-hover:text-blue transition-colors">
                {t('transactions.form.editMode.all') || 'Todas da série'}
                <span className="text-rose ml-1">
                  {t('transactions.form.editMode.notRecommended') || '(não recomendado)'}
                </span>
              </span>
            </label>
          </div>

          {/* Affected count preview */}
          <p className="mt-3 text-sm text-slate bg-slate/5 px-3 py-2 rounded-lg">
            {t('transactions.form.editMode.affectedCount', { count: affectedCount }) ||
              `Serão atualizadas ${affectedCount} transações`}
          </p>
        </div>
      )}

      {!isEditing && (
        <div className="border-t border-slate/10 pt-3 mt-3 sm:pt-4 sm:mt-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 text-blue focus:ring-blue border-gray-300 rounded"
            />
            <label htmlFor="isRecurring" className="flex items-center gap-2 text-sm font-medium text-slate cursor-pointer hover:text-ink">
              <Repeat className="h-4 w-4" />
              {t('transactions.form.isRecurring') || 'Recurring Transaction'}
            </label>
          </div>

          {isRecurring && (
            <div className="space-y-3 sm:space-y-4 pl-4 sm:pl-6 border-l-2 border-blue/20">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">{t('transactions.form.recurrencePattern') || 'Frequency'}</label>
                  <select
                    value={recurrencePattern}
                    onChange={(e) => handleRecurrencePatternChange(e.target.value as 'monthly' | 'weekly' | 'yearly')}
                    className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
                  >
                    <option value="monthly">{t('common.monthly') || 'Monthly'}</option>
                    <option value="weekly">{t('common.weekly') || 'Weekly'}</option>
                    <option value="yearly">{t('common.yearly') || 'Yearly'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">{getDayLabel()}</label>
                  <input
                    type="number"
                    min={1}
                    max={getMaxDay()}
                    value={recurrenceDay}
                    onChange={(e) => setRecurrenceDay(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder={t('transactions.form.recurrenceDayPlaceholder') || 'Auto'}
                    className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
                  />
                  <p className="text-xs text-slate mt-1">{t('transactions.form.recurrenceDayHint') || 'Leave empty to use the transaction date'}</p>
                </div>
              </div>

              {/* Toggle between Count and Date mode */}
              <div className="flex items-center gap-2 p-1 bg-slate/5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setRecurringMode('count')}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    recurringMode === 'count'
                      ? 'bg-white text-blue shadow-sm'
                      : 'text-slate hover:text-ink'
                  )}
                >
                  {t('transactions.form.byNumberOfInstallments') || 'By Number of Installments'}
                </button>
                <button
                  type="button"
                  onClick={() => setRecurringMode('date')}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    recurringMode === 'date'
                      ? 'bg-white text-blue shadow-sm'
                      : 'text-slate hover:text-ink'
                  )}
                >
                  {t('transactions.form.byEndDate') || 'By End Date'}
                </button>
              </div>

              {/* Recurring Count Input */}
              {recurringMode === 'count' && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    {t('transactions.form.numberOfInstallments') || 'Number of Installments'}
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={recurringCount}
                    onChange={(e) => handleRecurringCountChange(e.target.value)}
                    placeholder="2-60"
                    className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
                  />
                  <p className="text-xs text-slate mt-1">
                    {recurringCount !== '' && (
                      <span className="text-emerald">
                        {t('transactions.form.endDateCalculated') || 'End date calculated'}: {recurrenceEndDate || '-'}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Recurrence End Date Input */}
              {recurringMode === 'date' && (
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    {t('transactions.form.recurrenceEndDate') || 'End Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => handleRecurrenceEndDateChange(e.target.value)}
                    min={formData.date}
                    className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
                  />
                  <p className="text-xs text-slate mt-1">
                    {recurrenceEndDate && recurrenceEndDate > formData.date && (
                      <span className="text-emerald">
                        {t('transactions.form.installmentsCalculated') || 'Installments'}: {recurringCount || '-'}
                      </span>
                    )}
                    {(!recurrenceEndDate || recurrenceEndDate <= formData.date) && (
                      t('transactions.form.recurrenceEndDateHint') || 'If not set, instances will be generated until end of year'
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Voice Input Section */}
      <div className="border-t border-slate/10 pt-3 mt-3 sm:pt-4 sm:mt-4">
        <label className="block text-sm font-medium text-ink mb-2 sm:mb-3">
          {(voice.hasVoiceData || isEditing) ? t('voice.updateByVoice') : t('voice.addByVoice')}
        </label>
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                // First audio: use creation endpoint
                // Subsequent audios (hasVoiceData=true) or editing: use update endpoint
                if (voice.hasVoiceData || isEditing) {
                  handleVoiceUpdate();
                } else {
                  handleVoiceInput();
                }
              }}
              disabled={voice.voiceState === 'processing' || voice.isProcessingVoice}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-11 sm:h-14 rounded-full font-medium transition-all duration-300",
                voice.voiceState === 'recording'
                  ? 'bg-emerald text-white ring-4 ring-emerald/20 animate-pulse'
                  : (voice.voiceState === 'processing' || voice.isProcessingVoice)
                    ? 'bg-slate/10 text-slate cursor-wait'
                    : 'bg-gradient-to-r from-blue to-blue-hover text-white shadow-lg shadow-blue/20 hover:shadow-blue/30 hover:scale-[1.02]'
              )}
            >
              {voice.voiceState === 'recording' ? (
                <>
                  <Square className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">{t('voice.stopRecording')}</span>
                </>
              ) : voice.voiceState === 'processing' || voice.isProcessingVoice ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span className="text-sm sm:text-base">{t('voice.processing')}</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-sm sm:text-base">{(voice.hasVoiceData || isEditing) ? t('voice.updateByVoice') : t('voice.addByVoice')}</span>
                </>
              )}
            </button>

            {voice.voiceState === 'recording' && (
              <button
                type="button"
                onClick={voice.cancelRecording}
                className="h-11 w-11 sm:h-14 sm:w-14 flex items-center justify-center rounded-full bg-rose/10 text-rose hover:bg-rose/20 transition-all duration-200 border-2 border-rose/20 shadow-lg shadow-rose/10"
                title={t('common.cancel')}
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>

          {voice.voiceFeedback && (
            <div className={cn(
              "flex items-center gap-2 text-sm px-3 py-2 rounded-xl border animate-fade-in",
              voice.voiceFeedback.type === 'success' ? 'bg-emerald/10 text-emerald border-emerald/20' : 'bg-rose/10 text-rose border-rose/20'
            )}>
              {voice.voiceFeedback.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{voice.voiceFeedback.message}</span>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
