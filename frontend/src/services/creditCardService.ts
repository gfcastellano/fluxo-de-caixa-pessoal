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
import type { CreditCard, CreditCardInput } from '../types';

const COLLECTION_NAME = 'creditCards';

export async function getCreditCards(userId: string): Promise<CreditCard[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    console.log(`Fetched ${snapshot.docs.length} credit cards for user ${userId}`);

    const creditCards = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    }) as CreditCard[];

    // Sort by name
    return creditCards.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching credit cards:', error);
    throw error;
  }
}

export async function getCreditCard(creditCardId: string): Promise<CreditCard | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, creditCardId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
    } as CreditCard;
  } catch (error) {
    console.error('Error fetching credit card:', error);
    throw error;
  }
}

export async function createCreditCard(
  creditCard: CreditCardInput
): Promise<CreditCard> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...creditCard,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...creditCard,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function updateCreditCard(
  creditCardId: string,
  updates: Partial<CreditCardInput>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, creditCardId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCreditCard(creditCardId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, creditCardId);
  await deleteDoc(docRef);
}

/**
 * Calculate the available limit for a credit card
 * Formula: creditLimit - total of unpaid bills
 */
export async function calculateAvailableLimit(
  creditCardId: string,
  creditLimit: number
): Promise<number> {
  try {
    // Get all unpaid bills for this card
    const q = query(
      collection(db, 'creditCardBills'),
      where('creditCardId', '==', creditCardId),
      where('isPaid', '==', false)
    );

    const snapshot = await getDocs(q);
    let totalUnpaid = 0;

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalUnpaid += data.totalAmount || 0;
    });

    return creditLimit - totalUnpaid;
  } catch (error) {
    console.error('Error calculating available limit:', error);
    throw error;
  }
}
