import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { sendVoiceAccountUpdate } from '../services/voiceService';
import type { Account } from '../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: Account | null;
  onSave: (account: Partial<Account>) => void;
  userId: string;
}

const CURRENCIES = [
  { code: 'BRL', name: 'Real Brasileiro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
];

export function AccountModal({
  isOpen,
  onClose,
  account,
  onSave,
  userId,
}: AccountModalProps) {
  const { t, i18n } = useTranslation();
  const isEditing = !!account;

  const [formData, setFormData] = useState({
    name: '',
    currency: 'BRL',
    initialBalance: 0,
    balance: 0,
    isDefault: false,
  });

  // Voice state
  const { state: voiceState, error: voiceError, startRecording, stopRecording, reset: resetVoice } = useVoiceRecorder();
  const [voiceFeedback, setVoiceFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [hasVoiceData, setHasVoiceData] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        currency: account.currency || 'BRL',
        initialBalance: account.initialBalance || 0,
        balance: account.balance || 0,
        isDefault: account.isDefault || false,
      });
    } else {
      setFormData({
        name: '',
        currency: 'BRL',
        initialBalance: 0,
        balance: 0,
        isDefault: false,
      });
    }
    setVoiceFeedback(null);
    setHasVoiceData(false);
  }, [account, isOpen]);

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
          const result = await sendVoiceAccountUpdate(
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
              message: result.message || t('voice.updateSuccess') || 'Account information extracted from voice',
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
            {isEditing ? t('accounts.editAccount') : t('accounts.addNew')}
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
              label={t('accounts.form.name')}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('accounts.form.currency')}
              </label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code} className="text-neutral-900">
                    {currency.code} - {currency.name}
                  </option>
                ))}
              </select>
            </div>

            {!isEditing && (
              <Input
                label={t('accounts.form.initialBalance')}
                type="number"
                step="0.01"
                value={formData.initialBalance}
                onChange={(e) =>
                  setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })
                }
                required
              />
            )}

            {isEditing && (
              <Input
                label={t('accounts.form.balance') || 'Saldo Atual'}
                type="number"
                step="0.01"
                value={formData.balance}
                onChange={(e) =>
                  setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })
                }
              />
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData({ ...formData, isDefault: e.target.checked })
                }
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700">
                {t('accounts.form.setAsDefault')}
              </label>
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
                {t('voice.accountHint') || 'Diga algo como: "Criar conta Nubank com saldo inicial de 1000 reais"'}
              </p>
            </div>

            <div className="flex flex-row gap-2 pt-4">
              <Button type="submit" className="flex-1 sm:flex-none whitespace-nowrap" leftIcon={<Check className="h-4 w-4 flex-shrink-0" />}>
                {hasVoiceData ? t('common.update') : (isEditing ? t('common.update') : t('common.create'))}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1 sm:flex-none whitespace-nowrap" leftIcon={<X className="h-4 w-4 flex-shrink-0" />}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
