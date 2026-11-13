import { SolarAssessment } from '../types';

// Standard national average grid emission factor for India (Central Electricity Authority benchmark ~0.82 kg CO2/kWh)
export const CEA_GRID_EMISSION_FACTOR = 0.82; 

// Benchmark installation cost in India approx ₹55,000 - ₹65,000 per kW
export const SOLAR_COST_PER_KW = 60000;

// Average annual generation per kW in India (approx 4 kWh/day * 365 = ~1460 kWh)
export const ANNUAL_KWH_PER_KW = 1460;

// Average residential electricity tariff in urban/semi-urban India
export const DEFAULT_TARIFF_RATE = 7.5; // INR per kWh

/**
 * Calculates PM Surya Ghar Muft Bijli Yojana Central Government Subsidy
 * As per National Portal for Rooftop Solar:
 * - Up to 2 kW: ₹30,000 per kW (Max ₹60,000 for 2 kW)
 * - 3 kW and above: Additional ₹18,000 for the 3rd kW (Max capped at ₹78,000)
 */
export function calculateCentralSubsidy(kw: number): number {
  if (kw <= 0) return 0;
  if (kw <= 1) return 30000;
  if (kw <= 2) return 60000;
  return 78000; // Capped for 3kW and higher residential systems
}

/**
 * Calculates rooftop solar potential, capital expenditure, payback period, and CO2 reduction
 */
export function calculateSolarPotential(
  rooftopAreaSqFt: number,
  monthlyConsumptionKwh: number,
  tariffRate: number = DEFAULT_TARIFF_RATE
): SolarAssessment {
  // 1 kW requires approximately 100 sq ft of shadow-free rooftop area
  const maxKwFromArea = Math.max(1, Math.floor(rooftopAreaSqFt / 100));
  
  // Recommended system size based on monthly consumption: (monthly / 30 days / 4 kWh daily gen)
  const requiredKwForConsumption = Math.ceil(monthlyConsumptionKwh / 120);
  
  // Best recommended size is minimum of roof capacity and consumption need (clamped between 1 and 10 kW)
  const systemSizeKw = Math.min(Math.max(1, requiredKwForConsumption), Math.max(1, maxKwFromArea));
  
  const totalCost = systemSizeKw * SOLAR_COST_PER_KW;
  const subsidy = calculateCentralSubsidy(systemSizeKw);
  const netCost = totalCost - subsidy;
  
  const annualGenKwh = systemSizeKw * ANNUAL_KWH_PER_KW;
  const annualSavings = Math.round(annualGenKwh * tariffRate);
  
  const paybackYears = Number((netCost / (annualSavings || 1)).toFixed(1));
  const co2ReductionTons = Number(((annualGenKwh * CEA_GRID_EMISSION_FACTOR) / 1000).toFixed(2));
  
  // 25-year cumulative savings assuming 80% generation efficiency over lifecycle
  const twentyFiveYearSavings = Math.round(annualSavings * 25 * 0.9 - netCost);

  return {
    id: `solar_${Date.now()}`,
    rooftopAreaSqFt,
    recommendedSystemSizeKw: systemSizeKw,
    totalEstimatedCost: totalCost,
    centralSubsidyAmount: subsidy,
    netCostAfterSubsidy: netCost,
    annualGenerationKwh: annualGenKwh,
    annualSavingsInr: annualSavings,
    co2ReductionTonsPerYear: co2ReductionTons,
    paybackPeriodYears: paybackYears,
    twentyFiveYearSavingsInr: twentyFiveYearSavings,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Calculates electricity bill tier breakdown based on standard Indian DISCOM telescopic slabs
 */
export function calculateSlabBreakdown(units: number) {
  const slabs = [
    { name: '0 - 100 Units (Lifeline)', max: 100, rate: 3.5 },
    { name: '101 - 300 Units (Normal)', max: 200, rate: 5.8 },
    { name: '301 - 500 Units (Higher)', max: 200, rate: 7.9 },
    { name: 'Above 500 Units (Peak)', max: Infinity, rate: 9.8 },
  ];

  let remaining = units;
  let totalEnergyCharges = 0;
  const breakdown = [];

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const unitsInSlab = Math.min(remaining, slab.max);
    const amount = unitsInSlab * slab.rate;
    totalEnergyCharges += amount;
    
    breakdown.push({
      slabName: slab.name,
      units: unitsInSlab,
      rate: slab.rate,
      amount: Math.round(amount),
    });

    remaining -= unitsInSlab;
  }

  const fixedCharges = 120; // Nominal fixed meter charge
  const electricityDuty = Math.round(totalEnergyCharges * 0.05); // 5% duty
  const totalBill = Math.round(totalEnergyCharges + fixedCharges + electricityDuty);

  return {
    breakdown,
    totalEnergyCharges: Math.round(totalEnergyCharges),
    fixedCharges,
    electricityDuty,
    totalBill,
  };
}

