// Map of English default category names to translation keys
const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  // Income categories
  'Salary': 'defaultCategories.salary',
  'Freelance': 'defaultCategories.freelance',
  'Investments': 'defaultCategories.investments',
  'Gifts': 'defaultCategories.gifts',
  'Other Income': 'defaultCategories.otherIncome',
  // Expense categories
  'Food & Dining': 'defaultCategories.food',
  'Transportation': 'defaultCategories.transportation',
  'Housing': 'defaultCategories.housing',
  'Utilities': 'defaultCategories.utilities',
  'Entertainment': 'defaultCategories.entertainment',
  'Shopping': 'defaultCategories.shopping',
  'Health': 'defaultCategories.health',
  'Education': 'defaultCategories.education',
  'Other Expense': 'defaultCategories.otherExpense',
  // Transfer categories
  'Transfer': 'defaultCategories.transfer',
  'Withdrawal': 'defaultCategories.withdrawal',
};

/**
 * Check if a category name is one of the default categories
 */
export function isDefaultCategory(name: string): boolean {
  return name in DEFAULT_CATEGORY_MAP;
}

/**
 * Get the translation key for a default category
 */
export function getCategoryTranslationKey(name: string): string | null {
  return DEFAULT_CATEGORY_MAP[name] || null;
}

/**
 * Translate a category name if it's a default category
 * Returns the translation key for use with i18n t() function
 */
export function getTranslatedCategoryName(name: string): string {
  const key = getCategoryTranslationKey(name);
  return key || name; // Return key for translation, or original name if not a default category
}
