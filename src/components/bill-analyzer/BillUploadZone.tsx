import React, { useState, useRef } from 'react';
import { UploadCloud, FileImage, Sparkles, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { validateBillFile, validateBillFileSignature } from '../../services/billValidation';
import { SAMPLE_BILLS, createSampleBillFile, SampleBillOption } from '../../data/sampleBillImages';

interface BillUploadZoneProps {
  onFileSelected: (file: File, source?: 'ocr_scan' | 'sample') => void;
  isLoadingSample?: boolean;
}

export const BillUploadZone: React.FC<BillUploadZoneProps> = ({
  onFileSelected,
  isLoadingSample = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidatingSignature, setIsValidatingSignature] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setValidationError(null);
    const validation = validateBillFile(file);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid file format or size.');
      return;
    }

    setIsValidatingSignature(true);
    try {
      const sigValidation = await validateBillFileSignature(file);
      if (!sigValidation.isValid) {
        setValidationError(sigValidation.error || 'Invalid file binary header signature.');
        return;
      }
      onFileSelected(file, 'ocr_scan');
    } finally {
      setIsValidatingSignature(false);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleSelectSample = async (sample: SampleBillOption) => {
    setValidationError(null);
    const file = await createSampleBillFile(sample);
    onFileSelected(file, 'sample');
  };

  return (
    <div className="space-y-6">
      {/* Upload Drag & Drop Box */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
            : 'border-slate-300 hover:border-emerald-400 bg-white hover:bg-slate-50/60 shadow-subtle'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={onInputChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center mx-auto shadow-xs">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {isValidatingSignature ? 'Verifying File Security...' : 'Upload Electricity Bill'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isValidatingSignature ? (
                'Checking binary magic bytes for security integrity...'
              ) : (
                <>
                  Drag & drop your bill photo here, or <span className="text-emerald-700 font-semibold underline">browse files</span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 pt-1">
            <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-medium">
              <FileImage className="w-3.5 h-3.5 text-slate-500" />
              JPG, JPEG, PNG
            </span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-medium">
              Max 10 MB
            </span>
            <span className="inline-flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Client-Side Private
            </span>
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-950 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">File Upload Warning</p>
            <p className="text-rose-900 leading-relaxed">{validationError}</p>
          </div>
        </div>
      )}

      {/* Instant Demo Testing Samples */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Instant Test: Sample Electricity Bills</span>
          </div>
          <span className="text-[11px] text-slate-400">Click to test OCR parsing</span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Don't have a paper bill handy? Click any state DISCOM bill format below to simulate an instant scan:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {SAMPLE_BILLS.map((sb) => (
            <button
              key={sb.id}
              disabled={isLoadingSample}
              onClick={() => handleSelectSample(sb)}
              className="p-3.5 bg-white border border-slate-200/90 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-2xl text-left transition-all group disabled:opacity-50 shadow-xs relative"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Demo Bill</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Test OCR</span>
              </div>
              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900 truncate">
                {sb.name}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-1 border-t border-slate-100">
                <span className="font-medium text-slate-600">{sb.units} kWh</span>
                <span className="font-bold text-emerald-700">₹{sb.amount}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="flex items-start gap-3 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs text-emerald-950">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-bold">Zero-Cloud Privacy Guarantee:</span> Your bill image and consumer identifiers never leave your browser. OCR character recognition runs locally using Tesseract.js inside a dedicated Web Worker on your device.
        </p>
      </div>
    </div>
  );
};
