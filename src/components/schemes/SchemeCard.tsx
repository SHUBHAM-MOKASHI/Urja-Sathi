import React from 'react';
import { GovernmentScheme } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { isPolicyOutdated } from '../../services/schemeGuidanceService';
import { formatCurrency } from '../../utils/formatters';
import {
  Sun,
  Droplets,
  Zap,
  Flame,
  BatteryCharging,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Building,
} from 'lucide-react';

interface SchemeCardProps {
  scheme: GovernmentScheme;
  onOpenDetails: (scheme: GovernmentScheme) => void;
}

export const SchemeCard: React.FC<SchemeCardProps> = ({ scheme, onOpenDetails }) => {
  const isOutdated = isPolicyOutdated(scheme.lastVerifiedDate, scheme.isUnverifiedOrOutdated);

  const getCategoryIcon = () => {
    switch (scheme.category) {
      case 'rooftop_solar':
        return <Sun className="h-5 w-5 text-amber-500" />;
      case 'solar_pumps':
        return <Droplets className="h-5 w-5 text-sky-500" />;
      case 'appliance_efficiency':
        return <Zap className="h-5 w-5 text-emerald-500" />;
      case 'solar_water_heater':
        return <Flame className="h-5 w-5 text-orange-500" />;
      case 'battery_storage':
        return <BatteryCharging className="h-5 w-5 text-purple-500" />;
      default:
        return <Sun className="h-5 w-5 text-emerald-600" />;
    }
  };

  const getCategoryName = () => {
    switch (scheme.category) {
      case 'rooftop_solar':
        return 'Residential Rooftop Solar';
      case 'solar_pumps':
        return 'Agricultural Solar Pump';
      case 'appliance_efficiency':
        return 'Appliance Efficiency';
      case 'solar_water_heater':
        return 'Solar Water Heater';
      case 'battery_storage':
        return 'Battery Energy Storage';
      default:
        return 'Clean Energy Scheme';
    }
  };

  return (
    <div
      className={`rounded-3xl border bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5 ${
        isOutdated ? 'border-amber-300/80 bg-amber-50/10' : 'border-slate-200/90'
      }`}
    >
      <div className="space-y-4">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant={scheme.level === 'central' ? 'emerald' : 'blue'} size="sm">
              {scheme.level === 'central' ? 'Central National Scheme' : 'State Scheme'}
            </Badge>
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              {getCategoryIcon()}
              {getCategoryName()}
            </span>
          </div>

          {/* Verification Status Badge */}
          {isOutdated ? (
            <Badge variant="amber" size="sm" icon={<AlertTriangle className="h-3 w-3" />}>
              Policy Verification Pending
            </Badge>
          ) : (
            <Badge variant="slate" size="sm" icon={<ShieldCheck className="h-3 w-3 text-emerald-600" />}>
              Verified ({scheme.lastVerifiedDate})
            </Badge>
          )}
        </div>

        {/* Title & Tagline */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug">
            {scheme.name}
          </h3>
          <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
            {scheme.tagline}
          </p>
        </div>

        {/* Administering Agency & Gazette Notification */}
        <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{scheme.administeringAgency}</span>
          </div>
          {scheme.gazetteNotificationNumber && (
            <div className="text-[10px] text-slate-400 truncate">
              Order: {scheme.gazetteNotificationNumber}
            </div>
          )}
        </div>

        {/* Subsidy Slabs Preview */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Financial Assistance Structure
          </span>
          <div className="space-y-1.5">
            {scheme.slabs.slice(0, 3).map((slab, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100/80 text-xs"
              >
                <span className="font-semibold text-slate-700">{slab.capacityRange}</span>
                <span className="font-bold text-emerald-800">
                  {slab.maxSubsidyInr > 0 ? formatCurrency(slab.maxSubsidyInr) : slab.subsidyFormula}
                </span>
              </div>
            ))}
            {scheme.slabs.length > 3 && (
              <span className="text-[11px] text-slate-400 font-medium pl-1 block">
                + {scheme.slabs.length - 3} more category slabs (RWA/Group Housing)
              </span>
            )}
          </div>
        </div>

        {/* Outdated Warning Notice Alert */}
        {isOutdated && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Policy Audit Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              {scheme.outdatedWarningNotice ||
                `This scheme was last verified on ${scheme.lastVerifiedDate}. Regulatory orders or subsidy caps may have been updated. Verify with your DISCOM before applying.`}
            </p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <a
          href={scheme.officialApplicationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors hover:underline"
          title="Opens authorized government portal"
        >
          <span>Official Portal</span>
          <ExternalLink className="h-3 w-3" />
        </a>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onOpenDetails(scheme)}
          icon={<FileCheck className="h-3.5 w-3.5" />}
          className="w-full sm:w-auto"
        >
          Eligibility & Checklist
        </Button>
      </div>
    </div>
  );
};
