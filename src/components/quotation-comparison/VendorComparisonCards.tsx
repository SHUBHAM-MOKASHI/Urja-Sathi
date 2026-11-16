import React from 'react';
import { DetailedQuotation, QuotationEvaluation } from '../../types';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../utils/formatters';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  ArrowRight,
  Sparkles,
  MapPin,
} from 'lucide-react';

interface VendorComparisonCardsProps {
  quotations: DetailedQuotation[];
  evaluations: QuotationEvaluation[];
  onEdit: (quote: DetailedQuotation) => void;
  onDelete: (id: string) => void;
  onSelectForSolarAudit?: (quote: DetailedQuotation) => void;
}

const SAMPLE_IDS = new Set(['quote_tata_waaree', 'quote_budget_fabricator', 'quote_adani_bifacial']);

export const VendorComparisonCards: React.FC<VendorComparisonCardsProps> = ({
  quotations,
  evaluations,
  onEdit,
  onDelete,
  onSelectForSolarAudit,
}) => {
  const evalMap = new Map<string, QuotationEvaluation>();
  evaluations.forEach((e) => evalMap.set(e.quotationId, e));

  // Determine lowest price per Wp
  const minPricePerWp = Math.min(
    ...evaluations.map((e) => e.pricePerWattPeak).filter((p) => p > 0)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-600" />
            Vendor Proposal Overview Cards
          </h3>
          <p className="text-xs text-slate-500">
            Quick side-by-side synthesis before reviewing the in-depth technical audit table.
          </p>
        </div>
        <div className="text-xs text-slate-400 italic">
          * Impartial algorithmic ranking based on 100-point transparent score
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {quotations.map((quote) => {
          const evalData = evalMap.get(quote.id);
          const isTopRank = evalData?.rank === 1;
          const isSample = SAMPLE_IDS.has(quote.id) || quote.id.startsWith('quote_');
          const isLowestPrice = evalData?.pricePerWattPeak === minPricePerWp && minPricePerWp > 0;
          const redFlagsCount = evalData?.redFlags.length || 0;

          return (
            <div
              key={quote.id}
              className={`rounded-3xl border bg-white p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative ${
                isTopRank
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-50'
                  : 'border-slate-200/90'
              }`}
            >
              <div className="space-y-3.5">
                {/* Badges Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isTopRank ? (
                      <Badge variant="emerald" size="sm" icon={<Award className="h-3.5 w-3.5" />}>
                        #1 Recommended
                      </Badge>
                    ) : (
                      <Badge variant="slate" size="sm">
                        Rank #{evalData?.rank ?? '-'}
                      </Badge>
                    )}
                    {isSample && (
                      <Badge variant="amber" size="sm" icon={<Sparkles className="h-3 w-3" />}>
                        Demo Proposal
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(quote)}
                      className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Edit Quotation"
                      aria-label={`Edit ${quote.installerName}`}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(quote.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Quotation"
                      aria-label={`Delete ${quote.installerName}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Vendor Name & Location */}
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-snug tracking-tight">
                    {quote.installerName}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    {quote.installerCity && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {quote.installerCity}
                      </span>
                    )}
                    <span>•</span>
                    <span className={quote.isEmpanelledWithDiscom ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                      {quote.isEmpanelledWithDiscom ? 'DISCOM Empanelled' : 'Non-Empanelled'}
                    </span>
                  </div>
                </div>

                {/* Score & Pricing Grid */}
                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Overall Score</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span
                        className={`text-xl font-black ${
                          (evalData?.overallScore || 0) >= 80
                            ? 'text-emerald-700'
                            : (evalData?.overallScore || 0) >= 65
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {evalData?.overallScore || 0}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">/ 100</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block">Rate (₹/Wp)</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`text-base font-extrabold ${isLowestPrice ? 'text-emerald-700' : 'text-slate-900'}`}>
                        ₹{evalData?.pricePerWattPeak || 0}
                      </span>
                      <span className="text-[10px] text-slate-400">/Wp</span>
                    </div>
                  </div>

                  <div className="col-span-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Total Quoted Cost
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(quote.totalPriceInr)}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">({quote.systemCapacityKw} kW)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                        Est. Net Investment
                      </span>
                      <span className="text-sm font-black text-emerald-700">
                        {formatCurrency(evalData?.netCostAfterSubsidy || quote.totalPriceInr)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hardware & Warranty Summary */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500">Panels:</span>
                    <span className="font-semibold truncate max-w-[170px]" title={quote.panelManufacturer}>
                      {quote.panelManufacturer} ({quote.panelCellType || 'Mono'})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500">Inverter:</span>
                    <span className="font-semibold truncate max-w-[170px]" title={quote.inverterBrand}>
                      {quote.inverterBrand} ({quote.inverterWarrantyYears}y wty)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="text-slate-500">Net Metering:</span>
                    <span className={quote.discomNetMeteringLiaisoningIncluded ? 'text-emerald-700 font-semibold flex items-center gap-1' : 'text-rose-600 font-medium'}>
                      {quote.discomNetMeteringLiaisoningIncluded ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> Included Turnkey
                        </>
                      ) : (
                        'Customer Responsibility'
                      )}
                    </span>
                  </div>
                </div>

                {/* Risk Flags & Alerts */}
                {redFlagsCount > 0 ? (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                      <span>{redFlagsCount} Risk Alert{redFlagsCount > 1 ? 's' : ''} Identified</span>
                    </div>
                    <p className="text-[11px] text-rose-700 line-clamp-2 leading-relaxed">
                      {evalData?.redFlags[0]}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Clean technical and scope verification</span>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {onSelectForSolarAudit && (
                  <button
                    type="button"
                    onClick={() => onSelectForSolarAudit(quote)}
                    className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>Model in Solar ROI Audit</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
                {isTopRank && (
                  <div className="text-[10px] text-center text-slate-400">
                    * Top recommendation is algorithmically computed; URJA SAATHI does not take commissions or guarantee vendor performance.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
