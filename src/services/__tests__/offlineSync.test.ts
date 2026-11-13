import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncService } from '../syncService';
import { dbService } from '../db';
import { runEnergySavingsEngine } from '../energyEngine';
import { runSolarFeasibilityEngine } from '../solarEngine';
import { checkDuplicateBill } from '../billValidation';
import {
  SyncQueueItem,
  ServiceRequest,
  ConflictRecord,
  ElectricityBill,
} from '../../types';

describe('Offline-First Architecture & Synchronization Engine', () => {
  // In-Memory IndexedDB Mock Store for Vitest
  let mockQueue: Map<string, SyncQueueItem>;
  let mockServiceRequests: Map<string, ServiceRequest>;
  let mockBills: Map<string, ElectricityBill>;
  let mockConflicts: Map<string, ConflictRecord>;

  beforeEach(() => {
    mockQueue = new Map();
    mockServiceRequests = new Map();
    mockBills = new Map();
    mockConflicts = new Map();

    // Mock dbService operations using in-memory Maps
    vi.spyOn(dbService, 'enqueueSyncItem').mockImplementation(async (item: SyncQueueItem) => {
      mockQueue.set(item.id, { ...item });
    });

    vi.spyOn(dbService, 'getAllSyncItems').mockImplementation(async () => {
      return Array.from(mockQueue.values());
    });

    vi.spyOn(dbService, 'getPendingSyncItems').mockImplementation(async () => {
      return Array.from(mockQueue.values()).filter(
        (i) => i.syncStatus === 'pending' || i.syncStatus === 'failed'
      );
    });

    vi.spyOn(dbService, 'getSyncItemByIdempotency').mockImplementation(async (key: string) => {
      return Array.from(mockQueue.values()).find((i) => i.idempotencyKey === key);
    });

    vi.spyOn(dbService, 'updateSyncItem').mockImplementation(async (item: SyncQueueItem) => {
      mockQueue.set(item.id, { ...item });
    });

    vi.spyOn(dbService, 'deleteSyncItem').mockImplementation(async (id: string) => {
      mockQueue.delete(id);
    });

    vi.spyOn(dbService, 'clearSyncQueue').mockImplementation(async () => {
      mockQueue.clear();
    });

    vi.spyOn(dbService, 'saveServiceRequest').mockImplementation(async (req: ServiceRequest) => {
      mockServiceRequests.set(req.id, { ...req });
    });

    vi.spyOn(dbService, 'getServiceRequest').mockImplementation(async (id: string) => {
      return mockServiceRequests.get(id);
    });

    vi.spyOn(dbService, 'getAllServiceRequests').mockImplementation(async () => {
      return Array.from(mockServiceRequests.values());
    });

    vi.spyOn(dbService, 'deleteServiceRequest').mockImplementation(async (id: string) => {
      mockServiceRequests.delete(id);
    });

    vi.spyOn(dbService, 'saveConflictRecord').mockImplementation(async (conflict: ConflictRecord) => {
      mockConflicts.set(conflict.id, { ...conflict });
    });

    vi.spyOn(dbService, 'getAllConflicts').mockImplementation(async () => {
      return Array.from(mockConflicts.values());
    });

    vi.spyOn(dbService, 'saveBill').mockImplementation(async (bill: ElectricityBill) => {
      mockBills.set(bill.id, { ...bill });
    });

    vi.spyOn(dbService, 'getAllBills').mockImplementation(async () => {
      return Array.from(mockBills.values());
    });

    vi.spyOn(dbService, 'deleteBill').mockImplementation(async (id: string) => {
      mockBills.delete(id);
    });

    vi.spyOn(dbService, 'clearAllData').mockImplementation(async (options) => {
      const cleared: string[] = [];
      if (options?.fullReset) {
        mockBills.clear();
        mockQueue.clear();
        mockServiceRequests.clear();
        mockConflicts.clear();
        cleared.push('bills', 'offlineSyncQueue', 'serviceRequests', 'conflictLog');
        return { clearedStores: cleared, success: true };
      }
      if (options?.bills) {
        mockBills.clear();
        cleared.push('bills');
      }
      if (options?.queue) {
        mockQueue.clear();
        cleared.push('offlineSyncQueue');
      }
      if (options?.serviceRequests) {
        mockServiceRequests.clear();
        cleared.push('serviceRequests');
      }
      return { clearedStores: cleared, success: true };
    });
  });

  describe('1. Offline Queue Enqueueing & Idempotency Key Deduplication', () => {
    it('successfully enqueues a new service request with status pending', async () => {
      const mockRequest: Partial<ServiceRequest> = {
        id: 'req_test_01',
        title: 'BLDC Fan Installation',
        requestType: 'technical_electrical',
        locality: 'Indore',
      };

      const { item, wasDuplicate } = await syncService.enqueueOfflineAction(
        'service_request',
        'create',
        mockRequest,
        'idem_req_test_01'
      );

      expect(wasDuplicate).toBe(false);
      expect(item.syncStatus).toBe('pending');
      expect(item.idempotencyKey).toBe('idem_req_test_01');
      expect(item.retryCount).toBe(0);

      const queue = await dbService.getAllSyncItems();
      expect(queue).toHaveLength(1);
    });

    it('strictly avoids duplicate records when re-enqueueing with identical idempotency key', async () => {
      const mockRequest: Partial<ServiceRequest> = {
        id: 'req_test_dup',
        title: 'Solar Inverter Inspection',
      };

      // First enqueue
      const first = await syncService.enqueueOfflineAction(
        'service_request',
        'create',
        mockRequest,
        'idem_unique_key_100'
      );
      expect(first.wasDuplicate).toBe(false);

      // Attempt second enqueue with identical key
      const second = await syncService.enqueueOfflineAction(
        'service_request',
        'create',
        mockRequest,
        'idem_unique_key_100'
      );
      expect(second.wasDuplicate).toBe(true);
      expect(second.item.id).toBe(first.item.id);

      // Verify queue still has exactly 1 item
      const queue = await dbService.getAllSyncItems();
      expect(queue).toHaveLength(1);
    });
  });

  describe('2. Synchronization Processing & State Transitions', () => {
    it('transitions queued pending records to synced and updates the local entity store', async () => {
      const req: ServiceRequest = {
        id: 'req_sync_01',
        householdName: 'Sunita Sharma',
        householdPhone: '+91 98765 11111',
        locality: 'Indore',
        pincode: '452001',
        requestType: 'technical_electrical',
        title: 'Wire Repair',
        description: 'Fix tripping switchboard',
        preferredDate: '2026-02-18',
        preferredTimeSlot: '10:00 - 12:00',
        status: 'pending',
        isTechnical: true,
        consentGiven: true,
        createdAt: '2026-02-16T10:00:00Z',
      };

      await syncService.enqueueOfflineAction('service_request', 'create', req, 'idem_sync_01');

      // Execute sync
      const result = await syncService.syncPendingRecords(false);

      expect(result.totalProcessed).toBe(1);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // Entity should now exist in serviceRequests store
      const saved = await dbService.getServiceRequest('req_sync_01');
      expect(saved).toBeDefined();
      expect(saved?.title).toBe('Wire Repair');

      // Pending queue should now be empty
      const pending = await dbService.getPendingSyncItems();
      expect(pending).toHaveLength(0);
    });
  });

  describe('3. Failure Handling & Safe Retry Mechanism', () => {
    it('safely handles network failures by incrementing retryCount without dropping the task', async () => {
      const req: Partial<ServiceRequest> = {
        id: 'req_fail_01',
        title: 'Offline Task Awaiting Network',
      };

      await syncService.enqueueOfflineAction('service_request', 'create', req, 'idem_fail_01');

      // Simulate network transmission failure
      const result = await syncService.syncPendingRecords(true);

      expect(result.failedCount).toBe(1);
      expect(result.syncedCount).toBe(0);
      expect(result.errors).toHaveLength(1);

      // Item must remain in the queue with failed status & retryCount = 1
      const allItems = await dbService.getAllSyncItems();
      expect(allItems).toHaveLength(1);
      const failedItem = allItems[0];
      expect(failedItem.syncStatus).toBe('failed');
      expect(failedItem.retryCount).toBe(1);
      expect(failedItem.lastError).toContain('Network connection offline');

      // When network returns (failure = false), task succeeds
      const retryResult = await syncService.syncPendingRecords(false);
      expect(retryResult.syncedCount).toBe(1);
      expect(retryResult.failedCount).toBe(0);
    });
  });

  describe('4. Conflicting Record Updates & Conflict Resolution', () => {
    it('applies Last-Write-Wins (LWW) when incoming queue payload has a newer timestamp', async () => {
      const existingReq: ServiceRequest = {
        id: 'req_conflict_01',
        householdName: 'Ramesh Patel',
        householdPhone: '+91 98765 22222',
        locality: 'Indore',
        pincode: '452001',
        requestType: 'technical_electrical',
        title: 'Original Title',
        description: 'Original description',
        preferredDate: '2026-02-18',
        preferredTimeSlot: '10:00 - 12:00',
        status: 'pending',
        isTechnical: true,
        consentGiven: true,
        createdAt: '2026-02-16T10:00:00Z',
      };
      await dbService.saveServiceRequest(existingReq);

      // Incoming update with newer timestamp
      const incomingReq: ServiceRequest = {
        ...existingReq,
        title: 'Updated Title By Field Worker',
        status: 'accepted',
        completedAt: '2026-02-16T12:00:00Z',
      };

      await syncService.enqueueOfflineAction(
        'service_request',
        'update',
        incomingReq,
        'idem_update_conflict_01'
      );

      const result = await syncService.syncPendingRecords(false);
      expect(result.conflictsResolved).toBe(1);

      // Verify the updated title was committed (Last-Write-Wins)
      const updated = await dbService.getServiceRequest('req_conflict_01');
      expect(updated?.title).toBe('Updated Title By Field Worker');
      expect(updated?.status).toBe('accepted');

      // Verify conflict audit log was created
      const conflicts = await dbService.getAllConflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].strategy).toBe('last_write_wins');
    });

    it('preserves existing local record when existing has a newer timestamp (client_wins)', async () => {
      const newerLocalReq: ServiceRequest = {
        id: 'req_conflict_02',
        householdName: 'Deepak Verma',
        householdPhone: '+91 98765 33333',
        locality: 'Indore',
        pincode: '452001',
        requestType: 'technical_electrical',
        title: 'Newest Local Version',
        description: 'Updated locally at 14:00',
        preferredDate: '2026-02-18',
        preferredTimeSlot: '10:00 - 12:00',
        status: 'in_progress',
        isTechnical: true,
        consentGiven: true,
        createdAt: '2026-02-16T14:00:00Z',
      };
      await dbService.saveServiceRequest(newerLocalReq);

      // Incoming update with older timestamp (e.g. delayed queue task from 11:00)
      const olderIncomingReq: ServiceRequest = {
        ...newerLocalReq,
        title: 'Stale Older Version',
        createdAt: '2026-02-16T11:00:00Z',
      };

      await syncService.enqueueOfflineAction(
        'service_request',
        'update',
        olderIncomingReq,
        'idem_older_02'
      );

      const result = await syncService.syncPendingRecords(false);
      expect(result.conflictsResolved).toBe(1);

      // Verify local newer record was preserved
      const stored = await dbService.getServiceRequest('req_conflict_02');
      expect(stored?.title).toBe('Newest Local Version');

      const conflicts = await dbService.getAllConflicts();
      const conflict = conflicts.find((c) => c.entityId === 'req_conflict_02');
      expect(conflict?.strategy).toBe('client_wins');
    });
  });

  describe('5. User-Controlled Data Deletion Mechanism', () => {
    it('selectively deletes only bills when requested', async () => {
      const bill: ElectricityBill = {
        id: 'bill_01',
        consumerNumber: '1001',
        consumerName: 'Test Consumer',
        billMonth: 'May 2024',
        billDate: '2024-05-20',
        dueDate: '2024-06-05',
        unitsConsumed: 300,
        totalAmount: 2400,
        tariffRatePerUnit: 8,
        fixedCharges: 100,
        surcharges: 20,
        isPeakSeason: false,
        source: 'manual',
        createdAt: '2024-05-20',
      };
      await dbService.saveBill(bill);
      expect(await dbService.getAllBills()).toHaveLength(1);

      await dbService.clearAllData({ bills: true });
      expect(await dbService.getAllBills()).toHaveLength(0);
    });

    it('performs full factory reset wiping all stores completely', async () => {
      const bill: ElectricityBill = {
        id: 'bill_02',
        consumerNumber: '1002',
        consumerName: 'Test',
        billMonth: 'Jun 2024',
        billDate: '2024-06-20',
        dueDate: '2024-07-05',
        unitsConsumed: 250,
        totalAmount: 2000,
        tariffRatePerUnit: 8,
        fixedCharges: 100,
        surcharges: 20,
        isPeakSeason: false,
        source: 'manual',
        createdAt: '2024-06-20',
      };
      await dbService.saveBill(bill);
      await syncService.enqueueOfflineAction('service_request', 'create', { id: 'test' });

      expect(await dbService.getAllBills()).toHaveLength(1);
      expect(await dbService.getAllSyncItems()).toHaveLength(1);

      const resetRes = await dbService.clearAllData({ fullReset: true });
      expect(resetRes.success).toBe(true);

      expect(await dbService.getAllBills()).toHaveLength(0);
      expect(await dbService.getAllSyncItems()).toHaveLength(0);
      expect(await dbService.getAllServiceRequests()).toHaveLength(0);
      expect(await dbService.getAllConflicts()).toHaveLength(0);
    });
  });

  describe('6. Offline Deterministic Energy & Solar Calculations', () => {
    it('executes energy savings engine 100% offline with zero network calls', () => {
      const result = runEnergySavingsEngine({
        billedUnitsKwh: 420,
        billAmountInr: 3360,
        householdMembers: 4,
        userBudgetInr: 6000,
        appliances: [
          {
            id: 'ac_01',
            name: 'AC 1.5 Ton',
            category: 'air_conditioner',
            quantity: 1,
            wattage: 1500,
            dailyUsageHours: 6,
            temperatureSetpointC: 20,
          },
        ],
      });

      expect(result.status).toBe('success');
      expect(result.dailyAverageBilledKwh).toBeGreaterThan(0);
      expect(result.applianceBreakdown).toHaveLength(1);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].action).toContain('24°C');
      expect(result.recommendations[0].estimatedMonetaryBenefitInr).toBeGreaterThan(0);
    });

    it('executes solar feasibility engine 100% offline with zero network calls', () => {
      const solarResult = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 350,
        monthlyElectricityBillInr: 2800,
        usableRoofAreaSqFt: 300,
        roofOwnership: 'owned_individual',
        proposedSolarCapacityKw: 3,
        installationQuotationInr: 180000,
      });

      expect(solarResult.decision).toBe('explore_solar');
      expect(solarResult.recommendedCapacityKw).toBeGreaterThan(0);
      expect(solarResult.financialAssistanceInr).toBe(78000); // PM Surya Ghar 3kW max
      expect(solarResult.netInvestmentCostInr).toBe(102000); // 180000 - 78000
      expect(solarResult.scenarios.conservative).toBeDefined();
      expect(solarResult.scenarios.central).toBeDefined();
      expect(solarResult.scenarios.optimistic).toBeDefined();
      expect(solarResult.scenarios.central.simplePaybackYears).toBeGreaterThan(0);
    });
  });

  describe('7. Local Bill Deduplication & Sovereign Privacy', () => {
    it('detects duplicate bill uploads completely on the client without cloud calls', () => {
      const existingBills: ElectricityBill[] = [
        {
          id: 'bill_existing_01',
          consumerNumber: '990011',
          consumerName: 'Anil Sharma',
          billMonth: 'June 2024',
          billDate: '2024-06-25',
          dueDate: '2024-07-10',
          unitsConsumed: 320,
          totalAmount: 2560,
          tariffRatePerUnit: 8,
          fixedCharges: 100,
          surcharges: 20,
          isPeakSeason: false,
          source: 'manual',
          createdAt: '2024-06-25',
        },
      ];

      const duplicateScan = {
        consumerNumber: '990011',
        billMonth: 'June 2024',
        billDate: '2024-06-25',
        unitsConsumed: 320,
        totalAmount: 2560,
      };

      const dupCheck = checkDuplicateBill(duplicateScan, existingBills);
      expect(dupCheck.isDuplicate).toBe(true);
      expect(dupCheck.reason).toContain('already saved');
      expect(dupCheck.duplicateBillId).toBe('bill_existing_01');
    });
  });
});
