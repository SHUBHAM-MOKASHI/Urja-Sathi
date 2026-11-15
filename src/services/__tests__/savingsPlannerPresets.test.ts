import { describe, it, expect } from 'vitest';
import {
  applyApartmentPreset,
  applyPreset,
  calculateSavingsPercentage,
  formatSavingsPercentage,
  runEnergySavingsEngine,
  PRESET_1BHK,
  PRESET_2BHK,
  PRESET_3BHK,
} from '../energyEngine';

describe('Savings Planner Presets & Savings Percentage Verification', () => {
  // Test 1: Import a bill with 420 kWh and ₹3,350, then select the 2BHK preset. The bill values must remain unchanged.
  it('Test 1: Preserves imported bill values (420 kWh, ₹3,350) when selecting 2BHK preset', () => {
    const importedUnits = 420;
    const importedAmount = 3350;
    const hasConfirmedBill = true;

    // Apply preset
    const result = applyApartmentPreset('2bhk', importedUnits, importedAmount, hasConfirmedBill);

    // Bill values must remain unchanged
    expect(result.billedUnits).toBe(420);
    expect(result.billAmount).toBe(3350);
    expect(result.hasConfirmedBill).toBe(true);

    // Appliance inventory must be set to 2BHK preset
    expect(result.appliances).toEqual(PRESET_2BHK);

    // Verify engine calculation strictly uses the preserved bill values (420 kWh, ₹3,350)
    const engineResult = runEnergySavingsEngine({
      billedUnitsKwh: result.billedUnits,
      billAmountInr: result.billAmount,
      householdMembers: 4,
      appliances: result.appliances,
      userBudgetInr: 5000,
    });

    expect(engineResult.status).toBe('success');
    expect(engineResult.monthlyBilledKwh).toBe(420);
    expect(engineResult.billedAmountInr).toBe(3350);
    expect(engineResult.potentialMonthlyKwhSavings).toBeGreaterThan(0);
    expect(engineResult.potentialMonthlyInrSavings).toBeGreaterThan(0);

    // Alias check
    const aliasResult = applyPreset('2bhk', importedUnits, importedAmount, hasConfirmedBill);
    expect(aliasResult.billedUnits).toBe(420);
    expect(aliasResult.billAmount).toBe(3350);
  });

  // Test 2: Select an apartment preset without an imported bill. No fake confirmed bill data should be created.
  it('Test 2: Selecting an apartment preset without an imported bill does not create fake bill data', () => {
    const noBillUnits = 0;
    const noBillAmount = 0;
    const hasConfirmedBill = false;

    // Apply preset when no bill exists
    const result = applyApartmentPreset('2bhk', noBillUnits, noBillAmount, hasConfirmedBill);

    // No fake bill data created
    expect(result.billedUnits).toBe(0);
    expect(result.billAmount).toBe(0);
    expect(result.hasConfirmedBill).toBe(false);
    expect(result.appliances).toEqual(PRESET_2BHK);

    // Test with 1BHK and 3BHK presets as well
    const result1Bhk = applyApartmentPreset('1bhk', noBillUnits, noBillAmount, false);
    expect(result1Bhk.billedUnits).toBe(0);
    expect(result1Bhk.billAmount).toBe(0);
    expect(result1Bhk.appliances).toEqual(PRESET_1BHK);

    const result3Bhk = applyApartmentPreset('3bhk', noBillUnits, noBillAmount, false);
    expect(result3Bhk.billedUnits).toBe(0);
    expect(result3Bhk.billAmount).toBe(0);
    expect(result3Bhk.appliances).toEqual(PRESET_3BHK);

    // Verify engine does not fabricate savings when bill is not provided
    const engineResult = runEnergySavingsEngine({
      billedUnitsKwh: result.billedUnits,
      billAmountInr: result.billAmount,
      householdMembers: 4,
      appliances: result.appliances,
      userBudgetInr: 5000,
    });

    expect(engineResult.status).toBe('insufficient_evidence');
    expect(engineResult.potentialMonthlyKwhSavings).toBe(0);
    expect(engineResult.potentialMonthlyInrSavings).toBe(0);
    expect(engineResult.recommendations).toHaveLength(0);
  });

  // Test 3: Calculate a savings percentage with valid bill consumption.
  it('Test 3: Calculates savings percentage with valid bill consumption', () => {
    const status = 'success';
    const monthlyBilledKwh = 420;
    const potentialSavingsKwh = 84; // 84 / 420 = 20%

    const pct = calculateSavingsPercentage(status, monthlyBilledKwh, potentialSavingsKwh);
    expect(pct).toBe(20);

    const formatted = formatSavingsPercentage(status, monthlyBilledKwh, potentialSavingsKwh);
    expect(formatted).toBe('~20% of current bill');

    // Additional realistic values
    expect(calculateSavingsPercentage('success', 340, 51)).toBe(15);
    expect(formatSavingsPercentage('success', 340, 51)).toBe('~15% of current bill');
  });

  // Test 4: Test zero billed units.
  it('Test 4: Tests zero billed units and returns null / N/A without division by zero', () => {
    const pct = calculateSavingsPercentage('success', 0, 50);
    expect(pct).toBeNull();

    const formatted = formatSavingsPercentage('success', 0, 50);
    expect(formatted).toBe('N/A');
  });

  // Test 5: Test insufficient_evidence status.
  it('Test 5: Tests insufficient_evidence and non-success statuses returning null / N/A', () => {
    // Insufficient evidence
    const pctInsufficient = calculateSavingsPercentage('insufficient_evidence', 420, 84);
    expect(pctInsufficient).toBeNull();
    expect(formatSavingsPercentage('insufficient_evidence', 420, 84)).toBe('N/A');

    // Invalid input
    const pctInvalid = calculateSavingsPercentage('invalid_input', 420, 84);
    expect(pctInvalid).toBeNull();
    expect(formatSavingsPercentage('invalid_input', 420, 84)).toBe('N/A');

    // Arbitrary unverified status
    const pctUnknown = calculateSavingsPercentage('pending', 420, 84);
    expect(pctUnknown).toBeNull();
    expect(formatSavingsPercentage('pending', 420, 84)).toBe('N/A');
  });

  // Test 6: Test that no NaN or Infinity is rendered.
  it('Test 6: Guarantees that no NaN, Infinity, negative or missing value is rendered', () => {
    // NaN checks
    expect(calculateSavingsPercentage('success', NaN, 50)).toBeNull();
    expect(formatSavingsPercentage('success', NaN, 50)).toBe('N/A');

    expect(calculateSavingsPercentage('success', 420, NaN)).toBeNull();
    expect(formatSavingsPercentage('success', 420, NaN)).toBe('N/A');

    // Infinity checks
    expect(calculateSavingsPercentage('success', Infinity, 50)).toBeNull();
    expect(formatSavingsPercentage('success', Infinity, 50)).toBe('N/A');

    expect(calculateSavingsPercentage('success', 420, Infinity)).toBeNull();
    expect(formatSavingsPercentage('success', 420, Infinity)).toBe('N/A');

    // Negative checks
    expect(calculateSavingsPercentage('success', -340, 50)).toBeNull();
    expect(formatSavingsPercentage('success', -340, 50)).toBe('N/A');

    expect(calculateSavingsPercentage('success', 340, -50)).toBeNull();
    expect(formatSavingsPercentage('success', 340, -50)).toBe('N/A');

    // Null and Undefined checks
    expect(calculateSavingsPercentage('success', null, 50)).toBeNull();
    expect(formatSavingsPercentage('success', null, 50)).toBe('N/A');

    expect(calculateSavingsPercentage('success', 340, null)).toBeNull();
    expect(formatSavingsPercentage('success', 340, null)).toBe('N/A');

    expect(calculateSavingsPercentage('success', undefined, undefined)).toBeNull();
    expect(formatSavingsPercentage('success', undefined, undefined)).toBe('N/A');
  });
});
