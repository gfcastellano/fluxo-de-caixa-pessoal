import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';
import { Input } from './Input';
import { ColorPicker } from './ColorPicker';
import { cn } from '../utils/cn';
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
    creditLimit: 0,
    closingDay: 1,
    dueDay: 10,
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
        creditLimit: creditCard.creditLimit || 0,
        closingDay: creditCard.closingDay || 1,
        dueDay: creditCard.dueDay || 10,
        color: creditCard.color || '#4F46E5',
        isDefault: creditCard.isDefault || false,
      });
    } else {
      setFormData({
        name: '',
        linkedAccountId: accounts.find(a => a.isDefault)?.id || '',
        creditLimit: 0,
        closingDay: 1,
        dueDay: 10,
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

    if (formData.creditLimit <= 0) {
      newErrors.creditLimit = t('creditCards.errors.limitPositive') || 'Limite deve ser maior que zero';
    }

    if (formData.closingDay < 1 || formData.closingDay > 31) {
      newErrors.closingDay = t('creditCards.errors.closingDayInvalid') || 'Dia de fechamento deve ser entre 1 e 31';
    }

    if (formData.dueDay < 1 || formData.dueDay > 31) {
      newErrors.dueDay = t('creditCards.errors.dueDayInvalid') || 'Dia de vencimento deve ser entre 1 e 31';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    onSave({
      ...formData,
      userId,
    });
  };

  // Filter out cash accounts for linking (only regular accounts)
  const linkableAccounts = accounts.filter(a => !a.isCash);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEditing ? t('creditCards.editCard') || 'Editar Cartão' : t('creditCards.addNew') || 'Adicionar Cartão'}
      submitLabel={isEditing ? t('common.update') || 'Atualizar' : t('common.create') || 'Criar'}
      cancelLabel={t('common.cancel') || 'Cancelar'}
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
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-ink mb-1.5">
            {t('creditCards.form.linkedAccount') || 'Conta Vinculada'}
          </label>
          <select
            value={formData.linkedAccountId}
            onChange={(e) => setFormData({ ...formData, linkedAccountId: e.target.value })}
            className="w-full rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all"
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
            type="number"
            step="0.01"
            min="0"
            value={formData.creditLimit}
            onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
            error={errors.creditLimit}
            required
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
            type="number"
            min="1"
            max="31"
            value={formData.closingDay}
            onChange={(e) => setFormData({ ...formData, closingDay: parseInt(e.target.value) || 1 })}
            error={errors.closingDay}
            required
          />
          <p className="mt-1 text-xs text-slate">
            {t('creditCards.form.closingDayHint') || 'Dia em que a fatura fecha (1-31)'}
          </p>
        </div>

        <div>
          <Input
            label={t('creditCards.form.dueDay') || 'Dia do Vencimento'}
            type="number"
            min="1"
            max="31"
            value={formData.dueDay}
            onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value) || 1 })}
            error={errors.dueDay}
            required
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
