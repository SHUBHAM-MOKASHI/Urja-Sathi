import { describe, it, expect } from 'vitest';
import {
  calculateVerifiedConsumptionDrop,
  calculateCompletedWorkerEarnings,
  classifyImpactEvidence,
  getLiveHouseholdImpact,
  getLiveWorkerImpact,
  getLiveAdminImpactData,
  auditHouseholdRecord,
  computeTripartiteImpact,
} from '../impactTrackerService';
import { getDemoAdminImpactData } from '../../data/impactDemoData';
import {
  ElectricityBill,
  ServiceRequest,
  DetailedWorkerProfile,
  UserProfile,
  HouseholdImpactRecord,
} from '../../types';

describe('BATCH 3: Impact Tracker Live Data Integration & Verification Engine', () => {
  const sampleWorkerProfile: DetailedWorkerProfile = {
    id: 'worker_live_01',
    name: 'Devendra Rathore',
    roleCategory: 'licensed_wireman',
    verificationStatus: 'verified_licensed',
    experienceYears: 8,
    phone: '+91 98260 11223',
    locality: 'Indore',
    pincode: '452001',
    serviceRadiusKm: 15,
    isAvailableToday: true,
    hourlyRateInr: 400,
    rating: 4.9,
    reviewCount: 30,
    completedJobsCount: 45,
    selfDeclaredSkills: ['Home rewiring'],
    verifiedQualifications: [
      {
        id: 'q1',
        certificateName: 'Licensed Wireman Grade 1',
        certificateNumber: 'MP-ELEC-2018-881',
        issuingAuthority: 'MP Licensing Board',
        issueDate: '2018-05-10',
        isVerified: true,
      },
    ],
    isDemoProfile: false,
    disclaimer: 'Certified for domestic wiring.',
  };

  // -------------------------------------------------------------------------
  // Test 1: Demonstration mode displays existing sample data
  // -------------------------------------------------------------------------
  it('Test 1: Demonstration mode displays existing sample data with explicit demo labelling', () => {
    const demoData = getDemoAdminImpactData();

    expect(demoData.isDemonstrationData).toBe(true);
    expect(demoData.householdFollowUpRecords.length).toBeGreaterThan(0);
    expect(demoData.workerImpactRecords.length).toBeGreaterThan(0);
    expect(demoData.totalConsentingHouseholds).toBe(4);
    expect(demoData.totalCompletedServices).toBe(55);
    expect(demoData.tripartiteSummary.measuredImpact.totalVerifiedSavingsKwhMonthly).toBe(275);
    expect(demoData.tripartiteSummary.estimatedImpact.totalEstimatedSavingsKwhMonthly).toBe(65);
    expect(demoData.tripartiteSummary.potentialImpact.totalPotentialSavingsKwhMonthly).toBe(275);
  });

  // -------------------------------------------------------------------------
  // Test 2: Live mode displays actual stored records
  // -------------------------------------------------------------------------
  it('Test 2: Live mode loads and compiles actual stored household and service records', () => {
    const bills: ElectricityBill[] = [
      {
        id: 'live_bill_base',
        consumerNumber: '1029384756',
        consumerName: 'Rajesh Sharma',
        billMonth: 'December 2025',
        billDate: '2025-12-15',
        dueDate: '2026-01-05',
        unitsConsumed: 450,
        totalAmount: 3600,
        tariffRatePerUnit: 8.0,
        fixedCharges: 250,
        surcharges: 50,
        isPeakSeason: false,
        source: 'manual',
        userEdited: true,
        createdAt: '2025-12-15T10:00:00Z',
      },
      {
        id: 'live_bill_sub',
        consumerNumber: '1029384756',
        consumerName: 'Rajesh Sharma',
        billMonth: 'January 2026',
        billDate: '2026-01-16',
        dueDate: '2026-02-05',
        unitsConsumed: 360,
        totalAmount: 2880,
        tariffRatePerUnit: 8.0,
        fixedCharges: 250,
        surcharges: 50,
        isPeakSeason: false,
        source: 'ocr_scan',
        userEdited: true, // Confirmed by user
        ocrConfidence: 0.95,
        createdAt: '2026-01-16T10:00:00Z',
      },
    ];

    const requests: ServiceRequest[] = [
      {
        id: 'req_live_comp_01',
        householdName: 'Rajesh Sharma',
        householdPhone: '+91 98270 99887',
        locality: 'Indore',
        pincode: '452001',
        requestType: 'technical_electrical',
        title: 'BLDC Fan Installation & Neutral Check',
        description: 'Installed 3 energy efficient BLDC fans',
        preferredDate: '2025-12-20',
        preferredTimeSlot: '10:00 AM',
        assignedWorkerId: 'worker_live_01',
        assignedWorkerName: 'Devendra Rathore',
        status: 'completed',
        isTechnical: true,
        consentGiven: true,
        createdAt: '2025-12-19T10:00:00Z',
        completedAt: '2025-12-20T12:00:00Z',
        paymentRecordedInr: 600,
        paymentMethod: 'upi',
      },
    ];

    const userProfile: UserProfile = {
      id: 'default_user',
      name: 'Rajesh Sharma',
      pincode: '452001',
      state: 'Madhya Pradesh',
      hasRooftopAccess: true,
      preferredLanguage: 'hi',
    };

    const liveData = getLiveAdminImpactData(
      bills,
      requests,
      [sampleWorkerProfile],
      userProfile,
      []
    );

    // Also verify getLiveHouseholdImpact and getLiveWorkerImpact modular functions directly
    const directHouseholds = getLiveHouseholdImpact(bills, requests, userProfile, []);
    expect(directHouseholds).toHaveLength(1);
    expect(directHouseholds[0].householdName).toBe('Rajesh Sharma');

    const directWorkerMetrics = getLiveWorkerImpact(requests, [sampleWorkerProfile]);
    expect(directWorkerMetrics).toHaveLength(1);
    expect(directWorkerMetrics[0].verifiedEarningsInr).toBe(600);

    expect(liveData.isDemonstrationData).toBe(false);
    expect(liveData.householdFollowUpRecords).toHaveLength(1);
    expect(liveData.totalConsentingHouseholds).toBe(1);
    expect(liveData.totalCompletedServices).toBe(1);
    expect(liveData.totalDocumentedPaidAssignmentsInr).toBe(600);

    // Verified drop: 450 - 360 = 90 kWh
    const household = liveData.householdFollowUpRecords[0];
    expect(household.verifiedMonthlySavingsKwh).toBe(90);
    expect(household.verifiedMonthlySavingsInr).toBe(720); // 3600 - 2880
    expect(household.evidenceQuality).toBe('verified');
  });

  // -------------------------------------------------------------------------
  // Test 3: Live mode with no records shows an empty state
  // -------------------------------------------------------------------------
  it('Test 3: Live mode with empty storage produces zero records and empty state without falling back to demo data', () => {
    const liveData = getLiveAdminImpactData([], [], [], undefined, []);

    expect(liveData.isDemonstrationData).toBe(false);
    expect(liveData.householdFollowUpRecords).toHaveLength(0);
    expect(liveData.workerImpactRecords).toHaveLength(0);
    expect(liveData.totalConsentingHouseholds).toBe(0);
    expect(liveData.totalCompletedServices).toBe(0);
    expect(liveData.totalActiveWorkers).toBe(0);
    expect(liveData.totalDocumentedPaidAssignmentsInr).toBe(0);
    expect(liveData.tripartiteSummary.measuredImpact.totalVerifiedSavingsKwhMonthly).toBe(0);
    expect(liveData.tripartiteSummary.measuredImpact.verifiedHouseholdsCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 4: Missing subsequent bill does not produce zero consumption
  // -------------------------------------------------------------------------
  it('Test 4: Missing subsequent bill does not interpret consumption as zero and avoids fake drops', () => {
    const baselineBill: ElectricityBill = {
      id: 'single_bill_01',
      consumerNumber: '1029384756',
      consumerName: 'Anita Jain',
      billMonth: 'January 2026',
      billDate: '2026-01-10',
      dueDate: '2026-01-30',
      unitsConsumed: 380,
      totalAmount: 3040,
      tariffRatePerUnit: 8.0,
      fixedCharges: 250,
      surcharges: 50,
      isPeakSeason: false,
      source: 'manual',
      createdAt: '2026-01-10T10:00:00Z',
    };

    // Calculate drop without subsequent bill
    const drop = calculateVerifiedConsumptionDrop(baselineBill, null);

    expect(drop.isComparable).toBe(false);
    expect(drop.kwhDifference).toBe(0);
    // Crucial: Must NOT report baseline (380 - 0 = 380) as a drop!
    expect(drop.percentReduction).toBe(0);
    expect(drop.reason).toContain('A missing subsequent bill is never treated as zero consumption');

    // Audit single household record
    const singleRecord: HouseholdImpactRecord = {
      householdId: 'hh_single',
      householdName: 'Anita Jain',
      locality: 'Indore',
      pincode: '452001',
      consentGiven: true,
      consentDate: '2026-01-10',
      baselineBill: {
        billId: 'single_bill_01',
        billMonth: 'January 2026',
        billDate: '2026-01-10',
        unitsKwh: 380,
        amountInr: 3040,
      },
      subsequentBill: undefined, // Missing!
      recommendedActions: [],
      completedActions: [
        {
          actionId: 'act_1',
          actionTitle: 'Tuned AC Setpoint',
          completedDate: '2026-01-15',
          documentedExpenditureInr: 0,
        },
      ],
      totalDocumentedExpenditureInr: 0,
      estimatedMonthlySavingsKwh: 40,
      estimatedMonthlySavingsInr: 320,
      verifiedMonthlySavingsKwh: null,
      verifiedMonthlySavingsInr: null,
      evidenceQuality: 'pending_subsequent_bill',
      auditNotes: '',
      lastAuditedDate: '2026-01-20',
    };

    const audited = auditHouseholdRecord(singleRecord);
    expect(audited.verifiedMonthlySavingsKwh).toBeNull();
    expect(audited.evidenceQuality).toBe('pending_subsequent_bill');
    expect(audited.auditNotes).toContain('never treated as zero consumption');
  });

  // -------------------------------------------------------------------------
  // Test 5: Comparable bill readings calculate correct consumption difference
  // -------------------------------------------------------------------------
  it('Test 5: Comparable bill readings calculate exact consumption difference and percentage', () => {
    const base: ElectricityBill = {
      id: 'b1',
      consumerNumber: 'CA-99001',
      unitsConsumed: 500,
      totalAmount: 4000,
      billDate: '2025-11-01',
      dueDate: '2025-11-20',
      billMonth: 'November 2025',
      tariffRatePerUnit: 8.0,
      fixedCharges: 250,
      surcharges: 50,
      isPeakSeason: false,
      source: 'manual',
      createdAt: '2025-11-01T10:00:00Z',
    };

    const sub: ElectricityBill = {
      id: 'b2',
      consumerNumber: 'CA-99001',
      unitsConsumed: 400,
      totalAmount: 3200,
      billDate: '2025-12-01',
      dueDate: '2025-12-20',
      billMonth: 'December 2025',
      tariffRatePerUnit: 8.0,
      fixedCharges: 250,
      surcharges: 50,
      isPeakSeason: false,
      source: 'manual',
      createdAt: '2025-12-01T10:00:00Z',
    };

    const drop = calculateVerifiedConsumptionDrop(base, sub);

    expect(drop.isComparable).toBe(true);
    expect(drop.kwhDifference).toBe(100); // 500 - 400
    expect(drop.amountDifference).toBe(800); // 4000 - 3200
    expect(drop.percentReduction).toBe(20); // (100 / 500) * 100
    expect(drop.reason).toContain('Verified reduction of 100 kWh');
  });

  // -------------------------------------------------------------------------
  // Test 6: Non-comparable billing periods are excluded
  // -------------------------------------------------------------------------
  it('Test 6: Non-comparable billing periods (too short, too long, mismatched IDs) are excluded', () => {
    const base: ElectricityBill = {
      id: 'b_base',
      consumerNumber: 'CA-1001',
      unitsConsumed: 400,
      totalAmount: 3200,
      billDate: '2026-01-01',
      dueDate: '2026-01-20',
      billMonth: 'January 2026',
      tariffRatePerUnit: 8,
      fixedCharges: 200,
      surcharges: 0,
      isPeakSeason: false,
      source: 'manual',
      createdAt: '2026-01-01T10:00:00Z',
    };

    // Case A: Interval too short (5 days)
    const tooShort: ElectricityBill = {
      ...base,
      id: 'b_short',
      billDate: '2026-01-06',
      unitsConsumed: 100,
    };
    const shortDrop = calculateVerifiedConsumptionDrop(base, tooShort);
    expect(shortDrop.isComparable).toBe(false);
    expect(shortDrop.reason).toContain('too short');

    // Case B: Interval too long (> 365 days)
    const tooLong: ElectricityBill = {
      ...base,
      id: 'b_long',
      billDate: '2027-03-01',
      unitsConsumed: 300,
    };
    const longDrop = calculateVerifiedConsumptionDrop(base, tooLong);
    expect(longDrop.isComparable).toBe(false);
    expect(longDrop.reason).toContain('exceeds 365 days');

    // Case C: Mismatched consumer number (different household)
    const differentConsumer: ElectricityBill = {
      ...base,
      id: 'b_diff',
      consumerNumber: 'CA-DIFFERENT-9999',
      billDate: '2026-02-01',
      unitsConsumed: 300,
    };
    const mismatchDrop = calculateVerifiedConsumptionDrop(base, differentConsumer);
    expect(mismatchDrop.isComparable).toBe(false);
    expect(mismatchDrop.reason).toContain('Consumer numbers do not match');

    // Case D: Chronologically inverted dates
    const invertedDate: ElectricityBill = {
      ...base,
      id: 'b_inverted',
      billDate: '2025-12-01',
      unitsConsumed: 350,
    };
    const invertedDrop = calculateVerifiedConsumptionDrop(base, invertedDate);
    expect(invertedDrop.isComparable).toBe(false);
    expect(invertedDrop.reason).toContain('chronologically after');
  });

  // -------------------------------------------------------------------------
  // Test 7: OCR data alone is not automatically marked empirically verified
  // -------------------------------------------------------------------------
  it('Test 7: Unconfirmed OCR data alone is not automatically marked empirically verified', () => {
    const statusUnconfirmed = classifyImpactEvidence({
      consentGiven: true,
      hasBaselineBill: true,
      hasSubsequentBill: true,
      isComparable: true,
      isConfirmed: false, // Low-confidence OCR without user edit confirmation
      kwhReduction: 80,
    });

    // Must be classified as partially_verified, NOT verified
    expect(statusUnconfirmed).toBe('partially_verified');

    const statusConfirmed = classifyImpactEvidence({
      consentGiven: true,
      hasBaselineBill: true,
      hasSubsequentBill: true,
      isComparable: true,
      isConfirmed: true, // Confirmed
      kwhReduction: 80,
    });

    expect(statusConfirmed).toBe('verified');
  });

  // -------------------------------------------------------------------------
  // Test 8: Records without required consent are excluded
  // -------------------------------------------------------------------------
  it('Test 8: Household records without consent are excluded from verified savings and totals', () => {
    const unconsentedRecord: HouseholdImpactRecord = {
      householdId: 'hh_unconsented',
      householdName: 'Private Resident',
      locality: 'Indore',
      pincode: '452001',
      consentGiven: false, // Consent withheld!
      consentDate: '',
      baselineBill: {
        billId: 'b_base_uncon',
        billMonth: 'Nov 2025',
        billDate: '2025-11-10',
        unitsKwh: 400,
        amountInr: 3200,
      },
      subsequentBill: {
        billId: 'b_sub_uncon',
        billMonth: 'Dec 2025',
        billDate: '2025-12-10',
        unitsKwh: 280,
        amountInr: 2240,
      },
      recommendedActions: [],
      completedActions: [
        {
          actionId: 'act_1',
          actionTitle: 'LED Upgrade',
          completedDate: '2025-11-20',
          documentedExpenditureInr: 1000,
        },
      ],
      totalDocumentedExpenditureInr: 1000,
      estimatedMonthlySavingsKwh: 50,
      estimatedMonthlySavingsInr: 400,
      verifiedMonthlySavingsKwh: null,
      verifiedMonthlySavingsInr: null,
      evidenceQuality: 'insufficient_evidence',
      auditNotes: '',
      lastAuditedDate: '2025-12-15',
    };

    const audited = auditHouseholdRecord(unconsentedRecord);
    expect(audited.evidenceQuality).toBe('insufficient_evidence');
    expect(audited.verifiedMonthlySavingsKwh).toBeNull();
    expect(audited.auditNotes).toContain('not provided tracking and data-verification consent');

    // Aggregate tripartite check
    const summary = computeTripartiteImpact([audited], []);
    expect(summary.measuredImpact.totalVerifiedSavingsKwhMonthly).toBe(0);
    expect(summary.measuredImpact.verifiedHouseholdsCount).toBe(0);
    expect(summary.estimatedImpact.totalEstimatedSavingsKwhMonthly).toBe(0);
    expect(summary.potentialImpact.totalPotentialSavingsKwhMonthly).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 9: Pending worker services are excluded from earnings
  // -------------------------------------------------------------------------
  it('Test 9: Pending worker service requests are excluded from documented earnings', () => {
    const pendingRequest: ServiceRequest = {
      id: 'req_pending_1',
      householdName: 'User Test',
      householdPhone: '+91 98765 43210',
      locality: 'Indore',
      pincode: '452001',
      requestType: 'technical_solar',
      title: 'Solar Inverter Earthing Inspection',
      description: 'Pending inspection',
      preferredDate: '2026-03-01',
      preferredTimeSlot: '10:00 AM',
      status: 'pending', // Pending!
      isTechnical: true,
      consentGiven: true,
      createdAt: '2026-02-28T10:00:00Z',
      paymentRecordedInr: 500, // Proposed fee, but job is not finished!
    };

    const earnings = calculateCompletedWorkerEarnings([pendingRequest]);
    expect(earnings.totalEarningsInr).toBe(0);
    expect(earnings.completedPaidCount).toBe(0);
    expect(earnings.completedTotalCount).toBe(0);
    expect(earnings.transactions).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Test 10: Cancelled services are excluded
  // -------------------------------------------------------------------------
  it('Test 10: Cancelled service requests are excluded from completed jobs and earnings', () => {
    const cancelledRequest: ServiceRequest = {
      id: 'req_cancelled_1',
      householdName: 'User Test',
      householdPhone: '+91 98765 43210',
      locality: 'Indore',
      pincode: '452001',
      requestType: 'technical_electrical',
      title: 'Capacitor Replacement',
      description: 'Cancelled by household',
      preferredDate: '2026-02-10',
      preferredTimeSlot: 'Afternoon',
      status: 'cancelled', // Cancelled!
      isTechnical: true,
      consentGiven: true,
      createdAt: '2026-02-09T10:00:00Z',
      paymentRecordedInr: 350,
    };

    const earnings = calculateCompletedWorkerEarnings([cancelledRequest]);
    expect(earnings.totalEarningsInr).toBe(0);
    expect(earnings.completedPaidCount).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Test 11: Duplicate vouchers are not double-counted
  // -------------------------------------------------------------------------
  it('Test 11: Duplicate vouchers / duplicate service requests are deduped to prevent double-counting', () => {
    const completedRequest: ServiceRequest = {
      id: 'req_unique_001',
      householdName: 'Vikas Dubey',
      householdPhone: '+91 98260 77665',
      locality: 'Indore',
      pincode: '452001',
      requestType: 'technical_electrical',
      title: 'MCB Load Balance Fix',
      description: 'Completed job',
      preferredDate: '2026-02-14',
      preferredTimeSlot: '11:00 AM',
      status: 'completed',
      isTechnical: true,
      consentGiven: true,
      createdAt: '2026-02-13T10:00:00Z',
      completedAt: '2026-02-14T12:00:00Z',
      paymentRecordedInr: 450,
      paymentMethod: 'upi',
    };

    // Pass the identical request twice (simulating duplicate sync or double entry)
    const duplicateList = [completedRequest, completedRequest, { ...completedRequest }];
    const earnings = calculateCompletedWorkerEarnings(duplicateList);

    // Earnings must be exactly 450, NOT 1350!
    expect(earnings.totalEarningsInr).toBe(450);
    expect(earnings.completedPaidCount).toBe(1);
    expect(earnings.completedTotalCount).toBe(1);
    expect(earnings.transactions).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Test 12: Missing payment amounts are not fabricated
  // -------------------------------------------------------------------------
  it('Test 12: Missing payment amounts on completed requests are not fabricated or defaulted to 300', () => {
    const unrecordedPaymentRequest: ServiceRequest = {
      id: 'req_unrecorded_pay',
      householdName: 'Sunil Verma',
      householdPhone: '+91 98260 12345',
      locality: 'Indore',
      pincode: '452001',
      requestType: 'non_technical_guidance',
      title: 'Solar Subsidy Application Assistance',
      description: 'Guidance completed, no cash fee requested by community guide',
      preferredDate: '2026-02-15',
      preferredTimeSlot: '10:00 AM',
      status: 'completed',
      isTechnical: false,
      consentGiven: true,
      createdAt: '2026-02-14T10:00:00Z',
      completedAt: '2026-02-15T11:00:00Z',
      paymentRecordedInr: undefined, // Missing payment data!
      paymentMethod: 'waived',
    };

    const earnings = calculateCompletedWorkerEarnings([unrecordedPaymentRequest]);

    // Must be 0, NOT 300!
    expect(earnings.totalEarningsInr).toBe(0);
    expect(earnings.completedPaidCount).toBe(0);
    expect(earnings.completedTotalCount).toBe(1);
    expect(earnings.transactions[0].amountInr).toBe(0);
    expect(earnings.transactions[0].isVerified).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 13: Potential, estimated, measured, and verified impact remain separate
  // -------------------------------------------------------------------------
  it('Test 13: Strictly maintains tripartite non-overlapping separation between Potential, Estimated, and Measured/Verified Impact', () => {
    const householdVerified: HouseholdImpactRecord = {
      householdId: 'hh_verified',
      householdName: 'Verified Home',
      locality: 'Indore',
      pincode: '452001',
      consentGiven: true,
      consentDate: '2025-10-01',
      baselineBill: { billId: 'b1', billMonth: 'Oct 2025', billDate: '2025-10-01', unitsKwh: 400, amountInr: 3200 },
      subsequentBill: { billId: 'b2', billMonth: 'Nov 2025', billDate: '2025-11-01', unitsKwh: 300, amountInr: 2400 },
      recommendedActions: [
        { actionId: 'act_done', actionTitle: 'BLDC Fan', estimatedKwhSavings: 100, estimatedMonetarySavingsInr: 800 },
        { actionId: 'act_pending', actionTitle: 'Solar Water Heater', estimatedKwhSavings: 120, estimatedMonetarySavingsInr: 960 },
      ],
      completedActions: [
        { actionId: 'act_done', actionTitle: 'BLDC Fan', completedDate: '2025-10-15', documentedExpenditureInr: 3000 },
      ],
      totalDocumentedExpenditureInr: 3000,
      estimatedMonthlySavingsKwh: 100,
      estimatedMonthlySavingsInr: 800,
      verifiedMonthlySavingsKwh: 100,
      verifiedMonthlySavingsInr: 800,
      evidenceQuality: 'verified',
      auditNotes: 'Audited drop',
      lastAuditedDate: '2025-11-05',
    };

    const householdPendingBill: HouseholdImpactRecord = {
      householdId: 'hh_pending_bill',
      householdName: 'Pending Bill Home',
      locality: 'Indore',
      pincode: '452001',
      consentGiven: true,
      consentDate: '2025-11-01',
      baselineBill: { billId: 'b3', billMonth: 'Nov 2025', billDate: '2025-11-01', unitsKwh: 500, amountInr: 4000 },
      subsequentBill: undefined, // Subsequent bill pending
      recommendedActions: [
        { actionId: 'act_geyser', actionTitle: 'Geyser Timer Fix', estimatedKwhSavings: 60, estimatedMonetarySavingsInr: 480 },
      ],
      completedActions: [
        { actionId: 'act_geyser', actionTitle: 'Geyser Timer Fix', completedDate: '2025-11-10', documentedExpenditureInr: 400 },
      ],
      totalDocumentedExpenditureInr: 400,
      estimatedMonthlySavingsKwh: 60,
      estimatedMonthlySavingsInr: 480,
      verifiedMonthlySavingsKwh: null,
      verifiedMonthlySavingsInr: null,
      evidenceQuality: 'pending_subsequent_bill',
      auditNotes: 'Awaiting bill',
      lastAuditedDate: '2025-11-15',
    };

    const summary = computeTripartiteImpact([householdVerified, householdPendingBill], []);

    // 1. Measured Impact must ONLY include verified dual-bill household
    expect(summary.measuredImpact.totalVerifiedSavingsKwhMonthly).toBe(100);
    expect(summary.measuredImpact.verifiedHouseholdsCount).toBe(1);

    // 2. Estimated Impact must ONLY include the pending-subsequent-bill household
    expect(summary.estimatedImpact.totalEstimatedSavingsKwhMonthly).toBe(60);
    expect(summary.estimatedImpact.partiallyVerifiedHouseholdsCount).toBe(1);

    // 3. Potential Impact must ONLY include uncompleted pipeline recommendations (Solar Water Heater: 120 kWh)
    expect(summary.potentialImpact.totalPotentialSavingsKwhMonthly).toBe(120);
    expect(summary.potentialImpact.pendingActionCount).toBe(1);

    // Strict non-overlapping invariant:
    expect(summary.measuredImpact.totalVerifiedSavingsKwhMonthly).not.toBe(
      summary.estimatedImpact.totalEstimatedSavingsKwhMonthly
    );
    expect(summary.measuredImpact.totalVerifiedSavingsKwhMonthly).not.toBe(
      summary.potentialImpact.totalPotentialSavingsKwhMonthly
    );
  });
});
