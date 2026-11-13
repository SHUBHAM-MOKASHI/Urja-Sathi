import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { DetailedQuotation, MountingStructureType, InverterType } from '../../types';
import { SAMPLE_QUOTATIONS } from '../../services/quotationComparisonService';
import { AlertCircle, Sparkles } from 'lucide-react';

interface QuotationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: DetailedQuotation) => void;
  initialQuotation?: DetailedQuotation | null;
}

export const QuotationFormModal: React.FC<QuotationFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialQuotation,
}) => {
  const [formData, setFormData] = useState<Partial<DetailedQuotation>>({
    installerName: '',
    installerContact: '',
    installerCity: '',
    isEmpanelledWithDiscom: true,
    totalPriceInr: 180000,
    systemCapacityKw: 3.0,
    panelManufacturer: '',
    panelModel: '',
    panelCellType: 'Mono PERC',
    panelQuantity: 6,
    inverterBrand: '',
    inverterCapacityKw: 3.0,
    inverterType: 'string_inverter',
    inverterEfficiencyPercent: 97.5,
    panelProductWarrantyYears: 10,
    panelPerformanceWarrantyYears: 25,
    inverterWarrantyYears: 5,
    workmanshipWarrantyYears: 2,
    installationChargesIncluded: true,
    mountingStructureType: 'hot_dip_galvanized',
    discomNetMeteringLiaisoningIncluded: true,
    freeMaintenanceYears: 2,
    annualMaintenanceCostAfterWarrantyInr: 1500,
    cleaningVisitsPerYear: 4,
    estimatedTimelineDays: 14,
    hasLocalServiceCenter: true,
    guaranteedResponseTimeHours: 24,
    hasRemoteMonitoringApp: true,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialQuotation) {
      setFormData(initialQuotation);
    } else {
      setFormData({
        installerName: '',
        installerContact: '',
        installerCity: '',
        isEmpanelledWithDiscom: true,
        totalPriceInr: 180000,
        systemCapacityKw: 3.0,
        panelManufacturer: '',
        panelModel: '',
        panelCellType: 'Mono PERC',
        panelQuantity: 6,
        inverterBrand: '',
        inverterCapacityKw: 3.0,
        inverterType: 'string_inverter',
        inverterEfficiencyPercent: 97.5,
        panelProductWarrantyYears: 10,
        panelPerformanceWarrantyYears: 25,
        inverterWarrantyYears: 5,
        workmanshipWarrantyYears: 2,
        installationChargesIncluded: true,
        mountingStructureType: 'hot_dip_galvanized',
        discomNetMeteringLiaisoningIncluded: true,
        freeMaintenanceYears: 2,
        annualMaintenanceCostAfterWarrantyInr: 1500,
        cleaningVisitsPerYear: 4,
        estimatedTimelineDays: 14,
        hasLocalServiceCenter: true,
        guaranteedResponseTimeHours: 24,
        hasRemoteMonitoringApp: true,
        notes: '',
      });
    }
    setErrors({});
  }, [initialQuotation, isOpen]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.installerName?.trim()) {
      errs.installerName = 'Installer or company name is required';
    }
    if (!formData.totalPriceInr || formData.totalPriceInr <= 0) {
      errs.totalPriceInr = 'Total price must be greater than 0';
    }
    if (!formData.systemCapacityKw || formData.systemCapacityKw <= 0) {
      errs.systemCapacityKw = 'System capacity must be greater than 0';
    }
    if (!formData.panelManufacturer?.trim()) {
      errs.panelManufacturer = 'Panel manufacturer is required (e.g. Tata, Waaree, Adani)';
    }
    if (!formData.inverterBrand?.trim()) {
      errs.inverterBrand = 'Inverter brand is required (e.g. Growatt, Sungrow, Solis)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const newQuote: DetailedQuotation = {
      id: initialQuotation?.id || `quote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      installerName: formData.installerName!.trim(),
      installerContact: formData.installerContact?.trim() || undefined,
      installerCity: formData.installerCity?.trim() || undefined,
      isEmpanelledWithDiscom: Boolean(formData.isEmpanelledWithDiscom),
      totalPriceInr: Number(formData.totalPriceInr),
      systemCapacityKw: Number(formData.systemCapacityKw),
      panelManufacturer: formData.panelManufacturer!.trim(),
      panelModel: formData.panelModel?.trim() || 'Standard Tier-1 Model',
      panelCellType: formData.panelCellType || 'Mono PERC',
      panelQuantity: Number(formData.panelQuantity) || 6,
      inverterBrand: formData.inverterBrand!.trim(),
      inverterCapacityKw: Number(formData.inverterCapacityKw) || Number(formData.systemCapacityKw),
      inverterType: (formData.inverterType as InverterType) || 'string_inverter',
      inverterEfficiencyPercent: Number(formData.inverterEfficiencyPercent) || 97.5,
      panelProductWarrantyYears: Number(formData.panelProductWarrantyYears) || 10,
      panelPerformanceWarrantyYears: Number(formData.panelPerformanceWarrantyYears) || 25,
      inverterWarrantyYears: Number(formData.inverterWarrantyYears) || 5,
      workmanshipWarrantyYears: Number(formData.workmanshipWarrantyYears) || 2,
      installationChargesIncluded: Boolean(formData.installationChargesIncluded),
      mountingStructureType: (formData.mountingStructureType as MountingStructureType) || 'hot_dip_galvanized',
      discomNetMeteringLiaisoningIncluded: Boolean(formData.discomNetMeteringLiaisoningIncluded),
      freeMaintenanceYears: Number(formData.freeMaintenanceYears) || 0,
      annualMaintenanceCostAfterWarrantyInr: formData.annualMaintenanceCostAfterWarrantyInr !== undefined
        ? Number(formData.annualMaintenanceCostAfterWarrantyInr)
        : undefined,
      cleaningVisitsPerYear: Number(formData.cleaningVisitsPerYear) || 0,
      estimatedTimelineDays: Number(formData.estimatedTimelineDays) || 14,
      hasLocalServiceCenter: Boolean(formData.hasLocalServiceCenter),
      guaranteedResponseTimeHours: Number(formData.guaranteedResponseTimeHours) || 0,
      hasRemoteMonitoringApp: Boolean(formData.hasRemoteMonitoringApp),
      notes: formData.notes?.trim() || undefined,
      createdAt: initialQuotation?.createdAt || new Date().toISOString(),
    };

    onSave(newQuote);
    onClose();
  };

  const handleLoadSample = (sampleIndex: number) => {
    const sample = SAMPLE_QUOTATIONS[sampleIndex];
    if (sample) {
      setFormData({
        ...sample,
        installerName: `${sample.installerName} (Customized)`,
      });
      setErrors({});
    }
  };

  const pricePerWp = formData.totalPriceInr && formData.systemCapacityKw
    ? (formData.totalPriceInr / (formData.systemCapacityKw * 1000)).toFixed(1)
    : '0';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialQuotation ? 'Edit Installer Quotation' : 'Enter Solar Installer Quotation'}
      description="Enter the itemized proposal from your solar installer for impartial, multi-criteria evaluation."
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sample autofill helper for easy testing */}
        {!initialQuotation && (
          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Want to test fast? Autofill with a real quotation profile:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadSample(0)}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 font-medium transition-colors"
              >
                Tata Turnkey
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample(1)}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 font-medium transition-colors"
              >
                Budget Fabricator
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample(2)}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-md border border-emerald-300 font-medium transition-colors"
              >
                Adani Bifacial
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Vendor & Commercials */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            1. Vendor Details & Pricing
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Installer / Agency Name *
              </label>
              <input
                type="text"
                value={formData.installerName || ''}
                onChange={(e) => setFormData({ ...formData, installerName: e.target.value })}
                placeholder="e.g. SuryaTech Solutions"
                className={`w-full text-sm rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                  errors.installerName ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                }`}
              />
              {errors.installerName && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.installerName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone (Optional)
              </label>
              <input
                type="text"
                value={formData.installerContact || ''}
                onChange={(e) => setFormData({ ...formData, installerContact: e.target.value })}
                placeholder="e.g. +91 98260 12345"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Location
              </label>
              <input
                type="text"
                value={formData.installerCity || ''}
                onChange={(e) => setFormData({ ...formData, installerCity: e.target.value })}
                placeholder="e.g. Indore, MP"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Quoted Price (₹) *
              </label>
              <input
                type="number"
                min="10000"
                step="1000"
                value={formData.totalPriceInr || ''}
                onChange={(e) => setFormData({ ...formData, totalPriceInr: Number(e.target.value) })}
                className={`w-full text-sm rounded-lg border px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                  errors.totalPriceInr ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 bg-white'
                }`}
              />
              {errors.totalPriceInr && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.totalPriceInr}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                System Capacity (kW) *
              </label>
              <input
                type="number"
                min="0.5"
                max="50"
                step="0.1"
                value={formData.systemCapacityKw || ''}
                onChange={(e) => setFormData({ ...formData, systemCapacityKw: Number(e.target.value) })}
                className={`w-full text-sm rounded-lg border px-3 py-2 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                  errors.systemCapacityKw ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300 bg-white'
                }`}
              />
              {errors.systemCapacityKw && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.systemCapacityKw}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Calculated Price / Watt (₹/Wp)
              </label>
              <div className="flex items-center h-10 px-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-sm font-bold text-emerald-800">
                ₹{pricePerWp} / Wp
                <span className="text-xs font-normal text-slate-500 ml-2">
                  (Benchmark: ~₹58/Wp)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Hardware Specifications */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            2. Hardware & Structural Specifications
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Solar Panel Manufacturer *
              </label>
              <input
                type="text"
                value={formData.panelManufacturer || ''}
                onChange={(e) => setFormData({ ...formData, panelManufacturer: e.target.value })}
                placeholder="e.g. Tata Power Solar, Waaree, Adani"
                className={`w-full text-sm rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                  errors.panelManufacturer ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                }`}
              />
              {errors.panelManufacturer && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.panelManufacturer}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Panel Model / Technology
              </label>
              <input
                type="text"
                value={formData.panelModel || ''}
                onChange={(e) => setFormData({ ...formData, panelModel: e.target.value })}
                placeholder="e.g. 545W Mono PERC Half-Cut"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mounting Structure Type
              </label>
              <select
                value={formData.mountingStructureType || 'hot_dip_galvanized'}
                onChange={(e) =>
                  setFormData({ ...formData, mountingStructureType: e.target.value as MountingStructureType })
                }
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="hot_dip_galvanized">Hot-Dip Galvanized (HDG - Recommended)</option>
                <option value="aluminum">Anodized Aluminum (High Rust Resistance)</option>
                <option value="standard_gi">Standard Pre-GI (Vulnerable to Rust)</option>
                <option value="elevated">Elevated / Super-structure</option>
                <option value="unspecified">Unspecified in Quotation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inverter Brand & Model *
              </label>
              <input
                type="text"
                value={formData.inverterBrand || ''}
                onChange={(e) => setFormData({ ...formData, inverterBrand: e.target.value })}
                placeholder="e.g. Growatt, Sungrow, Solis, Polycab"
                className={`w-full text-sm rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none ${
                  errors.inverterBrand ? 'border-rose-400 bg-rose-50/50' : 'border-slate-300'
                }`}
              />
              {errors.inverterBrand && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.inverterBrand}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inverter Capacity (kW)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.inverterCapacityKw || ''}
                onChange={(e) => setFormData({ ...formData, inverterCapacityKw: Number(e.target.value) })}
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inverter Type
              </label>
              <select
                value={formData.inverterType || 'string_inverter'}
                onChange={(e) =>
                  setFormData({ ...formData, inverterType: e.target.value as InverterType })
                }
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="string_inverter">On-Grid String Inverter</option>
                <option value="micro_inverter">Micro-Inverter (Per Panel)</option>
                <option value="hybrid_inverter">Hybrid Inverter (Battery Ready)</option>
                <option value="unspecified">Unspecified</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Warranties & Service Transparency */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            3. Warranties & After-Sales SLA (Separated for Transparency)
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Panel Product Warranty
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.panelProductWarrantyYears || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, panelProductWarrantyYears: Number(e.target.value) })
                  }
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">Years</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Panel Performance Warranty
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="35"
                  value={formData.panelPerformanceWarrantyYears || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, panelPerformanceWarrantyYears: Number(e.target.value) })
                  }
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">Years</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Inverter Warranty
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={formData.inverterWarrantyYears || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, inverterWarrantyYears: Number(e.target.value) })
                  }
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">Years</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Workmanship Warranty
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.workmanshipWarrantyYears || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, workmanshipWarrantyYears: Number(e.target.value) })
                  }
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">Years</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Free Maintenance (AMC) Included
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.freeMaintenanceYears ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, freeMaintenanceYears: Number(e.target.value) })
                  }
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">Years</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Annual Cleaning Visits / Year
              </label>
              <input
                type="number"
                min="0"
                max="24"
                value={formData.cleaningVisitsPerYear ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, cleaningVisitsPerYear: Number(e.target.value) })
                }
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Breakdown SLA (Hours)
              </label>
              <input
                type="number"
                min="0"
                max="168"
                value={formData.guaranteedResponseTimeHours ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, guaranteedResponseTimeHours: Number(e.target.value) })
                }
                placeholder="0 if unstated"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">Enter 0 if no written SLA provided</span>
            </div>
          </div>
        </div>

        {/* Section 4: Regulatory & Scope Checkboxes */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            4. Scope & Regulatory Checkpoints
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(formData.isEmpanelledWithDiscom)}
                onChange={(e) => setFormData({ ...formData, isEmpanelledWithDiscom: e.target.checked })}
                className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  DISCOM Empanelled Vendor
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Essential for claiming central PM Surya Ghar Muft Bijli Yojana subsidies.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(formData.discomNetMeteringLiaisoningIncluded)}
                onChange={(e) =>
                  setFormData({ ...formData, discomNetMeteringLiaisoningIncluded: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  DISCOM Net-Metering Liaisoning Included
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Vendor handles DISCOM application, CEIG testing, and bi-directional meter setup.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(formData.hasLocalServiceCenter)}
                onChange={(e) => setFormData({ ...formData, hasLocalServiceCenter: e.target.checked })}
                className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Local Service Center in District
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Faster turnaround for emergency inverter trips or system faults.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(formData.hasRemoteMonitoringApp)}
                onChange={(e) => setFormData({ ...formData, hasRemoteMonitoringApp: e.target.checked })}
                className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  WiFi / IoT Remote Monitoring App Included
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allows real-time generation tracking on homeowner smartphone.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Section 5: Timeline & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estimated Timeline (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={formData.estimatedTimelineDays || ''}
              onChange={(e) => setFormData({ ...formData, estimatedTimelineDays: Number(e.target.value) })}
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Additional Quotation Notes / Scope Inclusions
            </label>
            <input
              type="text"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Includes ACDB/DCDB with Type-2 surge protection, earthing pits"
              className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialQuotation ? 'Update Quotation' : 'Save & Compare Quotation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
