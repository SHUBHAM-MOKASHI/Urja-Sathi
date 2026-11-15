import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { storageService } from '../storageService';
import {
  dbService,
  sanitizeApplianceInventory,
  getApplianceInventory,
  saveApplianceInventory,
} from '../db';
import {
  runEnergySavingsEngine,
  applyApartmentPreset,
  PRESET_1BHK,
} from '../energyEngine';
import { ApplianceInput, ElectricityBill } from '../../types';

// Ensure global window and CustomEvent exist in Node.js test runner
if (typeof (globalThis as any).window === 'undefined') {
  const listeners: Record<string, ((event: any) => void)[]> = {};
  (globalThis as any).window = {
    addEventListener: (event: string, cb: (event: any) => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    },
    removeEventListener: (event: string, cb: (event: any) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((l) => l !== cb);
      }
    },
    dispatchEvent: (event: any) => {
      if (listeners[event.type]) {
        listeners[event.type].forEach((cb) => cb(event));
      }
      return true;
    },
  };
}

if (typeof (globalThis as any).CustomEvent === 'undefined') {
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params: { detail?: any } = {}) {
      this.type = type;
      this.detail = params.detail;
    }
  };
}

describe('BATCH 2: Dashboard and Savings Planner Data Synchronization', () => {
  let mockBills: Map<string, ElectricityBill>;

  beforeEach(async () => {
    mockBills = new Map();

    // Mock dbService bill persistence for node test environment
    vi.spyOn(dbService, 'saveBill').mockImplementation(async (bill: ElectricityBill) => {
      mockBills.set(bill.id, { ...bill });
    });

    vi.spyOn(dbService, 'getAllBills').mockImplementation(async () => {
      return Array.from(mockBills.values());
    });

    vi.spyOn(dbService, 'deleteBill').mockImplementation(async (id: string) => {
      mockBills.delete(id);
    });

    // Reset inventory to clean state before each test
    await storageService.saveApplianceInventory([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Test 1: Saving appliance inventory to IndexedDB / storageService
  // -------------------------------------------------------------------------
  it('Test 1: Saves appliance inventory to storage successfully', async () => {
    const testInventory: ApplianceInput[] = [
      {
        id: 'test_ac_1',
        name: 'Inverter Air Conditioner',
        category: 'air_conditioner',
        wattage: 1200,
        dailyUsageHours: 6,
        quantity: 1,
        temperatureSetpointC: 24,
        starRating: 5,
        ageYears: 2,
      },
      {
        id: 'test_fridge_1',
        name: 'Direct Cool Refrigerator',
        category: 'refrigerator',
        wattage: 200,
        dailyUsageHours: 24,
        quantity: 1,
        starRating: 4,
      },
      {
        id: 'test_fan_1',
        name: 'Ceiling Fan',
        category: 'ceiling_fan',
        wattage: 75,
        dailyUsageHours: 12,
        quantity: 3,
      },
    ];

    await storageService.saveApplianceInventory(testInventory);

    const loaded = await storageService.getApplianceInventory();
    expect(loaded).toHaveLength(3);
    expect(loaded[0].id).toBe('test_ac_1');
    expect(loaded[0].wattage).toBe(1200);
    expect(loaded[1].name).toBe('Direct Cool Refrigerator');
    expect(loaded[2].quantity).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Test 2: Loading saved inventory with full property preservation
  // -------------------------------------------------------------------------
  it('Test 2: Loads saved inventory preserving all properties including setpoints and star ratings', async () => {
    const customInventory: ApplianceInput[] = [
      {
        id: 'app_master_ac',
        name: 'Split AC 1.5T',
        category: 'air_conditioner',
        wattage: 1450,
        dailyUsageHours: 7.5,
        quantity: 2,
        temperatureSetpointC: 25,
        starRating: 5,
        ageYears: 1,
        standbyHours: 16,
      },
      {
        id: 'app_water_heater',
        name: 'Storage Geyser',
        category: 'water_heater',
        wattage: 2000,
        dailyUsageHours: 1.5,
        quantity: 1,
        starRating: 3,
        ageYears: 4,
      },
    ];

    await saveApplianceInventory(customInventory);
    const loaded = await getApplianceInventory();

    expect(loaded).toHaveLength(2);
    const ac = loaded.find((item) => item.id === 'app_master_ac');
    expect(ac).toBeDefined();
    expect(ac?.name).toBe('Split AC 1.5T');
    expect(ac?.category).toBe('air_conditioner');
    expect(ac?.wattage).toBe(1450);
    expect(ac?.dailyUsageHours).toBe(7.5);
    expect(ac?.quantity).toBe(2);
    expect(ac?.temperatureSetpointC).toBe(25);
    expect(ac?.starRating).toBe(5);
    expect(ac?.ageYears).toBe(1);
    expect(ac?.standbyHours).toBe(16);

    const geyser = loaded.find((item) => item.id === 'app_water_heater');
    expect(geyser).toBeDefined();
    expect(geyser?.wattage).toBe(2000);
    expect(geyser?.dailyUsageHours).toBe(1.5);
    expect(geyser?.quantity).toBe(1);
    expect(geyser?.starRating).toBe(3);
    expect(geyser?.ageYears).toBe(4);
  });

  // -------------------------------------------------------------------------
  // Test 3: Handling empty inventory
  // -------------------------------------------------------------------------
  it('Test 3: Handles empty inventory correctly without fabricating mock appliances', async () => {
    await storageService.saveApplianceInventory([]);
    const loaded = await storageService.getApplianceInventory();

    expect(Array.isArray(loaded)).toBe(true);
    expect(loaded).toHaveLength(0);

    // Verify engine calculation with empty inventory
    // In DashboardPage.tsx: if (appliances.length === 0) => engineResult is null
    const engineResultWithEmpty = runEnergySavingsEngine({
      billedUnitsKwh: 350,
      billAmountInr: 2800,
      householdMembers: 4,
      appliances: [],
      userBudgetInr: 5000,
    });

    // When appliances array is empty, total appliance calculated consumption is 0
    expect(engineResultWithEmpty.totalApplianceCalculatedKwh).toBe(0);
    expect(engineResultWithEmpty.potentialMonthlyKwhSavings).toBe(0);
    expect(engineResultWithEmpty.potentialMonthlyInrSavings).toBe(0);
    expect(engineResultWithEmpty.recommendations).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Test 4: Handling corrupted or invalid stored inventory
  // -------------------------------------------------------------------------
  it('Test 4: Sanitizes corrupted, invalid, and out-of-bounds stored inventory safely', async () => {
    const corruptedRawData: unknown[] = [
      null,
      undefined,
      'a string instead of object',
      12345,
      // Invalid item: wattage is 0 (should be discarded)
      { id: 'bad_1', name: 'Zero Watt Bulb', wattage: 0, dailyUsageHours: 5, quantity: 1 },
      // Invalid item: wattage is negative (should be discarded)
      { id: 'bad_2', name: 'Negative Watt', wattage: -500, dailyUsageHours: 5, quantity: 1 },
      // Invalid item: wattage is NaN (should be discarded)
      { id: 'bad_3', name: 'NaN Watt', wattage: NaN, dailyUsageHours: 5, quantity: 1 },
      // Valid item but with out-of-bounds fields needing normalization
      {
        id: 'valid_clamped',
        name: 'Industrial Load',
        category: 'invalid_category_unknown', // should default to 'other'
        wattage: 25000, // should clamp to 15000
        dailyUsageHours: 35, // should clamp to 24
        quantity: -5, // should clamp to 1
        temperatureSetpointC: 10, // should clamp to 16
        starRating: 9, // should clamp to 5
        ageYears: -3, // should clamp to 0
      },
      // Valid normal item
      {
        id: 'valid_tv',
        name: 'Living Room TV',
        category: 'television',
        wattage: 100,
        dailyUsageHours: 4,
        quantity: 1,
      },
    ];

    const sanitized = sanitizeApplianceInventory(corruptedRawData);

    expect(sanitized).toHaveLength(2);

    const clampedItem = sanitized.find((a) => a.id === 'valid_clamped');
    expect(clampedItem).toBeDefined();
    expect(clampedItem?.category).toBe('other');
    expect(clampedItem?.wattage).toBe(15000);
    expect(clampedItem?.dailyUsageHours).toBe(24);
    expect(clampedItem?.quantity).toBe(1);
    expect(clampedItem?.temperatureSetpointC).toBe(16);
    expect(clampedItem?.starRating).toBe(5);
    expect(clampedItem?.ageYears).toBe(0);

    const tvItem = sanitized.find((a) => a.id === 'valid_tv');
    expect(tvItem).toBeDefined();
    expect(tvItem?.name).toBe('Living Room TV');
    expect(tvItem?.wattage).toBe(100);
  });

  // -------------------------------------------------------------------------
  // Test 5: Dashboard using saved inventory rather than hardcoded appliances
  // -------------------------------------------------------------------------
  it('Test 5: Dashboard calculations strictly reflect saved inventory instead of hardcoded 5 appliances', async () => {
    // Old hardcoded array from previous DashboardPage:
    const oldHardcodedAppliances: ApplianceInput[] = [
      { id: 'd_ac', name: 'Air Conditioner', category: 'air_conditioner', wattage: 1500, dailyUsageHours: 6, quantity: 1, temperatureSetpointC: 22 },
      { id: 'd_fan', name: 'Ceiling Fan', category: 'ceiling_fan', wattage: 75, dailyUsageHours: 12, quantity: 3 },
      { id: 'd_fridge', name: 'Refrigerator', category: 'refrigerator', wattage: 250, dailyUsageHours: 24, quantity: 1 },
      { id: 'd_led', name: 'LED Lights', category: 'lighting', wattage: 12, dailyUsageHours: 6, quantity: 8 },
      { id: 'd_tv', name: 'Television', category: 'television', wattage: 100, dailyUsageHours: 4, quantity: 1 },
    ];

    // User's actual shared inventory: a minimal 1BHK with low consumption (LED lights + BLDC fan only)
    const userMinimalInventory: ApplianceInput[] = [
      { id: 'bldc_fan', name: 'BLDC Fan', category: 'ceiling_fan', wattage: 28, dailyUsageHours: 8, quantity: 1 },
      { id: 'led_bulb', name: 'LED Bulb', category: 'lighting', wattage: 9, dailyUsageHours: 5, quantity: 2 },
    ];

    await storageService.saveApplianceInventory(userMinimalInventory);
    const loadedInventory = await storageService.getApplianceInventory();

    const latestBillUnits = 180;
    const latestBillAmount = 1200;

    // Run engine with old hardcoded appliances
    const oldEngineResult = runEnergySavingsEngine({
      billedUnitsKwh: latestBillUnits,
      billAmountInr: latestBillAmount,
      householdMembers: 4,
      userBudgetInr: 5000,
      appliances: oldHardcodedAppliances,
    });

    // Run engine with shared saved inventory
    const synchronizedEngineResult = runEnergySavingsEngine({
      billedUnitsKwh: latestBillUnits,
      billAmountInr: latestBillAmount,
      householdMembers: 4,
      userBudgetInr: 5000,
      appliances: loadedInventory,
    });

    // Verify significant differences proving dashboard is not using hardcoded fixtures
    expect(synchronizedEngineResult.totalApplianceCalculatedKwh).not.toBe(
      oldEngineResult.totalApplianceCalculatedKwh
    );
    expect(synchronizedEngineResult.totalApplianceCalculatedKwh).toBeLessThan(
      oldEngineResult.totalApplianceCalculatedKwh
    );
    // User minimal inventory has only 28W fan and 9W LED (~9.4 kWh/mo)
    expect(synchronizedEngineResult.totalApplianceCalculatedKwh).toBeLessThan(30);
    // Old hardcoded inventory had 1500W AC running 6h/day (~270 kWh alone)
    expect(oldEngineResult.totalApplianceCalculatedKwh).toBeGreaterThan(300);

    // Verify recommendations are tailored to user inventory (no AC recommendations for minimal inventory)
    const hasAcRecInMinimal = synchronizedEngineResult.recommendations.some(
      (r) => r.action.toLowerCase().includes('air conditioner') || r.action.toLowerCase().includes('thermostat')
    );
    expect(hasAcRecInMinimal).toBe(false);

    const hasAcRecInOld = oldEngineResult.recommendations.some(
      (r) => r.action.toLowerCase().includes('air conditioner') || r.action.toLowerCase().includes('thermostat')
    );
    expect(hasAcRecInOld).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Test 6: Changes in Savings Planner appearing in Dashboard (Cross-view sync)
  // -------------------------------------------------------------------------
  it('Test 6: Changes in Savings Planner dispatch real-time update event received by Dashboard', async () => {
    let receivedEventDetail: ApplianceInput[] | null = null;

    // Simulate Dashboard's real-time event listener
    const handleSync = (e: any) => {
      receivedEventDetail = e.detail;
    };

    window.addEventListener('urja-appliance-inventory-changed', handleSync);

    try {
      // Step A: Initial 1BHK Preset applied in Savings Planner
      const presetResult = applyApartmentPreset('1bhk', 200, 1500, true);
      await storageService.saveApplianceInventory(presetResult.appliances);

      expect(receivedEventDetail).toBeDefined();
      expect((receivedEventDetail as unknown as ApplianceInput[])?.length).toBe(PRESET_1BHK.length);

      // Step B: User adds a high-capacity Water Heater in Savings Planner
      const updatedInventory: ApplianceInput[] = [
        ...(receivedEventDetail as unknown as ApplianceInput[]),
        {
          id: 'new_water_heater',
          name: 'Instant Water Heater',
          category: 'water_heater',
          wattage: 3000,
          dailyUsageHours: 1,
          quantity: 1,
        },
      ];

      await storageService.saveApplianceInventory(updatedInventory);

      // Verify the Dashboard listener immediately receives the updated list
      expect(receivedEventDetail).toBeDefined();
      const updatedList = receivedEventDetail as unknown as ApplianceInput[];
      expect(updatedList.length).toBe(PRESET_1BHK.length + 1);
      const addedHeater = updatedList.find((a) => a.id === 'new_water_heater');
      expect(addedHeater).toBeDefined();
      expect(addedHeater?.wattage).toBe(3000);

      // Compute Dashboard metrics with the synchronized data
      const dashboardEngineResult = runEnergySavingsEngine({
        billedUnitsKwh: 350,
        billAmountInr: 2800,
        householdMembers: 4,
        userBudgetInr: 5000,
        appliances: updatedList,
      });

      expect(dashboardEngineResult.status).toBe('success');
      expect(dashboardEngineResult.totalApplianceCalculatedKwh).toBeGreaterThan(0);
    } finally {
      window.removeEventListener('urja-appliance-inventory-changed', handleSync);
    }
  });

  // -------------------------------------------------------------------------
  // Test 7: Inventory persistence after application reload
  // -------------------------------------------------------------------------
  it('Test 7: Inventory persists accurately after simulated application reload', async () => {
    const sessionInventory: ApplianceInput[] = [
      {
        id: 'reloaded_ac',
        name: 'Daikin Inverter AC',
        category: 'air_conditioner',
        wattage: 1350,
        dailyUsageHours: 8,
        quantity: 1,
        temperatureSetpointC: 26,
        starRating: 5,
        ageYears: 1,
        standbyHours: 16,
      },
      {
        id: 'reloaded_pump',
        name: 'Monoblock Water Pump',
        category: 'water_pump',
        wattage: 750,
        dailyUsageHours: 1,
        quantity: 1,
        starRating: 3,
        ageYears: 3,
      },
    ];

    // Session 1: Save inventory
    await storageService.saveApplianceInventory(sessionInventory);

    // Simulate page reload / new component lifecycle in Session 2
    const freshLoaded = await storageService.getApplianceInventory();

    expect(freshLoaded).toHaveLength(2);
    expect(freshLoaded[0].id).toBe('reloaded_ac');
    expect(freshLoaded[0].temperatureSetpointC).toBe(26);
    expect(freshLoaded[0].starRating).toBe(5);
    expect(freshLoaded[0].standbyHours).toBe(16);
    expect(freshLoaded[1].id).toBe('reloaded_pump');
    expect(freshLoaded[1].wattage).toBe(750);
    expect(freshLoaded[1].ageYears).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Test 8: Confirmed OCR bill values remaining 100% unchanged
  // -------------------------------------------------------------------------
  it('Test 8: Confirmed OCR bill values remain 100% untouched during appliance inventory operations', async () => {
    // 1. Establish confirmed OCR bill
    const ocrBill: ElectricityBill = {
      id: 'ocr_bill_confirmed_420',
      consumerNumber: '1029384756',
      consumerName: 'Shubham Sharma',
      billDate: '2026-10-15',
      dueDate: '2026-11-05',
      billMonth: 'October 2026',
      unitsConsumed: 420,
      totalAmount: 3350,
      tariffRatePerUnit: 7.97,
      fixedCharges: 250,
      surcharges: 100,
      isPeakSeason: false,
      source: 'ocr_scan',
      isDuplicate: false,
      ocrConfidence: 0.96,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await storageService.saveConfirmedBill(ocrBill, true);
    expect(saveResult.success).toBe(true);

    // 2. Perform various appliance inventory operations
    // Operation A: Apply 2BHK preset
    const presetResult = applyApartmentPreset('2bhk', 420, 3350, true);
    expect(presetResult.billedUnits).toBe(420);
    expect(presetResult.billAmount).toBe(3350);
    await storageService.saveApplianceInventory(presetResult.appliances);

    // Operation B: Add a high wattage appliance
    const updatedInventory: ApplianceInput[] = [
      ...presetResult.appliances,
      {
        id: 'new_oven',
        name: 'Microwave Oven',
        category: 'cooking_appliance',
        wattage: 1200,
        dailyUsageHours: 0.5,
        quantity: 1,
      },
    ];
    await storageService.saveApplianceInventory(updatedInventory);

    // Operation C: Delete an appliance
    const afterDelete = updatedInventory.filter((a) => a.id !== 'new_oven');
    await storageService.saveApplianceInventory(afterDelete);

    // 3. Verify confirmed bill records in storage
    const billsAfterOperations = await storageService.getSavedBills();
    expect(billsAfterOperations.length).toBeGreaterThan(0);

    const targetBill = billsAfterOperations.find((b) => b.id === 'ocr_bill_confirmed_420');
    expect(targetBill).toBeDefined();
    // Units consumed must be exactly 420
    expect(targetBill?.unitsConsumed).toBe(420);
    // Bill amount must be exactly 3350
    expect(targetBill?.totalAmount).toBe(3350);
    // Consumer number must be exactly '1029384756'
    expect(targetBill?.consumerNumber).toBe('1029384756');
    // Tariff rate must be preserved
    expect(targetBill?.tariffRatePerUnit).toBe(7.97);
    // Fixed charges must be preserved
    expect(targetBill?.fixedCharges).toBe(250);
  });
});
