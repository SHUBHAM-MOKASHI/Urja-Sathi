import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useNotification } from '../../context/NotificationContext';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  HardDrive,
  X,
} from 'lucide-react';

export const OfflineStatusBanner: React.FC = () => {
  const { isOffline, isOnline, pendingQueueCount, isSyncing, triggerManualSync } = useApp();
  const { showNotification } = useNotification();
  const [isDismissed, setIsDismissed] = useState(false);

  // If online and no pending items, no banner needed
  if (isOnline && pendingQueueCount === 0) {
    return null;
  }

  // If user dismissed and we're just showing queue count
  if (isDismissed && isOnline) {
    return null;
  }

  const handleSyncNow = async () => {
    try {
      const res = await triggerManualSync();
      if (res.syncedCount > 0) {
        showNotification(
          'success',
          'Sync Complete',
          `Successfully processed ${res.syncedCount} queued record(s) in local storage.`
        );
      } else if (res.failedCount > 0) {
        showNotification(
          'warning',
          'Sync Partial',
          `${res.failedCount} record(s) pending transmission. Will safely retry automatically.`
        );
      } else {
        showNotification('info', 'Queue Checked', 'All local records are currently up to date.');
      }
    } catch {
      showNotification('error', 'Sync Status', 'Offline mode active. Safe local queue preserved.');
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full border-b transition-all duration-300 ${isOffline
          ? 'bg-amber-900 text-amber-50 border-amber-800'
          : 'bg-emerald-900 text-emerald-50 border-emerald-800'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isOffline ? 'bg-amber-800 text-amber-300' : 'bg-emerald-800 text-emerald-300'
              }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          </div>

          <div>
            <span className="font-bold tracking-tight">
              {isOffline ? 'Working Offline (PWA Cache Active)' : 'Online Connection Active'}
            </span>
            <span className="opacity-90 ml-2 hidden md:inline">
              {isOffline
                ? 'All calculation engines, OCR analysis, and bill stores run locally on your device without internet.'
                : 'Connection restored.'}
            </span>
            {pendingQueueCount > 0 && (
              <span className="ml-2 font-semibold text-amber-200 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-700/50">
                {pendingQueueCount} record{pendingQueueCount > 1 ? 's' : ''} queued for sync
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {pendingQueueCount > 0 && isOnline && (
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          {isOffline && (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-200/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800">
              <HardDrive className="w-3 h-3 text-amber-400" />
              Local-First Mode
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
