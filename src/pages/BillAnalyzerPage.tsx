import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { SlabBreakdownChart } from '../components/charts/SlabBreakdownChart';
import { calculateSlabBreakdown } from '../utils/energyCalculations';
import { formatCurrency, formatKwh, formatDate } from '../utils/formatters';
import { storageService } from '../services/storageService';
import { runOcrRecognition } from '../services/ocrService';
import { parseElectricityBill } from '../services/billParser';
import { useNotification } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';
import { ElectricityBill, ParsedBillData, OcrProgress } from '../types';
import { BillUploadZone } from '../components/bill-analyzer/BillUploadZone';
import { BillImagePreview } from '../components/bill-analyzer/BillImagePreview';
import { BillOcrProgress } from '../components/bill-analyzer/BillOcrProgress';
import { BillReviewForm } from '../components/bill-analyzer/BillReviewForm';
import {
  FileText,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  ScanLine,
  Sliders,
  History,
  Trash2,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

type AnalyzerTab = 'ocr_scan' | 'manual_calc' | 'history';
type OcrStep = 'upload' | 'preview' | 'processing' | 'review' | 'success';

export const BillAnalyzerPage: React.FC = () => {
  const { showNotification } = useNotification();
  const { refreshCounters } = useApp();

  const [activeTab, setActiveTab] = useState<AnalyzerTab>('ocr_scan');
  const [ocrStep, setOcrStep] = useState<OcrStep>('upload');

  // OCR Workflow State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [billPreviewUrl, setBillPreviewUrl] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<OcrProgress>({
    status: 'Ready',
    progress: 0,
  });
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [parsedBillData, setParsedBillData] = useState<ParsedBillData | null>(null);
  const [savedBillResult, setSavedBillResult] = useState<ElectricityBill | null>(null);

  // Manual Calculator State
  const [calcUnits, setCalcUnits] = useState<number>(340);
  const [calcMonth, setCalcMonth] = useState<string>('November 2024');
  const [calcConsumerNo, setCalcConsumerNo] = useState<string>('MP-04-9843210');
  const [isSavingManual, setIsSavingManual] = useState<boolean>(false);

  // Stored Bills History
  const [savedBills, setSavedBills] = useState<ElectricityBill[]>([]);

  const loadSavedBills = async () => {
    try {
      const list = await storageService.getSavedBills();
      setSavedBills(list);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    loadSavedBills();
  }, []);

  // 1. File Selected in Upload Zone
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setOcrStep('preview');
  };

  // 2. User Confirmed Inspection -> Start Tesseract.js Analysis
  const handleConfirmStartOcr = async (canvas: HTMLCanvasElement, dataUrl: string) => {
    setBillPreviewUrl(dataUrl);
    setOcrStep('processing');
    setOcrError(null);
    setOcrProgress({ status: 'Starting local Web Worker...', progress: 0.1 });

    try {
      const result = await runOcrRecognition(canvas, (progress) => {
        setOcrProgress(progress);
      });

      // Parse fields using our specialized Indian Discom heuristics
      const parsed = parseElectricityBill(result.text, result.confidence);
      setParsedBillData(parsed);
      setOcrStep('review');
    } catch (err: unknown) {
      console.error('Tesseract OCR error:', err);
      const message = err instanceof Error ? err.message : 'Character recognition could not process the image.';
      setOcrError(message);
    }
  };

  // 3. User Confirmed & Edited Fields in Review Form -> Save to IndexedDB
  const handleSaveConfirmedBill = async (bill: ElectricityBill) => {
    try {
      const saveRes = await storageService.saveConfirmedBill(bill, true);
      if (saveRes.success) {
        setSavedBillResult(bill);
        setOcrStep('success');
        await refreshCounters();
        await loadSavedBills();
        showNotification(
          'success',
          'Bill Saved Successfully',
          `Bill for ${bill.billMonth} (${bill.unitsConsumed} kWh) stored in offline IndexedDB.`
        );
      }
    } catch (err) {
      console.error('Error saving bill:', err);
      showNotification('error', 'Storage Error', 'Could not write bill to local IndexedDB.');
    }
  };

  // Delete stored bill from IndexedDB
  const handleDeleteBill = async (id: string) => {
    if (window.confirm('Delete this saved bill record?')) {
      await storageService.deleteBill(id);
      await loadSavedBills();
      await refreshCounters();
      showNotification('info', 'Record Deleted', 'Bill removed from local database.');
    }
  };

  // Reset OCR flow
  const handleResetOcr = () => {
    setSelectedFile(null);
    setBillPreviewUrl('');
    setParsedBillData(null);
    setSavedBillResult(null);
    setOcrStep('upload');
  };

  // Manual Calculator Save
  const handleManualSave = async () => {
    setIsSavingManual(true);
    try {
      const slab = calculateSlabBreakdown(calcUnits);
      const manualBill: ElectricityBill = {
        id: `bill_${Date.now()}`,
        billMonth: calcMonth,
        consumerNumber: calcConsumerNo,
        unitsConsumed: calcUnits,
        totalAmount: slab.totalBill,
        tariffRatePerUnit: Number((slab.totalBill / calcUnits).toFixed(2)),
        fixedCharges: slab.fixedCharges,
        surcharges: slab.electricityDuty,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        billDate: new Date().toISOString().split('T')[0],
        isPeakSeason: false,
        source: 'manual',
        slabBreakdown: slab.breakdown,
        createdAt: new Date().toISOString(),
      };

      await storageService.saveConfirmedBill(manualBill, true);
      await refreshCounters();
      await loadSavedBills();
      showNotification('success', 'Bill Saved', `Added ${calcMonth} bill to offline IndexedDB.`);
    } catch {
      showNotification('error', 'Failed', 'Could not save manual entry.');
    } finally {
      setIsSavingManual(false);
    }
  };

  const manualBreakdown = calculateSlabBreakdown(calcUnits);
  const highestManualSlab = manualBreakdown.breakdown[manualBreakdown.breakdown.length - 1];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Electricity Bill Analyzer
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Offline client-side OCR bill scanner, telescopic tariff decoder, and bill archive.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1 rounded-2xl self-start md:self-auto border border-slate-200/80">
          <button
            onClick={() => setActiveTab('ocr_scan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ocr_scan'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ScanLine className="w-4 h-4 text-emerald-600" />
            <span>OCR Bill Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('manual_calc')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'manual_calc'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Slab Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-emerald-600" />
            <span>Stored Bills ({savedBills.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OCR BILL SCANNER WIZARD */}
      {activeTab === 'ocr_scan' && (
        <div className="space-y-6">
          {/* Step 1: Upload Zone */}
          {ocrStep === 'upload' && (
            <BillUploadZone onFileSelected={handleFileSelected} />
          )}

          {/* Step 2: Image Preview & Confirmation */}
          {ocrStep === 'preview' && selectedFile && (
            <BillImagePreview
              file={selectedFile}
              onConfirmAnalysis={handleConfirmStartOcr}
              onResetFile={handleResetOcr}
            />
          )}

          {/* Step 3: Tesseract.js Processing State */}
          {ocrStep === 'processing' && (
            <BillOcrProgress
              progress={ocrProgress}
              errorMessage={ocrError}
              onRetry={() => {
                if (selectedFile) setOcrStep('preview');
              }}
              onCancel={handleResetOcr}
            />
          )}

          {/* Step 4: Verification & Manual Correction Form */}
          {ocrStep === 'review' && parsedBillData && (
            <BillReviewForm
              parsedData={parsedBillData}
              billImagePreviewUrl={billPreviewUrl}
              onConfirmSave={handleSaveConfirmedBill}
              onCancel={handleResetOcr}
            />
          )}

          {/* Step 5: Success & Telescopic Breakdown View */}
          {ocrStep === 'success' && savedBillResult && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 text-center max-w-xl mx-auto space-y-4 shadow-subtle">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-premium">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-emerald-950">
                    Bill Verified & Saved!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    Saved to local IndexedDB. Your energy consumption profile has been updated.
                  </p>
                </div>

                <div className="p-4 bg-white/80 rounded-2xl border border-emerald-100 text-xs text-left grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">Bill Period:</span>
                    <p className="font-bold text-slate-800">{savedBillResult.billMonth}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Amount:</span>
                    <p className="font-bold text-emerald-700">{formatCurrency(savedBillResult.totalAmount)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Consumption:</span>
                    <p className="font-bold text-slate-800">{formatKwh(savedBillResult.unitsConsumed)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Consumer No:</span>
                    <p className="font-bold text-slate-800">{savedBillResult.consumerNumber}</p>
                  </div>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <Button variant="ghost" size="sm" onClick={handleResetOcr}>
                    Scan Another Bill
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('history')}>
                    View Stored Bills Archive
                  </Button>
                </div>
              </div>

              {/* Telescopic Slab Breakdown of the Saved Bill */}
              {savedBillResult.slabBreakdown && (
                <Card>
                  <CardHeader>
                    <CardTitle>Telescopic Slab Tariff Decomposition</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      How your {formatKwh(savedBillResult.unitsConsumed)} were billed across progressive DISCOM slabs
                    </p>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    <div className="lg:col-span-5">
                      <SlabBreakdownChart slabs={savedBillResult.slabBreakdown} />
                    </div>
                    <div className="lg:col-span-7 border border-slate-100 rounded-2xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 font-semibold text-slate-600">
                          <tr>
                            <th className="py-2.5 px-3">Tariff Slab</th>
                            <th className="py-2.5 px-3 text-right">Units</th>
                            <th className="py-2.5 px-3 text-right">Rate</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {savedBillResult.slabBreakdown.map((s, i) => (
                            <tr key={i}>
                              <td className="py-2.5 px-3 font-medium text-slate-800">{s.slabName}</td>
                              <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">{formatKwh(s.units)}</td>
                              <td className="py-2.5 px-3 text-right text-slate-500">₹{s.rate}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(s.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANUAL SLAB CALCULATOR */}
      {activeTab === 'manual_calc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Manual Tariff Simulator
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Monthly Consumption (kWh)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="3000"
                      value={calcUnits}
                      onChange={(e) => setCalcUnits(Math.max(1, Number(e.target.value)))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Units
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="800"
                    step="10"
                    value={calcUnits}
                    onChange={(e) => setCalcUnits(Number(e.target.value))}
                    className="w-full mt-2 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bill Month</label>
                  <input
                    type="text"
                    value={calcMonth}
                    onChange={(e) => setCalcMonth(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Consumer No</label>
                  <input
                    type="text"
                    value={calcConsumerNo}
                    onChange={(e) => setCalcConsumerNo(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <Button
                  onClick={handleManualSave}
                  isLoading={isSavingManual}
                  className="w-full"
                  icon={<CheckCircle className="w-4 h-4" />}
                >
                  Save Manual Entry to Database
                </Button>
              </div>
            </Card>

            {highestManualSlab && highestManualSlab.rate >= 7.9 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold">Higher Tariff Tier Triggered</p>
                  <p className="text-amber-900 leading-relaxed">
                    You have {highestManualSlab.units} units in {highestManualSlab.slabName} at ₹{highestManualSlab.rate}/unit.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Telescopic Slab Calculation</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">DISCOM slabs applied progressively</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Calculated Bill</p>
                  <p className="text-xl font-black text-emerald-800">
                    {formatCurrency(manualBreakdown.totalBill)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <SlabBreakdownChart slabs={manualBreakdown.breakdown} />
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600">
                    Indian DISCOMs penalize higher consumption brackets heavily. Staying under 300 units avoids the peak tier entirely.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: STORED BILLS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Saved Electricity Bills Archive</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stored securely inside your local browser's IndexedDB database
                </p>
              </div>
              <Badge variant="emerald" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                Local Storage Only
              </Badge>
            </CardHeader>
            <CardContent>
              {savedBills.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No electricity bills saved yet.</p>
                  <p className="text-xs text-slate-500">
                    Scan your first bill using OCR or add a manual entry to start tracking trends.
                  </p>
                  <Button size="sm" variant="primary" onClick={() => setActiveTab('ocr_scan')}>
                    Scan Bill with OCR
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Bill Month / Period</th>
                        <th className="py-3.5 px-4 font-semibold">Consumer</th>
                        <th className="py-3.5 px-4 font-semibold">Consumption</th>
                        <th className="py-3.5 px-4 font-semibold">Total Amount</th>
                        <th className="py-3.5 px-4 font-semibold">Source</th>
                        <th className="py-3.5 px-4 font-semibold">Due Date</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {savedBills.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{b.billMonth}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            <p className="font-semibold text-slate-800">{b.consumerName || 'Household'}</p>
                            <p className="text-slate-400">{b.consumerNumber}</p>
                          </td>
                          <td className="py-3 px-4 font-bold text-emerald-800">
                            {formatKwh(b.unitsConsumed)}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {formatCurrency(b.totalAmount)}
                          </td>
                          <td className="py-3 px-4">
                            {b.source === 'ocr_scan' ? (
                              <Badge variant="emerald" size="sm">
                                OCR Scan {b.ocrConfidence ? `(${b.ocrConfidence}%)` : ''}
                              </Badge>
                            ) : (
                              <Badge variant="slate" size="sm">
                                {b.source === 'manual' ? 'Manual' : 'Sample'}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {formatDate(b.dueDate)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteBill(b.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
