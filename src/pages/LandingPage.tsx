import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Sun,
  Users,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  HardDrive,
  Mic,
  ChevronRight,
  FileSpreadsheet,
  Lightbulb,
  Landmark,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { formatCurrency } from '../utils/formatters';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export const LandingPage: React.FC = () => {
  const [sliderUnits, setSliderUnits] = useState<number>(320);

  // Quick simulated estimator calculation
  const estimatedMonthlyBill = Math.round(sliderUnits * 7.5);
  const potentialSolarSystemKw = Math.min(5, Math.max(1, Math.ceil(sliderUnits / 120)));
  const monthlySolarGen = potentialSolarSystemKw * 120;
  const netMonthlyCost = Math.max(150, (sliderUnits - monthlySolarGen) * 7.5);
  const annualSavings = Math.round((estimatedMonthlyBill - netMonthlyCost) * 12);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24 bg-gradient-to-b from-emerald-50/50 via-slate-50 to-slate-50 border-b border-slate-200/70">
        {/* Subtle decorative background blur */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-emerald-200/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Headlines & Action */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Mission Badge */}
              <div className="inline-flex items-center gap-2">
                <Badge variant="emerald" size="md" icon={<Zap className="w-3.5 h-3.5 text-emerald-600" />}>
                  Har Ghar Bachat, Har Haath Kaam
                </Badge>
                <Badge variant="slate" size="md" icon={<ShieldCheck className="w-3.5 h-3.5 text-slate-500" />}>
                  100% Offline-First Privacy
                </Badge>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.18]">
                Understand Your Energy.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-forest-800 to-emerald-700">
                  Save More.
                </span>{' '}
                Live Greener.
              </h1>

              {/* Supporting Copy */}
              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                Turn electricity bills into clear insights, discover practical ways to save, evaluate rooftop solar, and connect with qualified local energy professionals.
              </p>

              {/* Primary & Secondary CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link to="/bills">
                  <Button
                    size="lg"
                    variant="primary"
                    className="w-full sm:w-auto shadow-sm hover:shadow-glow font-bold"
                    icon={<FileSpreadsheet className="w-4 h-4" />}
                  >
                    Analyze My Electricity Bill
                  </Button>
                </Link>
                <Link to="/savings">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto bg-white/90 border-slate-300 font-semibold text-slate-800 hover:text-emerald-800"
                    icon={<Lightbulb className="w-4 h-4 text-emerald-600" />}
                  >
                    Explore Energy Savings
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Client-side in-browser OCR
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  Works fully offline
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Zero remote bill uploads
                </span>
              </div>
            </div>

            {/* Right Column: Interactive Product Preview Card */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Visual Glassmorphic Mockup of Energy Intelligence */}
                <Card className="p-6 bg-white border border-slate-200/90 shadow-premium relative z-10 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Energy Intelligence Hub</p>
                        <p className="text-[10px] text-slate-400">Household Demonstration</p>
                      </div>
                    </div>
                    <Badge variant="demo" size="sm">
                      Illustrative Preview
                    </Badge>
                  </div>

                  {/* Mock KPI Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Monthly Usage</span>
                      <p className="text-xl font-black text-slate-900 mt-0.5">320 kWh</p>
                      <span className="text-[10px] text-emerald-700 font-medium">Slab 2 (Telescopic)</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Estimated Bill</span>
                      <p className="text-xl font-black text-slate-900 mt-0.5">₹2,400</p>
                      <span className="text-[10px] text-slate-500 font-medium">₹7.50 / unit avg</span>
                    </div>
                  </div>

                  {/* Mock Actionable Recommendation */}
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Top Savings Recommendation
                      </span>
                      <span className="text-xs font-black text-emerald-800">Save ₹350 / mo</span>
                    </div>
                    <p className="text-[11px] text-emerald-950 leading-relaxed">
                      Adjust AC thermostat from 20°C to 24°C to avoid entering the penalty surcharge bracket.
                    </p>
                  </div>

                  {/* Mock Solar Feasibility Strip */}
                  <div className="bg-forest-950 text-white p-3.5 rounded-xl border border-forest-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-emerald-300">PM Surya Ghar Ready</p>
                      <p className="text-xs font-bold text-white mt-0.5">3 kW Rooftop Solar Sized</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-emerald-300 font-medium">Direct Govt Subsidy</p>
                      <p className="text-xs font-black text-amber-300">Up to ₹78,000</p>
                    </div>
                  </div>

                  {/* Card Action Link */}
                  <Link
                    to="/dashboard"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                  >
                    <span>Open Live Platform Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </Link>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Discovery: 6 Core Pillars */}
      <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="emerald" size="sm">
            Core Platform Capabilities
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Comprehensive Energy Intelligence for Every Home
          </h2>
          <p className="text-sm text-slate-600">
            From decoding confusing electricity tariffs to connecting with certified Surya Mitra professionals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <Card hoverEffect className="p-6 space-y-4 border-slate-200/80">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Electricity Bill Intelligence</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Decode complex telescopic tariffs, fixed demand charges, and fuel surcharges using 100% private in-browser OCR.
            </p>
            <Link to="/bills" className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-800 gap-1 pt-1">
              <span>Scan &amp; analyze bill</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          {/* Feature 2 */}
          <Card hoverEffect className="p-6 space-y-4 border-slate-200/80">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Personalized Energy Savings</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Configure your household appliances to uncover high-consumption loads, zero-cost behavioral habits, and payback timelines.
            </p>
            <Link to="/savings" className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-800 gap-1 pt-1">
              <span>Build savings plan</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          {/* Feature 3 */}
          <Card hoverEffect className="p-6 space-y-4 border-slate-200/80">
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/80 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Solar Feasibility Assistant</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Honest 3-way decision engine comparing saving without solar vs rooftop PV, factoring in roof ownership, shadow, and capital costs.
            </p>
            <Link to="/solar" className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-800 gap-1 pt-1">
              <span>Evaluate rooftop solar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          {/* Feature 4 */}
          <Card hoverEffect className="p-6 space-y-4 border-slate-200/80">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Government Scheme Guidance</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Step-by-step documentation requirements, eligibility checklists, and official DISCOM application links for PM Surya Ghar Yojana.
            </p>
            <Link to="/schemes" className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-800 gap-1 pt-1">
              <span>Check scheme benefits</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          {/* Feature 5 */}
          <Card hoverEffect className="p-6 space-y-4 border-slate-200/80">
            <div className="w-11 h-11 rounded-xl bg-forest-50 text-forest-800 border border-forest-200/80 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Verified Local Workforce</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Connect with Surya Mitra technicians and licensed wiremen in your pincode with strict safety checks and transparent service tracking.
            </p>
            <Link to="/workforce" className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-800 gap-1 pt-1">
              <span>Find local technicians</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          {/* Feature 6 */}
          <Card hoverEffect className="p-6 space-y-4 border-slate-200/80">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Measurable Impact Tracker</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Evidence-verified tracking separating actual household kWh drops and documented worker earnings from estimates.
            </p>
            <Link to="/impact" className="inline-flex items-center text-xs font-bold text-emerald-700 hover:text-emerald-800 gap-1 pt-1">
              <span>View community impact</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </div>
      </section>

      {/* How It Works: 3-Step Journey */}
      <section className="py-14 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <Badge variant="slate" size="sm">
              Simple Journey
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How URJA SAATHI Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Three straightforward steps from confusing utility bill to verified household savings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 text-left space-y-3 relative">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Understand Your Bill</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Upload or photograph your electricity bill. Our private client-side scanner decodes your consumption slabs, fixed charges, and seasonal baselines.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 text-left space-y-3 relative">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Discover Best Savings Options</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Review tailored zero-cost behavioral tips, compare rooftop solar scenarios, and check official government subsidy eligibility for your specific sanctioned load.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 text-left space-y-3 relative">
              <div className="w-8 h-8 rounded-lg bg-forest-900 text-white font-extrabold text-sm flex items-center justify-center">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Take Action &amp; Track Results</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Connect with vetted community technicians for repairs or solar installation, and upload subsequent bills to verify true monetary savings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Savings Estimator (Clearly Labeled as Simulated) */}
      <section className="py-14 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-subtle">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="amber" size="sm">
                    Interactive Simulator
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-medium">Demonstration tool</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Simulate Potential Household Savings
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Adjust your monthly consumption to see estimated tier charges and projected rooftop solar offsets.
                </p>

                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex justify-between items-center text-xs sm:text-sm font-semibold text-slate-800">
                    <span>Monthly Consumption</span>
                    <span className="text-emerald-700 font-black text-base">{sliderUnits} kWh</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="800"
                    step="20"
                    value={sliderUnits}
                    onChange={(e) => setSliderUnits(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    aria-label="Simulate monthly electricity consumption"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-medium">
                    <span>100 Units (Low)</span>
                    <span>450 Units (Average)</span>
                    <span>800 Units (High)</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  * Simulated estimation based on standard retail slabs (₹7.50/kWh avg). Actual savings depend on state DISCOM tariffs, sanctioned load, and irradiance.
                </p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-5 border-slate-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Estimated Current Bill
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                    {formatCurrency(estimatedMonthlyBill)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly expense without solar
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                    <span>Annual Expenditure:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(estimatedMonthlyBill * 12)}
                    </span>
                  </div>
                </Card>

                <Card variant="forest" className="p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    Projected with Solar PV
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-2">
                    {formatCurrency(netMonthlyCost)}
                    <span className="text-xs font-normal text-emerald-200 ml-1">/ mo</span>
                  </p>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Sized: {potentialSolarSystemKw} kW Solar Array
                  </p>
                  <div className="mt-4 pt-3 border-t border-forest-800 text-xs flex items-center justify-between text-emerald-100">
                    <span className="flex items-center gap-1 font-semibold text-amber-300">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Annual Savings:
                    </span>
                    <span className="font-black text-white text-sm">
                      {formatCurrency(annualSavings)}
                    </span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Privacy Section */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 shadow-premium relative overflow-hidden">
          <div className="max-w-2xl space-y-4 relative z-10 text-left">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Local-First Engineering
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
              Designed for reliability in rural &amp; peri-urban environments.
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              All calculation engines, bill review forms, appliance inventories, and contractor directories operate locally on your device via IndexedDB. Your bill photos never leave your device without explicit consent.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs bg-forest-800/80 px-3 py-1.5 rounded-lg border border-forest-700 text-emerald-100">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                Regional Voice Prompts
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs bg-forest-800/80 px-3 py-1.5 rounded-lg border border-forest-700 text-emerald-100">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                No Cloud OCR Exfiltration
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs bg-forest-800/80 px-3 py-1.5 rounded-lg border border-forest-700 text-emerald-100">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                User-Controlled Erasure
              </span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
