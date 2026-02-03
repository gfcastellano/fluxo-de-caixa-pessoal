import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Budget, BudgetStatus } from '../types';
import { getTransactions } from './transactionService';

const COLLECTION_NAME = 'budgets';

export async function getBudgets(userId: string): Promise<Budget[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Budget[];
}

export async function createBudget(
  userId: string,
  budget: Omit<Budget, 'id' | 'userId' | 'createdAt'>
): Promise<Budget> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...budget,
    userId,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    userId,
    ...budget,
    createdAt: new Date().toISOString(),
  };
}

export async function updateBudget(
  budgetId: string,
  updates: Partial<Omit<Budget, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, budgetId);
  await updateDoc(docRef, updates);
}

export async function deleteBudget(budgetId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, budgetId);
  await deleteDoc(docRef);
}

export async function getBudgetStatus(
  budget: Budget,
  year: number,
  month: number
): Promise<BudgetStatus> {
  const transactions = await getTransactions(budget.userId, {
    startDate: `${year}-${String(month).padStart(2, '0')}-01`,
    endDate: `${year}-${String(month).padStart(2, '0')}-31`,
    categoryId: budget.categoryId,
    type: 'expense',
  });

  const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const remaining = budget.amount - spent;
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

  return {
    budget,
    spent,
    remaining,
    percentage,
    isOverBudget: spent > budget.amount,
  };
}
