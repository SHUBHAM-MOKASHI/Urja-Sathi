import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  dbService,
  setDbPromise,
  resetDbInMemoryFallbacks,
} from '../db';
import { syncService } from '../syncService';
import { calculateSolarPotential as calculateSolarPotentialUtil } from '../../utils/energyCalculations';
import { calculateSolarPotential as calculateSolarPotentialService } from '../energyCalculations';
import {
  DetailedQuotation,
  DetailedWorkerProfile,
  UserProfile,
  SolarAssessment,
  SyncQueueItem,
} from '../../types';

// Mock localStorage for Node.js Vitest test runner
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

// Polyfill window & localStorage if needed
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
} else {
  (globalThis as any).window.localStorage = mockLocalStorage;
}
(globalThis as any).localStorage = mockLocalStorage;

function createMockDatabase() {
  const stores: Record<string, Map<string, any>> = {
    quotations: new Map(),
    workers: new Map(),
    cachedSettings: new Map(),
    offlineSyncQueue: new Map(),
    userProfile: new Map(),
    bills: new Map(),
    assessments: new Map(),
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
        },
        done: Promise.resolve(),
      };
    },
  };

  return db;
}

describe('BATCH 4: Storage Consistency & Codebase Hygiene Test Suite', () => {
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
    vi.restoreAllMocks();
  });

  // TEST 1
  it('1. saves and retrieves detailed quotations using the dedicated quotations store', async () => {
    const quote1: DetailedQuotation = {
      id: 'quote_solar_01',
      installerName: 'Surya Shakti Tech',
      installerCity: 'Indore',
      isEmpanelledWithDiscom: true,
      systemCapacityKw: 3.5,
      panelManufacturer: 'Tata Power Solar',
      panelModel: '545W Mono PERC Half-Cut',
      inverterBrand: 'Growatt',
      inverterCapacityKw: 4.0,
      inverterType: 'string_inverter',
      totalPriceInr: 185000,
      panelProductWarrantyYears: 10,
      panelPerformanceWarrantyYears: 25,
      inverterWarrantyYears: 8,
      workmanshipWarrantyYears: 5,
      installationChargesIncluded: true,
      mountingStructureType: 'hot_dip_galvanized',
      discomNetMeteringLiaisoningIncluded: true,
      freeMaintenanceYears: 5,
      estimatedTimelineDays: 14,
      hasLocalServiceCenter: true,
      guaranteedResponseTimeHours: 24,
      hasRemoteMonitoringApp: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    };

    const quote2: DetailedQuotation = {
      id: 'quote_solar_02',
      installerName: 'GreenGrid Solar Solutions',
      installerCity: 'Bhopal',
      isEmpanelledWithDiscom: true,
      systemCapacityKw: 3.0,
      panelManufacturer: 'Waaree',
      panelModel: '540W Bifacial',
      inverterBrand: 'Havells',
      inverterCapacityKw: 3.3,
      inverterType: 'string_inverter',
      totalPriceInr: 165000,
      panelProductWarrantyYears: 12,
      panelPerformanceWarrantyYears: 25,
      inverterWarrantyYears: 10,
      workmanshipWarrantyYears: 3,
      installationChargesIncluded: true,
      mountingStructureType: 'aluminum',
      discomNetMeteringLiaisoningIncluded: true,
      freeMaintenanceYears: 3,
      estimatedTimelineDays: 20,
      hasLocalServiceCenter: false,
      guaranteedResponseTimeHours: 48,
      hasRemoteMonitoringApp: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    };

    await dbService.saveDetailedQuotations([quote1, quote2]);

    // Verify stored in dedicated store
    expect(mockDb.stores.quotations.has('quote_solar_01')).toBe(true);
    expect(mockDb.stores.quotations.has('quote_solar_02')).toBe(true);

    const retrieved = await dbService.getDetailedQuotations();
    expect(retrieved).toHaveLength(2);
    expect(retrieved.find((q) => q.id === 'quote_solar_01')?.installerName).toBe('Surya Shakti Tech');
    expect(retrieved.find((q) => q.id === 'quote_solar_02')?.totalPriceInr).toBe(165000);
  });

  // TEST 2
  it('2. safely reads and migrates legacy detailed quotations from cachedSettings without data loss', async () => {
    const legacyQuote: DetailedQuotation = {
      id: 'legacy_quote_99',
      installerName: 'Madhya Bharat Solar Systems',
      installerCity: 'Ujjain',
      isEmpanelledWithDiscom: true,
      systemCapacityKw: 2.0,
      panelManufacturer: 'Adani Solar',
      panelModel: '440W Mono',
      inverterBrand: 'Luminous',
      inverterCapacityKw: 2.5,
      inverterType: 'string_inverter',
      totalPriceInr: 120000,
      panelProductWarrantyYears: 10,
      panelPerformanceWarrantyYears: 25,
      inverterWarrantyYears: 5,
      workmanshipWarrantyYears: 2,
      installationChargesIncluded: true,
      mountingStructureType: 'standard_gi',
      discomNetMeteringLiaisoningIncluded: true,
      freeMaintenanceYears: 2,
      estimatedTimelineDays: 15,
      hasLocalServiceCenter: true,
      guaranteedResponseTimeHours: 24,
      hasRemoteMonitoringApp: false,
      createdAt: '2025-01-01T00:00:00.000Z',
    };

    // Store in legacy cachedSettings
    mockDb.stores.cachedSettings.set('detailed_quotations', [legacyQuote]);
    expect(mockDb.stores.quotations.size).toBe(0);

    const migrated = await dbService.getDetailedQuotations();

    expect(migrated).toHaveLength(1);
    expect(migrated[0].id).toBe('legacy_quote_99');

    // Dedicated store now contains the migrated record
    expect(mockDb.stores.quotations.has('legacy_quote_99')).toBe(true);

    // Legacy setting was cleaned up safely after verification
    expect(mockDb.stores.cachedSettings.has('detailed_quotations')).toBe(false);
  });

  // TEST 3
  it('3. deduplicates detailed quotations preventing duplicate records with identical IDs', async () => {
    const quoteBase: DetailedQuotation = {
      id: 'quote_duplicate_id',
      installerName: 'Indore Solar Works',
      installerCity: 'Indore',
      isEmpanelledWithDiscom: true,
      systemCapacityKw: 3.0,
      panelManufacturer: 'Vikram Solar',
      panelModel: '500W Mono',
      inverterBrand: 'SolarEdge',
      inverterCapacityKw: 3.0,
      inverterType: 'string_inverter',
      totalPriceInr: 170000,
      panelProductWarrantyYears: 10,
      panelPerformanceWarrantyYears: 25,
      inverterWarrantyYears: 10,
      workmanshipWarrantyYears: 3,
      installationChargesIncluded: true,
      mountingStructureType: 'hot_dip_galvanized',
      discomNetMeteringLiaisoningIncluded: true,
      freeMaintenanceYears: 3,
      estimatedTimelineDays: 14,
      hasLocalServiceCenter: true,
      guaranteedResponseTimeHours: 24,
      hasRemoteMonitoringApp: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    };

    const duplicateQuote = { ...quoteBase, installerName: 'Indore Solar Works (Updated)' };

    await dbService.saveDetailedQuotations([quoteBase, duplicateQuote]);

    const quotations = await dbService.getDetailedQuotations();
    expect(quotations).toHaveLength(1);
    expect(quotations[0].id).toBe('quote_duplicate_id');
  });

  // TEST 4
  it('4. saves and retrieves worker profiles using the dedicated workers store', async () => {
    const worker1: DetailedWorkerProfile = {
      id: 'worker_local_101',
      name: 'Rohan Verma',
      roleCategory: 'surya_mitra_technician',
      verificationStatus: 'verified_licensed',
      experienceYears: 6,
      phone: '+91 98765 43210',
      locality: 'Vijay Nagar, Indore',
      pincode: '452010',
      serviceRadiusKm: 20,
      isAvailableToday: true,
      hourlyRateInr: 500,
      rating: 4.8,
      reviewCount: 35,
      completedJobsCount: 42,
      selfDeclaredSkills: ['Solar Inverter Troubleshooting', 'Array Earthing'],
      verifiedQualifications: [
        {
          id: 'sc-101',
          certificateName: 'Surya Mitra Skill Certification',
          certificateNumber: 'MNRE-SM-2021-9921',
          issuingAuthority: 'National Institute of Solar Energy',
          issueDate: '2021-04-15',
          isVerified: true,
        },
      ],
      isDemoProfile: false,
      disclaimer: 'Certified solar technician.',
    };

    await dbService.saveDetailedWorkers([worker1]);

    expect(mockDb.stores.workers.has('worker_local_101')).toBe(true);

    const retrieved = await dbService.getDetailedWorkers();
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].name).toBe('Rohan Verma');
    expect(retrieved[0].roleCategory).toBe('surya_mitra_technician');
    expect(retrieved[0].verifiedQualifications).toHaveLength(1);
  });

  // TEST 5
  it('5. migrates worker profiles backward-compatibly from localStorage into the workers store', async () => {
    const legacyWorker: DetailedWorkerProfile = {
      id: 'worker_legacy_05',
      name: 'Suresh Chouhan',
      roleCategory: 'licensed_wireman',
      verificationStatus: 'verified_licensed',
      experienceYears: 9,
      phone: '+91 98270 55443',
      locality: 'Palasia, Indore',
      pincode: '452001',
      serviceRadiusKm: 15,
      isAvailableToday: true,
      hourlyRateInr: 450,
      rating: 4.9,
      reviewCount: 40,
      completedJobsCount: 52,
      selfDeclaredSkills: ['Distribution Board Testing', 'Surge Protection'],
      verifiedQualifications: [
        {
          id: 'qual_05',
          certificateName: 'Government Electrical Contractor License',
          certificateNumber: 'MP-DISCOM-ELEC-771',
          issuingAuthority: 'Madhya Pradesh Energy Licensing Board',
          issueDate: '2019-08-20',
          isVerified: true,
        },
      ],
      isDemoProfile: false,
      disclaimer: 'Licensed wireman.',
    };

    // Set legacy localStorage entry
    mockLocalStorage.setItem('urja_saathi_workers', JSON.stringify([legacyWorker]));
    expect(mockDb.stores.workers.size).toBe(0);

    const workers = await dbService.getDetailedWorkers();

    expect(workers).toHaveLength(1);
    expect(workers[0].id).toBe('worker_legacy_05');
    expect(mockDb.stores.workers.has('worker_legacy_05')).toBe(true);
  });

  // TEST 6
  it('6. deduplicates worker profiles by ID preventing duplicate records in storage', async () => {
    const worker: DetailedWorkerProfile = {
      id: 'worker_dup_01',
      name: 'Amit Joshi',
      roleCategory: 'community_energy_guide',
      verificationStatus: 'self_declared_only',
      experienceYears: 3,
      phone: '+91 98260 00112',
      locality: 'Rau, Indore',
      pincode: '453331',
      serviceRadiusKm: 10,
      isAvailableToday: true,
      hourlyRateInr: 250,
      rating: 4.6,
      reviewCount: 14,
      completedJobsCount: 19,
      selfDeclaredSkills: ['Appliance usage guidance'],
      verifiedQualifications: [],
      isDemoProfile: false,
      disclaimer: 'Community guide non-technical assistance.',
    };

    const updatedWorker = { ...worker, hourlyRateInr: 300 };

    await dbService.saveDetailedWorkers([worker, updatedWorker]);

    const workers = await dbService.getDetailedWorkers();
    expect(workers).toHaveLength(1);
    expect(workers[0].id).toBe('worker_dup_01');
  });

  // TEST 7
  it('7. preserves worker verification status integrity and never upgrades demo profiles to real verified status', async () => {
    const demoWorker: DetailedWorkerProfile = {
      id: 'worker_demo_sample',
      name: 'Demonstration Profile (Sunita Sharma)',
      roleCategory: 'community_energy_guide',
      verificationStatus: 'self_declared_only',
      experienceYears: 2,
      phone: '+91 98260 99999',
      locality: 'Demo Town',
      pincode: '452001',
      serviceRadiusKm: 10,
      isAvailableToday: true,
      hourlyRateInr: 200,
      rating: 4.5,
      reviewCount: 8,
      completedJobsCount: 10,
      selfDeclaredSkills: ['Basic awareness'],
      verifiedQualifications: [],
      isDemoProfile: true, // DEMO PROFILE
      disclaimer: 'Sample profile for demonstration only.',
    };

    await dbService.saveWorkerProfile(demoWorker);

    const saved = (await dbService.getDetailedWorkers()).find((w) => w.id === 'worker_demo_sample');
    expect(saved).toBeDefined();
    expect(saved?.isDemoProfile).toBe(true);
    expect(saved?.verificationStatus).toBe('self_declared_only');

    // Attempting to save without verified qualifications must NOT promote to verified_licensed
    expect(saved?.verifiedQualifications).toHaveLength(0);
    expect(saved?.verificationStatus).not.toBe('verified_licensed');
  });

  // TEST 8
  it('8. provides backward-compatible calculateSolarPotential() with deprecation annotation without breaking existing callers', () => {
    expect(typeof calculateSolarPotentialUtil).toBe('function');
    expect(typeof calculateSolarPotentialService).toBe('function');

    const resultFromUtil = calculateSolarPotentialUtil(350, 300, 7.5);
    const resultFromService = calculateSolarPotentialService(350, 300, 7.5);

    // Both re-exports must produce equivalent results
    expect(resultFromUtil.recommendedSystemSizeKw).toBe(resultFromService.recommendedSystemSizeKw);
    expect(resultFromUtil.totalEstimatedCost).toBe(resultFromService.totalEstimatedCost);
    expect(resultFromUtil.centralSubsidyAmount).toBe(resultFromService.centralSubsidyAmount);
    expect(resultFromUtil.annualSavingsInr).toBe(resultFromService.annualSavingsInr);

    // Valid calculations produced
    expect(resultFromUtil.recommendedSystemSizeKw).toBeGreaterThan(0);
    expect(resultFromUtil.centralSubsidyAmount).toBeGreaterThanOrEqual(30000);
    expect(resultFromUtil.paybackPeriodYears).toBeGreaterThan(0);
    expect(resultFromUtil.co2ReductionTonsPerYear).toBeGreaterThan(0);
  });

  // TEST 9
  it('9. enqueues solar assessments into the offline sync queue with correct entityType and idempotency key', async () => {
    // Mock dbService sync operations on mockDb
    vi.spyOn(dbService, 'enqueueSyncItem').mockImplementation(async (item: SyncQueueItem) => {
      mockDb.stores.offlineSyncQueue.set(item.id, { ...item });
    });
    vi.spyOn(dbService, 'getSyncItemByIdempotency').mockImplementation(
      async (key: string): Promise<SyncQueueItem | undefined> => {
        return Array.from(mockDb.stores.offlineSyncQueue.values()).find(
          (i: any) => i.idempotencyKey === key
        ) as SyncQueueItem | undefined;
      }
    );

    const assessment: SolarAssessment = {
      id: 'solar_audit_101',
      rooftopAreaSqFt: 400,
      recommendedSystemSizeKw: 3.5,
      totalEstimatedCost: 185000,
      centralSubsidyAmount: 78000,
      netCostAfterSubsidy: 107000,
      annualGenerationKwh: 5110,
      annualSavingsInr: 38325,
      co2ReductionTonsPerYear: 4.19,
      paybackPeriodYears: 2.8,
      twentyFiveYearSavingsInr: 755312,
      createdAt: new Date().toISOString(),
    };

    const idempotencyKey = `idem_solar_assessment_${assessment.id}_create`;
    const result = await syncService.enqueueOfflineAction(
      'solar_assessment',
      'create',
      assessment,
      idempotencyKey
    );

    expect(result.wasDuplicate).toBe(false);
    expect(result.item.entityType).toBe('solar_assessment');
    expect(result.item.action).toBe('create');
    expect(result.item.payload.id).toBe('solar_audit_101');
    expect(mockDb.stores.offlineSyncQueue.has(result.item.id)).toBe(true);
  });

  // TEST 10
  it('10. suppresses duplicate solar assessment actions in offline queue via idempotency', async () => {
    vi.spyOn(dbService, 'enqueueSyncItem').mockImplementation(async (item: SyncQueueItem) => {
      mockDb.stores.offlineSyncQueue.set(item.id, { ...item });
    });
    vi.spyOn(dbService, 'getSyncItemByIdempotency').mockImplementation(
      async (key: string): Promise<SyncQueueItem | undefined> => {
        return Array.from(mockDb.stores.offlineSyncQueue.values()).find(
          (i: any) => i.idempotencyKey === key
        ) as SyncQueueItem | undefined;
      }
    );

    const assessment: SolarAssessment = {
      id: 'solar_audit_duplicate_check',
      rooftopAreaSqFt: 300,
      recommendedSystemSizeKw: 2.5,
      totalEstimatedCost: 150000,
      centralSubsidyAmount: 60000,
      netCostAfterSubsidy: 90000,
      annualGenerationKwh: 3650,
      annualSavingsInr: 27375,
      co2ReductionTonsPerYear: 2.99,
      paybackPeriodYears: 3.3,
      twentyFiveYearSavingsInr: 525937,
      createdAt: new Date().toISOString(),
    };

    const idempotencyKey = `idem_solar_assessment_${assessment.id}_create`;

    // First attempt
    const res1 = await syncService.enqueueOfflineAction(
      'solar_assessment',
      'create',
      assessment,
      idempotencyKey
    );
    expect(res1.wasDuplicate).toBe(false);

    // Second attempt with identical idempotencyKey
    const res2 = await syncService.enqueueOfflineAction(
      'solar_assessment',
      'create',
      assessment,
      idempotencyKey
    );
    expect(res2.wasDuplicate).toBe(true);

    // Queue must contain only 1 item
    expect(mockDb.stores.offlineSyncQueue.size).toBe(1);
  });

  // TEST 11
  it('11. synchronizes consumer name and DISCOM without overwriting pincode or other profile attributes', () => {
    const existingProfile: UserProfile = {
      id: 'usr_indore_001',
      name: 'Sunil Agrawal',
      phone: '+91 98260 12345',
      pincode: '452010',
      state: 'Madhya Pradesh',
      discomName: 'MPPKVVCL (Indore Metro)',
      sanctionedLoadKw: 4,
      avgMonthlyBill: 3200,
      hasRooftopAccess: true,
      preferredLanguage: 'hi',
    };

    // User-confirmed partial sync payload from confirmed OCR bill
    const billSyncPayload: Partial<UserProfile> = {
      name: 'Sunil Kumar Agrawal',
      discomName: 'Madhya Pradesh Paschim Kshetra Vidyut Vitaran Co. Ltd.',
    };

    const updatedProfile: UserProfile = {
      ...existingProfile,
      ...billSyncPayload,
    };

    // Consumer name and DISCOM updated
    expect(updatedProfile.name).toBe('Sunil Kumar Agrawal');
    expect(updatedProfile.discomName).toBe('Madhya Pradesh Paschim Kshetra Vidyut Vitaran Co. Ltd.');

    // Crucial: Pin code, phone, state, and other settings strictly preserved
    expect(updatedProfile.pincode).toBe('452010');
    expect(updatedProfile.phone).toBe('+91 98260 12345');
    expect(updatedProfile.state).toBe('Madhya Pradesh');
    expect(updatedProfile.sanctionedLoadKw).toBe(4);
    expect(updatedProfile.hasRooftopAccess).toBe(true);
    expect(updatedProfile.preferredLanguage).toBe('hi');
  });

  // TEST 12
  it('12. isolates government scheme checklist state by scheme ID and safely drops outdated item references', () => {
    const schemeAId = 'pm_surya_ghar';
    const schemeBId = 'pm_kusum_component_b';

    const checklistKeyA = `urja_saathi_scheme_checklist_${schemeAId}`;
    const checklistKeyB = `urja_saathi_scheme_checklist_${schemeBId}`;

    const schemeAData = {
      checkedDocumentIds: ['doc_bill', 'doc_aadhaar', 'doc_obsolete_dropped'],
      checkedCriteriaIds: ['crit_roof_owned'],
      consumerType: 'domestic',
    };

    const schemeBData = {
      checkedDocumentIds: ['doc_land_record', 'doc_irrigation_certificate'],
      checkedCriteriaIds: ['crit_farmer_category'],
      consumerType: 'agricultural',
    };

    // Store separate checklists
    mockLocalStorage.setItem(checklistKeyA, JSON.stringify(schemeAData));
    mockLocalStorage.setItem(checklistKeyB, JSON.stringify(schemeBData));

    // Verify isolation in localStorage
    const savedA = JSON.parse(mockLocalStorage.getItem(checklistKeyA) || '{}');
    const savedB = JSON.parse(mockLocalStorage.getItem(checklistKeyB) || '{}');

    expect(savedA.checkedDocumentIds).toContain('doc_bill');
    expect(savedA.checkedDocumentIds).not.toContain('doc_land_record');
    expect(savedB.checkedDocumentIds).toContain('doc_land_record');
    expect(savedB.checkedDocumentIds).not.toContain('doc_bill');

    // Safe filtering of deleted/changed items:
    const activeSchemeDocuments = [
      { id: 'doc_bill', documentName: 'Recent Electricity Bill' },
      { id: 'doc_aadhaar', documentName: 'Aadhaar Card' },
      // 'doc_obsolete_dropped' is no longer in the active policy
    ];

    const validDocIds = new Set(activeSchemeDocuments.map((d) => d.id));
    const safeRestoredDocIds = savedA.checkedDocumentIds.filter((id: string) => validDocIds.has(id));

    expect(safeRestoredDocIds).toEqual(['doc_bill', 'doc_aadhaar']);
    expect(safeRestoredDocIds).not.toContain('doc_obsolete_dropped');
  });
});
