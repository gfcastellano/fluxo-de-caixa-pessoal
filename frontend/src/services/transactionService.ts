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
  isRecurring?: boolean;
  parentTransactionId?: string | null;
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

  if (filters?.isRecurring !== undefined) {
    constraints.push(where('isRecurring', '==', filters.isRecurring));
  }

  if (filters?.parentTransactionId !== undefined) {
    constraints.push(where('parentTransactionId', '==', filters.parentTransactionId));
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

// Get recurring transactions (parent transactions)
export async function getRecurringTransactions(userId: string): Promise<Transaction[]> {
  return getTransactions(userId, { isRecurring: true });
}

// Get instances of a recurring transaction
export async function getRecurringInstances(
  userId: string,
  parentTransactionId: string
): Promise<Transaction[]> {
  return getTransactions(userId, { parentTransactionId });
}

// Generate recurring instances for a transaction (calls backend endpoint)
export async function generateRecurringInstances(
  transactionId: string
): Promise<{ success: boolean; generatedCount: number }> {
  // This would call the backend endpoint
  // For now, we'll implement the client-side version
  const API_URL = import.meta.env.VITE_API_URL || '';
  
  if (API_URL) {
    const response = await fetch(`${API_URL}/transactions/${transactionId}/generate-recurring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to generate recurring instances');
    }

    const data = await response.json();
    return { success: data.success, generatedCount: data.data?.generatedCount || 0 };
  }

  // Fallback: return empty if no API URL configured
  return { success: false, generatedCount: 0 };
}

// Helper function to get auth token
async function getAuthToken(): Promise<string> {
  // This would get the Firebase auth token
  // Implementation depends on your auth setup
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.getIdToken();
}

// Get all transactions including recurring instances
export async function getAllTransactionsWithRecurring(
  userId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    type?: 'income' | 'expense';
    accountId?: string;
  }
): Promise<{
  transactions: Transaction[];
  recurringParents: Transaction[];
  recurringInstances: Transaction[];
}> {
  const allTransactions = await getTransactions(userId, filters);

  // Separate parent recurring transactions and instances
  const recurringParents = allTransactions.filter(t => t.isRecurring);
  const recurringInstances = allTransactions.filter(t => t.parentTransactionId);
  const regularTransactions = allTransactions.filter(t => !t.isRecurring && !t.parentTransactionId);

  return {
    transactions: [...regularTransactions, ...recurringInstances],
    recurringParents,
    recurringInstances,
  };
}

// Delete a recurring transaction and all its instances
export async function deleteRecurringTransaction(
  parentTransactionId: string,
  deleteInstances: boolean = true
): Promise<void> {
  if (deleteInstances) {
    // Get all instances
    const { getDocs, query, where } = await import('firebase/firestore');
    const q = query(
      collection(db, COLLECTION_NAME),
      where('parentTransactionId', '==', parentTransactionId)
    );
    const snapshot = await getDocs(q);

    // Delete all instances
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  }

  // Delete the parent transaction
  await deleteTransaction(parentTransactionId);
}
