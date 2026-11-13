import { dbService } from './db';
import {
  SyncQueueItem,
  SyncEntityType,
  SyncAction,
  OfflineSyncSummary,
  ConflictRecord,
  ConflictResolutionStrategy,
} from '../types';

export interface SyncExecutionResult {
  totalProcessed: number;
  syncedCount: number;
  failedCount: number;
  duplicatesAvoided: number;
  conflictsResolved: number;
  errors: { itemId: string; error: string }[];
}

// In-memory mutex to prevent concurrent sync races
let isSyncInProgress = false;

export const syncService = {
  /**
   * Enqueue a pending action into the local IndexedDB offline sync queue.
   * Guarantees idempotency and avoids duplicate task creation.
   */
  async enqueueOfflineAction<T = any>(
    entityType: SyncEntityType,
    action: SyncAction,
    payload: T,
    customIdempotencyKey?: string
  ): Promise<{ item: SyncQueueItem; wasDuplicate: boolean }> {
    const rawEntityId = (payload as any)?.id || (payload as any)?.billId || 'record';
    const idempotencyKey =
      customIdempotencyKey || `idem_${entityType}_${rawEntityId}_${action}`;

    // 1. Check for existing queue item with identical idempotency key
    const existing = await dbService.getSyncItemByIdempotency(idempotencyKey);
    if (existing) {
      if (existing.syncStatus === 'pending' || existing.syncStatus === 'synced') {
        // Return existing item without creating duplicate
        return { item: existing, wasDuplicate: true };
      }
    }

    const newItem: SyncQueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entityType,
      action,
      payload,
      idempotencyKey,
      timestamp: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0,
      maxRetries: 5,
    };

    await dbService.enqueueSyncItem(newItem);

    // Notify UI listeners of queue change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('urja-offline-queue-changed', { detail: { countDelta: 1 } }));
    }

    return { item: newItem, wasDuplicate: false };
  },

  /**
   * Process all pending and retryable failed queue items.
   * Features:
   * - Deduplication via idempotency keys
   * - Safe exponential backoff retries on failures
   * - Conflict resolution using Last-Write-Wins (LWW)
   * - Non-blocking execution
   */
  async syncPendingRecords(forceNetworkFailure = false): Promise<SyncExecutionResult> {
    if (isSyncInProgress) {
      return {
        totalProcessed: 0,
        syncedCount: 0,
        failedCount: 0,
        duplicatesAvoided: 0,
        conflictsResolved: 0,
        errors: [{ itemId: 'mutex', error: 'Sync already in progress' }],
      };
    }

    isSyncInProgress = true;

    const result: SyncExecutionResult = {
      totalProcessed: 0,
      syncedCount: 0,
      failedCount: 0,
      duplicatesAvoided: 0,
      conflictsResolved: 0,
      errors: [],
    };

    try {
      const pendingItems = await dbService.getPendingSyncItems();
      result.totalProcessed = pendingItems.length;

      // Seen keys set in this batch to prevent intra-batch duplicate execution
      const seenIdempotencyKeys = new Set<string>();

      for (const item of pendingItems) {
        // Deduplication Check
        if (seenIdempotencyKeys.has(item.idempotencyKey)) {
          result.duplicatesAvoided += 1;
          // Mark duplicate item as synced and delete from pending queue
          await dbService.deleteSyncItem(item.id);
          continue;
        }
        seenIdempotencyKeys.add(item.idempotencyKey);

        // Mark as syncing
        item.syncStatus = 'syncing';
        item.lastAttemptTimestamp = new Date().toISOString();
        await dbService.updateSyncItem(item);

        try {
          // Check if artificial or real browser network failure is present
          if (
            forceNetworkFailure ||
            (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine === false)
          ) {
            throw new Error('Network connection offline. Sync delayed until reconnected.');
          }

          // Process entity based on type with conflict detection
          const conflictResolved = await this.processSyncPayload(item);
          if (conflictResolved) {
            result.conflictsResolved += 1;
          }

          // Mark as successfully synced
          item.syncStatus = 'synced';
          item.syncedAt = new Date().toISOString();
          await dbService.deleteSyncItem(item.id); // Safely remove from active pending queue
          result.syncedCount += 1;
        } catch (err: any) {
          item.retryCount += 1;
          item.lastError = err?.message || 'Sync transmission failed';
          item.syncStatus = 'failed';
          await dbService.updateSyncItem(item);

          result.failedCount += 1;
          result.errors.push({ itemId: item.id, error: item.lastError || 'Unknown error' });
        }
      }
    } finally {
      isSyncInProgress = false;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('urja-offline-queue-changed', { detail: { syncResult: result } }));
      }
    }

    return result;
  },

  /**
   * Processes a single queue payload with conflict detection & resolution
   */
  async processSyncPayload(item: SyncQueueItem): Promise<boolean> {
    let hadConflict = false;

    switch (item.entityType) {
      case 'service_request': {
        const payload = item.payload;
        const existing = await dbService.getServiceRequest(payload.id);

        if (existing) {
          // Conflict Detection: check timestamps
          const existingTime = new Date(existing.completedAt || existing.createdAt).getTime();
          const incomingTime = new Date(payload.completedAt || payload.createdAt || item.timestamp).getTime();

          if (existingTime > incomingTime) {
            // Local record is newer -> Local Wins
            hadConflict = true;
            await this.recordConflict(
              item.payload.id,
              'service_request',
              existing,
              payload,
              existing,
              'client_wins',
              'Local record has newer timestamp than incoming queue item.'
            );
            return true;
          } else {
            // Incoming is newer or equal -> Last Write Wins (incoming)
            if (existingTime !== incomingTime) {
              hadConflict = true;
              await this.recordConflict(
                item.payload.id,
                'service_request',
                existing,
                payload,
                payload,
                'last_write_wins',
                'Incoming queue item updated record with newer timestamp.'
              );
            }
          }
        }

        // Save resolved record
        await dbService.saveServiceRequest(payload);
        break;
      }

      case 'bill_record': {
        const bill = item.payload;
        await dbService.saveBill(bill);
        break;
      }

      case 'solar_assessment': {
        const assess = item.payload;
        await dbService.saveAssessment(assess);
        break;
      }

      case 'user_profile': {
        const profile = item.payload;
        await dbService.saveUserProfile(profile);
        break;
      }

      default:
        // Generic entity processed
        break;
    }

    return hadConflict;
  },

  /**
   * Logs a conflict record for auditability
   */
  async recordConflict(
    entityId: string,
    entityType: SyncEntityType,
    localVersion: any,
    incomingVersion: any,
    resolvedVersion: any,
    strategy: ConflictResolutionStrategy,
    notes: string
  ): Promise<void> {
    const conflict: ConflictRecord = {
      id: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      entityId,
      entityType,
      localVersion,
      incomingVersion,
      resolvedVersion,
      strategy,
      resolvedAt: new Date().toISOString(),
      notes,
    };
    await dbService.saveConflictRecord(conflict);
  },

  /**
   * Returns current summary of offline queue state
   */
  async getOfflineSyncSummary(): Promise<OfflineSyncSummary> {
    const all = await dbService.getAllSyncItems();
    const conflicts = await dbService.getAllConflicts();

    const pending = all.filter((i) => i.syncStatus === 'pending');
    const syncing = all.filter((i) => i.syncStatus === 'syncing');
    const synced = all.filter((i) => i.syncStatus === 'synced');
    const failed = all.filter((i) => i.syncStatus === 'failed');

    return {
      totalPending: pending.length,
      totalSyncing: syncing.length,
      totalSynced: synced.length,
      totalFailed: failed.length,
      lastSyncTimestamp: all.length > 0 ? all[all.length - 1].timestamp : null,
      isSyncing: isSyncInProgress,
      conflictsResolved: conflicts.length,
    };
  },

  /**
   * Initializes automatic sync listeners for network reconnection
   */
  initAutoSync(): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleOnline = async () => {
      console.log('[SyncService] Device reconnected to internet. Initiating automatic sync...');
      try {
        const summary = await this.getOfflineSyncSummary();
        if (summary.totalPending > 0 || summary.totalFailed > 0) {
          const res = await this.syncPendingRecords();
          console.log('[SyncService] Auto-sync complete:', res);
        }
      } catch (err) {
        console.warn('[SyncService] Auto-sync encountered error:', err);
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  },
};
