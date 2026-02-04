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
