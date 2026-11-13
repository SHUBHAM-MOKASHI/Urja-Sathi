import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { DetailedWorkerProfile } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  ShieldCheck,
  Star,
  MapPin,
  FileBadge,
  Scale,
  Lock,
} from 'lucide-react';

interface WorkerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: DetailedWorkerProfile | null;
  onBook: (worker: DetailedWorkerProfile) => void;
}

export const WorkerProfileModal: React.FC<WorkerProfileModalProps> = ({
  isOpen,
  onClose,
  worker,
  onBook,
}) => {
  if (!worker) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${worker.name} — Practitioner Dossier`}
      description="Full qualification verification, licensing registry data, and verified competence breakdown."
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{worker.name}</h3>
              {worker.isDemoProfile && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  Demo Profile
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {worker.locality} ({worker.pincode}) • {worker.serviceRadiusKm} km coverage radius
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-right">
            <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span>{worker.rating}</span>
              <span className="text-xs font-normal text-slate-400">({worker.reviewCount} reviews)</span>
            </div>
            <span className="text-xs font-semibold text-emerald-700">
              {worker.completedJobsCount} verified jobs
            </span>
          </div>
        </div>

        {/* Section 1: Independently Verified Government Credentials */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileBadge className="h-4 w-4 text-emerald-600" />
              1. Independently Verified Government Credentials
            </h4>
            <Badge
              variant={worker.verificationStatus === 'verified_licensed' ? 'emerald' : 'amber'}
              size="sm"
            >
              {worker.verificationStatus === 'verified_licensed'
                ? 'Verified Licensed'
                : 'Pending / Unverified'}
            </Badge>
          </div>

          {worker.verifiedQualifications.length > 0 ? (
            <div className="space-y-3">
              {worker.verifiedQualifications.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm">{cert.certificateName}</span>
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" />
                      {cert.isVerified ? 'Verified Active' : 'Under Review'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Registration / License Number</span>
                      <span className="font-mono font-bold text-slate-900">{cert.certificateNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Issuing Authority</span>
                      <span className="font-medium text-slate-800">{cert.issuingAuthority}</span>
                    </div>
                  </div>

                  {cert.verificationSource && (
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-emerald-200/60">
                      Audit Trail: {cert.verificationSource}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600 space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-slate-400" />
                No Independent Electrical License on File
              </div>
              <p className="leading-relaxed text-slate-500">
                This worker operates as a non-technical Community Energy Guide. For household safety, non-technical guides are strictly restricted from accepting electrical repairs, breaker wiring, or solar rooftop installations.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Self-Declared Skills (Clearly Segregated!) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. Self-Declared Experience (Unverified Self-Assessment)
            </h4>
            <span className="text-[10px] text-slate-400 italic">
              Self-declared • Not government certified
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex flex-wrap gap-2">
              {worker.selfDeclaredSkills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              Disclaimer: Self-declared skills reflect the worker's personal experience claim. URJA SAATHI does not certify self-declared competencies.
            </p>
          </div>
        </div>

        {/* Section 3: Anti-Kickback & Fair Compensation Policy */}
        <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-950 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-sky-900">
            <Scale className="h-4 w-4 text-sky-700" />
            Independent Service Guarantee • Zero Solar Referral Kickbacks
          </div>
          <p className="text-[11px] text-sky-800 leading-relaxed">
            URJA SAATHI strictly prohibits workers from receiving sales commissions or referral kickbacks for recommending specific solar equipment or EPC contractors. Workers are compensated transparently for their service time ({formatCurrency(worker.hourlyRateInr)}/hour) to guarantee conflict-free community guidance.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500">Service Fee:</span>
            <span className="text-sm font-bold text-slate-900 ml-1">
              {formatCurrency(worker.hourlyRateInr)} / hr
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onBook(worker);
              }}
              disabled={!worker.isAvailableToday}
            >
              {worker.isAvailableToday ? 'Request Service Visit' : 'Worker Offline'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

