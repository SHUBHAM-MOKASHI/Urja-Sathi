import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import { useNotification } from '../context/NotificationContext';
import { dbService } from '../services/db';
import { purgeAppCaches } from '../services/serviceWorkerRegistration';
import { MOCK_BILLS } from '../data/mockEnergyData';
import { Language, SyncQueueItem } from '../types';
import {
  HardDrive,
  Globe,
  User,
  RefreshCw,
  Trash2,
  CheckCircle,
  Database,
  Wifi,
  WifiOff,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    userProfile,
    updateUserProfile,
    language,
    setLanguage,
    isOnline,
    refreshCounters,
    pendingQueueCount,
    isSyncing,
    triggerManualSync,
    refreshOfflineQueue,
  } = useApp();
  const { showNotification } = useNotification();

  const [name, setName] = useState(userProfile.name);
  const [pincode, setPincode] = useState(userProfile.pincode);
  const [discom, setDiscom] = useState(userProfile.discomName || '');
  const [sanctionedLoad, setSanctionedLoad] = useState(userProfile.sanctionedLoadKw || 3);
  const [isUpdating, setIsUpdating] = useState(false);

  // Queue inspection state
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);
  const [deletionTarget, setDeletionTarget] = useState<'bills' | 'queue' | 'fullReset'>('bills');

  const loadQueue = async () => {
    try {
      const items = await dbService.getAllSyncItems();
      setQueueItems(items);
    } catch {
      // Graceful
    }
  };

  useEffect(() => {
    loadQueue();
  }, [pendingQueueCount]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateUserProfile({
        name,
        pincode,
        discomName: discom,
        sanctionedLoadKw: Number(sanctionedLoad),
      });
      showNotification('success', 'Profile Saved', 'Household parameters stored in local IndexedDB.');
    } catch {
      showNotification('error', 'Update Failed', 'Could not persist profile changes.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetDemoData = async () => {
    try {
      for (const bill of MOCK_BILLS) {
        await dbService.saveBill(bill);
      }
      await refreshCounters();
      showNotification('success', 'Demo Bills Restored', 'Mock billing data has been repopulated into IndexedDB.');
    } catch {
      showNotification('error', 'Reset Failed', 'Could not reset mock data.');
    }
  };

  const handleTriggerSync = async () => {
    try {
      const res = await triggerManualSync();
      await loadQueue();
      if (res.syncedCount > 0) {
        showNotification(
          'success',
          'Sync Succeeded',
          `Successfully processed ${res.syncedCount} queued record(s).`
        );
      } else if (res.failedCount > 0) {
        showNotification(
          'warning',
          'Sync Interrupted',
          `${res.failedCount} record(s) failed transmission. Safe local queue preserved.`
        );
      } else {
        showNotification('info', 'Queue Checked', 'No pending records required synchronization.');
      }
    } catch {
      showNotification('error', 'Sync Failed', 'Could not complete sync. Queue intact.');
    }
  };

  // User-Controlled Data Deletion Handler
  const executeDataDeletion = async () => {
    try {
      if (deletionTarget === 'bills') {
        await dbService.clearAllData({ bills: true });
        await refreshCounters();
        showNotification('info', 'Bills Deleted', 'All saved bill records have been removed from IndexedDB.');
      } else if (deletionTarget === 'queue') {
        await dbService.clearAllData({ queue: true });
        await refreshOfflineQueue();
        await loadQueue();
        showNotification('info', 'Sync Queue Cleared', 'All pending/failed offline queue items were purged.');
      } else if (deletionTarget === 'fullReset') {
        await dbService.clearAllData({ fullReset: true });
        await purgeAppCaches();
        await refreshCounters();
        await refreshOfflineQueue();
        await loadQueue();
        showNotification(
          'success',
          'Full Factory Reset Complete',
          'All local IndexedDB stores, offline queues, and Service Worker caches have been completely wiped.'
        );
      }
      setIsDeletionModalOpen(false);
    } catch (err: any) {
      showNotification('error', 'Deletion Error', err?.message || 'Failed to wipe data.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Settings & Offline Storage Console
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage local IndexedDB records, offline synchronization queues, language preferences, and user privacy controls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Profile Configuration & Language */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Household Profile & Tariff Base
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Consumer / Household Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Enter name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Pin Code (Location Base)
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      placeholder="e.g. 452001"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Sanctioned Load (kW)
                    </label>
                    <input
                      type="number"
                      value={sanctionedLoad}
                      onChange={(e) => setSanctionedLoad(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      min={1}
                      max={50}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Electricity Distribution Company (DISCOM)
                  </label>
                  <input
                    type="text"
                    value={discom}
                    onChange={(e) => setDiscom(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="e.g. MPPKVVCL (Indore/West MP)"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" variant="primary" disabled={isUpdating}>
                    {isUpdating ? 'Saving Offline...' : 'Save Parameters'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Language Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                Language & Voice Preference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { code: 'en' as Language, label: 'English', desc: 'Default' },
                  { code: 'hi' as Language, label: 'हिंदी', desc: 'Hindi' },
                  { code: 'mr' as Language, label: 'मराठी', desc: 'Marathi' },
                ].map((item) => (
                  <button
                    key={item.code}
                    onClick={() => {
                      setLanguage(item.code);
                      showNotification('info', 'Language Updated', `Switched to ${item.label}`);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      language === item.code
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Offline Sync Queue Inspector */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4 text-emerald-700" />
                  Offline Sync Queue Inspection
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tasks stored in IndexedDB awaiting safe background synchronization
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerSync}
                disabled={isSyncing}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />}
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </CardHeader>
            <CardContent>
              {queueItems.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
                  <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">Offline Queue is Empty</p>
                  <p className="text-slate-400 mt-0.5">All local mutations have been synchronized.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {queueItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">
                            {item.entityType.replace(/_/g, ' ')}
                          </span>
                          <span className="font-semibold text-slate-700 truncate">
                            {item.action}: {(item.payload as any)?.title || (item.payload as any)?.id || 'Item'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          Key: {item.idempotencyKey}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            item.syncStatus === 'synced'
                              ? 'emerald'
                              : item.syncStatus === 'failed'
                              ? 'rose'
                              : 'amber'
                          }
                          size="sm"
                        >
                          {item.syncStatus} {item.retryCount > 0 ? `(${item.retryCount})` : ''}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Offline IndexedDB Health & User Privacy / Data Controls */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-600" />
                Offline Architecture & PWA Cache
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    IndexedDB Schema:
                  </span>
                  <span className="font-bold text-slate-800">urja_saathi_offline_db (v2)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    {isOnline ? (
                      <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    Network Status:
                  </span>
                  <Badge variant={isOnline ? 'emerald' : 'amber'} size="sm">
                    {isOnline ? 'Online Synced' : 'Offline Mode (Local Active)'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Service Worker Shell:</span>
                  <span className="font-semibold text-emerald-700">Pre-cached (/sw.js)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">PWA Manifest:</span>
                  <span className="font-semibold text-emerald-700">manifest.webmanifest</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Deduplication:</span>
                  <span className="font-semibold text-slate-800">UUID Idempotency Keys</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Conflict Engine:</span>
                  <span className="font-semibold text-slate-800">Last-Write-Wins (LWW)</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Button
                  onClick={handleResetDemoData}
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Repopulate Baseline Mock Bills
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* USER-CONTROLLED DATA DELETION & PRIVACY CONTROLS (Requirement 12) */}
          <Card className="border-rose-200 bg-rose-50/20">
            <CardHeader className="pb-3 border-b border-rose-100">
              <CardTitle className="flex items-center gap-2 text-rose-900 text-base">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                User-Controlled Data Deletion
              </CardTitle>
              <p className="text-xs text-rose-800/80 mt-0.5">
                GDPR & DPDP Act compliant local data erasure tools. You have full sovereign control over all data stored on this device.
              </p>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeletionTarget('bills');
                    setIsDeletionModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-rose-200 hover:border-rose-300 hover:bg-rose-50/50 text-xs text-left transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">Clear Saved Bills Database</span>
                    <span className="text-slate-500 text-[11px]">Deletes all confirmed OCR bills from IndexedDB</span>
                  </div>
                  <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeletionTarget('queue');
                    setIsDeletionModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-rose-200 hover:border-rose-300 hover:bg-rose-50/50 text-xs text-left transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 block">Purge Offline Sync Queue</span>
                    <span className="text-slate-500 text-[11px]">Removes pending or failed tasks waiting for sync</span>
                  </div>
                  <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeletionTarget('fullReset');
                    setIsDeletionModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-100/70 border border-rose-300 hover:bg-rose-200/80 text-xs text-left transition-colors"
                >
                  <div>
                    <span className="font-bold text-rose-950 block">Full Factory Reset & Purge All Caches</span>
                    <span className="text-rose-800 text-[11px]">
                      Wipes all databases, CacheStorage, Service Worker caches, and local storage
                    </span>
                  </div>
                  <Trash2 className="w-4 h-4 text-rose-700 shrink-0" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Hackathon Architecture Card */}
          <Card variant="forest" className="p-5">
            <h4 className="font-bold text-white text-sm mb-1">Local-First Privacy Architecture</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              URJA SAATHI ensures 100% privacy: electricity bill images and consumer numbers are processed locally with client-side OCR and mathematical calculation engines. No data leaves the device without explicit user confirmation.
            </p>
            <div className="text-[11px] text-emerald-300 font-semibold flex items-center justify-between pt-2 border-t border-forest-800">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Zero Cloud OCR Dependency
              </span>
              <span>DPDP Compliant</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal for Data Deletion */}
      <Modal
        isOpen={isDeletionModalOpen}
        onClose={() => {
          setIsDeletionModalOpen(false);
        }}
        title="Confirm Data Deletion"
        description="This action will delete records stored directly on this device."
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 leading-relaxed">
              {deletionTarget === 'bills' && (
                <p>
                  You are about to delete all saved electricity bill records from local IndexedDB storage.
                  Historical trend charts will be cleared.
                </p>
              )}
              {deletionTarget === 'queue' && (
                <p>
                  You are about to purge all offline synchronization queue tasks.
                  Any service requests queued while offline will be permanently discarded.
                </p>
              )}
              {deletionTarget === 'fullReset' && (
                <p>
                  <strong>Warning: Full Factory Reset.</strong> This will wipe every IndexedDB store, purge CacheStorage service worker caches, and reset local settings.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsDeletionModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={executeDataDeletion}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Confirm Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
