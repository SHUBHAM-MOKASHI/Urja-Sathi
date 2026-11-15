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
  ApplianceInput,
  DetailedWorkerProfile,
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
    value: DetailedQuotation | InstallerQuotation;
    indexes: { 'by-status': string };
  };
  workers: {
    key: string;
    value: DetailedWorkerProfile | EnergyWorker;
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
let inMemoryInventoryFallback: ApplianceInput[] | null = null;
let inMemoryDetailedQuotationsFallback: DetailedQuotation[] | null = null;
let inMemoryDetailedWorkersFallback: DetailedWorkerProfile[] | null = null;

export function resetDbInMemoryFallbacks() {
  inMemoryInventoryFallback = null;
  inMemoryDetailedQuotationsFallback = null;
  inMemoryDetailedWorkersFallback = null;
}

export function setDbPromise(promise: Promise<IDBPDatabase<UrjaSaathiDB>> | null) {
  dbPromise = promise;
}

/**
 * Sanitizes and validates an appliance inventory array.
 * Ensures all required fields exist with valid numeric ranges, while preserving
 * custom properties (thermostat setpoints, age, star rating, standby hours).
 */
export function sanitizeApplianceInventory(items: unknown): ApplianceInput[] {
  if (!items || !Array.isArray(items)) {
    return [];
  }

  const validCategories = new Set([
    'air_conditioner',
    'refrigerator',
    'ceiling_fan',
    'lighting',
    'water_heater',
    'television',
    'washing_machine',
    'air_cooler',
    'water_pump',
    'cooking_appliance',
    'other',
  ]);

  const sanitized: ApplianceInput[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const obj = item as Record<string, unknown>;

    // Must have a valid wattage
    const wattage =
      typeof obj.wattage === 'number' && !isNaN(obj.wattage) && obj.wattage > 0
        ? Math.max(1, Math.min(15000, obj.wattage))
        : null;
    if (wattage === null) {
      continue;
    }

    const id =
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim()
        : `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const name =
      typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : 'Unnamed Appliance';
    const rawCategory = typeof obj.category === 'string' ? obj.category : 'other';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const category = validCategories.has(rawCategory) ? (rawCategory as any) : 'other';
    const quantity =
      typeof obj.quantity === 'number' && !isNaN(obj.quantity) && obj.quantity > 0
        ? Math.max(1, Math.min(100, Math.round(obj.quantity)))
        : 1;
    const dailyUsageHours =
      typeof obj.dailyUsageHours === 'number' && !isNaN(obj.dailyUsageHours)
        ? Math.max(0, Math.min(24, Number(obj.dailyUsageHours.toFixed(1))))
        : 4;

    const appliance: ApplianceInput = {
      id,
      name,
      category,
      quantity,
      wattage,
      dailyUsageHours,
    };

    if (typeof obj.temperatureSetpointC === 'number' && !isNaN(obj.temperatureSetpointC)) {
      appliance.temperatureSetpointC = Math.max(16, Math.min(30, Math.round(obj.temperatureSetpointC)));
    }

    if (typeof obj.starRating === 'number' && !isNaN(obj.starRating)) {
      appliance.starRating = Math.max(1, Math.min(5, Math.round(obj.starRating)));
    }

    if (typeof obj.ageYears === 'number' && !isNaN(obj.ageYears)) {
      appliance.ageYears = Math.max(0, Math.min(50, Math.round(obj.ageYears)));
    }

    if (typeof obj.standbyHours === 'number' && !isNaN(obj.standbyHours)) {
      appliance.standbyHours = Math.max(0, Math.min(24, Math.round(obj.standbyHours)));
    }

    sanitized.push(appliance);
  }

  return sanitized;
}

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
    }).catch((err) => {
      dbPromise = null; // Do not permanently cache rejected promise on quota or security errors
      throw err;
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

  async deleteAssessment(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('assessments', id);
  },

  // -------------------------------------------------------------
  // QUOTATIONS
  // -------------------------------------------------------------
  async getAllQuotations(): Promise<InstallerQuotation[]> {
    const db = await getDB();
    const all = await db.getAll('quotations');
    return all.filter((q) => !('totalPriceInr' in q)) as InstallerQuotation[];
  },

  async saveQuotation(quote: InstallerQuotation): Promise<void> {
    const db = await getDB();
    await db.put('quotations', quote);
  },

  async getDetailedQuotations(): Promise<DetailedQuotation[]> {
    // 1. Primary Source of Truth: Dedicated 'quotations' IndexedDB store
    try {
      const db = await getDB();
      const all = await db.getAll('quotations');
      const detailed = all.filter(
        (q) => q && typeof (q as DetailedQuotation).totalPriceInr === 'number'
      ) as DetailedQuotation[];

      if (detailed.length > 0) {
        inMemoryDetailedQuotationsFallback = detailed;
        return detailed;
      }

      // 2. Backward-compatible reading from legacy 'cachedSettings' store
      const legacyFromSettings = (await db.get(
        'cachedSettings',
        'detailed_quotations'
      )) as DetailedQuotation[] | undefined;

      if (legacyFromSettings && Array.isArray(legacyFromSettings) && legacyFromSettings.length > 0) {
        // Safe migration: put legacy records into the dedicated store
        const tx = db.transaction('quotations', 'readwrite');
        for (const q of legacyFromSettings) {
          if (q && q.id) {
            await tx.store.put(q);
          }
        }
        await tx.done;

        // Verify migration succeeded before removing legacy record
        const verified = await db.getAll('quotations');
        if (verified.length >= legacyFromSettings.length) {
          try {
            await db.delete('cachedSettings', 'detailed_quotations');
          } catch {
            // Non-critical if delete fails
          }
        }

        inMemoryDetailedQuotationsFallback = legacyFromSettings;
        return legacyFromSettings;
      }
    } catch {
      // Fallback
    }

    // 3. Fallback reading from legacy localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const local = localStorage.getItem('urja_saathi_detailed_quotations');
        if (local) {
          const parsed = JSON.parse(local) as DetailedQuotation[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Attempt migration to quotations store
            try {
              const db = await getDB();
              const tx = db.transaction('quotations', 'readwrite');
              for (const q of parsed) {
                if (q && q.id) await tx.store.put(q);
              }
              await tx.done;
            } catch {
              // Ignore
            }
            inMemoryDetailedQuotationsFallback = parsed;
            return parsed;
          }
        }
      }
    } catch {
      // Ignore
    }

    if (inMemoryDetailedQuotationsFallback !== null) {
      return inMemoryDetailedQuotationsFallback;
    }

    return [];
  },

  async saveDetailedQuotations(quotes: DetailedQuotation[]): Promise<void> {
    // Deduplicate by ID to prevent duplicate records
    const seenIds = new Set<string>();
    const deduplicated: DetailedQuotation[] = [];
    for (const q of quotes) {
      if (q && q.id && !seenIds.has(q.id)) {
        seenIds.add(q.id);
        deduplicated.push(q);
      }
    }

    inMemoryDetailedQuotationsFallback = deduplicated;

    try {
      const db = await getDB();
      const allCurrent = await db.getAll('quotations');
      const nonDetailed = allCurrent.filter((q) => !('totalPriceInr' in q));

      const tx = db.transaction('quotations', 'readwrite');
      await tx.store.clear();
      for (const nd of nonDetailed) {
        await tx.store.put(nd);
      }
      for (const q of deduplicated) {
        await tx.store.put(q);
      }
      await tx.done;
    } catch {
      // Fallback
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('urja_saathi_detailed_quotations', JSON.stringify(deduplicated));
      }
    } catch {
      // Ignore
    }
  },

  // -------------------------------------------------------------
  // APPLIANCE INVENTORY (SHARED CACHED SETTINGS)
  // -------------------------------------------------------------
  async getApplianceInventory(): Promise<ApplianceInput[]> {
    try {
      const db = await getDB();
      const raw = (await db.get('cachedSettings', 'applianceInventory')) as unknown;
      if (raw && Array.isArray(raw)) {
        return sanitizeApplianceInventory(raw);
      }
    } catch {
      // Fallback to localStorage or in-memory
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const local = localStorage.getItem('urja_saathi_appliance_inventory');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            return sanitizeApplianceInventory(parsed);
          }
        }
      }
    } catch {
      // Ignore
    }

    if (inMemoryInventoryFallback !== null) {
      return sanitizeApplianceInventory(inMemoryInventoryFallback);
    }

    return [];
  },

  async saveApplianceInventory(inventory: ApplianceInput[]): Promise<void> {
    const sanitized = sanitizeApplianceInventory(inventory);
    inMemoryInventoryFallback = sanitized;

    try {
      const db = await getDB();
      await db.put('cachedSettings', sanitized, 'applianceInventory');
    } catch {
      // Fallback
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('urja_saathi_appliance_inventory', JSON.stringify(sanitized));
      }
    } catch {
      // Ignore
    }

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(
          new CustomEvent('urja-appliance-inventory-changed', { detail: sanitized })
        );
      } catch {
        // Ignore in non-browser env
      }
    }
  },

  // -------------------------------------------------------------
  // WORKERS
  // -------------------------------------------------------------
  async getAllWorkers(): Promise<EnergyWorker[]> {
    const db = await getDB();
    const all = await db.getAll('workers');
    return all.filter((w) => !('verificationStatus' in w)) as EnergyWorker[];
  },

  async saveWorkers(workers: EnergyWorker[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('workers', 'readwrite');
    for (const worker of workers) {
      await tx.store.put(worker);
    }
    await tx.done;
  },

  async getDetailedWorkers(): Promise<DetailedWorkerProfile[]> {
    // 1. Primary Source of Truth: Dedicated 'workers' IndexedDB store
    try {
      const db = await getDB();
      const all = await db.getAll('workers');
      const detailed = all.filter(
        (w) => w && ('verificationStatus' in w || 'verifiedQualifications' in w)
      ) as DetailedWorkerProfile[];

      if (detailed.length > 0) {
        inMemoryDetailedWorkersFallback = detailed;
        return detailed;
      }
    } catch {
      // Fallback
    }

    // 2. Safe backward-compatible migration from localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const local = localStorage.getItem('urja_saathi_workers');
        if (local) {
          const parsed = JSON.parse(local) as DetailedWorkerProfile[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Deduplicate by ID
            const seenIds = new Set<string>();
            const deduped: DetailedWorkerProfile[] = [];
            for (const w of parsed) {
              if (w && w.id && !seenIds.has(w.id)) {
                seenIds.add(w.id);
                // Strict rule: Preserve verification and demo status (never promote sample to verified real)
                deduped.push(w);
              }
            }

            try {
              const db = await getDB();
              const tx = db.transaction('workers', 'readwrite');
              for (const w of deduped) {
                await tx.store.put(w);
              }
              await tx.done;
            } catch {
              // Ignore
            }

            inMemoryDetailedWorkersFallback = deduped;
            return deduped;
          }
        }
      }
    } catch {
      // Ignore
    }

    if (inMemoryDetailedWorkersFallback !== null) {
      return inMemoryDetailedWorkersFallback;
    }

    return [];
  },

  async saveDetailedWorkers(workers: DetailedWorkerProfile[]): Promise<void> {
    // Deduplicate by ID to prevent duplicate workers
    const seenIds = new Set<string>();
    const deduplicated: DetailedWorkerProfile[] = [];
    for (const w of workers) {
      if (w && w.id && !seenIds.has(w.id)) {
        seenIds.add(w.id);
        deduplicated.push(w);
      }
    }

    inMemoryDetailedWorkersFallback = deduplicated;

    try {
      const db = await getDB();
      const all = await db.getAll('workers');
      const nonDetailed = all.filter((w) => !('verificationStatus' in w));

      const tx = db.transaction('workers', 'readwrite');
      await tx.store.clear();
      for (const nd of nonDetailed) {
        await tx.store.put(nd);
      }
      for (const w of deduplicated) {
        await tx.store.put(w);
      }
      await tx.done;
    } catch {
      // Fallback
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('urja_saathi_workers', JSON.stringify(deduplicated));
      }
    } catch {
      // Ignore
    }
  },

  async saveWorkerProfile(worker: DetailedWorkerProfile): Promise<void> {
    const existing = await this.getDetailedWorkers();
    const idx = existing.findIndex((w) => w.id === worker.id);
    const updated = idx >= 0
      ? existing.map((w) => (w.id === worker.id ? worker : w))
      : [...existing, worker];
    await this.saveDetailedWorkers(updated);
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
    profile?: boolean;
    workers?: boolean;
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
      await db.clear('userProfile');
      await db.clear('workers');
      cleared.push(
        'bills',
        'assessments',
        'quotations',
        'offlineSyncQueue',
        'serviceRequests',
        'conflictLog',
        'cachedSettings',
        'userProfile',
        'workers'
      );
      resetDbInMemoryFallbacks();
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
      try {
        const queueItems = await db.getAll('offlineSyncQueue');
        for (const item of queueItems) {
          if (item.entityType === 'bill_record' || (item.entityType as string) === 'bill') {
            await db.delete('offlineSyncQueue', item.id);
          }
        }
      } catch {
        // Ignore
      }
    }

    if (options?.queue) {
      await db.clear('offlineSyncQueue');
      cleared.push('offlineSyncQueue');
    }

    if (options?.serviceRequests) {
      await db.clear('serviceRequests');
      cleared.push('serviceRequests');
      try {
        const queueItems = await db.getAll('offlineSyncQueue');
        for (const item of queueItems) {
          if (item.entityType === 'service_request') {
            await db.delete('offlineSyncQueue', item.id);
          }
        }
        localStorage.removeItem('urja_saathi_requests');
      } catch {
        // Ignore
      }
    }

    if (options?.assessments) {
      await db.clear('assessments');
      cleared.push('assessments');
      try {
        const queueItems = await db.getAll('offlineSyncQueue');
        for (const item of queueItems) {
          if (item.entityType === 'solar_assessment') {
            await db.delete('offlineSyncQueue', item.id);
          }
        }
      } catch {
        // Ignore
      }
    }

    if (options?.quotations) {
      await db.clear('quotations');
      cleared.push('quotations');
    }

    if (options?.profile) {
      await db.clear('userProfile');
      cleared.push('userProfile');
    }

    if (options?.workers) {
      await db.clear('workers');
      cleared.push('workers');
      try {
        localStorage.removeItem('urja_saathi_workers');
      } catch {
        // Ignore
      }
    }

    return { clearedStores: cleared, success: true };
  },
};

export const getApplianceInventory = () => dbService.getApplianceInventory();
export const saveApplianceInventory = (inv: ApplianceInput[]) => dbService.saveApplianceInventory(inv);
export const getDetailedQuotations = () => dbService.getDetailedQuotations();
export const saveDetailedQuotations = (quotes: DetailedQuotation[]) => dbService.saveDetailedQuotations(quotes);
export const getDetailedWorkers = () => dbService.getDetailedWorkers();
export const saveDetailedWorkers = (workers: DetailedWorkerProfile[]) => dbService.saveDetailedWorkers(workers);
export const saveWorkerProfile = (worker: DetailedWorkerProfile) => dbService.saveWorkerProfile(worker);

