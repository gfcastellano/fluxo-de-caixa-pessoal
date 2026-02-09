import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Account, AccountInput } from '../types';
import { getTransactions } from './transactionService';

const COLLECTION_NAME = 'accounts';

export async function getAccounts(userId: string): Promise<Account[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    console.log(`Fetched ${snapshot.docs.length} accounts for user ${userId}`);

    const accounts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    }) as Account[];

    // Sort by name
    return accounts.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
}

export async function getAccount(accountId: string): Promise<Account | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, accountId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as Account;
  } catch (error) {
    console.error('Error fetching account:', error);
    throw error;
  }
}

export async function createAccount(
  account: AccountInput
): Promise<Account> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...account,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...account,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateAccount(
  accountId: string,
  updates: Partial<AccountInput>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, accountId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAccount(accountId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, accountId);
  await deleteDoc(docRef);
}

export async function setDefaultAccount(accountId: string, userId: string): Promise<void> {
  // First, get all accounts for the user
  const accounts = await getAccounts(userId);

  // Update all accounts to not be default
  const updatePromises = accounts.map((account) => {
    if (account.isDefault) {
      const docRef = doc(db, COLLECTION_NAME, account.id);
      return updateDoc(docRef, {
        isDefault: false,
        updatedAt: serverTimestamp(),
      });
    }
    return Promise.resolve();
  });

  // Wait for all updates
  await Promise.all(updatePromises);

  // Set the selected account as default
  const docRef = doc(db, COLLECTION_NAME, accountId);
  await updateDoc(docRef, {
    isDefault: true,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Calculate the real-time balance for an account by adjusting the stored balance
 * with all transactions that occurred after the balance date.
 * 
 * Formula: storedBalance + sum(income transactions after balanceDate) - sum(expense transactions after balanceDate)
 * 
 * @param accountId - The account ID
 * @param userId - The user ID (required to fetch transactions)
 * @param upToDate - Optional date to calculate balance up to (defaults to current date)
 * @returns The calculated balance
 */
export async function calculateAccountBalance(
  accountId: string,
  userId: string,
  upToDate?: string
): Promise<number> {
  try {
    // Fetch the account to get stored balance and balanceDate
    const account = await getAccount(accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    // If no balanceDate is set, return the stored balance
    if (!account.balanceDate) {
      return account.balance;
    }

    // Determine the end date (defaults to today)
    const endDate = upToDate || new Date().toISOString().split('T')[0];

    // Fetch all transactions for this account after the balanceDate and up to the specified date
    const transactions = await getTransactions(userId, {
      accountId: accountId,
      startDate: account.balanceDate,
      endDate: endDate,
    });

    // Also fetch all user transactions to find incoming transfers (toAccountId === this account)
    const allUserTransactions = await getTransactions(userId, {
      startDate: account.balanceDate,
      endDate: endDate,
    });
    const incomingTransfers = allUserTransactions.filter(
      t => t.type === 'transfer' && t.toAccountId === accountId
    );

    // Calculate the adjustment: income adds to balance, expenses subtract from balance
    // Note: balance represents the starting balance at the START of balanceDate,
    // so all transactions on balanceDate and after are applied.
    let adjustment = 0;

    for (const transaction of transactions) {
      if (transaction.type === 'income') {
        adjustment += transaction.amount;
      } else if (transaction.type === 'expense') {
        adjustment -= transaction.amount;
      } else if (transaction.type === 'transfer') {
        // Outgoing transfer: money leaves this account
        adjustment -= transaction.amount;
      }
    }

    // Add incoming transfers (money entering this account)
    for (const transfer of incomingTransfers) {
      adjustment += transfer.amount;
    }

    // Return the calculated balance
    return account.balance + adjustment;
  } catch (error) {
    console.error('Error calculating account balance:', error);
    throw error;
  }
}

/**
 * Calculate the total balance across all accounts for a user.
 * 
 * @param userId - The user ID
 * @param upToDate - Optional date to calculate balance up to (defaults to current date)
 * @returns The total calculated balance
 */
export async function calculateTotalBalance(
  userId: string,
  upToDate?: string
): Promise<number> {
  try {
    const accounts = await getAccounts(userId);
    
    let totalBalance = 0;
    for (const account of accounts) {
      const balance = await calculateAccountBalance(account.id, userId, upToDate);
      totalBalance += balance;
    }
    
    return totalBalance;
  } catch (error) {
    console.error('Error calculating total balance:', error);
    throw error;
  }
}
