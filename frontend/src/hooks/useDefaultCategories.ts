import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCategories, createCategory } from '../services/categoryService';

// Default categories in English (stored in database)
const DEFAULT_CATEGORIES = [
  // Income categories
  { name: 'Salary', type: 'income' as const, color: '#22c55e' },
  { name: 'Freelance', type: 'income' as const, color: '#10b981' },
  { name: 'Investments', type: 'income' as const, color: '#14b8a6' },
  { name: 'Gifts', type: 'income' as const, color: '#06b6d4' },
  { name: 'Other Income', type: 'income' as const, color: '#0ea5e9' },
  // Expense categories
  { name: 'Food & Dining', type: 'expense' as const, color: '#ef4444' },
  { name: 'Transportation', type: 'expense' as const, color: '#f97316' },
  { name: 'Housing', type: 'expense' as const, color: '#f59e0b' },
  { name: 'Utilities', type: 'expense' as const, color: '#84cc16' },
  { name: 'Entertainment', type: 'expense' as const, color: '#a855f7' },
  { name: 'Shopping', type: 'expense' as const, color: '#ec4899' },
  { name: 'Health', type: 'expense' as const, color: '#6366f1' },
  { name: 'Education', type: 'expense' as const, color: '#8b5cf6' },
  { name: 'Other Expense', type: 'expense' as const, color: '#6b7280' },
];

export function useDefaultCategories() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const setupDefaultCategories = async () => {
      try {
        // Check if user already has categories
        const existingCategories = await getCategories(user.uid);
        
        if (existingCategories.length === 0) {
          // Create default categories with English names (stored in DB)
          for (const category of DEFAULT_CATEGORIES) {
            await createCategory(user.uid, category);
          }
          console.log('Default categories created successfully');
        }
      } catch (error) {
        console.error('Error setting up default categories:', error);
      }
    };

    setupDefaultCategories();
  }, [user]);
}
