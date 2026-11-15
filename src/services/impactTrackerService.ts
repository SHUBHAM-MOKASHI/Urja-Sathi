import {
  HouseholdImpactRecord,
  WorkerImpactMetric,
  TripartiteImpactSummary,
  ServiceRequest,
  DetailedWorkerProfile,
  WorkerPaymentTransaction,
  ElectricityBill,
  UserProfile,
  ApplianceInput,
  AdminImpactDashboardData,
  ImpactVerificationStatus,
  HouseholdBillEvidence,
  HouseholdCompletedAction,
} from '../types';
import { runEnergySavingsEngine } from './energyEngine';

/**
 * Result structure for comparative household bill consumption drop
 */
export interface ConsumptionDropResult {
  isComparable: boolean;
  kwhDifference: number; // positive = reduction, negative = increase
  amountDifference: number; // positive = monetary savings, negative = increase
  percentReduction: number;
  baselineKwh: number;
  subsequentKwh: number;
  baselineAmount: number;
  subsequentAmount: number;
  isConfirmed: boolean;
  reason: string;
}

/**
 * Result structure for completed worker earnings
 */
export interface WorkerEarningsResult {
  totalEarningsInr: number;
  completedPaidCount: number;
  completedTotalCount: number;
  transactions: WorkerPaymentTransaction[];
}

/**
 * Privacy helper to mask consumer number in aggregated/shared displays
 */
export function maskConsumerNumber(consumerNumber?: string): string {
  if (!consumerNumber || consumerNumber.trim().length === 0) return 'MP-***-LIVE';
  const clean = consumerNumber.trim();
  if (clean.length <= 4) return `***${clean}`;
  return `${clean.substring(0, 2)}****${clean.substring(clean.length - 2)}`;
}

/**
 * Privacy helper to mask phone numbers in shared audit displays
 */
export function maskPhone(phone?: string): string {
  if (!phone || phone.trim().length === 0) return '+91 ***** *****';
  const clean = phone.trim();
  if (clean.length <= 6) return '+91 ***** *****';
  return `${clean.substring(0, 6)}*****${clean.substring(clean.length - 2)}`;
}

/**
 * Privacy helper to mask personal names in aggregated/shared displays
 * e.g. "Rameshwar Prasad Sharma" -> "Rameshwar P. S."
 */
export function maskName(name?: string): string {
  if (!name || name.trim().length === 0) return 'Household Resident';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length > 2 ? `${parts[0][0]}***${parts[0].slice(-1)}` : 'H***d';
  }
  return parts.map((p, i) => (i === 0 ? p : `${p[0]}.`)).join(' ');
}

/**
 * Calculates the verified consumption drop between two household electricity bills.
 * Validates household identity, billing period chronology, and non-zero readings.
 * A missing subsequent bill is NEVER interpreted as zero consumption.
 */
export function calculateVerifiedConsumptionDrop(
  baselineBill: ElectricityBill,
  subsequentBill?: ElectricityBill | null
): ConsumptionDropResult {
  if (!subsequentBill) {
    return {
      isComparable: false,
      kwhDifference: 0,
      amountDifference: 0,
      percentReduction: 0,
      baselineKwh: baselineBill?.unitsConsumed || 0,
      subsequentKwh: 0,
      baselineAmount: baselineBill?.totalAmount || 0,
      subsequentAmount: 0,
      reason: 'Subsequent bill is missing. A missing subsequent bill is never treated as zero consumption.',
      isConfirmed: false,
    };
  }

  // 1. Both bills must have non-zero positive units consumed
  if (
    typeof baselineBill.unitsConsumed !== 'number' ||
    baselineBill.unitsConsumed <= 0 ||
    typeof subsequentBill.unitsConsumed !== 'number' ||
    subsequentBill.unitsConsumed <= 0
  ) {
    return {
      isComparable: false,
      kwhDifference: 0,
      amountDifference: 0,
      percentReduction: 0,
      baselineKwh: baselineBill.unitsConsumed || 0,
      subsequentKwh: subsequentBill.unitsConsumed || 0,
      baselineAmount: baselineBill.totalAmount || 0,
      subsequentAmount: subsequentBill.totalAmount || 0,
      reason: 'Both baseline and subsequent bills must have positive non-zero units consumed.',
      isConfirmed: false,
    };
  }

  // 2. Household identity check: consumer numbers must match
  if (
    baselineBill.consumerNumber &&
    subsequentBill.consumerNumber &&
    baselineBill.consumerNumber.trim().toLowerCase() !== subsequentBill.consumerNumber.trim().toLowerCase()
  ) {
    return {
      isComparable: false,
      kwhDifference: 0,
      amountDifference: 0,
      percentReduction: 0,
      baselineKwh: baselineBill.unitsConsumed,
      subsequentKwh: subsequentBill.unitsConsumed,
      baselineAmount: baselineBill.totalAmount,
      subsequentAmount: subsequentBill.totalAmount,
      reason: `Consumer numbers do not match (${baselineBill.consumerNumber} vs ${subsequentBill.consumerNumber}). Readings from different households are not comparable.`,
      isConfirmed: false,
    };
  }

  // 3. Chronological validity
  const baseDate = new Date(baselineBill.billDate || baselineBill.createdAt || 0).getTime();
  const subDate = new Date(subsequentBill.billDate || subsequentBill.createdAt || 0).getTime();
  if (baseDate && subDate && subDate <= baseDate) {
    return {
      isComparable: false,
      kwhDifference: 0,
      amountDifference: 0,
      percentReduction: 0,
      baselineKwh: baselineBill.unitsConsumed,
      subsequentKwh: subsequentBill.unitsConsumed,
      baselineAmount: baselineBill.totalAmount,
      subsequentAmount: subsequentBill.totalAmount,
      reason: 'Subsequent bill date must be chronologically after the baseline bill date.',
      isConfirmed: false,
    };
  }

  // 4. Billing period interval comparability
  if (baseDate && subDate) {
    const daysGap = Math.round((subDate - baseDate) / (1000 * 60 * 60 * 24));
    if (daysGap < 15) {
      return {
        isComparable: false,
        kwhDifference: 0,
        amountDifference: 0,
        percentReduction: 0,
        baselineKwh: baselineBill.unitsConsumed,
        subsequentKwh: subsequentBill.unitsConsumed,
        baselineAmount: baselineBill.totalAmount,
        subsequentAmount: subsequentBill.totalAmount,
        reason: `Billing period between readings is too short (${daysGap} days; minimum 15 days required for monthly comparability).`,
        isConfirmed: false,
      };
    }
    if (daysGap > 365) {
      return {
        isComparable: false,
        kwhDifference: 0,
        amountDifference: 0,
        percentReduction: 0,
        baselineKwh: baselineBill.unitsConsumed,
        subsequentKwh: subsequentBill.unitsConsumed,
        baselineAmount: baselineBill.totalAmount,
        subsequentAmount: subsequentBill.totalAmount,
        reason: `Billing gap exceeds 365 days (${daysGap} days). Direct comparison without continuous intermediate records is invalid.`,
        isConfirmed: false,
      };
    }
  }

  // 5. OCR Confirmation Check
  // Raw OCR without user edit or high confidence is not marked as confirmed
  const isConfirmed = Boolean(
    subsequentBill.userEdited ||
    subsequentBill.source === 'manual' ||
    (subsequentBill.source === 'ocr_scan' && (subsequentBill.ocrConfidence ?? 0) >= 0.85)
  );

  // 6. Calculate verified drops
  const kwhDifference = baselineBill.unitsConsumed - subsequentBill.unitsConsumed;
  const amountDifference = baselineBill.totalAmount - subsequentBill.totalAmount;
  const percentReduction = baselineBill.unitsConsumed > 0
    ? Number(((kwhDifference / baselineBill.unitsConsumed) * 100).toFixed(1))
    : 0;

  return {
    isComparable: true,
    kwhDifference,
    amountDifference,
    percentReduction,
    baselineKwh: baselineBill.unitsConsumed,
    subsequentKwh: subsequentBill.unitsConsumed,
    baselineAmount: baselineBill.totalAmount,
    subsequentAmount: subsequentBill.totalAmount,
    isConfirmed,
    reason:
      kwhDifference > 0
        ? `Verified reduction of ${kwhDifference} kWh (${percentReduction}%) achieved.`
        : `Consumption increased or remained flat (${subsequentBill.unitsConsumed} kWh vs baseline ${baselineBill.unitsConsumed} kWh).`,
  };
}

/**
 * Classifies impact evidence quality according to empirical audit rules
 */
export function classifyImpactEvidence(params: {
  consentGiven: boolean;
  hasBaselineBill: boolean;
  hasSubsequentBill: boolean;
  isComparable: boolean;
  isConfirmed: boolean;
  kwhReduction: number;
  hasCompletedAction?: boolean;
}): ImpactVerificationStatus {
  if (!params.consentGiven || !params.hasBaselineBill) {
    return 'insufficient_evidence';
  }
  if (!params.hasSubsequentBill) {
    return 'pending_subsequent_bill';
  }
  if (!params.isComparable) {
    return 'insufficient_evidence';
  }
  if (!params.isConfirmed) {
    // OCR data alone without confirmation is NOT empirically verified
    return 'partially_verified';
  }
  if (params.kwhReduction > 0) {
    return 'verified';
  }
  return 'partially_verified';
}

/**
 * Audits an individual household record against rigorous empirical evidence rules.
 * Never guesses or fabricates verified savings without baseline and subsequent bills.
 */
export function auditHouseholdRecord(record: HouseholdImpactRecord): HouseholdImpactRecord {
  // 1. Calculate documented expenditure from completed actions
  const totalExpenditure = record.completedActions.reduce(
    (sum, a) => sum + (a.documentedExpenditureInr || 0),
    0
  );

  // 2. Calculate engineering estimates from COMPLETED actions only
  const completedActionIds = new Set(record.completedActions.map((a) => a.actionId));
  const estimatedKwh = record.recommendedActions
    .filter((r) => completedActionIds.has(r.actionId))
    .reduce((sum, r) => sum + (r.estimatedKwhSavings || 0), 0);
  const estimatedInr = record.recommendedActions
    .filter((r) => completedActionIds.has(r.actionId))
    .reduce((sum, r) => sum + (r.estimatedMonetarySavingsInr || 0), 0);

  // 3. Evidence Audit
  if (!record.consentGiven) {
    return {
      ...record,
      totalDocumentedExpenditureInr: totalExpenditure,
      estimatedMonthlySavingsKwh: estimatedKwh,
      estimatedMonthlySavingsInr: estimatedInr,
      verifiedMonthlySavingsKwh: null,
      verifiedMonthlySavingsInr: null,
      evidenceQuality: 'insufficient_evidence',
      auditNotes: 'Household has not provided tracking and data-verification consent.',
      lastAuditedDate: new Date().toISOString().split('T')[0],
    };
  }

  if (!record.baselineBill || record.baselineBill.unitsKwh <= 0) {
    return {
      ...record,
      totalDocumentedExpenditureInr: totalExpenditure,
      estimatedMonthlySavingsKwh: estimatedKwh,
      estimatedMonthlySavingsInr: estimatedInr,
      verifiedMonthlySavingsKwh: null,
      verifiedMonthlySavingsInr: null,
      evidenceQuality: 'insufficient_evidence',
      auditNotes: 'Baseline electricity consumption is missing or zero. Empirical verification requires valid baseline.',
      lastAuditedDate: new Date().toISOString().split('T')[0],
    };
  }

  if (record.completedActions.length === 0) {
    return {
      ...record,
      totalDocumentedExpenditureInr: 0,
      estimatedMonthlySavingsKwh: 0,
      estimatedMonthlySavingsInr: 0,
      verifiedMonthlySavingsKwh: null,
      verifiedMonthlySavingsInr: null,
      evidenceQuality: 'insufficient_evidence',
      auditNotes: 'No recommendations completed yet. Interventions tracked in potential impact pipeline.',
      lastAuditedDate: new Date().toISOString().split('T')[0],
    };
  }

  if (!record.subsequentBill) {
    // Baseline present, but subsequent billing cycle hasn't been uploaded yet
    return {
      ...record,
      totalDocumentedExpenditureInr: totalExpenditure,
      estimatedMonthlySavingsKwh: estimatedKwh,
      estimatedMonthlySavingsInr: estimatedInr,
      verifiedMonthlySavingsKwh: null,
      verifiedMonthlySavingsInr: null,
      evidenceQuality: 'pending_subsequent_bill',
      auditNotes:
        'Awaiting subsequent billing cycle OCR upload to empirically measure verified savings. (Missing subsequent bill is never treated as zero consumption).',
      lastAuditedDate: new Date().toISOString().split('T')[0],
    };
  }

  // Both baseline and subsequent bills are present: calculate verified difference
  const kwhDifference = record.baselineBill.unitsKwh - record.subsequentBill.unitsKwh;
  const inrDifference = record.baselineBill.amountInr - record.subsequentBill.amountInr;

  if (kwhDifference > 0) {
    const percentReduction = ((kwhDifference / record.baselineBill.unitsKwh) * 100).toFixed(1);
    return {
      ...record,
      totalDocumentedExpenditureInr: totalExpenditure,
      estimatedMonthlySavingsKwh: estimatedKwh,
      estimatedMonthlySavingsInr: estimatedInr,
      verifiedMonthlySavingsKwh: kwhDifference,
      verifiedMonthlySavingsInr: Math.max(0, inrDifference),
      evidenceQuality: 'verified',
      auditNotes: `Empirically verified reduction of ${kwhDifference} kWh/month (${percentReduction}%) supported by Subsequent Bill #${record.subsequentBill.billId} vs Baseline #${record.baselineBill.billId}.`,
      lastAuditedDate: new Date().toISOString().split('T')[0],
    };
  } else {
    // Consumption did not decrease (seasonal summer AC variance or increased occupancy)
    return {
      ...record,
      totalDocumentedExpenditureInr: totalExpenditure,
      estimatedMonthlySavingsKwh: estimatedKwh,
      estimatedMonthlySavingsInr: estimatedInr,
      verifiedMonthlySavingsKwh: 0,
      verifiedMonthlySavingsInr: 0,
      evidenceQuality: 'partially_verified',
      auditNotes: `Subsequent consumption (${record.subsequentBill.unitsKwh} kWh) exceeded or matched baseline (${record.baselineBill.unitsKwh} kWh). Likely weather/seasonal variance or billing cycle length difference.`,
      lastAuditedDate: new Date().toISOString().split('T')[0],
    };
  }
}

/**
 * Computes the Tripartite Impact Summary.
 * MANDATE: Strictly separates Measured, Estimated, and Potential impact into non-overlapping categories.
 * Never combines them into one inflated score.
 */
export function computeTripartiteImpact(
  households: HouseholdImpactRecord[],
  workers: WorkerImpactMetric[]
): TripartiteImpactSummary {
  // 1. Measured Impact (Strictly Empirical)
  let verifiedKwhMonthly = 0;
  let verifiedInrMonthly = 0;
  let verifiedHouseholdsCount = 0;

  households.forEach((h) => {
    if (h.consentGiven && h.evidenceQuality === 'verified' && h.verifiedMonthlySavingsKwh !== null && h.verifiedMonthlySavingsKwh > 0) {
      verifiedKwhMonthly += h.verifiedMonthlySavingsKwh;
      verifiedInrMonthly += h.verifiedMonthlySavingsInr || 0;
      verifiedHouseholdsCount += 1;
    }
  });

  const verifiedWorkerEarnings = workers.reduce(
    (sum, w) => sum + (w.verifiedEarningsInr || 0),
    0
  );

  // 2. Estimated Impact (Engineering Calculations for Completed Actions Awaiting Bill Verification)
  let estimatedKwhMonthly = 0;
  let estimatedInrMonthly = 0;
  let partiallyVerifiedCount = 0;

  households.forEach((h) => {
    if (h.consentGiven && (h.evidenceQuality === 'pending_subsequent_bill' || h.evidenceQuality === 'partially_verified')) {
      estimatedKwhMonthly += h.estimatedMonthlySavingsKwh;
      estimatedInrMonthly += h.estimatedMonthlySavingsInr;
      partiallyVerifiedCount += 1;
    }
  });

  // 3. Potential Impact (Unrealized Pipeline from Pending Recommendations)
  let potentialKwhMonthly = 0;
  let potentialInrMonthly = 0;
  let pendingActionsTotal = 0;

  households.forEach((h) => {
    if (h.consentGiven) {
      const completedActionIds = new Set(h.completedActions.map((a) => a.actionId));
      const pending = h.recommendedActions.filter((r) => !completedActionIds.has(r.actionId));
      pendingActionsTotal += pending.length;
      pending.forEach((p) => {
        potentialKwhMonthly += p.estimatedKwhSavings;
        potentialInrMonthly += p.estimatedMonetarySavingsInr;
      });
    }
  });

  return {
    measuredImpact: {
      totalVerifiedSavingsKwhMonthly: Math.round(verifiedKwhMonthly),
      totalVerifiedSavingsInrMonthly: Math.round(verifiedInrMonthly),
      annualVerifiedSavingsInr: Math.round(verifiedInrMonthly * 12),
      verifiedHouseholdsCount,
      verifiedWorkerEarningsInr: verifiedWorkerEarnings,
      basisOfCalculation:
        'Empirically audited delta between verified baseline and subsequent utility bills, backed by receipted worker service fees.',
    },
    estimatedImpact: {
      totalEstimatedSavingsKwhMonthly: Math.round(estimatedKwhMonthly),
      totalEstimatedSavingsInrMonthly: Math.round(estimatedInrMonthly),
      annualEstimatedSavingsInr: Math.round(estimatedInrMonthly * 12),
      partiallyVerifiedHouseholdsCount: partiallyVerifiedCount,
      basisOfCalculation:
        'Engineering simulations (BEE thermodynamic & tariff slab models) for documented completed interventions awaiting subsequent meter cycle read.',
    },
    potentialImpact: {
      totalPotentialSavingsKwhMonthly: Math.round(potentialKwhMonthly),
      totalPotentialSavingsInrMonthly: Math.round(potentialInrMonthly),
      annualPotentialSavingsInr: Math.round(potentialInrMonthly * 12),
      pendingActionCount: pendingActionsTotal,
      basisOfCalculation:
        'Unrealized pipeline of identified opportunities not yet implemented or funded by households.',
    },
  };
}

/**
 * Calculates completed worker earnings from service requests.
 * Excludes pending, in_progress, and cancelled requests.
 * Avoids double-counting and never invents earnings where payment data is missing.
 */
export function calculateCompletedWorkerEarnings(requests: ServiceRequest[]): WorkerEarningsResult {
  const seenIds = new Set<string>();
  const transactions: WorkerPaymentTransaction[] = [];
  let totalEarningsInr = 0;
  let completedPaidCount = 0;
  let completedTotalCount = 0;

  for (const req of requests) {
    // Only completed services qualify
    if (req.status !== 'completed') continue;

    // Avoid double counting same request voucher
    if (seenIds.has(req.id)) continue;
    seenIds.add(req.id);

    completedTotalCount += 1;

    // Check recorded payment without inventing mock data
    const payment = typeof req.paymentRecordedInr === 'number' && !isNaN(req.paymentRecordedInr)
      ? Math.max(0, req.paymentRecordedInr)
      : 0;

    if (payment > 0 && req.paymentMethod !== 'waived') {
      completedPaidCount += 1;
      totalEarningsInr += payment;

      transactions.push({
        requestId: req.id,
        date: req.completedAt ? req.completedAt.split('T')[0] : (req.createdAt ? req.createdAt.split('T')[0] : '2026-02-16'),
        amountInr: payment,
        method: req.paymentMethod || 'upi',
        receiptRef: `RCP-${req.id.replace(/^req_/, '').substring(0, 8).toUpperCase()}`,
        isVerified: !req.isDemoRequest,
      });
    } else {
      transactions.push({
        requestId: req.id,
        date: req.completedAt ? req.completedAt.split('T')[0] : (req.createdAt ? req.createdAt.split('T')[0] : '2026-02-16'),
        amountInr: 0,
        method: req.paymentMethod || 'waived',
        receiptRef: `WAIVED-${req.id.replace(/^req_/, '').substring(0, 8).toUpperCase()}`,
        isVerified: false,
      });
    }
  }

  return {
    totalEarningsInr,
    completedPaidCount,
    completedTotalCount,
    transactions,
  };
}

/**
 * Calculates worker metrics, earnings, and retention rates from service request logs.
 * Never invents mock earnings when payment data is missing.
 */
export function calculateWorkerMetricsFromRequests(
  requests: ServiceRequest[],
  workers: DetailedWorkerProfile[]
): WorkerImpactMetric[] {
  return workers.map((worker) => {
    const workerRequests = requests.filter(
      (r) => r.assignedWorkerId === worker.id
    );

    const completed = workerRequests.filter((r) => r.status === 'completed');
    const accepted = workerRequests.filter(
      (r) => r.status === 'accepted' || r.status === 'in_progress' || r.status === 'completed'
    );

    const earningsResult = calculateCompletedWorkerEarnings(workerRequests);

    const totalDocumentedEarnings = earningsResult.totalEarningsInr;
    const verifiedEarnings = earningsResult.transactions
      .filter((t) => t.isVerified)
      .reduce((sum, t) => sum + t.amountInr, 0);

    const totalAssigned = accepted.length;
    const completionRate = totalAssigned > 0
      ? Math.round((completed.length / totalAssigned) * 100)
      : 100;

    let retentionStatus: 'active_retained' | 'sporadic' | 'inactive' = 'active_retained';
    if (!worker.isAvailableToday && completed.length === 0) {
      retentionStatus = 'inactive';
    } else if (completionRate < 75 || completed.length <= 1) {
      retentionStatus = 'sporadic';
    }

    return {
      workerId: worker.id,
      workerName: worker.name,
      roleCategory: worker.roleCategory,
      totalServiceRequests: workerRequests.length,
      acceptedAssignments: accepted.length,
      completedAssignments: completed.length,
      totalDocumentedEarningsInr: totalDocumentedEarnings,
      verifiedEarningsInr: verifiedEarnings,
      paymentTransactions: earningsResult.transactions,
      activeMonths: Math.max(1, worker.experienceYears * 4),
      completionRatePercent: completionRate,
      retentionStatus,
    };
  });
}

export const getLiveWorkerImpact = calculateWorkerMetricsFromRequests;

/**
 * Generates live household impact records from stored bills, completed service requests,
 * and user profile recommendations.
 */
export function getLiveHouseholdImpact(
  bills: ElectricityBill[],
  requests: ServiceRequest[] = [],
  userProfile?: UserProfile,
  appliances: ApplianceInput[] = [],
  householdConsent: boolean = true
): HouseholdImpactRecord[] {
  // Exclude demo / sample bills from live household impact
  const validBills = (bills || []).filter((b) => b.source !== 'sample');
  if (validBills.length === 0) {
    return [];
  }

  // 1. Group bills by consumerNumber
  const groups: Record<string, ElectricityBill[]> = {};
  for (const bill of validBills) {
    const key = bill.consumerNumber?.trim() || 'primary_household';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(bill);
  }

  const records: HouseholdImpactRecord[] = [];

  for (const [consumerNum, rawGroup] of Object.entries(groups)) {
    // Sort chronologically: oldest first, newest last
    const sorted = [...rawGroup].sort((a, b) => {
      const timeA = new Date(a.billDate || a.createdAt || 0).getTime();
      const timeB = new Date(b.billDate || b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    const baseline = sorted[0];
    const subsequent = sorted.length > 1 ? sorted[sorted.length - 1] : undefined;

    const baselineEvidence: HouseholdBillEvidence = {
      billId: baseline.id,
      billMonth: baseline.billMonth || 'Baseline Cycle',
      billDate: baseline.billDate || baseline.createdAt?.split('T')[0] || '2026-01-01',
      unitsKwh: baseline.unitsConsumed || 0,
      amountInr: baseline.totalAmount || 0,
    };

    const subsequentEvidence: HouseholdBillEvidence | undefined = subsequent
      ? {
          billId: subsequent.id,
          billMonth: subsequent.billMonth || 'Subsequent Cycle',
          billDate: subsequent.billDate || subsequent.createdAt?.split('T')[0] || '2026-02-01',
          unitsKwh: subsequent.unitsConsumed || 0,
          amountInr: subsequent.totalAmount || 0,
        }
      : undefined;

    // Completed actions for this household from service requests
    const completedActions: HouseholdCompletedAction[] = requests
      .filter((r) => !r.isDemoRequest && r.status === 'completed')
      .map((r) => ({
        actionId: `action_${r.id}`,
        actionTitle: r.title,
        completedDate: r.completedAt ? r.completedAt.split('T')[0] : '2026-02-16',
        documentedExpenditureInr: r.paymentRecordedInr || 0,
        expenseReceiptRef: `RCP-${r.id.substring(0, 8).toUpperCase()}`,
        assistingWorkerId: r.assignedWorkerId,
        assistingWorkerName: r.assignedWorkerName,
      }));

    const totalDocumentedExpenditureInr = completedActions.reduce(
      (sum, a) => sum + (a.documentedExpenditureInr || 0),
      0
    );

    // Compute recommendations / potential pipeline using energyEngine
    let recommendedActions: HouseholdImpactRecord['recommendedActions'] = [];
    if (appliances.length > 0 && baseline.unitsConsumed > 0) {
      try {
        const engineResult = runEnergySavingsEngine({
          billedUnitsKwh: baseline.unitsConsumed,
          billAmountInr: baseline.totalAmount,
          householdMembers: 4,
          userBudgetInr: 5000,
          appliances,
        });

        if (engineResult.status === 'success') {
          recommendedActions = engineResult.recommendations.map((rec) => ({
            actionId: `rec_${rec.id}`,
            actionTitle: rec.action,
            estimatedKwhSavings: rec.estimatedEnergyReductionKwh,
            estimatedMonetarySavingsInr: rec.estimatedMonetaryBenefitInr,
          }));
        }
      } catch {
        // Fallback if engine fails
      }
    }

    // Engineering estimates for completed actions
    const completedActionIds = new Set(completedActions.map((a) => a.actionId));
    const estimatedMonthlySavingsKwh = recommendedActions
      .filter((r) => completedActionIds.has(r.actionId))
      .reduce((sum, r) => sum + r.estimatedKwhSavings, 0);
    const estimatedMonthlySavingsInr = recommendedActions
      .filter((r) => completedActionIds.has(r.actionId))
      .reduce((sum, r) => sum + r.estimatedMonetarySavingsInr, 0);

    // Calculate consumption drop between bills
    const drop = calculateVerifiedConsumptionDrop(baseline, subsequent);

    // Evidence classification
    const evidenceQuality = classifyImpactEvidence({
      consentGiven: householdConsent, // Respect consent setting
      hasBaselineBill: Boolean(baseline && baseline.unitsConsumed > 0),
      hasSubsequentBill: Boolean(subsequent),
      isComparable: drop.isComparable,
      isConfirmed: drop.isConfirmed,
      kwhReduction: drop.kwhDifference,
      hasCompletedAction: completedActions.length > 0,
    });

    let verifiedMonthlySavingsKwh: number | null = null;
    let verifiedMonthlySavingsInr: number | null = null;

    if (evidenceQuality === 'verified' && drop.kwhDifference > 0) {
      verifiedMonthlySavingsKwh = drop.kwhDifference;
      verifiedMonthlySavingsInr = Math.max(0, drop.amountDifference);
    } else if (evidenceQuality === 'partially_verified' && drop.isComparable && drop.kwhDifference <= 0) {
      verifiedMonthlySavingsKwh = 0;
      verifiedMonthlySavingsInr = 0;
    }

    let auditNotes = drop.reason;
    if (!subsequent) {
      auditNotes =
        'Awaiting subsequent billing cycle to calculate empirical savings. (Missing subsequent bill is never treated as zero consumption).';
    } else if (!drop.isConfirmed) {
      auditNotes =
        'Subsequent bill extracted via local OCR without manual confirmation. Classified as partially verified pending confirmation.';
    }

    records.push({
      householdId: `hh_${consumerNum}`,
      householdName: userProfile?.name || baseline.consumerName || 'Local Household',
      locality: userProfile?.pincode ? `Pincode ${userProfile.pincode}` : 'Local Service Area',
      pincode: userProfile?.pincode || '452001',
      consentGiven: householdConsent,
      consentDate: baseline.createdAt ? baseline.createdAt.split('T')[0] : '2026-01-01',
      baselineBill: baselineEvidence,
      subsequentBill: subsequentEvidence,
      recommendedActions,
      completedActions,
      totalDocumentedExpenditureInr,
      estimatedMonthlySavingsKwh,
      estimatedMonthlySavingsInr,
      verifiedMonthlySavingsKwh,
      verifiedMonthlySavingsInr,
      evidenceQuality,
      auditNotes,
      lastAuditedDate: new Date().toISOString().split('T')[0],
    });
  }

  return records;
}

/**
 * Compiles complete live admin dashboard data from stored local records.
 * Returns empty metrics and empty lists if no live records exist.
 * Never introduces demo data or fabricated numbers.
 */
export function getLiveAdminImpactData(
  bills: ElectricityBill[],
  requests: ServiceRequest[],
  workers: DetailedWorkerProfile[],
  userProfile?: UserProfile,
  appliances: ApplianceInput[] = [],
  householdConsent: boolean = true
): AdminImpactDashboardData {
  // Exclude demo / sample records if in live mode
  const liveBills = (bills || []).filter((b) => b.source !== 'sample');
  const liveRequests = (requests || []).filter(
    (r) => !r.isDemoRequest && (r.status === 'completed' || r.status === 'accepted' || r.status === 'in_progress')
  );
  const liveWorkers = (workers || []).filter((w) => !w.isDemoProfile);
  const householdRecords = getLiveHouseholdImpact(liveBills, liveRequests, userProfile, appliances, householdConsent);
  const workerMetrics = calculateWorkerMetricsFromRequests(liveRequests, liveWorkers);

  const tripartiteSummary = computeTripartiteImpact(householdRecords, workerMetrics);

  const consentingHouseholds = householdRecords.filter((h) => h.consentGiven);
  const totalCompletedServices = workerMetrics.reduce(
    (sum, w) => sum + w.completedAssignments,
    0
  );
  const totalPaidAssignmentsInr = workerMetrics.reduce(
    (sum, w) => sum + w.totalDocumentedEarningsInr,
    0
  );

  // Generate monthly trajectory from actual records if they exist
  const monthlyTrajectory: AdminImpactDashboardData['monthlyTrajectory'] = [];
  if (householdRecords.length > 0 && tripartiteSummary.measuredImpact.totalVerifiedSavingsKwhMonthly > 0) {
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    monthlyTrajectory.push({
      month: currentMonth,
      measuredKwhSaved: tripartiteSummary.measuredImpact.totalVerifiedSavingsKwhMonthly,
      estimatedKwhSaved: tripartiteSummary.estimatedImpact.totalEstimatedSavingsKwhMonthly,
      workerEarningsDisbursedInr: tripartiteSummary.measuredImpact.verifiedWorkerEarningsInr,
      completedJobs: totalCompletedServices,
    });
  }

  return {
    totalConsentingHouseholds: consentingHouseholds.length,
    totalCompletedServices,
    totalActiveWorkers: workerMetrics.filter((w) => w.completedAssignments > 0 || w.acceptedAssignments > 0).length,
    totalDocumentedPaidAssignmentsInr: totalPaidAssignmentsInr,
    householdFollowUpRecords: householdRecords,
    workerImpactRecords: workerMetrics.filter((w) => w.completedAssignments > 0 || w.acceptedAssignments > 0),
    tripartiteSummary,
    monthlyTrajectory,
    isDemonstrationData: false,
    lastAuditTimestamp: new Date().toISOString(),
  };
}
