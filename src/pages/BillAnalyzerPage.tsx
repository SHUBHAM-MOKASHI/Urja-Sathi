import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Loader } from '../components/common/Loader';
import { Tabs } from '../components/common/Tabs';
import { SlabBreakdownChart } from '../components/charts/SlabBreakdownChart';
import { calculateSlabBreakdown } from '../utils/energyCalculations';
import { formatCurrency, formatKwh, formatDate } from '../utils/formatters';
import { storageService } from '../services/storageService';
import { runOcrRecognition } from '../services/ocrService';
import { parseElectricityBill } from '../services/billParser';
import { useNotification } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';
import { ElectricityBill, ParsedBillData, OcrProgress, UserProfile } from '../types';
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
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

type AnalyzerTab = 'ocr_scan' | 'manual_calc' | 'history';
type OcrStep = 'upload' | 'preview' | 'processing' | 'review' | 'success';
type EntryMode = 'scan' | 'manual';

export const BillAnalyzerPage: React.FC = () => {
  const { showNotification } = useNotification();
  const { refreshCounters, updateUserProfile } = useApp();

  const [activeTab, setActiveTab] = useState<AnalyzerTab>('ocr_scan');
  const [entryMode, setEntryMode] = useState<EntryMode>('scan');
  const [ocrStep, setOcrStep] = useState<OcrStep>('upload');

  const ocrController = useRef<AbortController | null>(null);
  const entryModeRef = useRef<EntryMode>('scan');
  entryModeRef.current = entryMode;

  const [billSource, setBillSource] = useState<ElectricityBill['source']>('ocr_scan');
  const cancelOcr = () => { ocrController.current?.abort(); ocrController.current = null; };
  useEffect(() => () => { ocrController.current?.abort(); }, []);

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
  const [isLoadingBills, setIsLoadingBills] = useState<boolean>(true);

  const loadSavedBills = async () => {
    setIsLoadingBills(true);
    try {
      const list = await storageService.getSavedBills();
      setSavedBills(list);
    } catch {
      // Ignored
    } finally {
      setIsLoadingBills(false);
    }
  };

  useEffect(() => {
    loadSavedBills();
  }, []);

  // 1. File Selected in Upload Zone
  const handleFileSelected = (file: File, source: 'ocr_scan' | 'sample' = 'ocr_scan') => {
    cancelOcr();
    setBillSource(source);
    setSelectedFile(file);
    setOcrStep('preview');
  };

  // 2. User Confirmed Inspection -> Start Tesseract.js Analysis
  const handleConfirmStartOcr = async (canvas: HTMLCanvasElement, dataUrl: string) => {
    cancelOcr();
    const controller = new AbortController();
    ocrController.current = controller;
    setBillPreviewUrl(dataUrl);
    setOcrStep('processing');
    setOcrError(null);
    setOcrProgress({ status: 'Starting local Web Worker...', progress: 0.1 });

    try {
      const result = await runOcrRecognition(canvas, (progress) => {
        if (!controller.signal.aborted && ocrController.current === controller && entryModeRef.current === 'scan') {
          setOcrProgress(progress);
        }
      }, controller.signal);
      if (controller.signal.aborted || ocrController.current !== controller || entryModeRef.current !== 'scan') return;

      // Parse fields using our specialized Indian Discom heuristics
      const parsed = parseElectricityBill(result.text, result.confidence);
      if (controller.signal.aborted || ocrController.current !== controller || entryModeRef.current !== 'scan') return;
      setParsedBillData(parsed);
      setOcrStep('review');
    } catch (err: unknown) {
      if (controller.signal.aborted || ocrController.current !== controller || entryModeRef.current !== 'scan') return;
      console.error('Tesseract OCR error:', err);
      const message = err instanceof Error ? err.message : 'Character recognition could not process the image.';
      setOcrError(message);
    }
  };

  // 3. User Confirmed & Edited Fields in Review Form -> Save to IndexedDB
  const handleSaveConfirmedBill = async (bill: ElectricityBill, syncToProfile?: boolean) => {
    try {
      const saveRes = await storageService.saveConfirmedBill(bill, true);
      if (saveRes.success) {
        if (syncToProfile) {
          const profileUpdate: Partial<UserProfile> = {};
          if (bill.consumerName && bill.consumerName.trim()) {
            profileUpdate.name = bill.consumerName.trim();
          }
          if (Object.keys(profileUpdate).length > 0) {
            await updateUserProfile(profileUpdate);
          }
        }

        setSavedBillResult(bill);
        setOcrStep('success');
        await refreshCounters();
        await loadSavedBills();
        showNotification(
          'success',
          'Bill Saved Successfully',
          `Bill for ${bill.billMonth} (${bill.unitsConsumed} kWh) stored in offline IndexedDB.${syncToProfile ? ' Household profile updated.' : ''}`
        );
      }
    } catch (err) {
      console.error('Error saving bill:', err);
      showNotification('error', 'Storage Error', 'Could not write bill to local IndexedDB.');
      throw err;
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

  // Reset flow to initial screen
  const handleResetOcr = () => {
    cancelOcr();
    setOcrError(null);
    setSelectedFile(null);
    setBillPreviewUrl('');
    setParsedBillData(null);
    setSavedBillResult(null);
    setOcrStep('upload');
    setEntryMode('scan');
  };

  // Switch to Direct Manual Entry Mode immediately (no Tesseract, no file upload)
  const handleSelectManualMode = () => {
    cancelOcr();
    setEntryMode('manual');
    setBillSource('manual');
    setSelectedFile(null);
    setBillPreviewUrl('');
    setOcrError(null);
    const emptyParsed = parseElectricityBill('', 0);
    setParsedBillData(emptyParsed);
    setOcrStep('review');
  };

  // Switch to Scan Bill (Beta) Mode
  const handleSelectScanMode = () => {
    cancelOcr();
    setEntryMode('scan');
    setBillSource('ocr_scan');
    setOcrError(null);
    if (!selectedFile) {
      setParsedBillData(null);
      setBillPreviewUrl('');
      setOcrStep('upload');
    }
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
        source: 'sample',
        chargeStatus: {fixedCharges:'estimated',surcharges:'estimated'},
        slabBreakdown: slab.breakdown,
        createdAt: new Date().toISOString(),
      };

      await storageService.saveConfirmedBill(manualBill, true);
      await refreshCounters();
      await loadSavedBills();
      showNotification('success', 'Bill Saved', `Added ${calcMonth} illustrative sample estimate to offline IndexedDB.`);
    } catch {
      showNotification('error', 'Failed', 'Could not save manual entry.');
    } finally {
      setIsSavingManual(false);
    }
  };

  const manualBreakdown = calculateSlabBreakdown(calcUnits);
  const highestManualSlab = manualBreakdown.breakdown[manualBreakdown.breakdown.length - 1];

  const tabsList = [
    {
      id: 'ocr_scan',
      label: 'OCR Bill Scanner',
      icon: <ScanLine className="w-4 h-4" />,
    },
    {
      id: 'manual_calc',
      label: 'Slab Calculator',
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: 'Stored Bills',
      icon: <History className="w-4 h-4" />,
      badge: savedBills.length > 0 ? savedBills.length : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Electricity Bill Analyzer
            </h1>
            <Badge variant="emerald" size="sm" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
              Zero-Cloud OCR
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Local client-side bill scanner powered by Web Worker OCR, telescopic tariff decomposition, and private offline bill archive.
          </p>
        </div>

        {/* Tab Controls using standard Tabs component */}
        <div className="self-start md:self-auto">
          <Tabs
            tabs={tabsList}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as AnalyzerTab)}
          />
        </div>
      </div>

      {/* TAB 1: OCR BILL SCANNER WIZARD / DIRECT MANUAL ENTRY */}
      {activeTab === 'ocr_scan' && (
        <div className="space-y-6">
          {/* Initial / Active Mode Selector: Scan Bill (Beta) vs Enter Manually */}
          {ocrStep !== 'success' && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-3.5 sm:p-4 shadow-subtle space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Bill Entry Mode
                  </span>
                  <p className="text-xs text-slate-600">
                    Choose how you want to input your electricity bill:
                  </p>
                </div>
                {entryMode === 'scan' ? (
                  <Badge variant="amber" size="sm">
                    OCR Scan Mode (Beta)
                  </Badge>
                ) : (
                  <Badge variant="blue" size="sm">
                    Direct Manual Mode
                  </Badge>
                )}
              </div>

              <div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1"
                role="radiogroup"
                aria-label="Bill Entry Mode Selection"
              >
                {/* Option 1: Scan Bill (Beta) */}
                <button
                  type="button"
                  id="btn-mode-scan"
                  role="radio"
                  aria-checked={entryMode === 'scan'}
                  onClick={handleSelectScanMode}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all text-left group ${
                    entryMode === 'scan'
                      ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                      entryMode === 'scan'
                        ? 'bg-emerald-600 text-white shadow-premium'
                        : 'bg-white text-slate-600 border border-slate-200 group-hover:text-emerald-700'
                    }`}
                  >
                    <ScanLine className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-950">
                        Scan Bill (Beta)
                      </span>
                      <Badge variant="amber" size="sm">
                        Beta
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Upload or photo a paper bill. On-device local OCR extracts data (requires human verification).
                    </p>
                  </div>
                </button>

                {/* Option 2: Enter Manually */}
                <button
                  type="button"
                  id="btn-mode-manual"
                  role="radio"
                  aria-checked={entryMode === 'manual'}
                  onClick={handleSelectManualMode}
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all text-left group ${
                    entryMode === 'manual'
                      ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                      entryMode === 'manual'
                        ? 'bg-emerald-600 text-white shadow-premium'
                        : 'bg-white text-slate-600 border border-slate-200 group-hover:text-emerald-700'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-950">
                        Enter Manually
                      </span>
                      <Badge variant="emerald" size="sm">
                        Direct & Fast
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Directly enter units consumed, bill amount, and date. No camera or OCR waiting required.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Scan Mode Step 1: Upload Zone */}
          {entryMode === 'scan' && ocrStep === 'upload' && (
            <BillUploadZone
              onFileSelected={handleFileSelected}
              onDirectManualEntry={handleSelectManualMode}
            />
          )}

          {/* Scan Mode Step 2: Image Preview & Confirmation */}
          {entryMode === 'scan' && ocrStep === 'preview' && selectedFile && (
            <BillImagePreview
              file={selectedFile}
              onConfirmAnalysis={handleConfirmStartOcr}
              onResetFile={handleResetOcr}
            />
          )}

          {/* Scan Mode Step 3: Tesseract.js Processing State */}
          {entryMode === 'scan' && ocrStep === 'processing' && (
            <BillOcrProgress
              progress={ocrProgress}
              errorMessage={ocrError}
              onRetry={() => {
                cancelOcr();
                if (selectedFile) setOcrStep('preview');
              }}
              onCancel={handleResetOcr}
              onManualEntry={handleSelectManualMode}
            />
          )}

          {/* Form Step: Verification / Direct Manual Entry Form */}
          {ocrStep === 'review' && (parsedBillData || entryMode === 'manual') && (
            <BillReviewForm
              parsedData={parsedBillData || parseElectricityBill('', 0)}
              source={billSource}
              billImagePreviewUrl={entryMode === 'scan' ? billPreviewUrl : undefined}
              onConfirmSave={handleSaveConfirmedBill}
              onCancel={handleResetOcr}
            />
          )}

          {/* Step 5: Success & Telescopic Breakdown View */}
          {ocrStep === 'success' && savedBillResult && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 text-center max-w-2xl mx-auto space-y-5 shadow-subtle">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-premium">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-emerald-950">
                    Reviewed Bill Saved!
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-800 mt-1">
                    Saved to local IndexedDB. Your household energy baseline and appliance recommendations have been updated.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white/90 rounded-2xl border border-emerald-100 text-left">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bill Period</span>
                    <p className="font-bold text-sm text-slate-900 truncate">{savedBillResult.billMonth}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Consumption</span>
                    <p className="font-extrabold text-base text-emerald-700">{formatKwh(savedBillResult.unitsConsumed)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Bill</span>
                    <p className="font-extrabold text-base text-slate-900">{formatCurrency(savedBillResult.totalAmount)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Effective Rate</span>
                    <p className="font-bold text-sm text-slate-700">₹{savedBillResult.tariffRatePerUnit}/kWh</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
                  <Button variant="ghost" size="sm" onClick={handleResetOcr}>
                    Scan Another Bill
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectManualMode}>
                    Enter Another Bill Manually
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('history')}>
                    View Stored Bills ({savedBills.length})
                  </Button>
                  <Link to="/savings">
                    <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                      Explore Appliance Savings
                    </Button>
                  </Link>
                  <Link to="/solar">
                    <Button variant="outline" size="sm" icon={<TrendingUp className="w-4 h-4" />}>
                      Solar Feasibility
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Telescopic Slab Breakdown of the Saved Bill */}
              {savedBillResult.slabBreakdown && (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle>Telescopic Slab Tariff Decomposition</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          How your {formatKwh(savedBillResult.unitsConsumed)} were billed across progressive DISCOM slabs
                        </p>
                      </div>
                      <Badge variant="emerald" size="sm">
                        Total: {formatCurrency(savedBillResult.totalAmount)}
                      </Badge>
                    </div>
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
                            <tr key={i} className="hover:bg-slate-50/50">
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
                Illustrative Tariff Simulator
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
              {isLoadingBills ? (
                <div className="py-12">
                  <Loader size="md" label="Loading stored bills archive..." />
                </div>
              ) : savedBills.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No electricity bills saved yet.</p>
                  <p className="text-xs text-slate-500">
                    Scan your first bill using OCR or enter your bill details directly to start tracking trends.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <Button size="sm" variant="primary" onClick={() => { setActiveTab('ocr_scan'); handleSelectScanMode(); }}>
                      Scan Bill (Beta)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setActiveTab('ocr_scan'); handleSelectManualMode(); }}>
                      Enter Manually
                    </Button>
                  </div>
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
                              <Badge variant={b.source === 'manual' ? 'blue' : 'slate'} size="sm">
                                {b.source === 'manual' ? 'Manual' : 'Sample'}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {b.dueDateStatus === 'unknown' || !b.dueDate ? 'Not provided' : formatDate(b.dueDate)}
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
