import { describe, it, expect } from 'vitest';
import {
  validateBillFile,
  validateBillData,
  checkDuplicateBill,
} from '../billValidation';
import { ElectricityBill } from '../../types';

describe('Bill Validation Module', () => {
  describe('File Validation', () => {
    it('accepts valid JPG, JPEG, and PNG files within 10MB', () => {
      const validJpg = new File(['a'.repeat(20000)], 'bill.jpg', { type: 'image/jpeg' });
      const validPng = new File(['a'.repeat(30000)], 'scan.png', { type: 'image/png' });

      expect(validateBillFile(validJpg).isValid).toBe(true);
      expect(validateBillFile(validPng).isValid).toBe(true);
    });

    it('rejects files larger than 10MB', () => {
      const hugeFile = new File(['a'.repeat(100)], 'huge.jpg', { type: 'image/jpeg' });
      Object.defineProperty(hugeFile, 'size', { value: 12 * 1024 * 1024 });

      const res = validateBillFile(hugeFile);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('exceeds maximum limit of 10 MB');
    });

    it('rejects files smaller than 5KB', () => {
      const tinyFile = new File(['a'.repeat(500)], 'tiny.jpg', { type: 'image/jpeg' });
      const res = validateBillFile(tinyFile);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('unusually small');
    });

    it('provides clear guidance when PDF is submitted', () => {
      const pdfFile = new File(['a'.repeat(20000)], 'bill.pdf', { type: 'application/pdf' });
      const res = validateBillFile(pdfFile);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('PDF uploads must be converted or screenshotted');
    });

    it('rejects unsupported file formats', () => {
      const docx = new File(['a'.repeat(20000)], 'bill.docx', { type: 'application/vnd.openxmlformats' });
      const res = validateBillFile(docx);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Unsupported file format');
    });
  });

  describe('Data Field Validation', () => {
    it('validates a correct bill payload with no errors', () => {
      const res = validateBillData({
        consumerNumber: 'MP-04-12345',
        totalAmount: 2500,
        unitsConsumed: 320,
        billDate: '2024-10-10',
        dueDate: '2024-10-25',
        previousReading: 4000,
        currentReading: 4320,
      });

      expect(res.isValid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it('fails when total amount is missing or <= 0', () => {
      const resNull = validateBillData({
        totalAmount: null,
        unitsConsumed: 200,
      });
      expect(resNull.isValid).toBe(false);
      expect(resNull.errors.some((e) => e.includes('Total Bill Amount is required'))).toBe(true);

      const resZero = validateBillData({
        totalAmount: 0,
        unitsConsumed: 200,
      });
      expect(resZero.isValid).toBe(false);
    });

    it('fails when units consumed is negative', () => {
      const res = validateBillData({
        totalAmount: 1500,
        unitsConsumed: -50,
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('cannot be negative'))).toBe(true);
    });

    it('fails when due date is earlier than bill date', () => {
      const res = validateBillData({
        totalAmount: 2000,
        unitsConsumed: 250,
        billDate: '2024-10-25',
        dueDate: '2024-10-10',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('cannot be earlier than bill date'))).toBe(true);
    });

    it('warns when current reading is lower than previous reading', () => {
      const res = validateBillData({
        totalAmount: 2000,
        unitsConsumed: 200,
        previousReading: 5000,
        currentReading: 4800,
      });
      expect(res.warnings.some((w) => w.includes('lower than previous reading'))).toBe(true);
    });
  });

  describe('Duplicate Detection', () => {
    const existingBills: ElectricityBill[] = [
      {
        id: 'bill_001',
        billMonth: 'October 2024',
        consumerNumber: 'MP-04-9843210',
        unitsConsumed: 340,
        totalAmount: 2580,
        tariffRatePerUnit: 7.5,
        fixedCharges: 140,
        surcharges: 90,
        dueDate: '2024-11-15',
        billDate: '2024-10-28',
        isPeakSeason: false,
        source: 'sample',
        createdAt: '2024-10-28T10:00:00Z',
      },
    ];

    it('detects duplicate by consumer number and bill date', () => {
      const res = checkDuplicateBill(
        {
          consumerNumber: 'MP-04-9843210',
          billDate: '2024-10-28',
          unitsConsumed: 340,
        },
        existingBills
      );
      expect(res.isDuplicate).toBe(true);
      expect(res.duplicateBillId).toBe('bill_001');
    });

    it('detects duplicate by consumer number and billing month', () => {
      const res = checkDuplicateBill(
        {
          consumerNumber: 'MP-04-9843210',
          billMonth: 'October 2024',
        },
        existingBills
      );
      expect(res.isDuplicate).toBe(true);
    });

    it('allows distinct non-duplicate bills', () => {
      const res = checkDuplicateBill(
        {
          consumerNumber: 'MP-04-9843210',
          billDate: '2024-11-28',
          billMonth: 'November 2024',
          unitsConsumed: 290,
          totalAmount: 2150,
        },
        existingBills
      );
      expect(res.isDuplicate).toBe(false);
    });
  });
});

