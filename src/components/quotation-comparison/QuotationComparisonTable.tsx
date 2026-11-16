import React, { useState } from 'react';
import {
  DetailedQuotation,
  QuotationEvaluation,
  QuotationScoreCategory,
} from '../../types';
import { Badge } from '../common/Badge';
import {
  Award,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Edit2,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Wrench,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface QuotationComparisonTableProps {
  quotations: DetailedQuotation[];
  evaluations: QuotationEvaluation[];
  onEdit: (quote: DetailedQuotation) => void;
  onDelete: (id: string) => void;
  onSelectForSolarAudit?: (quote: DetailedQuotation) => void;
}

export const QuotationComparisonTable: React.FC<QuotationComparisonTableProps> = ({
  quotations,
  evaluations,
  onEdit,
  onDelete,
  onSelectForSolarAudit,
}) => {
  const [expandedVendorQuestions, setExpandedVendorQuestions] = useState<Record<string, boolean>>({});
  const [visibleVendorIds, setVisibleVendorIds] = useState<string[]>([]);

  const toggleQuestions = (id: string) => {
    setExpandedVendorQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const evalMap = new Map<string, QuotationEvaluation>();
  evaluations.forEach((e) => evalMap.set(e.quotationId, e));

  // Determine displayed quotations (all, or selected subset for mobile 2-way comparison)
  const displayedQuotations = visibleVendorIds.length > 0
    ? quotations.filter((q) => visibleVendorIds.includes(q.id))
    : quotations;

  // Determine best values for subtle row highlights
  const minPricePerWp = Math.min(
    ...evaluations.map((e) => e.pricePerWattPeak).filter((p) => p > 0)
  );
  const maxInverterWarranty = Math.max(
    ...quotations.map((q) => q.inverterWarrantyYears || 0)
  );

  const toggleVendorFilter = (id: string) => {
    if (visibleVendorIds.length === 0) {
      // Switch from all to selecting 2: this one and the top recommendation
      const otherId = quotations.find((q) => q.id !== id)?.id;
      setVisibleVendorIds(otherId ? [id, otherId] : [id]);
    } else if (visibleVendorIds.includes(id)) {
      if (visibleVendorIds.length <= 1) {
        setVisibleVendorIds([]); // Reset to all
      } else {
        setVisibleVendorIds(visibleVendorIds.filter((vId) => vId !== id));
      }
    } else {
      if (visibleVendorIds.length >= 2) {
        // Replace second vendor to keep 2-way comparison clean
        setVisibleVendorIds([visibleVendorIds[0], id]);
      } else {
        setVisibleVendorIds([...visibleVendorIds, id]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Mobile/Narrow Screen Comparison Filter Bar */}
      {quotations.length > 2 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <span>Filter Active Columns:</span>
            <button
              type="button"
              onClick={() => setVisibleVendorIds([])}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                visibleVendorIds.length === 0
                  ? 'bg-emerald-700 text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Proposals ({quotations.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Select to compare:</span>
            {quotations.map((q) => {
              const isSelected = visibleVendorIds.length === 0 || visibleVendorIds.includes(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggleVendorFilter(q.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all max-w-[150px] truncate ${
                    isSelected
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold'
                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title={q.installerName}
                >
                  {q.installerName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Horizontal Scroll Hint */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>Detailed Technical Specifications & Red Flags</span>
        <span className="hidden sm:inline text-slate-400">← Swipe or scroll horizontally to inspect columns →</span>
      </div>

      {/* Scrollable Container with sticky parameter column */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-sm bg-white">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            {/* Header row: Installer names, scores, actions */}
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th className="p-4 w-56 min-w-[200px] text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50/95 backdrop-blur-sm z-10 border-r border-slate-200">
                Evaluation Metric
              </th>
              {displayedQuotations.map((quote) => {
                const evalData = evalMap.get(quote.id);
                const isTopRank = evalData?.rank === 1;

                return (
                  <th
                    key={quote.id}
                    className={`p-4 min-w-[260px] align-top transition-colors border-r border-slate-200 last:border-r-0 ${
                      isTopRank ? 'bg-emerald-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {isTopRank ? (
                            <Badge variant="emerald" size="sm" icon={<Award className="h-3 w-3" />}>
                              #1 Recommended
                            </Badge>
                          ) : (
                            <Badge variant="slate" size="sm">
                              Rank #{evalData?.rank || '-'}
                            </Badge>
                          )}
                          <h4 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                            {quote.installerName}
                          </h4>
                          {quote.installerCity && (
                            <p className="text-xs text-slate-500">{quote.installerCity}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => onEdit(quote)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Edit Quotation"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(quote.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Quotation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Overall Explainable Score Card */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-slate-600">Overall Score:</span>
                          <span
                            className={`text-lg font-black ${
                              (evalData?.overallScore || 0) >= 80
                                ? 'text-emerald-600'
                                : (evalData?.overallScore || 0) >= 65
                                ? 'text-amber-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {evalData?.overallScore || 0}
                            <span className="text-xs font-normal text-slate-400">/100</span>
                          </span>
                        </div>

                        {/* Category score mini bars */}
                        <div className="space-y-1 pt-1 text-[11px]">
                          {evalData?.scoreCategories.map((cat: QuotationScoreCategory) => (
                            <div key={cat.category} className="space-y-0.5">
                              <div className="flex justify-between text-slate-500">
                                <span>{cat.category}</span>
                                <span className="font-medium text-slate-700">
                                  {cat.score}/{cat.maxScore}
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    cat.score / cat.maxScore >= 0.8
                                      ? 'bg-emerald-500'
                                      : cat.score / cat.maxScore >= 0.6
                                      ? 'bg-amber-500'
                                      : 'bg-rose-400'
                                  }`}
                                  style={{ width: `${(cat.score / cat.maxScore) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {onSelectForSolarAudit && (
                        <button
                          type="button"
                          onClick={() => onSelectForSolarAudit(quote)}
                          className="w-full text-xs font-medium py-1.5 px-2.5 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 flex items-center justify-center gap-1 transition-colors"
                        >
                          Use in Solar Feasibility <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs">
            {/* ---------------- SECTION: COMMERCIALS ---------------- */}
            <tr className="bg-slate-100/70">
              <td
                colSpan={displayedQuotations.length + 1}
                className="py-2 px-4 font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5"
              >
                <Zap className="h-3.5 w-3.5 text-emerald-600" /> Commercials & Subsidies
              </td>
            </tr>

            {/* Total Price */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Total Quoted Price
              </td>
              {displayedQuotations.map((q) => (
                <td key={q.id} className="p-3.5 font-bold text-slate-900 border-r border-slate-200 last:border-r-0">
                  <div className="text-sm">{formatCurrency(q.totalPriceInr)}</div>
                  <div className="text-[11px] text-slate-400 font-normal">Gross vendor proposal</div>
                </td>
              ))}
            </tr>

            {/* System Capacity */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                System Capacity
              </td>
              {displayedQuotations.map((q) => (
                <td key={q.id} className="p-3.5 font-bold text-slate-900 border-r border-slate-200 last:border-r-0">
                  {q.systemCapacityKw} kW
                </td>
              ))}
            </tr>

            {/* Price per Watt */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Price per Watt Peak (₹/Wp)
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">Benchmark: ~₹58/Wp</div>
              </td>
              {displayedQuotations.map((q) => {
                const evalData = evalMap.get(q.id);
                const wp = evalData?.pricePerWattPeak || 0;
                const isLowest = wp === minPricePerWp && wp > 0;
                const isSuspicious = wp < 45;

                return (
                  <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isLowest && !isSuspicious ? 'text-emerald-700' : 'text-slate-900'}`}>
                        ₹{wp} / Wp
                      </span>
                      {isLowest && !isSuspicious && (
                        <Badge variant="emerald" size="sm">
                          Lowest
                        </Badge>
                      )}
                      {isSuspicious && (
                        <Badge variant="rose" size="sm">
                          Unusually Low
                        </Badge>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Net Cost After PM Surya Ghar Subsidy */}
            <tr className="bg-emerald-50/20">
              <td className="p-3.5 font-semibold text-emerald-950 sticky left-0 bg-emerald-50/90 z-10 border-r border-slate-200">
                Est. Net Investment
                <div className="text-[10px] text-emerald-700 font-normal">
                  After PM Surya Ghar Subsidy
                </div>
              </td>
              {displayedQuotations.map((q) => {
                const evalData = evalMap.get(q.id);
                return (
                  <td key={q.id} className="p-3.5 font-black text-emerald-700 text-sm border-r border-slate-200 last:border-r-0">
                    {formatCurrency(evalData?.netCostAfterSubsidy || q.totalPriceInr)}
                  </td>
                );
              })}
            </tr>

            {/* ---------------- SECTION: HARDWARE SPECIFICATIONS ---------------- */}
            <tr className="bg-slate-100/70">
              <td
                colSpan={displayedQuotations.length + 1}
                className="py-2 px-4 font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Hardware Quality & Warranties
              </td>
            </tr>

            {/* Solar Panel */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Solar Panel Manufacturer & Model
              </td>
              {displayedQuotations.map((q) => (
                <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                  <div className="font-bold text-slate-800">{q.panelManufacturer}</div>
                  <div className="text-[11px] text-slate-500">{q.panelModel || 'Standard Module'}</div>
                  {q.panelCellType && (
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {q.panelCellType}
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Panel Warranty: Performance vs Product */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Panel Warranty Transparency
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                  Product vs 25-yr Degradation
                </div>
              </td>
              {displayedQuotations.map((q) => (
                <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700">{q.panelProductWarrantyYears} Years</span>
                    <span className="text-[11px] text-slate-400 ml-1">Product</span>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-700">{q.panelPerformanceWarrantyYears} Years</span>
                    <span className="text-[11px] text-slate-400 ml-1">Performance (80% power)</span>
                  </div>
                </td>
              ))}
            </tr>

            {/* Inverter Specs & Warranty */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Inverter & Inverter Warranty
              </td>
              {displayedQuotations.map((q) => {
                const isMaxWarranty = q.inverterWarrantyYears === maxInverterWarranty && maxInverterWarranty >= 8;
                return (
                  <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                    <div className="font-bold text-slate-800">{q.inverterBrand}</div>
                    <div className="text-[11px] text-slate-500">
                      {q.inverterCapacityKw} kW • {q.inverterType.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900">
                        {q.inverterWarrantyYears} Years Warranty
                      </span>
                      {isMaxWarranty && (
                        <Badge variant="emerald" size="sm">
                          Longest
                        </Badge>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Mounting Structure & Workmanship */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Mounting Structure & Workmanship
              </td>
              {displayedQuotations.map((q) => {
                const isHdg = q.mountingStructureType === 'hot_dip_galvanized' || q.mountingStructureType === 'aluminum';
                return (
                  <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0 space-y-1">
                    <div className="font-medium text-slate-800 capitalize flex items-center gap-1">
                      {q.mountingStructureType.replace(/_/g, ' ')}
                      {isHdg ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {q.workmanshipWarrantyYears} years workmanship warranty
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* ---------------- SECTION: REGULATORY & SCOPE ---------------- */}
            <tr className="bg-slate-100/70">
              <td
                colSpan={displayedQuotations.length + 1}
                className="py-2 px-4 font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5"
              >
                <FileCheck className="h-3.5 w-3.5 text-emerald-600" /> DISCOM Approvals & Liaisoning
              </td>
            </tr>

            {/* DISCOM Net Metering Liaisoning */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Net-Metering Liaisoning Included
                <div className="text-[10px] text-slate-400 font-normal">DISCOM paperwork & CEIG inspection</div>
              </td>
              {displayedQuotations.map((q) => (
                <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                  {q.discomNetMeteringLiaisoningIncluded ? (
                    <Badge variant="emerald" size="sm" icon={<CheckCircle2 className="h-3 w-3" />}>
                      Turnkey (Included)
                    </Badge>
                  ) : (
                    <Badge variant="rose" size="sm" icon={<AlertTriangle className="h-3 w-3" />}>
                      Customer Responsibility
                    </Badge>
                  )}
                </td>
              ))}
            </tr>

            {/* DISCOM Empanelled */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                DISCOM Empanelled Vendor
                <div className="text-[10px] text-slate-400 font-normal">Mandatory for PM Surya Ghar subsidy</div>
              </td>
              {displayedQuotations.map((q) => (
                <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                  {q.isEmpanelledWithDiscom ? (
                    <Badge variant="emerald" size="sm">
                      Empanelled
                    </Badge>
                  ) : (
                    <Badge variant="amber" size="sm">
                      Non-Empanelled
                    </Badge>
                  )}
                </td>
              ))}
            </tr>

            {/* Installation Timeline */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Estimated Timeline
              </td>
              {displayedQuotations.map((q) => (
                <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0 font-medium text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {q.estimatedTimelineDays} Days
                  </span>
                </td>
              ))}
            </tr>

            {/* ---------------- SECTION: SERVICE & MAINTENANCE ---------------- */}
            <tr className="bg-slate-100/70">
              <td
                colSpan={displayedQuotations.length + 1}
                className="py-2 px-4 font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5"
              >
                <Wrench className="h-3.5 w-3.5 text-emerald-600" /> After-Sales Service & SLAs
              </td>
            </tr>

            {/* Free Maintenance / AMC */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Free Maintenance / AMC
              </td>
              {displayedQuotations.map((q) => (
                <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0 font-medium">
                  {q.freeMaintenanceYears > 0 ? (
                    <span className="text-emerald-700 font-semibold">
                      {q.freeMaintenanceYears} Years Included
                    </span>
                  ) : (
                    <span className="text-slate-400">None (Chargeable)</span>
                  )}
                  {q.cleaningVisitsPerYear ? (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {q.cleaningVisitsPerYear} cleaning visits/yr
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>

            {/* Local Service Center & SLA */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Local Service Center & SLA
              </td>
              {displayedQuotations.map((q) => (
                <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0 space-y-1">
                  <div>
                    {q.hasLocalServiceCenter ? (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Local Center
                      </span>
                    ) : (
                      <span className="text-slate-400">Remote Only</span>
                    )}
                  </div>
                  <div>
                    {q.guaranteedResponseTimeHours > 0 ? (
                      <span className="font-semibold text-slate-800">
                        {q.guaranteedResponseTimeHours}-Hour SLA
                      </span>
                    ) : (
                      <span className="text-rose-600 font-medium">No SLA stated</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Remote App */}
            <tr>
              <td className="p-3.5 font-semibold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-200">
                Remote Monitoring App
              </td>
              {displayedQuotations.map((q) => (
                <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0">
                  {q.hasRemoteMonitoringApp ? (
                    <Badge variant="emerald" size="sm">
                      WiFi App Included
                    </Badge>
                  ) : (
                    <Badge variant="slate" size="sm">
                      Not Included
                    </Badge>
                  )}
                </td>
              ))}
            </tr>

            {/* ---------------- SECTION: AUDIT & RED FLAGS ---------------- */}
            <tr className="bg-slate-100/70">
              <td
                colSpan={displayedQuotations.length + 1}
                className="py-2 px-4 font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Missing Information & Red Flags
              </td>
            </tr>

            {/* Red Flags / Critical Scope Gaps */}
            <tr>
              <td className="p-3.5 font-semibold text-rose-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                Critical Red Flags
              </td>
              {displayedQuotations.map((q) => {
                const evalData = evalMap.get(q.id);
                const hasRedFlags = evalData && evalData.redFlags.length > 0;

                return (
                  <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0 align-top">
                    {hasRedFlags ? (
                      <div className="space-y-1.5">
                        {evalData.redFlags.map((rf, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200/80 flex items-start gap-1.5 font-medium leading-relaxed"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>{rf}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> No critical red flags detected
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Missing Info */}
            <tr>
              <td className="p-3.5 font-semibold text-amber-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                Missing / Unverified Details
              </td>
              {displayedQuotations.map((q) => {
                const evalData = evalMap.get(q.id);
                const hasMissing = evalData && evalData.missingInformation.length > 0;

                return (
                  <td key={q.id} className="p-3.5 border-r border-slate-200 last:border-r-0 align-top">
                    {hasMissing ? (
                      <div className="space-y-1">
                        {evalData.missingInformation.map((mi, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] text-amber-800 bg-amber-50/70 p-1.5 rounded border border-amber-200/60 flex items-start gap-1"
                          >
                            <HelpCircle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                            <span>{mi}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">All required specs confirmed</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tailored Vendor Questions Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-emerald-600" />
              Tailored Clarification & Negotiation Questions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ask these specific questions to each installer before signing contracts or paying advances.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotations.map((q) => {
            const evalData = evalMap.get(q.id);
            const questions = evalData?.vendorQuestionsToAsk || [];
            const isExpanded = expandedVendorQuestions[q.id] ?? true;

            return (
              <div
                key={q.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {q.installerName}
                  </h4>
                  <button
                    type="button"
                    onClick={() => toggleQuestions(q.id)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {isExpanded && (
                  <ul className="space-y-2">
                    {questions.length > 0 ? (
                      questions.map((ques, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200/60 flex items-start gap-2 leading-relaxed"
                        >
                          <span className="font-bold text-emerald-600 shrink-0">{idx + 1}.</span>
                          <span>{ques}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-slate-500 italic">
                        Standard contract verification: confirm net-metering timeline in writing.
                      </li>
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
