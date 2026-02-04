import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { sendVoiceBudgetUpdate } from '../services/voiceService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Budget, Category } from '../types';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget?: Budget | null;
  categories: Category[];
  onSave: (budget: Partial<Budget>) => void;
  userId: string;
}

export function BudgetModal({
  isOpen,
  onClose,
  budget,
  categories,
  onSave,
  userId,
}: BudgetModalProps) {
  const { t, i18n } = useTranslation();
  const isEditing = !!budget;

  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
  });

  // Voice state
  const { state: voiceState, error: voiceError, startRecording, stopRecording, reset: resetVoice } = useVoiceRecorder();
  const [voiceFeedback, setVoiceFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [hasVoiceData, setHasVoiceData] = useState(false);

  // Filter only expense categories for budgets
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  useEffect(() => {
    if (budget) {
      setFormData({
        categoryId: budget.categoryId || '',
        amount: budget.amount?.toString() || '',
        period: budget.period || 'monthly',
        startDate: budget.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      });
    } else {
      setFormData({
        categoryId: '',
        amount: '',
        period: 'monthly',
        startDate: new Date().toISOString().split('T')[0],
      });
    }
    setVoiceFeedback(null);
    setHasVoiceData(false);
  }, [budget, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
      userId,
    });
  };

  const handleVoiceInput = useCallback(async () => {
    if (voiceState === 'recording') {
      const audioBlob = await stopRecording();

      if (audioBlob) {
        setIsProcessingVoice(true);

        try {
          // Send audio to backend for processing
          const result = await sendVoiceBudgetUpdate(
            audioBlob,
            i18n.language,
            {
              ...formData,
              amount: formData.amount ? parseFloat(formData.amount) : undefined,
            },
            isEditing
          );

          if (result.success && result.data) {
            // Apply parsed updates to form
            setFormData(prev => ({
              ...prev,
              ...result.data,
              amount: result.data?.amount?.toString() || prev.amount,
            }));
            setHasVoiceData(true);

            setVoiceFeedback({
              type: 'success',
              message: result.message || t('voice.updateSuccess') || 'Budget information extracted from voice',
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
  }, [voiceState, stopRecording, startRecording, resetVoice, i18n.language, formData, isEditing, t]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {isEditing ? t('budgets.editBudget') : t('budgets.addNew')}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.category')}
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryId: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">{t('budgets.form.selectCategory')}</option>
                  {expenseCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {t(getTranslatedCategoryName(category.name))}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label={t('budgets.form.amount')}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('budgets.form.period')}
                </label>
                <select
                  value={formData.period}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      period: e.target.value as 'monthly' | 'yearly',
                    })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="monthly">{t('budgets.period.monthly')}</option>
                  <option value="yearly">{t('budgets.period.yearly')}</option>
                </select>
              </div>
              <Input
                label={t('budgets.form.startDate')}
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
              />
            </div>

            {/* Voice Input Section */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('voice.addByVoice')}
              </label>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleVoiceInput}
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
                      <span>{t('voice.addByVoice')}</span>
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
                {t('voice.budgetHint') || 'Diga algo como: "Criar orçamento de 500 reais para Alimentação mensal"'}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit">
                <Check className="mr-2 h-4 w-4" />
                {hasVoiceData ? t('common.update') : (isEditing ? t('common.update') : t('common.create'))}
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
