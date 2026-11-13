import { describe, it, expect } from 'vitest';
import {
  runSolarFeasibilityEngine,
  generateSolarScenarios,
  identifyMissingInformation,
  DEFAULT_SOLAR_TARIFF,
} from '../solarEngine';

describe('Solar Feasibility Assistant Engine', () => {
  describe('1. Three Decision Pathways', () => {
    it('selects "explore_solar" for individual homeowner with adequate roof and viable load', () => {
      const res = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 350,
        monthlyElectricityBillInr: 2600,
        usableRoofAreaSqFt: 350,
        roofOwnership: 'owned_individual',
      });

      expect(res.decision).toBe('explore_solar');
      expect(res.recommendedCapacityKw).toBeGreaterThanOrEqual(1);
      expect(res.scenarios.central.annualNetBenefitInr).toBeGreaterThan(0);
      expect(res.scenarios.central.simplePaybackYears).not.toBeNull();
      expect(res.decisionTitle).toContain('Explore Rooftop Solar');
    });

    it('selects "save_without_solar" when user is a tenant', () => {
      const res = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 350,
        monthlyElectricityBillInr: 2600,
        usableRoofAreaSqFt: 350,
        roofOwnership: 'tenant',
      });

      expect(res.decision).toBe('save_without_solar');
      expect(res.decisionRationale).toContain('tenant');
      expect(res.suggestedNextSteps.some((s) => s.includes('BLDC') || s.includes('efficiency'))).toBe(true);
    });

    it('selects "save_without_solar" when roof area is below 80 sq ft', () => {
      const res = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 300,
        monthlyElectricityBillInr: 2200,
        usableRoofAreaSqFt: 50, // Insufficient area
        roofOwnership: 'owned_individual',
      });

      expect(res.decision).toBe('save_without_solar');
      expect(res.decisionRationale).toContain('usable roof area');
    });

    it('selects "save_without_solar" for apartment residents without exclusive terrace rights', () => {
      const res = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 400,
        monthlyElectricityBillInr: 3000,
        usableRoofAreaSqFt: 500,
        roofOwnership: 'shared_apartment',
      });

      expect(res.decision).toBe('save_without_solar');
      expect(res.decisionRationale).toContain('Apartment terraces are common property');
    });

    it('selects "review_existing_installation" when user has existing solar plant', () => {
      const res = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 450,
        monthlyElectricityBillInr: 500,
        usableRoofAreaSqFt: 400,
        roofOwnership: 'owned_individual',
        hasExistingInstallation: true,
        existingInstallationKw: 3,
      });

      expect(res.decision).toBe('review_existing_installation');
      expect(res.decisionTitle).toContain('Review & Optimize Existing Solar');
      expect(res.suggestedNextSteps.some((s) => s.includes('washing') || s.includes('cleaning'))).toBe(true);
    });
  });

  describe('2. Scenario Modeling (Conservative, Central, Optimistic)', () => {
    it('generates distinct progressive scenarios based on insolation and self-consumption', () => {
      const scenarios = generateSolarScenarios(3, 102000, DEFAULT_SOLAR_TARIFF);

      // Annual generation progression
      expect(scenarios.conservative.annualGenerationKwh).toBeLessThan(scenarios.central.annualGenerationKwh);
      expect(scenarios.central.annualGenerationKwh).toBeLessThan(scenarios.optimistic.annualGenerationKwh);

      // Annual net benefit progression
      expect(scenarios.conservative.annualNetBenefitInr).toBeLessThan(scenarios.central.annualNetBenefitInr);
      expect(scenarios.central.annualNetBenefitInr).toBeLessThan(scenarios.optimistic.annualNetBenefitInr);

      // Degradation rates
      expect(scenarios.conservative.degradationRatePercent).toBe(1.0);
      expect(scenarios.central.degradationRatePercent).toBe(0.7);
      expect(scenarios.optimistic.degradationRatePercent).toBe(0.5);
    });
  });

  describe('3. Safety and Accuracy Mandates', () => {
    it('strictly does not calculate payback if annual net benefit is non-positive', () => {
      // Artificially high maintenance cost exceeding generation value
      const scenarios = generateSolarScenarios(1, 40000, DEFAULT_SOLAR_TARIFF, 50000);

      expect(scenarios.conservative.annualNetBenefitInr).toBeLessThanOrEqual(0);
      expect(scenarios.conservative.simplePaybackYears).toBeNull();
    });

    it('never guarantees government subsidy approval in results', () => {
      const res = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 350,
        monthlyElectricityBillInr: 2600,
        usableRoofAreaSqFt: 350,
        roofOwnership: 'owned_individual',
      });

      expect(res.isSubsidyGuaranteed).toBe(false);
      expect(res.disclaimers.some((d) => d.includes('cannot be guaranteed in advance'))).toBe(true);
    });

    it('demands professional on-site structural inspection and disclaims photo certification', () => {
      const res = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 350,
        monthlyElectricityBillInr: 2600,
        usableRoofAreaSqFt: 350,
        roofOwnership: 'owned_individual',
      });

      expect(res.disclaimers.some((d) => d.includes('structural load-bearing capacity') && d.includes('photographs'))).toBe(true);
      expect(res.missingInformation.some((m) => m.field === 'structuralSafetyInspection')).toBe(true);
    });

    it('clearly distinguishes confirmed facts from engineering assumptions', () => {
      const res = runSolarFeasibilityEngine({
        monthlyConsumptionKwh: 320,
        monthlyElectricityBillInr: 2400,
        usableRoofAreaSqFt: 400,
        roofOwnership: 'owned_individual',
      });

      expect(res.confirmedFacts.length).toBeGreaterThan(0);
      expect(res.engineeringAssumptions.length).toBeGreaterThan(0);
      expect(res.confirmedFacts.some((f) => f.includes('320 kWh'))).toBe(true);
      expect(res.engineeringAssumptions.some((a) => a.includes('1,460 kWh/kW/year'))).toBe(true);
    });
  });

  describe('4. Missing Information Audit', () => {
    it('identifies unmeasured roof, missing quotes, and unverified subsidy', () => {
      const missing = identifyMissingInformation({
        monthlyConsumptionKwh: 300,
        monthlyElectricityBillInr: 2200,
        usableRoofAreaSqFt: 0,
        roofOwnership: 'owned_individual',
        applicableFinancialAssistanceInr: 78000,
        isSubsidyVerified: false,
      });

      expect(missing.some((m) => m.field === 'usableRoofAreaSqFt')).toBe(true);
      expect(missing.some((m) => m.field === 'installationQuotationInr')).toBe(true);
      expect(missing.some((m) => m.field === 'isSubsidyVerified')).toBe(true);
    });
  });
});

