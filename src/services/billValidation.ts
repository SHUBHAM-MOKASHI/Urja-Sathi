import { BillValidationResult, ElectricityBill } from '../types';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_FILE_SIZE_BYTES = 5 * 1024; // 5 KB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates uploaded file MIME type and size boundaries
 */
export function validateBillFile(file: File): FileValidationResult {
  if (!file) {
    return { isValid: false, error: 'No file selected.' };
  }

  // Check file type
  const isAllowedImage = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase()) ||
    /\.(jpe?g|png)$/i.test(file.name);

  if (!isAllowedImage) {
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
      return {
        isValid: false,
        error: 'PDF uploads must be converted or screenshotted as JPG or PNG for client-side local OCR privacy.',
      };
    }
    return {
      isValid: false,
      error: 'Unsupported file format. Please upload a clear image of your bill in JPG, JPEG, or PNG format.',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size (${sizeMb} MB) exceeds maximum limit of 10 MB. Please compress or resize the image.`,
    };
  }

  if (file.size < MIN_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'File size is unusually small (under 5 KB). The image may be blank or corrupted.',
    };
  }

  return { isValid: true };
}

/**
 * Asynchronously inspects the leading bytes (magic numbers) of the file
 * to verify that a genuine JPEG or PNG image is present, preventing
 * renamed executable, HTML, or SVG files from reaching the OCR engine.
 */
export async function validateBillFileSignature(file: File): Promise<FileValidationResult> {
  const basic = validateBillFile(file);
  if (!basic.isValid) {
    return basic;
  }

  try {
    const slice = file.slice(0, 8);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 4) {
      return {
        isValid: false,
        error: 'File header is too short or corrupted.',
      };
    }

    // JPEG signature: FF D8 FF
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

    // PNG signature: 89 50 4E 47 (0x89 'P' 'N' 'G')
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;

    if (!isJpeg && !isPng) {
      return {
        isValid: false,
        error:
          'Invalid file signature. The file content does not match genuine JPEG or PNG binary headers (renamed or corrupted file).',
      };
    }

    return { isValid: true };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Failed to verify file integrity: ${err?.message || 'Read error'}`,
    };
  }
}

/**
 * Validates confirmed bill fields before saving into offline IndexedDB
 */
export function validateBillData(data: {
  consumerNumber?: string;
  consumerName?: string;
  totalAmount?: number | null;
  unitsConsumed?: number | null;
  billDate?: string | null;
  dueDate?: string | null;
  previousReading?: number | null;
  currentReading?: number | null;
}): BillValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required Field Checks
  if (data.totalAmount === null || data.totalAmount === undefined || !Number.isFinite(data.totalAmount)) {
    errors.push('Total Bill Amount is required and must be a valid number.');
  } else if (data.totalAmount <= 0) {
    errors.push('Total Bill Amount must be greater than ₹ 0.');
  } else if (data.totalAmount > 500000) {
    warnings.push('Unusually high bill amount (> ₹5,00,000). Please double check the figure.');
  }

  if (data.unitsConsumed === null || data.unitsConsumed === undefined || !Number.isFinite(data.unitsConsumed)) {
    errors.push('Units Consumed (kWh) is required and must be a valid number.');
  } else if (data.unitsConsumed < 0) {
    errors.push('Units Consumed cannot be negative.');
  } else if (data.unitsConsumed > 15000) {
    warnings.push('High monthly consumption (> 15,000 kWh). Confirm if this is commercial or industrial.');
  }

  // Consumer Number
  if (!data.consumerNumber || data.consumerNumber.trim().length === 0) {
    warnings.push('Consumer Number / CA Number is missing. Adding this helps track historical trends.');
  }

  // Date Chronology Check
  if (data.billDate && data.dueDate) {
    const billD = new Date(data.billDate);
    const dueD = new Date(data.dueDate);

    if (!isNaN(billD.getTime()) && !isNaN(dueD.getTime())) {
      if (dueD < billD) {
        errors.push(`Due date (${data.dueDate}) cannot be earlier than bill date (${data.billDate}).`);
      }
    }
  }

  // Meter Readings Consistency
  if (
    data.currentReading !== null &&
    data.currentReading !== undefined &&
    Number.isFinite(data.currentReading) &&
    data.previousReading !== null &&
    data.previousReading !== undefined &&
    Number.isFinite(data.previousReading)
  ) {
    if (data.currentReading < 0 || data.previousReading < 0) {
      errors.push('Meter readings cannot be negative numbers.');
    } else if (data.currentReading < data.previousReading) {
      warnings.push(
        `Current meter reading (${data.currentReading}) is lower than previous reading (${data.previousReading}). (Unless meter rolled over past 99,999).`
      );
    } else if (data.unitsConsumed !== null && data.unitsConsumed !== undefined && Number.isFinite(data.unitsConsumed)) {
      const difference = data.currentReading - data.previousReading;
      if (Math.abs(difference - data.unitsConsumed) > 5) {
        warnings.push(
          `Meter difference (${difference} units) does not match billed units (${data.unitsConsumed} units). Check for meter multiplication factor (MF).`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Checks if a bill already exists in stored history to prevent duplicate uploads
 */
export function checkDuplicateBill(
  newBill: {
    consumerNumber?: string;
    billMonth?: string;
    billDate?: string;
    unitsConsumed?: number;
    totalAmount?: number;
  },
  existingBills: ElectricityBill[]
): { isDuplicate: boolean; duplicateBillId?: string; reason?: string } {
  if (!existingBills || existingBills.length === 0) {
    return { isDuplicate: false };
  }

  for (const existing of existingBills) {
    // Match 1: Same consumer number and exact same bill date
    if (
      newBill.consumerNumber &&
      existing.consumerNumber &&
      newBill.consumerNumber.trim().toLowerCase() === existing.consumerNumber.trim().toLowerCase() &&
      newBill.billDate &&
      existing.billDate &&
      newBill.billDate === existing.billDate
    ) {
      return {
        isDuplicate: true,
        duplicateBillId: existing.id,
        reason: `A bill for consumer ${newBill.consumerNumber} dated ${newBill.billDate} is already saved.`,
      };
    }

    // Match 2: Same consumer number and same billing month
    if (
      newBill.consumerNumber &&
      existing.consumerNumber &&
      newBill.consumerNumber.trim().toLowerCase() === existing.consumerNumber.trim().toLowerCase() &&
      newBill.billMonth &&
      existing.billMonth &&
      newBill.billMonth.trim().toLowerCase() === existing.billMonth.trim().toLowerCase()
    ) {
      return {
        isDuplicate: true,
        duplicateBillId: existing.id,
        reason: `A bill for ${newBill.billMonth} (${newBill.consumerNumber}) is already in your local records.`,
      };
    }

    // Match 3: Exact same consumption units and amount with close date
    if (
      newBill.unitsConsumed === existing.unitsConsumed &&
      newBill.totalAmount === existing.totalAmount &&
      newBill.billMonth === existing.billMonth
    ) {
      return {
        isDuplicate: true,
        duplicateBillId: existing.id,
        reason: `An identical bill with ${newBill.unitsConsumed} kWh and ₹${newBill.totalAmount} is already recorded.`,
      };
    }
  }

  return { isDuplicate: false };
}

