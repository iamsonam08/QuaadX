import { AppData } from "../types";
import { INITIAL_DATA } from "../constants";

/**
 * GLOBAL CAMPUS CLOUD HUB
 * Uses npoint.io for cross-device state synchronization.
 */
const CLOUD_BIN_ID = '9307f5984f884a441416'; 
const CLOUD_URL = `https://api.npoint.io/${CLOUD_BIN_ID}`;
const STORAGE_KEY = 'QUADX_GLOBAL_STATE_V8';
const DB_NAME = 'QuadX_Global_DB';
const STORE_NAME = 'app_state';

const getIDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const idbGet = async (key: string): Promise<any> => {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) { return null; }
};

const idbSet = async (key: string, value: any): Promise<void> => {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const request = transaction.objectStore(STORE_NAME).put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {}
};

export const PersistenceService = {
  /**
   * Loads data from the Cloud with local fallback.
   * Includes cache-busting to ensure latest admin data is fetched.
   */
  async loadData(): Promise<AppData> {
    try {
      const response = await fetch(`${CLOUD_URL}?cb=${Date.now()}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const cloudData = await response.json();
        if (cloudData && typeof cloudData === 'object' && !Array.isArray(cloudData)) {
          await idbSet(STORAGE_KEY, cloudData);
          return cloudData as AppData;
        }
      }
    } catch (e) {
      console.warn("Persistence: Cloud Fetch Failed, using local cache.", e);
    }

    const cached = await idbGet(STORAGE_KEY);
    return cached || INITIAL_DATA;
  },

  /**
   * Saves data to both Local Storage and the Global Cloud Hub.
   */
  async saveData(data: AppData): Promise<boolean> {
    try {
      // 1. Local Cache Update
      await idbSet(STORAGE_KEY, data);

      // 2. Broadcast to Cloud for other devices
      const response = await fetch(CLOUD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Dispatch local event for same-tab updates
        window.dispatchEvent(new CustomEvent('quadx_cloud_sync', { detail: data }));
        return true;
      }
      return false;
    } catch (e) {
      console.error("Persistence: Cloud Push Failed", e);
      return false;
    }
  }
};