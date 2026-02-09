import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCategories, createCategory } from '../services/categoryService';
import { createAccount, getAccounts } from '../services/accountService';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Module-level guard: persists across React StrictMode unmount/remount cycles
const setupInProgress: Record<string, boolean> = {};

const DEFAULT_CATEGORIES = [
  // Income categories
  { name: 'Salary', type: 'income' as const, color: '#22c55e', icon: 'wallet' },
  { name: 'Freelance', type: 'income' as const, color: '#10b981', icon: 'briefcase' },
  { name: 'Investments', type: 'income' as const, color: '#14b8a6', icon: 'trending-up' },
  { name: 'Gifts', type: 'income' as const, color: '#06b6d4', icon: 'gift' },
  { name: 'Other Income', type: 'income' as const, color: '#0ea5e9', icon: 'plus-circle' },
  // Expense categories
  { name: 'Food & Dining', type: 'expense' as const, color: '#ef4444', icon: 'utensils' },
  { name: 'Transportation', type: 'expense' as const, color: '#f97316', icon: 'car' },
  { name: 'Housing', type: 'expense' as const, color: '#f59e0b', icon: 'home' },
  { name: 'Utilities', type: 'expense' as const, color: '#84cc16', icon: 'zap' },
  { name: 'Entertainment', type: 'expense' as const, color: '#a855f7', icon: 'film' },
  { name: 'Shopping', type: 'expense' as const, color: '#ec4899', icon: 'shopping-bag' },
  { name: 'Health', type: 'expense' as const, color: '#6366f1', icon: 'heart' },
  { name: 'Education', type: 'expense' as const, color: '#8b5cf6', icon: 'book' },
  { name: 'Other Expense', type: 'expense' as const, color: '#6b7280', icon: 'more-horizontal' },
  // Transfer categories
  { name: 'Transfer', type: 'transfer' as const, color: '#0284c7', icon: 'arrow-right-left' },
  { name: 'Withdrawal', type: 'transfer' as const, color: '#0369a1', icon: 'banknote' },
];

export function useUserSetup(initialBalance: number = 0) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || setupInProgress[user.uid]) return;
    setupInProgress[user.uid] = true; // Set SYNCHRONOUSLY before any async work

    const setupUser = async () => {
      try {
        
        // Check if user profile exists
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          console.log('Creating new user profile and default data...');
          
          // Create user profile
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            settings: {
              currency: 'BRL',
              language: 'pt-BR',
              theme: 'light',
            },
          });
          
          // Create default categories
          for (const category of DEFAULT_CATEGORIES) {
            await createCategory(user.uid, category);
          }
          console.log('✅ Default categories created');

          // Create default account with initial balance
          const existingAccounts = await getAccounts(user.uid);
          if (existingAccounts.length === 0) {
            await createAccount({
              userId: user.uid,
              name: 'Minha Conta',
              currency: 'BRL',
              balance: initialBalance,
              initialBalance: initialBalance,
              balanceDate: new Date().toISOString().split('T')[0],
              isDefault: true,
              isCash: false,
            });
            console.log('✅ Default account created with initial balance:', initialBalance);
            // Cash account (Dinheiro BRL) is auto-created by backend POST /accounts
          }
          
          console.log('✅ User setup complete: Profile created with 14 default categories and 1 default account');
        } else {
          // Existing user: ensure transfer categories exist (migration for pre-transfer users)
          const existingCategories = await getCategories(user.uid);
          const hasTransferCategories = existingCategories.some(c => c.type === 'transfer');
          if (!hasTransferCategories) {
            const transferCategories = DEFAULT_CATEGORIES.filter(c => c.type === 'transfer');
            for (const category of transferCategories) {
              await createCategory(user.uid, category);
            }
            console.log('✅ Transfer categories added for existing user');
          }

          // Ensure cash accounts exist for all currencies (migration for pre-cash users)
          const existingAccounts = await getAccounts(user.uid);
          const currencies = [...new Set(existingAccounts.map(a => a.currency))];
          for (const currency of currencies) {
            const hasCash = existingAccounts.some(a => a.isCash === true && a.currency === currency);
            if (!hasCash) {
              await createAccount({
                userId: user.uid,
                name: `Dinheiro (${currency})`,
                currency,
                balance: 0,
                initialBalance: 0,
                balanceDate: new Date().toISOString().split('T')[0],
                isDefault: false,
                isCash: true,
                color: '#16a34a',
              });
              console.log(`✅ Cash account created for ${currency}`);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error setting up user:', error);
        setupInProgress[user.uid] = false; // Reset so it can retry
      }
    };

    setupUser();
  }, [user]);
}
