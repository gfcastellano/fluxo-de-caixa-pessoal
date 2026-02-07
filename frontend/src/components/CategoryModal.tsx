import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { useVoiceForm } from '../hooks/useVoiceForm';
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
    type: 'expense' as 'income' | 'expense',
    color: CATEGORY_COLORS[0],
  });

  const voice = useVoiceForm({ autoStartRecording });

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

  const handleVoiceInput = useCallback(async () => {
    if (voice.voiceState === 'recording') {
      const audioBlob = await voice.stopRecording();

      if (audioBlob) {
        voice.setProcessing(true);

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
            voice.showFeedback('success', result.message || t('voice.updateSuccess') || 'Category information extracted from voice');
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
  }, [voice, i18n.language, formData, isEditing, t]);

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

      <div>
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
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${voice.voiceFeedback.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
              {voice.voiceFeedback.type === 'success' ? (
                <Check className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{voice.voiceFeedback.message}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-3 italic">
          {t('voice.categoryHint') || 'Diga algo como: "Criar categoria Alimentação do tipo despesa com cor verde"'}
        </p>
      </div>
    </BaseModal>
  );
}
