import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { useVoice } from '../context/VoiceContext';
import { useVoiceForm } from '../hooks/useVoiceForm';
import { sendVoiceBudgetUpdate } from '../services/voiceService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import { validateMoney, parseMoneyInput } from '../utils/numericInputs';
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const voice = useVoiceForm({ autoStartRecording });
  const { setIsModalActive } = useVoice();

  const expenseCategories = categories
    .filter((c) => c.type === 'expense')
    .sort((a, b) =>
      t(getTranslatedCategoryName(a.name)).localeCompare(
        t(getTranslatedCategoryName(b.name)),
        undefined,
        { sensitivity: 'base' }
      )
    );

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

  // Sync isModalActive with VoiceContext
  useEffect(() => {
    setIsModalActive(isOpen);
    return () => {
      if (isOpen) setIsModalActive(false);
    };
  }, [isOpen, setIsModalActive]);

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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.categoryId) {
      newErrors.categoryId = t('errors.fieldRequired') || 'Field is required';
    }

    const amountError = validateMoney(formData.amount, (key, defaultValue) => {
      const translated = t(key);
      return translated || defaultValue || key;
    });
    if (amountError) {
      newErrors.amount = amountError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const parsedAmount = parseMoneyInput(formData.amount);
    if (parsedAmount === null) {
      setErrors({ amount: t('errors.invalidNumber', 'Invalid number format') });
      return;
    }

    onSave({
      ...formData,
      amount: parsedAmount,
      userId,
    });
  };

  const handleVoiceConfirm = async () => {
    // 1. Stop recording and get the blob
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
            amount: formData.amount ? (parseMoneyInput(formData.amount) || 0) : undefined,
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
          setHighlightedFields(new Set(Object.keys(result.data)));
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
  };

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
      onVoiceClick={voice.voiceState === 'recording' ? voice.stopRecording : voice.startRecording}
      onVoiceConfirm={handleVoiceConfirm}
      onVoiceCancel={voice.cancelRecording}
      getAudioLevel={voice.getAudioLevel}
      isProcessingVoice={voice.isProcessingVoice}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            {t('common.category')}
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className={cn(
              "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue",
              highlightedFields.has('categoryId') && "animate-voice-highlight"
            )}
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
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          error={errors.amount}
          className={highlightedFields.has('amount') ? 'animate-voice-highlight' : ''}
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
            className={cn(
              "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue",
              highlightedFields.has('period') && "animate-voice-highlight"
            )}
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
          className={highlightedFields.has('startDate') ? 'animate-voice-highlight' : ''}
        />
      </div>
    </BaseModal>
  );
}
