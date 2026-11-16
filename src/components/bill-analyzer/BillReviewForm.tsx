import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  FileText,
  User,
  Hash,
  Calendar,
  Gauge,
  CreditCard,
  Zap,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Card } from '../common/Card';
import { ParsedBillData, ElectricityBill } from '../../types';
import { validateBillData, checkDuplicateBill } from '../../services/billValidation';
import { dbService } from '../../services/db';

interface BillReviewFormProps {
  parsedData: ParsedBillData;
  billImagePreviewUrl?: string;
  source?: ElectricityBill['source'];
  onConfirmSave: (bill: ElectricityBill, syncToProfile?: boolean) => void | Promise<void>;
  onCancel: () => void;
}

export const BillReviewForm: React.FC<BillReviewFormProps> = ({
  parsedData,
  source = 'ocr_scan',
  billImagePreviewUrl,
  onConfirmSave,
  onCancel,
}) => {
  // Editable form state initialized from OCR extraction
  const [consumerName, setConsumerName] = useState<string>(parsedData.consumerName.value || '');
  const [consumerNumber, setConsumerNumber] = useState<string>(parsedData.consumerNumber.value || '');
  const [totalAmount, setTotalAmount] = useState<number | ''>(
    parsedData.totalAmount.value !== null ? parsedData.totalAmount.value : ''
  );
  const [unitsConsumed, setUnitsConsumed] = useState<number | ''>(
    parsedData.unitsConsumed.value !== null ? parsedData.unitsConsumed.value : ''
  );
  const [billingPeriod, setBillingPeriod] = useState<string>(parsedData.billingPeriod.value || '');
  const [previousReading, setPreviousReading] = useState<number | ''>(
    parsedData.previousReading.value !== null ? parsedData.previousReading.value : ''
  );
  const [currentReading, setCurrentReading] = useState<number | ''>(
    parsedData.currentReading.value !== null ? parsedData.currentReading.value : ''
  );
  const [billDate, setBillDate] = useState<string>(
    parsedData.billDate.value || ''
  );
  const [dueDate, setDueDate] = useState<string>(
    parsedData.dueDate.value || ''
  );

  const [existingBills, setExistingBills] = useState<ElectricityBill[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [allowDuplicateSave, setAllowDuplicateSave] = useState<boolean>(false);
  const [syncToProfile, setSyncToProfile] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ambiguityConfirmed, setAmbiguityConfirmed] = useState(false);
  const validationWarnings = validateBillData({consumerNumber, totalAmount: totalAmount === '' ? null : totalAmount,
    unitsConsumed: unitsConsumed === '' ? null : unitsConsumed, billDate, dueDate,
    previousReading: previousReading === '' ? null : previousReading,
    currentReading: currentReading === '' ? null : currentReading}).warnings;
  const ambiguousFields = Object.entries(parsedData).filter(([, value]) => value && typeof value === 'object' && 'ambiguous' in value && value.ambiguous);
  const [showRawOcr, setShowRawOcr] = useState<boolean>(false);

  // Load existing bills to evaluate duplicates
  useEffect(() => {
    dbService.getAllBills().then((bills) => {
      setExistingBills(bills);
    });
  }, []);

  // Duplicate check whenever consumerNumber or dates change
  useEffect(() => {
    if (existingBills.length > 0) {
      const check = checkDuplicateBill(
        {
          consumerNumber,
          billDate,
          billMonth: billingPeriod || billDate,
          unitsConsumed: typeof unitsConsumed === 'number' ? unitsConsumed : undefined,
          totalAmount: typeof totalAmount === 'number' ? totalAmount : undefined,
        },
        existingBills
      );
      if (check.isDuplicate) {
        setDuplicateWarning(check.reason || 'A bill with similar details already exists.');
      } else {
        setDuplicateWarning(null);
      }
    }
  }, [consumerNumber, billDate, billingPeriod, unitsConsumed, totalAmount, existingBills]);

  const getConfidenceBadge = (confidence: number, hasValue: boolean) => {
    if (!hasValue || confidence === 0) {
      return (
        <Badge variant="rose" size="sm">
          Missing / Needs Input
        </Badge>
      );
    }
    if (confidence >= 80) {
      return (
        <Badge variant="emerald" size="sm">
          {confidence}/100 heuristic
        </Badge>
      );
    }
    return (
      <Badge variant="amber" size="sm">
        {confidence}/100 — verify
      </Badge>
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    if (!billDate || (ambiguousFields.length > 0 && !ambiguityConfirmed) || (duplicateWarning && !allowDuplicateSave)) {
      setValidationErrors(['Enter the actual bill date and explicitly confirm any ambiguous values or duplicate before saving.']);
      return;
    }

    const validation = validateBillData({
      consumerNumber,
      consumerName,
      totalAmount: typeof totalAmount === 'number' ? totalAmount : null,
      unitsConsumed: typeof unitsConsumed === 'number' ? unitsConsumed : null,
      billDate,
      dueDate,
      previousReading: typeof previousReading === 'number' ? previousReading : null,
      currentReading: typeof currentReading === 'number' ? currentReading : null,
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);


    const finalBill: ElectricityBill = {
      id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      billMonth: billingPeriod || `Bill for ${billDate}`,
      consumerNumber: consumerNumber || 'N/A',
      consumerName: consumerName || 'Household Consumer',
      unitsConsumed: Number(unitsConsumed),
      totalAmount: Number(totalAmount),
      tariffRatePerUnit: Number((Number(totalAmount) / (Number(unitsConsumed) || 1)).toFixed(2)),
      fixedCharges: 0,
      surcharges: 0,
      chargeStatus: { fixedCharges: 'unknown', surcharges: 'unknown' },
      dueDateStatus: dueDate ? 'confirmed' : 'unknown',
      reviewedAt: new Date().toISOString(),
      extractionEvidence: parsedData,
      billDate,
      dueDate: dueDate || 'Not provided',
      billingPeriod,
      previousReading: typeof previousReading === 'number' ? previousReading : undefined,
      currentReading: typeof currentReading === 'number' ? currentReading : undefined,
      isPeakSeason: false,
      source,
      ocrConfidence: parsedData.overallConfidence,
      rawOcrText: parsedData.normalizedText,
      isDuplicate: !!duplicateWarning,
      userEdited: Object.entries({consumerName,consumerNumber,totalAmount,unitsConsumed,billingPeriod,previousReading,currentReading,billDate,dueDate})
        .some(([key,value]) => value !== ((parsedData[key as keyof ParsedBillData] as {value: unknown}).value ?? '')),
      createdAt: new Date().toISOString(),
    };

    savingRef.current = true;
    setIsSaving(true);
    try { await onConfirmSave(finalBill, syncToProfile); }
    catch { setValidationErrors(['Could not save this bill. Please retry.']); }
    finally { savingRef.current = false; setIsSaving(false); }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Verify & Confirm Extracted Bill Data
            </h2>
            <Badge variant="emerald" size="sm">
              Extraction score: {parsedData.overallConfidence}/100 (heuristic)
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review every field below. You can correct any values before saving to your offline database.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRawOcr(!showRawOcr)}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 self-start sm:self-auto flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{showRawOcr ? 'Hide Raw OCR Text' : 'View Raw OCR Text'}</span>
        </button>
      </div>

      <div className="p-4 bg-amber-50 rounded-xl text-sm space-y-2">
        <p>Human review is required. Scores are heuristics, not measured accuracy. Source: {source === 'sample' ? 'Demonstration bill' : source === 'manual' ? 'Manual entry' : 'Uploaded bill'}.</p>
        {[...parsedData.warnings, ...validationWarnings].map((warning, i) => <p key={i}>{warning}</p>)}
        {ambiguousFields.map(([name, field]) => <div key={name}>
          <strong>{name}: ambiguous candidates</strong>
          <ul>{(field as ParsedBillData['totalAmount']).candidates?.map((candidate,i) => <li key={i}>{candidate.rawMatch} → {String(candidate.value)}</li>)}</ul>
        </div>)}
        {ambiguousFields.length > 0 && <label><input type="checkbox" checked={ambiguityConfirmed} onChange={e=>setAmbiguityConfirmed(e.target.checked)} /> I checked the competing candidates against the bill and entered the correct values below.</label>}
      </div>
      {/* Raw OCR Text Modal / Drawer */}
      {showRawOcr && (
        <div className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl max-h-56 overflow-auto border border-slate-800 space-y-1">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 font-sans font-bold">
            Raw Normalized Tesseract Output:
          </p>
          <pre className="whitespace-pre-wrap">{parsedData.normalizedText || 'No text extracted'}</pre>
        </div>
      )}

      {/* Duplicate Warning Alert */}
      {duplicateWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950 space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1 flex-1">
              <p className="font-bold">Possible Duplicate Bill Detected</p>
              <p className="text-amber-900 leading-relaxed">{duplicateWarning}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 pl-8">
            <input
              type="checkbox"
              id="allowDup"
              checked={allowDuplicateSave}
              onChange={(e) => setAllowDuplicateSave(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <label htmlFor="allowDup" className="text-xs font-medium text-amber-900 cursor-pointer">
              I understand this may be a duplicate, save anyway.
            </label>
          </div>
        </div>
      )}

      {/* Validation Errors Display */}
      {validationErrors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-950 space-y-1.5">
          <p className="text-xs font-bold flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-4 h-4" /> Please fix the following errors:
          </p>
          <ul className="list-disc list-inside text-xs text-rose-900 space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Parser Heuristic Warnings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Reference */}
        {billImagePreviewUrl && (
          <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-2 sticky top-20">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Source Bill Document</span>
              <span className="text-slate-400">Reference Image</span>
            </div>
            <div className="max-h-[500px] overflow-auto rounded-xl border border-slate-100 bg-slate-900 flex items-center justify-center p-2">
              <img
                src={billImagePreviewUrl}
                alt="Source Bill"
                className="max-h-[480px] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Right Column: Fields Form */}
        <div className={billImagePreviewUrl ? 'lg:col-span-7 space-y-5' : 'lg:col-span-12 space-y-5'}>
          <Card className="p-6 space-y-5">
            {/* Primary Energy Metric Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Total Amount */}
              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                    Total Bill Amount (₹) *
                  </label>
                  {getConfidenceBadge(parsedData.totalAmount.confidence, totalAmount !== '')}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={totalAmount}
                    onChange={(e) =>
                      setTotalAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="e.g. 2580"
                    className="w-full pl-8 pr-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Units Consumed */}
              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-700" />
                    Units Consumed (kWh) *
                  </label>
                  {getConfidenceBadge(parsedData.unitsConsumed.confidence, unitsConsumed !== '')}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    value={unitsConsumed}
                    onChange={(e) =>
                      setUnitsConsumed(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="e.g. 340"
                    className="w-full px-3 py-2 text-base font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    kWh
                  </span>
                </div>
              </div>
            </div>

            {/* Consumer Identifiers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Consumer Name
                  </label>
                  {getConfidenceBadge(parsedData.consumerName.confidence, !!consumerName)}
                </div>
                <input
                  type="text"
                  value={consumerName}
                  onChange={(e) => setConsumerName(e.target.value)}
                  placeholder="e.g. Rameshwar Prasad Sharma"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    Consumer No / Account ID
                  </label>
                  {getConfidenceBadge(parsedData.consumerNumber.confidence, !!consumerNumber)}
                </div>
                <input
                  type="text"
                  value={consumerNumber}
                  onChange={(e) => setConsumerNumber(e.target.value)}
                  placeholder="e.g. MP-04-9843210"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Meter Readings */}
            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-600" />
                  Meter Reading Record
                </span>
                {typeof currentReading === 'number' && typeof previousReading === 'number' && (
                  <span className="text-emerald-700">
                    Difference: {currentReading - previousReading} units
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-600">Previous Reading</label>
                    {getConfidenceBadge(parsedData.previousReading.confidence, previousReading !== '')}
                  </div>
                  <input
                    type="number"
                    value={previousReading}
                    onChange={(e) =>
                      setPreviousReading(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="e.g. 4520"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-600">Current Reading</label>
                    {getConfidenceBadge(parsedData.currentReading.confidence, currentReading !== '')}
                  </div>
                  <input
                    type="number"
                    value={currentReading}
                    onChange={(e) =>
                      setCurrentReading(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="e.g. 4860"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Dates & Billing Period */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Bill Date
                  </label>
                  {getConfidenceBadge(parsedData.billDate.confidence, !!billDate)}
                </div>
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Due Date
                  </label>
                  {getConfidenceBadge(parsedData.dueDate.confidence, !!dueDate)}
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Billing Period
                  </label>
                  {getConfidenceBadge(parsedData.billingPeriod.confidence, !!billingPeriod)}
                </div>
                <input
                  type="text"
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value)}
                  placeholder="e.g. 01/10/2024 to 31/10/2024"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl text-sm">
              Fixed charges: Not extracted. Surcharges: Not extracted. No tariff breakdown is inferred from consumption.
              The separate Slab Calculator provides illustrative estimates only.
            </div>
          </Card>

          {/* Optional Profile Sync Option (TASK 6) */}
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 flex items-start gap-3">
            <input
              type="checkbox"
              id="syncProfileCheckbox"
              checked={syncToProfile}
              onChange={(e) => setSyncToProfile(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 mt-0.5 cursor-pointer"
            />
            <label htmlFor="syncProfileCheckbox" className="text-xs text-emerald-950 cursor-pointer space-y-0.5">
              <span className="font-semibold block">Update my household profile with this consumer name</span>
              <span className="text-[11px] text-emerald-700 block">
                Optionally updates your active profile name ({consumerName || 'from bill'}) without overwriting your contact, pincode, or existing preferences.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Button type="button" variant="ghost" size="md" onClick={onCancel}>
              Discard & Start Over
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSaving || (!!duplicateWarning && !allowDuplicateSave) || (ambiguousFields.length > 0 && !ambiguityConfirmed)}
              className="w-full sm:w-auto shadow-md"
              icon={<CheckCircle className="w-5 h-5" />}
            >
              Confirm & Save to Offline Database
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
