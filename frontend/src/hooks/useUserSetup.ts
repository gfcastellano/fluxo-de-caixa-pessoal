import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCategories, createCategory } from '../services/categoryService';
import { createAccount, getAccounts } from '../services/accountService';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

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
];

export function useUserSetup(initialBalance: number = 0) {
  const { user } = useAuth();
  const hasRun = useRef(false);
  const initialBalanceRef = useRef(initialBalance);

  // Update ref when initialBalance changes
  useEffect(() => {
    initialBalanceRef.current = initialBalance;
  }, [initialBalance]);

  useEffect(() => {
    if (!user || hasRun.current) return;

    const setupUser = async () => {
      try {
        hasRun.current = true;
        
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
              balance: initialBalanceRef.current,
              initialBalance: initialBalanceRef.current,
              balanceDate: new Date().toISOString().split('T')[0],
              isDefault: true,
            });
            console.log('✅ Default account created with initial balance:', initialBalanceRef.current);
          }
          
          console.log('✅ User setup complete: Profile created with 14 default categories and 1 default account');
        } else {
          console.log('User already exists, skipping setup');
        }
      } catch (error) {
        console.error('❌ Error setting up user:', error);
        hasRun.current = false; // Reset so it can retry
      }
    };

    setupUser();
  }, [user]);
}
