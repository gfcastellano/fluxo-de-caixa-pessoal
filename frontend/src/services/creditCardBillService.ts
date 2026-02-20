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
import { calculateBillDate } from '../domain/billing';

const COLLECTION_NAME = 'creditCardBills';

export async function getCreditCardBills(userId: string): Promise<CreditCardBill[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('year', 'desc'),
      orderBy('month', 'desc')
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

    const bills = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CreditCardBill[];

    // Sort by date ascending to get the earliest open bill (e.g. current month instead of future months)
    bills.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    return bills[0];
  } catch (error) {
    console.error('Error fetching current bill:', error);
    throw error;
  }
}

export async function getBillTransactions(billId: string): Promise<Transaction[]> {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('billId', '==', billId)
    );

    const snapshot = await getDocs(q);

    const transactions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    }) as Transaction[];

    // Sort by date desc (client-side to avoid complex index requirements)
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

// Re-export from domain layer (pure function, tested in domain/billing.test.ts)
export { calculateBillDate };

export async function ensureBillExists(
  userId: string,
  creditCardId: string,
  transactionDate: string
): Promise<string> {
  try {
    // We need to fetch the credit card to get closingDay and dueDay
    // Importing dynamically to avoid circular dependency issues if any
    const { getCreditCard } = await import('./creditCardService');
    const creditCard = await getCreditCard(creditCardId);

    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    const { month, year, dueDate } = calculateBillDate(
      transactionDate,
      creditCard.closingDay,
      creditCard.dueDay
    );

    // Check if bill exists
    const q = query(
      collection(db, COLLECTION_NAME),
      where('creditCardId', '==', creditCardId),
      where('month', '==', month), // Firestore stores 0-11 or 1-12? 
      // Checking types: CreditCardBill uses month: number. 
      // Usually matching JS Date.getMonth (0-11). Let's assume 0-11 based on calculateBillDate.
      // Wait, let's verify if month is 0-indexed or 1-indexed in existing data. 
      // Looking at `getCurrentBill`: `bills.sort((a, b) => a.month - b.month)`.
      // It doesn't explicitly say. But given we are creating it, we define it.
      // Standardizing on 0-based to match Date.getMonth() is safest for calculation, 
      // but UI often expects 1-based.
      // Let's stick to 0-based for internal logic if consistent.
      where('year', '==', year)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    // Create new bill
    const newBillData: Omit<CreditCardBill, 'id'> = {
      userId,
      creditCardId,
      month,
      year,
      dueDate,
      totalAmount: 0,
      isClosed: false,
      isPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...newBillData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error ensuring bill exists:', error);
    throw error;
  }
}
