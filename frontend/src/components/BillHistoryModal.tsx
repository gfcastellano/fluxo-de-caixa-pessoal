import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseModal } from './BaseModal';
import { getCreditCardBillsByCard } from '../services/creditCardBillService';
import { CreditCardBillModal } from './CreditCardBillModal';
import type { CreditCardBill, CreditCard } from '../types';
import { Calendar, ChevronRight, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '../utils/cn';

interface BillHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    creditCard: CreditCard | null;
    userId: string;
    onBillUpdated: () => void;
}

export function BillHistoryModal({
    isOpen,
    onClose,
    creditCard,
    userId,
    onBillUpdated,
}: BillHistoryModalProps) {
    const { t } = useTranslation();
    const [bills, setBills] = useState<CreditCardBill[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBill, setSelectedBill] = useState<CreditCardBill | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        if (isOpen && creditCard && userId) {
            loadBills();
        }
    }, [isOpen, creditCard, userId]);

    const loadBills = async () => {
        if (!creditCard) return;
        setLoading(true);
        try {
            const allBills = await getCreditCardBillsByCard(creditCard.id);
            setBills(allBills);
        } catch (err) {
            console.error('Error loading bill history:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewBill = (bill: CreditCardBill) => {
        setSelectedBill(bill);
        setIsDetailOpen(true);
    };

    const handleDetailClose = () => {
        setIsDetailOpen(false);
        setSelectedBill(null);
        loadBills(); // Refresh list in case something changed
        onBillUpdated(); // Refresh parent page
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

    if (!creditCard) return null;

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title={`${t('creditCards.billHistory') || 'Histórico de Faturas'} - ${creditCard.name}`}
                submitLabel=""
                cancelLabel={t('common.close') || 'Fechar'}
                onSubmit={() => { }}
            >
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue"></div>
                        </div>
                    ) : bills.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400">
                            {t('creditCards.noBills') || 'Nenhuma fatura encontrada'}
                        </div>
                    ) : (
                        bills.map((bill) => (
                            <button
                                key={bill.id}
                                onClick={() => handleViewBill(bill)}
                                className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-100 hover:border-blue/30 hover:bg-blue/5 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        bill.isPaid ? "bg-emerald-50 text-emerald-600" :
                                            bill.isClosed ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                                    )}>
                                        {bill.isPaid ? <CheckCircle className="h-5 w-5" /> :
                                            bill.isClosed ? <Clock className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-neutral-900">
                                            {t('creditCardBills.monthYear', { month: bill.month, year: bill.year }) ||
                                                `${bill.month}/${bill.year}`}
                                        </p>
                                        <p className="text-xs text-neutral-400">
                                            {bill.isPaid ? (bill.paidAt ? `${t('creditCardBills.paidOn', { date: formatDate(bill.paidAt) })}` : t('creditCardBills.paid')) :
                                                bill.isClosed ? `${t('creditCardBills.dueDate')}: ${formatDate(bill.dueDate)}` : t('creditCardBills.open')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-neutral-900">{formatCurrency(bill.totalAmount)}</span>
                                    <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-blue transition-colors" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </BaseModal>

            <CreditCardBillModal
                isOpen={isDetailOpen}
                onClose={handleDetailClose}
                bill={selectedBill}
                creditCard={creditCard}
                userId={userId}
                onBillUpdated={handleDetailClose}
            />
        </>
    );
}
