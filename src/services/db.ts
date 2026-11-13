import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  ElectricityBill,
  SolarAssessment,
  InstallerQuotation,
  EnergyWorker,
  UserProfile,
  DetailedQuotation,
  SyncQueueItem,
  ServiceRequest,
  ConflictRecord,
} from '../types';

export interface UrjaSaathiDB extends DBSchema {
  bills: {
    key: string;
    value: ElectricityBill;
    indexes: { 'by-month': string };
  };
  assessments: {
    key: string;
    value: SolarAssessment;
    indexes: { 'by-date': string };
  };
  quotations: {
    key: string;
    value: InstallerQuotation;
    indexes: { 'by-status': string };
  };
  workers: {
    key: string;
    value: EnergyWorker;
    indexes: { 'by-category': string };
  };
  userProfile: {
    key: string;
    value: UserProfile;
  };
  cachedSettings: {
    key: string;
    value: unknown;
  };
  offlineSyncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-idempotency': string;
      'by-timestamp': string;
    };
  };
  serviceRequests: {
    key: string;
    value: ServiceRequest;
    indexes: { 'by-status': string };
  };
  conflictLog: {
    key: string;
    value: ConflictRecord;
    indexes: { 'by-timestamp': string };
  };
}

const DB_NAME = 'urja_saathi_offline_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<UrjaSaathiDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<UrjaSaathiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Bills Store
        if (!db.objectStoreNames.contains('bills')) {
          const billStore = db.createObjectStore('bills', { keyPath: 'id' });
          billStore.createIndex('by-month', 'billMonth');
        }

        // Solar Assessments Store
        if (!db.objectStoreNames.contains('assessments')) {
          const assessStore = db.createObjectStore('assessments', { keyPath: 'id' });
          assessStore.createIndex('by-date', 'createdAt');
        }

        // Quotations Store
        if (!db.objectStoreNames.contains('quotations')) {
          const quoteStore = db.createObjectStore('quotations', { keyPath: 'id' });
          quoteStore.createIndex('by-status', 'status');
        }

        // Workers Store
        if (!db.objectStoreNames.contains('workers')) {
          const workerStore = db.createObjectStore('workers', { keyPath: 'id' });
          workerStore.createIndex('by-category', 'category');
        }

        // User Profile Store
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'id' });
        }

        // Generic settings store
        if (!db.objectStoreNames.contains('cachedSettings')) {
          db.createObjectStore('cachedSettings');
        }

        // Offline Sync Queue Store (Added in Version 2)
        if (!db.objectStoreNames.contains('offlineSyncQueue')) {
          const queueStore = db.createObjectStore('offlineSyncQueue', { keyPath: 'id' });
          queueStore.createIndex('by-status', 'syncStatus');
          queueStore.createIndex('by-idempotency', 'idempotencyKey');
          queueStore.createIndex('by-timestamp', 'timestamp');
        }

        // Local Service Requests Store (Added in Version 2)
        if (!db.objectStoreNames.contains('serviceRequests')) {
          const reqStore = db.createObjectStore('serviceRequests', { keyPath: 'id' });
          reqStore.createIndex('by-status', 'status');
        }

        // Conflict Log Store (Added in Version 2)
        if (!db.objectStoreNames.contains('conflictLog')) {
          const conflictStore = db.createObjectStore('conflictLog', { keyPath: 'id' });
          conflictStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

// Database helper functions
export const dbService = {
  // -------------------------------------------------------------
  // BILLS
  // -------------------------------------------------------------
  async getAllBills(): Promise<ElectricityBill[]> {
    const db = await getDB();
    return db.getAll('bills');
  },

  async saveBill(bill: ElectricityBill): Promise<void> {
    const db = await getDB();
    await db.put('bills', bill);
  },

  async deleteBill(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('bills', id);
  },

  // -------------------------------------------------------------
  // SOLAR ASSESSMENTS
  // -------------------------------------------------------------
  async getAllAssessments(): Promise<SolarAssessment[]> {
    const db = await getDB();
    return db.getAll('assessments');
  },

  async saveAssessment(assessment: SolarAssessment): Promise<void> {
    const db = await getDB();
    await db.put('assessments', assessment);
  },

  // -------------------------------------------------------------
  // QUOTATIONS
  // -------------------------------------------------------------
  async getAllQuotations(): Promise<InstallerQuotation[]> {
    const db = await getDB();
    return db.getAll('quotations');
  },

  async saveQuotation(quote: InstallerQuotation): Promise<void> {
    const db = await getDB();
    await db.put('quotations', quote);
  },

  async getDetailedQuotations(): Promise<DetailedQuotation[]> {
    try {
      const db = await getDB();
      const quotes = (await db.get('cachedSettings', 'detailed_quotations')) as DetailedQuotation[];
      if (quotes && Array.isArray(quotes) && quotes.length > 0) return quotes;
    } catch {
      // Fallback
    }
    try {
      const local = localStorage.getItem('urja_saathi_detailed_quotations');
      return local ? JSON.parse(local) : [];
    } catch {
      return [];
    }
  },

  async saveDetailedQuotations(quotes: DetailedQuotation[]): Promise<void> {
    try {
      const db = await getDB();
      await db.put('cachedSettings', quotes, 'detailed_quotations');
    } catch {
      // Fallback
    }
    try {
      localStorage.setItem('urja_saathi_detailed_quotations', JSON.stringify(quotes));
    } catch {
      // Ignore
    }
  },

  // -------------------------------------------------------------
  // WORKERS
  // -------------------------------------------------------------
  async getAllWorkers(): Promise<EnergyWorker[]> {
    const db = await getDB();
    return db.getAll('workers');
  },

  async saveWorkers(workers: EnergyWorker[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('workers', 'readwrite');
    for (const worker of workers) {
      await tx.store.put(worker);
    }
    await tx.done;
  },

  // -------------------------------------------------------------
  // USER PROFILE
  // -------------------------------------------------------------
  async getUserProfile(): Promise<UserProfile | undefined> {
    const db = await getDB();
    return db.get('userProfile', 'default_user');
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const db = await getDB();
    await db.put('userProfile', { ...profile, id: 'default_user' });
  },

  // -------------------------------------------------------------
  // OFFLINE SYNC QUEUE OPERATIONS
  // -------------------------------------------------------------
  async enqueueSyncItem(item: SyncQueueItem): Promise<void> {
    const db = await getDB();
    await db.put('offlineSyncQueue', item);
  },

  async getAllSyncItems(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    return db.getAll('offlineSyncQueue');
  },

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const db = await getDB();
    const all = await db.getAll('offlineSyncQueue');
    return all.filter((i) => i.syncStatus === 'pending' || i.syncStatus === 'failed');
  },

  async getSyncItemByIdempotency(idempotencyKey: string): Promise<SyncQueueItem | undefined> {
    const db = await getDB();
    const tx = db.transaction('offlineSyncQueue', 'readonly');
    const index = tx.store.index('by-idempotency');
    return index.get(idempotencyKey);
  },

  async updateSyncItem(item: SyncQueueItem): Promise<void> {
    const db = await getDB();
    await db.put('offlineSyncQueue', item);
  },

  async deleteSyncItem(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('offlineSyncQueue', id);
  },

  async clearSyncQueue(): Promise<void> {
    const db = await getDB();
    await db.clear('offlineSyncQueue');
  },

  // -------------------------------------------------------------
  // SERVICE REQUESTS STORE
  // -------------------------------------------------------------
  async getAllServiceRequests(): Promise<ServiceRequest[]> {
    const db = await getDB();
    return db.getAll('serviceRequests');
  },

  async getServiceRequest(id: string): Promise<ServiceRequest | undefined> {
    const db = await getDB();
    return db.get('serviceRequests', id);
  },

  async saveServiceRequest(req: ServiceRequest): Promise<void> {
    const db = await getDB();
    await db.put('serviceRequests', req);
  },

  async deleteServiceRequest(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('serviceRequests', id);
  },

  // -------------------------------------------------------------
  // CONFLICT LOG
  // -------------------------------------------------------------
  async saveConflictRecord(conflict: ConflictRecord): Promise<void> {
    const db = await getDB();
    await db.put('conflictLog', conflict);
  },

  async getAllConflicts(): Promise<ConflictRecord[]> {
    const db = await getDB();
    return db.getAll('conflictLog');
  },

  // -------------------------------------------------------------
  // USER-CONTROLLED DATA DELETION MECHANISM
  // -------------------------------------------------------------
  async clearAllData(options?: {
    bills?: boolean;
    queue?: boolean;
    serviceRequests?: boolean;
    assessments?: boolean;
    quotations?: boolean;
    fullReset?: boolean;
  }): Promise<{ clearedStores: string[]; success: boolean }> {
    const db = await getDB();
    const cleared: string[] = [];

    if (options?.fullReset) {
      await db.clear('bills');
      await db.clear('assessments');
      await db.clear('quotations');
      await db.clear('offlineSyncQueue');
      await db.clear('serviceRequests');
      await db.clear('conflictLog');
      await db.clear('cachedSettings');
      cleared.push(
        'bills',
        'assessments',
        'quotations',
        'offlineSyncQueue',
        'serviceRequests',
        'conflictLog',
        'cachedSettings'
      );
      try {
        localStorage.removeItem('urja_saathi_requests');
        localStorage.removeItem('urja_saathi_workers');
        localStorage.removeItem('urja_saathi_detailed_quotations');
      } catch {
        // Ignore
      }
      return { clearedStores: cleared, success: true };
    }

    if (options?.bills) {
      await db.clear('bills');
      cleared.push('bills');
    }

    if (options?.queue) {
      await db.clear('offlineSyncQueue');
      cleared.push('offlineSyncQueue');
    }

    if (options?.serviceRequests) {
      await db.clear('serviceRequests');
      cleared.push('serviceRequests');
      try {
        localStorage.removeItem('urja_saathi_requests');
      } catch {
        // Ignore
      }
    }

    if (options?.assessments) {
      await db.clear('assessments');
      cleared.push('assessments');
    }

    if (options?.quotations) {
      await db.clear('quotations');
      cleared.push('quotations');
    }

    return { clearedStores: cleared, success: true };
  },
};
