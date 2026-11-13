import {
  HouseholdImpactRecord,
  WorkerImpactMetric,
  AdminImpactDashboardData,
} from '../types';
import {
  auditHouseholdRecord,
  computeTripartiteImpact,
} from '../services/impactTrackerService';

/**
 * Pre-configured Demonstration Household Impact Audit Records
 * Clearly labeled for Hackathon Verification
 */
export const RAW_DEMO_HOUSEHOLDS: HouseholdImpactRecord[] = [
  {
    householdId: 'hh_01_patidar',
    householdName: 'Rameshwar Patidar',
    locality: 'Vijay Nagar, Indore',
    pincode: '452010',
    consentGiven: true,
    consentDate: '2024-05-30',
    baselineBill: {
      billId: 'OCR-MP-2024-05-480',
      billMonth: 'May 2024',
      billDate: '2024-05-28',
      unitsKwh: 480,
      amountInr: 3840,
    },
    subsequentBill: {
      billId: 'OCR-MP-2024-07-340',
      billMonth: 'Jul 2024',
      billDate: '2024-07-28',
      unitsKwh: 340,
      amountInr: 2580,
    },
    recommendedActions: [
      {
        actionId: 'rec_bldc_fan',
        actionTitle: 'Upgrade 3 Induction Fans to 28W BLDC Fans',
        estimatedKwhSavings: 90,
        estimatedMonetarySavingsInr: 720,
      },
      {
        actionId: 'rec_solar_inverter_tuning',
        actionTitle: 'Solar Inverter Earthing & Isolation Fix',
        estimatedKwhSavings: 50,
        estimatedMonetarySavingsInr: 400,
      },
    ],
    completedActions: [
      {
        actionId: 'rec_bldc_fan',
        actionTitle: 'Upgrade 3 Induction Fans to 28W BLDC Fans',
        completedDate: '2024-06-12',
        documentedExpenditureInr: 4200,
        expenseReceiptRef: 'INV-BLDC-9921',
        assistingWorkerId: 'worker_sunil_verma',
        assistingWorkerName: 'Sunil Verma (Licensed Wireman)',
      },
      {
        actionId: 'rec_solar_inverter_tuning',
        actionTitle: 'Solar Inverter Earthing & Isolation Fix',
        completedDate: '2024-06-15',
        documentedExpenditureInr: 450,
        expenseReceiptRef: 'INV-SOLAR-084',
        assistingWorkerId: 'worker_manoj_patidar',
        assistingWorkerName: 'Manoj Patidar (Surya Mitra)',
      },
    ],
    totalDocumentedExpenditureInr: 4650,
    estimatedMonthlySavingsKwh: 140,
    estimatedMonthlySavingsInr: 1120,
    verifiedMonthlySavingsKwh: null,
    verifiedMonthlySavingsInr: null,
    evidenceQuality: 'verified',
    auditNotes: '',
    lastAuditedDate: '2026-02-15',
  },
  {
    householdId: 'hh_02_sharma',
    householdName: 'Deepak Sharma',
    locality: 'Palasia, Indore',
    pincode: '452001',
    consentGiven: true,
    consentDate: '2024-06-10',
    baselineBill: {
      billId: 'OCR-MP-2024-06-420',
      billMonth: 'Jun 2024',
      billDate: '2024-06-29',
      unitsKwh: 420,
      amountInr: 3290,
    },
    // Subsequent bill not yet uploaded - tests pending verification requirement!
    subsequentBill: undefined,
    recommendedActions: [
      {
        actionId: 'rec_ac_setpoint',
        actionTitle: 'Optimal AC Setpoint (24°C) + Motor Capacitor Tuning',
        estimatedKwhSavings: 65,
        estimatedMonetarySavingsInr: 520,
      },
    ],
    completedActions: [
      {
        actionId: 'rec_ac_setpoint',
        actionTitle: 'Optimal AC Setpoint (24°C) + Motor Capacitor Tuning',
        completedDate: '2024-07-05',
        documentedExpenditureInr: 650,
        expenseReceiptRef: 'RCP-AC-5510',
        assistingWorkerId: 'worker_sunil_verma',
        assistingWorkerName: 'Sunil Verma (Licensed Wireman)',
      },
    ],
    totalDocumentedExpenditureInr: 650,
    estimatedMonthlySavingsKwh: 65,
    estimatedMonthlySavingsInr: 520,
    verifiedMonthlySavingsKwh: null,
    verifiedMonthlySavingsInr: null,
    evidenceQuality: 'pending_subsequent_bill',
    auditNotes: '',
    lastAuditedDate: '2026-02-15',
  },
  {
    householdId: 'hh_03_joshi',
    householdName: 'Sunita Joshi',
    locality: 'Sudama Nagar, Indore',
    pincode: '452009',
    consentGiven: true,
    consentDate: '2024-05-15',
    baselineBill: {
      billId: 'OCR-MP-2024-05-310',
      billMonth: 'May 2024',
      billDate: '2024-05-25',
      unitsKwh: 310,
      amountInr: 2480,
    },
    subsequentBill: undefined,
    recommendedActions: [
      {
        actionId: 'rec_refrig_coil',
        actionTitle: 'Clean Refrigerator Condenser Coils & LED Retrofit',
        estimatedKwhSavings: 35,
        estimatedMonetarySavingsInr: 280,
      },
      {
        actionId: 'rec_solar_rooftop',
        actionTitle: 'Explore 2 kW Rooftop Solar via PM Surya Ghar',
        estimatedKwhSavings: 240,
        estimatedMonetarySavingsInr: 1800,
      },
    ],
    completedActions: [], // Pending implementation -> Contributes to Potential Impact!
    totalDocumentedExpenditureInr: 0,
    estimatedMonthlySavingsKwh: 275,
    estimatedMonthlySavingsInr: 2080,
    verifiedMonthlySavingsKwh: null,
    verifiedMonthlySavingsInr: null,
    evidenceQuality: 'insufficient_evidence',
    auditNotes: 'Interventions pending household adoption. Tracked as unrealized potential impact.',
    lastAuditedDate: '2026-02-15',
  },
  {
    householdId: 'hh_04_malviya',
    householdName: 'Suresh Malviya',
    locality: 'Rau, Indore',
    pincode: '453331',
    consentGiven: true,
    consentDate: '2024-05-20',
    baselineBill: {
      billId: 'OCR-MP-2024-05-520',
      billMonth: 'May 2024',
      billDate: '2024-05-26',
      unitsKwh: 520,
      amountInr: 4160,
    },
    subsequentBill: {
      billId: 'OCR-MP-2024-08-385',
      billMonth: 'Aug 2024',
      billDate: '2024-08-25',
      unitsKwh: 385,
      amountInr: 2980,
    },
    recommendedActions: [
      {
        actionId: 'rec_earthing_load_balance',
        actionTitle: 'Safety Earthing Pit Overhaul & 3-Phase Balancing',
        estimatedKwhSavings: 110,
        estimatedMonetarySavingsInr: 880,
      },
    ],
    completedActions: [
      {
        actionId: 'rec_earthing_load_balance',
        actionTitle: 'Safety Earthing Pit Overhaul & 3-Phase Balancing',
        completedDate: '2024-06-20',
        documentedExpenditureInr: 2800,
        expenseReceiptRef: 'INV-EARTH-8812',
        assistingWorkerId: 'worker_sunil_verma',
        assistingWorkerName: 'Sunil Verma (Licensed Wireman)',
      },
    ],
    totalDocumentedExpenditureInr: 2800,
    estimatedMonthlySavingsKwh: 110,
    estimatedMonthlySavingsInr: 880,
    verifiedMonthlySavingsKwh: null,
    verifiedMonthlySavingsInr: null,
    evidenceQuality: 'verified',
    auditNotes: '',
    lastAuditedDate: '2026-02-15',
  },
  {
    householdId: 'hh_05_dave',
    householdName: 'Ananya Dave',
    locality: 'Arera Colony, Bhopal',
    pincode: '462016',
    consentGiven: false, // Withheld consent -> Tests consent audit rule!
    consentDate: '',
    baselineBill: {
      billId: 'OCR-MP-2024-06-390',
      billMonth: 'Jun 2024',
      billDate: '2024-06-27',
      unitsKwh: 390,
      amountInr: 3080,
    },
    subsequentBill: {
      billId: 'OCR-MP-2024-08-310',
      billMonth: 'Aug 2024',
      billDate: '2024-08-27',
      unitsKwh: 310,
      amountInr: 2420,
    },
    recommendedActions: [],
    completedActions: [],
    totalDocumentedExpenditureInr: 0,
    estimatedMonthlySavingsKwh: 0,
    estimatedMonthlySavingsInr: 0,
    verifiedMonthlySavingsKwh: null,
    verifiedMonthlySavingsInr: null,
    evidenceQuality: 'insufficient_evidence',
    auditNotes: 'Household has withheld tracking consent. Excluded from verified impact metrics.',
    lastAuditedDate: '2026-02-15',
  },
];

/**
 * Pre-audited Household Impact Records
 */
export const AUDITED_DEMO_HOUSEHOLDS: HouseholdImpactRecord[] =
  RAW_DEMO_HOUSEHOLDS.map((h) => auditHouseholdRecord(h));

/**
 * Pre-configured Demonstration Worker Impact & Retention Metrics
 */
export const DEMO_WORKER_METRICS: WorkerImpactMetric[] = [
  {
    workerId: 'worker_manoj_patidar',
    workerName: 'Manoj Patidar',
    roleCategory: 'surya_mitra_technician',
    totalServiceRequests: 18,
    acceptedAssignments: 16,
    completedAssignments: 15,
    totalDocumentedEarningsInr: 5250,
    verifiedEarningsInr: 5250,
    paymentTransactions: [
      {
        requestId: 'req_solar_inverter_01',
        date: '2026-02-16',
        amountInr: 450,
        method: 'upi',
        receiptRef: 'RCP-SOLAR-084',
        isVerified: true,
      },
      {
        requestId: 'req_solar_pv_test_02',
        date: '2026-02-10',
        amountInr: 800,
        method: 'upi',
        receiptRef: 'RCP-SOLAR-119',
        isVerified: true,
      },
    ],
    activeMonths: 28,
    completionRatePercent: 94,
    retentionStatus: 'active_retained',
  },
  {
    workerId: 'worker_sunil_verma',
    workerName: 'Sunil Verma',
    roleCategory: 'licensed_wireman',
    totalServiceRequests: 24,
    acceptedAssignments: 22,
    completedAssignments: 21,
    totalDocumentedEarningsInr: 6300,
    verifiedEarningsInr: 6300,
    paymentTransactions: [
      {
        requestId: 'req_load_balance_01',
        date: '2026-02-14',
        amountInr: 650,
        method: 'cash',
        receiptRef: 'RCP-WIRE-5510',
        isVerified: true,
      },
      {
        requestId: 'req_earthing_02',
        date: '2026-02-08',
        amountInr: 900,
        method: 'upi',
        receiptRef: 'RCP-WIRE-8812',
        isVerified: true,
      },
    ],
    activeMonths: 48,
    completionRatePercent: 95,
    retentionStatus: 'active_retained',
  },
  {
    workerId: 'worker_pooja_sharma',
    workerName: 'Pooja Sharma (Urja Saathi)',
    roleCategory: 'community_energy_guide',
    totalServiceRequests: 14,
    acceptedAssignments: 14,
    completedAssignments: 13,
    totalDocumentedEarningsInr: 1950,
    verifiedEarningsInr: 1950,
    paymentTransactions: [
      {
        requestId: 'req_bill_guidance_03',
        date: '2026-02-16',
        amountInr: 150,
        method: 'upi',
        receiptRef: 'RCP-GUIDE-3301',
        isVerified: true,
      },
    ],
    activeMonths: 12,
    completionRatePercent: 93,
    retentionStatus: 'active_retained',
  },
  {
    workerId: 'worker_anil_chouksey',
    workerName: 'Anil Kumar Chouksey',
    roleCategory: 'energy_auditor',
    totalServiceRequests: 8,
    acceptedAssignments: 7,
    completedAssignments: 6,
    totalDocumentedEarningsInr: 3000,
    verifiedEarningsInr: 3000,
    paymentTransactions: [
      {
        requestId: 'req_energy_audit_01',
        date: '2026-02-05',
        amountInr: 1000,
        method: 'upi',
        receiptRef: 'RCP-AUDIT-004',
        isVerified: true,
      },
    ],
    activeMonths: 24,
    completionRatePercent: 86,
    retentionStatus: 'active_retained',
  },
];

/**
 * Monthly Community Impact & Livelihood Trajectory
 */
export const DEMO_MONTHLY_TRAJECTORY = [
  {
    month: 'Sep 2025',
    measuredKwhSaved: 160,
    estimatedKwhSaved: 110,
    workerEarningsDisbursedInr: 2800,
    completedJobs: 9,
  },
  {
    month: 'Oct 2025',
    measuredKwhSaved: 210,
    estimatedKwhSaved: 140,
    workerEarningsDisbursedInr: 3600,
    completedJobs: 12,
  },
  {
    month: 'Nov 2025',
    measuredKwhSaved: 290,
    estimatedKwhSaved: 190,
    workerEarningsDisbursedInr: 4900,
    completedJobs: 16,
  },
  {
    month: 'Dec 2025',
    measuredKwhSaved: 340,
    estimatedKwhSaved: 230,
    workerEarningsDisbursedInr: 6100,
    completedJobs: 19,
  },
  {
    month: 'Jan 2026',
    measuredKwhSaved: 395,
    estimatedKwhSaved: 260,
    workerEarningsDisbursedInr: 7400,
    completedJobs: 23,
  },
  {
    month: 'Feb 2026',
    measuredKwhSaved: 480,
    estimatedKwhSaved: 310,
    workerEarningsDisbursedInr: 8850,
    completedJobs: 28,
  },
];

/**
 * Pre-compiled Complete Admin Impact Dashboard Data
 */
export function getDemoAdminImpactData(): AdminImpactDashboardData {
  const tripartiteSummary = computeTripartiteImpact(
    AUDITED_DEMO_HOUSEHOLDS,
    DEMO_WORKER_METRICS
  );

  const consentingHouseholds = AUDITED_DEMO_HOUSEHOLDS.filter((h) => h.consentGiven);
  const totalCompletedServices = DEMO_WORKER_METRICS.reduce(
    (sum, w) => sum + w.completedAssignments,
    0
  );
  const totalPaidAssignmentsInr = DEMO_WORKER_METRICS.reduce(
    (sum, w) => sum + w.totalDocumentedEarningsInr,
    0
  );

  return {
    totalConsentingHouseholds: consentingHouseholds.length,
    totalCompletedServices,
    totalActiveWorkers: DEMO_WORKER_METRICS.length,
    totalDocumentedPaidAssignmentsInr: totalPaidAssignmentsInr,
    householdFollowUpRecords: AUDITED_DEMO_HOUSEHOLDS,
    workerImpactRecords: DEMO_WORKER_METRICS,
    tripartiteSummary,
    monthlyTrajectory: DEMO_MONTHLY_TRAJECTORY,
    isDemonstrationData: true,
    lastAuditTimestamp: new Date().toISOString(),
  };
}

