import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, UserProfile } from '../types';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { dbService } from '../services/db';

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
    return (localStorage.getItem('urja_language') as Language) || 'en';
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [lastVoiceTranscript, setLastVoiceTranscript] = useState<string>('');
  const [savedBillsCount, setSavedBillsCount] = useState<number>(0);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('urja_language', lang);
  };

  const refreshCounters = async () => {
    try {
      const bills = await dbService.getAllBills();
      setSavedBillsCount(bills.length);
    } catch {
      // Graceful fallback if indexedDB is initializing
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
      } catch (err) {
        console.warn('Initial data load warning:', err);
      }
    };
    initData();
  }, []);

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

