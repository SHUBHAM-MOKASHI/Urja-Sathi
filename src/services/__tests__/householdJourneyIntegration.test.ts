import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  dbService,
  setDbPromise,
  resetDbInMemoryFallbacks,
} from '../db';
import { storageService } from '../storageService';
import { syncService } from '../syncService';
import { runEnergySavingsEngine } from '../energyEngine';
import { runSolarFeasibilityEngine } from '../solarEngine';
import {
  getLiveAdminImpactData,
  calculateVerifiedConsumptionDrop,
} from '../impactTrackerService';
import {
  ElectricityBill,
  UserProfile,
  ApplianceInput,
  ServiceRequest,
  DetailedWorkerProfile,
  SolarAssessment,
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

// Polyfill window & CustomEvent if needed
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    dispatchEvent: vi.fn(() => true),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    CustomEvent: class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, params?: { detail: any }) {
        this.type = type;
        this.detail = params?.detail;
      }
    },
  };
} else {
  (globalThis as any).window.localStorage = mockLocalStorage;
}
(globalThis as any).localStorage = mockLocalStorage;

function createMockDatabase() {
  const stores: Record<string, Map<string, any>> = {
    bills: new Map(),
    userProfile: new Map(),
    cachedSettings: new Map(),
    quotations: new Map(),
    workers: new Map(),
    offlineSyncQueue: new Map(),
    assessments: new Map(),
    serviceRequests: new Map(),
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

describe('URJA SAATHI — End-to-End Household Journey Integration Tests', () => {
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
  // JOURNEY STAGE 1: Profile Creation & Confirmed Bill Ingestion
  // =========================================================================
  describe('Stage 1: Profile & Confirmed Bill Persistence', () => {
    it('stores user profile and enforces duplicate bill protection', async () => {
      const profile: UserProfile = {
        id: 'user_sharma_01',
        name: 'Sunil Sharma',
        pincode: '452001',
        state: 'Madhya Pradesh',
        discomName: 'MPPKVVCL',
        sanctionedLoadKw: 3,
        avgMonthlyBill: 2600,
        hasRooftopAccess: true,
        preferredLanguage: 'en',
      };

      await dbService.saveUserProfile(profile);
      const retrievedProfile = await dbService.getUserProfile();
      expect(retrievedProfile?.name).toBe('Sunil Sharma');
      expect(retrievedProfile?.hasRooftopAccess).toBe(true);

      const confirmedBill: ElectricityBill = {
        id: 'bill_oct_2024',
        consumerNumber: 'N3819200451',
        consumerName: 'Sunil Sharma',
        billMonth: 'October 2024',
        billDate: '2024-10-15',
        unitsConsumed: 320,
        totalAmount: 2560,
        tariffRatePerUnit: 7.5,
        fixedCharges: 160,
        surcharges: 25,
        dueDate: '2024-10-30',
        isPeakSeason: false,
        source: 'ocr_scan',
        userEdited: true,
        createdAt: '2024-10-16T10:00:00.000Z',
      };

      const saveResult = await storageService.saveConfirmedBill(confirmedBill);
      expect(saveResult.success).toBe(true);
      expect(saveResult.wasDuplicate).toBe(false);

      // Attempting to save the identical bill without override must be rejected
      const duplicateSaveResult = await storageService.saveConfirmedBill(confirmedBill, false);
      expect(duplicateSaveResult.success).toBe(false);
      expect(duplicateSaveResult.wasDuplicate).toBe(true);
      expect(duplicateSaveResult.warning).toBeDefined();

      const savedBills = await storageService.getSavedBills();
      expect(savedBills).toHaveLength(1);
      expect(savedBills[0].unitsConsumed).toBe(320);
    });
  });

  // =========================================================================
  // JOURNEY STAGE 2: Shared Appliance Inventory & Savings Planner Calculation
  // =========================================================================
  describe('Stage 2: Shared Appliance Inventory & Savings Engine', () => {
    it('synchronizes shared appliance inventory and avoids bill overwrites', async () => {
      const customInventory: ApplianceInput[] = [
        {
          id: 'app_bldc_fan',
          name: 'Ceiling Fan (BLDC)',
          category: 'ceiling_fan',
          wattage: 35,
          quantity: 3,
          dailyUsageHours: 10,
        },
        {
          id: 'app_refrigerator',
          name: '5-Star Inverter Refrigerator',
          category: 'refrigerator',
          wattage: 120,
          quantity: 1,
          dailyUsageHours: 24,
        },
      ];

      await storageService.saveApplianceInventory(customInventory);
      const loadedInventory = await storageService.getApplianceInventory();
      expect(loadedInventory).toHaveLength(2);
      expect(loadedInventory[0].wattage).toBe(35);

      // Run energy savings calculation using confirmed bill reading
      const engineResult = runEnergySavingsEngine({
        billedUnitsKwh: 320,
        billAmountInr: 2560,
        householdMembers: 4,
        userBudgetInr: 5000,
        appliances: loadedInventory,
      });

      expect(engineResult.status).toBe('success');
      expect(engineResult.monthlyBilledKwh).toBe(320);
      expect(engineResult.billedAmountInr).toBe(2560);
      expect(engineResult.potentialMonthlyKwhSavings).toBeGreaterThan(0);
      expect(engineResult.recommendations.length).toBeGreaterThan(0);

      // Ensure savings percentage is mathematically bounded (0 - 100%)
      const savingsPercent = Math.round(
        (engineResult.potentialMonthlyKwhSavings / engineResult.monthlyBilledKwh) * 100
      );
      expect(savingsPercent).toBeGreaterThanOrEqual(0);
      expect(savingsPercent).toBeLessThanOrEqual(100);
    });
  });

  // =========================================================================
  // JOURNEY STAGE 3: Solar Feasibility Assistant with Confirmed vs Unverified
  // =========================================================================
  describe('Stage 3: Solar Feasibility Calculation & Offline Assessment Sync', () => {
    it('calculates rooftop solar potential using confirmed bill units and enqueues offline assessment', async () => {
      // 320 kWh monthly consumption -> ~10.67 kWh daily requirement -> ~2.67 kW needed (~3 kW recommended)
      const solarResult = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 320,
        monthlyElectricityBillInr: 2560,
        usableRoofAreaSqFt: 350,
        roofOwnership: 'owned_individual',
      });

      expect(solarResult.recommendedCapacityKw).toBeGreaterThanOrEqual(2);
      expect(solarResult.recommendedCapacityKw).toBeLessThanOrEqual(4);
      expect(solarResult.financialAssistanceInr).toBe(78000); // PM Surya Ghar standard 3kW subsidy
      expect(solarResult.netInvestmentCostInr).toBe(solarResult.grossInvestmentCostInr - 78000);
      expect(solarResult.decision).toBe('explore_solar');

      // Now create and save a SolarAssessment with offline sync
      const assessment: SolarAssessment = {
        id: 'assessment_solar_01',
        createdAt: new Date().toISOString(),
        rooftopAreaSqFt: 350,
        recommendedSystemSizeKw: solarResult.recommendedCapacityKw,
        totalEstimatedCost: solarResult.grossInvestmentCostInr,
        centralSubsidyAmount: solarResult.financialAssistanceInr,
        netCostAfterSubsidy: solarResult.netInvestmentCostInr,
        annualGenerationKwh: solarResult.scenarios.central.annualGenerationKwh,
        annualSavingsInr: solarResult.scenarios.central.annualBillSavingsInr,
        co2ReductionTonsPerYear: solarResult.co2ReductionTonsPerYear,
        paybackPeriodYears: solarResult.scenarios.central.simplePaybackYears ?? 5,
        twentyFiveYearSavingsInr: solarResult.scenarios.central.twentyFiveYearCumulativeSavingsInr,
      };

      await dbService.saveAssessment(assessment);
      const savedAssessments = await dbService.getAllAssessments();
      expect(savedAssessments).toHaveLength(1);
      expect(savedAssessments[0].recommendedSystemSizeKw).toBe(solarResult.recommendedCapacityKw);

      // Enqueue to offline sync queue with idempotency
      const syncEnqueue1 = await syncService.enqueueOfflineAction(
        'solar_assessment',
        'create',
        assessment,
        `idem_solar_assessment_${assessment.id}`
      );
      expect(syncEnqueue1.wasDuplicate).toBe(false);

      // Duplicate enqueue must be caught by idempotency key
      const syncEnqueue2 = await syncService.enqueueOfflineAction(
        'solar_assessment',
        'create',
        assessment,
        `idem_solar_assessment_${assessment.id}`
      );
      expect(syncEnqueue2.wasDuplicate).toBe(true);
    });

    it('correctly handles non-rooftop households (tenants / no roof)', () => {
      const solarResult = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 320,
        monthlyElectricityBillInr: 2560,
        usableRoofAreaSqFt: 0,
        roofOwnership: 'tenant',
      });

      expect(solarResult.decision).toBe('save_without_solar');
      expect(solarResult.recommendedCapacityKw).toBe(0);
      expect(solarResult.decisionRationale.toLowerCase()).toContain('tenant');
    });
  });

  // =========================================================================
  // JOURNEY STAGE 4: Community Workforce Request & Completion Workflow
  // =========================================================================
  describe('Stage 4: Community Workforce Service Fulfillment', () => {
    it('creates, completes, and records payment for a verified wireman request', async () => {
      const liveWorker: DetailedWorkerProfile = {
        id: 'worker_mukesh_live',
        name: 'Mukesh Solanki',
        roleCategory: 'licensed_wireman',
        verificationStatus: 'verified_licensed',
        experienceYears: 7,
        phone: '+91 98260 11223',
        locality: 'Sudama Nagar, Indore',
        pincode: '452009',
        serviceRadiusKm: 15,
        isAvailableToday: true,
        hourlyRateInr: 300,
        rating: 4.9,
        reviewCount: 42,
        completedJobsCount: 112,
        selfDeclaredSkills: ['Load balancing', 'BLDC installation'],
        verifiedQualifications: [
          {
            id: 'cert_live_01',
            certificateName: 'Licensed Wireman Grade 1',
            certificateNumber: 'MP-ELB-2018-9921',
            issuingAuthority: 'MP Electrical Licensing Board',
            issueDate: '2018-04-12',
            isVerified: true,
          },
        ],
        isDemoProfile: false,
        disclaimer: 'Licensed electrical professional',
      };

      await dbService.saveDetailedWorkers([liveWorker]);
      const loadedWorkers = await dbService.getDetailedWorkers();
      expect(loadedWorkers).toHaveLength(1);
      expect(loadedWorkers[0].isDemoProfile).toBe(false);

      const serviceRequest: ServiceRequest = {
        id: 'req_bldc_install_01',
        householdName: 'Sunil Sharma',
        householdPhone: '+91 98270 55443',
        locality: 'Vijay Nagar, Indore',
        pincode: '452010',
        requestType: 'technical_electrical',
        title: '3x BLDC Fan Retrofit and Load Balancing',
        description: 'Installed 3 BLDC energy saving fans replacing 75W induction motors',
        preferredDate: '2024-10-20',
        preferredTimeSlot: 'Morning (10:00 AM - 1:00 PM)',
        assignedWorkerId: liveWorker.id,
        assignedWorkerName: liveWorker.name,
        status: 'completed',
        isTechnical: true,
        consentGiven: true,
        createdAt: '2024-10-18T09:00:00Z',
        completedAt: '2024-10-20T12:30:00Z',
        paymentRecordedInr: 600,
        paymentMethod: 'upi',
        isDemoRequest: false,
      };

      await dbService.saveServiceRequest(serviceRequest);
      const savedRequests = await dbService.getAllServiceRequests();
      expect(savedRequests).toHaveLength(1);
      expect(savedRequests[0].status).toBe('completed');
      expect(savedRequests[0].paymentRecordedInr).toBe(600);
    });
  });

  // =========================================================================
  // JOURNEY STAGE 5: Live Impact Tracker & Tripartite Segregation
  // =========================================================================
  describe('Stage 5: Live Impact Tracker Tripartite Audit Verification', () => {
    it('strictly separates measured, estimated, and potential impact without demo data contamination', async () => {
      // 1. Baseline bill: 320 kWh in October 2024
      const baselineBill: ElectricityBill = {
        id: 'bill_oct_2024',
        consumerNumber: 'N3819200451',
        consumerName: 'Sunil Sharma',
        billMonth: 'October 2024',
        billDate: '2024-10-15',
        unitsConsumed: 320,
        totalAmount: 2560,
        tariffRatePerUnit: 7.5,
        fixedCharges: 160,
        surcharges: 25,
        dueDate: '2024-10-30',
        isPeakSeason: false,
        source: 'ocr_scan',
        userEdited: true,
        createdAt: '2024-10-16T10:00:00.000Z',
      };

      // 2. Subsequent bill: 265 kWh in November 2024 (55 kWh drop after BLDC fan upgrade)
      const subsequentBill: ElectricityBill = {
        id: 'bill_nov_2024',
        consumerNumber: 'N3819200451',
        consumerName: 'Sunil Sharma',
        billMonth: 'November 2024',
        billDate: '2024-11-16',
        unitsConsumed: 265,
        totalAmount: 2120,
        tariffRatePerUnit: 7.5,
        fixedCharges: 160,
        surcharges: 20,
        dueDate: '2024-11-30',
        isPeakSeason: false,
        source: 'ocr_scan',
        userEdited: true,
        createdAt: '2024-11-17T10:00:00.000Z',
      };

      // 3. Completed service request with receipted payment
      const completedRequest: ServiceRequest = {
        id: 'req_bldc_install_01',
        householdName: 'Sunil Sharma',
        householdPhone: '+91 98270 55443',
        locality: 'Vijay Nagar',
        pincode: '452010',
        requestType: 'technical_electrical',
        title: 'BLDC Fan Installation',
        description: 'Installed 3 BLDC fans',
        preferredDate: '2024-10-20',
        preferredTimeSlot: '10:00 - 12:00',
        assignedWorkerId: 'worker_mukesh_live',
        assignedWorkerName: 'Mukesh Solanki',
        status: 'completed',
        isTechnical: true,
        consentGiven: true,
        createdAt: '2024-10-18T09:00:00Z',
        completedAt: '2024-10-20T12:30:00Z',
        paymentRecordedInr: 600,
        paymentMethod: 'upi',
        isDemoRequest: false,
      };

      const liveWorker: DetailedWorkerProfile = {
        id: 'worker_mukesh_live',
        name: 'Mukesh Solanki',
        roleCategory: 'licensed_wireman',
        verificationStatus: 'verified_licensed',
        experienceYears: 7,
        phone: '+91 98260 11223',
        locality: 'Sudama Nagar, Indore',
        pincode: '452009',
        serviceRadiusKm: 15,
        isAvailableToday: true,
        hourlyRateInr: 300,
        rating: 4.9,
        reviewCount: 42,
        completedJobsCount: 112,
        selfDeclaredSkills: ['Load balancing'],
        verifiedQualifications: [],
        isDemoProfile: false,
        disclaimer: 'Licensed wireman',
      };

      // Add a sample bill to test that live mode rejects sample contamination
      const sampleBill: ElectricityBill = {
        id: 'sample_bill_leak',
        consumerNumber: 'SAMPLE-LEAK-99',
        billMonth: 'August 2024',
        billDate: '2024-08-10',
        unitsConsumed: 9999,
        totalAmount: 99999,
        tariffRatePerUnit: 10,
        fixedCharges: 500,
        surcharges: 100,
        dueDate: '2024-08-25',
        isPeakSeason: true,
        source: 'sample', // Must be filtered out in live compilation!
        createdAt: '2024-08-11T00:00:00Z',
      };

      const bills = [baselineBill, subsequentBill, sampleBill];
      const requests = [completedRequest];
      const workers = [liveWorker];

      const liveDashboardData = getLiveAdminImpactData(
        bills,
        requests,
        workers,
        {
          id: 'user_01',
          name: 'Sunil Sharma',
          pincode: '452001',
          state: 'MP',
          hasRooftopAccess: true,
          preferredLanguage: 'en',
        },
        []
      );

      // Verify sample bills are excluded
      expect(liveDashboardData.isDemonstrationData).toBe(false);
      expect(liveDashboardData.householdFollowUpRecords).toHaveLength(1);
      expect(liveDashboardData.householdFollowUpRecords[0].householdId).not.toContain('SAMPLE-LEAK');

      // Verify empirical consumption drop
      const record = liveDashboardData.householdFollowUpRecords[0];
      expect(record.evidenceQuality).toBe('verified');
      expect(record.verifiedMonthlySavingsKwh).toBe(55); // 320 - 265 = 55 kWh
      expect(record.verifiedMonthlySavingsInr).toBe(440); // 2560 - 2120 = 440 INR

      // Verify tripartite metrics
      const { measuredImpact, estimatedImpact, potentialImpact } = liveDashboardData.tripartiteSummary;
      expect(measuredImpact.totalVerifiedSavingsKwhMonthly).toBe(55);
      expect(measuredImpact.totalVerifiedSavingsInrMonthly).toBe(440);
      expect(measuredImpact.verifiedWorkerEarningsInr).toBe(600);
      expect(measuredImpact.verifiedHouseholdsCount).toBe(1);

      // Ensure that potential impact does not inflate measured impact
      expect(measuredImpact.totalVerifiedSavingsKwhMonthly).not.toBe(
        estimatedImpact.totalEstimatedSavingsKwhMonthly + potentialImpact.totalPotentialSavingsKwhMonthly
      );
    });

    it('never treats a missing subsequent bill as zero consumption', () => {
      const baselineBill: ElectricityBill = {
        id: 'bill_base_only',
        consumerNumber: 'N11223344',
        consumerName: 'Rajesh Verma',
        billMonth: 'January 2026',
        billDate: '2026-01-15',
        unitsConsumed: 280,
        totalAmount: 2240,
        tariffRatePerUnit: 7.5,
        fixedCharges: 140,
        surcharges: 20,
        dueDate: '2026-01-30',
        isPeakSeason: false,
        source: 'ocr_scan',
        createdAt: '2026-01-16T10:00:00Z',
      };

      const dropResult = calculateVerifiedConsumptionDrop(baselineBill, undefined);
      expect(dropResult.isComparable).toBe(false);
      expect(dropResult.kwhDifference).toBe(0);
      expect(dropResult.subsequentKwh).toBe(0);
      expect(dropResult.reason).toContain('never treated as zero consumption');
    });

    it('enforces DPDP consent compliance: withheld consent households are excluded from impact metrics', () => {
      const baselineBill: ElectricityBill = {
        id: 'bill_withheld',
        consumerNumber: 'N99887766',
        consumerName: 'Private Consumer',
        billMonth: 'January 2026',
        billDate: '2026-01-15',
        unitsConsumed: 300,
        totalAmount: 2400,
        tariffRatePerUnit: 7.5,
        fixedCharges: 140,
        surcharges: 20,
        dueDate: '2026-01-30',
        isPeakSeason: false,
        source: 'ocr_scan',
        userEdited: true,
        createdAt: '2026-01-16T10:00:00Z',
      };

      const subsequentBill: ElectricityBill = {
        id: 'bill_withheld_sub',
        consumerNumber: 'N99887766',
        consumerName: 'Private Consumer',
        billMonth: 'February 2026',
        billDate: '2026-02-18',
        unitsConsumed: 220,
        totalAmount: 1760,
        tariffRatePerUnit: 7.5,
        fixedCharges: 140,
        surcharges: 20,
        dueDate: '2026-02-28',
        isPeakSeason: false,
        source: 'ocr_scan',
        userEdited: true,
        createdAt: '2026-02-19T10:00:00Z',
      };

      // Passed with householdConsent = false
      const liveDashboardData = getLiveAdminImpactData(
        [baselineBill, subsequentBill],
        [],
        [],
        undefined,
        [],
        false // Consent withheld!
      );

      expect(liveDashboardData.totalConsentingHouseholds).toBe(0);
      expect(liveDashboardData.tripartiteSummary.measuredImpact.totalVerifiedSavingsKwhMonthly).toBe(0);
      expect(liveDashboardData.tripartiteSummary.measuredImpact.verifiedHouseholdsCount).toBe(0);
    });
  });

  // =========================================================================
  // JOURNEY STAGE 6: Real-Time Event Dispatch & Cross-Module Cache Invalidation
  // =========================================================================
  describe('Stage 6: Real-Time Event Dispatch & Invalidation', () => {
    it('dispatches urja-bills-changed when bills are saved or deleted', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const bill: ElectricityBill = {
        id: 'bill_event_test',
        consumerNumber: 'N12345',
        billMonth: 'March 2026',
        billDate: '2026-03-01',
        unitsConsumed: 200,
        totalAmount: 1500,
        tariffRatePerUnit: 7.5,
        fixedCharges: 100,
        surcharges: 10,
        dueDate: '2026-03-20',
        isPeakSeason: false,
        source: 'manual',
        createdAt: '2026-03-02T00:00:00Z',
      };

      await storageService.saveConfirmedBill(bill);
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'urja-bills-changed',
          detail: expect.objectContaining({ action: 'save' }),
        })
      );

      await storageService.deleteBill(bill.id);
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'urja-bills-changed',
          detail: expect.objectContaining({ action: 'delete', billId: bill.id }),
        })
      );
    });
  });
});
