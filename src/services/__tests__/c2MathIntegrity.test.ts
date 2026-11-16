import { describe, expect, it } from 'vitest';
import { PRESET_2BHK, runEnergySavingsEngine } from '../energyEngine';
import { DEFAULT_SOLAR_TARIFF, generateSolarScenarios, runSolarFeasibilityEngine } from '../solarEngine';
import type { EnergyEngineInput, SolarEngineInput } from '../../types';

const energy = (overrides: Partial<EnergyEngineInput> = {}) => runEnergySavingsEngine({ billedUnitsKwh: 325, billAmountInr: 2400, householdMembers: 4, appliances: PRESET_2BHK, userBudgetInr: 10000, ...overrides });
const solar = (overrides: Partial<SolarEngineInput> = {}) => runSolarFeasibilityEngine({ monthlyConsumptionKwh: 100, monthlyElectricityBillInr: 750, usableRoofAreaSqFt: 1000, proposedSolarCapacityKw: 10, roofOwnership: 'owned_individual', ...overrides });

describe('C2 mathematical integrity', () => {
  it('calculates AC savings per appliance instead of using the first thermostat for all ACs', () => {
    const appliances = [
      { ...PRESET_2BHK[0], id: 'cool', temperatureSetpointC: 20 },
      { ...PRESET_2BHK[0], id: 'warm', temperatureSetpointC: 26 },
    ];
    const first = energy({ appliances }).recommendations.find(r => r.id === 'rec_ac_setpoint');
    const reversed = energy({ appliances: [...appliances].reverse() }).recommendations.find(r => r.id === 'rec_ac_setpoint');
    expect(first?.estimatedEnergyReductionKwh).toBe(47);
    expect(reversed?.estimatedEnergyReductionKwh).toBe(47);
  });
  it('does not call a system feasible when payback exceeds the modeled lifetime', () => {
    expect(solar({ tariffAssumptions: { exportCreditRatePerKwh: 0 } }).decision).toBe('save_without_solar');
  });
  it('prorates benchmark assistance for fractional capacity', () => {
    expect(solar({ proposedSolarCapacityKw: 1.5 }).financialAssistanceInr).toBe(45000);
  });
  it.each([24, 26])('does not invent AC savings at %s degrees', temperatureSetpointC => {
    expect(energy({ appliances: [{ ...PRESET_2BHK[0], temperatureSetpointC }] }).recommendations.some(r => r.id === 'rec_ac_setpoint')).toBe(false);
  });
  it('treats zero budget as no investment', () => {
    expect(energy({ userBudgetInr: 0 }).totalUpfrontCostForRecommendedInr).toBe(0);
  });
  it('respects the combined investment budget', () => {
    expect(energy({ userBudgetInr: 8500 }).totalUpfrontCostForRecommendedInr).toBeLessThanOrEqual(8500);
  });
  it('bounds savings by billed consumption and avoidable charges', () => {
    const r = energy({ billedUnitsKwh: 50, billAmountInr: 150, tariffConfig: { fixedChargesInr: 140 } });
    expect(r.potentialMonthlyKwhSavings).toBeLessThanOrEqual(50);
    expect(r.potentialMonthlyInrSavings).toBeLessThanOrEqual(10);
    expect(r.potentialMonthlyInrSavings).toBe(r.recommendations.filter(x => x.isWithinBudget).reduce((sum, x) => sum + x.estimatedMonetaryBenefitInr, 0));
  });
  it('does not count a slab target as an independent saving', () => {
    expect(energy().recommendations.find(r => r.id === 'rec_slab_arbitrage')?.estimatedEnergyReductionKwh ?? 0).toBe(0);
  });
  it('caps proposed capacity at usable roof capacity', () => {
    expect(solar({ usableRoofAreaSqFt: 100 }).recommendedCapacityKw).toBe(1);
  });
  it('does not fit a 100 square foot array into 90 square feet', () => {
    expect(solar({ usableRoofAreaSqFt: 90, proposedSolarCapacityKw: undefined }).recommendedCapacityKw).toBe(0);
  });
  it('caps self-consumption and bill savings at annual household demand and variable bill', () => {
    for (const s of Object.values(solar().scenarios)) {
      expect(s.selfConsumedKwh).toBeLessThanOrEqual(1200);
      expect(s.annualBillSavingsInr).toBeLessThanOrEqual((750 - 140) * 12);
      expect(s.selfConsumedKwh + s.exportedKwh).toBe(s.annualGenerationKwh);
      expect(s.selfConsumptionRatio).toBeCloseTo(s.selfConsumedKwh / s.annualGenerationKwh);
    }
  });
  it('honors zero export compensation', () => {
    expect(solar({ tariffAssumptions: { exportCreditRatePerKwh: 0 } }).scenarios.central.annualExportCreditsInr).toBe(0);
  });
  it('honors explicitly zero maintenance', () => {
    expect(solar({ annualMaintenanceExpenditureInr: 0 }).scenarios.central.annualMaintenanceInr).toBe(0);
  });
  it('degrades generation benefit without discounting annual maintenance', () => {
    const s = generateSolarScenarios(3, 100000, DEFAULT_SOLAR_TARIFF, 2000).central;
    let expected = -100000;
    for (let year = 0; year < 25; year++) expected += s.annualGrossBenefitInr * 0.993 ** year - 2000;
    expect(s.twentyFiveYearCumulativeSavingsInr).toBe(Math.round(expected));
  });
  it('calculates simple payback from corrected net annual benefit', () => {
    const r = solar({ tariffAssumptions: { exportCreditRatePerKwh: 0 }, annualMaintenanceExpenditureInr: 1000 });
    expect(r.scenarios.central.simplePaybackYears).toBe(Number((r.netInvestmentCostInr / (7320 - 1000)).toFixed(1)));
  });
});
