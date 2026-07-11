/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch,
  FirestoreError
} from 'firebase/firestore';
import { db, auth } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function cleanUndefined(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  return JSON.parse(JSON.stringify(obj));
}

// Generic API wrapper for direct Firestore integration
export const dbApi = {
  async getAll<T>(collectionName: string): Promise<T[]> {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      return []; // Should not reach here as handleFirestoreError throws
    }
  },

  async getById<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docSnap = await getDoc(doc(db, collectionName, id));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
      return null;
    }
  },

  async save<T>(collectionName: string, data: T & { id?: string }, forceOverwrite: boolean = false): Promise<T> {
    const { id, ...saveData } = data;
    const sanitizedData = cleanUndefined(saveData);
    try {
      if (id) {
        if (forceOverwrite) {
          await setDoc(doc(db, collectionName, id), sanitizedData);
        } else {
          await setDoc(doc(db, collectionName, id), sanitizedData, { merge: true });
        }
        return data;
      } else {
        const docRef = await addDoc(collection(db, collectionName), sanitizedData);
        return { ...data, id: docRef.id };
      }
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, collectionName);
      throw error;
    }
  },

  async delete(collectionName: string, id: string): Promise<{ success: boolean }> {
    try {
      await deleteDoc(doc(db, collectionName, id));
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, collectionName);
      throw error;
    }
  },

  async bulkSave<T>(collectionName: string, items: T[]): Promise<{ success: boolean; count: number }> {
    try {
      const batch = writeBatch(db);
      items.forEach((item: any) => {
        const { id, ...data } = item;
        const sanitizedData = cleanUndefined(data);
        const ref = id ? doc(db, collectionName, id) : doc(collection(db, collectionName));
        batch.set(ref, sanitizedData, { merge: true });
      });
      await batch.commit();
      return { success: true, count: items.length };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
      throw error;
    }
  }
};
