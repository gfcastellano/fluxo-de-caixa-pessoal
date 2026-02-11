import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { useVoiceForm } from '../hooks/useVoiceForm';
import { useVoice } from '../context/VoiceContext';
import { sendVoiceCategoryUpdate } from '../services/voiceService';
import type { Category } from '../types';
import { cn } from '../utils/cn';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
  onSave: (category: Partial<Category>) => void;
  userId: string;
  autoStartRecording?: boolean;
}

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

export function CategoryModal({
  isOpen,
  onClose,
  category,
  onSave,
  userId,
  autoStartRecording = false,
}: CategoryModalProps) {
  const { t, i18n } = useTranslation();
  const isEditing = !!category;

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense' | 'transfer',
    color: CATEGORY_COLORS[0],
  });

  const voice = useVoiceForm({ autoStartRecording });
  const { setIsModalActive } = useVoice();

  // Sync isModalActive with VoiceContext
  useEffect(() => {
    setIsModalActive(isOpen);
    return () => {
      if (isOpen) setIsModalActive(false);
    };
  }, [isOpen, setIsModalActive]);

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        type: category.type || 'expense',
        color: category.color || CATEGORY_COLORS[0],
      });
    } else {
      setFormData({
        name: '',
        type: 'expense',
        color: CATEGORY_COLORS[0],
      });
    }
    voice.resetVoice();
  }, [category, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure type is valid
    let validType = formData.type;
    const lowerType = String(formData.type).toLowerCase();

    if (lowerType === 'receita' || lowerType === 'income' || lowerType === 'entrada') {
      validType = 'income';
    } else {
      // Default to expense for safety, or if it's explicitly expense/despesa
      validType = 'expense';
    }

    onSave({
      ...formData,
      type: validType,
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
          const result = await sendVoiceCategoryUpdate(
            audioBlob,
            i18n.language,
            formData,
            isEditing || voice.hasVoiceData  // Second audio = update mode
          );

          if (result.success && result.data) {
            // Normalize data received from voice
            const normalizedData = { ...result.data };

            if (normalizedData.type) {
              const t = String(normalizedData.type).toLowerCase();
              if (t.includes('receita') || t.includes('income')) {
                normalizedData.type = 'income';
              } else if (t.includes('despesa') || t.includes('expense') || t.includes('gasto')) {
                normalizedData.type = 'expense';
              }
            }

            setFormData(prev => ({
              ...prev,
              ...normalizedData,
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
  }, [voice.voiceState, voice.audioBlob, voice.hasVoiceData, isEditing, i18n.language, formData, t]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEditing ? t('categories.editCategory') : t('categories.addNew')}
      hasVoiceData={voice.hasVoiceData}
      isEditing={isEditing}
      submitLabel={voice.hasVoiceData ? t('common.update') : (isEditing ? t('common.update') : t('common.create'))}
      cancelLabel={t('common.cancel')}
      isRecording={voice.voiceState === 'recording'}
      onCancelRecording={voice.cancelRecording}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Input
          label={t('common.name')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.type')}
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({
              ...formData,
              type: e.target.value as 'income' | 'expense',
            })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
          >
            <option value="expense" className="text-neutral-900">{t('common.expense')}</option>
            <option value="income" className="text-neutral-900">{t('common.income')}</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('categories.form.color')}
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-8 h-8 rounded-full border-2 ${formData.color === color
                  ? 'border-gray-900'
                  : 'border-transparent'
                  }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
