import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { MOCK_WORKERS, MOCK_QUOTATIONS } from '../data/mockEnergyData';
import { formatCurrency } from '../utils/formatters';
import { useNotification } from '../context/NotificationContext';
import { EnergyWorker, InstallerQuotation } from '../types';
import {
  Award,
  Star,
  MapPin,
  Phone,
  CheckCircle2,
  Calendar,
  Zap,
} from 'lucide-react';

export const CommunityWorkforcePage: React.FC = () => {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'workers' | 'installers'>('workers');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWorker, setSelectedWorker] = useState<EnergyWorker | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<InstallerQuotation | null>(null);

  const [bookingName, setBookingName] = useState('');
  const [bookingPhone, setBookingPhone] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  const filteredWorkers = MOCK_WORKERS.filter((worker) => {
    if (selectedCategory === 'all') return true;
    return worker.category === selectedCategory;
  });

  const handleBookWorker = (e: React.FormEvent) => {
    e.preventDefault();
    showNotification(
      'success',
      'Work Request Dispatched',
      `Booking request sent to ${selectedWorker?.name}. Saved to offline dispatch queue.`
    );
    setSelectedWorker(null);
    setBookingName('');
    setBookingPhone('');
    setBookingDate('');
    setBookingNotes('');
  };

  const handleAcceptQuote = (quote: InstallerQuotation) => {
    showNotification(
      'success',
      'Quotation Selected',
      `Quotation from ${quote.installerName} shortlisted. Project proposal saved locally.`
    );
    setSelectedQuote(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Community Workforce & Solar Installers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            "Har Haath Kaam" — Connecting homes with certified Surya Mitra technicians and transparent solar quotations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200/80">
          <button
            onClick={() => setActiveTab('workers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'workers'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Local Technicians ({MOCK_WORKERS.length})
          </button>
          <button
            onClick={() => setActiveTab('installers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'installers'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Solar Quotations ({MOCK_QUOTATIONS.length})
          </button>
        </div>
      </div>

      {activeTab === 'workers' ? (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-slate-500 mr-2">Filter Skill:</span>
            {[
              { id: 'all', label: 'All Technicians' },
              { id: 'solar_technician', label: 'Surya Mitra / Solar' },
              { id: 'electrician', label: 'Licensed Electricians' },
              { id: 'energy_auditor', label: 'Energy Auditors' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Technicians Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkers.map((worker) => (
              <Card key={worker.id} hoverEffect className="flex flex-col justify-between p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{worker.name}</h3>
                      <p className="text-xs text-emerald-700 font-semibold capitalize flex items-center gap-1 mt-0.5">
                        <Award className="w-3.5 h-3.5" />
                        {worker.category.replace('_', ' ')}
                      </p>
                    </div>
                    {worker.isAvailableToday ? (
                      <Badge variant="emerald" size="sm">
                        Available Today
                      </Badge>
                    ) : (
                      <Badge variant="slate" size="sm">
                        Available Tomorrow
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{worker.locality}</span>
                  </div>

                  {/* Rating & Experience */}
                  <div className="flex items-center gap-4 text-xs pt-1">
                    <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      {worker.rating} ({worker.reviewCount})
                    </span>
                    <span className="text-slate-600">
                      <strong>{worker.experienceYears}</strong> yrs exp.
                    </span>
                    <span className="text-slate-600">
                      <strong>{worker.completedJobs}</strong> jobs done
                    </span>
                  </div>

                  {/* Certifications */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Credentials
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {worker.certifications.map((cert, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1">
                    {worker.skills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Standard Rate</span>
                    <p className="font-bold text-slate-900 text-sm">
                      ₹{worker.hourlyRateInr} <span className="text-xs text-slate-500 font-normal">/ hr</span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setSelectedWorker(worker)}
                    icon={<Phone className="w-3.5 h-3.5" />}
                  >
                    Hire Worker
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Solar Installers Quotation Comparison */
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Rooftop Solar Quotations & Bids</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standardized 3 kW residential grid-tied proposals with PM Surya Ghar subsidy coordination
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/quotations"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Advanced Quotation Comparison →
                </Link>
                <Badge variant="emerald" size="sm">
                  Empanelled Vendors
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {MOCK_QUOTATIONS.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-premium transition-all flex flex-col justify-between space-y-4 bg-white"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-base">{quote.installerName}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold mt-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            <span>{quote.rating}</span>
                            <span className="text-slate-400">({quote.completedProjects} installs)</span>
                          </div>
                        </div>
                        {quote.verifiedPartner && (
                          <Badge variant="emerald" size="sm" icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}>
                            Empanelled
                          </Badge>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">System Capacity:</span>
                          <span className="font-bold text-slate-800">{quote.systemSizeKw} kW</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Panel Brand:</span>
                          <span className="font-semibold text-slate-700">{quote.panelBrand}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Inverter:</span>
                          <span className="font-semibold text-slate-700">{quote.inverterBrand}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Warranty:</span>
                          <span className="font-semibold text-emerald-700">{quote.warrantyYears} Years</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs text-slate-400">Total Price (Before Subsidy)</span>
                        <p className="text-2xl font-black text-slate-900">
                          {formatCurrency(quote.totalQuotationAmount)}
                        </p>
                        <p className="text-xs text-emerald-700 font-semibold">
                          Net after ₹78,000 subsidy: {formatCurrency(quote.totalQuotationAmount - 78000)}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => setSelectedQuote(quote)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      View Full Quotation
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Booking Modal */}
      {selectedWorker && (
        <Modal
          isOpen={!!selectedWorker}
          onClose={() => setSelectedWorker(null)}
          title={`Hire ${selectedWorker.name}`}
          description={`Rate: ₹${selectedWorker.hourlyRateInr}/hr • ${selectedWorker.locality}`}
          maxWidth="md"
        >
          <form onSubmit={handleBookWorker} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Your Full Name</label>
              <input
                type="text"
                required
                value={bookingName}
                onChange={(e) => setBookingName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={bookingPhone}
                onChange={(e) => setBookingPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Preferred Date</label>
              <input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Issue / Work Details</label>
              <textarea
                rows={3}
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="e.g. Need earthing check and solar inverter wiring review"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedWorker(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" icon={<Calendar className="w-4 h-4" />}>
                Confirm Request
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quotation Detail Modal */}
      {selectedQuote && (
        <Modal
          isOpen={!!selectedQuote}
          onClose={() => setSelectedQuote(null)}
          title={selectedQuote.installerName}
          description="Detailed Proposal & Technical Specifications"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-slate-400">System Sizing:</span>
                <p className="font-bold text-slate-800 text-sm">{selectedQuote.systemSizeKw} kW Grid-tied</p>
              </div>
              <div>
                <span className="text-slate-400">Total Price:</span>
                <p className="font-bold text-slate-800 text-sm">{formatCurrency(selectedQuote.totalQuotationAmount)}</p>
              </div>
              <div>
                <span className="text-slate-400">Solar Modules:</span>
                <p className="font-medium text-slate-700">{selectedQuote.panelBrand}</p>
              </div>
              <div>
                <span className="text-slate-400">Grid Inverter:</span>
                <p className="font-medium text-slate-700">{selectedQuote.inverterBrand}</p>
              </div>
              <div>
                <span className="text-slate-400">Installation Lead Time:</span>
                <p className="font-medium text-slate-700">{selectedQuote.estimatedInstallationDays} business days</p>
              </div>
              <div>
                <span className="text-slate-400">Performance Warranty:</span>
                <p className="font-bold text-emerald-700">{selectedQuote.warrantyYears} Years Comprehensive</p>
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs space-y-1">
              <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-600" />
                PM Surya Ghar Assistance Included
              </p>
              <p className="text-emerald-900 leading-relaxed">
                This installer will manage DISCOM net-meter paperwork, site feasibility documentation, and national portal subsidy claims.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedQuote(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAcceptQuote(selectedQuote)}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Shortlist & Contact Installer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
