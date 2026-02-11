import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePageModal } from '../hooks/usePageModal';
import { Card, CardContent } from '../components/Card';
import { CreditCardModal } from '../components/CreditCardModal';
import { CreditCardBillModal } from '../components/CreditCardBillModal';
import {
  getCreditCards,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  calculateAvailableLimit,
} from '../services/creditCardService';
import { BillHistoryModal } from '../components/BillHistoryModal';
import { getCurrentBill, getCreditCardBillsByCard } from '../services/creditCardBillService';
import { getAccounts } from '../services/accountService';
import type { CreditCard, CreditCardBill, Account } from '../types';
import { Edit2, Trash2, CreditCard as CreditCardIcon, Plus, Calendar, DollarSign, AlertCircle, FileText } from 'lucide-react';
import { cn } from '../utils/cn';
import { PageDescription } from '../components/PageDescription';

interface CreditCardWithDetails extends CreditCard {
  currentBill?: CreditCardBill;
  availableLimit?: number;
  linkedAccount?: Account;
}

export function CreditCards() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [creditCards, setCreditCards] = useState<CreditCardWithDetails[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<CreditCardBill | null>(null);
  const [selectedCardForBill, setSelectedCardForBill] = useState<CreditCard | null>(null);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedCardForHistory, setSelectedCardForHistory] = useState<CreditCard | null>(null);

  const modal = usePageModal<CreditCard>();

  const handleViewBill = (card: CreditCardWithDetails) => {
    if (card.currentBill) {
      setSelectedBill(card.currentBill);
      setSelectedCardForBill(card);
      setIsBillModalOpen(true);
    }
  };

  const handleCloseBillModal = () => {
    setIsBillModalOpen(false);
    setSelectedBill(null);
    setSelectedCardForBill(null);
  };

  const handleViewHistory = (card: CreditCard) => {
    setSelectedCardForHistory(card);
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedCardForHistory(null);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load accounts first (for linked account info)
      const userAccounts = await getAccounts(user!.uid);
      setAccounts(userAccounts);

      // Load credit cards
      const cards = await getCreditCards(user!.uid);

      // Load details for each card
      const cardsWithDetails = await Promise.all(
        cards.map(async (card) => {
          const linkedAccount = userAccounts.find(a => a.id === card.linkedAccountId);

          // Get current bill
          const currentBill = await getCurrentBill(card.id);

          // Calculate available limit
          const availableLimit = await calculateAvailableLimit(card.id, card.creditLimit);

          return {
            ...card,
            linkedAccount,
            currentBill: currentBill || undefined,
            availableLimit,
          };
        })
      );

      setCreditCards(cardsWithDetails);
    } catch (error) {
      console.error('Error loading credit cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (cardData: Partial<CreditCard>) => {
    if (!user) return;

    try {
      if (modal.editingItem) {
        await updateCreditCard(modal.editingItem.id, {
          name: cardData.name,
          linkedAccountId: cardData.linkedAccountId,
          creditLimit: cardData.creditLimit,
          closingDay: cardData.closingDay,
          dueDay: cardData.dueDay,
          color: cardData.color,
        });
      } else {
        const newCard = await createCreditCard({
          userId: user.uid,
          name: cardData.name!,
          linkedAccountId: cardData.linkedAccountId!,
          creditLimit: cardData.creditLimit!,
          closingDay: cardData.closingDay!,
          dueDay: cardData.dueDay!,
          color: cardData.color,
        });

        // Highlight logic
        setHighlightedId(newCard.id);
        setTimeout(() => setHighlightedId(null), 5000);
      }
      await loadData();
      modal.close();
    } catch (error) {
      console.error('Error saving credit card:', error);
    }
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm(t('creditCards.deleteConfirm') || 'Tem certeza que deseja excluir este cartão?')) return;

    try {
      await deleteCreditCard(cardId);
      await loadData();
    } catch (error) {
      console.error('Error deleting credit card:', error);
      alert(t('creditCards.deleteError') || 'Erro ao excluir cartão. Verifique se há faturas pendentes.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const getLimitUsagePercentage = (limit: number, available: number) => {
    if (limit === 0) return 0;
    return ((limit - available) / limit) * 100;
  };

  const getLimitColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height)-var(--dock-height))] sm:h-auto sm:min-h-0 sm:gap-6 gap-4 sm:p-6 p-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg sm:text-2xl font-bold text-ink">{t('creditCards.title') || 'Cartões de Crédito'}</h1>
          <PageDescription pageKey="creditCards" />
        </div>
        <button
          onClick={() => modal.openCreate()}
          className="flex items-center gap-2 px-4 py-2 bg-blue text-white rounded-lg hover:bg-blue-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('creditCards.addNew') || 'Adicionar Cartão'}</span>
          <span className="sm:hidden">{t('common.add') || 'Adicionar'}</span>
        </button>
      </div>

      <CreditCardModal
        isOpen={modal.isOpen}
        onClose={modal.close}
        creditCard={modal.editingItem}
        onSave={handleSave}
        userId={user?.uid || ''}
        accounts={accounts}
        autoStartRecording={modal.autoStartRecording}
      />

      <CreditCardBillModal
        isOpen={isBillModalOpen}
        onClose={handleCloseBillModal}
        bill={selectedBill}
        creditCard={selectedCardForBill}
        userId={user?.uid || ''}
        onBillUpdated={loadData}
      />

      <BillHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        creditCard={selectedCardForHistory}
        userId={user?.uid || ''}
        onBillUpdated={loadData}
      />

      {creditCards.length === 0 ? (
        <Card className="bg-white/40 backdrop-blur-xl border-white/60">
          <CardContent className="py-8 sm:py-12">
            <div className="text-center">
              <CreditCardIcon className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-neutral-400" />
              <p className="mt-2 sm:mt-4 text-sm sm:text-base text-neutral-500">
                {t('creditCards.noCards') || 'Nenhum cartão encontrado'}
              </p>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                {t('creditCards.addFirst') || 'Adicione seu primeiro cartão de crédito'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {creditCards.map((card) => {
            const limitUsed = card.creditLimit - (card.availableLimit || 0);
            const limitPercentage = getLimitUsagePercentage(card.creditLimit, card.availableLimit || 0);

            return (
              <Card
                key={card.id}
                className={cn(
                  "transition-all duration-1000 bg-white/40 backdrop-blur-xl border-white/60",
                  highlightedId === card.id ? "animate-highlight scale-[1.02]" : ""
                )}
              >
                <div className="p-4 sm:p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{
                          backgroundColor: card.color ? `${card.color}20` : '#EEF2FF',
                        }}
                      >
                        <CreditCardIcon
                          className="h-5 w-5"
                          style={{ color: card.color || '#4F46E5' }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-neutral-900 truncate">{card.name}</p>
                        <p className="text-xs text-neutral-400">
                          {t('creditCards.linkedAccount') || 'Conta'}: {card.linkedAccount?.name || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleViewHistory(card)}
                        className="p-1.5 text-neutral-400 hover:text-blue hover:bg-blue/5 rounded-lg transition-colors"
                        title={t('creditCards.billHistory') || 'Histórico'}
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => modal.openEdit(card)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-white/60 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Limit Info */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-500">
                        {t('creditCards.availableLimit') || 'Limite Disponível'}
                      </span>
                      <span className="text-lg font-bold text-neutral-900">
                        {formatCurrency(card.availableLimit || 0)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-500", getLimitColor(limitPercentage))}
                        style={{ width: `${limitPercentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-1 text-xs text-neutral-400">
                      <span>{t('creditCards.used') || 'Usado'}: {formatCurrency(limitUsed)}</span>
                      <span>{t('creditCards.totalLimit') || 'Limite'}: {formatCurrency(card.creditLimit)}</span>
                    </div>
                  </div>

                  {/* Current Bill */}
                  {card.currentBill && (
                    <div
                      className="bg-blue/5 rounded-lg p-3 mb-3 cursor-pointer hover:bg-blue/10 transition-colors"
                      onClick={() => handleViewBill(card)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue" />
                          <span className="text-sm font-medium text-neutral-700">
                            {t('creditCards.currentBill') || 'Fatura Atual'}
                          </span>
                        </div>
                        <span className="text-base font-bold text-neutral-900">
                          {formatCurrency(card.currentBill.totalAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-neutral-400">
                        <span>
                          {t('creditCards.dueDate') || 'Vencimento'}: {card.currentBill.dueDate}
                        </span>
                        <div className="flex items-center gap-2">
                          {card.currentBill.totalAmount > 0 && (
                            <span className="text-blue">
                              {t('creditCards.open') || 'Aberta'}
                            </span>
                          )}
                          <FileText className="h-3.5 w-3.5 text-blue" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs text-neutral-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {t('creditCards.closingDay') || 'Fechamento'}: {card.closingDay}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>
                        {t('creditCards.dueDay') || 'Vencimento'}: {card.dueDay}
                      </span>
                    </div>
                  </div>

                  {/* Warning if limit is high */}
                  {limitPercentage >= 90 && (
                    <div className="flex items-center gap-2 mt-3 p-2 bg-red-50 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="text-xs text-red-600">
                        {t('creditCards.highUsageWarning') || 'Limite quase esgotado!'}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
