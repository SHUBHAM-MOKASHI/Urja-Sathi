import { describe, it, expect } from 'vitest';
import {
  runEnergySavingsEngine,
  validateBillingPeriod,
  normalizeHours,
  calculateApplianceBreakdowns,
} from '../energyEngine';
import { ApplianceInput } from '../../types';

describe('Energy Savings Intelligence Engine', () => {
  const sampleAppliances: ApplianceInput[] = [
    {
      id: 'app_ac',
      name: 'Master Bedroom AC',
      category: 'air_conditioner',
      quantity: 1,
      wattage: 1500,
      dailyUsageHours: 6,
      temperatureSetpointC: 20,
    },
    {
      id: 'app_fan',
      name: 'Ceiling Fans',
      category: 'ceiling_fan',
      quantity: 3,
      wattage: 75,
      dailyUsageHours: 12,
    },
    {
      id: 'app_lights',
      name: 'Hall Tube Lights',
      category: 'lighting',
      quantity: 4,
      wattage: 40,
      dailyUsageHours: 5,
    },
    {
      id: 'app_fridge',
      name: 'Double Door Refrigerator',
      category: 'refrigerator',
      quantity: 1,
      wattage: 200,
      dailyUsageHours: 24,
      ageYears: 3,
    },
    {
      id: 'app_tv',
      name: 'Living Room TV & Setup Box',
      category: 'television',
      quantity: 1,
      wattage: 120,
      dailyUsageHours: 4,
      standbyHours: 20,
    },
  ];

  describe('1. Billing Period & Hours Validation', () => {
    it('validates and accepts valid 30-day period', () => {
      const res = validateBillingPeriod(30);
      expect(res.isValid).toBe(true);
      expect(res.normalizedDays).toBe(30);
    });

    it('rejects zero or negative billing period days', () => {
      const resZero = validateBillingPeriod(0);
      expect(resZero.isValid).toBe(false);
      expect(resZero.error).toContain('greater than zero');

      const resNegative = validateBillingPeriod(-10);
      expect(resNegative.isValid).toBe(false);
    });

    it('rejects periods over 90 days', () => {
      const res = validateBillingPeriod(120);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('exceeds 90 days');
    });

    it('clamps daily usage hours between 0 and 24', () => {
      const resHigh = normalizeHours(28);
      expect(resHigh.normalizedHours).toBe(24);
      expect(resHigh.wasClamped).toBe(true);

      const resNegative = normalizeHours(-5);
      expect(resNegative.normalizedHours).toBe(0);

      const resValid = normalizeHours(8.5);
      expect(resValid.normalizedHours).toBe(8.5);
      expect(resValid.wasClamped).toBe(false);
    });
  });

  describe('2. Appliance Consumption Math', () => {
    it('accurately calculates monthly kWh and percentages', () => {
      const { breakdowns, totalKwh } = calculateApplianceBreakdowns(
        sampleAppliances,
        30,
        7.5
      );

      expect(totalKwh).toBeGreaterThan(0);
      expect(breakdowns.length).toBe(5);

      // Verify fan math: 3 fans * 75W * 12 hrs/day * 30 days / 1000 = 81 kWh
      const fanItem = breakdowns.find((b) => b.category === 'ceiling_fan');
      expect(fanItem?.monthlyKwh).toBe(81);

      // Verify lighting math: 4 bulbs * 40W * 5 hrs/day * 30 days / 1000 = 24 kWh
      const lightItem = breakdowns.find((b) => b.category === 'lighting');
      expect(lightItem?.monthlyKwh).toBe(24);

      // Total percentages must sum close to 100%
      const totalPct = breakdowns.reduce((sum, b) => sum + b.percentageOfTotal, 0);
      expect(Math.round(totalPct)).toBe(100);
    });
  });

  describe('3. Edge Cases: Zero Consumption & Missing Values', () => {
    it('returns insufficient_evidence status on zero consumption', () => {
      const res = runEnergySavingsEngine({
        billedUnitsKwh: 0,
        billAmountInr: 150,
        householdMembers: 4,
        appliances: sampleAppliances,
        userBudgetInr: 5000,
      });

      expect(res.status).toBe('insufficient_evidence');
      expect(res.recommendations.length).toBe(0);
      expect(res.statusMessage).toContain('Zero electricity consumption recorded');
    });

    it('returns insufficient_evidence when appliances list is empty', () => {
      const res = runEnergySavingsEngine({
        billedUnitsKwh: 350,
        billAmountInr: 2600,
        householdMembers: 4,
        appliances: [],
        userBudgetInr: 5000,
      });

      expect(res.status).toBe('insufficient_evidence');
      expect(res.recommendations.length).toBe(0);
      expect(res.statusMessage).toContain('No appliance inventory provided');
    });

    it('returns invalid_input when billing period is negative', () => {
      const res = runEnergySavingsEngine({
        billedUnitsKwh: 300,
        billAmountInr: 2200,
        billingPeriodDays: -5,
        householdMembers: 3,
        appliances: sampleAppliances,
        userBudgetInr: 5000,
      });

      expect(res.status).toBe('invalid_input');
      expect(res.recommendations.length).toBe(0);
    });

    it('returns insufficient_evidence on bare lifeline subsistence consumption', () => {
      const res = runEnergySavingsEngine({
        billedUnitsKwh: 25,
        billAmountInr: 110,
        householdMembers: 4,
        appliances: sampleAppliances,
        userBudgetInr: 1000,
      });

      expect(res.status).toBe('insufficient_evidence');
      expect(res.recommendations.length).toBe(0);
      expect(res.statusMessage).toContain('lifeline subsistence');
    });
  });

  describe('4. High Consumption Handling', () => {
    it('flags high consumption warning when billed units exceed 4000 kWh', () => {
      const res = runEnergySavingsEngine({
        billedUnitsKwh: 4500,
        billAmountInr: 36000,
        householdMembers: 6,
        appliances: sampleAppliances,
        userBudgetInr: 50000,
      });

      expect(res.status).toBe('success');
      expect(res.diagnostics.some((d) => d.includes('Very high monthly consumption'))).toBe(true);
    });
  });

  describe('5. Deterministic Savings & Recommendation Math', () => {
    it('calculates AC temperature optimization using 6% per degree factor', () => {
      const res = runEnergySavingsEngine({
        billedUnitsKwh: 450,
        billAmountInr: 3600,
        householdMembers: 4,
        appliances: sampleAppliances,
        userBudgetInr: 10000,
      });

      expect(res.status).toBe('success');
      const acRec = res.recommendations.find((r) => r.id === 'rec_ac_setpoint');
      expect(acRec).toBeDefined();
      expect(acRec?.category).toBe('no_cost');
      expect(acRec?.upfrontExpenditureInr).toBe(0);
      expect(acRec?.paybackPeriodMonths).toBeNull();
      // From 20 to 24 = 4 degrees * 6% = 24% reduction
      expect(acRec?.reason).toContain('6%');
      expect(acRec?.estimatedEnergyReductionKwh).toBeGreaterThan(0);
      expect(acRec?.estimatedMonetaryBenefitInr).toBeGreaterThan(0);
    });

    it('calculates BLDC ceiling fan retrofit expenditure and payback', () => {
      const res = runEnergySavingsEngine({
        billedUnitsKwh: 450,
        billAmountInr: 3600,
        householdMembers: 4,
        appliances: sampleAppliances,
        userBudgetInr: 10000,
      });

      const fanRec = res.recommendations.find((r) => r.id === 'rec_bldc_fan');
      expect(fanRec).toBeDefined();
      expect(fanRec?.category).toBe('investment');
      // 3 fans * ₹2800 = ₹8400
      expect(fanRec?.upfrontExpenditureInr).toBe(8400);
      expect(fanRec?.paybackPeriodMonths).toBeGreaterThan(0);
      expect(fanRec?.isWithinBudget).toBe(true);
    });

    it('marks recommendations exceeding user budget as not within budget', () => {
      // User with 0 budget (no investment)
      const resZeroBudget = runEnergySavingsEngine({
        billedUnitsKwh: 450,
        billAmountInr: 3600,
        householdMembers: 4,
        appliances: sampleAppliances,
        userBudgetInr: 500, // less than fan cost of ₹8400
      });

      const fanRec = resZeroBudget.recommendations.find((r) => r.id === 'rec_bldc_fan');
      expect(fanRec?.isWithinBudget).toBe(false);

      // No-cost recommendations should still be marked within budget
      const acRec = resZeroBudget.recommendations.find((r) => r.id === 'rec_ac_setpoint');
      expect(acRec?.isWithinBudget).toBe(true);
    });

    it('detects telescopic slab arbitrage when usage is just above 300 units', () => {
      const resArbitrage = runEnergySavingsEngine({
        billedUnitsKwh: 325,
        billAmountInr: 2450,
        householdMembers: 4,
        appliances: sampleAppliances,
        userBudgetInr: 2000,
      });

      const slabRec = resArbitrage.recommendations.find((r) => r.id === 'rec_slab_arbitrage');
      expect(slabRec).toBeDefined();
      expect(slabRec?.estimatedEnergyReductionKwh).toBe(25);
    });
  });
});
