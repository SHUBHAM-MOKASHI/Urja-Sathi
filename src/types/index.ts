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
  billMonth: string; // e.g. "2024-10" or "October 2024"
  consumerNumber: string;
  consumerName?: string;
  unitsConsumed: number; // kWh
  totalAmount: number; // INR
  tariffRatePerUnit: number;
  fixedCharges: number;
  surcharges: number;
  // Numeric placeholders remain for legacy consumers; unknown is never a real zero charge.
  chargeStatus?: { fixedCharges: 'unknown' | 'confirmed' | 'estimated'; surcharges: 'unknown' | 'confirmed' | 'estimated' };
  dueDateStatus?: 'unknown' | 'confirmed';
  reviewedAt?: string;
  extractionEvidence?: ParsedBillData;
  dueDate: string;
  billDate: string;
  billingPeriod?: string;
  previousReading?: number;
  currentReading?: number;
  isPeakSeason: boolean;
  source: 'ocr_scan' | 'manual' | 'sample';
  ocrConfidence?: number;
  rawOcrText?: string;
  isDuplicate?: boolean;
  userEdited?: boolean;
  slabBreakdown?: {
    slabName: string;
    units: number;
    rate: number;
    amount: number;
  }[];
  createdAt: string;
}

export interface FieldExtractionResult<T> {
  value: T | null;
  confidence: number; // 0 - 100
  rawMatch?: string;
  isManual?: boolean;
  candidates?: { value: T; rawMatch: string; priority: number; corrected?: boolean }[];
  ambiguous?: boolean;
}

export interface ParsedBillData {
  consumerName: FieldExtractionResult<string>;
  consumerNumber: FieldExtractionResult<string>;
  totalAmount: FieldExtractionResult<number>;
  unitsConsumed: FieldExtractionResult<number>;
  billingPeriod: FieldExtractionResult<string>;
  previousReading: FieldExtractionResult<number>;
  currentReading: FieldExtractionResult<number>;
  billDate: FieldExtractionResult<string>;
  dueDate: FieldExtractionResult<string>;
  overallConfidence: number;
  normalizedText: string;
  warnings: string[];
}

export interface BillValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface OcrProgress {
  status: string;
  progress: number; // 0.0 - 1.0
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

// ==========================================
// ENERGY SAVINGS INTELLIGENCE ENGINE TYPES
// ==========================================

export type ApplianceCategory =
  | 'air_conditioner'
  | 'refrigerator'
  | 'ceiling_fan'
  | 'lighting'
  | 'water_heater'
  | 'television'
  | 'washing_machine'
  | 'air_cooler'
  | 'water_pump'
  | 'cooking_appliance'
  | 'other';

export interface ApplianceInput {
  id: string;
  name: string;
  category: ApplianceCategory;
  quantity: number;
  wattage: number; // Watts
  dailyUsageHours: number; // 0 - 24
  starRating?: number; // BEE Star 1-5
  ageYears?: number;
  temperatureSetpointC?: number; // for ACs, e.g. 18 - 28
  standbyHours?: number; // for electronics plugged in while off
}

export interface ApplianceBreakdown {
  id: string;
  name: string;
  category: ApplianceCategory;
  quantity: number;
  wattage: number;
  dailyUsageHours: number;
  dailyKwh: number;
  monthlyKwh: number;
  monthlyCostInr: number;
  percentageOfTotal: number;
}

export interface TariffConfiguration {
  baseRatePerKwh: number;
  marginalRatePerKwh: number;
  fixedChargesInr: number;
  discomName: string;
  isIllustrativeEstimate: boolean;
}

export interface SavingsRecommendation {
  id: string;
  action: string;
  category: 'no_cost' | 'low_cost' | 'investment';
  reason: string;
  estimatedEnergyReductionKwh: number;
  estimatedMonetaryBenefitInr: number;
  upfrontExpenditureInr: number;
  paybackPeriodMonths: number | null; // null for no-cost actions
  assumptions: string[];
  confidence: 'high' | 'moderate' | 'low';
  evidenceQuality: string;
  suggestedNextStep: string;
  targetApplianceCategory?: ApplianceCategory;
  isWithinBudget: boolean;
  affordabilityScore: number; // 0 - 100
  rankScore: number;
}

export interface EnergyEngineInput {
  billedUnitsKwh: number;
  billAmountInr: number;
  billingPeriodDays?: number; // default 30
  householdMembers: number; // default 4
  appliances: ApplianceInput[];
  userBudgetInr: number; // e.g. 0, 1000, 5000, 25000
  tariffConfig?: Partial<TariffConfiguration>;
}

export type EngineStatus = 'success' | 'insufficient_evidence' | 'invalid_input';

export interface EngineAnalysisResult {
  status: EngineStatus;
  statusMessage: string;
  dailyAverageBilledKwh: number;
  monthlyBilledKwh: number;
  billedAmountInr: number;
  effectiveTariffPerKwh: number;
  marginalTariffPerKwh: number;
  billingPeriodDays: number;
  isBillingPeriodValid: boolean;
  totalApplianceCalculatedKwh: number;
  unaccountedOrBaseLoadKwh: number;
  applianceBreakdown: ApplianceBreakdown[];
  recommendations: SavingsRecommendation[];
  potentialMonthlyKwhSavings: number;
  potentialMonthlyInrSavings: number;
  totalUpfrontCostForRecommendedInr: number;
  co2ReductionKgPerMonth: number;
  diagnostics: string[];
  tariffAssumptions: TariffConfiguration;
}

// ==========================================
// SOLAR FEASIBILITY ASSISTANT TYPES
// ==========================================

export type RoofOwnershipType =
  | 'owned_individual'
  | 'shared_apartment'
  | 'tenant'
  | 'commercial_leased'
  | 'no_roof';

export type SolarDecisionType =
  | 'save_without_solar'
  | 'explore_solar'
  | 'review_existing_installation';

export interface SolarTariffAssumptions {
  retailTariffPerKwh: number; // Discom retail unit rate
  marginalTariffPerKwh: number; // Highest slab rate
  fixedChargesMonthlyInr: number; // Inevitable grid connection fee
  exportCreditRatePerKwh: number; // Net-metering surplus feed-in tariff (APPC)
  discomName: string;
}

export interface SolarScenario {
  name: 'conservative' | 'central' | 'optimistic';
  label: string;
  annualGenerationKwh: number;
  annualGenerationPerKwKwh: number;
  selfConsumptionRatio: number; // 0.0 - 1.0
  selfConsumedKwh: number;
  exportedKwh: number;
  annualBillSavingsInr: number;
  annualExportCreditsInr: number;
  annualGrossBenefitInr: number;
  annualMaintenanceInr: number;
  annualNetBenefitInr: number;
  simplePaybackYears: number | null; // null if annualNetBenefit <= 0
  twentyFiveYearCumulativeSavingsInr: number;
  degradationRatePercent: number; // Annual module degradation (e.g. 0.7%)
  assumptions: string[];
}

export interface MissingInformationItem {
  field: string;
  importance: 'critical' | 'recommended' | 'optional';
  message: string;
  remedy: string;
}

export interface SolarEngineInput {
  monthlyConsumptionKwh: number;
  monthlyElectricityBillInr: number;
  usableRoofAreaSqFt: number;
  roofOwnership: RoofOwnershipType;
  proposedSolarCapacityKw?: number;
  installationQuotationInr?: number; // Quotation from vendor if available
  annualMaintenanceExpenditureInr?: number;
  applicableFinancialAssistanceInr?: number; // Verified subsidy amount
  isSubsidyVerified?: boolean;
  hasExistingInstallation?: boolean;
  existingInstallationKw?: number;
  tariffAssumptions?: Partial<SolarTariffAssumptions>;
}

export interface SolarEngineResult {
  decision: SolarDecisionType;
  decisionTitle: string;
  decisionRationale: string;
  recommendedCapacityKw: number;
  capacityBasis: string;
  grossInvestmentCostInr: number;
  financialAssistanceInr: number;
  isSubsidyGuaranteed: false; // Must strictly never guarantee approval
  netInvestmentCostInr: number;
  scenarios: {
    conservative: SolarScenario;
    central: SolarScenario;
    optimistic: SolarScenario;
  };
  co2ReductionTonsPerYear: number;
  missingInformation: MissingInformationItem[];
  disclaimers: string[];
  suggestedNextSteps: string[];
  confirmedFacts: string[];
  engineeringAssumptions: string[];
}

// ==========================================
// SOLAR INSTALLER QUOTATION COMPARISON TYPES
// ==========================================

export type MountingStructureType =
  | 'hot_dip_galvanized'
  | 'aluminum'
  | 'standard_gi'
  | 'elevated'
  | 'unspecified';

export type InverterType =
  | 'string_inverter'
  | 'micro_inverter'
  | 'hybrid_inverter'
  | 'unspecified';

export interface DetailedQuotation {
  id: string;
  installerName: string;
  installerContact?: string;
  installerCity?: string;
  isEmpanelledWithDiscom: boolean;
  totalPriceInr: number;
  systemCapacityKw: number;
  panelManufacturer: string; // e.g. "Tata Power Solar", "Waaree", "Adani Solar"
  panelModel: string; // e.g. "545W Mono PERC Bifacial"
  panelCellType?: string;
  panelQuantity?: number;
  inverterBrand: string; // e.g. "Growatt", "Sungrow", "Solis"
  inverterCapacityKw: number;
  inverterType: InverterType;
  inverterEfficiencyPercent?: number;
  panelProductWarrantyYears: number; // e.g. 10 - 12 yrs
  panelPerformanceWarrantyYears: number; // e.g. 25 - 30 yrs
  inverterWarrantyYears: number; // e.g. 5 - 10 yrs
  workmanshipWarrantyYears: number; // e.g. 1 - 5 yrs
  installationChargesIncluded: boolean;
  mountingStructureType: MountingStructureType;
  discomNetMeteringLiaisoningIncluded: boolean;
  freeMaintenanceYears: number;
  annualMaintenanceCostAfterWarrantyInr?: number;
  cleaningVisitsPerYear?: number;
  estimatedTimelineDays: number;
  hasLocalServiceCenter: boolean;
  guaranteedResponseTimeHours: number; // 0 if unstated
  hasRemoteMonitoringApp: boolean;
  notes?: string;
  createdAt: string;
}

export interface QuotationScoreCategory {
  category: string;
  score: number; // out of maxScore
  maxScore: number;
  explanation: string;
}

export interface QuotationEvaluation {
  quotationId: string;
  installerName: string;
  overallScore: number; // 0 - 100
  rank: number;
  pricePerWattPeak: number; // ₹/Wp
  netCostAfterSubsidy: number;
  scoreCategories: QuotationScoreCategory[];
  strengths: string[];
  drawbacks: string[];
  redFlags: string[];
  missingInformation: string[];
  vendorQuestionsToAsk: string[];
}

export interface QuotationComparisonResult {
  evaluations: QuotationEvaluation[];
  topScoringQuotationId: string;
  comparisonHighlights: string[];
  benchmarkPricePerWattPeak: number;
}

// ==========================================
// GOVERNMENT SCHEME GUIDANCE TYPES
// ==========================================

export type GovernmentSchemeCategory =
  | 'rooftop_solar'
  | 'solar_pumps'
  | 'appliance_efficiency'
  | 'solar_water_heater'
  | 'battery_storage';

export type SchemeLevel = 'central' | 'state';

export interface SchemeSlab {
  capacityRange: string;
  subsidyFormula: string;
  maxSubsidyInr: number;
  notes?: string;
}

export interface EligibilityCriterion {
  id: string;
  label: string;
  description: string;
  category: 'connection' | 'property' | 'banking' | 'technical';
  isMandatory: boolean;
  verificationMethod: string;
  remedyIfFailed: string;
}

export interface RequiredDocument {
  id: string;
  documentName: string;
  issuingAuthority: string;
  purpose: string;
  specifications: string;
  commonPitfalls: string;
  isMandatory: boolean;
}

export interface SchemeApplicationStep {
  stepNumber: number;
  title: string;
  description: string;
  portalAction: string;
}

export interface GovernmentScheme {
  id: string;
  code: string;
  name: string;
  tagline: string;
  administeringAgency: string; // e.g. "Ministry of New & Renewable Energy (MNRE)"
  level: SchemeLevel;
  applicableStates: string[]; // e.g. ['all'] or ['Madhya Pradesh', 'Delhi']
  applicableDiscoms: string[]; // e.g. ['all'] or ['MPPKVVCL_WEST', 'BRPL']
  category: GovernmentSchemeCategory;
  slabs: SchemeSlab[];
  maxSubsidyAmountInr: number;
  validFrom: string;
  validUntil: string;
  policyVersion: string;
  gazetteNotificationNumber?: string;
  sourceUrl: string;
  officialApplicationUrl: string;
  lastVerifiedDate: string; // ISO date string (YYYY-MM-DD)
  isUnverifiedOrOutdated: boolean;
  outdatedWarningNotice?: string;
  applicationSteps: SchemeApplicationStep[];
  eligibilityCriteria: EligibilityCriterion[];
  requiredDocuments: RequiredDocument[];
  commonRejectionReasons: string[];
  disclaimers: string[];
}

export interface DiscomInfo {
  code: string;
  name: string;
  portalUrl: string;
  consumerNumberFormat: string;
  stateCode: string;
}

export interface StateDiscomInfo {
  stateName: string;
  stateCode: string;
  discoms: DiscomInfo[];
}

export interface UserSchemeReadinessInput {
  selectedState: string;
  selectedDiscom: string;
  consumerType?: 'domestic' | 'commercial' | 'agricultural' | 'industrial';
  hasActiveConnection?: boolean;
  hasNoOutstandingDues?: boolean;
  roofOwnership?: 'owned_individual' | 'owned_shared_apartment' | 'tenant';
  hasRwaNoc?: boolean;
  bankAadhaarLinked?: boolean;
  nameMatchesAcrossDocAndBank?: boolean;
  usableRoofAreaSqFt?: number;
  checkedDocumentIds?: string[];
  checkedCriteriaIds?: string[];
}

export interface SchemeReadinessResult {
  schemeId: string;
  eligibilityStatus: 'eligible' | 'conditional' | 'ineligible';
  eligibilityScorePercent: number;
  passedCriteria: EligibilityCriterion[];
  failedCriteria: EligibilityCriterion[];
  documentReadinessPercent: number;
  missingDocuments: RequiredDocument[];
  criticalWarnings: string[];
  readyForOfficialSubmission: boolean;
  nextActions: string[];
}

// ==========================================
// COMMUNITY WORKER & SERVICE MATCHING TYPES
// ==========================================

export type WorkerVerificationStatus =
  | 'verified_licensed' // Independently verified government/council license
  | 'verification_pending' // Evidence submitted, undergoing review
  | 'self_declared_only'; // Self-assessed, cannot perform technical electrical work

export type WorkerRoleCategory =
  | 'licensed_wireman'
  | 'surya_mitra_technician'
  | 'energy_auditor'
  | 'community_energy_guide'; // Non-technical guidance only

export interface WorkerQualificationEvidence {
  id: string;
  certificateName: string;
  certificateNumber: string;
  issuingAuthority: string; // e.g. "State Licensing Board", "National Skill Development Corporation / SCGJ", "BEE"
  issueDate: string;
  validUntil?: string;
  isVerified: boolean;
  verificationSource?: string;
}

export interface DetailedWorkerProfile {
  id: string;
  name: string;
  roleCategory: WorkerRoleCategory;
  verificationStatus: WorkerVerificationStatus;
  experienceYears: number;
  phone: string;
  locality: string;
  pincode: string;
  serviceRadiusKm: number;
  isAvailableToday: boolean;
  hourlyRateInr: number;
  rating: number;
  reviewCount: number;
  completedJobsCount: number;
  selfDeclaredSkills: string[]; // Explicitly separated from verified qualifications
  verifiedQualifications: WorkerQualificationEvidence[]; // Independently verified credentials
  isDemoProfile: boolean; // Clearly labeled for hackathon demonstration
  disclaimer: string;
}

export type ServiceRequestType =
  | 'technical_electrical' // Wiring, earthing, MCB tripping, load balancing (technical)
  | 'technical_solar' // Solar PV installation, inverter fault, panel testing (technical)
  | 'technical_energy_audit' // Professional home appliance audit, power factor (technical)
  | 'non_technical_guidance'; // Bill understanding, PM Surya Ghar portal walkthrough, document prep (non-technical)

export type ServiceRequestStatus =
  | 'pending' // Awaiting worker acceptance
  | 'accepted' // Worker accepted, scheduled
  | 'in_progress' // Worker active on job
  | 'completed' // Work finished & confirmed
  | 'cancelled'; // Cancelled by household or rejected

export interface ComplaintTicket {
  id: string;
  serviceRequestId: string;
  householdName: string;
  workerName: string;
  issueType: 'safety_concern' | 'unqualified_work' | 'overcharging' | 'no_show' | 'other';
  description: string;
  status: 'open' | 'investigating' | 'resolved';
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  householdName: string;
  householdPhone: string;
  locality: string;
  pincode: string;
  requestType: ServiceRequestType;
  title: string;
  description: string;
  preferredDate: string;
  preferredTimeSlot: string;
  assignedWorkerId?: string;
  assignedWorkerName?: string;
  status: ServiceRequestStatus;
  isTechnical: boolean;
  consentGiven: boolean; // Household privacy & contact sharing consent
  createdAt: string;
  completedAt?: string;
  paymentRecordedInr?: number;
  paymentMethod?: 'cash' | 'upi' | 'waived';
  workCompletionNotes?: string;
  householdFeedback?: {
    rating: number; // 1 - 5
    reviewText: string;
    createdAt: string;
  };
  complaintTicket?: ComplaintTicket;
  isDemoRequest?: boolean;
}

export interface WorkerMatchResult {
  worker: DetailedWorkerProfile;
  compatibilityScore: number; // 0 - 100
  isEligibleForTask: boolean;
  ineligibilityReason?: string;
  matchReasons: string[];
}

// ==========================================
// SAVINGS-TO-SKILLS FEEDBACK & IMPACT TRACKER
// ==========================================

export type ImpactEvidenceQuality = 'verified' | 'estimated' | 'potential';

export type ImpactVerificationStatus =
  | 'verified' // Empirically verified with both baseline & subsequent OCR bills
  | 'partially_verified' // Action completed, subsequent bill pending/seasonal variance
  | 'pending_subsequent_bill' // Awaiting next billing cycle read
  | 'insufficient_evidence'; // Missing bill data or invalid read

export interface HouseholdBillEvidence {
  billId: string;
  billMonth: string;
  billDate: string;
  unitsKwh: number;
  amountInr: number;
}

export interface HouseholdCompletedAction {
  actionId: string;
  actionTitle: string;
  completedDate: string;
  documentedExpenditureInr: number;
  expenseReceiptRef?: string;
  assistingWorkerId?: string;
  assistingWorkerName?: string;
}

export interface HouseholdImpactRecord {
  householdId: string;
  householdName: string;
  locality: string;
  pincode: string;
  consentGiven: boolean;
  consentDate: string;
  baselineBill: HouseholdBillEvidence;
  subsequentBill?: HouseholdBillEvidence;
  recommendedActions: {
    actionId: string;
    actionTitle: string;
    estimatedKwhSavings: number;
    estimatedMonetarySavingsInr: number;
  }[];
  completedActions: HouseholdCompletedAction[];
  totalDocumentedExpenditureInr: number;
  estimatedMonthlySavingsKwh: number;
  estimatedMonthlySavingsInr: number;
  verifiedMonthlySavingsKwh: number | null; // Only populated if supported by sufficient evidence!
  verifiedMonthlySavingsInr: number | null; // Only populated if supported by sufficient evidence!
  evidenceQuality: ImpactVerificationStatus;
  auditNotes: string;
  lastAuditedDate: string;
}

export interface WorkerPaymentTransaction {
  requestId: string;
  date: string;
  amountInr: number;
  method: 'cash' | 'upi' | 'waived';
  receiptRef: string;
  isVerified: boolean;
}

export interface WorkerImpactMetric {
  workerId: string;
  workerName: string;
  roleCategory: WorkerRoleCategory;
  totalServiceRequests: number;
  acceptedAssignments: number;
  completedAssignments: number;
  totalDocumentedEarningsInr: number;
  verifiedEarningsInr: number;
  paymentTransactions: WorkerPaymentTransaction[];
  activeMonths: number;
  completionRatePercent: number;
  retentionStatus: 'active_retained' | 'sporadic' | 'inactive';
}

export interface TripartiteImpactSummary {
  // 1. Measured Impact: Empirically verified outcomes backed by OCR bills and worker receipts
  measuredImpact: {
    totalVerifiedSavingsKwhMonthly: number;
    totalVerifiedSavingsInrMonthly: number;
    annualVerifiedSavingsInr: number;
    verifiedHouseholdsCount: number;
    verifiedWorkerEarningsInr: number;
    basisOfCalculation: string;
  };
  // 2. Estimated Impact: Engineering calculations for completed actions awaiting next billing cycle
  estimatedImpact: {
    totalEstimatedSavingsKwhMonthly: number;
    totalEstimatedSavingsInrMonthly: number;
    annualEstimatedSavingsInr: number;
    partiallyVerifiedHouseholdsCount: number;
    basisOfCalculation: string;
  };
  // 3. Potential Impact: Pipeline of unrealized opportunities from pending recommendations
  potentialImpact: {
    totalPotentialSavingsKwhMonthly: number;
    totalPotentialSavingsInrMonthly: number;
    annualPotentialSavingsInr: number;
    pendingActionCount: number;
    basisOfCalculation: string;
  };
}

export interface AdminImpactDashboardData {
  totalConsentingHouseholds: number;
  totalCompletedServices: number;
  totalActiveWorkers: number;
  totalDocumentedPaidAssignmentsInr: number;
  householdFollowUpRecords: HouseholdImpactRecord[];
  workerImpactRecords: WorkerImpactMetric[];
  tripartiteSummary: TripartiteImpactSummary;
  monthlyTrajectory: {
    month: string;
    measuredKwhSaved: number;
    estimatedKwhSaved: number;
    workerEarningsDisbursedInr: number;
    completedJobs: number;
  }[];
  isDemonstrationData: boolean;
  lastAuditTimestamp: string;
}

// ==========================================
// OFFLINE-FIRST SYNCHRONIZATION & QUEUE TYPES
// ==========================================

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';
export type SyncAction = 'create' | 'update' | 'delete';
export type SyncEntityType =
  | 'service_request'
  | 'bill_record'
  | 'solar_assessment'
  | 'user_profile'
  | 'complaint_ticket'
  | 'feedback';

export interface SyncQueueItem {
  id: string; // Unique queue task UUID
  entityType: SyncEntityType;
  action: SyncAction;
  payload: any;
  idempotencyKey: string; // Guaranteed deduplication key
  timestamp: string; // ISO string when queued
  syncStatus: SyncStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  lastAttemptTimestamp?: string;
  syncedAt?: string;
}

export type ConflictResolutionStrategy = 'last_write_wins' | 'server_wins' | 'client_wins';

export interface ConflictRecord {
  id: string;
  entityId: string;
  entityType: SyncEntityType;
  localVersion: any;
  incomingVersion: any;
  resolvedVersion: any;
  strategy: ConflictResolutionStrategy;
  resolvedAt: string;
  notes: string;
}

export interface OfflineSyncSummary {
  totalPending: number;
  totalSyncing: number;
  totalSynced: number;
  totalFailed: number;
  lastSyncTimestamp: string | null;
  isSyncing: boolean;
  conflictsResolved: number;
}

