import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../context/AppContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { VendorComparisonCards } from '../quotation-comparison/VendorComparisonCards';
import { QuotationComparisonTable } from '../quotation-comparison/QuotationComparisonTable';
import { SchemeCard } from '../schemes/SchemeCard';
import { StateDiscomSelector } from '../schemes/StateDiscomSelector';
import { SchemeDetailModal } from '../schemes/SchemeDetailModal';
import { WorkerCard } from '../workforce/WorkerCard';
import { WorkerProfileModal } from '../workforce/WorkerProfileModal';
import { TripartiteImpactCards } from '../impact/TripartiteImpactCards';
import { HouseholdFollowUpTable } from '../impact/HouseholdFollowUpTable';
import { WorkerEarningsRetentionTable } from '../impact/WorkerEarningsRetentionTable';
import { DownloadableImpactReportModal } from '../impact/DownloadableImpactReportModal';

import { SAMPLE_QUOTATIONS, compareQuotations } from '../../services/quotationComparisonService';
import { getAvailableStates, getSchemesForStateAndDiscom } from '../../services/schemeGuidanceService';
import { SAMPLE_WORKERS } from '../../data/workerData';
import { getDemoAdminImpactData } from '../../data/impactDemoData';

// Mock localStorage for Vitest Node environment
const storageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => storageStore[key] || null,
  setItem: (key: string, val: string) => {
    storageStore[key] = val;
  },
  removeItem: (key: string) => {
    delete storageStore[key];
  },
  clear: () => {
    for (const k in storageStore) delete storageStore[k];
  },
};

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    localStorage: mockLocalStorage,
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    confirm: () => true,
  };
}
(globalThis as any).localStorage = mockLocalStorage;

const renderComponentToString = (
  ui: React.ReactElement,
  { initialEntries = ['/'] } = {}
) => {
  return renderToString(
    <MemoryRouter initialEntries={initialEntries}>
      <NotificationProvider>
        <AppProvider>{ui}</AppProvider>
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('URJA SAATHI — BATCH 7C: Advanced Modules UI/UX Transformation', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  // -------------------------------------------------------------
  // MODULE 1: COMPARE QUOTATIONS
  // -------------------------------------------------------------
  describe('1. Compare Quotations UI & Responsiveness', () => {
    const comparisonResult = compareQuotations(SAMPLE_QUOTATIONS);

    it('renders VendorComparisonCards with #1 Recommended proposal highlighted', () => {
      const html = renderComponentToString(
        <VendorComparisonCards
          quotations={SAMPLE_QUOTATIONS}
          evaluations={comparisonResult.evaluations}
          onEdit={() => {}}
          onDelete={() => {}}
          onSelectForSolarAudit={() => {}}
        />
      );

      expect(html).toContain('Vendor Proposal Overview Cards');
      expect(html).toContain('#1 Recommended');
      expect(html).toContain('Demo Proposal');
      expect(html).toContain('Overall Score');
      expect(html).toContain('Model in Solar ROI Audit');
    });

    it('renders QuotationComparisonTable with sticky metric labels and mobile column filter bar', () => {
      const html = renderComponentToString(
        <QuotationComparisonTable
          quotations={SAMPLE_QUOTATIONS}
          evaluations={comparisonResult.evaluations}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      expect(html).toContain('Evaluation Metric');
      expect(html).toContain('Filter Active Columns:');
      expect(html).toContain('Commercials &amp; Subsidies');
      expect(html).toContain('Hardware Quality &amp; Warranties');
      expect(html).toContain('DISCOM Approvals &amp; Liaisoning');
      expect(html).toContain('Critical Red Flags');
    });
  });

  // -------------------------------------------------------------
  // MODULE 2: GOVERNMENT SCHEMES & DBT
  // -------------------------------------------------------------
  describe('2. Government Schemes & Subsidy Preparation', () => {
    const states = getAvailableStates();
    const schemes = getSchemesForStateAndDiscom('Madhya Pradesh', 'MPPKVVCL_WEST', 'all');

    it('renders StateDiscomSelector with official utility portal direct link', () => {
      const html = renderComponentToString(
        <StateDiscomSelector
          states={states}
          selectedState="Madhya Pradesh"
          selectedDiscom="MPPKVVCL_WEST"
          onSelectState={() => {}}
          onSelectDiscom={() => {}}
        />
      );

      expect(html).toContain('Select Your State &amp; Electricity Distribution Company (DISCOM)');
      expect(html).toContain('Consumer ID Format:');
      expect(html).toContain('Utility Portal');
    });

    it('renders SchemeCard with preliminary eligibility status and official portal source label', () => {
      const html = renderComponentToString(
        <SchemeCard scheme={schemes[0]} onOpenDetails={() => {}} />
      );

      expect(html).toContain('Potentially Eligible (Subject to Document &amp; DISCOM Audit)');
      expect(html).toContain('Financial Assistance Structure');
      expect(html).toContain('Official Portal');
      expect(html).toContain('View Details &amp; Checklist');
    });

    it('renders SchemeDetailModal with document readiness progress and reset checklist option', () => {
      const html = renderComponentToString(
        <SchemeDetailModal
          isOpen={true}
          onClose={() => {}}
          scheme={schemes[0]}
          initialState="Madhya Pradesh"
          initialDiscom="MPPKVVCL_WEST"
        />
      );

      expect(html).toContain('3. Required Documents');
      expect(html).toContain('Official Policy Disclaimer:');
      expect(html).toContain('pmsuryaghar.gov.in');
    });
  });

  // -------------------------------------------------------------
  // MODULE 3: COMMUNITY WORKFORCE TRUST & VERIFICATION INTEGRITY
  // -------------------------------------------------------------
  describe('3. Community Workforce Trust, Safety & Verification Integrity', () => {
    it('CRITICAL: labels demo profiles clearly with "Simulated Credential — Demonstration Only"', () => {
      const demoWorker = SAMPLE_WORKERS.find((w) => w.isDemoProfile);
      expect(demoWorker).toBeDefined();

      const html = renderComponentToString(
        <WorkerCard
          worker={demoWorker!}
          onBook={() => {}}
          onViewProfile={() => {}}
        />
      );

      expect(html).toContain('Demo Profile');
      expect(html).toContain('Simulated Credential — Demonstration Only');
      expect(html).toContain('Sample ID #');
      expect(html).not.toContain('Govt Verified License');
    });

    it('renders verified licensed worker credentials truthfully when not a demo profile', () => {
      const realWorker = {
        ...SAMPLE_WORKERS[0],
        id: 'real_worker_1',
        isDemoProfile: false,
        verificationStatus: 'verified_licensed' as const,
      };

      const html = renderComponentToString(
        <WorkerCard
          worker={realWorker}
          onBook={() => {}}
          onViewProfile={() => {}}
        />
      );

      expect(html).toContain('Govt Verified License');
      expect(html).toContain('Independently Verified Credential:');
      expect(html).toContain('Lic #');
    });

    it('renders WorkerProfileModal with appropriate simulated vs verified credentials', () => {
      const demoWorker = SAMPLE_WORKERS.find((w) => w.isDemoProfile);

      const html = renderComponentToString(
        <WorkerProfileModal
          isOpen={true}
          onClose={() => {}}
          worker={demoWorker!}
          onBook={() => {}}
        />
      );

      expect(html).toContain('Simulated Credentials (Demonstration Profile Only)');
      expect(html).toContain('Simulated Credential — Demonstration Only');
      expect(html).toContain('Sample Identifier (Demo)');
    });
  });

  // -------------------------------------------------------------
  // MODULE 4: IMPACT TRACKER & EVIDENCE CLASSIFICATION
  // -------------------------------------------------------------
  describe('4. Impact Tracker & Tripartite Evidence Separation', () => {
    const demoData = getDemoAdminImpactData();

    it('renders TripartiteImpactCards strictly segregating Measured, Estimated, and Potential tiers', () => {
      const html = renderComponentToString(
        <TripartiteImpactCards
          summary={demoData.tripartiteSummary}
          isDemonstrationData={true}
        />
      );

      expect(html).toContain('Audit Transparency Mandate: Strict Tripartite Impact Segregation');
      expect(html).toContain('Tier 1: Measured Impact');
      expect(html).toContain('OCR Bill Verified');
      expect(html).toContain('Tier 2: Estimated Impact');
      expect(html).toContain('Tier 3: Potential Impact');
    });

    it('renders HouseholdFollowUpTable with consent status, masked IDs, and audit evidence', () => {
      const html = renderComponentToString(
        <HouseholdFollowUpTable records={demoData.householdFollowUpRecords} />
      );

      expect(html).toContain('Household &amp; Location');
      expect(html).toContain('Consent Status');
      expect(html).toContain('Baseline Bill (OCR)');
      expect(html).toContain('Subsequent Bill (OCR)');
      expect(html).toContain('Audit Status');
    });

    it('renders WorkerEarningsRetentionTable with verified disbursements and retention badges', () => {
      const html = renderComponentToString(
        <WorkerEarningsRetentionTable workers={demoData.workerImpactRecords} />
      );

      expect(html).toContain('Worker &amp; Qualification');
      expect(html).toContain('Requests Received');
      expect(html).toContain('Jobs Completed');
      expect(html).toContain('Active Retained');
    });

    it('renders DownloadableImpactReportModal with demonstration watermark and privacy masking controls', () => {
      const html = renderComponentToString(
        <DownloadableImpactReportModal
          isOpen={true}
          onClose={() => {}}
          dashboardData={demoData}
        />
      );

      expect(html).toContain('Downloadable Community Impact &amp; Verification Dossier');
      expect(html).toContain('Demonstration Audit Dossier');
      expect(html).toContain('PII Masked (DPDP Safe)');
      expect(html).toContain('Print / Save as PDF');
    });
  });
});
