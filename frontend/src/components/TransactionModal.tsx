import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { sendVoiceTransactionUpdate } from '../services/voiceService';
import { getCategories } from '../services/categoryService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Transaction, Category } from '../types';

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

  // Voice update state
  const { state: voiceState, error: voiceError, startRecording, stopRecording, reset: resetVoice } = useVoiceRecorder();
  const [voiceFeedback, setVoiceFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

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
  }, [transaction, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
    });
  };

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
        
        if (result.success && result.data) {
          setVoiceFeedback({
            type: 'success',
            message: result.message || t('voice.updateSuccess'),
          });
          
          // Update form data with the parsed changes
          const updates: Partial<Transaction> = {};
          if (result.data.description) {
            updates.description = result.data.description;
            setFormData(prev => ({ ...prev, description: result.data!.description! }));
          }
          if (result.data.amount) {
            updates.amount = result.data.amount;
            setFormData(prev => ({ ...prev, amount: result.data!.amount!.toString() }));
          }
          if (result.data.type) {
            updates.type = result.data.type;
            setFormData(prev => ({ ...prev, type: result.data!.type! }));
          }
          if (result.data.categoryId) {
            updates.categoryId = result.data.categoryId;
            setFormData(prev => ({ ...prev, categoryId: result.data!.categoryId! }));
          }
          if (result.data.date) {
            updates.date = result.data.date;
            setFormData(prev => ({ ...prev, date: result.data!.date! }));
          }
          
          // Notify parent component about voice updates
          if (onVoiceUpdate && Object.keys(updates).length > 0) {
            onVoiceUpdate(updates);
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
  }, [voiceState, stopRecording, startRecording, i18n.language, transaction, categories, t, resetVoice]);

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

            {/* Voice Update Section - Only show when editing */}
            {isEditing && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('voice.updateByVoice')}
                </label>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleVoiceUpdate}
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
                        <span>{t('voice.updateByVoice')}</span>
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
                  {t('voice.updateHint')}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit">
                <Check className="mr-2 h-4 w-4" />
                {isEditing ? t('common.update') : t('common.create')}
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
