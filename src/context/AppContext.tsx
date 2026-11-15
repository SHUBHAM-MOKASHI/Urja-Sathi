import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, UserProfile, OfflineSyncSummary } from '../types';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { dbService } from '../services/db';
import { syncService, SyncExecutionResult } from '../services/syncService';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isOnline: boolean;
  isOffline: boolean;
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  isVoiceActive: boolean;
  setIsVoiceActive: (active: boolean) => void;
  lastVoiceTranscript: string;
  setLastVoiceTranscript: (transcript: string) => void;
  savedBillsCount: number;
  refreshCounters: () => Promise<void>;
  // Offline sync controls
  pendingQueueCount: number;
  isSyncing: boolean;
  syncSummary: OfflineSyncSummary | null;
  triggerManualSync: () => Promise<SyncExecutionResult>;
  refreshOfflineQueue: () => Promise<void>;
  // UI & Navigation Shell
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
}

const defaultProfile: UserProfile = {
  id: 'default_user',
  name: 'Rajesh Sharma',
  phone: '+91 98765 43210',
  pincode: '452001',
  state: 'Madhya Pradesh',
  discomName: 'MPPKVVCL (Indore)',
  sanctionedLoadKw: 3,
  avgMonthlyBill: 2450,
  hasRooftopAccess: true,
  preferredLanguage: 'en',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline, isOffline } = useOfflineStatus();
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return (localStorage.getItem('urja_language') as Language) || 'en';
      }
    } catch {
      // Graceful fallback for non-browser / SSR environments
    }
    return 'en';
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [lastVoiceTranscript, setLastVoiceTranscript] = useState<string>('');
  const [savedBillsCount, setSavedBillsCount] = useState<number>(0);

  // Offline queue state
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSummary, setSyncSummary] = useState<OfflineSyncSummary | null>(null);

  // UI Navigation Shell state
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('urja_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  const setSidebarCollapsed = (collapsed: boolean) => {
    setIsSidebarCollapsedState(collapsed);
    try {
      localStorage.setItem('urja_sidebar_collapsed', String(collapsed));
    } catch {
      // Ignore
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('urja_language', lang);
      }
    } catch {
      // Ignore
    }
  };

  const refreshCounters = async () => {
    try {
      const bills = await dbService.getAllBills();
      setSavedBillsCount(bills.length);
    } catch {
      // Graceful fallback if indexedDB is initializing
    }
  };

  const refreshOfflineQueue = useCallback(async () => {
    try {
      const summary = await syncService.getOfflineSyncSummary();
      setSyncSummary(summary);
      setPendingQueueCount(summary.totalPending + summary.totalFailed);
    } catch {
      // Graceful fallback
    }
  }, []);

  const triggerManualSync = async (): Promise<SyncExecutionResult> => {
    setIsSyncing(true);
    try {
      const result = await syncService.syncPendingRecords();
      await refreshOfflineQueue();
      await refreshCounters();
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Initialise IndexedDB data & load profile
    const initData = async () => {
      try {
        const storedProfile = await dbService.getUserProfile();
        if (storedProfile) {
          setUserProfile(storedProfile);
          if (storedProfile.preferredLanguage) {
            setLanguageState(storedProfile.preferredLanguage);
          }
        } else {
          await dbService.saveUserProfile(defaultProfile);
        }
        await refreshCounters();
        await refreshOfflineQueue();
      } catch (err) {
        console.warn('Initial data load warning:', err);
      }
    };
    initData();

    // Listen to queue changes and bill updates across components
    const handleQueueChanged = () => {
      refreshOfflineQueue();
    };

    const handleBillsChanged = () => {
      refreshCounters();
    };

    window.addEventListener('urja-offline-queue-changed', handleQueueChanged);
    window.addEventListener('urja-bills-changed', handleBillsChanged);
    const unregisterAutoSync = syncService.initAutoSync();

    return () => {
      window.removeEventListener('urja-offline-queue-changed', handleQueueChanged);
      window.removeEventListener('urja-bills-changed', handleBillsChanged);
      unregisterAutoSync();
    };
  }, [refreshOfflineQueue]);

  const updateUserProfile = async (partial: Partial<UserProfile>) => {
    const updated = { ...userProfile, ...partial };
    setUserProfile(updated);
    try {
      await dbService.saveUserProfile(updated);
    } catch (err) {
      console.error('Failed to save profile offline:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        isOnline,
        isOffline,
        userProfile,
        updateUserProfile,
        isVoiceActive,
        setIsVoiceActive,
        lastVoiceTranscript,
        setLastVoiceTranscript,
        savedBillsCount,
        refreshCounters,
        pendingQueueCount,
        isSyncing,
        syncSummary,
        triggerManualSync,
        refreshOfflineQueue,
        isSidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
