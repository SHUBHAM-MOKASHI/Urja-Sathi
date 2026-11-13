import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { useNotification } from '../context/NotificationContext';
import { dbService } from '../services/db';
import { MOCK_BILLS } from '../data/mockEnergyData';
import { Language } from '../types';
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
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { userProfile, updateUserProfile, language, setLanguage, isOnline, refreshCounters } = useApp();
  const { showNotification } = useNotification();

  const [name, setName] = useState(userProfile.name);
  const [pincode, setPincode] = useState(userProfile.pincode);
  const [discom, setDiscom] = useState(userProfile.discomName || '');
  const [sanctionedLoad, setSanctionedLoad] = useState(userProfile.sanctionedLoadKw || 3);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear saved offline bills?')) {
      try {
        const bills = await dbService.getAllBills();
        for (const b of bills) {
          await dbService.deleteBill(b.id);
        }
        await refreshCounters();
        showNotification('info', 'Offline Cache Cleared', 'Stored electricity bills removed from IndexedDB.');
      } catch {
        showNotification('error', 'Error', 'Failed to clear offline storage.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Settings & Offline Storage
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage local IndexedDB records, language preference, and household connection details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Profile Configuration */}
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
                    Consumer / Family Head Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Pincode (For Solar Insolation & Technicians)
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Sanctioned Load (kW)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={sanctionedLoad}
                      onChange={(e) => setSanctionedLoad(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
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
                    placeholder="e.g. MPPKVVCL, BSES, MSEDCL, TANGEDCO"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    isLoading={isUpdating}
                    variant="primary"
                    icon={<CheckCircle className="w-4 h-4" />}
                  >
                    Save Changes to Local Storage
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
                Language & Localization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">
                Choose your preferred language for navigation, voice assistance, and reports:
              </p>
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
        </div>

        {/* Right Column: Offline IndexedDB Health & Tools */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-600" />
                Offline Engine & Database Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    Database Engine:
                  </span>
                  <span className="font-bold text-slate-800">IndexedDB (idb v8)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
                    Network Mode:
                  </span>
                  <Badge variant={isOnline ? 'emerald' : 'amber'} size="sm">
                    {isOnline ? 'Online Synced' : 'Offline Mode'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Service Worker Cache:</span>
                  <span className="font-semibold text-emerald-700">Pre-cached Shell</span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={handleResetDemoData}
                  variant="outline"
                  size="sm"
                  className="w-full justify-center"
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Repopulate Baseline Demo Data
                </Button>

                <Button
                  onClick={handleClearCache}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                >
                  Clear Saved Offline Records
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Hackathon Architecture Card */}
          <Card variant="forest" className="p-5">
            <h4 className="font-bold text-white text-sm mb-1">Architecture Highlights</h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              URJA SAATHI operates in zero-connectivity environments. All tariff algorithms, solar geometry formulas, and technician directory entries reside on client memory.
            </p>
            <div className="text-[11px] text-emerald-300 font-semibold flex items-center justify-between pt-2 border-t border-forest-800">
              <span>Stack: React + TS + Tailwind + IndexedDB</span>
              <span>v0.1.0</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

