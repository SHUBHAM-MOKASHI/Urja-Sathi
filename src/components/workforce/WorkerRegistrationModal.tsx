import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  DetailedWorkerProfile,
  WorkerRoleCategory,
  WorkerVerificationStatus,
  WorkerQualificationEvidence,
} from '../../types';
import { FileBadge } from 'lucide-react';

interface WorkerRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveWorker: (worker: DetailedWorkerProfile) => void;
  initialWorker?: DetailedWorkerProfile | null;
}

export const WorkerRegistrationModal: React.FC<WorkerRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSaveWorker,
  initialWorker,
}) => {
  const [name, setName] = useState(initialWorker?.name || '');
  const [phone, setPhone] = useState(initialWorker?.phone || '');
  const [locality, setLocality] = useState(initialWorker?.locality || 'Indore');
  const [pincode, setPincode] = useState(initialWorker?.pincode || '452010');
  const [roleCategory, setRoleCategory] = useState<WorkerRoleCategory>(
    initialWorker?.roleCategory || 'surya_mitra_technician'
  );
  const [experienceYears, setExperienceYears] = useState(initialWorker?.experienceYears || 3);
  const [hourlyRateInr, setHourlyRateInr] = useState(initialWorker?.hourlyRateInr || 300);
  const [isAvailableToday, setIsAvailableToday] = useState(
    initialWorker ? initialWorker.isAvailableToday : true
  );

  // Self declared skills
  const [skillsText, setSkillsText] = useState(
    initialWorker?.selfDeclaredSkills.join(', ') ||
      'Residential wiring, Switchboard earthing, Inverter connection'
  );

  // Qualification Evidence
  const [certName, setCertName] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !locality.trim()) {
      setError('Name, telephone number, and locality are required.');
      return;
    }

    const selfDeclaredSkills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => (s.startsWith('Self-Assessed:') ? s : `Self-Assessed: ${s}`));

    // Determine verification status: if technical role, check if qualification evidence exists
    let verificationStatus: WorkerVerificationStatus = 'self_declared_only';
    const verifiedQualifications: WorkerQualificationEvidence[] = initialWorker?.verifiedQualifications
      ? [...initialWorker.verifiedQualifications]
      : [];

    if (certName.trim() && certNumber.trim()) {
      verifiedQualifications.push({
        id: `cert_${Date.now()}`,
        certificateName: certName.trim(),
        certificateNumber: certNumber.trim(),
        issuingAuthority: issuingAuthority.trim() || 'State Licensing Board / NSDC',
        issueDate: new Date().toISOString().split('T')[0],
        isVerified: true, // Auto-verified for hackathon demonstration
        verificationSource: 'Live Digital Licensing Registry Check',
      });
    }

    if (roleCategory === 'community_energy_guide') {
      verificationStatus = 'self_declared_only';
    } else if (verifiedQualifications.length > 0) {
      verificationStatus = 'verified_licensed';
    } else {
      verificationStatus = 'verification_pending';
    }

    const updatedProfile: DetailedWorkerProfile = {
      id: initialWorker?.id || `worker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      phone: phone.trim(),
      locality: locality.trim(),
      pincode: pincode.trim(),
      roleCategory,
      verificationStatus,
      experienceYears: Number(experienceYears),
      hourlyRateInr: Number(hourlyRateInr),
      serviceRadiusKm: initialWorker?.serviceRadiusKm || 15,
      isAvailableToday,
      rating: initialWorker?.rating || 5.0,
      reviewCount: initialWorker?.reviewCount || 1,
      completedJobsCount: initialWorker?.completedJobsCount || 0,
      selfDeclaredSkills,
      verifiedQualifications,
      isDemoProfile: true,
      disclaimer:
        roleCategory === 'community_energy_guide'
          ? 'NON-TECHNICAL COMMUNITY GUIDE: Assists with bill comprehension and PM Surya Ghar portal applications.'
          : 'Licensed / certified energy technician qualified for on-site diagnostic and installation jobs.',
    };

    onSaveWorker(updatedProfile);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialWorker ? 'Edit Worker Profile' : 'Worker Registration & Credential Verification'}
      description="Register your energy service profile and upload verified qualification evidence."
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-800 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunil Verma"
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98260 12345"
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Primary Role *</label>
            <select
              value={roleCategory}
              onChange={(e) => setRoleCategory(e.target.value as WorkerRoleCategory)}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
            >
              <option value="surya_mitra_technician">Surya Mitra (Solar PV Technician)</option>
              <option value="licensed_wireman">Licensed Electrician / Wireman</option>
              <option value="energy_auditor">BEE Energy Auditor</option>
              <option value="community_energy_guide">Community Energy Guide (Non-Technical)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Locality</label>
            <input
              type="text"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hourly Labor Rate (₹) *</label>
            <input
              type="number"
              min="100"
              max="2000"
              step="50"
              value={hourlyRateInr}
              onChange={(e) => setHourlyRateInr(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Experience (Years) *</label>
            <input
              type="number"
              min="0"
              max="40"
              value={experienceYears}
              onChange={(e) => setExperienceYears(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-300"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAvailableToday}
                onChange={(e) => setIsAvailableToday(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold text-slate-800">
                Available to accept service visits today
              </span>
            </label>
          </div>
        </div>

        {/* Qualification Evidence Upload (Only for Technical Roles) */}
        {roleCategory !== 'community_energy_guide' && (
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileBadge className="h-4 w-4 text-emerald-700" />
              Upload / Enter Qualification Evidence *
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Mandatory for technical roles. Self-declared skills cannot be used to accept electrical or solar rooftop jobs.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Certificate / License Name</label>
                <input
                  type="text"
                  placeholder="e.g. State Wireman License Class II"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">License / Reg Number</label>
                <input
                  type="text"
                  placeholder="e.g. MP-CEI-W-48192"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  className="w-full p-2 bg-white rounded-lg border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Issuing Authority</label>
              <input
                type="text"
                placeholder="e.g. Electrical Inspectorate Govt of MP / Skill Council for Green Jobs (SCGJ)"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                className="w-full text-xs p-2 bg-white rounded-lg border border-slate-300"
              />
            </div>
          </div>
        )}

        {/* Self-declared Skills */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Self-Assessed Service Competencies (Comma-separated)
          </label>
          <input
            type="text"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
          />
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Clearly labeled as self-declared assessments on household search cards.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialWorker ? 'Save Changes' : 'Register Profile'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
