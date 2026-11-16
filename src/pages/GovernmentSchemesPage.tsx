import React, { useState } from 'react';
import {
  GovernmentScheme,
  GovernmentSchemeCategory,
} from '../types';
import {
  getAvailableStates,
  getSchemesForStateAndDiscom,
} from '../services/schemeGuidanceService';
import { StateDiscomSelector } from '../components/schemes/StateDiscomSelector';
import { SchemeCard } from '../components/schemes/SchemeCard';
import { SchemeDetailModal } from '../components/schemes/SchemeDetailModal';
import { Badge } from '../components/common/Badge';
import {
  Landmark,
  ShieldCheck,
  AlertCircle,
  Sun,
  Droplets,
  Flame,
  BookOpen,
} from 'lucide-react';

export const GovernmentSchemesPage: React.FC = () => {
  const allStates = getAvailableStates();

  const [selectedState, setSelectedState] = useState<string>('Madhya Pradesh');
  const [selectedDiscom, setSelectedDiscom] = useState<string>('MPPKVVCL_WEST');
  const [selectedCategory, setSelectedCategory] = useState<GovernmentSchemeCategory | 'all'>('all');
  const [selectedSchemeForModal, setSelectedSchemeForModal] = useState<GovernmentScheme | null>(null);

  const handleSelectState = (stateName: string) => {
    setSelectedState(stateName);
    // Reset discom to 'all' or first discom
    setSelectedDiscom('all');
  };

  const schemes = getSchemesForStateAndDiscom(
    selectedState,
    selectedDiscom === 'all' ? undefined : selectedDiscom,
    selectedCategory
  );

  const centralCount = schemes.filter((s) => s.level === 'central').length;
  const stateCount = schemes.filter((s) => s.level === 'state').length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner (Integrated & Compact SaaS Style) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-forest-950 via-forest-900 to-forest-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              <Landmark className="h-3.5 w-3.5 text-emerald-400" />
              Source-Backed Policy Registry • Har Ghar Bachat, Har Haath Kaam
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-semibold backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-300" />
              Direct Portals Only (.gov.in)
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            Government Scheme Guidance & Subsidy Preparation
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Navigate central PM Surya Ghar Muft Bijli Yojana and state-level renewable top-up subsidies with
            confidence. Prepare your documents, avoid common DBT rejection pitfalls, and access verified official
            application portals.
          </p>
          <div className="pt-1 text-xs text-emerald-200/90 flex items-center gap-2 font-medium">
            <span>• Independent civic guidance</span>
            <span>• Direct Benefit Transfer (DBT) into your bank account</span>
            <span>• Zero intermediary charges</span>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 h-56 w-56 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* State & DISCOM Selector */}
      <StateDiscomSelector
        states={allStates}
        selectedState={selectedState}
        selectedDiscom={selectedDiscom}
        onSelectState={handleSelectState}
        onSelectDiscom={setSelectedDiscom}
      />

      {/* Category Filter Pills & Scheme Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Schemes ({schemes.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('rooftop_solar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              selectedCategory === 'rooftop_solar'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sun className="h-3.5 w-3.5 text-amber-500" />
            Rooftop Solar
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('solar_pumps')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              selectedCategory === 'solar_pumps'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Droplets className="h-3.5 w-3.5 text-sky-500" />
            Agricultural Solar Pumps
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('solar_water_heater')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              selectedCategory === 'solar_water_heater'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            Solar Water Heating
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Badge variant="emerald" size="sm">
            {centralCount} Central
          </Badge>
          <Badge variant="blue" size="sm">
            {stateCount} State Schemes
          </Badge>
        </div>
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schemes.map((scheme) => (
          <SchemeCard
            key={scheme.id}
            scheme={scheme}
            onOpenDetails={(s) => setSelectedSchemeForModal(s)}
          />
        ))}
      </div>

      {/* Empty State */}
      {schemes.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-md mx-auto space-y-3">
          <AlertCircle className="h-10 w-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Schemes Found in this Category</h3>
          <p className="text-xs text-slate-500">
            Try switching the category filter to "All Schemes" or selecting a different state.
          </p>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className="text-xs font-semibold text-emerald-700 hover:underline pt-1"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Educational Infographic: How DBT Subsidies Work */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              How Direct Benefit Transfer (DBT) Subsidies Work
            </h3>
            <p className="text-xs text-slate-500">
              Understanding the 4-stage transparent subsidy lifecycle under PM Surya Ghar Muft Bijli Yojana
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Stage 1</span>
            <h4 className="text-sm font-bold text-slate-900">Online Feasibility</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Register on pmsuryaghar.gov.in with your consumer number. Your DISCOM technical team reviews transformer capacity and grants sanction.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Stage 2</span>
            <h4 className="text-sm font-bold text-slate-900">Empanelled Install</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Select a registered installer. Panels must be ALMM compliant and installed with a hot-dip galvanized structure.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Stage 3</span>
            <h4 className="text-sm font-bold text-slate-900">Net-Meter Energization</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              DISCOM electrical inspector tests the system, installs the bi-directional net-meter, and uploads the commissioning certificate online.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Stage 4</span>
            <h4 className="text-sm font-bold text-slate-900">Direct Bank Transfer</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Submit your cancelled cheque on the portal. The central subsidy (up to ₹78,000) is deposited directly into your Aadhaar-linked bank account.
            </p>
          </div>
        </div>
      </div>

      {/* Scheme Detail Assistant Modal */}
      <SchemeDetailModal
        isOpen={Boolean(selectedSchemeForModal)}
        onClose={() => setSelectedSchemeForModal(null)}
        scheme={selectedSchemeForModal}
        initialState={selectedState}
        initialDiscom={selectedDiscom}
      />
    </div>
  );
};
