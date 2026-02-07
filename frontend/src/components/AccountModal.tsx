import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Square, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { ColorPicker } from './ColorPicker';
import { useVoiceForm } from '../hooks/useVoiceForm';
import { sendVoiceAccountUpdate } from '../services/voiceService';
import type { Account } from '../types';
import { cn } from '../utils/cn';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: Account | null;
  onSave: (account: Partial<Account>) => void;
  userId: string;
  autoStartRecording?: boolean;
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
  autoStartRecording = false,
}: AccountModalProps) {
  const { t, i18n } = useTranslation();
  const isEditing = !!account;

  const [formData, setFormData] = useState({
    name: '',
    currency: 'BRL',
    initialBalance: 0,
    balance: 0,
    isDefault: false,
    color: '#3B82F6',
  });

  // Use the consolidated voice form hook
  const voice = useVoiceForm({ autoStartRecording });

  // Reset form when modal opens/closes or account changes
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        currency: account.currency || 'BRL',
        initialBalance: account.initialBalance || 0,
        balance: account.balance || 0,
        isDefault: account.isDefault || false,
        color: account.color || '#3B82F6',
      });
    } else {
      setFormData({
        name: '',
        currency: 'BRL',
        initialBalance: 0,
        balance: 0,
        isDefault: false,
        color: '#3B82F6',
      });
    }
    voice.resetVoice();
  }, [account, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
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
          const result = await sendVoiceAccountUpdate(
            audioBlob,
            i18n.language,
            formData,
            isEditing || voice.hasVoiceData  // Second audio = update mode
          );

          if (result.success && result.data) {
            setFormData(prev => ({
              ...prev,
              ...result.data,
            }));
            voice.setVoiceDataReceived();
            voice.showFeedback('success', result.message || t('voice.updateSuccess') || 'Account information extracted from voice');
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
      title={isEditing ? t('accounts.editAccount') : t('accounts.addNew')}
      hasVoiceData={voice.hasVoiceData}
      isEditing={isEditing}
      submitLabel={voice.hasVoiceData ? t('common.update') : (isEditing ? t('common.update') : t('common.create'))}
      cancelLabel={t('common.cancel')}
      isRecording={voice.voiceState === 'recording'}
      onCancelRecording={voice.cancelRecording}
    >
      <Input
        label={t('accounts.form.name')}
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('accounts.form.currency')}
        </label>
        <select
          value={formData.currency}
          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue"
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
          onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
          required
        />
      )}

      {isEditing && (
        <Input
          label={t('accounts.form.balance') || 'Saldo Atual'}
          type="number"
          step="0.01"
          value={formData.balance}
          onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
        />
      )}

      <ColorPicker
        label={t('accounts.form.color') || 'Cor da conta'}
        value={formData.color}
        onChange={(color) => setFormData({ ...formData, color })}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={formData.isDefault}
          onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
          className="rounded border-gray-300 text-blue focus:ring-blue"
        />
        <label htmlFor="isDefault" className="text-sm text-slate">
          {t('accounts.form.setAsDefault')}
        </label>
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
        <p className="text-xs text-gray-500 mt-3 italic">
          {t('voice.accountHint') || 'Diga algo como: "Criar conta Nubank com saldo inicial de 1000 reais"'}
        </p>
      </div>
    </BaseModal>
  );
}
