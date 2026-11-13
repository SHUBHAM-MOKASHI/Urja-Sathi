import React from 'react';
import { Loader2, Cpu, ShieldCheck } from 'lucide-react';
import { OcrProgress } from '../../types';

interface BillOcrProgressProps {
  progress: OcrProgress;
  errorMessage?: string | null;
  onRetry?: () => void;
  onCancel?: () => void;
}

export const BillOcrProgress: React.FC<BillOcrProgressProps> = ({
  progress,
  errorMessage,
  onRetry,
  onCancel,
}) => {
  const percent = Math.min(100, Math.round(progress.progress * 100));

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-subtle space-y-6">
      {errorMessage ? (
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
            <Cpu className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">OCR Processing Interrupted</h3>
            <p className="text-xs text-rose-700 mt-1 max-w-sm mx-auto">{errorMessage}</p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel & Re-upload
              </button>
            )}
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
              >
                Retry Analysis
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-emerald-100 animate-ping opacity-40" />
            <div className="relative w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-premium">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Analyzing Electricity Bill
            </h3>
            <p className="text-xs text-slate-500 font-medium">{progress.status}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 max-w-md mx-auto">
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/80">
              <div
                className="bg-gradient-to-r from-emerald-500 to-forest-700 h-full rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-semibold px-1">
              <span>Local Web Worker</span>
              <span>{percent}%</span>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-emerald-800 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Zero cloud transfer — completely processed on your device</span>
          </div>
        </div>
      )}
    </div>
  );
};
