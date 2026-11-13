export type Language = 'en' | 'hi' | 'mr';

export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
  pincode: string;
  state: string;
  discomName?: string;
  sanctionedLoadKw?: number;
  avgMonthlyBill?: number;
  hasRooftopAccess: boolean;
  preferredLanguage: Language;
}

export interface ElectricityBill {
  id: string;
  billMonth: string; // e.g. "2024-10"
  consumerNumber: string;
  unitsConsumed: number; // kWh
  totalAmount: number; // INR
  tariffRatePerUnit: number;
  fixedCharges: number;
  surcharges: number;
  dueDate: string;
  billDate: string;
  isPeakSeason: boolean;
  source: 'ocr_scan' | 'manual' | 'sample';
  slabBreakdown?: {
    slabName: string;
    units: number;
    rate: number;
    amount: number;
  }[];
  createdAt: string;
}

export interface ApplianceEnergyUsage {
  id: string;
  name: string;
  category: 'cooling' | 'heating' | 'lighting' | 'kitchen' | 'entertainment' | 'other';
  wattage: number;
  dailyUsageHours: number;
  starRating?: number; // BEE star rating 1-5
  ageYears?: number;
  monthlyKwh: number;
  monthlyCost: number;
  replacementSuggestion?: {
    recommendation: string;
    savingsMonthlyInr: number;
    estimatedCost: number;
    paybackMonths: number;
  };
}

export interface SolarAssessment {
  id: string;
  rooftopAreaSqFt: number;
  recommendedSystemSizeKw: number;
  totalEstimatedCost: number;
  centralSubsidyAmount: number; // PM Surya Ghar Muft Bijli Yojana subsidy
  netCostAfterSubsidy: number;
  annualGenerationKwh: number;
  annualSavingsInr: number;
  co2ReductionTonsPerYear: number;
  paybackPeriodYears: number;
  twentyFiveYearSavingsInr: number;
  createdAt: string;
}

export interface InstallerQuotation {
  id: string;
  installerId: string;
  installerName: string;
  rating: number;
  completedProjects: number;
  systemSizeKw: number;
  panelBrand: string;
  inverterBrand: string;
  totalQuotationAmount: number;
  subsidyAssistanceProvided: boolean;
  warrantyYears: number;
  estimatedInstallationDays: number;
  verifiedPartner: boolean;
  distanceKm: number;
  status: 'draft' | 'submitted' | 'accepted' | 'under_review';
}

export interface EnergyWorker {
  id: string;
  name: string;
  category: 'electrician' | 'solar_technician' | 'energy_auditor' | 'inverter_specialist';
  experienceYears: number;
  rating: number;
  reviewCount: number;
  phone: string;
  locality: string;
  pincode: string;
  isAvailableToday: boolean;
  skills: string[];
  certifications: string[]; // e.g. "Surya Mitra Certified", "Govt ITI Electrician"
  completedJobs: number;
  hourlyRateInr: number;
}

export interface EnergyTip {
  id: string;
  title: string;
  description: string;
  category: 'no_cost' | 'low_cost' | 'investment';
  potentialMonthlySavingsInr: number;
  effortLevel: 'easy' | 'moderate' | 'advanced';
  iconName: string;
}
