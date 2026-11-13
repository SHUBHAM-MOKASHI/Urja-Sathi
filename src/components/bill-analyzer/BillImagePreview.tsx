import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  AlertTriangle,
  Play,
  RefreshCw,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { preprocessImage, PreprocessResult } from '../../services/ocrService';

interface BillImagePreviewProps {
  file: File;
  onConfirmAnalysis: (preprocessedCanvas: HTMLCanvasElement, previewUrl: string) => void;
  onResetFile: () => void;
}

export const BillImagePreview: React.FC<BillImagePreviewProps> = ({
  file,
  onConfirmAnalysis,
  onResetFile,
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [processed, setProcessed] = useState<PreprocessResult | null>(null);
  const [isProcessingCanvas, setIsProcessingCanvas] = useState<boolean>(true);

  // Recalculate preview whenever rotation or contrast settings change
  useEffect(() => {
    let isCurrent = true;
    setIsProcessingCanvas(true);

    preprocessImage(file, {
      rotation,
      enhanceContrast,
      grayscale: true,
    })
      .then((res) => {
        if (isCurrent) {
          setProcessed(res);
          setIsProcessingCanvas(false);
        }
      })
      .catch((err) => {
        console.error('Error preprocessing image:', err);
        setIsProcessingCanvas(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [file, rotation, enhanceContrast]);

  const rotateClockwise = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const rotateCounterClockwise = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleConfirm = () => {
    if (processed) {
      onConfirmAnalysis(processed.canvas, processed.dataUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">
            Image Inspection & Orientation
          </span>
          <Badge variant="slate" size="sm">
            {file.name} ({(file.size / 1024).toFixed(0)} KB)
          </Badge>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={rotateCounterClockwise}
            title="Rotate Left 90°"
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={rotateClockwise}
            title="Rotate Right 90°"
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.25))}
            title="Zoom In"
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
            title="Zoom Out"
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={() => setEnhanceContrast(!enhanceContrast)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              enhanceContrast
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>High Contrast</span>
          </button>
        </div>
      </div>

      {/* Blurry Image Alert (Requirement 13) */}
      {processed?.isBlurry && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-950 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Image Blurriness Detected (Score: {processed.blurScore})</p>
            <p className="text-amber-900 leading-relaxed">
              The text on this bill photo may be soft or out of focus. For the best automatic reading, make sure the camera is held steady in good light, or you can proceed and manually correct any fields after scanning.
            </p>
          </div>
        </div>
      )}

      {/* Image Preview Canvas Display */}
      <div className="relative w-full max-h-[500px] bg-slate-900/90 rounded-3xl overflow-auto border border-slate-800 flex items-center justify-center p-4">
        {isProcessingCanvas && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-10 text-white text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Updating orientation...</span>
          </div>
        )}

        {processed?.dataUrl ? (
          <img
            src={processed.dataUrl}
            alt="Bill Preview"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            className="max-w-full max-h-[460px] object-contain rounded-xl shadow-2xl transition-transform duration-200"
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            Loading preview...
          </div>
        )}
      </div>

      {/* User Confirmation Step (Requirement 10: Require user confirmation before analysis) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
        <div className="space-y-0.5 text-center sm:text-left">
          <h4 className="text-sm font-bold text-emerald-950 flex items-center justify-center sm:justify-start gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Ready for Local Character Recognition
          </h4>
          <p className="text-xs text-emerald-800">
            Rotate image until text is right side up, then start Tesseract.js.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="md"
            onClick={onResetFile}
            className="flex-1 sm:flex-none text-slate-600"
          >
            Change Image
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={isProcessingCanvas || !processed}
            className="flex-1 sm:flex-none shadow-md"
            icon={<Play className="w-4 h-4 fill-white" />}
          >
            Confirm & Start Analysis
          </Button>
        </div>
      </div>
    </div>
  );
};
