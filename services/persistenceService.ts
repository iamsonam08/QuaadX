import { AppData } from "../types";
import { INITIAL_DATA } from "../constants";
import { db } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

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
   * Saves data to Firestore.
   */
  async saveData(data: AppData): Promise<boolean> {
    try {
      const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC_ID);
      const cleanedData = sanitizeData(data);
      await setDoc(docRef, cleanedData);
      return true;
    } catch (e) {
      console.error("Persistence: Save Failed", e);
      return false;
    }
  },

  /**
   * Resilient subscriber for real-time updates.
   */
  subscribeToUpdates(callback: (data: AppData) => void) {
    const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC_ID);
    
    // Using a more robust listener configuration
    return onSnapshot(docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as AppData);
        } else {
          callback(INITIAL_DATA);
        }
      }, 
      (error) => {
        console.warn("Firestore RPC Stream Warning (Recovering...):", error.message);
        // We don't crash the app; Firestore automatically attempts to reconnect
      }
    );
  }
};