import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { AdminImpactDashboardData } from '../../types';
import {
  Printer,
  ShieldCheck,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Coins,
  Lock,
} from 'lucide-react';

interface DownloadableImpactReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: AdminImpactDashboardData;
}

export const DownloadableImpactReportModal: React.FC<DownloadableImpactReportModalProps> = ({
  isOpen,
  onClose,
  dashboardData,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const {
    tripartiteSummary,
    householdFollowUpRecords,
    workerImpactRecords,
    totalConsentingHouseholds,
    totalCompletedServices,
    totalActiveWorkers,
    totalDocumentedPaidAssignmentsInr,
  } = dashboardData;

  const verifiedHouseholds = householdFollowUpRecords.filter(
    (h) => h.evidenceQuality === 'verified' && h.consentGiven
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Downloadable Community Impact & Verification Dossier"
      description="Print or export this formal audit dossier as a PDF for stakeholders, government DISCOMs, and funding bodies."
      maxWidth="5xl"
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
          <div className="flex items-center gap-2 text-xs text-emerald-950 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
            <span>
              Formal audit report prepared with strict tripartite evidence separation. Ready for PDF download or print.
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="h-4 w-4" />}
          >
            Print / Save as PDF
          </Button>
        </div>

        {/* Printable Document Container */}
        <div
          id="printable-impact-dossier"
          className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 text-slate-800 space-y-6 print:border-none print:p-0 print:shadow-none"
        >
          {/* Hackathon Demonstration Data Watermark / Banner */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-center text-xs text-amber-900 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Demonstration Audit Dossier — Simulated Dataset for Hackathon Verification & Evaluation
            </span>
          </div>

          {/* Header */}
          <div className="border-b-2 border-emerald-700 pb-4 flex flex-col sm:flex-row justify-between sm:items-end gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-900 text-white flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  URJA SAATHI
                </h1>
              </div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mt-1">
                Community Energy Savings & Local Workforce Impact Audit
              </p>
              <p className="text-xs text-slate-500 italic mt-0.5">
                "Har Ghar Bachat, Har Haath Kaam"
              </p>
            </div>

            <div className="text-left sm:text-right text-xs space-y-0.5 text-slate-600">
              <div>
                Dossier Ref:{' '}
                <span className="font-mono font-bold text-slate-900">
                  AUD-IND-2026-02
                </span>
              </div>
              <div>
                Date Generated:{' '}
                <span className="font-medium text-slate-800">
                  {new Date().toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div>
                Jurisdiction:{' '}
                <span className="font-medium text-slate-800">
                  Madhya Pradesh (MPPKVVCL / Western DISCOM)
                </span>
              </div>
            </div>
          </div>

          {/* Executive Overview KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <div className="p-2">
              <span className="text-[11px] text-slate-500 font-medium block">Consenting Households</span>
              <span className="text-xl font-bold text-slate-900">{totalConsentingHouseholds}</span>
              <span className="text-[10px] text-slate-400 block">DPDP Act Compliant</span>
            </div>
            <div className="p-2 border-l border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Completed Services</span>
              <span className="text-xl font-bold text-emerald-700">{totalCompletedServices}</span>
              <span className="text-[10px] text-slate-400 block">Field Interventions</span>
            </div>
            <div className="p-2 border-l border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Certified Active Workers</span>
              <span className="text-xl font-bold text-slate-900">{totalActiveWorkers}</span>
              <span className="text-[10px] text-slate-400 block">Wiremen & Surya Mitras</span>
            </div>
            <div className="p-2 border-l border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">Documented Wages Disbursed</span>
              <span className="text-xl font-bold text-amber-700">₹{totalDocumentedPaidAssignmentsInr.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 block">Bank / UPI Vouchers</span>
            </div>
          </div>

          {/* SECTION 1: TRIPARTITE IMPACT AUDIT BREAKDOWN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                Section 1: Segregated Tripartite Impact Audit
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">Zero Greenwashing Standard</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 border-r border-slate-200">Impact Tier</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Monthly Energy Drop</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Annual Monetary Benefit</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Scope & Adoption</th>
                    <th className="py-2.5 px-3">Evidentiary Standard & Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Tier 1 */}
                  <tr className="bg-emerald-50/50">
                    <td className="py-3 px-3 font-bold text-emerald-900 border-r border-slate-200">
                      Tier 1: Measured Impact
                    </td>
                    <td className="py-3 px-3 font-extrabold text-emerald-800 border-r border-slate-200">
                      {tripartiteSummary.measuredImpact.totalVerifiedSavingsKwhMonthly} kWh / mo
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-200">
                      ₹{tripartiteSummary.measuredImpact.annualVerifiedSavingsInr.toLocaleString()} / yr
                    </td>
                    <td className="py-3 px-3 text-slate-700 border-r border-slate-200">
                      {tripartiteSummary.measuredImpact.verifiedHouseholdsCount} Homes Verified
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {tripartiteSummary.measuredImpact.basisOfCalculation}
                    </td>
                  </tr>

                  {/* Tier 2 */}
                  <tr className="bg-sky-50/40">
                    <td className="py-3 px-3 font-bold text-sky-900 border-r border-slate-200">
                      Tier 2: Estimated Impact
                    </td>
                    <td className="py-3 px-3 font-bold text-sky-800 border-r border-slate-200">
                      {tripartiteSummary.estimatedImpact.totalEstimatedSavingsKwhMonthly} kWh / mo
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-200">
                      ₹{tripartiteSummary.estimatedImpact.annualEstimatedSavingsInr.toLocaleString()} / yr
                    </td>
                    <td className="py-3 px-3 text-slate-700 border-r border-slate-200">
                      {tripartiteSummary.estimatedImpact.partiallyVerifiedHouseholdsCount} Homes Awaiting Bill
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {tripartiteSummary.estimatedImpact.basisOfCalculation}
                    </td>
                  </tr>

                  {/* Tier 3 */}
                  <tr className="bg-amber-50/40">
                    <td className="py-3 px-3 font-bold text-amber-900 border-r border-slate-200">
                      Tier 3: Potential Impact
                    </td>
                    <td className="py-3 px-3 font-bold text-amber-800 border-r border-slate-200">
                      {tripartiteSummary.potentialImpact.totalPotentialSavingsKwhMonthly} kWh / mo
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 border-r border-slate-200">
                      ₹{tripartiteSummary.potentialImpact.annualPotentialSavingsInr.toLocaleString()} / yr
                    </td>
                    <td className="py-3 px-3 text-slate-700 border-r border-slate-200">
                      {tripartiteSummary.potentialImpact.pendingActionCount} Recommendations Pending
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {tripartiteSummary.potentialImpact.basisOfCalculation}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * Note: The figures above reflect three separate methodologies and are strictly non-additive.
            </p>
          </div>

          {/* SECTION 2: HOUSEHOLD VERIFIED OUTCOMES */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Section 2: Empirically Verified Household Reductions
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200">Household</th>
                    <th className="py-2 px-3 border-r border-slate-200">Baseline Bill (OCR)</th>
                    <th className="py-2 px-3 border-r border-slate-200">Subsequent Bill (OCR)</th>
                    <th className="py-2 px-3 border-r border-slate-200">Documented Interventions</th>
                    <th className="py-2 px-3 text-right">Verified Monthly Drop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {verifiedHouseholds.map((h) => (
                    <tr key={h.householdId}>
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{h.householdName}</div>
                        <div className="text-[10px] text-slate-500">{h.locality}</div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-[11px]">
                        <div>{h.baselineBill?.billId}</div>
                        <div className="text-slate-600">
                          {h.baselineBill?.unitsKwh} kWh (₹{h.baselineBill?.amountInr})
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-[11px]">
                        <div>{h.subsequentBill?.billId}</div>
                        <div className="text-slate-600">
                          {h.subsequentBill?.unitsKwh} kWh (₹{h.subsequentBill?.amountInr})
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-[11px]">
                        {h.completedActions.map((a) => a.actionTitle).join(', ')}
                        <span className="block text-emerald-700 font-semibold">
                          ₹{h.totalDocumentedExpenditureInr.toLocaleString()} spent
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                        -{h.verifiedMonthlySavingsKwh} kWh/mo
                        <span className="block text-[11px] text-slate-600 font-normal">
                          (₹{h.verifiedMonthlySavingsInr?.toLocaleString()}/mo)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: WORKER LIVELIHOOD DISTRIBUTION */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Coins className="w-4 h-4 text-amber-600" />
              Section 3: Verified Local Worker Wage Distribution (Har Haath Kaam)
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3 border-r border-slate-200">Worker</th>
                    <th className="py-2 px-3 border-r border-slate-200">Role & Accreditation</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-center">Jobs Completed</th>
                    <th className="py-2 px-3 border-r border-slate-200 text-center">Completion Rate</th>
                    <th className="py-2 px-3 text-right">Verified Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {workerImpactRecords.map((w) => (
                    <tr key={w.workerId}>
                      <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-slate-900">
                        {w.workerName}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700">
                        {w.roleCategory.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center font-semibold">
                        {w.completedAssignments}
                      </td>
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center font-semibold text-emerald-700">
                        {w.completionRatePercent}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        ₹{w.verifiedEarningsInr.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AUDIT SIGN-OFF & METHODOLOGY STATEMENT */}
          <div className="pt-6 border-t-2 border-slate-200 space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-700" />
                Auditor Methodology & Consent Compliance Statement
              </div>
              <p>
                All household records included in Section 1 (Tier 1) and Section 2 have explicit, logged consent under India's Digital Personal Data Protection (DPDP) Act.
                Baseline and subsequent utility bills were ingested through client-side Tesseract.js OCR and verified by municipal energy audit protocols.
                All worker wage disbursements correspond to verified digital or paper receipts authenticated by households upon work sign-off.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="border-t border-slate-300 pt-2 text-xs text-slate-500">
                <div className="font-bold text-slate-800">Field Energy Auditor Signature</div>
                <div className="font-mono text-[10px] text-slate-400">ID: AUD-MP-4412 • MPPKVVCL Certified</div>
              </div>
              <div className="border-t border-slate-300 pt-2 text-xs text-slate-500 text-right">
                <div className="font-bold text-slate-800">Community Saathi Verification Seal</div>
                <div className="font-mono text-[10px] text-slate-400">URJA SAATHI HACKATHON VERIFIER #01</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
