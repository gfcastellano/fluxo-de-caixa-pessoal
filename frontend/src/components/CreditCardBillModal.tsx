import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';
import { getBillTransactions, closeBill, payBill } from '../services/creditCardBillService';
import { getAccounts } from '../services/accountService';
import type { CreditCardBill, Transaction, Account, CreditCard } from '../types';
import { Calendar, DollarSign, CheckCircle, AlertCircle, CreditCard as CreditCardIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface CreditCardBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: CreditCardBill | null;
  creditCard: CreditCard | null;
  userId: string;
  onBillUpdated: () => void;
}

export function CreditCardBillModal({
  isOpen,
  onClose,
  bill,
  creditCard,
  userId,
  onBillUpdated,
}: CreditCardBillModalProps) {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && bill && userId) {
      loadData();
    }
  }, [isOpen, bill, userId]);

  const loadData = async () => {
    if (!bill) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [billTransactions, userAccounts] = await Promise.all([
        getBillTransactions(bill.id),
        getAccounts(userId),
      ]);
      
      setTransactions(billTransactions);
      setAccounts(userAccounts);
      
      // Set default account for payment
      const defaultAccount = userAccounts.find(a => a.isDefault);
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id);
      } else if (creditCard) {
        // Use linked account as default
        setSelectedAccountId(creditCard.linkedAccountId);
      }
    } catch (err) {
      console.error('Error loading bill data:', err);
      setError(t('creditCardBills.loadError') || 'Erro ao carregar dados da fatura');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseBill = async () => {
    if (!bill) return;
    
    if (!confirm(t('creditCardBills.confirmClose') || 'Tem certeza que deseja fechar esta fatura?')) {
      return;
    }

    setLoading(true);
    try {
      await closeBill(bill.id);
      onBillUpdated();
      onClose();
    } catch (err) {
      console.error('Error closing bill:', err);
      setError(t('creditCardBills.closeError') || 'Erro ao fechar fatura');
    } finally {
      setLoading(false);
    }
  };

  const handlePayBill = async () => {
    if (!bill || !selectedAccountId) return;
    
    if (!confirm(t('creditCardBills.confirmPay') || 'Confirmar pagamento da fatura?')) {
      return;
    }

    setLoading(true);
    try {
      await payBill(bill.id, selectedAccountId);
      onBillUpdated();
      onClose();
    } catch (err) {
      console.error('Error paying bill:', err);
      setError(t('creditCardBills.payError') || 'Erro ao pagar fatura');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (!bill || !creditCard) return null;

  const canClose = !bill.isClosed && !bill.isPaid && bill.totalAmount > 0;
  const canPay = bill.isClosed && !bill.isPaid;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('creditCardBills.title') || 'Fatura do Cartão'}
      submitLabel=""
      cancelLabel={t('common.close') || 'Fechar'}
      onSubmit={() => {}}
    >
      <div className="space-y-4">
        {/* Header with card info */}
        <div className="flex items-center gap-3 p-3 bg-blue/5 rounded-lg">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: creditCard.color ? `${creditCard.color}20` : '#EEF2FF' }}
          >
            <CreditCardIcon
              className="h-5 w-5"
              style={{ color: creditCard.color || '#4F46E5' }}
            />
          </div>
          <div>
            <p className="font-semibold text-neutral-900">{creditCard.name}</p>
            <p className="text-xs text-neutral-500">
              {t('creditCardBills.monthYear', { month: bill.month, year: bill.year }) || 
                `Fatura ${bill.month}/${bill.year}`}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {bill.isPaid ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              <CheckCircle className="h-3.5 w-3.5" />
              {t('creditCardBills.paid') || 'Paga'}
            </span>
          ) : bill.isClosed ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              {t('creditCardBills.closed') || 'Fechada - Aguardando Pagamento'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              <Calendar className="h-3.5 w-3.5" />
              {t('creditCardBills.open') || 'Aberta'}
            </span>
          )}
        </div>

        {/* Bill Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-neutral-50 rounded-lg">
            <p className="text-xs text-neutral-500 mb-1">
              {t('creditCardBills.totalAmount') || 'Valor Total'}
            </p>
            <p className="text-lg font-bold text-neutral-900">
              {formatCurrency(bill.totalAmount)}
            </p>
          </div>
          <div className="p-3 bg-neutral-50 rounded-lg">
            <p className="text-xs text-neutral-500 mb-1">
              {t('creditCardBills.dueDate') || 'Vencimento'}
            </p>
            <p className="text-lg font-bold text-neutral-900">
              {formatDate(bill.dueDate)}
            </p>
          </div>
        </div>

        {bill.closingDate && (
          <div className="p-3 bg-neutral-50 rounded-lg">
            <p className="text-xs text-neutral-500 mb-1">
              {t('creditCardBills.closingDate') || 'Data de Fechamento'}
            </p>
            <p className="text-sm font-medium text-neutral-900">
              {formatDate(bill.closingDate)}
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Transactions List */}
        <div>
          <h4 className="text-sm font-medium text-neutral-700 mb-2">
            {t('creditCardBills.transactions') || 'Transações'} ({transactions.length})
          </h4>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue"></div>
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-4">
              {t('creditCardBills.noTransactions') || 'Nenhuma transação nesta fatura'}
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-neutral-100"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {formatDate(transaction.date)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 ml-2">
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-neutral-100 pt-4 space-y-3">
          {/* Close Bill Button */}
          {canClose && (
            <button
              onClick={handleCloseBill}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue text-white rounded-lg hover:bg-blue-hover transition-colors disabled:opacity-50"
            >
              <Calendar className="h-4 w-4" />
              {t('creditCardBills.closeBill') || 'Fechar Fatura'}
            </button>
          )}

          {/* Pay Bill Section */}
          {canPay && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  {t('creditCardBills.payWithAccount') || 'Pagar com conta'}
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
                >
                  <option value="">{t('creditCardBills.selectAccount') || 'Selecione uma conta'}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handlePayBill}
                disabled={loading || !selectedAccountId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                <DollarSign className="h-4 w-4" />
                {t('creditCardBills.payBill') || 'Pagar Fatura'}
              </button>
            </div>
          )}

          {bill.isPaid && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-center text-sm">
              {t('creditCardBills.paidOn', { date: formatDate(bill.paidAt!) }) || 
                `Paga em ${formatDate(bill.paidAt!)}`}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
