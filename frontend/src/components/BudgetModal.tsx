import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { useVoice } from '../context/VoiceContext';
import { useVoiceForm } from '../hooks/useVoiceForm';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      amount: parseFloat(formData.amount),
      userId,
    });
  };

  // Handle voice commands from the centralized VoiceHeroButton
  useEffect(() => {
    const processVoiceCommand = async () => {
      if (voice.voiceState === 'preview' && voice.audioBlob) {
        voice.setProcessing(true);
        const audioBlob = voice.audioBlob;

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

    processVoiceCommand();
  }, [voice.voiceState, voice.audioBlob, voice.hasVoiceData, isEditing, i18n.language, formData, t, expenseCategories, budget?.id]);

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
    </BaseModal>
  );
}
