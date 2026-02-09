import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { useVoiceForm } from '../hooks/useVoiceForm';
import { sendVoiceBudgetUpdate } from '../services/voiceService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Budget, Category } from '../types';
import { cn } from '../utils/cn';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget?: Budget | null;
  categories: Category[];
  onSave: (budget: Partial<Budget>) => void;
  userId: string;
  autoStartRecording?: boolean;
}

export function BudgetModal({
  isOpen,
  onClose,
  budget,
  categories,
  onSave,
  userId,
  autoStartRecording = false,
}: BudgetModalProps) {
  const { t, i18n } = useTranslation();
  const isEditing = !!budget;

  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly' as 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
  });

  const voice = useVoiceForm({ autoStartRecording });

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
    voice.resetVoice();
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
    if (voice.voiceState === 'recording') {
      const audioBlob = await voice.stopRecording();

      if (audioBlob) {
        voice.setProcessing(true);

        try {
          // Use update mode if editing OR if we already have voice data (second voice input)
          const result = await sendVoiceBudgetUpdate(
            audioBlob,
            i18n.language,
            {
              ...formData,
              amount: formData.amount ? parseFloat(formData.amount) : undefined,
              id: budget?.id,
            },
            isEditing || voice.hasVoiceData,  // Second audio = update mode
            expenseCategories
          );

          if (result.success && result.data) {
            setFormData(prev => ({
              ...prev,
              ...result.data,
              amount: result.data?.amount?.toString() || prev.amount,
            }));
            voice.setVoiceDataReceived();
            voice.showFeedback('success', result.message || t('voice.updateSuccess') || 'Budget information extracted from voice');
          } else {
            voice.showFeedback('error', result.error || t('voice.error') || 'Could not understand. Please try again.');
          }
        } catch (error) {
          console.error('Voice processing error:', error);
          voice.showFeedback('error', t('voice.error') || 'Could not understand. Please try again.');
        } finally {
          voice.setProcessing(false);
        }
      }
    } else if (voice.voiceState === 'idle' || voice.voiceState === 'error') {
      voice.clearFeedback();
      await voice.startRecording();
    }
  }, [voice, i18n.language, formData, isEditing, t, expenseCategories, budget?.id]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEditing ? t('budgets.editBudget') : t('budgets.addNew')}
      hasVoiceData={voice.hasVoiceData}
      isEditing={isEditing}
      submitLabel={voice.hasVoiceData ? t('common.update') : (isEditing ? t('common.update') : t('common.create'))}
      cancelLabel={t('common.cancel')}
      isRecording={voice.voiceState === 'recording'}
      onCancelRecording={voice.cancelRecording}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            {t('common.category')}
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
            required
          >
            <option value="" className="text-neutral-900">{t('budgets.form.selectCategory')}</option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id} className="text-neutral-900">
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
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          required
        />
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            {t('budgets.form.period')}
          </label>
          <select
            value={formData.period}
            onChange={(e) => setFormData({
              ...formData,
              period: e.target.value as 'monthly' | 'yearly',
            })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
          >
            <option value="monthly" className="text-neutral-900">{t('budgets.period.monthly')}</option>
            <option value="yearly" className="text-neutral-900">{t('budgets.period.yearly')}</option>
          </select>
        </div>
        <Input
          label={t('budgets.form.startDate')}
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
        />
      </div>

      {/* Voice Input Section */}
      <div className="border-t border-slate/10 pt-3 mt-3 sm:pt-4 sm:mt-4">
        <label className="block text-sm font-medium text-ink mb-2 sm:mb-3">
          {(voice.hasVoiceData || isEditing) ? t('voice.updateByVoice') : t('voice.addByVoice')}
        </label>
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={voice.voiceState === 'processing' || voice.isProcessingVoice}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-11 sm:h-14 rounded-full font-medium transition-all duration-300",
                voice.voiceState === 'recording'
                  ? 'bg-emerald text-white ring-4 ring-emerald/20 animate-pulse'
                  : voice.voiceState === 'processing' || voice.isProcessingVoice
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
        <p className="text-xs text-ink/70 mt-3 italic">
          {t('voice.budgetHint') || 'Diga algo como: "Criar orçamento de 500 reais para Alimentação mensal"'}
        </p>
      </div>
    </BaseModal>
  );
}
