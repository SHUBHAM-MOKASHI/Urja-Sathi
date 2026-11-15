import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateBillFile,
  validateBillFileSignature,
  validateBillData,
} from '../billValidation';
import { runEnergySavingsEngine } from '../energyEngine';
import { runSolarFeasibilityEngine } from '../solarEngine';
import {
  maskName,
  maskPhone,
  maskConsumerNumber,
} from '../impactTrackerService';
import { matchWorkersForRequest } from '../workforceMatchingService';
import {
  dbService,
  sanitizeApplianceInventory,
  setDbPromise,
  resetDbInMemoryFallbacks,
} from '../db';
import { storageService } from '../storageService';
import {
  DetailedWorkerProfile,
  ServiceRequest,
  ElectricityBill,
  SyncQueueItem,
} from '../../types';

// Mock localStorage for Vitest Node runner
const localStorageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    localStorageStore[key] = String(val);
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    for (const k in localStorageStore) delete localStorageStore[k];
  }),
};

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    dispatchEvent: vi.fn(() => true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
} else {
  (globalThis as any).window.localStorage = mockLocalStorage;
}
(globalThis as any).localStorage = mockLocalStorage;

function createMockDatabase() {
  const stores: Record<string, Map<string, any>> = {
    bills: new Map(),
    assessments: new Map(),
    quotations: new Map(),
    workers: new Map(),
    userProfile: new Map(),
    cachedSettings: new Map(),
    offlineSyncQueue: new Map(),
    serviceRequests: new Map(),
    conflictLog: new Map(),
  };

  const db: any = {
    stores,
    async getAll(storeName: string) {
      const store = stores[storeName] || new Map();
      return Array.from(store.values());
    },
    async get(storeName: string, key: string) {
      const store = stores[storeName] || new Map();
      return store.get(key);
    },
    async put(storeName: string, value: any, key?: string) {
      const store = stores[storeName] || new Map();
      const itemKey = key || value.id || value.key;
      store.set(itemKey, { ...value });
      return itemKey;
    },
    async delete(storeName: string, key: string) {
      const store = stores[storeName] || new Map();
      store.delete(key);
    },
    async clear(storeName: string) {
      const store = stores[storeName] || new Map();
      store.clear();
    },
    transaction(storeNames: string | string[]) {
      const storeName = Array.isArray(storeNames) ? storeNames[0] : storeNames;
      const targetMap = stores[storeName] || new Map();
      return {
        store: {
          put: async (val: any) => {
            targetMap.set(val.id || val.key, { ...val });
          },
          get: async (key: string) => targetMap.get(key),
          getAll: async () => Array.from(targetMap.values()),
          clear: async () => targetMap.clear(),
          delete: async (key: string) => targetMap.delete(key),
          index: (_idxName: string) => ({
            get: async (val: string) => {
              for (const item of targetMap.values()) {
                if (item.idempotencyKey === val || item.consumerNumber === val) {
                  return item;
                }
              }
              return undefined;
            },
          }),
        },
        done: Promise.resolve(),
      };
    },
  };

  return db;
}

describe('URJA SAATHI — BATCH 6: Security, Privacy & Reliability Tests', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    mockLocalStorage.clear();
    resetDbInMemoryFallbacks();
    mockDb = createMockDatabase();
    setDbPromise(Promise.resolve(mockDb as any));
  });

  afterEach(() => {
    setDbPromise(null);
    resetDbInMemoryFallbacks();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. FILE UPLOAD & BINARY SIGNATURE SECURITY
  // =========================================================================
  describe('1. File Upload & Binary Signature Verification', () => {
    it('approves genuine JPEG file with valid 0xFF 0xD8 0xFF header', async () => {
      // 0xFF, 0xD8, 0xFF, 0xE0 + padding
      const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, ...new Array(6000).fill(0)]);
      const file = new File([jpegHeader], 'valid_bill.jpg', { type: 'image/jpeg' });

      const syncResult = validateBillFile(file);
      expect(syncResult.isValid).toBe(true);

      const asyncResult = await validateBillFileSignature(file);
      expect(asyncResult.isValid).toBe(true);
    });

    it('approves genuine PNG file with valid 0x89 PNG header', async () => {
      // 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A + padding
      const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(6000).fill(0)]);
      const file = new File([pngHeader], 'valid_bill.png', { type: 'image/png' });

      const syncResult = validateBillFile(file);
      expect(syncResult.isValid).toBe(true);

      const asyncResult = await validateBillFileSignature(file);
      expect(asyncResult.isValid).toBe(true);
    });

    it('rejects malicious HTML/SVG disguised as a PNG image', async () => {
      const maliciousHtml = '<svg onload="alert(1)"><html><body>Test</body></html>' + ' '.repeat(6000);
      const fakeImage = new File([maliciousHtml], 'malicious.png', { type: 'image/png' });

      // Extension passes basic check
      const syncResult = validateBillFile(fakeImage);
      expect(syncResult.isValid).toBe(true);

      // Deep binary signature verification MUST reject it
      const asyncResult = await validateBillFileSignature(fakeImage);
      expect(asyncResult.isValid).toBe(false);
      expect(asyncResult.error).toContain('Invalid file signature');
    });

    it('rejects corrupt or zero-byte file header', async () => {
      const truncated = new Uint8Array([0x00, 0x01]);
      const file = new File([truncated], 'truncated.jpg', { type: 'image/jpeg' });

      const asyncResult = await validateBillFileSignature(file);
      expect(asyncResult.isValid).toBe(false);
    });

    it('rejects executable and PDF files', () => {
      const pdf = new File([new Uint8Array(6000)], 'statement.pdf', { type: 'application/pdf' });
      expect(validateBillFile(pdf).isValid).toBe(false);

      const exe = new File([new Uint8Array(6000)], 'setup.exe', { type: 'application/octet-stream' });
      expect(validateBillFile(exe).isValid).toBe(false);
    });
  });

  // =========================================================================
  // 2. NUMERIC INPUT SAFETY & BOUNDS GUARDS
  // =========================================================================
  describe('2. Numeric Input Validation & NaN/Infinity Guards', () => {
    it('rejects NaN, Infinity, and negative values in validateBillData', () => {
      const nanBill = validateBillData({
        totalAmount: NaN,
        unitsConsumed: 200,
      });
      expect(nanBill.isValid).toBe(false);
      expect(nanBill.errors).toContain('Total Bill Amount is required and must be a valid number.');

      const infinityBill = validateBillData({
        totalAmount: Infinity,
        unitsConsumed: 200,
      });
      expect(infinityBill.isValid).toBe(false);
      expect(infinityBill.errors).toContain('Total Bill Amount is required and must be a valid number.');

      const negativeUnitsBill = validateBillData({
        totalAmount: 1500,
        unitsConsumed: -50,
      });
      expect(negativeUnitsBill.isValid).toBe(false);
      expect(negativeUnitsBill.errors).toContain('Units Consumed cannot be negative.');

      const negativeMeterReadings = validateBillData({
        totalAmount: 1500,
        unitsConsumed: 200,
        previousReading: -100,
        currentReading: 100,
      });
      expect(negativeMeterReadings.isValid).toBe(false);
      expect(negativeMeterReadings.errors).toContain('Meter readings cannot be negative numbers.');
    });

    it('energyEngine safely returns invalid_input on NaN or negative consumption', () => {
      const nanResult = runEnergySavingsEngine({
        billedUnitsKwh: NaN,
        billAmountInr: 2000,
        householdMembers: 4,
        userBudgetInr: 5000,
        appliances: [],
      });
      expect(nanResult.status).toBe('invalid_input');
      expect(nanResult.statusMessage).toContain('finite non-negative number');

      const negativeResult = runEnergySavingsEngine({
        billedUnitsKwh: -100,
        billAmountInr: 2000,
        householdMembers: 4,
        userBudgetInr: 5000,
        appliances: [],
      });
      expect(negativeResult.status).toBe('invalid_input');
    });

    it('solarEngine handles NaN and Infinity gracefully without NaN output', () => {
      const res = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: NaN,
        monthlyElectricityBillInr: Infinity,
        usableRoofAreaSqFt: NaN,
        roofOwnership: 'owned_individual',
      });

      expect(Number.isFinite(res.recommendedCapacityKw)).toBe(true);
      expect(Number.isFinite(res.grossInvestmentCostInr)).toBe(true);
      expect(Number.isFinite(res.netInvestmentCostInr)).toBe(true);
      expect(isNaN(res.recommendedCapacityKw)).toBe(false);
    });
  });

  // =========================================================================
  // 3. WORKER VERIFICATION STATE INTEGRITY & SAFETY
  // =========================================================================
  describe('3. Worker Verification State Protection', () => {
    it('prevents self-submitted qualifications from auto-elevating to verified_licensed', () => {
      // Simulating a self-registered worker submitting unverified credentials
      const unverifiedWorker: DetailedWorkerProfile = {
        id: 'worker_unverified_01',
        name: 'Self Registered Candidate',
        roleCategory: 'licensed_wireman',
        verificationStatus: 'verification_pending', // Must remain pending!
        experienceYears: 2,
        phone: '+91 99999 00000',
        locality: 'Indore',
        pincode: '452001',
        serviceRadiusKm: 10,
        isAvailableToday: true,
        hourlyRateInr: 250,
        rating: 4.5,
        reviewCount: 1,
        completedJobsCount: 0,
        selfDeclaredSkills: ['Self-Assessed: House wiring'],
        verifiedQualifications: [
          {
            id: 'cert_unverified',
            certificateName: 'Wireman Permit (Self-Entered)',
            certificateNumber: 'WM-2024-TEST',
            issuingAuthority: 'Self Declared',
            issueDate: '2024-01-01',
            isVerified: false, // NOT verified
          },
        ],
        isDemoProfile: true,
        disclaimer: 'Pending review',
      };

      const technicalRequest: ServiceRequest = {
        id: 'req_elec_01',
        householdName: 'Citizen House',
        householdPhone: '+91 98765 43210',
        locality: 'Indore',
        pincode: '452001',
        requestType: 'technical_electrical',
        title: '3-Phase Meter Distribution Box Sparking',
        description: 'High voltage issue',
        preferredDate: '2026-03-01',
        preferredTimeSlot: '10:00 - 12:00',
        status: 'pending',
        isTechnical: true,
        consentGiven: true,
        createdAt: '2026-02-28T10:00:00Z',
      };

      const [match] = matchWorkersForRequest(technicalRequest, [unverifiedWorker]);
      expect(match.isEligibleForTask).toBe(false);
      expect(match.ineligibilityReason).toContain('Verification Under Review');
    });
  });

  // =========================================================================
  // 4. PRIVACY MASKING & SENSITIVE FIELD REDACTION
  // =========================================================================
  describe('4. Privacy Masking & Sensitive Field Redaction', () => {
    it('masks phone numbers safely', () => {
      expect(maskPhone('+91 98270 55443')).toBe('+91 98*****43');
      expect(maskPhone('9827055443')).toBe('982705*****43');
      expect(maskPhone('')).toBe('+91 ***** *****');
      expect(maskPhone(undefined)).toBe('+91 ***** *****');
    });

    it('masks consumer numbers safely', () => {
      expect(maskConsumerNumber('MP-04-9843210')).toBe('MP****10');
      expect(maskConsumerNumber('102948576')).toBe('10****76');
      expect(maskConsumerNumber('123')).toBe('***123');
      expect(maskConsumerNumber('')).toBe('MP-***-LIVE');
    });

    it('masks personal names safely for export', () => {
      expect(maskName('Rameshwar Prasad Sharma')).toBe('Rameshwar P. S.');
      expect(maskName('Sunita Devi')).toBe('Sunita D.');
      expect(maskName('Aarav')).toBe('A***v');
      expect(maskName('')).toBe('Household Resident');
      expect(maskName(undefined)).toBe('Household Resident');
    });
  });

  // =========================================================================
  // 5. STORAGE INTEGRITY, DATA DELETION & ORPHAN CLEANUP
  // =========================================================================
  describe('5. Storage Data Deletion & Orphan Queue Purging', () => {
    it('fullReset completely clears all stores including userProfile, workers, and localStorage', async () => {
      await mockDb.put('bills', { id: 'bill_1', unitsConsumed: 200 });
      await mockDb.put('userProfile', { id: 'default_user', name: 'Private User' });
      await mockDb.put('workers', { id: 'worker_1', name: 'Technician' });
      await mockDb.put('offlineSyncQueue', { id: 'queue_1', entityType: 'bill' });
      mockLocalStorage.setItem('urja_saathi_requests', '[{"id":"req_1"}]');

      const result = await dbService.clearAllData({ fullReset: true });
      expect(result.success).toBe(true);
      expect(result.clearedStores).toContain('userProfile');
      expect(result.clearedStores).toContain('workers');
      expect(result.clearedStores).toContain('bills');
      expect(result.clearedStores).toContain('offlineSyncQueue');

      const remainingBills = await mockDb.getAll('bills');
      const remainingProfile = await mockDb.getAll('userProfile');
      const remainingWorkers = await mockDb.getAll('workers');

      expect(remainingBills).toHaveLength(0);
      expect(remainingProfile).toHaveLength(0);
      expect(remainingWorkers).toHaveLength(0);
      expect(mockLocalStorage.getItem('urja_saathi_requests')).toBeNull();
    });

    it('clearing bills purges orphaned bill items from offlineSyncQueue', async () => {
      await mockDb.put('bills', { id: 'bill_101', unitsConsumed: 300 });
      await mockDb.put('offlineSyncQueue', {
        id: 'q_bill_101',
        entityType: 'bill_record',
        payload: { id: 'bill_101' },
      });
      await mockDb.put('offlineSyncQueue', {
        id: 'q_req_202',
        entityType: 'service_request',
        payload: { id: 'req_202' },
      });

      await dbService.clearAllData({ bills: true });

      const remainingQueue: SyncQueueItem[] = await mockDb.getAll('offlineSyncQueue');
      expect(remainingQueue).toHaveLength(1);
      expect(remainingQueue[0].id).toBe('q_req_202');
    });

    it('storageService.deleteBill removes associated sync queue items', async () => {
      const bill: ElectricityBill = {
        id: 'bill_target_del',
        consumerNumber: 'N99999',
        billMonth: 'April 2026',
        billDate: '2026-04-01',
        unitsConsumed: 250,
        totalAmount: 1800,
        tariffRatePerUnit: 7.2,
        fixedCharges: 100,
        surcharges: 10,
        dueDate: '2026-04-20',
        isPeakSeason: false,
        source: 'manual',
        createdAt: '2026-04-02T00:00:00Z',
      };

      await mockDb.put('bills', bill);
      await mockDb.put('offlineSyncQueue', {
        id: 'q_bill_target_del',
        entityType: 'bill',
        idempotencyKey: 'idem_bill_target_del_create',
        payload: { id: bill.id },
      });

      await storageService.deleteBill(bill.id);

      const remainingBills = await mockDb.getAll('bills');
      expect(remainingBills).toHaveLength(0);

      const remainingQueue = await mockDb.getAll('offlineSyncQueue');
      expect(remainingQueue).toHaveLength(0);
    });

    it('sanitizeApplianceInventory safely filters malformed objects and clamps invalid values', () => {
      const malformedInput = [
        null,
        undefined,
        'not_an_object',
        { name: 'No Wattage' }, // Missing wattage -> rejected
        { name: 'Valid Fan', wattage: 75, quantity: -5, dailyUsageHours: 99 }, // Clamped
        { name: 'Huge Heater', wattage: 999999, quantity: 2 }, // Clamped
      ];

      const cleaned = sanitizeApplianceInventory(malformedInput);
      expect(cleaned).toHaveLength(2);

      // Fan: quantity clamped to >= 1, hours clamped to 24
      const fan = cleaned.find((a) => a.name === 'Valid Fan');
      expect(fan?.quantity).toBe(1);
      expect(fan?.dailyUsageHours).toBe(24);

      // Heater: wattage clamped to 15000 max
      const heater = cleaned.find((a) => a.name === 'Huge Heater');
      expect(heater?.wattage).toBe(15000);
    });
  });
});
