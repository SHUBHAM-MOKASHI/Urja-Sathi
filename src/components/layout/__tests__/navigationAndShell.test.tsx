import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../../../context/AppContext';
import { NotificationProvider } from '../../../context/NotificationContext';
import { Sidebar } from '../Sidebar';
import { TopUtilityBar } from '../TopUtilityBar';
import { MobileDrawer } from '../MobileDrawer';
import { Footer } from '../Footer';
import { BrandLogo } from '../../common/BrandLogo';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Input } from '../../common/Input';
import { Tabs } from '../../common/Tabs';

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
  };
}
(globalThis as any).localStorage = mockLocalStorage;

const renderComponentToString = (
  ui: React.ReactElement,
  { initialEntries = ['/dashboard'] } = {}
) => {
  return renderToString(
    <MemoryRouter initialEntries={initialEntries}>
      <NotificationProvider>
        <AppProvider>{ui}</AppProvider>
      </NotificationProvider>
    </MemoryRouter>
  );
};

describe('URJA SAATHI — BATCH 7A: Global UI/UX Foundation & Design System', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('1. BrandLogo & Identity System', () => {
    it('renders full brand name and secondary tagline in expanded mode', () => {
      const html = renderComponentToString(<BrandLogo collapsed={false} showTagline={true} />);
      expect(html).toContain('URJA SAATHI');
      expect(html).toContain('Har Ghar Bachat, Har Haath Kaam');
      expect(html).toContain('title="URJA SAATHI — Har Ghar Bachat, Har Haath Kaam"');
    });

    it('hides text and tagline in collapsed mode to prevent boundary overflow', () => {
      const html = renderComponentToString(<BrandLogo collapsed={true} />);
      expect(html).not.toContain('Har Ghar Bachat, Har Haath Kaam');
      expect(html).toContain('justify-center');
    });
  });

  describe('2. Global Sidebar Navigation', () => {
    it('renders all 9 core module navigation links with Lucide icons', () => {
      const html = renderComponentToString(<Sidebar />);
      expect(html).toContain('Dashboard');
      expect(html).toContain('Bill Analyzer');
      expect(html).toContain('Savings Planner');
      expect(html).toContain('Solar ROI Audit');
      expect(html).toContain('Compare Quotations');
      expect(html).toContain('Govt Schemes &amp; DBT');
      expect(html).toContain('Community Workforce');
      expect(html).toContain('Impact Tracker');
      expect(html).toContain('Settings &amp; Cache');
    });

    it('highlights active route with aria-current="page"', () => {
      const html = renderComponentToString(<Sidebar />, { initialEntries: ['/bills'] });
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('href="/bills"');
    });

    it('renders collapse toggle button with accessible aria-label', () => {
      const html = renderComponentToString(<Sidebar />);
      expect(html).toContain('aria-label="Collapse sidebar"');
      expect(html).toContain('w-[250px]');
    });
  });

  describe('3. Top Utility Bar', () => {
    it('displays contextual breadcrumb and page title for current route', () => {
      const html = renderComponentToString(<TopUtilityBar />, { initialEntries: ['/solar'] });
      expect(html).toContain('Solar ROI Audit');
      expect(html).toContain('Renewables');
    });

    it('renders connection status, language selector, and voice assistant trigger', () => {
      const html = renderComponentToString(<TopUtilityBar />);
      expect(html).toMatch(/Online|Offline/);
      expect(html).toContain('Select Language');
      expect(html).toContain('Voice');
      expect(html).toContain('aria-label="Open Voice Assistant"');
    });

    it('includes mobile hamburger drawer trigger button for responsive layouts', () => {
      const html = renderComponentToString(<TopUtilityBar />);
      expect(html).toContain('aria-label="Open mobile navigation menu"');
      expect(html).toContain('lg:hidden');
    });
  });

  describe('4. Mobile Navigation Drawer', () => {
    it('remains hidden by default when closed', () => {
      // In closed state, drawer does not render modal dialog
      const htmlClosed = renderComponentToString(<MobileDrawer />);
      expect(htmlClosed).not.toContain('role="dialog"');
      expect(htmlClosed).not.toContain('Mobile Navigation');
    });
  });

  describe('5. Reusable Design System Components', () => {
    it('Button supports primary, outline, and destructive variants with consistent sizing', () => {
      const primaryHtml = renderToString(<Button variant="primary" size="md">Save Changes</Button>);
      const destructiveHtml = renderToString(<Button variant="destructive" size="sm">Delete Record</Button>);
      const outlineLoadingHtml = renderToString(<Button variant="outline" size="lg" isLoading>Processing</Button>);

      expect(primaryHtml).toContain('bg-emerald-600');
      expect(primaryHtml).toContain('h-10');
      expect(destructiveHtml).toContain('bg-rose-600');
      expect(destructiveHtml).toContain('h-8');
      expect(outlineLoadingHtml).toContain('animate-spin');
      expect(outlineLoadingHtml).toContain('h-12');
    });

    it('Badge renders semantic status tags for verified, pending, and demo states', () => {
      const verifiedHtml = renderToString(<Badge variant="verified">Verified License</Badge>);
      const pendingHtml = renderToString(<Badge variant="pending">Review Pending</Badge>);
      const demoHtml = renderToString(<Badge variant="demo">Demonstration</Badge>);

      expect(verifiedHtml).toContain('bg-emerald-50 text-emerald-800');
      expect(pendingHtml).toContain('bg-amber-50 text-amber-800');
      expect(demoHtml).toContain('bg-slate-100 text-slate-700');
    });

    it('Input renders with accessible labels, errors, and ARIA attributes', () => {
      const html = renderToString(
        <Input
          label="Sanctioned Load (kW)"
          error="Load must be greater than zero"
          helperText="Refer to section 4 of your electricity bill"
          defaultValue="3"
        />
      );

      expect(html).toContain('Sanctioned Load (kW)');
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('Load must be greater than zero');
      expect(html).toContain('border-rose-400');
    });

    it('Tabs renders accessible role="tablist" and role="tab" elements', () => {
      const html = renderToString(
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'breakdown', label: 'Tariff Breakdown', badge: 3 },
          ]}
          activeTab="overview"
          onChange={() => {}}
        />
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tab"');
      expect(html).toContain('aria-selected="true"');
      expect(html).toContain('Tariff Breakdown');
      expect(html).toContain('3');
    });
  });

  describe('6. Logo Click Navigation to Landing Page', () => {
    it('renders BrandLogo with a clickable link pointing to root landing page "/"', () => {
      const html = renderComponentToString(<BrandLogo />);
      expect(html).toContain('href="/"');
      expect(html).toContain('aria-label="Go to URJA SAATHI home"');
    });

    it('renders BrandLogo in Sidebar pointing directly to "/" from any route', () => {
      const htmlWorkforce = renderComponentToString(<Sidebar />, { initialEntries: ['/workforce'] });
      expect(htmlWorkforce).toContain('href="/"');
      expect(htmlWorkforce).toContain('aria-label="Go to URJA SAATHI home"');

      const htmlSolar = renderComponentToString(<Sidebar />, { initialEntries: ['/solar-audit'] });
      expect(htmlSolar).toContain('href="/"');

      const htmlQuotations = renderComponentToString(<Sidebar />, { initialEntries: ['/quotations'] });
      expect(htmlQuotations).toContain('href="/"');
    });

    it('renders BrandLogo in TopUtilityBar pointing to "/"', () => {
      const html = renderComponentToString(<TopUtilityBar />, { initialEntries: ['/dashboard'] });
      expect(html).toContain('href="/"');
      expect(html).toContain('aria-label="Go to URJA SAATHI home"');
    });

    it('renders Brand in Footer pointing to "/"', () => {
      const html = renderComponentToString(<Footer />);
      expect(html).toContain('href="/"');
      expect(html).toContain('aria-label="Go to URJA SAATHI home"');
    });
  });
});
