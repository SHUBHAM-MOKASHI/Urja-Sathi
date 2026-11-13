import { describe, it, expect } from 'vitest';
import {
  isPolicyOutdated,
  getAvailableStates,
  getDiscomsForState,
  getSchemesForStateAndDiscom,
  getSchemeById,
  evaluateSchemeReadiness,
} from '../schemeGuidanceService';
import { VERIFIED_GOVERNMENT_SCHEMES } from '../../data/schemesData';
import { UserSchemeReadinessInput } from '../../types';

describe('Government Scheme Guidance Service', () => {
  describe('State and DISCOM Selection & Directory', () => {
    it('returns a comprehensive list of Indian states with distribution utilities', () => {
      const states = getAvailableStates();
      expect(states.length).toBeGreaterThanOrEqual(6);

      const stateNames = states.map((s) => s.stateName);
      expect(stateNames).toContain('Madhya Pradesh');
      expect(stateNames).toContain('Delhi');
      expect(stateNames).toContain('Maharashtra');
      expect(stateNames).toContain('Gujarat');
    });

    it('returns correct DISCOMs for a selected state', () => {
      const mpDiscoms = getDiscomsForState('Madhya Pradesh');
      expect(mpDiscoms.length).toBeGreaterThanOrEqual(2);
      expect(mpDiscoms.some((d) => d.code === 'MPPKVVCL_WEST')).toBe(true);

      const delhiDiscoms = getDiscomsForState('Delhi');
      expect(delhiDiscoms.some((d) => d.code === 'BRPL')).toBe(true);
      expect(delhiDiscoms.some((d) => d.code === 'TPDDL')).toBe(true);
    });

    it('returns empty array when an unknown state is requested', () => {
      const unknown = getDiscomsForState('Atlantis');
      expect(unknown).toEqual([]);
    });
  });

  describe('Scheme Filtering & Distribution Scope', () => {
    it('provides Central schemes (PM Surya Ghar) to any selected state', () => {
      const schemesForMP = getSchemesForStateAndDiscom('Madhya Pradesh');
      const pmSuryaGhar = schemesForMP.find((s) => s.code === 'PM_SURYA_GHAR');
      expect(pmSuryaGhar).toBeDefined();
      expect(pmSuryaGhar?.level).toBe('central');

      const schemesForDelhi = getSchemesForStateAndDiscom('Delhi');
      expect(schemesForDelhi.some((s) => s.code === 'PM_SURYA_GHAR')).toBe(true);
    });

    it('restricts state-specific top-up schemes to their respective states and DISCOMs', () => {
      const delhiSchemes = getSchemesForStateAndDiscom('Delhi', 'BRPL');
      const delhiSolar = delhiSchemes.find((s) => s.code === 'DELHI_SOLAR_POLICY');
      expect(delhiSolar).toBeDefined();

      // Delhi scheme must NOT appear in Maharashtra or Madhya Pradesh
      const mahaSchemes = getSchemesForStateAndDiscom('Maharashtra', 'MSEDCL');
      expect(mahaSchemes.some((s) => s.code === 'DELHI_SOLAR_POLICY')).toBe(false);

      const mpSchemes = getSchemesForStateAndDiscom('Madhya Pradesh', 'MPPKVVCL_WEST');
      expect(mpSchemes.some((s) => s.code === 'DELHI_SOLAR_POLICY')).toBe(false);
    });

    it('filters schemes accurately by category', () => {
      const pumpSchemes = getSchemesForStateAndDiscom('Madhya Pradesh', undefined, 'solar_pumps');
      expect(pumpSchemes.length).toBeGreaterThanOrEqual(1);
      expect(pumpSchemes.every((s) => s.category === 'solar_pumps')).toBe(true);
      expect(pumpSchemes.some((s) => s.code === 'PM_KUSUM_B')).toBe(true);
    });
  });

  describe('Outdated and Unverified Policy Warning Engine', () => {
    it('detects policies older than 180 days and flags them as outdated/verification pending', () => {
      const oldDate = '2023-01-01';
      const isOld = isPolicyOutdated(oldDate, false, new Date('2026-02-15'));
      expect(isOld).toBe(true);
    });

    it('recognizes recently verified policies within the 180-day audit window', () => {
      const recentDate = '2026-02-01';
      const isFresh = isPolicyOutdated(recentDate, false, new Date('2026-02-15'));
      expect(isFresh).toBe(false);
    });

    it('always flags policies explicitly marked as unverified or outdated', () => {
      const isExplicitOutdated = isPolicyOutdated('2026-02-10', true, new Date('2026-02-15'));
      expect(isExplicitOutdated).toBe(true);
    });

    it('includes a warning notice for legacy MP solar water heater scheme', () => {
      const legacyScheme = getSchemeById('mp_solar_water_heater_legacy');
      expect(legacyScheme).toBeDefined();
      expect(legacyScheme?.isUnverifiedOrOutdated).toBe(true);
      expect(legacyScheme?.outdatedWarningNotice).toContain('Policy Information Verification Pending');
    });
  });

  describe('Subsidy Structure & Transparency (No Fabrication)', () => {
    it('verifies PM Surya Ghar matches official MNRE gazette subsidy slabs', () => {
      const pmSurya = getSchemeById('pm_surya_ghar_2024');
      expect(pmSurya).toBeDefined();

      const slab1kw = pmSurya?.slabs.find((s) => s.capacityRange.includes('1 kW'));
      expect(slab1kw?.maxSubsidyInr).toBe(30000);

      const slab2kw = pmSurya?.slabs.find((s) => s.capacityRange.includes('2 kW'));
      expect(slab2kw?.maxSubsidyInr).toBe(60000);

      const slab3kw = pmSurya?.slabs.find((s) => s.capacityRange.includes('3 kW'));
      expect(slab3kw?.maxSubsidyInr).toBe(78000);

      // Must direct to official national portal
      expect(pmSurya?.officialApplicationUrl).toBe('https://pmsuryaghar.gov.in/consumerRegistration');
      expect(pmSurya?.sourceUrl).toBe('https://pmsuryaghar.gov.in');
    });

    it('verifies Delhi Solar Policy includes Generation-Based Incentive (GBI)', () => {
      const delhi = getSchemeById('delhi_solar_policy_2024');
      expect(delhi).toBeDefined();
      const gbiSlab = delhi?.slabs[0];
      expect(gbiSlab?.subsidyFormula).toContain('₹3.00');
      expect(delhi?.officialApplicationUrl).toContain('solar.delhi.gov.in');
    });
  });

  describe('Missing-Information & Critical Pitfall Detection', () => {
    const pmSurya = VERIFIED_GOVERNMENT_SCHEMES[0];

    it('detects name mismatch between electricity bill and bank account as a critical DBT rejection risk', () => {
      const input: UserSchemeReadinessInput = {
        selectedState: 'Madhya Pradesh',
        selectedDiscom: 'MPPKVVCL_WEST',
        consumerType: 'domestic',
        hasActiveConnection: true,
        hasNoOutstandingDues: true,
        roofOwnership: 'owned_individual',
        bankAadhaarLinked: true,
        nameMatchesAcrossDocAndBank: false, // MISMATCH
      };

      const result = evaluateSchemeReadiness(pmSurya, input);
      expect(result.eligibilityStatus).toBe('conditional');
      expect(result.criticalWarnings.length).toBeGreaterThanOrEqual(1);
      const nameMismatchWarning = result.criticalWarnings.some((w) =>
        w.toLowerCase().includes('name on electricity bill does not match')
      );
      expect(nameMismatchWarning).toBe(true);
      expect(result.readyForOfficialSubmission).toBe(false);
    });

    it('flags unseeded Aadhaar accounts with an NPCI DBT warning', () => {
      const input: UserSchemeReadinessInput = {
        selectedState: 'Madhya Pradesh',
        selectedDiscom: 'MPPKVVCL_WEST',
        consumerType: 'domestic',
        hasActiveConnection: true,
        hasNoOutstandingDues: true,
        roofOwnership: 'owned_individual',
        bankAadhaarLinked: false, // NOT SEEDED
        nameMatchesAcrossDocAndBank: true,
      };

      const result = evaluateSchemeReadiness(pmSurya, input);
      expect(result.criticalWarnings.some((w) => w.toLowerCase().includes('npci'))).toBe(true);
      expect(result.readyForOfficialSubmission).toBe(false);
    });

    it('flags outstanding DISCOM arrears as a feasibility block', () => {
      const input: UserSchemeReadinessInput = {
        selectedState: 'Madhya Pradesh',
        selectedDiscom: 'MPPKVVCL_WEST',
        consumerType: 'domestic',
        hasActiveConnection: true,
        hasNoOutstandingDues: false, // PENDING DUES
        roofOwnership: 'owned_individual',
        bankAadhaarLinked: true,
        nameMatchesAcrossDocAndBank: true,
      };

      const result = evaluateSchemeReadiness(pmSurya, input);
      expect(result.criticalWarnings.some((w) => w.toLowerCase().includes('arrears') || w.toLowerCase().includes('dues'))).toBe(true);
    });

    it('flags shared apartment terraces when RWA NOC is missing', () => {
      const input: UserSchemeReadinessInput = {
        selectedState: 'Madhya Pradesh',
        selectedDiscom: 'MPPKVVCL_WEST',
        consumerType: 'domestic',
        hasActiveConnection: true,
        hasNoOutstandingDues: true,
        roofOwnership: 'owned_shared_apartment',
        hasRwaNoc: false, // MISSING NOC
        bankAadhaarLinked: true,
        nameMatchesAcrossDocAndBank: true,
      };

      const result = evaluateSchemeReadiness(pmSurya, input);
      expect(result.criticalWarnings.some((w) => w.toLowerCase().includes('rwa noc'))).toBe(true);
    });

    it('declares commercial connections ineligible for domestic rooftop subsidies', () => {
      const input: UserSchemeReadinessInput = {
        selectedState: 'Delhi',
        selectedDiscom: 'BRPL',
        consumerType: 'commercial', // COMMERCIAL TARIFF
        hasActiveConnection: true,
        hasNoOutstandingDues: true,
        roofOwnership: 'owned_individual',
        bankAadhaarLinked: true,
        nameMatchesAcrossDocAndBank: true,
      };

      const result = evaluateSchemeReadiness(pmSurya, input);
      expect(result.eligibilityStatus).toBe('ineligible');
      expect(result.criticalWarnings.some((w) => w.toLowerCase().includes('ineligible tariff'))).toBe(true);
    });
  });

  describe('Document Readiness & Submission Qualification', () => {
    const pmSurya = VERIFIED_GOVERNMENT_SCHEMES[0];

    it('calculates document readiness percentage and lists missing documents', () => {
      const input: UserSchemeReadinessInput = {
        selectedState: 'Madhya Pradesh',
        selectedDiscom: 'MPPKVVCL_WEST',
        consumerType: 'domestic',
        hasActiveConnection: true,
        hasNoOutstandingDues: true,
        roofOwnership: 'owned_individual',
        bankAadhaarLinked: true,
        nameMatchesAcrossDocAndBank: true,
        checkedDocumentIds: ['doc_electricity_bill', 'doc_aadhaar_card'], // 2 of 4 mandatory
      };

      const result = evaluateSchemeReadiness(pmSurya, input);
      expect(result.documentReadinessPercent).toBe(50);
      expect(result.missingDocuments.length).toBeGreaterThan(0);
      expect(result.readyForOfficialSubmission).toBe(false);
    });

    it('qualifies user as readyForOfficialSubmission when all criteria and documents are complete', () => {
      const mandatoryDocIds = pmSurya.requiredDocuments.filter((d) => d.isMandatory).map((d) => d.id);
      const allCritIds = pmSurya.eligibilityCriteria.map((c) => c.id);

      const input: UserSchemeReadinessInput = {
        selectedState: 'Madhya Pradesh',
        selectedDiscom: 'MPPKVVCL_WEST',
        consumerType: 'domestic',
        hasActiveConnection: true,
        hasNoOutstandingDues: true,
        roofOwnership: 'owned_individual',
        bankAadhaarLinked: true,
        nameMatchesAcrossDocAndBank: true,
        checkedDocumentIds: mandatoryDocIds,
        checkedCriteriaIds: allCritIds,
      };

      const result = evaluateSchemeReadiness(pmSurya, input);
      expect(result.eligibilityStatus).toBe('eligible');
      expect(result.documentReadinessPercent).toBe(100);
      expect(result.criticalWarnings).toHaveLength(0);
      expect(result.readyForOfficialSubmission).toBe(true);
      expect(result.nextActions[0]).toContain('pmsuryaghar.gov.in');
    });

    it('strictly includes non-promissory legal disclaimers on every scheme', () => {
      VERIFIED_GOVERNMENT_SCHEMES.forEach((scheme) => {
        expect(scheme.disclaimers.length).toBeGreaterThanOrEqual(1);
        const disclaimerText = scheme.disclaimers.join(' ').toLowerCase();
        // Must never guarantee or promise approval
        expect(disclaimerText).not.toContain('guaranteed subsidy approval');
        expect(disclaimerText).not.toContain('promise approval');
      });
    });
  });
});
