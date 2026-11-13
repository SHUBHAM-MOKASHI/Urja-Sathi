import {
  DetailedWorkerProfile,
  ServiceRequest,
  WorkerMatchResult,
  ServiceRequestStatus,
  ComplaintTicket,
  ServiceRequestType,
} from '../types';

/**
 * Checks if a given service request type is technical in nature
 */
export function isTechnicalServiceType(type: ServiceRequestType): boolean {
  return (
    type === 'technical_electrical' ||
    type === 'technical_solar' ||
    type === 'technical_energy_audit'
  );
}

/**
 * Deterministic Workforce Matching Engine
 * Matches service requests with local workers while enforcing strict electrical safety and qualification standards.
 */
export function matchWorkersForRequest(
  request: Partial<ServiceRequest>,
  workers: DetailedWorkerProfile[]
): WorkerMatchResult[] {
  const isTechnical = request.isTechnical ?? (request.requestType ? isTechnicalServiceType(request.requestType) : false);
  const targetPincode = (request.pincode || '').trim();
  const targetLocality = (request.locality || '').toLowerCase().trim();

  const results: WorkerMatchResult[] = workers.map((worker) => {
    const matchReasons: string[] = [];
    let score = 0;
    let isEligible = true;
    let ineligibilityReason: string | undefined = undefined;

    // ---------------------------------------------------------
    // Rule 1: STRICT SAFETY ENFORCEMENT & QUALIFICATION VERIFICATION
    // ---------------------------------------------------------
    if (isTechnical) {
      if (worker.roleCategory === 'community_energy_guide') {
        isEligible = false;
        ineligibilityReason =
          'Public Safety Mandate: Community energy guides perform non-technical awareness and cannot accept live electrical wiring or rooftop PV jobs.';
      } else if (worker.verificationStatus === 'self_declared_only') {
        isEligible = false;
        ineligibilityReason =
          'Unverified Skills: Technical electrical and solar repair strictly requires an independently verified government license or Surya Mitra certificate.';
      } else if (worker.verificationStatus === 'verification_pending') {
        isEligible = false;
        ineligibilityReason =
          'Verification Under Review: Worker licensing documents are currently pending official verification.';
      }
    }

    if (!isEligible) {
      return {
        worker,
        compatibilityScore: 0,
        isEligibleForTask: false,
        ineligibilityReason,
        matchReasons: [],
      };
    }

    // ---------------------------------------------------------
    // Rule 2: Service Category Specialization Match
    // ---------------------------------------------------------
    if (request.requestType === 'technical_solar' && worker.roleCategory === 'surya_mitra_technician') {
      score += 30;
      matchReasons.push('Verified Surya Mitra technician with dedicated solar PV training.');
    } else if (request.requestType === 'technical_electrical' && worker.roleCategory === 'licensed_wireman') {
      score += 30;
      matchReasons.push('Licensed State Wireman qualified for circuit balancing and distribution box safety.');
    } else if (request.requestType === 'technical_energy_audit' && worker.roleCategory === 'energy_auditor') {
      score += 30;
      matchReasons.push('BEE-Certified energy auditor qualified for power profiling.');
    } else if (request.requestType === 'non_technical_guidance' && worker.roleCategory === 'community_energy_guide') {
      score += 35; // Priority for community guides on non-technical guidance
      matchReasons.push('Local community energy guide trained in vernacular bill literacy and PM Surya Ghar portal.');
    } else {
      score += 15; // General cross-qualification
    }

    // ---------------------------------------------------------
    // Rule 3: Locality & Pincode Proximity
    // ---------------------------------------------------------
    const workerPincode = (worker.pincode || '').trim();
    const workerLocality = (worker.locality || '').toLowerCase().trim();

    if (targetPincode && workerPincode && targetPincode === workerPincode) {
      score += 35;
      matchReasons.push(`Exact pincode match (${targetPincode}) in your immediate neighborhood.`);
    } else if (
      targetLocality &&
      (workerLocality.includes(targetLocality) || targetLocality.includes(workerLocality.split(',')[0]))
    ) {
      score += 25;
      matchReasons.push(`Locality coverage in ${worker.locality}.`);
    } else {
      score += 10;
    }

    // ---------------------------------------------------------
    // Rule 4: Availability Status
    // ---------------------------------------------------------
    if (worker.isAvailableToday) {
      score += 15;
      matchReasons.push('Available for on-site dispatch today.');
    } else {
      score += 5;
    }

    // ---------------------------------------------------------
    // Rule 5: Community Rating & Track Record
    // ---------------------------------------------------------
    if (worker.rating >= 4.8) {
      score += 15;
      matchReasons.push(`Top-rated community practitioner (${worker.rating}★ from ${worker.reviewCount} households).`);
    } else if (worker.rating >= 4.5) {
      score += 10;
    }

    // Verified licensing badge bonus
    if (worker.verificationStatus === 'verified_licensed') {
      score += 5;
    }

    const finalScore = Math.min(100, Math.max(0, score));

    return {
      worker,
      compatibilityScore: finalScore,
      isEligibleForTask: true,
      matchReasons,
    };
  });

  // Sort descending by compatibility score
  return results.sort((a, b) => {
    if (a.isEligibleForTask && !b.isEligibleForTask) return -1;
    if (!a.isEligibleForTask && b.isEligibleForTask) return 1;
    return b.compatibilityScore - a.compatibilityScore;
  });
}

/**
 * Filters workers by locality, category, and verification state
 */
export function filterWorkers(
  workers: DetailedWorkerProfile[],
  filters: {
    searchQuery?: string;
    category?: string;
    locality?: string;
    verifiedOnly?: boolean;
    availableOnly?: boolean;
  }
): DetailedWorkerProfile[] {
  return workers.filter((w) => {
    // Search query across name, locality, skills, credentials
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase().trim();
      const nameMatch = w.name.toLowerCase().includes(q);
      const localityMatch = w.locality.toLowerCase().includes(q) || w.pincode.includes(q);
      const skillMatch = w.selfDeclaredSkills.some((s) => s.toLowerCase().includes(q));
      const certMatch = w.verifiedQualifications.some(
        (c) => c.certificateName.toLowerCase().includes(q) || c.certificateNumber.toLowerCase().includes(q)
      );
      if (!nameMatch && !localityMatch && !skillMatch && !certMatch) return false;
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      if (w.roleCategory !== filters.category) return false;
    }

    // Verified only filter
    if (filters.verifiedOnly && w.verificationStatus !== 'verified_licensed') {
      return false;
    }

    // Available today filter
    if (filters.availableOnly && !w.isAvailableToday) {
      return false;
    }

    return true;
  });
}

/**
 * Creates a new service request with safety classification and consent check
 */
export function createServiceRequest(
  input: Omit<ServiceRequest, 'id' | 'createdAt' | 'status' | 'isTechnical'>
): ServiceRequest {
  if (!input.consentGiven) {
    throw new Error('Household privacy and contact-sharing consent is mandatory to dispatch a request.');
  }

  const isTechnical = isTechnicalServiceType(input.requestType);

  return {
    ...input,
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: 'pending',
    isTechnical,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Handles worker accepting a pending service request (verifying eligibility first)
 */
export function acceptServiceRequest(
  request: ServiceRequest,
  worker: DetailedWorkerProfile
): ServiceRequest {
  if (request.status !== 'pending') {
    throw new Error(`Cannot accept request in "${request.status}" status.`);
  }

  // Safety check: technical jobs cannot be accepted by community guides or unverified workers
  if (request.isTechnical) {
    if (worker.roleCategory === 'community_energy_guide' || worker.verificationStatus !== 'verified_licensed') {
      throw new Error(
        'Safety Violation: Non-technical community guides or unverified workers cannot accept technical electrical/solar requests.'
      );
    }
  }

  return {
    ...request,
    assignedWorkerId: worker.id,
    assignedWorkerName: `${worker.name} (${
      worker.roleCategory === 'surya_mitra_technician'
        ? 'Surya Mitra'
        : worker.roleCategory === 'licensed_wireman'
        ? 'Licensed Wireman'
        : worker.roleCategory === 'energy_auditor'
        ? 'Energy Auditor'
        : 'Community Guide'
    })`,
    status: 'accepted',
  };
}

/**
 * Updates service request lifecycle status
 */
export function updateServiceRequestStatus(
  request: ServiceRequest,
  newStatus: ServiceRequestStatus
): ServiceRequest {
  return {
    ...request,
    status: newStatus,
  };
}

/**
 * Records completed work and payment details
 */
export function recordWorkCompletion(
  request: ServiceRequest,
  paymentRecordedInr: number,
  paymentMethod: 'cash' | 'upi' | 'waived',
  workCompletionNotes: string
): ServiceRequest {
  return {
    ...request,
    status: 'completed',
    completedAt: new Date().toISOString(),
    paymentRecordedInr: Math.max(0, paymentRecordedInr),
    paymentMethod,
    workCompletionNotes: workCompletionNotes.trim(),
  };
}

/**
 * Records household feedback and 1-5 star rating
 */
export function submitHouseholdFeedback(
  request: ServiceRequest,
  rating: number,
  reviewText: string
): ServiceRequest {
  return {
    ...request,
    householdFeedback: {
      rating: Math.min(5, Math.max(1, rating)),
      reviewText: reviewText.trim(),
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Raises a complaint / dispute ticket on a service request
 */
export function raiseComplaintTicket(
  request: ServiceRequest,
  issueType: 'safety_concern' | 'unqualified_work' | 'overcharging' | 'no_show' | 'other',
  description: string
): ServiceRequest {
  const ticket: ComplaintTicket = {
    id: `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    serviceRequestId: request.id,
    householdName: request.householdName,
    workerName: request.assignedWorkerName || 'Unassigned Worker',
    issueType,
    description: description.trim(),
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  return {
    ...request,
    complaintTicket: ticket,
  };
}

