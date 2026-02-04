import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
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
  }, [account, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      userId,
    });
  };

  // Parse voice input to extract account information
  const parseVoiceInput = useCallback((transcription: string): Partial<Account> => {
    const lowerTranscription = transcription.toLowerCase();
    const updates: Partial<Account> = {};

    // Extract name - look for patterns like "nome é X", "chama X", "conta X"
    const namePatterns = [
      /(?:nome|chama|conta|chamada)\s+(?:é|e|eh|seja|chama)?\s*["']?([^"'0-9]+?)(?:\s+(?:com|de|para|e|usando)|$)/i,
      /(?:criar?|nova?|adicionar?)\s+(?:uma?\s+)?(?:conta?\s+)?(?:chamada?\s+)?["']?([^"'0-9]+?)(?:\s+(?:com|de|para|e|usando)|$)/i,
    ];

    for (const pattern of namePatterns) {
      const match = lowerTranscription.match(pattern);
      if (match && match[1]) {
        updates.name = match[1].trim();
        break;
      }
    }

    // Extract currency - look for currency codes or names
    const currencyPatterns = [
      { code: 'BRL', patterns: ['real', 'reais', 'brl', 'r$'] },
      { code: 'USD', patterns: ['dollar', 'dólares', 'dolar', 'usd', '$'] },
      { code: 'EUR', patterns: ['euro', 'euros', 'eur', '€'] },
    ];

    for (const { code, patterns } of currencyPatterns) {
      if (patterns.some(p => lowerTranscription.includes(p))) {
        updates.currency = code;
        break;
      }
    }

    // Extract initial balance - look for numbers
    const balancePatterns = [
      /(?:saldo|balance|valor|inicial)\s+(?:inicial\s+)?(?:de\s+)?(?:r\$|\$|€)?\s*([\d.,]+)/i,
      /(?:com\s+)?(?:saldo|balance|valor)\s+(?:de\s+)?(?:r\$|\$|€)?\s*([\d.,]+)/i,
      /(?:r\$|\$|€)\s*([\d.,]+)/,
      /([\d.,]+)\s*(?:reais?|dólares?|euros?)/i,
    ];

    for (const pattern of balancePatterns) {
      const match = lowerTranscription.match(pattern);
      if (match && match[1]) {
        // Parse number, handling both comma and dot as decimal separator
        const balanceStr = match[1].replace(/\./g, '').replace(',', '.');
        const balance = parseFloat(balanceStr);
        if (!isNaN(balance)) {
          updates.initialBalance = balance;
          break;
        }
      }
    }

    // Check for default account
    const defaultPatterns = ['padrão', 'default', 'principal', 'main', 'primária'];
    if (defaultPatterns.some(p => lowerTranscription.includes(p))) {
      updates.isDefault = true;
    }

    return updates;
  }, []);

  const handleVoiceInput = useCallback(async () => {
    if (voiceState === 'recording') {
      const audioBlob = await stopRecording();

      if (audioBlob) {
        setIsProcessingVoice(true);

        // Simulate processing delay (in a real implementation, this would call a backend service)
        // For now, we'll use the local parsing function
        try {
          // Create a temporary URL for the audio blob to transcribe
          const audioUrl = URL.createObjectURL(audioBlob);

          // In a real implementation, you would send this to a backend service
          // For this demo, we'll use a mock transcription based on the audio duration
          // This is a placeholder - in production, integrate with a speech-to-text service

          // Mock: Wait a bit to simulate processing
          await new Promise(resolve => setTimeout(resolve, 1000));

          // For demo purposes, we'll show a message that voice processing needs backend integration
          // In production, replace this with actual transcription
          setVoiceFeedback({
            type: 'error',
            message: t('voice.processing') + ' - ' + t('voice.backendIntegrationNeeded'),
          });

          setTimeout(() => {
            setVoiceFeedback(null);
            resetVoice();
          }, 5000);
        } catch (error) {
          console.error('Voice processing error:', error);
          setVoiceFeedback({
            type: 'error',
            message: t('voice.error'),
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
  }, [voiceState, stopRecording, startRecording, resetVoice, t]);

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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
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
