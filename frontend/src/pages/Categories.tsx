import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useVoice } from '../context/VoiceContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import { CategoryModal } from '../components/CategoryModal';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoryService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Category } from '../types';
import { Edit2, Trash2, TrendingUp, TrendingDown, ArrowRightLeft, Tag } from 'lucide-react';
import { cn } from '../utils/cn';

export function Categories() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [autoRecordOnOpen, setAutoRecordOnOpen] = useState(false);

  /* New state for highlighting */
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Access voice context for Hero button modal trigger
  const { shouldOpenModal, shouldAutoRecord, clearModalRequest } = useVoice();

  useEffect(() => {
    if (user) {
      loadCategories();
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

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await getCategories(user!.uid);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (categoryData: Partial<Category>) => {
    if (!user) return;

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryData);
      } else {
        // Ensure required fields are present for new category
        const newCategory = {
          name: categoryData.name || '',
          type: categoryData.type || 'expense',
          color: categoryData.color || '#ef4444',
        };
        const created = await createCategory(user.uid, newCategory);

        // Highlight the new item for 5 seconds
        setHighlightedId(created.id);
        setTimeout(() => setHighlightedId(null), 5000);
      }
      await loadCategories();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm(t('categories.deleteConfirm'))) return;

    try {
      await deleteCategory(categoryId);
      await loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleOpenModal = (category?: Category) => {
    setEditingCategory(category || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAutoRecordOnOpen(false);
    setEditingCategory(null);
  };

  const incomeCategories = categories
    .filter((c) => c.type === 'income')
    .sort((a, b) =>
      t(getTranslatedCategoryName(a.name)).localeCompare(
        t(getTranslatedCategoryName(b.name)),
        undefined,
        { sensitivity: 'base' }
      )
    );
  const expenseCategories = categories
    .filter((c) => c.type === 'expense')
    .sort((a, b) =>
      t(getTranslatedCategoryName(a.name)).localeCompare(
        t(getTranslatedCategoryName(b.name)),
        undefined,
        { sensitivity: 'base' }
      )
    );
  const transferCategories = categories
    .filter((c) => c.type === 'transfer')
    .sort((a, b) =>
      t(getTranslatedCategoryName(a.name)).localeCompare(
        t(getTranslatedCategoryName(b.name)),
        undefined,
        { sensitivity: 'base' }
      )
    );

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
      <div className="flex flex-col gap-1 sm:gap-2 flex-shrink-0">
        <h1 className="text-lg sm:text-2xl font-bold text-ink">{t('categories.title')}</h1>
        <p className="text-xs sm:text-sm text-neutral-500">{t('categories.subtitle')}</p>
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        category={editingCategory}
        onSave={handleSave}
        userId={user?.uid || ''}
        autoStartRecording={autoRecordOnOpen}
      />

      <div className="flex-1 min-h-0 overflow-y-auto sm:overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 pb-4 sm:pb-0">
        {/* Income Categories */}
        <Card className="bg-white/40 backdrop-blur-xl border-white/60">
          <CardHeader className="pb-2 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-success-100 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success-600" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base">{t('common.income')} {t('categories.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{incomeCategories.length} categories</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {incomeCategories.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                  <Tag className="h-4 w-4 sm:h-6 sm:w-6 text-neutral-400" />
                </div>
                <p className="text-xs sm:text-sm text-neutral-500">{t('categories.noCategories')}</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {incomeCategories.map((category) => (
                  <div
                    key={category.id}
                    className={cn(
                      "flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-1000 group",
                      highlightedId === category.id
                        ? "animate-highlight shadow-lg scale-[1.02]"
                        : "bg-white/40 hover:bg-white/60 backdrop-blur-sm"
                    )}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-neutral-900 text-xs sm:text-sm">{t(getTranslatedCategoryName(category.name))}</span>
                    </div>
                    <div className="flex flex-wrap gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(category)}
                        className="p-1.5 sm:p-2 text-neutral-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                      >
                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-1.5 sm:p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="bg-white/40 backdrop-blur-xl border-white/60">
          <CardHeader className="pb-2 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-danger-100 rounded-lg">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-danger-600" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base">{t('common.expense')} {t('categories.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{expenseCategories.length} categories</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {expenseCategories.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                  <Tag className="h-4 w-4 sm:h-6 sm:w-6 text-neutral-400" />
                </div>
                <p className="text-xs sm:text-sm text-neutral-500">{t('categories.noCategories')}</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {expenseCategories.map((category) => (
                  <div
                    key={category.id}
                    className={cn(
                      "flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-1000 group",
                      highlightedId === category.id
                        ? "animate-highlight shadow-lg scale-[1.02]"
                        : "bg-white/40 hover:bg-white/60 backdrop-blur-sm"
                    )}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-neutral-900 text-xs sm:text-sm">{t(getTranslatedCategoryName(category.name))}</span>
                    </div>
                    <div className="flex flex-wrap gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(category)}
                        className="p-1.5 sm:p-2 text-neutral-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                      >
                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-1.5 sm:p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfer Categories */}
        <Card className="bg-white/40 backdrop-blur-xl border-white/60">
          <CardHeader className="pb-2 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary-100 rounded-lg">
                <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base">{t('common.transfer')} {t('categories.title')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{transferCategories.length} categories</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {transferCategories.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                  <Tag className="h-4 w-4 sm:h-6 sm:w-6 text-neutral-400" />
                </div>
                <p className="text-xs sm:text-sm text-neutral-500">{t('categories.noCategories')}</p>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2">
                {transferCategories.map((category) => (
                  <div
                    key={category.id}
                    className={cn(
                      "flex items-center justify-between p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-1000 group",
                      highlightedId === category.id
                        ? "animate-highlight shadow-lg scale-[1.02]"
                        : "bg-white/40 hover:bg-white/60 backdrop-blur-sm"
                    )}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-neutral-900 text-xs sm:text-sm">{t(getTranslatedCategoryName(category.name))}</span>
                    </div>
                    <div className="flex flex-wrap gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(category)}
                        className="p-1.5 sm:p-2 text-neutral-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                      >
                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-1.5 sm:p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

    </div>
  );
}
