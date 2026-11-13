import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  ElectricityBill,
  SolarAssessment,
  InstallerQuotation,
  EnergyWorker,
  UserProfile,
  DetailedQuotation,
} from '../types';

interface UrjaSaathiDB extends DBSchema {
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
}

const DB_NAME = 'urja_saathi_offline_db';
const DB_VERSION = 1;

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
      },
    });
  }
  return dbPromise;
}

// Database helper functions
export const dbService = {
  // Bills
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

  // Assessments
  async getAllAssessments(): Promise<SolarAssessment[]> {
    const db = await getDB();
    return db.getAll('assessments');
  },

  async saveAssessment(assessment: SolarAssessment): Promise<void> {
    const db = await getDB();
    await db.put('assessments', assessment);
  },

  // Quotations
  async getAllQuotations(): Promise<InstallerQuotation[]> {
    const db = await getDB();
    return db.getAll('quotations');
  },

  async saveQuotation(quote: InstallerQuotation): Promise<void> {
    const db = await getDB();
    await db.put('quotations', quote);
  },

  // Detailed Solar Quotations for Comparison
  async getDetailedQuotations(): Promise<DetailedQuotation[]> {
    try {
      const db = await getDB();
      const quotes = (await db.get('cachedSettings', 'detailed_quotations')) as DetailedQuotation[];
      if (quotes && Array.isArray(quotes) && quotes.length > 0) return quotes;
    } catch {
      // Fallback to local storage if IndexedDB fails
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
      // Ignore local storage quota errors
    }
  },

  // Workers
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

  // Profile
  async getUserProfile(): Promise<UserProfile | undefined> {
    const db = await getDB();
    return db.get('userProfile', 'default_user');
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const db = await getDB();
    await db.put('userProfile', { ...profile, id: 'default_user' });
  },
};

