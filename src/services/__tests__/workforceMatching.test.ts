import { describe, it, expect } from 'vitest';
import {
  isTechnicalServiceType,
  matchWorkersForRequest,
  filterWorkers,
  createServiceRequest,
  acceptServiceRequest,
  updateServiceRequestStatus,
  recordWorkCompletion,
  submitHouseholdFeedback,
  raiseComplaintTicket,
} from '../workforceMatchingService';
import { SAMPLE_WORKERS, SAMPLE_SERVICE_REQUESTS } from '../../data/workerData';
import { DetailedWorkerProfile, ServiceRequest } from '../../types';

describe('Workforce Matching & Safety Engine', () => {
  describe('Safety Classification & Qualification Enforcement', () => {
    it('correctly classifies technical electrical vs non-technical guidance tasks', () => {
      expect(isTechnicalServiceType('technical_electrical')).toBe(true);
      expect(isTechnicalServiceType('technical_solar')).toBe(true);
      expect(isTechnicalServiceType('technical_energy_audit')).toBe(true);
      expect(isTechnicalServiceType('non_technical_guidance')).toBe(false);
    });

    it('strictly marks non-technical community guides as INELIGIBLE for technical electrical tasks', () => {
      const technicalRequest: Partial<ServiceRequest> = {
        requestType: 'technical_electrical',
        isTechnical: true,
        locality: 'Sudama Nagar, Indore',
        pincode: '452009',
      };

      const matchResults = matchWorkersForRequest(technicalRequest, SAMPLE_WORKERS);
      const communityGuideMatch = matchResults.find(
        (r) => r.worker.roleCategory === 'community_energy_guide'
      );

      expect(communityGuideMatch).toBeDefined();
      expect(communityGuideMatch?.isEligibleForTask).toBe(false);
      expect(communityGuideMatch?.compatibilityScore).toBe(0);
      expect(communityGuideMatch?.ineligibilityReason).toContain('Public Safety Mandate');
    });

    it('strictly marks unverified workers as INELIGIBLE for technical jobs', () => {
      const unverifiedWorker: DetailedWorkerProfile = {
        ...SAMPLE_WORKERS[0],
        id: 'worker_unverified',
        verificationStatus: 'self_declared_only',
      };

      const technicalRequest: Partial<ServiceRequest> = {
        requestType: 'technical_solar',
        isTechnical: true,
      };

      const matchResults = matchWorkersForRequest(technicalRequest, [unverifiedWorker]);
      expect(matchResults[0].isEligibleForTask).toBe(false);
      expect(matchResults[0].ineligibilityReason).toContain('Unverified Skills');
    });

    it('prevents a community energy guide from accepting a technical service request', () => {
      const techRequest: ServiceRequest = {
        ...SAMPLE_SERVICE_REQUESTS[1], // Main MCB tripping
        status: 'pending',
      };
      const poojaGuide = SAMPLE_WORKERS.find((w) => w.roleCategory === 'community_energy_guide')!;

      expect(() => {
        acceptServiceRequest(techRequest, poojaGuide);
      }).toThrow(/Safety Violation/);
    });

    it('allows verified Surya Mitra and licensed wiremen to accept technical requests', () => {
      const techRequest: ServiceRequest = {
        ...SAMPLE_SERVICE_REQUESTS[1],
        status: 'pending',
      };
      const sunilWireman = SAMPLE_WORKERS.find((w) => w.id === 'worker_sunil_verma')!;

      const accepted = acceptServiceRequest(techRequest, sunilWireman);
      expect(accepted.status).toBe('accepted');
      expect(accepted.assignedWorkerId).toBe('worker_sunil_verma');
      expect(accepted.assignedWorkerName).toContain('Sunil Verma');
    });
  });

  describe('Matching Engine Compatibility & Locality Scoring', () => {
    it('ranks workers with exact pincode match and verified credentials at the top', () => {
      const requestInVijayNagar: Partial<ServiceRequest> = {
        requestType: 'technical_solar',
        isTechnical: true,
        locality: 'Vijay Nagar, Indore',
        pincode: '452010', // Exact match for Manoj Patidar
      };

      const matches = matchWorkersForRequest(requestInVijayNagar, SAMPLE_WORKERS);
      expect(matches.length).toBeGreaterThan(0);

      // Manoj Patidar is in Vijay Nagar (452010), Surya Mitra verified -> should be #1
      expect(matches[0].worker.id).toBe('worker_manoj_patidar');
      expect(matches[0].isEligibleForTask).toBe(true);
      expect(matches[0].compatibilityScore).toBeGreaterThanOrEqual(80);
      expect(matches[0].matchReasons.some((r) => r.includes('pincode match'))).toBe(true);
    });

    it('prioritizes community guides for non-technical bill and portal guidance', () => {
      const nonTechRequest: Partial<ServiceRequest> = {
        requestType: 'non_technical_guidance',
        isTechnical: false,
        locality: 'Sudama Nagar, Indore',
        pincode: '452009', // Pooja Sharma's locality
      };

      const matches = matchWorkersForRequest(nonTechRequest, SAMPLE_WORKERS);
      const topMatch = matches[0];

      expect(topMatch.worker.roleCategory).toBe('community_energy_guide');
      expect(topMatch.isEligibleForTask).toBe(true);
      expect(topMatch.matchReasons.some((r) => r.includes('community energy guide'))).toBe(true);
    });
  });

  describe('Service Request Lifecycle & Consent Enforcement', () => {
    it('throws an error if household consent is not provided during creation', () => {
      expect(() => {
        createServiceRequest({
          householdName: 'Anil Gupta',
          householdPhone: '+91 98260 11111',
          locality: 'Indore',
          pincode: '452001',
          requestType: 'technical_electrical',
          title: 'Wiring check',
          description: 'Check MCB',
          preferredDate: '2026-02-20',
          preferredTimeSlot: 'Morning',
          consentGiven: false, // CONSENT MISSING
        });
      }).toThrow(/Household privacy and contact-sharing consent is mandatory/);
    });

    it('successfully creates and tracks a new service request when consent is given', () => {
      const req = createServiceRequest({
        householdName: 'Anil Gupta',
        householdPhone: '+91 98260 11111',
        locality: 'Indore',
        pincode: '452001',
        requestType: 'technical_electrical',
        title: 'Wiring check',
        description: 'Check MCB',
        preferredDate: '2026-02-20',
        preferredTimeSlot: 'Morning',
        consentGiven: true,
      });

      expect(req.id).toBeDefined();
      expect(req.status).toBe('pending');
      expect(req.isTechnical).toBe(true);

      const inProgress = updateServiceRequestStatus(req, 'in_progress');
      expect(inProgress.status).toBe('in_progress');
    });

    it('records work completion notes and payment method correctly', () => {
      const activeReq: ServiceRequest = {
        ...SAMPLE_SERVICE_REQUESTS[0],
        status: 'in_progress',
      };

      const completed = recordWorkCompletion(
        activeReq,
        350,
        'upi',
        'Replaced faulty DC fuse and tightened earthing connection at ACDB.'
      );

      expect(completed.status).toBe('completed');
      expect(completed.paymentRecordedInr).toBe(350);
      expect(completed.paymentMethod).toBe('upi');
      expect(completed.workCompletionNotes).toContain('Replaced faulty DC fuse');
      expect(completed.completedAt).toBeDefined();
    });

    it('submits household feedback with rating and review text', () => {
      const completedReq: ServiceRequest = {
        ...SAMPLE_SERVICE_REQUESTS[2],
      };

      const reviewed = submitHouseholdFeedback(
        completedReq,
        5,
        'Prompt service, arrived on time with proper multimeter and tools!'
      );

      expect(reviewed.householdFeedback?.rating).toBe(5);
      expect(reviewed.householdFeedback?.reviewText).toContain('Prompt service');
    });

    it('raises a complaint ticket with ticket ID and open status', () => {
      const req: ServiceRequest = { ...SAMPLE_SERVICE_REQUESTS[0] };
      const withComplaint = raiseComplaintTicket(
        req,
        'safety_concern',
        'Technician arrived without insulated safety gloves for DC breaker inspection.'
      );

      expect(withComplaint.complaintTicket).toBeDefined();
      expect(withComplaint.complaintTicket?.issueType).toBe('safety_concern');
      expect(withComplaint.complaintTicket?.status).toBe('open');
      expect(withComplaint.complaintTicket?.id).toContain('ticket_');
    });
  });

  describe('Worker Directory Filtering', () => {
    it('filters workers by verified qualification status', () => {
      const verified = filterWorkers(SAMPLE_WORKERS, { verifiedOnly: true });
      expect(verified.every((w) => w.verificationStatus === 'verified_licensed')).toBe(true);
      expect(verified.some((w) => w.roleCategory === 'community_energy_guide')).toBe(false);
    });

    it('filters workers by availability today', () => {
      const available = filterWorkers(SAMPLE_WORKERS, { availableOnly: true });
      expect(available.every((w) => w.isAvailableToday)).toBe(true);
    });

    it('searches workers by skill and certification keywords', () => {
      const searchSurya = filterWorkers(SAMPLE_WORKERS, { searchQuery: 'Surya Mitra' });
      expect(searchSurya.length).toBeGreaterThanOrEqual(1);
      expect(searchSurya[0].name).toBe('Manoj Patidar');
    });
  });
});

