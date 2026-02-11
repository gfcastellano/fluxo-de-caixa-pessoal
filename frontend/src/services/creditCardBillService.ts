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
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import type { CreditCardBill, Transaction } from '../types';

const COLLECTION_NAME = 'creditCardBills';

export async function getCreditCardBills(userId: string): Promise<CreditCardBill[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    console.log(`Fetched ${snapshot.docs.length} bills for user ${userId}`);

    const bills = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    }) as CreditCardBill[];

    // Sort in memory to avoid composite index requirement
    bills.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return bills;
  } catch (error) {
    console.error('Error fetching credit card bills:', error);
    // Return empty array instead of throwing to prevent blocking other data loading
    return [];
  }
}

export async function getCreditCardBillsByCard(creditCardId: string): Promise<CreditCardBill[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('creditCardId', '==', creditCardId),
      orderBy('year', 'desc'),
      orderBy('month', 'desc')
    );

    const snapshot = await getDocs(q);

    const bills = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    }) as CreditCardBill[];

    return bills;
  } catch (error) {
    console.error('Error fetching credit card bills by card:', error);
    throw error;
  }
}

export async function getCurrentBill(creditCardId: string): Promise<CreditCardBill | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('creditCardId', '==', creditCardId),
      where('isClosed', '==', false),
      where('isPaid', '==', false)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as CreditCardBill;
  } catch (error) {
    console.error('Error fetching current bill:', error);
    throw error;
  }
}

export async function getBillTransactions(billId: string): Promise<Transaction[]> {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('billId', '==', billId),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);

    const transactions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    }) as Transaction[];

    return transactions;
  } catch (error) {
    console.error('Error fetching bill transactions:', error);
    throw error;
  }
}

export async function closeBill(billId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, billId);
    await updateDoc(docRef, {
      isClosed: true,
      closingDate: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error closing bill:', error);
    throw error;
  }
}

export async function payBill(
  billId: string,
  accountId: string,
  categoryId: string
): Promise<void> {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('No auth token');

    const response = await fetch(`${API_URL}/api/credit-card-bills/${billId}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ accountId, categoryId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to pay bill');
    }

  } catch (error) {
    console.error('Error paying bill:', error);
    throw error;
  }
}

export async function updateBillTotal(billId: string, amount: number): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, billId);
    const billSnap = await getDoc(docRef);

    if (!billSnap.exists()) {
      throw new Error('Bill not found');
    }

    const currentTotal = billSnap.data().totalAmount || 0;

    await updateDoc(docRef, {
      totalAmount: currentTotal + amount,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating bill total:', error);
    throw error;
  }
}
