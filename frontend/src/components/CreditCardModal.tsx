import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { ColorPicker } from './ColorPicker';
import { cn } from '../utils/cn';
import { useVoiceForm } from '../hooks/useVoiceForm';
import { useVoice } from '../context/VoiceContext';
import { sendVoiceCreditCardUpdate } from '../services/voiceService';
import { validateMoney, parseMoneyInput } from '../utils/numericInputs';
import type { CreditCard, Account } from '../types';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditCard?: CreditCard | null;
  onSave: (creditCard: Partial<CreditCard>) => void;
  userId: string;
  accounts: Account[];
  autoStartRecording?: boolean;
}

export function CreditCardModal({
  isOpen,
  onClose,
  creditCard,
  onSave,
  userId,
  accounts,
}: CreditCardModalProps) {
  const { t } = useTranslation();
  const isEditing = !!creditCard;

  const [formData, setFormData] = useState({
    name: '',
    linkedAccountId: '',
    creditLimit: '',
    closingDay: '1',
    dueDay: '10',
    color: '#4F46E5',
    isDefault: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or credit card changes
  useEffect(() => {
    if (creditCard) {
      setFormData({
        name: creditCard.name || '',
        linkedAccountId: creditCard.linkedAccountId || '',
        creditLimit: creditCard.creditLimit?.toString() || '',
        closingDay: creditCard.closingDay?.toString() || '1',
        dueDay: creditCard.dueDay?.toString() || '10',
        color: creditCard.color || '#4F46E5',
        isDefault: creditCard.isDefault || false,
      });
    } else {
      setFormData({
        name: '',
        linkedAccountId: accounts.find(a => a.isDefault)?.id || '',
        creditLimit: '',
        closingDay: '1',
        dueDay: '10',
        color: '#4F46E5',
        isDefault: false,
      });
    }
    setErrors({});
  }, [creditCard, isOpen, accounts]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('creditCards.errors.nameRequired') || 'Nome do cartão é obrigatório';
    }

    if (!formData.linkedAccountId) {
      newErrors.linkedAccountId = t('creditCards.errors.accountRequired') || 'Conta vinculada é obrigatória';
    }

    const creditLimitError = validateMoney(formData.creditLimit, (key, defaultValue) => {
      const translated = t(key);
      return (translated && translated !== key) ? translated : (defaultValue || key);
    });
    if (creditLimitError) {
      newErrors.creditLimit = creditLimitError;
    }

    const closingDayError = formData.closingDay ? (() => {
      const day = parseInt(formData.closingDay);
      if (isNaN(day) || day < 1 || day > 31) {
        return t('creditCards.errors.closingDayInvalid') || 'Dia de fechamento deve ser entre 1 e 31';
      }
      return '';
    })() : '';
    if (closingDayError) {
      newErrors.closingDay = closingDayError;
    }

    const dueDayError = formData.dueDay ? (() => {
      const day = parseInt(formData.dueDay);
      if (isNaN(day) || day < 1 || day > 31) {
        return t('creditCards.errors.dueDayInvalid') || 'Dia de vencimento deve ser entre 1 e 31';
      }
      return '';
    })() : '';
    if (dueDayError) {
      newErrors.dueDay = dueDayError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Voice integration
  const voice = useVoiceForm({ autoStartRecording: false });
  const { i18n } = useTranslation();
  const { setIsModalActive } = useVoice();

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const parsedLimit = parseMoneyInput(formData.creditLimit);
    onSave({
      ...formData,
      creditLimit: parsedLimit !== null ? parsedLimit : 0,
      closingDay: parseInt(formData.closingDay),
      dueDay: parseInt(formData.dueDay),
      userId,
    });
  };

  async function handleVoiceConfirm() {
    // 1. Stop recording and get the blob
    const audioBlob = await voice.stopRecording();

    if (audioBlob) {
      voice.setProcessing(true);

      try {
        // Use update mode if editing OR if we already have voice data (second voice input)
        // Need to convert string values to numbers for the service
        const parsedLimit = parseMoneyInput(formData.creditLimit);
        const serviceData = {
          ...formData,
          creditLimit: parsedLimit !== null ? parsedLimit : 0,
          closingDay: parseInt(formData.closingDay) || 1,
          dueDay: parseInt(formData.dueDay) || 10
        };

        const result = await sendVoiceCreditCardUpdate(
          audioBlob,
          i18n.language,
          serviceData,
          isEditing || voice.hasVoiceData
        );

        if (result.success && result.data) {
          setFormData(prev => ({
            ...prev,
            ...result.data,
            creditLimit: result.data?.creditLimit?.toString() || prev.creditLimit,
            closingDay: result.data?.closingDay?.toString() || prev.closingDay,
            dueDay: result.data?.dueDay?.toString() || prev.dueDay,
          }));
          setHighlightedFields(new Set(Object.keys(result.data || {})));
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
  }

  // Filter out cash accounts for linking (only regular accounts)
  const linkableAccounts = accounts.filter(a => !a.isCash);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEditing ? t('creditCards.editCard') || 'Editar Cartão' : t('creditCards.addNew') || 'Adicionar Cartão'}
      submitLabel={voice.hasVoiceData ? t('common.update') : (isEditing ? t('common.update') : t('common.create'))}
      cancelLabel={t('common.cancel') || 'Cancelar'}
      isRecording={voice.voiceState === 'recording'}
      onCancelRecording={voice.cancelRecording}
      onVoiceClick={voice.voiceState === 'recording' ? voice.stopRecording : voice.startRecording}
      onVoiceConfirm={handleVoiceConfirm}
      onVoiceCancel={voice.cancelRecording}
      getAudioLevel={voice.getAudioLevel}
      isProcessingVoice={voice.isProcessingVoice}
      hasVoiceData={voice.hasVoiceData}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input
            label={t('creditCards.form.name') || 'Nome do Cartão'}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
            placeholder={t('creditCards.form.namePlaceholder') || 'Ex: Nubank, Itaú, etc.'}
            className={highlightedFields.has('name') ? 'animate-voice-highlight' : ''}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink mb-1.5">
            {t('creditCards.form.linkedAccount') || 'Conta Vinculada'}
          </label>
          <select
            value={formData.linkedAccountId}
            onChange={(e) => setFormData({ ...formData, linkedAccountId: e.target.value })}
            className={cn(
              "w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all",
              highlightedFields.has('linkedAccountId') && "animate-voice-highlight"
            )}
            required
          >
            <option value="">
              {t('creditCards.form.selectAccount') || 'Selecione uma conta'}
            </option>
            {linkableAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} {account.isDefault ? `(${t('common.default')})` : ''}
              </option>
            ))}
          </select>
          {errors.linkedAccountId && (
            <p className="mt-1 text-xs text-red-500">{errors.linkedAccountId}</p>
          )}
        </div>

        <div>
          <Input
            label={t('creditCards.form.creditLimit') || 'Limite do Cartão'}
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formData.creditLimit}
            onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
            error={errors.creditLimit}
            className={highlightedFields.has('creditLimit') ? 'animate-voice-highlight' : ''}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            {t('creditCards.form.color') || 'Cor do Cartão'}
          </label>
          <ColorPicker
            value={formData.color}
            onChange={(color) => setFormData({ ...formData, color })}
          />
        </div>

        <div>
          <Input
            label={t('creditCards.form.closingDay') || 'Dia do Fechamento'}
            type="text"
            inputMode="numeric"
            placeholder="1-31"
            value={formData.closingDay}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d+$/.test(val)) {
                setFormData({ ...formData, closingDay: val });
              }
            }}
            error={errors.closingDay}
            required
            className={highlightedFields.has('closingDay') ? 'animate-voice-highlight' : ''}
          />
          <p className="mt-1 text-xs text-slate">
            {t('creditCards.form.closingDayHint') || 'Dia em que a fatura fecha (1-31)'}
          </p>
        </div>

        <div>
          <Input
            label={t('creditCards.form.dueDay') || 'Dia do Vencimento'}
            type="text"
            inputMode="numeric"
            placeholder="1-31"
            value={formData.dueDay}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d+$/.test(val)) {
                setFormData({ ...formData, dueDay: val });
              }
            }}
            error={errors.dueDay}
            required
            className={highlightedFields.has('dueDay') ? 'animate-voice-highlight' : ''}
          />
          <p className="mt-1 text-xs text-slate">
            {t('creditCards.form.dueDayHint') || 'Dia de vencimento da fatura (1-31)'}
          </p>
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between p-3 bg-slate/5 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-ink">
                {t('creditCards.form.isDefault') || 'Cartão Padrão'}
              </label>
              <p className="text-xs text-slate">
                {t('creditCards.form.isDefaultHint') || 'Usar como cartão padrão para novas compras'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                formData.isDefault ? 'bg-blue' : 'bg-slate/30'
              )}
            >
              <span
                className={cn(
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                  formData.isDefault ? 'translate-x-5' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
