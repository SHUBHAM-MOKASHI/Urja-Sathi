import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DetailedQuotation,
  QuotationComparisonResult,
} from '../types';
import {
  compareQuotations,
  SAMPLE_QUOTATIONS,
  BENCHMARK_PRICE_PER_WP,
} from '../services/quotationComparisonService';
import { dbService } from '../services/db';
import { QuotationComparisonTable } from '../components/quotation-comparison/QuotationComparisonTable';
import { QuotationFormModal } from '../components/quotation-comparison/QuotationFormModal';
import { QuotationReportModal } from '../components/quotation-comparison/QuotationReportModal';
import { Button } from '../components/common/Button';
import { StatCard } from '../components/common/StatCard';
import { Loader } from '../components/common/Loader';
import {
  Plus,
  FileText,
  Sparkles,
  Award,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  TrendingDown,
  Scale,
} from 'lucide-react';

export const QuotationComparisonPage: React.FC = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<DetailedQuotation[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<DetailedQuotation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved quotations or pre-populate sample quotations on first load
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await dbService.getDetailedQuotations();
        if (saved && saved.length > 0) {
          setQuotations(saved);
        } else {
          // Initialize with real-world sample proposals for immediate testing
          setQuotations(SAMPLE_QUOTATIONS);
          await dbService.saveDetailedQuotations(SAMPLE_QUOTATIONS);
        }
      } catch (err) {
        console.error('Failed to load detailed quotations:', err);
        setQuotations(SAMPLE_QUOTATIONS);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSaveQuotation = async (quote: DetailedQuotation) => {
    let updated: DetailedQuotation[];
    const exists = quotations.some((q) => q.id === quote.id);
    if (exists) {
      updated = quotations.map((q) => (q.id === quote.id ? quote : q));
    } else {
      updated = [...quotations, quote];
    }
    setQuotations(updated);
    await dbService.saveDetailedQuotations(updated);
  };

  const handleDeleteQuotation = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this quotation from the comparison?')) {
      return;
    }
    const updated = quotations.filter((q) => q.id !== id);
    setQuotations(updated);
    await dbService.saveDetailedQuotations(updated);
  };

  const handleResetToSamples = async () => {
    setQuotations(SAMPLE_QUOTATIONS);
    await dbService.saveDetailedQuotations(SAMPLE_QUOTATIONS);
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear all quotations? You can always restore the sample proposals.')) {
      setQuotations([]);
      await dbService.saveDetailedQuotations([]);
    }
  };

  const handleEdit = (quote: DetailedQuotation) => {
    setEditingQuotation(quote);
    setIsFormOpen(true);
  };

  const handleSelectForSolarAudit = (quote: DetailedQuotation) => {
    // Navigate to Solar Feasibility Assistant passing confirmed capacity and quotation cost
    navigate('/solar-audit', {
      state: {
        prefilledCapacityKw: quote.systemCapacityKw,
        prefilledQuotationInr: quote.totalPriceInr,
        installerName: quote.installerName,
      },
    });
  };

  // Run the multi-criteria evaluation engine
  const comparisonResult: QuotationComparisonResult = compareQuotations(quotations);

  const topScoringQuote = quotations.find(
    (q) => q.id === comparisonResult.topScoringQuotationId
  );
  const topEvaluation = comparisonResult.evaluations.find(
    (e) => e.quotationId === comparisonResult.topScoringQuotationId
  );

  const lowestPriceEvaluation = [...comparisonResult.evaluations].sort(
    (a, b) => a.pricePerWattPeak - b.pricePerWattPeak
  )[0];
  const lowestPriceQuote = quotations.find(
    (q) => q.id === lowestPriceEvaluation?.quotationId
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-forest-950 via-forest-900 to-forest-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Scale className="h-3.5 w-3.5 text-emerald-400" />
            Independent Decision Engine • Har Ghar Bachat, Har Haath Kaam
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            Solar Installer Quotation Comparison
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
            Never choose a solar vendor purely on the lowest price. Our transparent 100-point algorithm
            audits pricing, Tier-1 hardware, product vs performance warranties, DISCOM net-metering liaisoning,
            and after-sales SLAs to protect your rooftop investment.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-16 h-56 w-56 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={() => {
              setEditingQuotation(null);
              setIsFormOpen(true);
            }}
            icon={<Plus className="h-4 w-4" />}
          >
            Add New Quotation
          </Button>

          <Button
            variant="outline"
            onClick={handleResetToSamples}
            icon={<Sparkles className="h-4 w-4 text-emerald-600" />}
          >
            Load 3 Sample Proposals
          </Button>

          {quotations.length > 0 && (
            <Button variant="ghost" onClick={handleClearAll} className="text-slate-500 hover:text-rose-600">
              Clear All
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={quotations.length < 2}
            onClick={() => setIsReportOpen(true)}
            icon={<FileText className="h-4 w-4 text-emerald-700" />}
          >
            Export Comparison Report
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      {quotations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Proposals Under Audit"
            value={quotations.length}
            subtitle={quotations.length >= 2 ? 'Multi-criteria comparison active' : 'Need at least 2 quotes'}
            icon={<Scale className="h-5 w-5 text-emerald-600" />}
          />

          <StatCard
            title="Top Overall Proposal"
            value={topScoringQuote ? `${topEvaluation?.overallScore}/100` : '—'}
            subtitle={topScoringQuote ? topScoringQuote.installerName : 'Add proposals to rank'}
            icon={<Award className="h-5 w-5 text-emerald-600" />}
          />

          <StatCard
            title="Lowest Upfront Rate"
            value={lowestPriceEvaluation ? `₹${lowestPriceEvaluation.pricePerWattPeak}/Wp` : '—'}
            subtitle={
              lowestPriceQuote
                ? `${lowestPriceQuote.installerName} (Rank #${lowestPriceEvaluation?.rank})`
                : 'Most competitive quote'
            }
            icon={<TrendingDown className="h-5 w-5 text-amber-600" />}
          />

          <StatCard
            title="National Benchmark"
            value={`₹${BENCHMARK_PRICE_PER_WP}/Wp`}
            subtitle="MNRE central 3kW benchmark"
            icon={<HelpCircle className="h-5 w-5 text-slate-500" />}
          />
        </div>
      )}

      {/* Highlights & Scope Warnings Banner */}
      {comparisonResult.comparisonHighlights.length > 0 && quotations.length >= 2 && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-2">
          <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-700" />
            Engine Findings & Comparative Highlights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-emerald-900">
            {comparisonResult.comparisonHighlights.map((hl, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-700">•</span>
                <span>{hl}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-xl mx-auto shadow-subtle">
          <Loader size="lg" label="Loading installer quotations from local database..." />
        </div>
      ) : quotations.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Scale className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Installer Quotations Added Yet</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            Enter quotes you received from local rooftop solar installers to perform a transparent, side-by-side
            cost and hardware audit. Or load sample proposals from reputable vendors.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              onClick={() => {
                setEditingQuotation(null);
                setIsFormOpen(true);
              }}
              icon={<Plus className="h-4 w-4" />}
            >
              Enter New Quotation
            </Button>
            <Button
              variant="outline"
              onClick={handleResetToSamples}
              icon={<Sparkles className="h-4 w-4 text-emerald-600" />}
            >
              Load Sample Proposals
            </Button>
          </div>
        </div>
      ) : quotations.length === 1 ? (
        /* Only 1 Quotation entered */
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                You have entered 1 quotation. Add at least 1 more quotation to enable side-by-side comparative ranking and trade-off highlights.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToSamples}
              icon={<Sparkles className="h-3.5 w-3.5 text-emerald-600" />}
            >
              Load Sample Comparisons
            </Button>
          </div>

          <QuotationComparisonTable
            quotations={quotations}
            evaluations={comparisonResult.evaluations}
            onEdit={handleEdit}
            onDelete={handleDeleteQuotation}
            onSelectForSolarAudit={handleSelectForSolarAudit}
          />
        </div>
      ) : (
        /* 2 or more quotations entered -> Full Comparison Mode */
        <div className="space-y-8">
          <QuotationComparisonTable
            quotations={quotations}
            evaluations={comparisonResult.evaluations}
            onEdit={handleEdit}
            onDelete={handleDeleteQuotation}
            onSelectForSolarAudit={handleSelectForSolarAudit}
          />
        </div>
      )}

      {/* Integration Callout to Solar Feasibility Assistant */}
      <div className="bg-gradient-to-r from-slate-900 to-forest-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-2 max-w-2xl">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Connected Engineering Workflow
          </span>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
            Ready to calculate generation and payback with your confirmed quotation?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300">
            Feed confirmed vendor costs directly into our Solar Feasibility Assistant to model 25-year bill savings,
            grid export revenue, and sensitivity scenarios.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            if (topScoringQuote) {
              handleSelectForSolarAudit(topScoringQuote);
            } else {
              navigate('/solar-audit');
            }
          }}
          icon={<ArrowRight className="h-4 w-4" />}
          className="shrink-0"
        >
          {topScoringQuote ? `Run Feasibility with ${topScoringQuote.installerName}` : 'Open Solar Feasibility'}
        </Button>
      </div>

      {/* Quotation Form Modal */}
      <QuotationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveQuotation}
        initialQuotation={editingQuotation}
      />

      {/* Printable Report Modal */}
      <QuotationReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        quotations={quotations}
        comparisonResult={comparisonResult}
      />
    </div>
  );
};
