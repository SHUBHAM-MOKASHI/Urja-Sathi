import { describe, it, expect } from 'vitest';
import {
  evaluateQuotation,
  compareQuotations,
  BENCHMARK_PRICE_PER_WP,
  SAMPLE_QUOTATIONS,
} from '../quotationComparisonService';
import { DetailedQuotation } from '../../types';

describe('Solar Quotation Comparison Service', () => {
  describe('evaluateQuotation', () => {
    it('evaluates a high-quality turnkey quotation with top scores and strengths', () => {
      const quote = SAMPLE_QUOTATIONS[0]; // Tata & Waaree Turnkey
      const evalResult = evaluateQuotation(quote);

      expect(evalResult.installerName).toContain('SuryaTech');
      expect(evalResult.overallScore).toBeGreaterThanOrEqual(80);
      expect(evalResult.pricePerWattPeak).toBeCloseTo(61.7, 1);
      expect(evalResult.netCostAfterSubsidy).toBe(quote.totalPriceInr - 78000); // 3kW subsidy = 78k
      expect(evalResult.strengths.length).toBeGreaterThan(2);
      expect(evalResult.redFlags).toHaveLength(0);

      // Verify category breakdown exists and sums correctly
      expect(evalResult.scoreCategories).toHaveLength(4);
      const categorySum = evalResult.scoreCategories.reduce((sum, c) => sum + c.score, 0);
      expect(evalResult.overallScore).toBe(categorySum);
    });

    it('penalizes and flags red flags for a cheap quote lacking net-metering and DISCOM empanelment', () => {
      const budgetQuote = SAMPLE_QUOTATIONS[1]; // Budget Fabricator
      const evalResult = evaluateQuotation(budgetQuote);

      expect(evalResult.installerName).toContain('Budget Fabricator');
      // Red flags should catch DISCOM empanelment and liaisoning
      expect(evalResult.redFlags.length).toBeGreaterThanOrEqual(1);
      const hasLiaisoningFlag = evalResult.redFlags.some((rf) =>
        rf.toLowerCase().includes('net-metering') || rf.toLowerCase().includes('national portal')
      );
      expect(hasLiaisoningFlag).toBe(true);

      // Drawbacks should note GI structure and lack of SLA
      expect(evalResult.drawbacks.some((d) => d.includes('GI') || d.includes('rust'))).toBe(true);

      // Score should be lower than turnkey package despite lower price
      const turnkeyScore = evaluateQuotation(SAMPLE_QUOTATIONS[0]).overallScore;
      expect(evalResult.overallScore).toBeLessThan(turnkeyScore);
    });

    it('flags suspiciously cheap quotations (< ₹45/Wp) as a red flag instead of rewarding them blindly', () => {
      const suspiciousQuote: DetailedQuotation = {
        id: 'suspicious_cheap',
        installerName: 'Fly By Night Solar',
        totalPriceInr: 105000, // ₹35/Wp for 3kW - dangerously below benchmark
        systemCapacityKw: 3.0,
        panelManufacturer: 'Unbranded Solar',
        panelModel: '330W Poly',
        inverterBrand: 'Unknown Brand',
        inverterCapacityKw: 3.0,
        inverterType: 'string_inverter',
        panelProductWarrantyYears: 5,
        panelPerformanceWarrantyYears: 20,
        inverterWarrantyYears: 2,
        workmanshipWarrantyYears: 0,
        installationChargesIncluded: false,
        mountingStructureType: 'unspecified',
        discomNetMeteringLiaisoningIncluded: false,
        freeMaintenanceYears: 0,
        estimatedTimelineDays: 45,
        hasLocalServiceCenter: false,
        guaranteedResponseTimeHours: 0,
        hasRemoteMonitoringApp: false,
        isEmpanelledWithDiscom: false,
        createdAt: new Date().toISOString(),
      };

      const evalResult = evaluateQuotation(suspiciousQuote);

      expect(evalResult.pricePerWattPeak).toBe(35);
      expect(evalResult.redFlags.some((rf) => rf.toLowerCase().includes('low price') || rf.toLowerCase().includes('unbranded'))).toBe(true);
      // Value score should be penalized, not given full 30
      const valueScore = evalResult.scoreCategories.find((c) => c.category === 'Price & Value');
      expect(valueScore?.score).toBeLessThan(20);
      expect(evalResult.overallScore).toBeLessThan(50);
    });

    it('identifies missing specifications and generates appropriate vendor questions', () => {
      const incompleteQuote: DetailedQuotation = {
        id: 'incomplete_quote',
        installerName: 'Incomplete Proposal Co',
        totalPriceInr: 180000,
        systemCapacityKw: 3.0,
        panelManufacturer: 'Generic Solar',
        panelModel: '',
        inverterBrand: 'Generic Inverter',
        inverterCapacityKw: 3.0,
        inverterType: 'unspecified',
        panelProductWarrantyYears: 10,
        panelPerformanceWarrantyYears: 25,
        inverterWarrantyYears: 5,
        workmanshipWarrantyYears: 1,
        installationChargesIncluded: true,
        mountingStructureType: 'unspecified',
        discomNetMeteringLiaisoningIncluded: true,
        freeMaintenanceYears: 1,
        estimatedTimelineDays: 15,
        hasLocalServiceCenter: false,
        guaranteedResponseTimeHours: 0, // Missing SLA
        hasRemoteMonitoringApp: false,
        isEmpanelledWithDiscom: true,
        createdAt: new Date().toISOString(),
      };

      const evalResult = evaluateQuotation(incompleteQuote);

      expect(evalResult.missingInformation.length).toBeGreaterThanOrEqual(2);
      expect(evalResult.missingInformation.some((m) => m.toLowerCase().includes('structure'))).toBe(true);
      expect(evalResult.missingInformation.some((m) => m.toLowerCase().includes('sla') || m.toLowerCase().includes('response time'))).toBe(true);
      expect(evalResult.vendorQuestionsToAsk.length).toBeGreaterThanOrEqual(2);
    });

    it('calculates net investment correctly with custom subsidy overrides', () => {
      const quote = SAMPLE_QUOTATIONS[0];
      const customSubsidy = 50000;
      const evalResult = evaluateQuotation(quote, customSubsidy);

      expect(evalResult.netCostAfterSubsidy).toBe(quote.totalPriceInr - customSubsidy);
    });

    it('handles zero or negative system capacity safely without throwing division by zero', () => {
      const zeroCapacityQuote: DetailedQuotation = {
        ...SAMPLE_QUOTATIONS[0],
        id: 'zero_cap',
        systemCapacityKw: 0,
      };

      const evalResult = evaluateQuotation(zeroCapacityQuote);
      expect(evalResult.pricePerWattPeak).toBeGreaterThan(0);
      expect(Number.isFinite(evalResult.pricePerWattPeak)).toBe(true);
    });
  });

  describe('compareQuotations', () => {
    it('handles empty quotation lists gracefully', () => {
      const result = compareQuotations([]);
      expect(result.evaluations).toHaveLength(0);
      expect(result.topScoringQuotationId).toBe('');
      expect(result.benchmarkPricePerWattPeak).toBe(BENCHMARK_PRICE_PER_WP);
    });

    it('compares sample quotations, correctly ranking by multi-criteria score rather than lowest price', () => {
      const result = compareQuotations(SAMPLE_QUOTATIONS);

      expect(result.evaluations).toHaveLength(3);
      // Top rank should be rank 1
      expect(result.evaluations[0].rank).toBe(1);
      expect(result.evaluations[1].rank).toBe(2);
      expect(result.evaluations[2].rank).toBe(3);

      // Scores must be sorted descending
      expect(result.evaluations[0].overallScore).toBeGreaterThanOrEqual(result.evaluations[1].overallScore);
      expect(result.evaluations[1].overallScore).toBeGreaterThanOrEqual(result.evaluations[2].overallScore);

      // The cheapest quote is Budget Fabricator (₹1,56,000 / 3kW = ₹52/Wp)
      // BUT it should NOT be ranked #1 because it lacks net-metering, empanelment, and has GI structure
      const budgetEval = result.evaluations.find((e) => e.quotationId === 'quote_budget_fabricator');
      expect(budgetEval?.rank).not.toBe(1);

      // The top scoring quotation should be either Adani or Tata
      expect(['quote_tata_waaree', 'quote_adani_bifacial']).toContain(result.topScoringQuotationId);

      // Highlights must include explainable comparison notes
      expect(result.comparisonHighlights.length).toBeGreaterThan(0);
      expect(result.comparisonHighlights.some((h) => h.includes('trade-off') || h.includes('score'))).toBe(true);
    });

    it('accurately identifies when the top scorer is also the most cost-effective', () => {
      // Create a test where quote A is clearly superior in every way including price
      const superiorQuote: DetailedQuotation = {
        ...SAMPLE_QUOTATIONS[0],
        id: 'superior_quote',
        installerName: 'Benchmark Leader Solar',
        totalPriceInr: 155000, // ₹51.6/Wp
        isEmpanelledWithDiscom: true,
        discomNetMeteringLiaisoningIncluded: true,
      };

      const expensiveQuote: DetailedQuotation = {
        ...SAMPLE_QUOTATIONS[1],
        id: 'expensive_mediocre',
        installerName: 'Overpriced Fabricator',
        totalPriceInr: 210000, // ₹70/Wp
        isEmpanelledWithDiscom: false,
      };

      const result = compareQuotations([superiorQuote, expensiveQuote]);
      expect(result.topScoringQuotationId).toBe('superior_quote');
      expect(result.evaluations[0].quotationId).toBe('superior_quote');
      expect(result.comparisonHighlights[0]).toContain('highest overall score');
    });
  });
});
