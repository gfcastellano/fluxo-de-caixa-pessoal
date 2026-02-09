import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { BudgetModal } from '../components/BudgetModal';
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetStatus,
} from '../services/budgetService';
import { getCategories } from '../services/categoryService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Budget, Category, BudgetStatus } from '../types';
import { formatCurrency } from '../utils/format';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { getCurrentMonth } from '../utils/format';
import { cn } from '../utils/cn';

export function Budgets() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetStatuses, setBudgetStatuses] = useState<Map<string, BudgetStatus>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  /* New state for highlighting */
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [autoRecordOnOpen, setAutoRecordOnOpen] = useState(false);

  // Access voice context for Hero button modal trigger
  const { shouldOpenModal, shouldAutoRecord, clearModalRequest } = useVoice();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Listen for Hero button click to open add modal
  useEffect(() => {
    if (shouldOpenModal) {
      setAutoRecordOnOpen(shouldAutoRecord);
      handleOpenModal();
      clearModalRequest();
    }
  }, [shouldOpenModal, shouldAutoRecord, clearModalRequest]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetsData, categoriesData] = await Promise.all([
        getBudgets(user!.uid),
        getCategories(user!.uid),
      ]);
      // Sort budgets by translated category name alphabetically
      const sortedBudgets = budgetsData.sort((a, b) => {
        const categoryA = categoriesData.find((c) => c.id === a.categoryId);
        const categoryB = categoriesData.find((c) => c.id === b.categoryId);
        const nameA = categoryA ? t(getTranslatedCategoryName(categoryA.name)) : '';
        const nameB = categoryB ? t(getTranslatedCategoryName(categoryB.name)) : '';
        return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
      });
      setBudgets(sortedBudgets);
      setCategories(categoriesData);

      // Load budget statuses
      const { year, month } = getCurrentMonth();
      const statusMap = new Map<string, BudgetStatus>();
      for (const budget of budgetsData) {
        const status = await getBudgetStatus(budget, year, month);
        statusMap.set(budget.id, status);
      }
      setBudgetStatuses(statusMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (budgetData: Partial<Budget>) => {
    if (!user) return;

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, budgetData);
      } else {

        const newBudget = await createBudget(user.uid, budgetData as Omit<Budget, 'id' | 'userId' | 'createdAt'>);

        // Highlight logic
        setHighlightedId(newBudget.id);
        setTimeout(() => setHighlightedId(null), 5000);
      }
      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleDelete = async (budgetId: string) => {
    if (!confirm(t('budgets.deleteConfirm'))) return;

    try {
      await deleteBudget(budgetId);
      await loadData();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const handleOpenModal = (budget?: Budget) => {
    if (budget) {
      setEditingBudget(budget);
    } else {
      setEditingBudget(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAutoRecordOnOpen(false);
    setEditingBudget(null);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? t(getTranslatedCategoryName(category.name)) : 'Unknown';
  };

  const getCategoryColor = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.color || '#999999';
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
      {/* Header - no add button, Hero handles it */}
      <div className="flex items-center flex-shrink-0">
        <h1 className="text-lg sm:text-2xl font-bold text-ink">{t('budgets.title')}</h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto sm:overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 pb-4 sm:pb-0">
        {budgets.length === 0 ? (
          <Card className="md:col-span-2 bg-white/40 backdrop-blur-xl border-white/60">
            <CardContent className="text-center py-6 sm:py-8 p-3 sm:p-6">
              <p className="text-xs sm:text-sm text-neutral-500">{t('budgets.noBudgets')}</p>
              <Button onClick={() => handleOpenModal()} className="mt-3 sm:mt-4 w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm h-7 sm:h-9" leftIcon={<Plus className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />}>
                {t('budgets.addNew')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          budgets.map((budget) => {
            const status = budgetStatuses.get(budget.id);
            const percentage = status?.percentage || 0;
            const isOverBudget = status?.isOverBudget || false;

            return (
              <Card
                key={budget.id}
                className={cn(
                  "transition-all duration-1000 bg-white/40 backdrop-blur-xl border-white/60",
                  highlightedId === budget.id ? "animate-highlight scale-[1.02]" : ""
                )}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-1.5 sm:pb-2 p-3 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                      style={{ backgroundColor: getCategoryColor(budget.categoryId) }}
                    />
                    <CardTitle className="text-sm sm:text-lg font-bold text-ink truncate">
                      {getCategoryName(budget.categoryId)}
                    </CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-0.5 sm:gap-1">
                    <button
                      onClick={() => handleOpenModal(budget)}
                      className="p-1.5 sm:p-2 text-neutral-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                    >
                      <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(budget.id)}
                      className="p-1.5 sm:p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-neutral-600 font-medium">
                        {t('budgets.spent')}: {formatCurrency(status?.spent || 0)}
                      </span>
                      <span className="text-neutral-600 font-medium">
                        {t('budgets.form.amount')}: {formatCurrency(budget.amount)}
                      </span>
                    </div>
                    <div className="relative h-2.5 sm:h-4 bg-slate/10 rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                        {percentage.toFixed(1)}% {t('budgets.spent').toLowerCase()}
                      </span>
                      <span className="text-neutral-600 font-medium">
                        {t('budgets.remaining')}: {formatCurrency(status?.remaining || 0)}
                      </span>
                    </div>
                    {isOverBudget && (
                      <p className="text-xs sm:text-sm text-red-600 bg-red-50 p-1.5 sm:p-2 rounded-lg border border-red-100">
                        {t('budgets.overBudget')} {formatCurrency(Math.abs(status?.remaining || 0))}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        </div>
      </div>

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        budget={editingBudget}
        categories={categories}
        onSave={handleSave}
        userId={user?.uid || ''}
        autoStartRecording={autoRecordOnOpen}
      />

    </div>
  );
}
