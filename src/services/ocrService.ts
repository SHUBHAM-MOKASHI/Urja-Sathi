import { createWorker, Worker } from 'tesseract.js';
import { OcrProgress } from '../types';

export interface PreprocessingOptions {
  rotation?: number; // 0, 90, 180, 270 degrees
  grayscale?: boolean;
  enhanceContrast?: boolean;
  binarize?: boolean;
}

export interface PreprocessResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  isBlurry: boolean;
  blurScore: number;
}

export interface OcrResult {
  text: string;
  confidence: number; // 0 - 100
  lines: { text: string; confidence: number }[];
}

/**
 * Calculates image blurriness using Laplacian variance on canvas imageData.
 * Low variance indicates smooth/blurry edges, while sharp edges have high variance.
 */
export function calculateLaplacianVariance(
  imageData: ImageData,
  sampleStep: number = 2
): number {
  const { data, width, height } = imageData;
  // Convert to grayscale first if needed
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Compute 3x3 Laplacian operator: [0, 1, 0; 1, -4, 1; 0, 1, 0]
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += sampleStep) {
    for (let x = 1; x < width - 1; x += sampleStep) {
      const idx = y * width + x;
      const laplacian =
        gray[idx - width] + // top
        gray[idx + width] + // bottom
        gray[idx - 1] +     // left
        gray[idx + 1] -     // right
        4 * gray[idx];      // center

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return Math.max(0, Math.round(variance));
}

/**
 * Preprocess an image file using an HTML5 Canvas:
 * - Rotation support (0°, 90°, 180°, 270°)
 * - Grayscale conversion
 * - Dynamic contrast enhancement
 * - Blur detection check
 */
export async function preprocessImage(
  imageSource: File | Blob | string,
  options: PreprocessingOptions = {}
): Promise<PreprocessResult> {
  const {
    rotation = 0,
    grayscale = true,
    enhanceContrast = true,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const isBlobUrl = typeof imageSource !== 'string';
    const srcUrl = isBlobUrl ? URL.createObjectURL(imageSource as Blob) : (imageSource as string);

    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context is not available');
        }

        const isRotated90or270 = rotation % 180 !== 0;
        const width = isRotated90or270 ? img.height : img.width;
        const height = isRotated90or270 ? img.width : img.height;

        canvas.width = width;
        canvas.height = height;

        // Apply rotation
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        // Get pixel data for processing
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Check blurriness before filters
        const blurScore = calculateLaplacianVariance(imageData);
        // Scores below 60 typically mean text edges are fuzzy/out of focus
        const isBlurry = blurScore < 60;

        if (grayscale || enhanceContrast) {
          for (let i = 0; i < data.length; i += 4) {
            // Standard luminance formula
            let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

            if (enhanceContrast) {
              // High contrast sigmoid / S-curve to push paper background white and ink dark
              if (gray > 160) {
                gray = Math.min(255, gray * 1.15);
              } else if (gray < 110) {
                gray = Math.max(0, gray * 0.85);
              }
            }

            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }
          ctx.putImageData(imageData, 0, 0);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

        if (isBlobUrl) {
          URL.revokeObjectURL(srcUrl);
        }

        resolve({
          canvas,
          dataUrl,
          isBlurry,
          blurScore,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => {
      if (isBlobUrl) URL.revokeObjectURL(srcUrl);
      reject(new Error(`Failed to load image for preprocessing: ${e}`));
    };

    img.src = srcUrl;
  });
}

/**
 * Executes local OCR using Tesseract.js in a dedicated Web Worker
 */
export async function runOcrRecognition(
  imageSource: HTMLCanvasElement | string | File,
  onProgress?: (progress: OcrProgress) => void
): Promise<OcrResult> {
  let worker: Worker | null = null;
  try {
    if (onProgress) {
      onProgress({ status: 'Initializing OCR engine...', progress: 0.1 });
    }

    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status) {
          const statusText =
            m.status === 'recognizing text'
              ? 'Analyzing characters & numbers...'
              : m.status === 'loading language traineddata'
              ? 'Loading language models...'
              : m.status;
          onProgress({ status: statusText, progress: Math.min(0.95, m.progress || 0.2) });
        }
      },
    });

    if (onProgress) {
      onProgress({ status: 'Recognizing text...', progress: 0.5 });
    }

    const ret = await worker.recognize(imageSource);

    const lines: { text: string; confidence: number }[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawLines = (ret.data as any)?.lines;
    if (Array.isArray(rawLines)) {
      for (const line of rawLines) {
        if (line && line.text && line.text.trim()) {
          lines.push({
            text: line.text.trim(),
            confidence: Math.round(line.confidence || 0),
          });
        }
      }
    } else if (ret.data.text) {
      for (const l of ret.data.text.split('\n')) {
        if (l.trim()) {
          lines.push({ text: l.trim(), confidence: Math.round(ret.data.confidence || 0) });
        }
      }
    }

    if (onProgress) {
      onProgress({ status: 'Completed', progress: 1.0 });
    }

    return {
      text: ret.data.text || '',
      confidence: Math.round(ret.data.confidence || 0),
      lines,
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {
        // Ignored
      }
    }
  }
}
