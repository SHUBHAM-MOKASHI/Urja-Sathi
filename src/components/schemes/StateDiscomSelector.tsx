import React from 'react';
import { StateDiscomInfo } from '../../types';
import { MapPin, Building2 } from 'lucide-react';

interface StateDiscomSelectorProps {
  states: StateDiscomInfo[];
  selectedState: string;
  selectedDiscom: string;
  onSelectState: (stateName: string) => void;
  onSelectDiscom: (discomCode: string) => void;
}

export const StateDiscomSelector: React.FC<StateDiscomSelectorProps> = ({
  states,
  selectedState,
  selectedDiscom,
  onSelectState,
  onSelectDiscom,
}) => {
  const currentStateObj = states.find(
    (s) => s.stateName.toLowerCase() === selectedState.toLowerCase()
  );
  const discomList = currentStateObj ? currentStateObj.discoms : [];

  const popularStates = ['Madhya Pradesh', 'Delhi', 'Maharashtra', 'Gujarat', 'Uttar Pradesh', 'Rajasthan'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-600" />
            Select Your State & Electricity Distribution Company (DISCOM)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter central national policies and state-specific top-up subsidies applicable to your power utility.
          </p>
        </div>

        {/* Quick state chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Select:</span>
          {popularStates.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => onSelectState(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedState === st
                  ? 'bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* State Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            State / Union Territory *
          </label>
          <select
            value={selectedState}
            onChange={(e) => onSelectState(e.target.value)}
            className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          >
            {states.map((st) => (
              <option key={st.stateCode} value={st.stateName}>
                {st.stateName}
              </option>
            ))}
          </select>
        </div>

        {/* DISCOM Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            Electricity Distributor (DISCOM) *
          </label>
          <select
            value={selectedDiscom}
            onChange={(e) => onSelectDiscom(e.target.value)}
            className="w-full text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          >
            <option value="all">All DISCOMs in {selectedState}</option>
            {discomList.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
          {selectedDiscom !== 'all' && (
            <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
              <span>Consumer ID Format:</span>
              <span className="font-semibold text-emerald-800">
                {discomList.find((d) => d.code === selectedDiscom)?.consumerNumberFormat || 'Standard Account No'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

