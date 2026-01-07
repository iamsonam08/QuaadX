import { AppData } from "../types";
import { INITIAL_DATA } from "../constants";
import { db, storage } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

/**
 * Helper to clean data for Firestore (recursively converts undefined to null)
 */
const sanitizeData = (data: any): any => {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      sanitized[key] = sanitizeData(data[key]);
    }
  }
  return sanitized;
};

const GLOBAL_STATE_DOC_ID = "global_app_state";
const STATE_COLLECTION = "system_config";

// Simple internal lock for saveData to prevent overlapping writes
let isSaving = false;
let pendingData: AppData | null = null;

export const PersistenceService = {
  /**
   * Loads data from Firestore once.
   */
  async loadData(): Promise<AppData> {
    try {
      const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as AppData;
      } else {
        await setDoc(docRef, sanitizeData(INITIAL_DATA));
        return INITIAL_DATA;
      }
    } catch (e) {
      console.warn("Persistence: Load Failed", e);
      return INITIAL_DATA;
    }
  },

  /**
   * Uploads a base64 image to Firebase Storage and returns the URL.
   */
  async uploadImage(base64: string, path: string): Promise<string | null> {
    try {
      const storageRef = ref(storage, path);
      // Ensure we only have the base64 part
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      await uploadString(storageRef, base64Data, 'base64');
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (e) {
      console.error("Persistence: Image Upload Failed", e);
      return null;
    }
  },

  /**
   * Saves data to Firestore with write-queue protection.
   */
  async saveData(data: AppData): Promise<boolean> {
    // If already saving, queue the latest data and return immediately
    if (isSaving) {
      pendingData = data;
      return true;
    }

    isSaving = true;
    try {
      const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC_ID);
      const cleanedData = sanitizeData(data);
      await setDoc(docRef, cleanedData);
      
      // If new data arrived while we were saving, process it now
      if (pendingData) {
        const nextData = pendingData;
        pendingData = null;
        isSaving = false; // Release lock before recursion
        return await this.saveData(nextData);
      }
      
      isSaving = false;
      return true;
    } catch (e: any) {
      console.error("Persistence: Save Failed", e);
      isSaving = false;
      pendingData = null; // Clear queue on hard error
      if (e.message?.includes('longer than 1048487 bytes')) {
        alert("Persistence Error: The data is too large. Please ensure images are optimized.");
      }
      return false;
    }
  },

  /**
   * Resilient subscriber for real-time updates.
   */
  subscribeToUpdates(callback: (data: AppData) => void) {
    const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC_ID);
    
    return onSnapshot(docRef, {
      next: (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as AppData);
        } else {
          callback(INITIAL_DATA);
        }
      },
      error: (error) => {
        console.warn("Firestore RPC Connection Issue (Retrying...):", error.message);
      }
    });
  }
};