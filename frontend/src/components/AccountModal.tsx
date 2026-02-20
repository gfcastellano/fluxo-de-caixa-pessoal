import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { ColorPicker } from './ColorPicker';
import { useVoice } from '../context/VoiceContext';
import { useVoiceForm } from '../hooks/useVoiceForm';
import { sendVoiceAccountUpdate } from '../services/voiceService';
import { validateMoney, parseMoneyInput } from '../utils/numericInputs';
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
    initialBalance: '',
    balance: '',
    isDefault: false,
    color: '#3B82F6',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use the consolidated voice form hook
  const voice = useVoiceForm({ autoStartRecording });
  const { setIsModalActive } = useVoice();

  // Reset form when modal opens/closes or account changes
  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        currency: account.currency || 'BRL',
        initialBalance: account.initialBalance?.toString() || '',
        balance: account.balance?.toString() || '',
        isDefault: account.isDefault || false,
        color: account.color || '#3B82F6',
      });
    } else {
      setFormData({
        name: '',
        currency: 'BRL',
        initialBalance: '',
        balance: '',
        isDefault: false,
        color: '#3B82F6',
      });
    }
    setErrors({});
    voice.resetVoice();
  }, [account, isOpen]);

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

    if (!formData.name.trim()) {
      newErrors.name = t('errors.fieldRequired') || 'Field is required';
    }

    if (isEditing) {
      const balanceError = validateMoney(formData.balance, (key, defaultValue) => {
        const translated = t(key);
        return translated || defaultValue || key;
      }, { required: false });
      if (balanceError && formData.balance) {
        newErrors.balance = balanceError;
      }
    } else {
      const initialBalanceError = validateMoney(formData.initialBalance, (key, defaultValue) => {
        const translated = t(key);
        return translated || defaultValue || key;
      }, { required: false });
      if (initialBalanceError && formData.initialBalance) {
        newErrors.initialBalance = initialBalanceError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const payload: any = {
      ...formData,
      userId,
    };

    if (isEditing) {
      if (formData.balance) {
        const parsed = parseMoneyInput(formData.balance);
        payload.balance = parsed !== null ? parsed : 0;
      }
    } else {
      if (formData.initialBalance) {
        const parsed = parseMoneyInput(formData.initialBalance);
        payload.initialBalance = parsed !== null ? parsed : 0;
      }
    }

    onSave(payload);
  };

  const handleVoiceConfirm = async () => {
    // 1. Stop recording and get the blob
    const audioBlob = await voice.stopRecording();

    if (audioBlob) {
      voice.setProcessing(true);

      try {
        // Use update mode if editing OR if we already have voice data (second voice input)
        const result = await sendVoiceAccountUpdate(
          audioBlob,
          i18n.language,
          formData as unknown as Partial<Account>,
          isEditing || voice.hasVoiceData  // Second audio = update mode
        );

        if (result.success && result.data) {
          setFormData(prev => ({
            ...prev,
            ...result.data,
            initialBalance: result.data?.initialBalance?.toString() || prev.initialBalance,
            balance: result.data?.balance?.toString() || prev.balance,
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
      title={isEditing ? t('accounts.editAccount') : t('accounts.addNew')}
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
        <Input
          label={t('accounts.form.name')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          disabled={account?.isCash}
          className={highlightedFields.has('name') ? 'animate-voice-highlight' : ''}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('accounts.form.currency')}
          </label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            disabled={account?.isCash}
            className={cn(
              "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue",
              account?.isCash && "opacity-50 cursor-not-allowed",
              highlightedFields.has('currency') && "animate-voice-highlight"
            )}
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
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formData.initialBalance}
            onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
            error={errors.initialBalance}
            className={highlightedFields.has('initialBalance') ? 'animate-voice-highlight' : ''}
          />
        )}

        {isEditing && (
          <Input
            label={t('accounts.form.balance') || 'Saldo Atual'}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formData.balance}
            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
            error={errors.balance}
            className={highlightedFields.has('balance') ? 'animate-voice-highlight' : ''}
          />
        )}

        <ColorPicker
          label={t('accounts.form.color') || 'Cor da conta'}
          value={formData.color}
          onChange={(color) => setFormData({ ...formData, color })}
        />

        {!account?.isCash && (
          <div className="flex items-center gap-2 sm:col-span-2">
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
        )}
      </div>
    </BaseModal>
  );
}
