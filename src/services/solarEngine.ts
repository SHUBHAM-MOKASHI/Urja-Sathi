import {
  SolarEngineInput,
  SolarEngineResult,
  SolarScenario,
  SolarTariffAssumptions,
  MissingInformationItem,
} from '../types';
import { calculateCentralSubsidy, CEA_GRID_EMISSION_FACTOR } from '../utils/energyCalculations';

export const DEFAULT_SOLAR_TARIFF: SolarTariffAssumptions = {
  retailTariffPerKwh: 7.5,
  marginalTariffPerKwh: 8.5,
  fixedChargesMonthlyInr: 140,
  exportCreditRatePerKwh: 2.75, // Standard APPC / SERC net-metering feed-in rate
  discomName: 'National Domestic Average Benchmark',
};

/**
 * Benchmark capex per kW in India (grid-tied string inverter + mono PERC modules)
 */
export function getBenchmarkSolarCostPerKw(capacityKw: number): number {
  if (capacityKw <= 1.5) return 65000;
  if (capacityKw <= 3) return 60000;
  if (capacityKw <= 5) return 56000;
  return 52000;
}

/**
 * Identifies missing or unconfirmed information in the solar assessment
 */
export function identifyMissingInformation(input: SolarEngineInput): MissingInformationItem[] {
  const missing: MissingInformationItem[] = [];

  if (!input.roofOwnership) {
    missing.push({
      field: 'roofOwnership',
      importance: 'critical',
      message: 'Roof ownership status is unconfirmed.',
      remedy: 'Verify whether you own the individual terrace or share rights with apartment society.',
    });
  } else if (input.roofOwnership === 'shared_apartment') {
    missing.push({
      field: 'apartmentNoc',
      importance: 'critical',
      message: 'Resident Welfare Association (RWA) / Society NOC is required for shared terraces.',
      remedy: 'Obtain formal written consent or explore society common-meter solar setup.',
    });
  }

  if (!input.usableRoofAreaSqFt || input.usableRoofAreaSqFt <= 0) {
    missing.push({
      field: 'usableRoofAreaSqFt',
      importance: 'critical',
      message: 'Shadow-free usable rooftop area has not been measured.',
      remedy: 'Measure terrace length and width, excluding water tanks, parapets, and stairwell shadows.',
    });
  }

  if (!input.installationQuotationInr || input.installationQuotationInr <= 0) {
    missing.push({
      field: 'installationQuotationInr',
      importance: 'recommended',
      message: 'No formal vendor quotation provided. Using national benchmark capex.',
      remedy: 'Request competitive quotes from PM Surya Ghar empanelled vendors.',
    });
  }

  if (input.applicableFinancialAssistanceInr && !input.isSubsidyVerified) {
    missing.push({
      field: 'isSubsidyVerified',
      importance: 'recommended',
      message: 'Subsidy amount has not been independently confirmed by DISCOM or National Portal.',
      remedy: 'Register on pmsuryaghar.gov.in and verify technical sanction before committing capital.',
    });
  }

  // Mandatory structural inspection reminder
  missing.push({
    field: 'structuralSafetyInspection',
    importance: 'critical',
    message: 'On-site structural and civil load-bearing audit has not been conducted.',
    remedy: 'Have an accredited structural engineer or certified Surya Mitra inspect the roof slab.',
  });

  return missing;
}

/**
 * Calculates financial scenarios: Conservative, Central, and Optimistic
 */
export function generateSolarScenarios(
  capacityKw: number,
  netInvestmentInr: number,
  tariffs: SolarTariffAssumptions,
  userMaintenanceInr?: number
): { conservative: SolarScenario; central: SolarScenario; optimistic: SolarScenario } {
  const retailRate = tariffs.retailTariffPerKwh || 7.5;
  const exportRate = tariffs.exportCreditRatePerKwh || 2.75;

  // Scenario 1: Conservative (Suboptimal orientation, high dust/monsoon, lower self-consumption)
  const consGenPerKw = 1300; // kWh/kW/year
  const consAnnualGen = Math.round(capacityKw * consGenPerKw);
  const consSelfRatio = 0.70;
  const consSelfConsumed = Math.round(consAnnualGen * consSelfRatio);
  const consExported = consAnnualGen - consSelfConsumed;
  const consBillSavings = Math.round(consSelfConsumed * retailRate);
  const consExportCredits = Math.round(consExported * exportRate);
  const consGrossBenefit = consBillSavings + consExportCredits;
  const consMaintenance = userMaintenanceInr !== undefined && userMaintenanceInr > 0
    ? userMaintenanceInr
    : Math.max(1500, Math.round(netInvestmentInr * 0.015));
  const consNetBenefit = consGrossBenefit - consMaintenance;
  const consPayback = consNetBenefit > 0
    ? Number((netInvestmentInr / consNetBenefit).toFixed(1))
    : null; // Never calculate payback if net benefit is non-positive

  // Scenario 2: Central (Standard CEA Indian benchmark ~4.0 kWh/kW/day, 80% self-consumption)
  const centGenPerKw = 1460; // kWh/kW/year
  const centAnnualGen = Math.round(capacityKw * centGenPerKw);
  const centSelfRatio = 0.80;
  const centSelfConsumed = Math.round(centAnnualGen * centSelfRatio);
  const centExported = centAnnualGen - centSelfConsumed;
  const centBillSavings = Math.round(centSelfConsumed * retailRate);
  const centExportCredits = Math.round(centExported * exportRate);
  const centGrossBenefit = centBillSavings + centExportCredits;
  const centMaintenance = userMaintenanceInr !== undefined && userMaintenanceInr > 0
    ? userMaintenanceInr
    : Math.max(1000, Math.round(netInvestmentInr * 0.010));
  const centNetBenefit = centGrossBenefit - centMaintenance;
  const centPayback = centNetBenefit > 0
    ? Number((netInvestmentInr / centNetBenefit).toFixed(1))
    : null;

  // Scenario 3: Optimistic (High-insolation sunny region, 90% self-consumption, minimal maintenance)
  const optGenPerKw = 1550; // kWh/kW/year
  const optAnnualGen = Math.round(capacityKw * optGenPerKw);
  const optSelfRatio = 0.90;
  const optSelfConsumed = Math.round(optAnnualGen * optSelfRatio);
  const optExported = optAnnualGen - optSelfConsumed;
  const optBillSavings = Math.round(optSelfConsumed * retailRate);
  const optExportCredits = Math.round(optExported * exportRate);
  const optGrossBenefit = optBillSavings + optExportCredits;
  const optMaintenance = userMaintenanceInr !== undefined && userMaintenanceInr > 0
    ? userMaintenanceInr
    : Math.max(800, Math.round(netInvestmentInr * 0.007));
  const optNetBenefit = optGrossBenefit - optMaintenance;
  const optPayback = optNetBenefit > 0
    ? Number((netInvestmentInr / optNetBenefit).toFixed(1))
    : null;

  // 25-Year Lifecycle Accumulation (with respective degradation)
  const calculate25YearLifecycle = (annualNet: number, degradationRate: number) => {
    let cumulative = -netInvestmentInr;
    for (let yr = 1; yr <= 25; yr++) {
      const degradedBenefit = annualNet * Math.pow(1 - degradationRate, yr - 1);
      cumulative += degradedBenefit;
    }
    return Math.round(cumulative);
  };

  return {
    conservative: {
      name: 'conservative',
      label: 'Conservative Scenario',
      annualGenerationKwh: consAnnualGen,
      annualGenerationPerKwKwh: consGenPerKw,
      selfConsumptionRatio: consSelfRatio,
      selfConsumedKwh: consSelfConsumed,
      exportedKwh: consExported,
      annualBillSavingsInr: consBillSavings,
      annualExportCreditsInr: consExportCredits,
      annualGrossBenefitInr: consGrossBenefit,
      annualMaintenanceInr: consMaintenance,
      annualNetBenefitInr: consNetBenefit,
      simplePaybackYears: consPayback,
      twentyFiveYearCumulativeSavingsInr: calculate25YearLifecycle(consNetBenefit, 0.010),
      degradationRatePercent: 1.0,
      assumptions: [
        `Generation yield: ${consGenPerKw} kWh/kW/yr (~3.56 kWh/day/kW)`,
        `70% self-consumed @ ₹${retailRate}/unit, 30% exported @ ₹${exportRate}/unit`,
        `Annual maintenance & cleaning: ₹${consMaintenance}/yr`,
        `Module annual degradation: 1.0%/yr`,
      ],
    },
    central: {
      name: 'central',
      label: 'Central (Benchmark) Scenario',
      annualGenerationKwh: centAnnualGen,
      annualGenerationPerKwKwh: centGenPerKw,
      selfConsumptionRatio: centSelfRatio,
      selfConsumedKwh: centSelfConsumed,
      exportedKwh: centExported,
      annualBillSavingsInr: centBillSavings,
      annualExportCreditsInr: centExportCredits,
      annualGrossBenefitInr: centGrossBenefit,
      annualMaintenanceInr: centMaintenance,
      annualNetBenefitInr: centNetBenefit,
      simplePaybackYears: centPayback,
      twentyFiveYearCumulativeSavingsInr: calculate25YearLifecycle(centNetBenefit, 0.007),
      degradationRatePercent: 0.7,
      assumptions: [
        `Generation yield: ${centGenPerKw} kWh/kW/yr (~4.0 kWh/day/kW - National Benchmark)`,
        `80% self-consumed @ ₹${retailRate}/unit, 20% exported @ ₹${exportRate}/unit`,
        `Annual maintenance & cleaning: ₹${centMaintenance}/yr`,
        `Module annual degradation: 0.7%/yr`,
      ],
    },
    optimistic: {
      name: 'optimistic',
      label: 'Optimistic Scenario',
      annualGenerationKwh: optAnnualGen,
      annualGenerationPerKwKwh: optGenPerKw,
      selfConsumptionRatio: optSelfRatio,
      selfConsumedKwh: optSelfConsumed,
      exportedKwh: optExported,
      annualBillSavingsInr: optBillSavings,
      annualExportCreditsInr: optExportCredits,
      annualGrossBenefitInr: optGrossBenefit,
      annualMaintenanceInr: optMaintenance,
      annualNetBenefitInr: optNetBenefit,
      simplePaybackYears: optPayback,
      twentyFiveYearCumulativeSavingsInr: calculate25YearLifecycle(optNetBenefit, 0.005),
      degradationRatePercent: 0.5,
      assumptions: [
        `Generation yield: ${optGenPerKw} kWh/kW/yr (~4.25 kWh/day/kW - High Insolation)`,
        `90% self-consumed @ ₹${retailRate}/unit, 10% exported @ ₹${exportRate}/unit`,
        `Annual maintenance & cleaning: ₹${optMaintenance}/yr`,
        `Module annual degradation: 0.5%/yr`,
      ],
    },
  };
}

/**
 * Main URJA SAATHI Solar Feasibility Assistant engine
 */
export function runSolarFeasibilityEngine(input: SolarEngineInput): SolarEngineResult {
  const monthlyUnits = Number.isFinite(input.monthlyConsumptionKwh)
    ? Math.max(0, input.monthlyConsumptionKwh || 0)
    : 0;
  const monthlyBill = Number.isFinite(input.monthlyElectricityBillInr)
    ? Math.max(0, input.monthlyElectricityBillInr || 0)
    : 0;
  const usableArea = Number.isFinite(input.usableRoofAreaSqFt)
    ? Math.max(0, input.usableRoofAreaSqFt || 0)
    : 0;
  const roofOwnership = input.roofOwnership || 'owned_individual';

  // Configured tariffs with fallbacks
  const tariffs: SolarTariffAssumptions = {
    retailTariffPerKwh:
      input.tariffAssumptions?.retailTariffPerKwh ||
      (monthlyUnits > 0 && monthlyBill > 0 ? Number((monthlyBill / monthlyUnits).toFixed(2)) : DEFAULT_SOLAR_TARIFF.retailTariffPerKwh),
    marginalTariffPerKwh: input.tariffAssumptions?.marginalTariffPerKwh || DEFAULT_SOLAR_TARIFF.marginalTariffPerKwh,
    fixedChargesMonthlyInr: input.tariffAssumptions?.fixedChargesMonthlyInr || DEFAULT_SOLAR_TARIFF.fixedChargesMonthlyInr,
    exportCreditRatePerKwh: input.tariffAssumptions?.exportCreditRatePerKwh || DEFAULT_SOLAR_TARIFF.exportCreditRatePerKwh,
    discomName: input.tariffAssumptions?.discomName || DEFAULT_SOLAR_TARIFF.discomName,
  };

  // 1. Capacity Estimation
  const maxKwFromRoof = Math.max(0, Math.floor(usableArea / 100)); // 100 sq ft per kW
  const neededKwFromLoad = Math.max(1, Math.ceil(monthlyUnits / 120)); // ~120 kWh/mo per kW

  let recommendedCapacityKw = input.proposedSolarCapacityKw && input.proposedSolarCapacityKw > 0
    ? input.proposedSolarCapacityKw
    : Math.min(Math.max(1, neededKwFromLoad), Math.max(1, maxKwFromRoof || 1));

  // If roof area allows less than 1 kW
  if (usableArea < 80 && !input.hasExistingInstallation) {
    recommendedCapacityKw = 0;
  }

  // 2. Investment Outlay & Financial Assistance
  const benchmarkCostPerKw = getBenchmarkSolarCostPerKw(recommendedCapacityKw);
  const grossInvestmentCostInr = input.installationQuotationInr && input.installationQuotationInr > 0
    ? input.installationQuotationInr
    : recommendedCapacityKw * benchmarkCostPerKw;

  // Subsidies: Never promise approval. If user verified, use it; otherwise compute official benchmark eligibility.
  const eligibleSubsidy = calculateCentralSubsidy(recommendedCapacityKw);
  const financialAssistanceInr = input.applicableFinancialAssistanceInr !== undefined && input.applicableFinancialAssistanceInr >= 0
    ? input.applicableFinancialAssistanceInr
    : eligibleSubsidy;

  const netInvestmentCostInr = Math.max(0, grossInvestmentCostInr - financialAssistanceInr);

  // 3. Generate 3 Scenarios (Conservative, Central, Optimistic)
  const scenarios = generateSolarScenarios(
    recommendedCapacityKw,
    netInvestmentCostInr,
    tariffs,
    input.annualMaintenanceExpenditureInr
  );

  // 4. Missing Information Audit
  const missingInformation = identifyMissingInformation(input);

  // 5. Environmental Metric
  const co2ReductionTonsPerYear = Number(
    ((scenarios.central.annualGenerationKwh * CEA_GRID_EMISSION_FACTOR) / 1000).toFixed(2)
  );

  // 6. Mandatory Disclaimers
  const disclaimers = [
    'Financial projections and payback calculations are simulated engineering estimates and do not constitute a financial guarantee.',
    'Government subsidy under PM Surya Ghar Muft Bijli Yojana is subject to DISCOM technical feasibility sanction and National Portal approval. Subsidy cannot be guaranteed in advance.',
    'Roof structural load-bearing capacity, wind uplift resistance, and shadow casting cannot be certified from photographs or online tools. An on-site physical engineering survey is mandatory.',
    'DISCOM fixed meter charges, electricity duty, and grid connection fees continue to apply regardless of solar self-generation.',
  ];

  // Distinguish confirmed facts from engineering assumptions
  const confirmedFacts: string[] = [
    `Roof Ownership: ${roofOwnership.replace('_', ' ').toUpperCase()}`,
    `Stated Monthly Electricity Consumption: ${monthlyUnits} kWh`,
    `Usable Shadow-Free Roof Area: ${usableArea} sq ft`,
  ];
  if (input.installationQuotationInr) {
    confirmedFacts.push(`Installer Quotation: ₹${input.installationQuotationInr.toLocaleString('en-IN')}`);
  }
  if (input.isSubsidyVerified) {
    confirmedFacts.push(`Subsidy Status: Independently verified (₹${financialAssistanceInr.toLocaleString('en-IN')})`);
  }

  const engineeringAssumptions: string[] = [
    `Array Area Factor: 100 sq ft per 1 kW rated capacity`,
    `Central Generation Yield: 1,460 kWh/kW/year (~4.0 kWh/kW/day national benchmark)`,
    `Retail Tariff Rate: ₹${tariffs.retailTariffPerKwh.toFixed(2)}/kWh`,
    `Surplus Export Credit Rate: ₹${tariffs.exportCreditRatePerKwh.toFixed(2)}/kWh (Average Power Purchase Cost - APPC)`,
    `Annual Inverter & Module Cleaning Maintenance: ₹${scenarios.central.annualMaintenanceInr}/year`,
  ];

  // 7. Decision Evaluation (Support 3 distinct decisions)
  let decision: SolarEngineResult['decision'];
  let decisionTitle: string;
  let decisionRationale: string;
  const suggestedNextSteps: string[] = [];

  // Case 1: Review Existing Installation
  if (input.hasExistingInstallation || (input.existingInstallationKw && input.existingInstallationKw > 0)) {
    decision = 'review_existing_installation';
    decisionTitle = 'Review & Optimize Existing Solar Installation';
    decisionRationale = `You have an existing solar setup (${input.existingInstallationKw || recommendedCapacityKw} kW). Rather than new capital expenditure, focus on maximizing energy yield, panel cleaning frequency, and inverter health diagnostics.`;
    suggestedNextSteps.push(
      'Perform monthly string inverter generation checks to ensure minimum 4.0 kWh/kW/day average yield.',
      'Establish a bi-weekly solar module water-washing schedule to remove performance-degrading dust layers.',
      'Check DISCOM net-metering bills to ensure all surplus exported units are credited accurately on your tariff statement.',
      'Consider evaluating hybrid inverter or battery storage (BESS) retrofits if your area suffers frequent daytime outages.'
    );
  }
  // Case 2: Save Without Solar
  else if (
    roofOwnership === 'tenant' ||
    roofOwnership === 'no_roof' ||
    roofOwnership === 'shared_apartment' ||
    usableArea < 80 ||
    monthlyUnits < 80 ||
    scenarios.central.annualNetBenefitInr <= 0
  ) {
    decision = 'save_without_solar';
    decisionTitle = 'Energy Conservation First (Save Without Solar)';

    if (roofOwnership === 'tenant' || roofOwnership === 'no_roof') {
      decisionRationale = 'As a tenant or non-owner, you do not hold exclusive ownership rights to the rooftop, so capital solar installation is not legally or financially feasible. Your highest return on investment comes from portable efficiency upgrades.';
      suggestedNextSteps.push(
        'Focus on high-ROI portable appliances: Upgrade ceiling fans to 28W BLDC motors and lighting to 9W LEDs.',
        'Adopt behavioral cooling habits: Calibrate AC thermostat to 24°C to save up to 24% compressor load.',
        'Inquire with your local DISCOM or housing society about Group Virtual Net Metering or community solar subscriptions.'
      );
    } else if (roofOwnership === 'shared_apartment') {
      decisionRationale = 'Apartment terraces are common property. Individual net-metering is typically restricted without formal RWA/society general body NOC.';
      suggestedNextSteps.push(
        'Submit a proposal to your Apartment Association for common-area solar installation (lift, water pumps, corridor lighting).',
        'Adopt in-home efficiency retrofits to stay beneath expensive telescopic billing tiers.'
      );
    } else if (usableArea < 80) {
      decisionRationale = `Your usable roof area (${usableArea} sq ft) is below the minimum 80-100 sq ft threshold required for a standard 1 kW array and maintenance walkways.`;
      suggestedNextSteps.push(
        'Prioritize energy efficiency upgrades in the URJA SAATHI Savings Planner.',
        'Explore balcony solar micro-inverter setups if local DISCOM regulations permit plug-in modules.'
      );
    } else {
      decisionRationale = `Your monthly electricity consumption (${monthlyUnits} kWh) is too low to economically justify solar capital expenditure. Mandatory grid connection fees and maintenance exceed the generated benefit.`;
      suggestedNextSteps.push(
        'Maintain low consumption through good usage habits. Solar installation is not economically necessary at this consumption level.'
      );
    }
  }
  // Case 3: Explore Solar
  else {
    decision = 'explore_solar';
    decisionTitle = 'Explore Rooftop Solar (Economically Feasible)';
    decisionRationale = `Rooftop solar is highly feasible for your property. An optimal ${recommendedCapacityKw} kW system can generate ~${scenarios.central.annualGenerationKwh} kWh annually, saving an estimated ${scenarios.central.annualNetBenefitInr.toLocaleString('en-IN')} INR per year with an attractive payback period of ~${scenarios.central.simplePaybackYears} years under central benchmark conditions.`;
    suggestedNextSteps.push(
      'Schedule an on-site structural and shadow survey with a verified local solar engineer or Surya Mitra technician.',
      'Register on the National Portal for Rooftop Solar (pmsuryaghar.gov.in) to verify your DISCOM consumer number eligibility.',
      'Request standardized quotations from at least two empanelled installers to compare panel brands and inverter warranties.',
      'Verify that your sanctioned electrical load (kW) matches or exceeds the proposed solar capacity with your DISCOM.'
    );
  }

  return {
    decision,
    decisionTitle,
    decisionRationale,
    recommendedCapacityKw,
    capacityBasis: `Calculated from ${usableArea} sq ft usable roof space and ${monthlyUnits} kWh monthly load.`,
    grossInvestmentCostInr,
    financialAssistanceInr,
    isSubsidyGuaranteed: false,
    netInvestmentCostInr,
    scenarios,
    co2ReductionTonsPerYear,
    missingInformation,
    disclaimers,
    suggestedNextSteps,
    confirmedFacts,
    engineeringAssumptions,
  };
}
