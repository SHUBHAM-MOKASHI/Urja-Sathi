import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  DetailedQuotation,
  QuotationComparisonResult,
} from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  Printer,
  ShieldCheck,
  AlertTriangle,
  Award,
  HelpCircle,
  FileText,
} from 'lucide-react';

interface QuotationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotations: DetailedQuotation[];
  comparisonResult: QuotationComparisonResult;
}

export const QuotationReportModal: React.FC<QuotationReportModalProps> = ({
  isOpen,
  onClose,
  quotations,
  comparisonResult,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const topScoringQuote = quotations.find(
    (q) => q.id === comparisonResult.topScoringQuotationId
  );
  const topEval = comparisonResult.evaluations.find(
    (e) => e.quotationId === comparisonResult.topScoringQuotationId
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Downloadable Quotation Comparison Report"
      description="Print or save this comprehensive solar installer evaluation dossier as a PDF."
      maxWidth="5xl"
    >
      <div className="space-y-6">
        {/* Print Trigger Top Bar */}
        <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
            <FileText className="h-4 w-4 text-emerald-700" />
            <span>Ready for PDF download or print. Take this dossier with you when meeting solar contractors.</span>
          </div>
          <Button variant="primary" size="sm" onClick={handlePrint} icon={<Printer className="h-4 w-4" />}>
            Print / Save as PDF
          </Button>
        </div>

        {/* Printable Document Container */}
        <div
          id="printable-quotation-report"
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 text-slate-800 space-y-6 print:border-none print:p-0"
        >
          {/* Header */}
          <div className="border-b-2 border-emerald-600 pb-4 flex flex-col sm:flex-row justify-between sm:items-end gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-forest-900 tracking-tight">URJA SAATHI</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Impartial Decision Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Har Ghar Bachat, Har Haath Kaam • Solar Installer Quotation Audit
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div>Date Generated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div>Benchmark Reference: ₹{comparisonResult.benchmarkPricePerWattPeak}/Wp</div>
            </div>
          </div>

          {/* Executive Summary */}
          {topScoringQuote && topEval && (
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Executive Verdict
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  <Award className="h-3.5 w-3.5" />
                  Recommended #1: {topScoringQuote.installerName} ({topEval.overallScore}/100)
                </span>
              </div>

              <div className="space-y-1.5">
                {comparisonResult.comparisonHighlights.map((highlight, idx) => (
                  <p key={idx} className="text-xs text-slate-700 leading-relaxed font-medium">
                    • {highlight}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Comparative Matrix Table */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Side-by-Side Proposal Breakdown
            </h4>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="p-3 font-bold text-slate-700 w-44">Parameter</th>
                    {quotations.map((q) => {
                      const evalData = comparisonResult.evaluations.find((e) => e.quotationId === q.id);
                      return (
                        <th key={q.id} className="p-3 font-bold text-slate-900 border-l border-slate-200">
                          <div>{q.installerName}</div>
                          <div className="text-[11px] font-normal text-slate-500">
                            Rank #{evalData?.rank} • {evalData?.overallScore}/100 pts
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Commercials */}
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-700 bg-slate-50">Total Quoted Price</td>
                    {quotations.map((q) => (
                      <td key={q.id} className="p-2.5 font-bold text-slate-900 border-l border-slate-100">
                        {formatCurrency(q.totalPriceInr)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-700 bg-slate-50">System Capacity</td>
                    {quotations.map((q) => (
                      <td key={q.id} className="p-2.5 font-medium border-l border-slate-100">
                        {q.systemCapacityKw} kW
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-700 bg-slate-50">Rate / Watt Peak (₹/Wp)</td>
                    {quotations.map((q) => {
                      const evalData = comparisonResult.evaluations.find((e) => e.quotationId === q.id);
                      return (
                        <td key={q.id} className="p-2.5 font-semibold text-slate-800 border-l border-slate-100">
                          ₹{evalData?.pricePerWattPeak} / Wp
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-emerald-900 bg-emerald-50/50">
                      Est. Net Cost (After Subsidy)
                    </td>
                    {quotations.map((q) => {
                      const evalData = comparisonResult.evaluations.find((e) => e.quotationId === q.id);
                      return (
                        <td key={q.id} className="p-2.5 font-bold text-emerald-700 border-l border-slate-100">
                          {formatCurrency(evalData?.netCostAfterSubsidy || q.totalPriceInr)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Hardware */}
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-700 bg-slate-50">Panel Make & Model</td>
                    {quotations.map((q) => (
                      <td key={q.id} className="p-2.5 border-l border-slate-100">
                        <span className="font-semibold">{q.panelManufacturer}</span> ({q.panelModel || 'Standard'})
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-700 bg-slate-50">Panel Warranties</td>
                    {quotations.map((q) => (
                      <td key={q.id} className="p-2.5 border-l border-slate-100">
                        {q.panelProductWarrantyYears}y Product • {q.panelPerformanceWarrantyYears}y Performance
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-700 bg-slate-50">Inverter & Warranty</td>
                    {quotations.map((q) => (
                      <td key={q.id} className="p-2.5 border-l border-slate-100">
                        <span className="font-semibold">{q.inverterBrand}</span> ({q.inverterWarrantyYears} Years)
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-700 bg-slate-50">Mounting Structure</td>
                    {quotations.map((q) => (
                      <td key={q.id} className="p-2.5 capitalize border-l border-slate-100">
                        {q.mountingStructureType.replace(/_/g, ' ')}
                      </td>
                    ))}
                  </tr>

                  {/* Execution */}
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-700 bg-slate-50">DISCOM Net Metering</td>
                    {quotations.map((q) => (
                      <td key={q.id} className="p-2.5 border-l border-slate-100">
                        {q.discomNetMeteringLiaisoningIncluded ? (
                          <span className="text-emerald-700 font-semibold">Included (Turnkey)</span>
                        ) : (
                          <span className="text-rose-600 font-semibold">Not Included (Customer)</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-700 bg-slate-50">DISCOM Empanelled</td>
                    {quotations.map((q) => (
                      <td key={q.id} className="p-2.5 border-l border-slate-100">
                        {q.isEmpanelledWithDiscom ? 'Yes (Subsidy eligible)' : 'No (Direct purchase)'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold text-slate-700 bg-slate-50">Commissioning SLA</td>
                    {quotations.map((q) => (
                      <td key={q.id} className="p-2.5 border-l border-slate-100">
                        {q.estimatedTimelineDays} days timeline • {q.guaranteedResponseTimeHours > 0 ? `${q.guaranteedResponseTimeHours}h fault SLA` : 'No SLA'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed Installer Audit Cards */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Contractor-Specific Negotiation Checklist
            </h4>

            <div className="space-y-4">
              {comparisonResult.evaluations.map((item) => {
                const quote = quotations.find((q) => q.id === item.quotationId);
                return (
                  <div key={item.quotationId} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {item.rank}. {item.installerName}
                        </span>
                        <span className="text-xs bg-slate-200 text-slate-800 font-semibold px-2 py-0.5 rounded">
                          Score: {item.overallScore}/100
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium">
                        Quote: {formatCurrency(quote?.totalPriceInr || 0)} (₹{item.pricePerWattPeak}/Wp)
                      </span>
                    </div>

                    {/* Red flags if any */}
                    {item.redFlags.length > 0 && (
                      <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg space-y-1">
                        <div className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                          Risk Warnings:
                        </div>
                        {item.redFlags.map((rf, i) => (
                          <div key={i} className="text-xs text-rose-700 pl-4 font-medium">
                            • {rf}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Strengths */}
                    {item.strengths.length > 0 && (
                      <div className="text-xs text-slate-700 space-y-0.5">
                        <span className="font-semibold text-emerald-800">Key Strengths:</span>
                        {item.strengths.map((str, i) => (
                          <div key={i} className="pl-3 text-slate-600">
                            ✓ {str}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tailored Questions */}
                    <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5 text-emerald-600" />
                        Questions to Demand in Writing:
                      </span>
                      <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1 pl-1">
                        {item.vendorQuestionsToAsk.map((ques, i) => (
                          <li key={i}>{ques}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legal / Policy Disclaimer */}
          <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 space-y-1 leading-relaxed">
            <p>
              <strong>Evaluation Methodology:</strong> URJA SAATHI is an impartial, open evaluation tool.
              We do not accept commissions, referral fees, or sponsorships from any solar equipment manufacturer or installer.
              Scores evaluate Price & Commercial Value (30%), Hardware Quality (25%), Warranties & SLAs (25%), and Execution & Regulatory Assurance (20%).
            </p>
            <p>
              Subsidy calculations are indicative estimates based on current PM Surya Ghar Muft Bijli Yojana guidelines and require formal application through your regional DISCOM and the National Solar Portal.
            </p>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handlePrint} icon={<Printer className="h-4 w-4" />}>
            Print / Save as PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};
