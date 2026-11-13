import {
  DetailedQuotation,
  QuotationEvaluation,
  QuotationComparisonResult,
  QuotationScoreCategory,
} from '../types';
import { calculateCentralSubsidy } from '../utils/energyCalculations';

export const BENCHMARK_PRICE_PER_WP = 58; // ₹58 per Watt peak is the central national benchmark for 3kW

export const SAMPLE_QUOTATIONS: DetailedQuotation[] = [
  {
    id: 'quote_tata_waaree',
    installerName: 'SuryaTech Solutions (Tata & Waaree Partner)',
    installerContact: '+91 94250 11223',
    installerCity: 'Indore, MP',
    isEmpanelledWithDiscom: true,
    totalPriceInr: 185000,
    systemCapacityKw: 3.0,
    panelManufacturer: 'Tata Power Solar',
    panelModel: '545W Mono PERC Half-Cut',
    panelCellType: 'Mono PERC',
    panelQuantity: 6,
    inverterBrand: 'Growatt Grid-Tied 3.3 kW',
    inverterCapacityKw: 3.3,
    inverterType: 'string_inverter',
    inverterEfficiencyPercent: 97.8,
    panelProductWarrantyYears: 12,
    panelPerformanceWarrantyYears: 25,
    inverterWarrantyYears: 8,
    workmanshipWarrantyYears: 3,
    installationChargesIncluded: true,
    mountingStructureType: 'hot_dip_galvanized',
    discomNetMeteringLiaisoningIncluded: true,
    freeMaintenanceYears: 2,
    annualMaintenanceCostAfterWarrantyInr: 1800,
    cleaningVisitsPerYear: 4,
    estimatedTimelineDays: 14,
    hasLocalServiceCenter: true,
    guaranteedResponseTimeHours: 24,
    hasRemoteMonitoringApp: true,
    notes: 'Turnkey package with all DISCOM approvals, net-meter paperwork, and test report certification.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'quote_budget_fabricator',
    installerName: 'Malwa Urja Systems (Budget Fabricator)',
    installerContact: '+91 98260 55443',
    installerCity: 'Ujjain, MP',
    isEmpanelledWithDiscom: false,
    totalPriceInr: 156000,
    systemCapacityKw: 3.0,
    panelManufacturer: 'Goldi Solar / Navitas',
    panelModel: '535W Mono',
    panelCellType: 'Mono',
    panelQuantity: 6,
    inverterBrand: 'Polycab Solar 3 kW',
    inverterCapacityKw: 3.0,
    inverterType: 'string_inverter',
    inverterEfficiencyPercent: 96.5,
    panelProductWarrantyYears: 10,
    panelPerformanceWarrantyYears: 25,
    inverterWarrantyYears: 5,
    workmanshipWarrantyYears: 1,
    installationChargesIncluded: true,
    mountingStructureType: 'standard_gi',
    discomNetMeteringLiaisoningIncluded: false, // Homeowner must handle DISCOM themselves
    freeMaintenanceYears: 0,
    annualMaintenanceCostAfterWarrantyInr: 2500,
    cleaningVisitsPerYear: 0,
    estimatedTimelineDays: 25,
    hasLocalServiceCenter: false,
    guaranteedResponseTimeHours: 0,
    hasRemoteMonitoringApp: false,
    notes: 'Low initial price, but DISCOM net-metering paperwork and CEIG safety clearance are customer responsibility.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'quote_adani_bifacial',
    installerName: 'SunVeda Green Power (Adani Elite Partner)',
    installerContact: '+91 97550 88991',
    installerCity: 'Bhopal, MP',
    isEmpanelledWithDiscom: true,
    totalPriceInr: 198000,
    systemCapacityKw: 3.0,
    panelManufacturer: 'Adani Solar',
    panelModel: '550W TOPCon Bifacial Dual-Glass',
    panelCellType: 'Bifacial TOPCon',
    panelQuantity: 6,
    inverterBrand: 'Sungrow Grid-tied 3.0 kW',
    inverterCapacityKw: 3.0,
    inverterType: 'string_inverter',
    inverterEfficiencyPercent: 98.4,
    panelProductWarrantyYears: 15,
    panelPerformanceWarrantyYears: 30,
    inverterWarrantyYears: 10,
    workmanshipWarrantyYears: 5,
    installationChargesIncluded: true,
    mountingStructureType: 'aluminum',
    discomNetMeteringLiaisoningIncluded: true,
    freeMaintenanceYears: 3,
    annualMaintenanceCostAfterWarrantyInr: 1500,
    cleaningVisitsPerYear: 6,
    estimatedTimelineDays: 10,
    hasLocalServiceCenter: true,
    guaranteedResponseTimeHours: 24,
    hasRemoteMonitoringApp: true,
    notes: 'High-efficiency dual-glass bifacial modules capturing diffuse rear light. 10-year inverter warranty.',
    createdAt: new Date().toISOString(),
  },
];

/**
 * Evaluates an individual solar installer quotation with transparent, explainable criteria
 */
export function evaluateQuotation(
  quote: DetailedQuotation,
  customSubsidyInr?: number
): QuotationEvaluation {
  const strengths: string[] = [];
  const drawbacks: string[] = [];
  const redFlags: string[] = [];
  const missingInformation: string[] = [];
  const vendorQuestionsToAsk: string[] = [];

  const totalWattPeak = Math.max(1, (quote.systemCapacityKw || 1) * 1000);
  const pricePerWp = Number((quote.totalPriceInr / totalWattPeak).toFixed(1));

  const standardSubsidy = calculateCentralSubsidy(quote.systemCapacityKw);
  const applicableSubsidy = customSubsidyInr !== undefined && customSubsidyInr >= 0
    ? customSubsidyInr
    : standardSubsidy;
  const netCostAfterSubsidy = Math.max(0, quote.totalPriceInr - applicableSubsidy);

  // ----------------------------------------------------
  // Category 1: Price-to-Capacity Commercial Value (30 pts)
  // ----------------------------------------------------
  let priceScore = 0;
  let priceExplanation = '';

  if (pricePerWp >= 50 && pricePerWp <= 63) {
    priceScore = 30;
    priceExplanation = `Optimal market price (₹${pricePerWp}/Wp), aligning with MNRE benchmarks.`;
    strengths.push(`Fair competitive pricing at ₹${pricePerWp}/Wp.`);
  } else if (pricePerWp > 63 && pricePerWp <= 72) {
    priceScore = 24;
    priceExplanation = `Slightly above benchmark (₹${pricePerWp}/Wp); justifiable if premium hardware/warranties are provided.`;
  } else if (pricePerWp > 72) {
    priceScore = 15;
    priceExplanation = `Premium / High pricing (₹${pricePerWp}/Wp). Check if included services justify the markup.`;
    drawbacks.push(`Higher capital cost (₹${pricePerWp}/Wp) than state benchmark of ~₹58/Wp.`);
    vendorQuestionsToAsk.push('Can the installer itemize BOS (Balance of System) and structure costs to justify the premium?');
  } else if (pricePerWp < 45) {
    // Unusually cheap warning (Never blindly rank lowest price as best!)
    priceScore = 18;
    priceExplanation = `Unusually low price (₹${pricePerWp}/Wp). Risk of non-ALMM, B-grade panels, or hidden installation fees.`;
    redFlags.push(`Extremely low price (₹${pricePerWp}/Wp) may indicate unbranded stock or refurbished inverter.`);
    vendorQuestionsToAsk.push('Demand factory test certificates and ALMM (Approved List of Models and Manufacturers) registration for the panels.');
  } else {
    priceScore = 26;
    priceExplanation = `Competitive rate (₹${pricePerWp}/Wp).`;
  }

  // ----------------------------------------------------
  // Category 2: Hardware Quality & Specifications (25 pts)
  // ----------------------------------------------------
  let hardwareScore = 0;
  const hardwarePoints: string[] = [];

  const tier1PanelBrands = ['tata', 'waaree', 'adani', 'vikram', 'goldi', 'renew', 'rayzon'];
  const isTier1Panel = tier1PanelBrands.some((b) =>
    (quote.panelManufacturer || '').toLowerCase().includes(b)
  );

  if (isTier1Panel) {
    hardwareScore += 10;
    strengths.push(`Tier-1 ALMM recognized panel manufacturer: ${quote.panelManufacturer}.`);
  } else {
    hardwareScore += 6;
    vendorQuestionsToAsk.push(`Confirm if ${quote.panelManufacturer} is listed on MNRE's current ALMM portal.`);
  }

  // Inverter
  const knownInverterBrands = ['growatt', 'sungrow', 'solis', 'havells', 'polycab', 'fronius', 'enphase', 'sma'];
  const isKnownInverter = knownInverterBrands.some((b) =>
    (quote.inverterBrand || '').toLowerCase().includes(b)
  );

  if (isKnownInverter) {
    hardwareScore += 8;
  } else {
    hardwareScore += 4;
    vendorQuestionsToAsk.push(`Ask for service track record and local service center details for inverter brand ${quote.inverterBrand}.`);
  }

  // Structure
  if (quote.mountingStructureType === 'hot_dip_galvanized' || quote.mountingStructureType === 'aluminum') {
    hardwareScore += 7;
    strengths.push(`Corrosion-resistant ${quote.mountingStructureType.replace(/_/g, ' ')} structure.`);
  } else if (quote.mountingStructureType === 'standard_gi') {
    hardwareScore += 3;
    drawbacks.push('Standard GI mounting structure is prone to rust in rainy seasons compared to Hot-Dip Galvanized.');
    vendorQuestionsToAsk.push('Can the installer upgrade the structure to Hot-Dip Galvanized (minimum 80 microns coating)?');
  } else {
    hardwareScore += 2;
    missingInformation.push('Mounting structure specification is unspecified.');
  }

  hardwarePoints.push(`Panel: ${quote.panelManufacturer} (${quote.panelModel || 'Standard'}), Inverter: ${quote.inverterBrand}`);

  // ----------------------------------------------------
  // Category 3: Warranty & After-Sales SLAs (25 pts)
  // ----------------------------------------------------
  let warrantyScore = 0;

  // Panel Warranty
  if (quote.panelPerformanceWarrantyYears >= 25) {
    warrantyScore += 8;
  } else {
    warrantyScore += 4;
    drawbacks.push(`Panel performance warranty is only ${quote.panelPerformanceWarrantyYears} years (standard is 25 years).`);
  }

  // Inverter Warranty
  if (quote.inverterWarrantyYears >= 8) {
    warrantyScore += 8;
    strengths.push(`Extended ${quote.inverterWarrantyYears}-year inverter warranty.`);
  } else if (quote.inverterWarrantyYears >= 5) {
    warrantyScore += 5;
  } else {
    warrantyScore += 2;
    drawbacks.push(`Short inverter warranty of ${quote.inverterWarrantyYears} years.`);
    vendorQuestionsToAsk.push('What is the cost of extending the inverter warranty from 5 to 10 years?');
  }

  // Local Service & SLA
  if (quote.hasLocalServiceCenter) {
    warrantyScore += 5;
    strengths.push('Local service center available in your region.');
  } else {
    drawbacks.push('No direct local service center. Maintenance may rely on remote dispatches.');
    missingInformation.push('Absence of committed local service presence.');
  }

  if (quote.guaranteedResponseTimeHours > 0 && quote.guaranteedResponseTimeHours <= 48) {
    warrantyScore += 4;
    strengths.push(`Guaranteed ${quote.guaranteedResponseTimeHours}-hour breakdown response SLA.`);
  } else {
    missingInformation.push('No explicit breakdown response time (SLA) stated in quote.');
    vendorQuestionsToAsk.push('What is the committed response time in writing if the inverter trips or fails?');
  }

  // ----------------------------------------------------
  // Category 4: Execution & Regulatory Assurance (20 pts)
  // ----------------------------------------------------
  let executionScore = 0;

  if (quote.isEmpanelledWithDiscom) {
    executionScore += 8;
    strengths.push('Officially empanelled with DISCOM for direct PM Surya Ghar subsidy coordination.');
  } else {
    drawbacks.push('Installer is not empanelled with DISCOM. Subsidies cannot be processed through this vendor on the national portal.');
    redFlags.push('Non-empanelled vendor: National Portal subsidy eligibility is not supported.');
  }

  if (quote.discomNetMeteringLiaisoningIncluded) {
    executionScore += 8;
    strengths.push('Turnkey net-metering liaisoning and DISCOM paperwork included.');
  } else {
    drawbacks.push('Net-metering liaisoning not included. Customer must navigate DISCOM inspection alone.');
    redFlags.push('Homeowner must coordinate net-metering testing and meter installation independently.');
    vendorQuestionsToAsk.push('Will the installer handle all CEIG / DISCOM net-meter paperwork and site inspections?');
  }

  if (quote.estimatedTimelineDays <= 20) {
    executionScore += 4;
  } else {
    executionScore += 2;
    vendorQuestionsToAsk.push(`Why is the commissioning timeline extended to ${quote.estimatedTimelineDays} days?`);
  }

  // Final Overall Score
  const overallScore = Math.min(100, priceScore + hardwareScore + warrantyScore + executionScore);

  const scoreCategories: QuotationScoreCategory[] = [
    {
      category: 'Price & Value',
      score: priceScore,
      maxScore: 30,
      explanation: priceExplanation,
    },
    {
      category: 'Hardware Quality',
      score: hardwareScore,
      maxScore: 25,
      explanation: hardwarePoints.join(' • '),
    },
    {
      category: 'Warranty & Service',
      score: warrantyScore,
      maxScore: 25,
      explanation: `${quote.panelPerformanceWarrantyYears}y panel, ${quote.inverterWarrantyYears}y inverter warranty`,
    },
    {
      category: 'Regulatory & Execution',
      score: executionScore,
      maxScore: 20,
      explanation: quote.discomNetMeteringLiaisoningIncluded
        ? 'Turnkey DISCOM net-metering included'
        : 'Net-metering liaisoning NOT included',
    },
  ];

  return {
    quotationId: quote.id,
    installerName: quote.installerName,
    overallScore,
    rank: 0, // Assigned during comparison
    pricePerWattPeak: pricePerWp,
    netCostAfterSubsidy,
    scoreCategories,
    strengths,
    drawbacks,
    redFlags,
    missingInformation,
    vendorQuestionsToAsk,
  };
}

/**
 * Compares two or more solar installer quotations and produces ranked, explainable insights
 */
export function compareQuotations(
  quotations: DetailedQuotation[],
  customSubsidyInr?: number
): QuotationComparisonResult {
  if (!quotations || quotations.length === 0) {
    return {
      evaluations: [],
      topScoringQuotationId: '',
      comparisonHighlights: ['No quotations submitted for comparison.'],
      benchmarkPricePerWattPeak: BENCHMARK_PRICE_PER_WP,
    };
  }

  const evaluations = quotations.map((q) => evaluateQuotation(q, customSubsidyInr));

  // Sort by overall score descending (Multi-criteria quality, NEVER simply cheapest!)
  evaluations.sort((a, b) => b.overallScore - a.overallScore);

  // Assign ranks
  evaluations.forEach((item, index) => {
    item.rank = index + 1;
  });

  const topScoring = evaluations[0];
  const cheapest = [...evaluations].sort((a, b) => a.pricePerWattPeak - b.pricePerWattPeak)[0];

  const comparisonHighlights: string[] = [];

  if (topScoring.quotationId === cheapest.quotationId) {
    comparisonHighlights.push(
      `"${topScoring.installerName}" achieves both the highest overall score (${topScoring.overallScore}/100) and the most competitive rate (₹${topScoring.pricePerWattPeak}/Wp).`
    );
  } else {
    comparisonHighlights.push(
      `"${topScoring.installerName}" ranks #1 overall (${topScoring.overallScore}/100) due to superior warranty, Tier-1 hardware, and turnkey DISCOM net-metering, despite not having the lowest upfront price.`
    );
    comparisonHighlights.push(
      `"${cheapest.installerName}" has the lowest initial capital cost (₹${cheapest.pricePerWattPeak}/Wp), but review flagged trade-offs in warranties or liaisoning scope.`
    );
  }

  // Red flag warnings across all quotes
  const totalRedFlags = evaluations.reduce((sum, e) => sum + e.redFlags.length, 0);
  if (totalRedFlags > 0) {
    comparisonHighlights.push(
      `Found ${totalRedFlags} critical scope/regulatory warning(s) across submitted proposals. Verify net-metering liaisoning before paying advance deposits.`
    );
  }

  return {
    evaluations,
    topScoringQuotationId: topScoring.quotationId,
    comparisonHighlights,
    benchmarkPricePerWattPeak: BENCHMARK_PRICE_PER_WP,
  };
}
