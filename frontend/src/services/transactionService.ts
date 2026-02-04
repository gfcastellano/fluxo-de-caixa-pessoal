import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Transaction } from '../types';

const COLLECTION_NAME = 'transactions';

export async function getTransactions(userId: string, filters?: {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: 'income' | 'expense';
  accountId?: string;
}): Promise<Transaction[]> {
  // Build constraints - only use where clauses to avoid composite index requirements
  let constraints: Parameters<typeof query>[1][] = [
    where('userId', '==', userId),
  ];

  if (filters?.type) {
    constraints.push(where('type', '==', filters.type));
  }

  if (filters?.categoryId) {
    constraints.push(where('categoryId', '==', filters.categoryId));
  }

  if (filters?.accountId) {
    constraints.push(where('accountId', '==', filters.accountId));
  }

  const q = query(collection(db, COLLECTION_NAME), ...constraints);
  const snapshot = await getDocs(q);

  let transactions = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Transaction[];

  // Sort in memory instead of using orderBy in query
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (filters?.startDate) {
    transactions = transactions.filter((t) => t.date >= filters.startDate!);
  }

  if (filters?.endDate) {
    transactions = transactions.filter((t) => t.date <= filters.endDate!);
  }

  return transactions;
}

export async function createTransaction(
  userId: string,
  transaction: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Transaction> {
  const now = serverTimestamp();
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...transaction,
    userId,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: docRef.id,
    userId,
    ...transaction,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateTransaction(
  transactionId: string,
  updates: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, transactionId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, transactionId);
  await deleteDoc(docRef);
}

export async function getTransactionsByMonth(
  userId: string,
  year: number,
  month: number
): Promise<Transaction[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  return getTransactions(userId, { startDate, endDate });
}
