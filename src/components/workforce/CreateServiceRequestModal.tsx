import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  DetailedWorkerProfile,
  ServiceRequest,
  ServiceRequestType,
} from '../../types';
import { isTechnicalServiceType } from '../../services/workforceMatchingService';
import {
  Sun,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface CreateServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ServiceRequest, 'id' | 'createdAt' | 'status' | 'isTechnical'>) => void;
  preselectedWorker?: DetailedWorkerProfile | null;
  availableWorkers: DetailedWorkerProfile[];
}

export const CreateServiceRequestModal: React.FC<CreateServiceRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  preselectedWorker,
  availableWorkers,
}) => {
  const [householdName, setHouseholdName] = useState('');
  const [householdPhone, setHouseholdPhone] = useState('');
  const [locality, setLocality] = useState('Indore');
  const [pincode, setPincode] = useState('452010');
  const [requestType, setRequestType] = useState<ServiceRequestType>('technical_electrical');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preferredDate, setPreferredDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Morning (9:00 AM - 12:00 PM)');
  const [assignedWorkerId, setAssignedWorkerId] = useState<string>('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedWorker) {
      setAssignedWorkerId(preselectedWorker.id);
      if (preselectedWorker.roleCategory === 'surya_mitra_technician') {
        setRequestType('technical_solar');
      } else if (preselectedWorker.roleCategory === 'community_energy_guide') {
        setRequestType('non_technical_guidance');
      } else if (preselectedWorker.roleCategory === 'energy_auditor') {
        setRequestType('technical_energy_audit');
      } else {
        setRequestType('technical_electrical');
      }
    } else {
      setAssignedWorkerId('');
    }
  }, [preselectedWorker, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!householdName.trim()) {
      setError('Household contact name is required.');
      return;
    }
    if (!householdPhone.trim()) {
      setError('Contact phone number is required.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError('Service issue title and detailed description are required.');
      return;
    }
    if (!consentGiven) {
      setError('Household privacy & contact-sharing consent is mandatory to dispatch.');
      return;
    }

    const isTechnical = isTechnicalServiceType(requestType);
    const selectedWorker = availableWorkers.find((w) => w.id === assignedWorkerId);

    // Safety validation: Technical electrical jobs cannot be assigned to non-technical community guides!
    if (isTechnical && selectedWorker) {
      if (
        selectedWorker.roleCategory === 'community_energy_guide' ||
        selectedWorker.verificationStatus !== 'verified_licensed'
      ) {
        setError(
          'Safety Mandate Violation: Technical electrical/solar work cannot be assigned to a non-technical community energy guide. Please choose a certified Wireman or Surya Mitra, or select Community Open Dispatch.'
        );
        return;
      }
    }

    onSubmit({
      householdName: householdName.trim(),
      householdPhone: householdPhone.trim(),
      locality: locality.trim(),
      pincode: pincode.trim(),
      requestType,
      title: title.trim(),
      description: description.trim(),
      preferredDate,
      preferredTimeSlot,
      assignedWorkerId: selectedWorker ? selectedWorker.id : undefined,
      assignedWorkerName: selectedWorker ? selectedWorker.name : undefined,
      consentGiven: true,
    });

    onClose();
  };

  const isTechnical = isTechnicalServiceType(requestType);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Energy Service Request"
      description="Book an independently verified technician or community energy guide in your neighborhood."
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-xs text-rose-800 rounded-xl flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {/* Section 1: Service Type Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            1. Select Service Category *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                requestType === 'technical_electrical'
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="reqType"
                value="technical_electrical"
                checked={requestType === 'technical_electrical'}
                onChange={() => setRequestType('technical_electrical')}
                className="mt-1 text-emerald-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Electrical Repair / Wiring</span>
                <span className="text-slate-500 text-[11px]">
                  MCB tripping, earthing test, 3-phase load balance (Licensed Wireman)
                </span>
              </div>
            </label>

            <label
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                requestType === 'technical_solar'
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="reqType"
                value="technical_solar"
                checked={requestType === 'technical_solar'}
                onChange={() => setRequestType('technical_solar')}
                className="mt-1 text-emerald-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Solar Rooftop Maintenance</span>
                <span className="text-slate-500 text-[11px]">
                  Inverter fault, PV testing, module cleaning (Surya Mitra)
                </span>
              </div>
            </label>

            <label
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                requestType === 'technical_energy_audit'
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="reqType"
                value="technical_energy_audit"
                checked={requestType === 'technical_energy_audit'}
                onChange={() => setRequestType('technical_energy_audit')}
                className="mt-1 text-emerald-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Home Energy Audit</span>
                <span className="text-slate-500 text-[11px]">
                  Thermal leak check, appliance power profile (BEE Auditor)
                </span>
              </div>
            </label>

            <label
              className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                requestType === 'non_technical_guidance'
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="reqType"
                value="non_technical_guidance"
                checked={requestType === 'non_technical_guidance'}
                onChange={() => setRequestType('non_technical_guidance')}
                className="mt-1 text-amber-600"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">Non-Technical Bill & Portal Guidance</span>
                <span className="text-slate-500 text-[11px]">
                  Bill slab reading, PM Surya Ghar doc prep (Community Guide)
                </span>
              </div>
            </label>
          </div>

          {/* Safety Notice */}
          {isTechnical ? (
            <div className="p-2.5 rounded-xl bg-slate-100 text-[11px] text-slate-600 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Technical Request: Can only be accepted by independently verified wiremen or Surya Mitra technicians.
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-50 text-[11px] text-amber-800 flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Non-Technical Assistance: Community Energy Guides provide door-to-door bill literacy and portal document support.
              </span>
            </div>
          )}
        </div>

        {/* Section 2: Household Contact & Location */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            2. Household Contact & Location *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Consumer / Household Name *</label>
              <input
                type="text"
                placeholder="e.g. Rameshwar Patidar"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone *</label>
              <input
                type="tel"
                placeholder="e.g. +91 98260 12345"
                value={householdPhone}
                onChange={(e) => setHouseholdPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Locality / Colony</label>
              <input
                type="text"
                placeholder="e.g. Vijay Nagar, Indore"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                placeholder="e.g. 452010"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Issue Description */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            3. Service Description *
          </label>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Headline *</label>
            <input
              type="text"
              placeholder="e.g. Inverter tripping during peak afternoon sun"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Detailed Description / Observed Symptoms *
            </label>
            <textarea
              rows={3}
              placeholder="Describe symptoms, appliance type, error code on meter/inverter, or what guidance you need..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Section 4: Preferred Slot & Worker Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Preferred Date</label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Preferred Time Window</label>
            <select
              value={preferredTimeSlot}
              onChange={(e) => setPreferredTimeSlot(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
            >
              <option value="Morning (9:00 AM - 12:00 PM)">Morning (9:00 AM - 12:00 PM)</option>
              <option value="Afternoon (1:00 PM - 4:00 PM)">Afternoon (1:00 PM - 4:00 PM)</option>
              <option value="Evening (4:00 PM - 7:00 PM)">Evening (4:00 PM - 7:00 PM)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Assign to Specific Worker (Optional)
          </label>
          <select
            value={assignedWorkerId}
            onChange={(e) => setAssignedWorkerId(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
          >
            <option value="">Community Open Dispatch (Match best available local worker)</option>
            {availableWorkers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} — {w.locality} ({w.roleCategory.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>

        {/* Section 5: Mandatory Privacy & Consent */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div className="text-xs text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900 block">
                Household Privacy & Contact Sharing Consent *
              </span>
              I consent to sharing my service address and telephone number with the assigned certified technician solely for the purpose of scheduling and conducting this requested service visit under URJA SAATHI privacy terms.
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Dispatch Service Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
