import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { sendVoiceCategoryUpdate } from '../services/voiceService';
import type { Category } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
  onSave: (category: Partial<Category>) => void;
  userId: string;
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
}: CategoryModalProps) {
  const { t, i18n } = useTranslation();
  const isEditing = !!category;

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: CATEGORY_COLORS[0],
  });

  // Voice state
  const { state: voiceState, error: voiceError, startRecording, stopRecording, reset: resetVoice } = useVoiceRecorder();
  const [voiceFeedback, setVoiceFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [hasVoiceData, setHasVoiceData] = useState(false);

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
    setVoiceFeedback(null);
    setHasVoiceData(false);
  }, [category, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
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
          const result = await sendVoiceCategoryUpdate(
            audioBlob,
            i18n.language,
            formData,
            isEditing
          );

          if (result.success && result.data) {
            // Apply parsed updates to form
            setFormData(prev => ({
              ...prev,
              ...result.data,
            }));
            setHasVoiceData(true);

            setVoiceFeedback({
              type: 'success',
              message: result.message || t('voice.updateSuccess') || 'Category information extracted from voice',
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
            {isEditing ? t('categories.editCategory') : t('categories.addNew')}
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
            <Input
              label={t('common.name')}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.type')}
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as 'income' | 'expense',
                  })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="expense">{t('common.expense')}</option>
                <option value="income">{t('common.income')}</option>
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
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color
                        ? 'border-gray-900'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
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
                {t('voice.categoryHint') || 'Diga algo como: "Criar categoria Alimentação do tipo despesa com cor verde"'}
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
