import {
  EnergyEngineInput,
  EngineAnalysisResult,
  SavingsRecommendation,
  ApplianceBreakdown,
  ApplianceInput,
  TariffConfiguration,
} from '../types';
import { calculateSlabBreakdown, CEA_GRID_EMISSION_FACTOR } from '../utils/energyCalculations';

export const DEFAULT_TARIFF_CONFIG: TariffConfiguration = {
  baseRatePerKwh: 7.5,
  marginalRatePerKwh: 8.5,
  fixedChargesInr: 140,
  discomName: 'National Average Benchmark (Urban Domestic)',
  isIllustrativeEstimate: true,
};

/**
 * Validates billing period days
 */
export function validateBillingPeriod(days?: number): { isValid: boolean; normalizedDays: number; error?: string } {
  if (days === undefined || days === null || isNaN(days)) {
    return { isValid: true, normalizedDays: 30 }; // Standard default month
  }
  if (days <= 0) {
    return { isValid: false, normalizedDays: 30, error: 'Billing period days must be greater than zero.' };
  }
  if (days > 90) {
    return { isValid: false, normalizedDays: 30, error: 'Billing period exceeds 90 days. Please verify the billing cycle duration.' };
  }
  return { isValid: true, normalizedDays: Math.round(days) };
}

/**
 * Normalizes daily usage hours to safe [0, 24] boundary
 */
export function normalizeHours(hours: number): { normalizedHours: number; wasClamped: boolean } {
  if (isNaN(hours) || hours <= 0) {
    return { normalizedHours: 0, wasClamped: false };
  }
  if (hours > 24) {
    return { normalizedHours: 24, wasClamped: true };
  }
  return { normalizedHours: Number(hours.toFixed(1)), wasClamped: false };
}

/**
 * Computes duty cycle factor for realistic compressor/thermal cycle modeling
 */
function getApplianceDutyCycle(category: string, hours: number): number {
  switch (category) {
    case 'refrigerator':
      // Refrigerators stay plugged in 24 hrs, but compressor cycles on/off ~40-50% of the time
      return hours >= 20 ? 0.45 : 1.0;
    case 'air_conditioner':
      // AC compressor cycles once setpoint is reached (average cycle ~75%)
      return 0.75;
    case 'water_heater':
      // Thermostat cut-off applies once water reaches set temperature
      return 0.85;
    default:
      return 1.0;
  }
}

/**
 * Calculates appliance-wise energy consumption
 */
export function calculateApplianceBreakdowns(
  appliances: ApplianceInput[],
  periodDays: number,
  effectiveTariff: number
): { breakdowns: ApplianceBreakdown[]; totalKwh: number; diagnostics: string[] } {
  const diagnostics: string[] = [];
  const validAppliances = appliances || [];

  const rawList = validAppliances.map((app) => {
    const qty = Math.max(1, Math.round(app.quantity || 1));
    const wattage = Math.max(0, app.wattage || 0);
    const { normalizedHours, wasClamped } = normalizeHours(app.dailyUsageHours || 0);

    if (wasClamped) {
      diagnostics.push(`Operating hours for ${app.name || app.category} exceeded 24 hrs and were clamped to 24 hrs/day.`);
    }

    const dutyCycle = getApplianceDutyCycle(app.category, normalizedHours);
    const dailyKwh = (wattage * normalizedHours * qty * dutyCycle) / 1000;
    const monthlyKwh = Number((dailyKwh * periodDays).toFixed(1));
    const monthlyCostInr = Math.round(monthlyKwh * effectiveTariff);

    return {
      id: app.id || `app_${Math.random().toString(36).substring(2, 7)}`,
      name: app.name || app.category.replace('_', ' '),
      category: app.category,
      quantity: qty,
      wattage,
      dailyUsageHours: normalizedHours,
      dailyKwh: Number(dailyKwh.toFixed(2)),
      monthlyKwh,
      monthlyCostInr,
      percentageOfTotal: 0,
    };
  });

  const totalKwh = Number(rawList.reduce((acc, curr) => acc + curr.monthlyKwh, 0).toFixed(1));

  // Calculate percentages
  const breakdowns: ApplianceBreakdown[] = rawList.map((item) => ({
    ...item,
    percentageOfTotal: totalKwh > 0 ? Number(((item.monthlyKwh / totalKwh) * 100).toFixed(1)) : 0,
  }));

  // Sort descending by energy consumption
  breakdowns.sort((a, b) => b.monthlyKwh - a.monthlyKwh);

  return { breakdowns, totalKwh, diagnostics };
}

/**
 * Generates deterministic energy-saving recommendations based on physical models
 */
export function evaluateEnergyOpportunities(
  appliances: ApplianceInput[],
  applianceBreakdowns: ApplianceBreakdown[],
  billedUnits: number,
  marginalTariff: number,
  periodDays: number,
  userBudget: number
): SavingsRecommendation[] {
  const recs: SavingsRecommendation[] = [];

  // 1. Air Conditioner Setpoint Optimization (BEE standard ~6% per °C)
  const acList = appliances.filter((a) => a.category === 'air_conditioner');
  if (acList.length > 0) {
    const totalAcKwh = applianceBreakdowns
      .filter((b) => b.category === 'air_conditioner')
      .reduce((acc, b) => acc + b.monthlyKwh, 0);

    if (totalAcKwh >= 25) {
      const currentSetpoint = acList[0].temperatureSetpointC || 20;
      const targetSetpoint = 24;
      const tempDelta = Math.max(1, targetSetpoint - currentSetpoint);
      const savingsFactor = Math.min(0.36, tempDelta * 0.06); // 6% per degree capped at 36%
      const kwhReduction = Number((totalAcKwh * savingsFactor).toFixed(1));
      const monthlySavingsInr = Math.round(kwhReduction * marginalTariff);

      if (kwhReduction > 5) {
        recs.push({
          id: 'rec_ac_setpoint',
          action: `Set AC thermostat to 24°C (Currently ~${currentSetpoint}°C)`,
          category: 'no_cost',
          reason: `Bureau of Energy Efficiency (BEE) research proves each 1°C increase in AC setpoint reduces compressor electricity by ~6%. Increasing from ${currentSetpoint}°C to 24°C lowers cooling electricity by ${(savingsFactor * 100).toFixed(0)}%.`,
          estimatedEnergyReductionKwh: kwhReduction,
          estimatedMonetaryBenefitInr: monthlySavingsInr,
          upfrontExpenditureInr: 0,
          paybackPeriodMonths: null,
          assumptions: [
            `Based on current AC load of ${totalAcKwh} kWh/month`,
            `Marginal tier tariff of ₹${marginalTariff.toFixed(2)}/kWh`,
            `BEE empirical compressor savings factor of 6% per °C`,
          ],
          confidence: 'high',
          evidenceQuality: 'Direct thermodynamic compressor load calculation matching AC inventory.',
          suggestedNextStep: 'Set remote thermostat to 24°C and use ceiling fan on low speed for optimal comfort air circulation.',
          targetApplianceCategory: 'air_conditioner',
          isWithinBudget: true,
          affordabilityScore: 100,
          rankScore: 95 + Math.min(5, monthlySavingsInr / 500),
        });
      }
    }
  }

  // 2. Ceiling Fan BLDC Motor Upgrade (75W induction -> 28W BLDC)
  const ceilingFans = appliances.filter((a) => a.category === 'ceiling_fan');
  if (ceilingFans.length > 0) {
    const totalFanQty = ceilingFans.reduce((sum, f) => sum + (f.quantity || 1), 0);
    const avgHours = ceilingFans.reduce((sum, f) => sum + (f.dailyUsageHours || 0), 0) / ceilingFans.length;
    const avgWattage = ceilingFans.reduce((sum, f) => sum + (f.wattage || 75), 0) / ceilingFans.length;

    // Only recommend if fans are traditional high wattage (>= 55W) and run at least 4 hrs/day
    if (avgWattage >= 55 && avgHours >= 4) {
      const deltaWattage = avgWattage - 28; // Modern 5-star BLDC draws 28W
      const kwhReduction = Number(
        (((deltaWattage * avgHours * totalFanQty * periodDays) / 1000)).toFixed(1)
      );
      const monthlySavingsInr = Math.round(kwhReduction * marginalTariff);
      const costPerFan = 2800; // Benchmark price for BEE 5-star BLDC fan in India
      const totalCost = totalFanQty * costPerFan;
      const paybackMonths = Number((totalCost / (monthlySavingsInr || 1)).toFixed(1));
      const fitsBudget = totalCost <= userBudget || userBudget === 0;

      recs.push({
        id: 'rec_bldc_fan',
        action: `Upgrade ${totalFanQty} traditional fan${totalFanQty > 1 ? 's' : ''} to 28W BLDC technology`,
        category: 'investment',
        reason: `Traditional ceiling fans draw ~${Math.round(avgWattage)}W continuously. Brushless DC (BLDC) motor fans consume only 28W at full speed, reducing fan power consumption by ~${Math.round((deltaWattage / avgWattage) * 100)}%.`,
        estimatedEnergyReductionKwh: kwhReduction,
        estimatedMonetaryBenefitInr: monthlySavingsInr,
        upfrontExpenditureInr: totalCost,
        paybackPeriodMonths: paybackMonths,
        assumptions: [
          `Replacement of ${totalFanQty} fan(s) running ${avgHours.toFixed(1)} hrs/day`,
          `Estimated benchmark BLDC fan cost: ₹${costPerFan} per unit`,
          `Electricity marginal tariff: ₹${marginalTariff.toFixed(2)}/kWh`,
        ],
        confidence: 'high',
        evidenceQuality: 'Direct wattage differential calculation (induction motor vs BLDC motor).',
        suggestedNextStep: 'Shortlist BEE 5-star BLDC ceiling fans with RF remote and 3-year warranty.',
        targetApplianceCategory: 'ceiling_fan',
        isWithinBudget: fitsBudget,
        affordabilityScore: fitsBudget ? 85 : 45,
        rankScore: (fitsBudget ? 80 : 40) + Math.min(10, 100 / Math.max(1, paybackMonths)),
      });
    }
  }

  // 3. Lighting: Inefficient Bulbs to 9W LED Retrofit
  const lighting = appliances.filter((a) => a.category === 'lighting');
  if (lighting.length > 0) {
    const inefficientLights = lighting.filter((l) => (l.wattage || 0) >= 20);
    if (inefficientLights.length > 0) {
      const totalBulbs = inefficientLights.reduce((sum, l) => sum + (l.quantity || 1), 0);
      const avgWatts = inefficientLights.reduce((sum, l) => sum + l.wattage, 0) / inefficientLights.length;
      const avgHours = inefficientLights.reduce((sum, l) => sum + l.dailyUsageHours, 0) / inefficientLights.length;

      const deltaWatts = Math.max(10, avgWatts - 9); // 9W LED benchmark
      const kwhReduction = Number((((deltaWatts * avgHours * totalBulbs * periodDays) / 1000)).toFixed(1));
      const monthlySavingsInr = Math.round(kwhReduction * marginalTariff);
      const totalCost = totalBulbs * 110; // ₹110 per branded LED bulb
      const paybackMonths = Number((totalCost / (monthlySavingsInr || 1)).toFixed(1));
      const fitsBudget = totalCost <= userBudget || userBudget === 0;

      recs.push({
        id: 'rec_led_lighting',
        action: `Replace ${totalBulbs} old tube/CFL bulb${totalBulbs > 1 ? 's' : ''} with 9W LEDs`,
        category: 'low_cost',
        reason: `Your existing lighting averages ${Math.round(avgWatts)}W per fixture. Standard 9W LED bulbs produce equivalent 850 lumens while cutting energy draw by ${Math.round((deltaWatts / avgWatts) * 100)}%.`,
        estimatedEnergyReductionKwh: kwhReduction,
        estimatedMonetaryBenefitInr: monthlySavingsInr,
        upfrontExpenditureInr: totalCost,
        paybackPeriodMonths: paybackMonths,
        assumptions: [
          `Replacing ${totalBulbs} bulbs operating ${avgHours.toFixed(1)} hrs/day`,
          `Benchmark 9W LED bulb cost ₹110/unit`,
          `Marginal tariff ₹${marginalTariff.toFixed(2)}/kWh`,
        ],
        confidence: 'high',
        evidenceQuality: 'Direct lumen/watt parity calculation against listed fixtures.',
        suggestedNextStep: 'Purchase BEE 5-star or UJALA scheme subsidised 9W LED lamps for primary living areas.',
        targetApplianceCategory: 'lighting',
        isWithinBudget: fitsBudget,
        affordabilityScore: 90,
        rankScore: 88 + Math.min(7, monthlySavingsInr / 100),
      });
    }
  }

  // 4. Standby & Phantom Power Elimination
  const electronics = appliances.filter((a) =>
    ['television', 'entertainment', 'cooking_appliance', 'other'].includes(a.category)
  );
  if (electronics.length > 0) {
    const totalCount = electronics.reduce((sum, e) => sum + (e.quantity || 1), 0);
    // Typical standby consumption in Indian homes is 10W - 15W per setup box / TV cluster for 18 hrs
    const kwhReduction = Number((((15 * 18 * totalCount * periodDays) / 1000)).toFixed(1));
    const monthlySavingsInr = Math.round(kwhReduction * marginalTariff);

    if (kwhReduction >= 4) {
      recs.push({
        id: 'rec_standby_power',
        action: 'Turn off entertainment & kitchen master plug switches when idle',
        category: 'no_cost',
        reason: 'Televisions, set-top boxes, and microwave displays draw 10W-15W continuously in standby mode ("vampire load") even when powered off via remote.',
        estimatedEnergyReductionKwh: kwhReduction,
        estimatedMonetaryBenefitInr: monthlySavingsInr,
        upfrontExpenditureInr: 0,
        paybackPeriodMonths: null,
        assumptions: [
          `Average 15W phantom draw across ${totalCount} connected appliance(s)`,
          `18 standby hours per day`,
          `Marginal tariff ₹${marginalTariff.toFixed(2)}/kWh`,
        ],
        confidence: 'moderate',
        evidenceQuality: 'Standard standby appliance benchmark from Central Power Research Institute (CPRI).',
        suggestedNextStep: 'Turn off the wall socket switch at night or connect your TV and set-top box to a single master power strip.',
        targetApplianceCategory: 'television',
        isWithinBudget: true,
        affordabilityScore: 100,
        rankScore: 82,
      });
    }
  }

  // 5. Water Heater / Geyser Standing Loss Management
  const geysers = appliances.filter((a) => a.category === 'water_heater');
  if (geysers.length > 0) {
    const geyserKwh = applianceBreakdowns
      .filter((b) => b.category === 'water_heater')
      .reduce((sum, b) => sum + b.monthlyKwh, 0);

    if (geyserKwh >= 20) {
      const kwhReduction = Number((geyserKwh * 0.18).toFixed(1)); // 18% savings from thermostat + timer
      const monthlySavingsInr = Math.round(kwhReduction * marginalTariff);

      recs.push({
        id: 'rec_geyser_management',
        action: 'Lower geyser thermostat to 50°C and turn off 10 mins before bathing',
        category: 'no_cost',
        reason: 'Water heaters set above 60°C lose up to 20% of their heat through tank radiation. Heating to 50°C provides comfortable bath temperature while preventing scalding and reducing energy consumption by ~18%.',
        estimatedEnergyReductionKwh: kwhReduction,
        estimatedMonetaryBenefitInr: monthlySavingsInr,
        upfrontExpenditureInr: 0,
        paybackPeriodMonths: null,
        assumptions: [
          `Current geyser consumption: ${geyserKwh} kWh/month`,
          `Thermal standby radiation loss reduction: 18%`,
          `Marginal tariff: ₹${marginalTariff.toFixed(2)}/kWh`,
        ],
        confidence: 'high',
        evidenceQuality: 'Thermodynamic heat retention model for domestic electric storage geysers.',
        suggestedNextStep: 'Inspect your geyser thermostat dial and adjust setting to 50°C (Medium).',
        targetApplianceCategory: 'water_heater',
        isWithinBudget: true,
        affordabilityScore: 100,
        rankScore: 86,
      });
    }
  }

  // 6. Refrigerator Coil Cleaning & Ventilation
  const fridges = appliances.filter((a) => a.category === 'refrigerator');
  if (fridges.length > 0) {
    const fridgeKwh = applianceBreakdowns
      .filter((b) => b.category === 'refrigerator')
      .reduce((sum, b) => sum + b.monthlyKwh, 0);

    if (fridgeKwh >= 20) {
      const kwhReduction = Number((fridgeKwh * 0.10).toFixed(1)); // 10% savings
      const monthlySavingsInr = Math.round(kwhReduction * marginalTariff);

      recs.push({
        id: 'rec_refrigerator_maintenance',
        action: 'Clean back refrigerator condenser coils and check door rubber gasket',
        category: 'no_cost',
        reason: 'Dust buildup on back coils insulates heat dissipation, forcing the compressor to work 25% longer. Periodic brushing restores heat exchange efficiency and saves ~10% refrigerator power.',
        estimatedEnergyReductionKwh: kwhReduction,
        estimatedMonetaryBenefitInr: monthlySavingsInr,
        upfrontExpenditureInr: 0,
        paybackPeriodMonths: null,
        assumptions: [
          `Current refrigerator energy: ${fridgeKwh} kWh/month`,
          `Compressor cycle efficiency improvement: 10%`,
          `Marginal tariff: ₹${marginalTariff.toFixed(2)}/kWh`,
        ],
        confidence: 'moderate',
        evidenceQuality: 'Empirical refrigerator heat exchange degradation curve.',
        suggestedNextStep: 'Pull the refrigerator 4 inches away from the wall and gently brush the metal coils at the back.',
        targetApplianceCategory: 'refrigerator',
        isWithinBudget: true,
        affordabilityScore: 100,
        rankScore: 80,
      });
    }
  }

  // 7. Telescopic Slab Tariff Arbitrage Recommendation
  // If household is just 10-40 units above a punitive slab threshold (e.g. 301-340 or 101-135)
  if (billedUnits > 300 && billedUnits <= 350) {
    const overflowUnits = billedUnits - 300;
    const savingOpportunityKwh = overflowUnits;
    const monetaryOpportunityInr = Math.round(overflowUnits * 7.9);

    recs.push({
      id: 'rec_slab_arbitrage',
      action: `Target saving ${overflowUnits} kWh to drop below the ₹7.90/unit Peak Tier`,
      category: 'no_cost',
      reason: `Your monthly usage of ${billedUnits} units is currently ${overflowUnits} units over the 300-unit threshold. In Indian state DISCOM tariffs, every unit above 300 is charged at a punitive ₹7.90/unit rate.`,
      estimatedEnergyReductionKwh: savingOpportunityKwh,
      estimatedMonetaryBenefitInr: monetaryOpportunityInr,
      upfrontExpenditureInr: 0,
      paybackPeriodMonths: null,
      assumptions: [
        `DISCOM slab boundary: 300 units`,
        `Marginal rate difference: ₹7.90 vs ₹5.80`,
      ],
      confidence: 'high',
      evidenceQuality: 'Direct match with DISCOM telescopic tariff slabs.',
      suggestedNextStep: 'Adopt the no-cost thermostat and lighting tips above to bring your consumption under 300 units.',
      isWithinBudget: true,
      affordabilityScore: 100,
      rankScore: 92,
    });
  }

  // Rank recommendations based on:
  // 1. Within budget first
  // 2. Rank score (which balances category, payback, and monthly benefit)
  recs.sort((a, b) => {
    if (a.isWithinBudget && !b.isWithinBudget) return -1;
    if (!a.isWithinBudget && b.isWithinBudget) return 1;
    return b.rankScore - a.rankScore;
  });

  return recs;
}

/**
 * Main Energy Savings Intelligence Engine entry point
 */
export function runEnergySavingsEngine(input: EnergyEngineInput): EngineAnalysisResult {
  const diagnostics: string[] = [];

  // 1. Validate inputs against NaN, Infinity, and malformed types
  if (
    input.billedUnitsKwh !== undefined &&
    (!Number.isFinite(input.billedUnitsKwh) || input.billedUnitsKwh < 0)
  ) {
    return {
      status: 'invalid_input',
      statusMessage: 'Billed electricity units must be a valid, finite non-negative number.',
      dailyAverageBilledKwh: 0,
      monthlyBilledKwh: 0,
      billedAmountInr: 0,
      effectiveTariffPerKwh: 0,
      marginalTariffPerKwh: 0,
      billingPeriodDays: 30,
      isBillingPeriodValid: false,
      totalApplianceCalculatedKwh: 0,
      unaccountedOrBaseLoadKwh: 0,
      applianceBreakdown: [],
      recommendations: [],
      potentialMonthlyKwhSavings: 0,
      potentialMonthlyInrSavings: 0,
      totalUpfrontCostForRecommendedInr: 0,
      co2ReductionKgPerMonth: 0,
      diagnostics: ['Invalid input: billedUnitsKwh must be a finite non-negative number.'],
      tariffAssumptions: DEFAULT_TARIFF_CONFIG,
    };
  }

  const billedUnits = Number.isFinite(input.billedUnitsKwh) ? Math.max(0, input.billedUnitsKwh) : 0;
  const billAmount = Number.isFinite(input.billAmountInr) ? Math.max(0, input.billAmountInr) : 0;
  const householdMembers = Number.isFinite(input.householdMembers) ? Math.max(1, Math.min(50, Math.round(input.householdMembers))) : 4;
  const userBudget = Number.isFinite(input.userBudgetInr) ? Math.max(0, input.userBudgetInr) : 0;

  const periodValidation = validateBillingPeriod(input.billingPeriodDays);
  if (!periodValidation.isValid) {
    return {
      status: 'invalid_input',
      statusMessage: periodValidation.error || 'Invalid billing period duration.',
      dailyAverageBilledKwh: 0,
      monthlyBilledKwh: 0,
      billedAmountInr: 0,
      effectiveTariffPerKwh: 0,
      marginalTariffPerKwh: 0,
      billingPeriodDays: 30,
      isBillingPeriodValid: false,
      totalApplianceCalculatedKwh: 0,
      unaccountedOrBaseLoadKwh: 0,
      applianceBreakdown: [],
      recommendations: [],
      potentialMonthlyKwhSavings: 0,
      potentialMonthlyInrSavings: 0,
      totalUpfrontCostForRecommendedInr: 0,
      co2ReductionKgPerMonth: 0,
      diagnostics: [periodValidation.error || 'Invalid billing period'],
      tariffAssumptions: DEFAULT_TARIFF_CONFIG,
    };
  }

  const periodDays = periodValidation.normalizedDays;

  // 2. Check for zero consumption / missing values (Requirement 9: support no-recommendation outcome)
  if (billedUnits <= 0) {
    return {
      status: 'insufficient_evidence',
      statusMessage: 'Zero electricity consumption recorded. Household may be unoccupied or meter disconnected. Savings cannot be calculated.',
      dailyAverageBilledKwh: 0,
      monthlyBilledKwh: 0,
      billedAmountInr: billAmount,
      effectiveTariffPerKwh: 0,
      marginalTariffPerKwh: 0,
      billingPeriodDays: periodDays,
      isBillingPeriodValid: true,
      totalApplianceCalculatedKwh: 0,
      unaccountedOrBaseLoadKwh: 0,
      applianceBreakdown: [],
      recommendations: [],
      potentialMonthlyKwhSavings: 0,
      potentialMonthlyInrSavings: 0,
      totalUpfrontCostForRecommendedInr: 0,
      co2ReductionKgPerMonth: 0,
      diagnostics: ['Billed consumption is 0 kWh.'],
      tariffAssumptions: DEFAULT_TARIFF_CONFIG,
    };
  }

  // 3. Check for bare lifeline subsistence threshold (e.g. < 35 kWh for 4 people)
  const perCapitaKwh = billedUnits / householdMembers;
  if (billedUnits < 35 && perCapitaKwh < 10) {
    return {
      status: 'insufficient_evidence',
      statusMessage: `Current consumption (${billedUnits} kWh) is already at bare lifeline subsistence for ${householdMembers} household members. Further energy reduction is not recommended for health, safety, and basic lighting comfort.`,
      dailyAverageBilledKwh: Number((billedUnits / periodDays).toFixed(1)),
      monthlyBilledKwh: billedUnits,
      billedAmountInr: billAmount,
      effectiveTariffPerKwh: Number((billAmount / billedUnits).toFixed(2)),
      marginalTariffPerKwh: 3.5,
      billingPeriodDays: periodDays,
      isBillingPeriodValid: true,
      totalApplianceCalculatedKwh: 0,
      unaccountedOrBaseLoadKwh: billedUnits,
      applianceBreakdown: [],
      recommendations: [],
      potentialMonthlyKwhSavings: 0,
      potentialMonthlyInrSavings: 0,
      totalUpfrontCostForRecommendedInr: 0,
      co2ReductionKgPerMonth: 0,
      diagnostics: ['Consumption is below the minimum comfort threshold.'],
      tariffAssumptions: DEFAULT_TARIFF_CONFIG,
    };
  }

  // 4. Check for empty appliance inventory
  if (!input.appliances || input.appliances.length === 0) {
    return {
      status: 'insufficient_evidence',
      statusMessage: 'No appliance inventory provided. Please add your major household appliances (fans, lighting, AC, refrigerator) to analyze specific saving opportunities.',
      dailyAverageBilledKwh: Number((billedUnits / periodDays).toFixed(1)),
      monthlyBilledKwh: billedUnits,
      billedAmountInr: billAmount,
      effectiveTariffPerKwh: billedUnits > 0 ? Number((billAmount / billedUnits).toFixed(2)) : 0,
      marginalTariffPerKwh: 7.5,
      billingPeriodDays: periodDays,
      isBillingPeriodValid: true,
      totalApplianceCalculatedKwh: 0,
      unaccountedOrBaseLoadKwh: billedUnits,
      applianceBreakdown: [],
      recommendations: [],
      potentialMonthlyKwhSavings: 0,
      potentialMonthlyInrSavings: 0,
      totalUpfrontCostForRecommendedInr: 0,
      co2ReductionKgPerMonth: 0,
      diagnostics: ['No appliances provided in input.'],
      tariffAssumptions: DEFAULT_TARIFF_CONFIG,
    };
  }

  // 5. Determine tariff rates
  // Use slab calculator logic to find marginal top-tier rate for this consumer
  const slabBreakdown = calculateSlabBreakdown(billedUnits);
  const highestSlab = slabBreakdown.breakdown[slabBreakdown.breakdown.length - 1];
  const marginalTariff = highestSlab ? highestSlab.rate : DEFAULT_TARIFF_CONFIG.marginalRatePerKwh;
  const effectiveTariff = billAmount > 0 ? Number((billAmount / billedUnits).toFixed(2)) : DEFAULT_TARIFF_CONFIG.baseRatePerKwh;

  const tariffAssumptions: TariffConfiguration = {
    baseRatePerKwh: effectiveTariff,
    marginalRatePerKwh: marginalTariff,
    fixedChargesInr: slabBreakdown.fixedCharges,
    discomName: input.tariffConfig?.discomName || DEFAULT_TARIFF_CONFIG.discomName,
    isIllustrativeEstimate: true,
  };

  // 6. Compute appliance-wise breakdown
  const { breakdowns, totalKwh, diagnostics: appDiagnostics } = calculateApplianceBreakdowns(
    input.appliances,
    periodDays,
    effectiveTariff
  );
  diagnostics.push(...appDiagnostics);

  const dailyAverageBilledKwh = Number((billedUnits / periodDays).toFixed(1));
  const unaccountedKwh = Number((billedUnits - totalKwh).toFixed(1));

  if (unaccountedKwh > billedUnits * 0.4) {
    diagnostics.push(
      `Notice: Stated appliances account for ${totalKwh} kWh, leaving ${unaccountedKwh} kWh (${Math.round((unaccountedKwh / billedUnits) * 100)}%) as unaccounted baseline load or unlisted appliances.`
    );
  } else if (unaccountedKwh < -billedUnits * 0.2) {
    diagnostics.push(
      `Notice: Calculated appliance usage (${totalKwh} kWh) exceeds billed units (${billedUnits} kWh). Appliance operating hours or wattages may be slightly overestimated.`
    );
  }

  if (billedUnits > 4000) {
    diagnostics.push('Very high monthly consumption detected (> 4,000 kWh). A professional on-site energy audit is strongly recommended.');
  }

  // 7. Generate deterministic recommendations
  const recommendations = evaluateEnergyOpportunities(
    input.appliances,
    breakdowns,
    billedUnits,
    marginalTariff,
    periodDays,
    userBudget
  );

  // If no opportunities were found
  if (recommendations.length === 0) {
    return {
      status: 'insufficient_evidence',
      statusMessage: 'Based on your appliance ratings and usage hours, your energy consumption is already efficient. No immediate cost-effective retrofits or behavioral shifts are identified.',
      dailyAverageBilledKwh,
      monthlyBilledKwh: billedUnits,
      billedAmountInr: billAmount,
      effectiveTariffPerKwh: effectiveTariff,
      marginalTariffPerKwh: marginalTariff,
      billingPeriodDays: periodDays,
      isBillingPeriodValid: true,
      totalApplianceCalculatedKwh: totalKwh,
      unaccountedOrBaseLoadKwh: unaccountedKwh,
      applianceBreakdown: breakdowns,
      recommendations: [],
      potentialMonthlyKwhSavings: 0,
      potentialMonthlyInrSavings: 0,
      totalUpfrontCostForRecommendedInr: 0,
      co2ReductionKgPerMonth: 0,
      diagnostics,
      tariffAssumptions,
    };
  }

  // 8. Compute total potentials across recommendations within budget
  const recommendedInBudget = recommendations.filter((r) => r.isWithinBudget);
  const potentialMonthlyKwh = Number(
    recommendedInBudget.reduce((sum, r) => sum + r.estimatedEnergyReductionKwh, 0).toFixed(1)
  );
  const potentialMonthlyInr = recommendedInBudget.reduce((sum, r) => sum + r.estimatedMonetaryBenefitInr, 0);
  const totalUpfrontCost = recommendedInBudget.reduce((sum, r) => sum + r.upfrontExpenditureInr, 0);
  const co2ReductionKg = Number(((potentialMonthlyKwh * CEA_GRID_EMISSION_FACTOR)).toFixed(1));

  return {
    status: 'success',
    statusMessage: `Identified ${recommendations.length} deterministic energy savings opportunities totaling ${potentialMonthlyKwh} kWh/month in potential reductions.`,
    dailyAverageBilledKwh,
    monthlyBilledKwh: billedUnits,
    billedAmountInr: billAmount,
    effectiveTariffPerKwh: effectiveTariff,
    marginalTariffPerKwh: marginalTariff,
    billingPeriodDays: periodDays,
    isBillingPeriodValid: true,
    totalApplianceCalculatedKwh: totalKwh,
    unaccountedOrBaseLoadKwh: unaccountedKwh,
    applianceBreakdown: breakdowns,
    recommendations,
    potentialMonthlyKwhSavings: potentialMonthlyKwh,
    potentialMonthlyInrSavings: potentialMonthlyInr,
    totalUpfrontCostForRecommendedInr: totalUpfrontCost,
    co2ReductionKgPerMonth: co2ReductionKg,
    diagnostics,
    tariffAssumptions,
  };
}

// -------------------------------------------------------------
// STANDARD APARTMENT APPLIANCE INVENTORY PRESETS
// -------------------------------------------------------------
export const PRESET_2BHK: ApplianceInput[] = [
  {
    id: 'p_ac',
    name: '1.5 Ton Split AC (Bedroom)',
    category: 'air_conditioner',
    quantity: 1,
    wattage: 1450,
    dailyUsageHours: 6,
    temperatureSetpointC: 20,
    starRating: 3,
    ageYears: 2,
  },
  {
    id: 'p_fans',
    name: 'Induction Ceiling Fans',
    category: 'ceiling_fan',
    quantity: 3,
    wattage: 75,
    dailyUsageHours: 12,
    ageYears: 4,
  },
  {
    id: 'p_lights',
    name: 'Living & Bedroom Lights',
    category: 'lighting',
    quantity: 6,
    wattage: 28,
    dailyUsageHours: 5,
  },
  {
    id: 'p_fridge',
    name: 'Frost-Free Refrigerator (260L)',
    category: 'refrigerator',
    quantity: 1,
    wattage: 220,
    dailyUsageHours: 24,
    ageYears: 3,
  },
  {
    id: 'p_tv',
    name: 'Smart TV & Set-Top Box',
    category: 'television',
    quantity: 1,
    wattage: 110,
    dailyUsageHours: 4,
    standbyHours: 20,
  },
];

export const PRESET_3BHK: ApplianceInput[] = [
  {
    id: 'p3_ac1',
    name: 'Master Bedroom AC (1.5T)',
    category: 'air_conditioner',
    quantity: 1,
    wattage: 1500,
    dailyUsageHours: 7,
    temperatureSetpointC: 21,
    starRating: 3,
  },
  {
    id: 'p3_ac2',
    name: 'Guest Room AC (1.0T)',
    category: 'air_conditioner',
    quantity: 1,
    wattage: 1100,
    dailyUsageHours: 4,
    temperatureSetpointC: 19,
    starRating: 2,
  },
  {
    id: 'p3_fans',
    name: 'Living & Bed Ceiling Fans',
    category: 'ceiling_fan',
    quantity: 4,
    wattage: 75,
    dailyUsageHours: 14,
    ageYears: 5,
  },
  {
    id: 'p3_geyser',
    name: 'Storage Water Geyser (25L)',
    category: 'water_heater',
    quantity: 1,
    wattage: 2000,
    dailyUsageHours: 1.5,
  },
  {
    id: 'p3_fridge',
    name: 'Double Door Refrigerator (340L)',
    category: 'refrigerator',
    quantity: 1,
    wattage: 240,
    dailyUsageHours: 24,
    ageYears: 2,
  },
  {
    id: 'p3_lights',
    name: 'Recessed & Tube Lights',
    category: 'lighting',
    quantity: 8,
    wattage: 22,
    dailyUsageHours: 6,
  },
];

export const PRESET_1BHK: ApplianceInput[] = [
  {
    id: 'p1_fans',
    name: 'Ceiling Fans',
    category: 'ceiling_fan',
    quantity: 2,
    wattage: 75,
    dailyUsageHours: 10,
    ageYears: 6,
  },
  {
    id: 'p1_lights',
    name: 'CFL / LED Bulbs',
    category: 'lighting',
    quantity: 4,
    wattage: 25,
    dailyUsageHours: 4,
  },
  {
    id: 'p1_tv',
    name: 'LED TV',
    category: 'television',
    quantity: 1,
    wattage: 70,
    dailyUsageHours: 4,
    standbyHours: 20,
  },
];

export interface PresetApplicationResult {
  appliances: ApplianceInput[];
  billedUnits: number;
  billAmount: number;
  hasConfirmedBill: boolean;
}

/**
 * Applies an apartment preset by updating ONLY the appliance inventory.
 * Guarantees that confirmed OCR bills or manual bill inputs are NEVER overwritten.
 * If no bill was provided, it preserves the existing state without inventing fake bill consumption.
 */
export function applyApartmentPreset(
  presetKey: '1bhk' | '2bhk' | '3bhk',
  currentBilledUnits: number,
  currentBillAmount: number,
  hasConfirmedBill: boolean = false
): PresetApplicationResult {
  const selectedPreset =
    presetKey === '1bhk'
      ? PRESET_1BHK
      : presetKey === '3bhk'
      ? PRESET_3BHK
      : PRESET_2BHK;

  return {
    appliances: selectedPreset.map((app) => ({ ...app })),
    billedUnits: currentBilledUnits,
    billAmount: currentBillAmount,
    hasConfirmedBill,
  };
}

export const applyPreset = applyApartmentPreset;

/**
 * Calculates deterministic savings percentage against monthly billed kWh.
 * Returns null if the status is not success, monthlyBilledKwh is zero/negative, or inputs are invalid.
 */
export function calculateSavingsPercentage(
  status: string,
  monthlyBilledKwh: number | null | undefined,
  potentialMonthlyKwhSavings: number | null | undefined
): number | null {
  if (
    status !== 'success' ||
    typeof monthlyBilledKwh !== 'number' ||
    isNaN(monthlyBilledKwh) ||
    !isFinite(monthlyBilledKwh) ||
    monthlyBilledKwh <= 0 ||
    typeof potentialMonthlyKwhSavings !== 'number' ||
    isNaN(potentialMonthlyKwhSavings) ||
    !isFinite(potentialMonthlyKwhSavings) ||
    potentialMonthlyKwhSavings < 0
  ) {
    return null;
  }

  const percentage = Math.round((potentialMonthlyKwhSavings / monthlyBilledKwh) * 100);
  if (isNaN(percentage) || !isFinite(percentage) || percentage < 0) {
    return null;
  }

  return percentage;
}

/**
 * Formats the savings percentage for presentation.
 * Returns 'N/A' when inputs are missing, zero, or non-successful.
 */
export function formatSavingsPercentage(
  status: string,
  monthlyBilledKwh: number | null | undefined,
  potentialMonthlyKwhSavings: number | null | undefined
): string {
  const percentage = calculateSavingsPercentage(status, monthlyBilledKwh, potentialMonthlyKwhSavings);
  if (percentage === null) {
    return 'N/A';
  }
  return `~${percentage}% of current bill`;
}


