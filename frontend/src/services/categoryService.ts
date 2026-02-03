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
import type { Category } from '../types';

const COLLECTION_NAME = 'categories';

export async function getCategories(userId: string): Promise<Category[]> {
  try {
    // Simple query without ordering to avoid index requirement
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    console.log(`Fetched ${snapshot.docs.length} categories for user ${userId}`);
    
    const categories = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    }) as Category[];
    
    // Sort in memory instead of in the query
    return categories.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

export async function createCategory(
  userId: string,
  category: Omit<Category, 'id' | 'userId' | 'createdAt'>
): Promise<Category> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...category,
    userId,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    userId,
    ...category,
    createdAt: new Date().toISOString(),
  };
}

export async function updateCategory(
  categoryId: string,
  updates: Partial<Omit<Category, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, categoryId);
  await updateDoc(docRef, updates);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, categoryId);
  await deleteDoc(docRef);
}
