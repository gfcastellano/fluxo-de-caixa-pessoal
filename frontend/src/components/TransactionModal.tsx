import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { sendVoiceTransaction, sendVoiceTransactionUpdate } from '../services/voiceService';
import { getCategories } from '../services/categoryService';
import { getAccounts } from '../services/accountService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Transaction, Category, Account } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  categories: Category[];
  onSave: (transaction: Partial<Transaction>) => void;
  onVoiceUpdate?: (updates: Partial<Transaction>) => void;
  userId: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  transaction,
  categories,
  onSave,
  onVoiceUpdate,
  userId,
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

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Voice update state
  const { state: voiceState, error: voiceError, startRecording, stopRecording, reset: resetVoice } = useVoiceRecorder();
  const [voiceFeedback, setVoiceFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [hasVoiceData, setHasVoiceData] = useState(false);

  // Fetch accounts when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      const fetchAccounts = async () => {
        try {
          const userAccounts = await getAccounts(userId);
          setAccounts(userAccounts);
          
          // If editing, use the transaction's accountId
          if (transaction?.accountId) {
            setSelectedAccountId(transaction.accountId);
          } else {
            // Otherwise, use the default account
            const defaultAccount = userAccounts.find(acc => acc.isDefault);
            if (defaultAccount) {
              setSelectedAccountId(defaultAccount.id);
            }
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
    } else {
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        categoryId: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setVoiceFeedback(null);
    setHasVoiceData(false);
  }, [transaction, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
      accountId: selectedAccountId || undefined,
    });
  };

  // Parse voice input to extract transaction information for new transactions
  const parseVoiceInput = useCallback((transcription: string): Partial<Transaction> => {
    const lowerTranscription = transcription.toLowerCase();
    const updates: Partial<Transaction> = {};

    // Extract description - look for patterns like "descrição é X", "título X", "comprei X"
    const descriptionPatterns = [
      /(?:descrição|descripcion|description|título|titulo|title|comprei|gastei|paguei|recebi)\s+(?:é|e|eh|com|de|um|uma)?\s*["']?([^"'0-9]+?)(?:\s+(?:no|na|de|com|valor|no valor|por|custo|custou)|$)/i,
      /(?:gasto|despesa|receita|compra|pagamento)\s+(?:de|com|no|na)?\s*["']?([^"'0-9]+?)(?:\s+(?:no|na|de|com|valor|no valor|por|custo)|$)/i,
    ];

    for (const pattern of descriptionPatterns) {
      const match = lowerTranscription.match(pattern);
      if (match && match[1]) {
        updates.description = match[1].trim();
        break;
      }
    }

    // Extract amount - look for numbers with currency patterns
    const amountPatterns = [
      /(?:valor|amount|cantidad|de|por|custo|custou)\s+(?:de\s+)?(?:r\$|\$|€)?\s*([\d.,]+)/i,
      /(?:r\$|\$|€)\s*([\d.,]+)/,
      /([\d.,]+)\s*(?:reais?|dólares?|euros?|real|dollar|euro)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = lowerTranscription.match(pattern);
      if (match && match[1]) {
        // Parse number, handling both comma and dot as decimal separator
        const amountStr = match[1].replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) {
          updates.amount = amount;
          break;
        }
      }
    }

    // Extract type - look for income/expense patterns
    const incomePatterns = ['receita', 'recebi', 'ganhei', 'income', 'entrada', 'ganho', 'salário', 'salario'];
    const expensePatterns = ['despesa', 'gastei', 'paguei', 'expense', 'gasto', 'saída', 'saida', 'comprei'];

    if (incomePatterns.some(p => lowerTranscription.includes(p))) {
      updates.type = 'income';
    } else if (expensePatterns.some(p => lowerTranscription.includes(p))) {
      updates.type = 'expense';
    }

    // Extract category - look for category names in the transcription
    for (const category of categories) {
      const categoryName = t(getTranslatedCategoryName(category.name)).toLowerCase();
      const categoryNameEn = category.name.toLowerCase();

      if (lowerTranscription.includes(categoryName) || lowerTranscription.includes(categoryNameEn)) {
        updates.categoryId = category.id;
        // Also update the type based on category type if not already set
        if (!updates.type && category.type) {
          updates.type = category.type as 'income' | 'expense';
        }
        break;
      }
    }

    // Extract account - look for account names
    for (const account of accounts) {
      const accountName = account.name.toLowerCase();
      if (lowerTranscription.includes(accountName)) {
        updates.accountId = account.id;
        break;
      }
    }

    // Extract date - look for date patterns
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lowerTranscription.includes('hoje') || lowerTranscription.includes('today')) {
      updates.date = today.toISOString().split('T')[0];
    } else if (lowerTranscription.includes('ontem') || lowerTranscription.includes('yesterday')) {
      updates.date = yesterday.toISOString().split('T')[0];
    }

    return updates;
  }, [categories, accounts, t]);

  const handleVoiceInput = useCallback(async () => {
    if (voiceState === 'recording') {
      const audioBlob = await stopRecording();

      if (audioBlob) {
        setIsProcessingVoice(true);

        try {
          // Send audio to backend for transcription and parsing
          const result = await sendVoiceTransaction(audioBlob, i18n.language);

          if (result.success && result.data) {
            // Apply parsed updates to form
            const parsedTransaction = result.data;
            setFormData(prev => ({
              ...prev,
              description: parsedTransaction.description || prev.description,
              amount: parsedTransaction.amount?.toString() || prev.amount,
              type: parsedTransaction.type || prev.type,
              categoryId: parsedTransaction.categoryId || prev.categoryId,
              date: parsedTransaction.date || prev.date,
            }));

            // Update selected account if parsed
            if (parsedTransaction.accountId) {
              setSelectedAccountId(parsedTransaction.accountId);
            }

            // Mark that we have voice data - this will change the button text
            setHasVoiceData(true);

            setVoiceFeedback({
              type: 'success',
              message: result.message || t('voice.updateSuccess') || 'Transaction information extracted from voice',
            });
          } else {
            setVoiceFeedback({
              type: 'error',
              message: result.error || t('voice.error') || 'Could not understand. Please try again.',
            });
          }

          setTimeout(() => {
            setVoiceFeedback(null);
            resetVoice();
          }, 3000);
        } catch (error) {
          console.error('Voice processing error:', error);
          setVoiceFeedback({
            type: 'error',
            message: t('voice.error') || 'Could not understand. Please try again.',
          });

          setTimeout(() => {
            setVoiceFeedback(null);
            resetVoice();
          }, 5000);
        } finally {
          setIsProcessingVoice(false);
        }
      }
    } else if (voiceState === 'idle' || voiceState === 'error') {
      setVoiceFeedback(null);
      await startRecording();
    }
  }, [voiceState, stopRecording, startRecording, resetVoice, i18n.language, t]);

  const handleVoiceUpdate = useCallback(async () => {
    if (voiceState === 'recording') {
      const audioBlob = await stopRecording();

      if (audioBlob && transaction) {
        setIsProcessingVoice(true);
        const result = await sendVoiceTransactionUpdate(
          audioBlob,
          i18n.language,
          transaction,
          categories
        );
        setIsProcessingVoice(false);

        console.log('Voice update result:', result);
        console.log('Voice update data received:', result.data);

        if (result.success && result.data) {
          setVoiceFeedback({
            type: 'success',
            message: result.message || t('voice.updateSuccess'),
          });

          // Update form data with the parsed changes
          const updates: Partial<Transaction> = {};
          console.log('Processing voice update fields:', Object.keys(result.data));

          if (result.data.description) {
            updates.description = result.data.description;
            setFormData(prev => ({ ...prev, description: result.data!.description! }));
            console.log('✓ Updated description:', result.data.description);
          }
          if (result.data.amount) {
            updates.amount = result.data.amount;
            setFormData(prev => ({ ...prev, amount: result.data!.amount!.toString() }));
            console.log('✓ Updated amount:', result.data.amount);
          }
          if (result.data.type) {
            updates.type = result.data.type;
            setFormData(prev => ({ ...prev, type: result.data!.type! }));
            console.log('✓ Updated type:', result.data.type);
          }
          if (result.data.categoryId) {
            updates.categoryId = result.data.categoryId;
            setFormData(prev => ({ ...prev, categoryId: result.data!.categoryId! }));
            console.log('✓ Updated categoryId:', result.data.categoryId);
          }
          if (result.data.date) {
            updates.date = result.data.date;
            setFormData(prev => ({ ...prev, date: result.data!.date! }));
            console.log('✓ Updated date:', result.data.date);
          }
          if (result.data.accountId) {
            updates.accountId = result.data.accountId;
            setSelectedAccountId(result.data.accountId);
            console.log('✓ Updated accountId:', result.data.accountId);
          }

          console.log('Total updates to apply:', Object.keys(updates));

          // Notify parent component about voice updates
          if (onVoiceUpdate && Object.keys(updates).length > 0) {
            console.log('Calling onVoiceUpdate with:', updates);
            onVoiceUpdate(updates);
          } else {
            console.log('No updates to apply or onVoiceUpdate not provided');
          }

          // Clear success feedback after 3 seconds
          setTimeout(() => {
            setVoiceFeedback(null);
            resetVoice();
          }, 3000);
        } else {
          setVoiceFeedback({
            type: 'error',
            message: result.error || t('voice.error'),
          });

          setTimeout(() => {
            setVoiceFeedback(null);
            resetVoice();
          }, 5000);
        }
      }
    } else if (voiceState === 'idle' || voiceState === 'error') {
      setVoiceFeedback(null);
      await startRecording();
    }
  }, [voiceState, stopRecording, startRecording, i18n.language, transaction, categories, t, resetVoice, onVoiceUpdate]);

  const filteredCategories = categories.filter(
    (c) => c.type === formData.type
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {isEditing ? t('transactions.editTransaction') : t('transactions.addNew')}
          </CardTitle>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={t('transactions.form.title')}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
              <Input
                label={t('transactions.form.amount')}
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('transactions.form.type')}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'income' | 'expense',
                      categoryId: '',
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="expense">{t('common.expense')}</option>
                  <option value="income">{t('common.income')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('transactions.form.category')}
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">{t('transactions.form.selectCategory')}</option>
                  {filteredCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {t(getTranslatedCategoryName(category.name))}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('transactions.form.account')}
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{t('transactions.form.selectAccount')}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} {account.isDefault ? `(${t('common.default')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label={t('transactions.form.date')}
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>

            {/* Voice Input Section - Show for both adding and editing */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {isEditing ? t('voice.updateByVoice') : t('voice.addByVoice')}
              </label>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={isEditing ? handleVoiceUpdate : handleVoiceInput}
                  disabled={voiceState === 'processing' || isProcessingVoice}
                  className={`
                    flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium
                    transition-all duration-200 ease-in-out
                    ${voiceState === 'recording'
                      ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-200 animate-pulse'
                      : voiceState === 'processing' || isProcessingVoice
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                    }
                  `}
                >
                  {voiceState === 'recording' ? (
                    <>
                      <Square className="h-5 w-5" />
                      <span>{t('voice.stopRecording')}</span>
                    </>
                  ) : voiceState === 'processing' || isProcessingVoice ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>{t('voice.processing')}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" />
                      <span>{isEditing ? t('voice.updateByVoice') : t('voice.addByVoice')}</span>
                    </>
                  )}
                </button>

                {voiceFeedback && (
                  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
                    voiceFeedback.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {voiceFeedback.type === 'success' ? (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>{voiceFeedback.message}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3 italic">
                {isEditing ? t('voice.updateHint') : t('voice.transactionHint')}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit">
                <Check className="mr-2 h-4 w-4" />
                {isEditing ? t('common.update') : hasVoiceData ? t('common.update') : t('common.create')}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                <X className="mr-2 h-4 w-4" />
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
