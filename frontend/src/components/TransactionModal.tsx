import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Check, AlertCircle, X, Repeat } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { useVoiceForm } from '../hooks/useVoiceForm';
import { sendVoiceTransaction, sendVoiceTransactionUpdate } from '../services/voiceService';
import { getAccounts } from '../services/accountService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Transaction, Category, Account } from '../types';
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
    type: 'expense' as 'income' | 'expense',
    categoryId: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [recurrenceDay, setRecurrenceDay] = useState<number | ''>('');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const voice = useVoiceForm({ autoStartRecording });

  useEffect(() => {
    if (isOpen && userId) {
      const fetchAccounts = async () => {
        try {
          const userAccounts = await getAccounts(userId);
          setAccounts(userAccounts);

          if (transaction?.accountId) {
            setSelectedAccountId(transaction.accountId);
          } else {
            const defaultAccount = userAccounts.find(acc => acc.isDefault);
            if (defaultAccount) setSelectedAccountId(defaultAccount.id);
          }
        } catch (error) {
          console.error('Error fetching accounts:', error);
        }
      };
      fetchAccounts();
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
    }
    voice.resetVoice();
  }, [transaction, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure type is valid
    let validType = formData.type;
    const lowerType = String(formData.type).toLowerCase();

    if (lowerType === 'receita' || lowerType === 'income' || lowerType === 'entrada') {
      validType = 'income';
    } else {
      validType = 'expense';
    }

    const transactionData: Partial<Transaction> = {
      ...formData,
      type: validType,
      amount: parseFloat(formData.amount.toString().replace(',', '.')),
      accountId: selectedAccountId || undefined,
    };

    if (isRecurring && !isEditing) {
      transactionData.isRecurring = true;
      transactionData.recurrencePattern = recurrencePattern;
      transactionData.recurrenceDay = recurrenceDay !== '' ? recurrenceDay : null;
      transactionData.recurrenceEndDate = recurrenceEndDate || null;
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
              else if (t.includes('despesa') || t.includes('expense')) normalizedType = 'expense';
            }

            setFormData(prev => ({
              ...prev,
              description: parsedTransaction.description || prev.description,
              amount: parsedTransaction.amount?.toString() || prev.amount,
              type: normalizedType as 'income' | 'expense',
              categoryId: parsedTransaction.categoryId || prev.categoryId,
              date: parsedTransaction.date || prev.date,
            }));
            if (parsedTransaction.accountId) setSelectedAccountId(parsedTransaction.accountId);

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
  }, [voice, i18n.language, t]);

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

  const filteredCategories = categories.filter(c => c.type === formData.type);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">{t('transactions.form.type')}</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense', categoryId: '' })}
            className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all"
          >
            <option value="expense">{t('common.expense')}</option>
            <option value="income">{t('common.income')}</option>
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
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">{t('transactions.form.account')}</label>
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
        <Input
          label={t('transactions.form.date')}
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">{t('transactions.form.recurrencePattern') || 'Frequency'}</label>
                  <select
                    value={recurrencePattern}
                    onChange={(e) => { setRecurrencePattern(e.target.value as any); setRecurrenceDay(''); }}
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
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">{t('transactions.form.recurrenceEndDate') || 'End Date (Optional)'}</label>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  min={formData.date}
                  className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
                />
                <p className="text-xs text-slate mt-1">{t('transactions.form.recurrenceEndDateHint') || 'If not set, instances will be generated until end of year'}</p>
              </div>
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
