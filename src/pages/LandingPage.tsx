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
  Award,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { formatCurrency } from '../utils/formatters';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export const LandingPage: React.FC = () => {
  const [sliderUnits, setSliderUnits] = useState<number>(350);

  // Quick live interactive estimator calculation
  const estimatedMonthlyBill = Math.round(sliderUnits * 7.5);
  const potentialSolarSystemKw = Math.min(5, Math.max(1, Math.ceil(sliderUnits / 120)));
  const monthlySolarGen = potentialSolarSystemKw * 120;
  const netMonthlyCost = Math.max(150, (sliderUnits - monthlySolarGen) * 7.5);
  const annualSavings = Math.round((estimatedMonthlyBill - netMonthlyCost) * 12);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-gradient-to-b from-forest-50/60 via-slate-50 to-slate-50">
        {/* Subtle decorative background gradient circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-emerald-100/50 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2">
              <Badge variant="emerald" size="md" icon={<Zap className="w-3.5 h-3.5 text-emerald-600" />}>
                Har Ghar Bachat, Har Haath Kaam
              </Badge>
              <Badge variant="slate" size="md">
                100% Offline-First PWA
              </Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-forest-950 tracking-tight leading-[1.15]">
              Empowering Every Home to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-forest-800 to-emerald-700">
                Save Energy
              </span>{' '}
              & Adopt Solar.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Understand confusing electricity bills, access PM Surya Ghar subsidies, and connect with certified local Surya Mitra energy technicians — even without an active internet connection.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link to="/dashboard" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto shadow-md" icon={<ArrowRight className="w-4 h-4" />}>
                  Explore Dashboard
                </Button>
              </Link>
              <Link to="/solar" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/80" icon={<Sun className="w-4 h-4 text-amber-500" />}>
                  Calculate Solar Subsidy
                </Button>
              </Link>
            </div>

            {/* Key Trust Highlights */}
            <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left border-t border-slate-200/60 mt-10">
              <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Govt Subsidy</p>
                <p className="text-lg font-bold text-forest-900">Up to ₹78,000</p>
                <p className="text-[11px] text-emerald-700">PM Surya Ghar Yojana</p>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Avg Annual Savings</p>
                <p className="text-lg font-bold text-forest-900">₹14,500+</p>
                <p className="text-[11px] text-emerald-700">Per household</p>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Local Workforce</p>
                <p className="text-lg font-bold text-forest-900">Certified</p>
                <p className="text-[11px] text-emerald-700">Surya Mitra technicians</p>
              </div>
              <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Accessibility</p>
                <p className="text-lg font-bold text-forest-900">Voice Assisted</p>
                <p className="text-[11px] text-emerald-700">Hindi, Marathi, English</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Savings Estimator Preview */}
      <section className="py-12 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <Badge variant="emerald" size="sm">
                Interactive Estimator
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                See what you can save right away.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Adjust your monthly electricity consumption to simulate realistic billing tier costs and projected rooftop solar benefits.
              </p>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-800">
                  <span>Monthly Consumption</span>
                  <span className="text-emerald-700 font-bold text-base">{sliderUnits} kWh</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="800"
                  step="25"
                  value={sliderUnits}
                  onChange={(e) => setSliderUnits(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>100 Units</span>
                  <span>450 Units</span>
                  <span>800 Units</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card variant="default" className="p-6 border-slate-200">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Current Electricity Bill
                </span>
                <p className="text-3xl font-black text-slate-900 mt-2">
                  {formatCurrency(estimatedMonthlyBill)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  At average ₹7.50 / unit slab tariff
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                  <span>Annual Cost:</span>
                  <span className="font-semibold text-slate-800">
                    {formatCurrency(estimatedMonthlyBill * 12)}
                  </span>
                </div>
              </Card>

              <Card variant="forest" className="p-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  Projected with Rooftop Solar
                </span>
                <p className="text-3xl font-black text-white mt-2">
                  {formatCurrency(netMonthlyCost)}
                  <span className="text-xs font-normal text-emerald-300 ml-1">/ month</span>
                </p>
                <p className="text-xs text-emerald-200/80 mt-1">
                  System: {potentialSolarSystemKw} kW Solar Setup
                </p>
                <div className="mt-4 pt-3 border-t border-forest-800 text-xs flex items-center justify-between text-emerald-100">
                  <span className="flex items-center gap-1 font-semibold text-amber-300">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Annual Savings:
                  </span>
                  <span className="font-bold text-white text-sm">
                    {formatCurrency(annualSavings)}
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Core Platform Pillars */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="slate" size="sm">
            Core Pillars
          </Badge>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Designed for Bharat's households & workers
          </h2>
          <p className="text-sm text-slate-600">
            A comprehensive solution tackling high utility bills, lack of awareness, and unverified contractors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <Card hoverEffect className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Electricity Bill Decoder</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Break down complex telescopic tariffs, fixed demand charges, fuel surcharges, and find immediate behavioral tweaks to stay under cheaper slabs.
            </p>
            <Link to="/bills" className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 gap-1 pt-2">
              <span>Analyze your bill</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          {/* Card 2 */}
          <Card hoverEffect className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Sun className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Rooftop Solar & Subsidy ROI</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Calculate exact government subsidy under PM Surya Ghar Muft Bijli Yojana, required roof area, capital outlay, and realistic payback within 3-4 years.
            </p>
            <Link to="/solar" className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 gap-1 pt-2">
              <span>Calculate solar payback</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          {/* Card 3 */}
          <Card hoverEffect className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-800 border border-forest-200 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Community Green Workforce</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Connect with verified Surya Mitra technicians and licensed wiremen in your pincode. Get transparent competitive quotations with no middlemen.
            </p>
            <Link to="/workforce" className="inline-flex items-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 gap-1 pt-2">
              <span>Browse certified technicians</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </div>

        {/* Offline & Voice Special Banner */}
        <div className="mt-12 bg-gradient-to-r from-forest-950 via-forest-900 to-emerald-950 text-white rounded-3xl p-8 sm:p-12 shadow-premium relative overflow-hidden">
          <div className="max-w-2xl space-y-4 relative z-10">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Offline Resilience
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Works seamlessly without internet in rural & low-connectivity zones.
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              All calculations, historical bills, appliance audits, and contractor directory operate locally in IndexedDB cache. Voice queries in regional languages ensure effortless accessibility for all household members.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs bg-forest-800/80 px-3 py-1.5 rounded-lg border border-forest-700">
                <Mic className="w-4 h-4 text-emerald-400" />
                <span>Regional Voice Prompts</span>
              </div>
              <div className="flex items-center gap-2 text-xs bg-forest-800/80 px-3 py-1.5 rounded-lg border border-forest-700">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Data Upload Requirement</span>
              </div>
              <div className="flex items-center gap-2 text-xs bg-forest-800/80 px-3 py-1.5 rounded-lg border border-forest-700">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>DISCOM-Compliant Standards</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
