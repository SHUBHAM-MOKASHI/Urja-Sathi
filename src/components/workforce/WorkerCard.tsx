import React from 'react';
import { DetailedWorkerProfile } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatCurrency } from '../../utils/formatters';
import {
  ShieldCheck,
  Star,
  MapPin,
  AlertCircle,
  FileBadge,
} from 'lucide-react';

interface WorkerCardProps {
  worker: DetailedWorkerProfile;
  onBook: (worker: DetailedWorkerProfile) => void;
  onViewProfile: (worker: DetailedWorkerProfile) => void;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({
  worker,
  onBook,
  onViewProfile,
}) => {
  const getRoleBadge = () => {
    switch (worker.roleCategory) {
      case 'surya_mitra_technician':
        return (
          <Badge variant="emerald" size="sm">
            Surya Mitra Solar Tech
          </Badge>
        );
      case 'licensed_wireman':
        return (
          <Badge variant="blue" size="sm">
            Licensed Wireman
          </Badge>
        );
      case 'energy_auditor':
        return (
          <Badge variant="forest" size="sm">
            BEE Energy Auditor
          </Badge>
        );
      case 'community_energy_guide':
        return (
          <Badge variant="amber" size="sm">
            Community Energy Guide
          </Badge>
        );
      default:
        return <Badge variant="slate" size="sm">Energy Worker</Badge>;
    }
  };

  const getVerificationBadge = () => {
    switch (worker.verificationStatus) {
      case 'verified_licensed':
        return (
          <Badge variant="emerald" size="sm" icon={<ShieldCheck className="h-3 w-3 text-emerald-600" />}>
            Govt Verified License
          </Badge>
        );
      case 'verification_pending':
        return (
          <Badge variant="amber" size="sm" icon={<AlertCircle className="h-3 w-3" />}>
            Verification In Progress
          </Badge>
        );
      case 'self_declared_only':
        return (
          <Badge variant="slate" size="sm">
            Non-Technical Guide
          </Badge>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-3.5">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {getRoleBadge()}
          <div className="flex items-center gap-1.5">
            {worker.isDemoProfile && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                Demo Profile
              </span>
            )}
            {getVerificationBadge()}
          </div>
        </div>

        {/* Worker Header & Rating */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                {worker.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {worker.locality} ({worker.pincode})
              </p>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                <span>{worker.rating}</span>
                <span className="text-slate-400 font-normal">({worker.reviewCount})</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold block">
                {worker.completedJobsCount} jobs completed
              </span>
            </div>
          </div>
        </div>

        {/* Independently Verified Qualification Callout */}
        {worker.verifiedQualifications.length > 0 ? (
          <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
              <FileBadge className="h-3.5 w-3.5 text-emerald-700" />
              Independently Verified Credential:
            </span>
            <div className="font-semibold text-slate-800">
              {worker.verifiedQualifications[0].certificateName}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              Lic #{worker.verifiedQualifications[0].certificateNumber} • {worker.verifiedQualifications[0].issuingAuthority}
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Non-Technical Role
            </span>
            <p className="text-[11px] text-slate-600 leading-snug">
              Assists with electricity bill analysis, tariff explanations, and PM Surya Ghar portal paperwork.
            </p>
          </div>
        )}

        {/* Self-Declared Skills List (Clearly separated!) */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Self-Assessed Service Competencies
          </span>
          <div className="flex flex-wrap gap-1.5">
            {worker.selfDeclaredSkills.slice(0, 2).map((skill, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium"
              >
                {skill.replace('Self-Assessed: ', '')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing & Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Standard Labor Rate</span>
          <span className="text-base font-bold text-slate-900">
            {formatCurrency(worker.hourlyRateInr)}
            <span className="text-xs font-normal text-slate-500"> / hour</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onViewProfile(worker)}>
            Credentials
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onBook(worker)}
            disabled={!worker.isAvailableToday}
          >
            {worker.isAvailableToday ? 'Book Visit' : 'Unavailable'}
          </Button>
        </div>
      </div>
    </div>
  );
};
