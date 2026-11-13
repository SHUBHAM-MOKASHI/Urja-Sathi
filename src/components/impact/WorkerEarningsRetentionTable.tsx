import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Receipt,
  Award,
} from 'lucide-react';
import { WorkerImpactMetric } from '../../types';
import { Badge } from '../common/Badge';

interface WorkerEarningsRetentionTableProps {
  workers: WorkerImpactMetric[];
}

export const WorkerEarningsRetentionTable: React.FC<WorkerEarningsRetentionTableProps> = ({ workers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);

  const filteredWorkers = workers.filter((w) =>
    w.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.roleCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.workerId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleWorker = (id: string) => {
    setExpandedWorkerId((prev) => (prev === id ? null : id));
  };

  const getRetentionBadge = (status: WorkerImpactMetric['retentionStatus']) => {
    switch (status) {
      case 'active_retained':
        return (
          <Badge variant="emerald" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
            Active Retained
          </Badge>
        );
      case 'sporadic':
        return (
          <Badge variant="amber" size="sm" icon={<Clock className="w-3 h-3" />}>
            Sporadic
          </Badge>
        );
      case 'inactive':
      default:
        return (
          <Badge variant="slate" size="sm">
            Inactive
          </Badge>
        );
    }
  };

  const formatRoleName = (role: string) => {
    switch (role) {
      case 'surya_mitra_technician':
        return 'Certified Surya Mitra';
      case 'licensed_wireman':
        return 'Licensed Wireman Grade 1';
      case 'community_energy_guide':
        return 'Community Energy Guide';
      case 'energy_auditor':
        return 'BEE Certified Auditor';
      default:
        return role.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search worker by name, role, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
          />
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-1.5 self-start sm:self-auto">
          <Award className="w-4 h-4 text-emerald-600" />
          <span>Only verified, licensed local workers with recorded bank/UPI receipts</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Worker & Qualification</th>
                <th className="py-3 px-4 text-center">Requests Received</th>
                <th className="py-3 px-4 text-center">Jobs Completed</th>
                <th className="py-3 px-4 text-center">Completion Rate</th>
                <th className="py-3 px-4 text-right">Verified Earnings</th>
                <th className="py-3 px-4 text-center">Tenure</th>
                <th className="py-3 px-4 text-center">Retention Status</th>
                <th className="py-3 px-3 text-center">Receipts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No worker impact records matching query.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((worker) => {
                  const isExpanded = expandedWorkerId === worker.workerId;

                  return (
                    <React.Fragment key={worker.workerId}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        {/* Worker & Role */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{worker.workerName}</div>
                          <div className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {formatRoleName(worker.roleCategory)}
                          </div>
                        </td>

                        {/* Requests Received */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-slate-800">
                            {worker.totalServiceRequests}
                          </span>
                        </td>

                        {/* Completed Assignments */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {worker.completedAssignments} of {worker.acceptedAssignments}
                          </span>
                        </td>

                        {/* Completion Rate */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-bold text-slate-800">
                              {worker.completionRatePercent}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-600 rounded-full"
                                style={{ width: `${Math.min(100, worker.completionRatePercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Verified Earnings */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-900 text-sm">
                              ₹{worker.verifiedEarningsInr.toLocaleString()}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {worker.paymentTransactions.length} receipted payments
                            </div>
                          </div>
                        </td>

                        {/* Tenure */}
                        <td className="py-3.5 px-4 text-center text-xs text-slate-600">
                          {worker.activeMonths} months
                        </td>

                        {/* Retention Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {getRetentionBadge(worker.retentionStatus)}
                        </td>

                        {/* Expand Details */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleWorker(worker.workerId)}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Toggle payment audit vouchers"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Payment Vouchers Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={8} className="p-4 sm:p-5">
                            <div className="space-y-3 text-xs">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                  <Receipt className="w-4 h-4 text-amber-600" />
                                  Documented Payment Transactions for {worker.workerName}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Total Recorded: ₹{worker.totalDocumentedEarningsInr.toLocaleString()}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {worker.paymentTransactions.map((tx, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 shadow-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        {tx.receiptRef}
                                      </span>
                                      <span className="font-bold text-emerald-700 text-sm">
                                        ₹{tx.amountInr.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 text-[11px]">
                                      <span>Service Request:</span>
                                      <span className="font-mono text-slate-700">{tx.requestId}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 text-[11px]">
                                      <span>Payment Mode:</span>
                                      <span className="uppercase font-semibold text-slate-800">
                                        {tx.method}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                                      <span>Settled Date: {tx.date}</span>
                                      <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                                        <CheckCircle2 className="w-3 h-3" /> Audited
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
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
