
import { AppData } from "../types";
import { INITIAL_DATA } from "../constants";
import { db } from "../firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

/**
 * GLOBAL CAMPUS CLOUD HUB
 * Migrated to Firebase Firestore for real-time, cross-device synchronization.
 */
const GLOBAL_STATE_DOC_ID = "global_app_state";
const STATE_COLLECTION = "system_config";

export const PersistenceService = {
  /**
   * Loads data from Firestore with real-time listener support.
   */
  async loadData(): Promise<AppData> {
    try {
      const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC_ID);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as AppData;
      } else {
        // Initialize if not exists
        await setDoc(docRef, INITIAL_DATA);
        return INITIAL_DATA;
      }
    } catch (e) {
      console.warn("Persistence: Firestore Load Failed, using initial data.", e);
      return INITIAL_DATA;
    }
  },

  /**
   * Saves data to Firestore, triggering updates for all connected devices.
   */
  async saveData(data: AppData): Promise<boolean> {
    try {
      const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC_ID);
      await setDoc(docRef, data);
      
      // Local broadcast still useful for immediate UI response in the same tab
      window.dispatchEvent(new CustomEvent('quadx_cloud_sync', { detail: data }));
      return true;
    } catch (e) {
      console.error("Persistence: Firestore Save Failed", e);
      return false;
    }
  },

  /**
   * Subscribes to real-time changes across the entire app.
   */
  subscribeToUpdates(callback: (data: AppData) => void) {
    const docRef = doc(db, STATE_COLLECTION, GLOBAL_STATE_DOC_ID);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as AppData);
      } else {
        // CRITICAL: Trigger callback with initial data if doc doesn't exist
        // This prevents the infinite loading screen.
        callback(INITIAL_DATA);
      }
    }, (error) => {
      console.error("Firestore Subscription Error:", error);
      // Fallback so the app doesn't hang
      callback(INITIAL_DATA);
    });
  }
};
