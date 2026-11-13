import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Search,
  Filter,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Receipt,
  UserCheck,
  UserX,
} from 'lucide-react';
import { HouseholdImpactRecord, ImpactVerificationStatus } from '../../types';
import { Badge } from '../common/Badge';

interface HouseholdFollowUpTableProps {
  records: HouseholdImpactRecord[];
}

export const HouseholdFollowUpTable: React.FC<HouseholdFollowUpTableProps> = ({ records }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ImpactVerificationStatus | 'consent_withheld'>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Filter records
  const filteredRecords = records.filter((rec) => {
    // Search filter
    const matchesSearch =
      rec.householdName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.pincode.includes(searchQuery) ||
      rec.baselineBill?.billId.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === 'all') return true;
    if (statusFilter === 'consent_withheld') return !rec.consentGiven;
    return rec.evidenceQuality === statusFilter && rec.consentGiven;
  });

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const getStatusBadge = (record: HouseholdImpactRecord) => {
    if (!record.consentGiven) {
      return (
        <Badge variant="rose" size="sm" icon={<UserX className="w-3 h-3" />}>
          Consent Withheld
        </Badge>
      );
    }

    switch (record.evidenceQuality) {
      case 'verified':
        return (
          <Badge variant="emerald" size="sm" icon={<ShieldCheck className="w-3 h-3" />}>
            Empirically Verified
          </Badge>
        );
      case 'partially_verified':
        return (
          <Badge variant="amber" size="sm" icon={<AlertCircle className="w-3 h-3" />}>
            Variance / Flat
          </Badge>
        );
      case 'pending_subsequent_bill':
        return (
          <Badge variant="blue" size="sm" icon={<Clock className="w-3 h-3" />}>
            Awaiting Next Bill
          </Badge>
        );
      case 'insufficient_evidence':
      default:
        return (
          <Badge variant="slate" size="sm" icon={<AlertCircle className="w-3 h-3" />}>
            Insufficient Evidence
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search household, locality, or bill ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('verified')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'verified'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Verified ({records.filter((r) => r.evidenceQuality === 'verified' && r.consentGiven).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending_subsequent_bill')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'pending_subsequent_bill'
                ? 'bg-sky-700 text-white shadow-xs'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
            }`}
          >
            Awaiting Bill ({records.filter((r) => r.evidenceQuality === 'pending_subsequent_bill').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('insufficient_evidence')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'insufficient_evidence'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Pending Actions ({records.filter((r) => r.evidenceQuality === 'insufficient_evidence' && r.consentGiven).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('consent_withheld')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              statusFilter === 'consent_withheld'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Withheld Consent ({records.filter((r) => !r.consentGiven).length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Household & Location</th>
                <th className="py-3 px-4">Consent Status</th>
                <th className="py-3 px-4">Baseline Bill (OCR)</th>
                <th className="py-3 px-4">Subsequent Bill (OCR)</th>
                <th className="py-3 px-4">Actions Completed</th>
                <th className="py-3 px-4 text-right">Verified Monthly Drop</th>
                <th className="py-3 px-4 text-center">Audit Status</th>
                <th className="py-3 px-3 text-center">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No household follow-up records found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const isExpanded = expandedRowId === record.householdId;

                  return (
                    <React.Fragment key={record.householdId}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        {/* Household & Location */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{record.householdName}</div>
                          <div className="text-[11px] text-slate-500">
                            {record.locality} ({record.pincode})
                          </div>
                        </td>

                        {/* Consent */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {record.consentGiven ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <UserCheck className="w-3 h-3 text-emerald-600" />
                              Consented ({record.consentDate})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <UserX className="w-3 h-3 text-rose-600" />
                              Withheld
                            </span>
                          )}
                        </td>

                        {/* Baseline Bill */}
                        <td className="py-3.5 px-4">
                          {record.baselineBill ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
                                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                                  {record.baselineBill.billId}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-slate-800">
                                {record.baselineBill.unitsKwh} kWh • ₹{record.baselineBill.amountInr.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {record.baselineBill.billMonth} ({record.baselineBill.billDate})
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Missing Baseline</span>
                          )}
                        </td>

                        {/* Subsequent Bill */}
                        <td className="py-3.5 px-4">
                          {record.subsequentBill ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700">
                                <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-emerald-200">
                                  {record.subsequentBill.billId}
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-slate-800">
                                {record.subsequentBill.unitsKwh} kWh • ₹{record.subsequentBill.amountInr.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {record.subsequentBill.billMonth} ({record.subsequentBill.billDate})
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                              <Clock className="w-3 h-3" />
                              Awaiting OCR Upload
                            </span>
                          )}
                        </td>

                        {/* Actions Completed */}
                        <td className="py-3.5 px-4">
                          <div className="text-xs font-medium text-slate-800">
                            {record.completedActions.length} completed
                          </div>
                          {record.totalDocumentedExpenditureInr > 0 ? (
                            <div className="text-[11px] text-emerald-700 font-semibold">
                              ₹{record.totalDocumentedExpenditureInr.toLocaleString()} documented
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400">Pending expense</div>
                          )}
                        </td>

                        {/* Verified Monthly Drop */}
                        <td className="py-3.5 px-4 text-right">
                          {record.verifiedMonthlySavingsKwh !== null && record.verifiedMonthlySavingsKwh > 0 ? (
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-emerald-700 text-sm">
                                -{record.verifiedMonthlySavingsKwh} kWh/mo
                              </span>
                              <div className="text-[11px] font-semibold text-emerald-600">
                                ₹{record.verifiedMonthlySavingsInr?.toLocaleString()}/mo
                              </div>
                            </div>
                          ) : record.evidenceQuality === 'pending_subsequent_bill' ? (
                            <div className="space-y-0.5 text-right">
                              <span className="font-medium text-sky-700 text-xs italic">
                                ~{record.estimatedMonthlySavingsKwh} kWh (est)
                              </span>
                              <div className="text-[10px] text-slate-400">Pending OCR read</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(record)}
                        </td>

                        {/* Audit Details Expander Button */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleRow(record.householdId)}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Toggle audit trail details"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Audit Trail Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={8} className="p-4 sm:p-5">
                            <div className="space-y-4 text-xs">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    Audited Evidence Trail for {record.householdName}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                    ID: {record.householdId}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-500">
                                  Last Audited: <strong>{record.lastAuditedDate}</strong>
                                </span>
                              </div>

                              {/* Audit Notes */}
                              <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-700">
                                <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                  Auditor's Methodology & Observation:
                                </div>
                                <p className="leading-relaxed">{record.auditNotes}</p>
                              </div>

                              {/* Completed Actions & Receipts */}
                              {record.completedActions.length > 0 && (
                                <div>
                                  <div className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                                    <Receipt className="w-4 h-4 text-emerald-700" />
                                    Documented Interventions & Assisted Workers:
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {record.completedActions.map((action, idx) => (
                                      <div
                                        key={idx}
                                        className="p-3 bg-white rounded-xl border border-slate-200 space-y-1"
                                      >
                                        <div className="font-bold text-slate-800">
                                          {action.actionTitle}
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                          <span>Expenditure:</span>
                                          <strong className="text-emerald-700 font-semibold">
                                            ₹{action.documentedExpenditureInr.toLocaleString()}
                                          </strong>
                                        </div>
                                        {action.expenseReceiptRef && (
                                          <div className="flex justify-between text-slate-500">
                                            <span>Receipt Ref:</span>
                                            <span className="font-mono font-medium text-slate-700">
                                              {action.expenseReceiptRef}
                                            </span>
                                          </div>
                                        )}
                                        {action.assistingWorkerName && (
                                          <div className="flex justify-between text-slate-500">
                                            <span>Assisted By:</span>
                                            <span className="text-slate-800 font-medium">
                                              {action.assistingWorkerName}
                                            </span>
                                          </div>
                                        )}
                                        <div className="text-[10px] text-slate-400 pt-1">
                                          Completed on: {action.completedDate}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recommended Pipeline */}
                              {record.recommendedActions.length > 0 && (
                                <div>
                                  <div className="font-semibold text-slate-900 mb-1.5 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-amber-600" />
                                    Intelligence Engine Recommended Opportunities:
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {record.recommendedActions.map((rec, i) => (
                                      <div
                                        key={i}
                                        className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center gap-2"
                                      >
                                        <span>{rec.actionTitle}</span>
                                        <span className="font-bold text-amber-700">
                                          ({rec.estimatedKwhSavings} kWh/mo • ₹{rec.estimatedMonetarySavingsInr}/mo)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
