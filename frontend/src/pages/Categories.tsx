import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/Card';
import { Button } from '../components/Button';
import { CategoryModal } from '../components/CategoryModal';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoryService';
import { getTranslatedCategoryName } from '../utils/categoryTranslations';
import type { Category } from '../types';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Tag } from 'lucide-react';

export function Categories() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (user) {
      loadCategories();
    }
  }, [user]);

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
        await createCategory(user.uid, newCategory);
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
    setEditingCategory(null);
  };

  const incomeCategories = categories.filter((c) => c.type === 'income');
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{t('categories.title')}</h1>
          <p className="text-neutral-500 mt-1">Manage your income and expense categories</p>
        </div>
        <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="h-4 w-4 flex-shrink-0" />} className="w-full sm:w-auto">
          {t('categories.addNew')}
        </Button>
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        category={editingCategory}
        onSave={handleSave}
        userId={user?.uid || ''}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Categories */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success-600" />
              </div>
              <div>
                <CardTitle>{t('common.income')} {t('categories.title')}</CardTitle>
                <CardDescription>{incomeCategories.length} categories</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                  <Tag className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-neutral-500">{t('categories.noCategories')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {incomeCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full ring-2 ring-white shadow-sm"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-neutral-900">{t(getTranslatedCategoryName(category.name))}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(category)}
                        className="p-2 text-neutral-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-danger-100 rounded-lg">
                <TrendingDown className="h-5 w-5 text-danger-600" />
              </div>
              <div>
                <CardTitle>{t('common.expense')} {t('categories.title')}</CardTitle>
                <CardDescription>{expenseCategories.length} categories</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                  <Tag className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-neutral-500">{t('categories.noCategories')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {expenseCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full ring-2 ring-white shadow-sm"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium text-neutral-900">{t(getTranslatedCategoryName(category.name))}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(category)}
                        className="p-2 text-neutral-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
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
  );
}
