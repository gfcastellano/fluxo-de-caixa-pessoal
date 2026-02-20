import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Check, AlertCircle, X, Repeat } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { useVoiceForm } from '../hooks/useVoiceForm';
import { useVoice } from '../context/VoiceContext';
import { sendVoiceTransaction, sendVoiceTransactionUpdate } from '../services/voiceService';
import { getAccounts } from '../services/accountService';
import { getCreditCards } from '../services/creditCardService';
import { getRecurringInstances } from '../services/transactionService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import { validateMoney, validateInteger, parseMoneyInput, parseIntegerInput } from '../utils/numericInputs';
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
  initialEditMode?: 'single' | 'forward' | 'all';
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
  initialEditMode,
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
  const [recurrenceDay, setRecurrenceDay] = useState('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');
  const [recurringCount, setRecurringCount] = useState('');
  const [recurringMode, setRecurringMode] = useState<'count' | 'date'>('date');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedToAccountId, setSelectedToAccountId] = useState<string>('');

  // Credit card states
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'account' | 'credit_card' | 'cash'>('account');

  // Installment states for credit card
  const [installments, setInstallments] = useState<number>(1);
  const [isInstallmentMode, setIsInstallmentMode] = useState(false);

  // Voice feedback state
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());

  // Clear highlighted fields after 2 seconds
  useEffect(() => {
    if (highlightedFields.size > 0) {
      const timer = setTimeout(() => {
        setHighlightedFields(new Set());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedFields]);

  // Estados para edição em massa de transações recorrentes
  const [editMode, setEditMode] = useState<'single' | 'forward' | 'all'>('forward');
  const [affectedCount, setAffectedCount] = useState<number>(0);
  const [seriesTransactions, setSeriesTransactions] = useState<Transaction[]>([]);

  const voice = useVoiceForm({ autoStartRecording });
  const { setIsModalActive } = useVoice();

  // Sync isModalActive with VoiceContext
  useEffect(() => {
    setIsModalActive(isOpen);
    return () => {
      // Small delay to ensure we don't clear it before the next page/modal takes over
      // but primarily focused on resetting when this component unmounts
      if (isOpen) setIsModalActive(false);
    };
  }, [isOpen, setIsModalActive]);

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
          } else if (userCreditCards.length === 1) {
            // Auto-select if only one credit card exists
            setSelectedCreditCardId(userCreditCards[0].id);
          } else if (userCreditCards.length > 0) {
            // Auto-select default credit card if exists
            const defaultCard = userCreditCards.find(card => card.isDefault);
            if (defaultCard) {
              setSelectedCreditCardId(defaultCard.id);
            }
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
      let initialAmount = transaction.amount;

      // Calculate total amount if editing a series (all) and it's a credit card installment
      if (initialEditMode === 'all' && transaction.creditCardId && transaction.totalInstallments && transaction.totalInstallments > 1) {
        initialAmount = transaction.amount * transaction.totalInstallments;
      }

      setFormData({
        description: transaction.description || '',
        amount: initialAmount?.toString() || '',
        type: transaction.type || 'expense',
        categoryId: transaction.categoryId || '',
        date: transaction.date || new Date().toISOString().split('T')[0],
      });
      setIsRecurring(transaction.isRecurring || false);
      setRecurrencePattern(transaction.recurrencePattern || 'monthly');
      setRecurrenceDay(transaction.recurrenceDay?.toString() || '');
      setRecurrenceEndDate(transaction.recurrenceEndDate || '');
      setRecurringCount(transaction.recurringCount?.toString() || '');
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

            // Set default edit mode to 'single' for child instances, or use initial (if provided)
            if (initialEditMode) {
              setEditMode(initialEditMode);
            } else if (transaction.parentTransactionId || transaction.isRecurringInstance) {
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
        if (initialEditMode) {
          setEditMode(initialEditMode);
        } else {
          setEditMode('forward');
        }
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

    // Validate inputs before processing
    const newErrors: Record<string, string> = {};

    const amountError = validateMoney(formData.amount, (key, defaultValue) => {
      const translated = t(key) || defaultValue || key;
      return translated;
    });
    if (amountError) {
      newErrors.amount = amountError;
    }

    // Validate recurrence day if in recurring mode
    if (isRecurring && recurrenceDay) {
      const maxDay = recurrencePattern === 'weekly' ? 7 : recurrencePattern === 'yearly' ? 366 : 31;
      const dayError = validateInteger(recurrenceDay, (key, defaultValue) => {
        const translated = t(key) || defaultValue || key;
        return translated;
      }, { required: false, min: 1, max: maxDay });
      if (dayError) {
        newErrors.recurrenceDay = dayError;
      }
    }

    // Validate recurring count if needed
    if (isRecurring && recurringMode === 'count' && recurringCount) {
      const countError = validateInteger(recurringCount, (key, defaultValue) => {
        const translated = t(key) || defaultValue || key;
        return translated;
      }, { required: false, min: 2, max: 60 });
      if (countError) {
        newErrors.recurringCount = countError;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

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

    const parsedAmount = parseMoneyInput(formData.amount);
    if (parsedAmount === null) {
      setErrors({ amount: t('errors.invalidNumber', 'Invalid number format') });
      return;
    }

    const totalAmount = parsedAmount;

    // Calculate installment amount if in installment mode
    // Divide if creating new, OR if editing all/forward (updating the series total)
    // Don't divide if editing single instance (updating just that one payment)
    const shouldDivideAmount = isInstallmentMode && installments > 1 &&
      (!isEditing || (isEditing && (editMode === 'all' || editMode === 'forward')));

    const installmentAmount = shouldDivideAmount
      ? totalAmount / installments
      : totalAmount;

    const transactionData: Partial<Transaction> = {
      ...formData,
      type: validType,
      amount: installmentAmount,
    };

    // Add credit card, account, or cash info based on payment method
    if (paymentMethod === 'credit_card' && selectedCreditCardId) {
      transactionData.creditCardId = selectedCreditCardId;
      // Don't set accountId for credit card transactions
    } else if (paymentMethod === 'cash') {
      // Cash transactions don't have accountId or creditCardId
      transactionData.isCash = true;
    } else {
      transactionData.accountId = selectedAccountId || undefined;
      if (validType === 'transfer') {
        transactionData.toAccountId = selectedToAccountId || undefined;
      }
    }

    // Handle credit card installments
    if (isInstallmentMode && installments > 1 && paymentMethod === 'credit_card' && !isEditing) {
      transactionData.isRecurring = true;
      transactionData.recurrencePattern = 'monthly';
      transactionData.recurringCount = installments;
      // Store total amount and installment info
      transactionData.totalInstallments = installments;
      transactionData.installmentNumber = 1;
    } else if (isRecurring && !isEditing && paymentMethod !== 'credit_card') {
      transactionData.isRecurring = true;
      transactionData.recurrencePattern = recurrencePattern;
      if (recurrenceDay !== '') {
        const parsedDay = parseIntegerInput(recurrenceDay);
        if (parsedDay !== null) {
          transactionData.recurrenceDay = parsedDay;
        }
      }
      if (recurrenceEndDate) {
        transactionData.recurrenceEndDate = recurrenceEndDate;
      }
      // Só adicionar recurringCount se tiver valor válido (>= 2)
      if (recurringCount !== '') {
        const parsedCount = parseIntegerInput(recurringCount);
        if (parsedCount !== null && parsedCount >= 2) {
          transactionData.recurringCount = parsedCount;
        }
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
    setRecurringCount(value);

    // Auto-calculate end date if count is valid (after validation at submit time)
    if (value !== '') {
      const parsed = parseIntegerInput(value);
      if (parsed !== null && parsed >= 2 && parsed <= 60) {
        const newEndDate = calculateEndDate(formData.date, parsed, recurrencePattern);
        setRecurrenceEndDate(newEndDate);
      }
    }
  };

  // Handle recurrenceEndDate change
  const handleRecurrenceEndDateChange = (value: string) => {
    setRecurrenceEndDate(value);

    // Auto-calculate recurring count if date is valid and after start date
    if (value && value > formData.date) {
      const count = calculateRecurringCount(formData.date, value, recurrencePattern);
      setRecurringCount(count.toString());
    } else {
      setRecurringCount('');
    }
  };

  // Handle recurrencePattern change - recalculate if needed
  const handleRecurrencePatternChange = (newPattern: 'monthly' | 'weekly' | 'yearly') => {
    setRecurrencePattern(newPattern);
    setRecurrenceDay('');

    // Recalculate based on current mode
    if (recurringMode === 'count' && recurringCount !== '') {
      const parsedCount = parseIntegerInput(recurringCount);
      if (parsedCount !== null && parsedCount >= 2) {
        const newEndDate = calculateEndDate(formData.date, parsedCount, newPattern);
        setRecurrenceEndDate(newEndDate);
      }
    } else if (recurringMode === 'date' && recurrenceEndDate && recurrenceEndDate > formData.date) {
      const count = calculateRecurringCount(formData.date, recurrenceEndDate, newPattern);
      setRecurringCount(count.toString());
    }
  };

  const handleVoiceConfirm = async () => {
    // 1. Stop recording and get the blob
    const audioBlob = await voice.stopRecording();

    if (audioBlob) {
      voice.setProcessing(true);

      try {
        if (voice.hasVoiceData || isEditing) {
          // Update mode - uses the current form data as context or the existing transaction
          const currentContext: Transaction = transaction || {
            id: '',
            userId: userId,
            description: formData.description,
            amount: parseFloat(formData.amount.toString().replace(',', '.')) || 0,
            type: formData.type,
            categoryId: formData.categoryId,
            date: formData.date,
            accountId: selectedAccountId || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const result = await sendVoiceTransactionUpdate(
            audioBlob,
            i18n.language,
            currentContext,
            categories,
            true
          );

          if (result.success && result.data) {
            const updates = result.data;

            // Apply updates to form
            setFormData(prev => ({
              ...prev,
              description: updates.description || prev.description,
              amount: updates.amount?.toString() || prev.amount,
              type: updates.type || prev.type,
              categoryId: updates.categoryId || prev.categoryId,
              date: updates.date || prev.date,
            }));

            if (updates.accountId) {
              setSelectedAccountId(updates.accountId);
              setPaymentMethod('account');
              setSelectedCreditCardId('');
            }
            if (updates.toAccountId) setSelectedToAccountId(updates.toAccountId);
            if (updates.creditCardId) {
              setSelectedCreditCardId(updates.creditCardId);
              setPaymentMethod('credit_card');
              setSelectedAccountId('');
            }
            if (updates.installments !== undefined) {
              setInstallments(updates.installments);
              setIsInstallmentMode(updates.installments > 1);
            }

            voice.showFeedback('success', result.message || t('voice.updateSuccess'));
            setHighlightedFields(new Set(Object.keys(updates)));
            if (onVoiceUpdate) onVoiceUpdate(updates);
          } else {
            voice.showFeedback('error', result.error || t('voice.error'));
          }
        } else {
          // Creation mode
          const result = await sendVoiceTransaction(audioBlob, i18n.language);

          if (result.success && result.data) {
            const parsedTransaction = result.data;

            // Map parsed data to form
            setFormData({
              description: parsedTransaction.description || '',
              amount: parsedTransaction.amount?.toString() || '',
              type: parsedTransaction.type || 'expense',
              categoryId: parsedTransaction.categoryId || '',
              date: parsedTransaction.date || new Date().toISOString().split('T')[0],
            });

            if (parsedTransaction.accountId) {
              setSelectedAccountId(parsedTransaction.accountId);
              setPaymentMethod('account');
            }
            if (parsedTransaction.creditCardId) {
              setSelectedCreditCardId(parsedTransaction.creditCardId);
              setPaymentMethod('credit_card');
              setSelectedAccountId('');
            }
            if (parsedTransaction.installments) {
              setInstallments(parsedTransaction.installments);
              setIsInstallmentMode(parsedTransaction.installments > 1);
            }

            voice.setVoiceDataReceived();
            voice.showFeedback('success', result.message || t('voice.transactionCreated'));
            setHighlightedFields(new Set(Object.keys(parsedTransaction)));
          } else {
            voice.showFeedback('error', result.error || t('voice.error'));
          }
        }
      } catch (error) {
        console.error('Voice processing error:', error);
        voice.showFeedback('error', t('voice.error'));
      } finally {
        voice.setProcessing(false);
      }
    }
  };

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
      onVoiceClick={voice.voiceState === 'recording' ? voice.stopRecording : voice.startRecording}
      onVoiceConfirm={handleVoiceConfirm}
      onVoiceCancel={voice.cancelRecording}
      getAudioLevel={voice.getAudioLevel}
      isProcessingVoice={voice.isProcessingVoice}
      isSubmitDisabled={voice.voiceState === 'processing'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Input
          label={t('transactions.form.title')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
          className={highlightedFields.has('description') ? 'animate-voice-highlight' : ''}
        />
        <Input
          label={t('transactions.form.amount')}
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          error={errors.amount}
          className={highlightedFields.has('amount') ? 'animate-voice-highlight' : ''}
        />
        <div className="col-span-1 sm:col-span-2">
          <div className="grid grid-cols-[2fr_3fr] gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">{t('transactions.form.type')}</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' | 'transfer', categoryId: '' })}
                className={cn(
                  "w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all",
                  highlightedFields.has('type') && "animate-voice-highlight"
                )}
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
                className={cn(
                  "w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all",
                  highlightedFields.has('categoryId') && "animate-voice-highlight"
                )}
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
        {formData.type === 'expense' && (
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1.5">
              {t('creditCardPayment.form.paymentMethod') || 'Forma de Pagamento'}
            </label>
            <div className="flex flex-col gap-1 p-1 bg-slate/5 rounded-lg">
              <button
                type="button"
                onClick={() => setPaymentMethod('account')}
                className={cn(
                  "w-full px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-left flex items-center gap-3",
                  paymentMethod === 'account'
                    ? 'bg-white text-blue shadow-sm'
                    : 'text-slate hover:text-ink hover:bg-white/50'
                )}
              >
                <span className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  paymentMethod === 'account' ? 'border-blue' : 'border-slate/40'
                )}>
                  {paymentMethod === 'account' && <span className="w-2 h-2 rounded-full bg-blue" />}
                </span>
                {t('creditCardPayment.form.payWithAccount') || 'Conta/Débito'}
              </button>
              {creditCards.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={cn(
                    "w-full px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-left flex items-center gap-3",
                    paymentMethod === 'credit_card'
                      ? 'bg-white text-blue shadow-sm'
                      : 'text-slate hover:text-ink hover:bg-white/50'
                  )}
                >
                  <span className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    paymentMethod === 'credit_card' ? 'border-blue' : 'border-slate/40'
                  )}>
                    {paymentMethod === 'credit_card' && <span className="w-2 h-2 rounded-full bg-blue" />}
                  </span>
                  {t('creditCardPayment.form.payWithCreditCard') || 'Cartão de Crédito'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={cn(
                  "w-full px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-left flex items-center gap-3",
                  paymentMethod === 'cash'
                    ? 'bg-white text-blue shadow-sm'
                    : 'text-slate hover:text-ink hover:bg-white/50'
                )}
              >
                <span className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  paymentMethod === 'cash' ? 'border-blue' : 'border-slate/40'
                )}>
                  {paymentMethod === 'cash' && <span className="w-2 h-2 rounded-full bg-blue" />}
                </span>
                {t('creditCardPayment.form.payWithCash') || 'Dinheiro/Efetivo'}
              </button>
            </div>
          </div>
        )}

        {/* Installments section - Only for credit card expenses */}
        {formData.type === 'expense' && paymentMethod === 'credit_card' && (
          <div className="col-span-1 sm:col-span-2">
            <div className="p-3 bg-blue/5 rounded-lg border border-blue/10">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-ink">
                  {t('creditCardPayment.form.installments') || 'Parcelamento'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsInstallmentMode(!isInstallmentMode)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    isInstallmentMode ? 'bg-blue' : 'bg-slate/30'
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                      isInstallmentMode ? 'translate-x-5' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {isInstallmentMode && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate mb-1.5">
                      {t('creditCardPayment.form.numberOfInstallments') || 'Número de parcelas'}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="2"
                        max="24"
                        value={installments}
                        onChange={(e) => setInstallments(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-slate/20 rounded-lg appearance-none cursor-pointer accent-blue"
                      />
                      <span className="text-sm font-medium text-ink min-w-[3rem] text-center">
                        {installments}x
                      </span>
                    </div>
                  </div>

                  {formData.amount && parseFloat(formData.amount) > 0 && (
                    <div className="text-xs text-slate bg-white/50 rounded-md p-2">
                      <div className="flex justify-between mb-1">
                        <span>{t('creditCardPayment.form.totalAmount') || 'Valor total'}:</span>
                        <span className="font-medium text-ink">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(formData.amount))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('creditCardPayment.form.installmentAmount') || 'Valor da parcela'}:</span>
                        <span className="font-medium text-blue">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(formData.amount) / installments)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="col-span-1 sm:col-span-2">
          <div className={`grid ${formData.type === 'transfer' ? 'grid-cols-1 sm:grid-cols-3' : paymentMethod === 'credit_card' || paymentMethod === 'cash' ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
            {/* Show account selection for transfers or when payment method is account */}
            {(formData.type === 'transfer' || paymentMethod === 'account') && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">
                  {formData.type === 'transfer' ? t('transactions.form.sourceAccount') || t('transactions.form.account') : t('transactions.form.account')}
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all",
                    highlightedFields.has('accountId') && "animate-voice-highlight"
                  )}
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
                  {t('creditCardPayment.form.selectCreditCard') || 'Cartão de Crédito'}
                </label>
                <select
                  value={selectedCreditCardId}
                  onChange={(e) => setSelectedCreditCardId(e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all",
                    highlightedFields.has('creditCardId') && "animate-voice-highlight"
                  )}
                  required={paymentMethod === 'credit_card'}
                >
                  <option value="">{t('creditCardPayment.form.selectCreditCard') || 'Selecione um cartão'}</option>
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

      {!isEditing && paymentMethod !== 'credit_card' && (
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
                    type="text"
                    inputMode="numeric"
                    value={recurrenceDay}
                    onChange={(e) => setRecurrenceDay(e.target.value)}
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
                    type="text"
                    inputMode="numeric"
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

    </BaseModal>
  );
}
