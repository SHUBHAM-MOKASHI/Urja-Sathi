import {
  GovernmentScheme,
  StateDiscomInfo,
  DiscomInfo,
  UserSchemeReadinessInput,
  SchemeReadinessResult,
  GovernmentSchemeCategory,
} from '../types';
import {
  INDIAN_STATES_DISCOMS,
  VERIFIED_GOVERNMENT_SCHEMES,
} from '../data/schemesData';

export const POLICY_VERIFICATION_MAX_AGE_DAYS = 180;

/**
 * Checks whether a government policy circular is outdated or unverified (> 180 days or explicitly flagged)
 */
export function isPolicyOutdated(
  lastVerifiedDateStr: string,
  isExplicitlyFlaggedOutdated?: boolean,
  currentDate: Date = new Date()
): boolean {
  if (isExplicitlyFlaggedOutdated) return true;
  if (!lastVerifiedDateStr) return true;

  try {
    const verifiedDate = new Date(lastVerifiedDateStr);
    if (isNaN(verifiedDate.getTime())) return true;

    const diffTime = currentDate.getTime() - verifiedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > POLICY_VERIFICATION_MAX_AGE_DAYS;
  } catch {
    return true;
  }
}

/**
 * Returns all configured States and their associated DISCOMs
 */
export function getAvailableStates(): StateDiscomInfo[] {
  return INDIAN_STATES_DISCOMS;
}

/**
 * Returns all electricity distribution companies for a selected state
 */
export function getDiscomsForState(stateName: string): DiscomInfo[] {
  const match = INDIAN_STATES_DISCOMS.find(
    (s) => s.stateName.toLowerCase() === (stateName || '').toLowerCase()
  );
  return match ? match.discoms : [];
}

/**
 * Filters government schemes applicable to the user's state, DISCOM, and category
 */
export function getSchemesForStateAndDiscom(
  stateName?: string,
  discomCode?: string,
  category?: GovernmentSchemeCategory | 'all'
): GovernmentScheme[] {
  return VERIFIED_GOVERNMENT_SCHEMES.filter((scheme) => {
    // 1. Category filter
    if (category && category !== 'all' && scheme.category !== category) {
      return false;
    }

    // If no state is specified, return central schemes by default
    if (!stateName) {
      return scheme.level === 'central';
    }

    const stateMatches =
      scheme.applicableStates.includes('all') ||
      scheme.applicableStates.some(
        (s) => s.toLowerCase() === stateName.toLowerCase()
      );

    if (!stateMatches) return false;

    // 2. DISCOM filter if provided
    if (discomCode && !scheme.applicableDiscoms.includes('all')) {
      const discomMatches = scheme.applicableDiscoms.includes(discomCode);
      if (!discomMatches) return false;
    }

    return true;
  });
}

/**
 * Retrieves an individual scheme by ID
 */
export function getSchemeById(id: string): GovernmentScheme | undefined {
  return VERIFIED_GOVERNMENT_SCHEMES.find((s) => s.id === id);
}

/**
 * Deterministic evaluator: Assesses eligibility criteria, document readiness,
 * and detects critical pitfalls (e.g. name mismatch, Aadhaar DBT mapping, unpaid dues)
 */
export function evaluateSchemeReadiness(
  scheme: GovernmentScheme,
  input: UserSchemeReadinessInput
): SchemeReadinessResult {
  const checkedCriteriaSet = new Set(input.checkedCriteriaIds || []);
  const checkedDocsSet = new Set(input.checkedDocumentIds || []);

  const criticalWarnings: string[] = [];
  const nextActions: string[] = [];

  // Critical Pitfall 1: Name Mismatch (Causes 40%+ of DBT subsidy rejections in India)
  if (input.nameMatchesAcrossDocAndBank === false) {
    criticalWarnings.push(
      'Critical DBT Risk: Name on electricity bill does not match bank passbook or Aadhaar card. Under PM Surya Ghar Direct Benefit Transfer, automated bank validation will reject the subsidy. Request a name update from your DISCOM or prepare a gazetted affidavit prior to application.'
    );
    nextActions.push('Ensure name on bank passbook, Aadhaar, and electricity bill are identical letter-for-letter.');
  }

  // Critical Pitfall 2: Bank Account NPCI Aadhaar Mapping
  if (input.bankAadhaarLinked === false) {
    criticalWarnings.push(
      'DBT Payment Risk: Bank account is not seeded with Aadhaar on the NPCI mapper. Subsidies cannot be disbursed to unseeded accounts. Submit an Aadhaar DBT mandate at your home bank branch.'
    );
    nextActions.push('Visit your bank branch and submit the NPCI Aadhaar seeding mandate form.');
  }

  // Critical Pitfall 3: Pending Electricity Arrears
  if (input.hasNoOutstandingDues === false) {
    criticalWarnings.push(
      'DISCOM Feasibility Block: Outstanding electricity dues exist. State DISCOMs will decline technical feasibility clearance for rooftop solar until all past dues are cleared.'
    );
    nextActions.push('Clear all pending electricity bill arrears before submitting your solar application.');
  }

  // Critical Pitfall 4: Property Rights & Apartment Shared Terraces
  if (input.roofOwnership === 'owned_shared_apartment' && !input.hasRwaNoc) {
    criticalWarnings.push(
      'RWA NOC Required: In shared apartment complexes, DISCOM electrical inspectors require a formal written resolution and NOC from the Resident Welfare Association (RWA).'
    );
    nextActions.push('Obtain a signed RWA Society NOC authorizing solar installation and cable shaft routing.');
  } else if (input.roofOwnership === 'tenant') {
    criticalWarnings.push(
      'Tenant Verification: Government rooftop solar subsidies are legally credited to the property meter owner. Written registered landlord authorization is mandatory.'
    );
    nextActions.push('Obtain registered legal consent from the property owner/landlord.');
  }

  // Critical Pitfall 5: Commercial meter applying for residential subsidy
  if (input.consumerType && input.consumerType !== 'domestic' && scheme.category === 'rooftop_solar') {
    criticalWarnings.push(
      `Ineligible Tariff Category: Your connection is registered as "${input.consumerType}". Residential rooftop solar subsidies (PM Surya Ghar) are strictly restricted to Domestic / Residential tariff consumers.`
    );
  }

  // Evaluate Criteria
  const passedCriteria = scheme.eligibilityCriteria.filter((crit) => {
    // If user explicitly checked the box
    if (checkedCriteriaSet.has(crit.id)) return true;

    // Automated deductions from input flags
    if (crit.id === 'crit_residential_meter' && input.consumerType === 'domestic') return true;
    if (crit.id === 'crit_no_discom_dues' && input.hasNoOutstandingDues === true) return true;
    if (crit.id === 'crit_bank_aadhaar' && input.bankAadhaarLinked === true) return true;
    if (
      crit.id === 'crit_roof_ownership' &&
      (input.roofOwnership === 'owned_individual' || (input.roofOwnership === 'owned_shared_apartment' && input.hasRwaNoc))
    ) {
      return true;
    }

    return false;
  });

  const failedCriteria = scheme.eligibilityCriteria.filter(
    (crit) => !passedCriteria.some((p) => p.id === crit.id)
  );

  const mandatoryCriteria = scheme.eligibilityCriteria.filter((c) => c.isMandatory);
  const mandatoryPassed = passedCriteria.filter((c) => c.isMandatory);

  const eligibilityScorePercent = Math.round(
    (passedCriteria.length / Math.max(1, scheme.eligibilityCriteria.length)) * 100
  );

  // Determine Eligibility Status
  let eligibilityStatus: 'eligible' | 'conditional' | 'ineligible';

  if (input.consumerType && input.consumerType !== 'domestic' && scheme.category === 'rooftop_solar') {
    eligibilityStatus = 'ineligible';
  } else if (mandatoryPassed.length === mandatoryCriteria.length && criticalWarnings.length === 0) {
    eligibilityStatus = 'eligible';
  } else if (criticalWarnings.length > 0 || failedCriteria.length > 0) {
    eligibilityStatus = 'conditional';
  } else {
    eligibilityStatus = 'conditional';
  }

  // Document Readiness Calculation
  const mandatoryDocs = scheme.requiredDocuments.filter((d) => d.isMandatory);
  const checkedMandatoryDocs = mandatoryDocs.filter((d) => checkedDocsSet.has(d.id));
  const missingDocuments = scheme.requiredDocuments.filter((d) => !checkedDocsSet.has(d.id));

  const documentReadinessPercent = Math.round(
    (checkedMandatoryDocs.length / Math.max(1, mandatoryDocs.length)) * 100
  );

  const readyForOfficialSubmission =
    eligibilityStatus === 'eligible' &&
    documentReadinessPercent === 100 &&
    criticalWarnings.length === 0;

  if (readyForOfficialSubmission) {
    nextActions.push(
      `Your profile is prepared! Proceed directly to the authorized portal: ${scheme.officialApplicationUrl}`
    );
  } else {
    if (missingDocuments.length > 0) {
      nextActions.push(
        `Collect the ${missingDocuments.length} pending document(s) before logging into ${new URL(scheme.officialApplicationUrl).hostname}.`
      );
    }
  }

  return {
    schemeId: scheme.id,
    eligibilityStatus,
    eligibilityScorePercent,
    passedCriteria,
    failedCriteria,
    documentReadinessPercent,
    missingDocuments,
    criticalWarnings,
    readyForOfficialSubmission,
    nextActions,
  };
}

