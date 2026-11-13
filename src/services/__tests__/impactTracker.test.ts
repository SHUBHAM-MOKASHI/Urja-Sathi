import { describe, it, expect } from 'vitest';
import {
  auditHouseholdRecord,
  computeTripartiteImpact,
  calculateWorkerMetricsFromRequests,
} from '../impactTrackerService';
import {
  HouseholdImpactRecord,
  DetailedWorkerProfile,
  ServiceRequest,
} from '../../types';
import {
  RAW_DEMO_HOUSEHOLDS,
  DEMO_WORKER_METRICS,
  getDemoAdminImpactData,
} from '../../data/impactDemoData';

describe('Impact Tracker & Tripartite Audit Engine', () => {
  describe('auditHouseholdRecord() - Empirical Verification Rules', () => {
    it('empirically verifies reduction when both baseline and lower subsequent bills exist', () => {
      const record: HouseholdImpactRecord = {
        householdId: 'test_hh_01',
        householdName: 'Test Household Verified',
        locality: 'Indore',
        pincode: '452001',
        consentGiven: true,
        consentDate: '2024-05-01',
        baselineBill: {
          billId: 'BILL-BASE-01',
          billMonth: 'May 2024',
          billDate: '2024-05-20',
          unitsKwh: 400,
          amountInr: 3200,
        },
        subsequentBill: {
          billId: 'BILL-SUB-01',
          billMonth: 'Jul 2024',
          billDate: '2024-07-20',
          unitsKwh: 280,
          amountInr: 2240,
        },
        recommendedActions: [
          {
            actionId: 'act_bldc',
            actionTitle: 'BLDC Fan Upgrade',
            estimatedKwhSavings: 100,
            estimatedMonetarySavingsInr: 800,
          },
        ],
        completedActions: [
          {
            actionId: 'act_bldc',
            actionTitle: 'BLDC Fan Upgrade',
            completedDate: '2024-06-10',
            documentedExpenditureInr: 3500,
            expenseReceiptRef: 'RCP-BLDC-001',
          },
        ],
        totalDocumentedExpenditureInr: 0,
        estimatedMonthlySavingsKwh: 0,
        estimatedMonthlySavingsInr: 0,
        verifiedMonthlySavingsKwh: null,
        verifiedMonthlySavingsInr: null,
        evidenceQuality: 'verified',
        auditNotes: '',
        lastAuditedDate: '',
      };

      const audited = auditHouseholdRecord(record);

      expect(audited.evidenceQuality).toBe('verified');
      expect(audited.verifiedMonthlySavingsKwh).toBe(120); // 400 - 280
      expect(audited.verifiedMonthlySavingsInr).toBe(960); // 3200 - 2240
      expect(audited.totalDocumentedExpenditureInr).toBe(3500);
      expect(audited.estimatedMonthlySavingsKwh).toBe(100);
      expect(audited.auditNotes).toContain('Empirically verified reduction of 120 kWh/month');
      expect(audited.auditNotes).toContain('BILL-SUB-01');
      expect(audited.auditNotes).toContain('BILL-BASE-01');
    });

    it('marks pending_subsequent_bill and does NOT guess verified savings when subsequent bill is missing', () => {
      const record: HouseholdImpactRecord = {
        householdId: 'test_hh_pending',
        householdName: 'Pending Household',
        locality: 'Indore',
        pincode: '452001',
        consentGiven: true,
        consentDate: '2024-06-01',
        baselineBill: {
          billId: 'BILL-BASE-02',
          billMonth: 'Jun 2024',
          billDate: '2024-06-25',
          unitsKwh: 350,
          amountInr: 2800,
        },
        subsequentBill: undefined, // Missing next billing cycle
        recommendedActions: [
          {
            actionId: 'act_led',
            actionTitle: 'LED Retrofit',
            estimatedKwhSavings: 40,
            estimatedMonetarySavingsInr: 320,
          },
        ],
        completedActions: [
          {
            actionId: 'act_led',
            actionTitle: 'LED Retrofit',
            completedDate: '2024-07-01',
            documentedExpenditureInr: 800,
          },
        ],
        totalDocumentedExpenditureInr: 0,
        estimatedMonthlySavingsKwh: 0,
        estimatedMonthlySavingsInr: 0,
        verifiedMonthlySavingsKwh: null,
        verifiedMonthlySavingsInr: null,
        evidenceQuality: 'verified',
        auditNotes: '',
        lastAuditedDate: '',
      };

      const audited = auditHouseholdRecord(record);

      expect(audited.evidenceQuality).toBe('pending_subsequent_bill');
      expect(audited.verifiedMonthlySavingsKwh).toBeNull();
      expect(audited.verifiedMonthlySavingsInr).toBeNull();
      expect(audited.auditNotes).toContain('Awaiting subsequent billing cycle');
    });

    it('rejects empirical verification and flags insufficient_evidence when baseline bill is missing or 0', () => {
      const record: HouseholdImpactRecord = {
        householdId: 'test_hh_nobase',
        householdName: 'No Baseline Household',
        locality: 'Indore',
        pincode: '452001',
        consentGiven: true,
        consentDate: '2024-06-01',
        baselineBill: {
          billId: 'BILL-INVALID',
          billMonth: 'Jun 2024',
          billDate: '2024-06-25',
          unitsKwh: 0,
          amountInr: 0,
        },
        subsequentBill: {
          billId: 'BILL-SUB-03',
          billMonth: 'Aug 2024',
          billDate: '2024-08-25',
          unitsKwh: 200,
          amountInr: 1600,
        },
        recommendedActions: [
          {
            actionId: 'act_insulation',
            actionTitle: 'Window Weatherization',
            estimatedKwhSavings: 20,
            estimatedMonetarySavingsInr: 160,
          },
        ],
        completedActions: [
          {
            actionId: 'act_insulation',
            actionTitle: 'Window Weatherization',
            completedDate: '2024-06-01',
            documentedExpenditureInr: 500,
          },
        ],
        totalDocumentedExpenditureInr: 0,
        estimatedMonthlySavingsKwh: 0,
        estimatedMonthlySavingsInr: 0,
        verifiedMonthlySavingsKwh: null,
        verifiedMonthlySavingsInr: null,
        evidenceQuality: 'verified',
        auditNotes: '',
        lastAuditedDate: '',
      };

      const audited = auditHouseholdRecord(record);

      expect(audited.evidenceQuality).toBe('insufficient_evidence');
      expect(audited.verifiedMonthlySavingsKwh).toBeNull();
      expect(audited.verifiedMonthlySavingsInr).toBeNull();
      expect(audited.auditNotes).toContain('missing or zero');
    });

    it('strictly withholds verified savings when household consent is not given', () => {
      const record: HouseholdImpactRecord = {
        householdId: 'test_hh_noconsent',
        householdName: 'Withheld Consent Household',
        locality: 'Indore',
        pincode: '452001',
        consentGiven: false, // Consent withheld
        consentDate: '',
        baselineBill: {
          billId: 'BILL-BASE-04',
          billMonth: 'May 2024',
          billDate: '2024-05-20',
          unitsKwh: 500,
          amountInr: 4000,
        },
        subsequentBill: {
          billId: 'BILL-SUB-04',
          billMonth: 'Jul 2024',
          billDate: '2024-07-20',
          unitsKwh: 350,
          amountInr: 2800,
        },
        recommendedActions: [
          {
            actionId: 'act_insulation',
            actionTitle: 'Window Weatherization',
            estimatedKwhSavings: 20,
            estimatedMonetarySavingsInr: 160,
          },
        ],
        completedActions: [
          {
            actionId: 'act_insulation',
            actionTitle: 'Window Weatherization',
            completedDate: '2024-06-01',
            documentedExpenditureInr: 500,
          },
        ],
        totalDocumentedExpenditureInr: 0,
        estimatedMonthlySavingsKwh: 0,
        estimatedMonthlySavingsInr: 0,
        verifiedMonthlySavingsKwh: null,
        verifiedMonthlySavingsInr: null,
        evidenceQuality: 'verified',
        auditNotes: '',
        lastAuditedDate: '',
      };

      const audited = auditHouseholdRecord(record);

      expect(audited.evidenceQuality).toBe('insufficient_evidence');
      expect(audited.verifiedMonthlySavingsKwh).toBeNull();
      expect(audited.verifiedMonthlySavingsInr).toBeNull();
      expect(audited.auditNotes).toContain('not provided tracking and data-verification consent');
    });

    it('flags partially_verified when subsequent consumption did not decrease', () => {
      const record: HouseholdImpactRecord = {
        householdId: 'test_hh_increased',
        householdName: 'Higher Consumption Household',
        locality: 'Indore',
        pincode: '452001',
        consentGiven: true,
        consentDate: '2024-05-01',
        baselineBill: {
          billId: 'BILL-BASE-05',
          billMonth: 'May 2024',
          billDate: '2024-05-20',
          unitsKwh: 300,
          amountInr: 2400,
        },
        subsequentBill: {
          billId: 'BILL-SUB-05',
          billMonth: 'Jul 2024',
          billDate: '2024-07-20',
          unitsKwh: 350, // Higher than baseline
          amountInr: 2800,
        },
        recommendedActions: [
          {
            actionId: 'act_insulation',
            actionTitle: 'Window Weatherization',
            estimatedKwhSavings: 20,
            estimatedMonetarySavingsInr: 160,
          },
        ],
        completedActions: [
          {
            actionId: 'act_insulation',
            actionTitle: 'Window Weatherization',
            completedDate: '2024-06-01',
            documentedExpenditureInr: 500,
          },
        ],
        totalDocumentedExpenditureInr: 0,
        estimatedMonthlySavingsKwh: 0,
        estimatedMonthlySavingsInr: 0,
        verifiedMonthlySavingsKwh: null,
        verifiedMonthlySavingsInr: null,
        evidenceQuality: 'verified',
        auditNotes: '',
        lastAuditedDate: '',
      };

      const audited = auditHouseholdRecord(record);

      expect(audited.evidenceQuality).toBe('partially_verified');
      expect(audited.verifiedMonthlySavingsKwh).toBe(0);
      expect(audited.verifiedMonthlySavingsInr).toBe(0);
      expect(audited.auditNotes).toContain('exceeded or matched baseline');
    });
  });

  describe('computeTripartiteImpact() - Non-Inflation & Tripartite Segregation Mandate', () => {
    it('strictly separates Measured, Estimated, and Potential impact into distinct non-overlapping categories', () => {
      const auditedHouseholds = RAW_DEMO_HOUSEHOLDS.map((h) => auditHouseholdRecord(h));
      const summary = computeTripartiteImpact(auditedHouseholds, DEMO_WORKER_METRICS);

      // Verify Measured Impact structure
      expect(summary.measuredImpact).toBeDefined();
      expect(summary.measuredImpact.totalVerifiedSavingsKwhMonthly).toBeGreaterThan(0);
      expect(summary.measuredImpact.totalVerifiedSavingsInrMonthly).toBeGreaterThan(0);
      expect(summary.measuredImpact.verifiedHouseholdsCount).toBe(2); // Patidar & Malviya
      expect(summary.measuredImpact.verifiedWorkerEarningsInr).toBeGreaterThan(0);
      expect(summary.measuredImpact.basisOfCalculation).toContain('Empirically audited delta');

      // Verify Estimated Impact structure
      expect(summary.estimatedImpact).toBeDefined();
      expect(summary.estimatedImpact.totalEstimatedSavingsKwhMonthly).toBeGreaterThan(0);
      expect(summary.estimatedImpact.partiallyVerifiedHouseholdsCount).toBeGreaterThanOrEqual(1); // Sharma awaiting subsequent
      expect(summary.estimatedImpact.basisOfCalculation).toContain('Engineering simulations');

      // Verify Potential Impact structure
      expect(summary.potentialImpact).toBeDefined();
      expect(summary.potentialImpact.totalPotentialSavingsKwhMonthly).toBeGreaterThan(0);
      expect(summary.potentialImpact.pendingActionCount).toBeGreaterThan(0);
      expect(summary.potentialImpact.basisOfCalculation).toContain('Unrealized pipeline');

      // Segregation check: confirm individual bucket values and house counts
      expect(summary.measuredImpact.totalVerifiedSavingsKwhMonthly).toBe(275);
      expect(summary.estimatedImpact.totalEstimatedSavingsKwhMonthly).toBe(65);
      expect(summary.potentialImpact.totalPotentialSavingsKwhMonthly).toBe(275);
      expect(summary.measuredImpact.verifiedHouseholdsCount).toBe(2);
      expect(summary.estimatedImpact.partiallyVerifiedHouseholdsCount).toBe(1);
      expect(summary.potentialImpact.pendingActionCount).toBe(2);
    });

    it('verifies that an unconsented household does not contribute to measured savings', () => {
      const daveHousehold = RAW_DEMO_HOUSEHOLDS.find((h) => h.householdId === 'hh_05_dave');
      expect(daveHousehold).toBeDefined();
      if (!daveHousehold) return;

      const auditedDave = auditHouseholdRecord(daveHousehold);
      expect(auditedDave.consentGiven).toBe(false);
      expect(auditedDave.verifiedMonthlySavingsKwh).toBeNull();

      const summary = computeTripartiteImpact([auditedDave], []);
      expect(summary.measuredImpact.totalVerifiedSavingsKwhMonthly).toBe(0);
      expect(summary.measuredImpact.verifiedHouseholdsCount).toBe(0);
    });
  });

  describe('calculateWorkerMetricsFromRequests() - Workforce Livelihood Audit', () => {
    it('accurately aggregates completed service requests, documented earnings, and completion rates', () => {
      const mockWorkers: DetailedWorkerProfile[] = [
        {
          id: 'test_worker_01',
          name: 'Mukesh Solanki',
          phone: '+91 98765 43210',
          roleCategory: 'licensed_wireman',
          locality: 'Indore',
          pincode: '452001',
          serviceRadiusKm: 10,
          experienceYears: 5,
          rating: 4.8,
          reviewCount: 20,
          hourlyRateInr: 400,
          completedJobsCount: 15,
          isAvailableToday: true,
          verificationStatus: 'verified_licensed',
          selfDeclaredSkills: ['Wiring', 'Switchboard'],
          verifiedQualifications: [
            {
              id: 'q_01',
              certificateName: 'Licensed Wireman Grade 1',
              certificateNumber: 'ELB-MP-9988',
              issuingAuthority: 'MP Electrical Licensing Board',
              issueDate: '2019-05-10',
              isVerified: true,
            },
          ],
          isDemoProfile: true,
          disclaimer: 'Demo worker',
        },
      ];

      const mockRequests: ServiceRequest[] = [
        {
          id: 'req_01',
          householdName: 'Test Household',
          householdPhone: '+91 98765 00000',
          locality: 'Indore',
          pincode: '452001',
          requestType: 'technical_electrical',
          title: 'BLDC Fan Installation',
          description: 'BLDC Fan Installation',
          preferredDate: '2026-02-14',
          preferredTimeSlot: '10:00 - 12:00',
          isTechnical: true,
          status: 'completed',
          assignedWorkerId: 'test_worker_01',
          assignedWorkerName: 'Mukesh Solanki',
          paymentRecordedInr: 500,
          paymentMethod: 'upi',
          consentGiven: true,
          createdAt: '2026-02-12T10:00:00Z',
          completedAt: '2026-02-14T12:00:00Z',
        },
        {
          id: 'req_02',
          householdName: 'Test Household 2',
          householdPhone: '+91 98765 00001',
          locality: 'Indore',
          pincode: '452001',
          requestType: 'technical_electrical',
          title: 'Switchboard Repair',
          description: 'Switchboard Repair',
          preferredDate: '2026-02-15',
          preferredTimeSlot: '14:00 - 16:00',
          isTechnical: true,
          status: 'completed',
          assignedWorkerId: 'test_worker_01',
          assignedWorkerName: 'Mukesh Solanki',
          paymentRecordedInr: 400,
          paymentMethod: 'cash',
          consentGiven: true,
          createdAt: '2026-02-13T10:00:00Z',
          completedAt: '2026-02-15T11:00:00Z',
        },
      ];

      const metrics = calculateWorkerMetricsFromRequests(mockRequests, mockWorkers);

      expect(metrics).toHaveLength(1);
      const workerMetric = metrics[0];
      expect(workerMetric.workerId).toBe('test_worker_01');
      expect(workerMetric.totalServiceRequests).toBe(2);
      expect(workerMetric.completedAssignments).toBe(2);
      expect(workerMetric.totalDocumentedEarningsInr).toBe(900); // 500 + 400
      expect(workerMetric.verifiedEarningsInr).toBe(900);
      expect(workerMetric.completionRatePercent).toBe(100);
      expect(workerMetric.retentionStatus).toBe('active_retained');
      expect(workerMetric.paymentTransactions).toHaveLength(2);
      expect(workerMetric.paymentTransactions[0].receiptRef).toBe('RCP-01');
    });
  });

  describe('Demonstration Data Sanity & Labelling', () => {
    it('labels admin demo data explicitly as demonstration data', () => {
      const demoData = getDemoAdminImpactData();

      expect(demoData.isDemonstrationData).toBe(true);
      expect(demoData.totalConsentingHouseholds).toBe(4); // 5 total, 1 Dave without consent
      expect(demoData.totalActiveWorkers).toBe(4);
      expect(demoData.householdFollowUpRecords).toHaveLength(5);
      expect(demoData.workerImpactRecords).toHaveLength(4);
      expect(demoData.monthlyTrajectory).toHaveLength(6);
      expect(demoData.tripartiteSummary.measuredImpact.totalVerifiedSavingsKwhMonthly).toBe(275); // 140 Patidar + 135 Malviya
    });
  });
});
