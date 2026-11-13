import { describe, it, expect } from 'vitest';
import {
  normalizeOcrText,
  extractConsumerName,
  extractConsumerNumber,
  extractBillAmount,
  extractUnitsConsumed,
  extractBillingPeriod,
  extractPreviousReading,
  extractCurrentReading,
  extractBillDate,
  extractDueDate,
  parseElectricityBill,
} from '../billParser';

// Sample 1: Realistic MPPKVVCL / MP State Electricity Bill
const SAMPLE_MP_BILL = `
MADHYA PRADESH PASHCHIM KSHETRA VIDYUT VITARAN CO. LTD.
LT ELECTRICITY BILL (DOMESTIC)
Consumer No: MP-04-9843210
Consumer Name: Rameshwar Prasad Sharma
Address: 142/B, Scheme 54, Vijay Nagar, Indore
Tariff / Category: LV-1 Domestic
Sanctioned Load: 3.0 kW
Bill Date: 28/10/2024
Due Date: 15/11/2024
Bill Period: 01/10/2024 to 31/10/2024
Previous Reading: 4520
Current Reading: 4860
Billed Units: 340 kWh
Energy Charges: ₹ 2240.00
Fixed Charges: ₹ 140.00
Electricity Duty: ₹ 112.00
Net Amount Payable: ₹ 2580.00
`;

// Sample 2: BSES Delhi Bill format
const SAMPLE_BSES_BILL = `
BSES RAJDHANI POWER LIMITED
ELECTRICITY BILL - RESIDENTIAL
CA Number: 102948576
Name: Sunita Devi
Billing Month: OCT-2024
Date of Issue: 12-10-2024
Payment Due Date: 27-10-2024
Prev Reading: 12450
Curr Reading: 12870
Units Consumed: 420 kWh
Total Amount Payable: 3,290.00
`;

// Sample 3: Bill with OCR noise & symbols (currency typos, spacing issues)
const SAMPLE_NOISY_BILL = `
MAHAVITARAN (MSEDCL)
Consumer ID : 028471938472
Customer Name : Rajesh Vasantrao Kulkarni
Period : 01-Sep-2024 to 30-Sep-2024
Issue Date : 05/10/2024
Due on : 20/10/2024
Prior Reading : 8100
New Reading : 8390
Total Units : 290 Units
Total Payable : Rs. 2,120.00
`;

// Sample 4: Blurry / incomplete bill (missing amount and name)
const SAMPLE_INCOMPLETE_BILL = `
ELECTRICITY BOARD
Some random header text
Unrecognized line 12345
Units: 150 kWh
`;

describe('Bill Parser Module', () => {
  describe('Text Normalization', () => {
    it('normalizes currency symbols and whitespace', () => {
      const raw = 'Total   Amount:   Rs.  4500.00 \r\n Billed:  ₹   320 units';
      const normalized = normalizeOcrText(raw);
      expect(normalized).toContain('Total Amount: ₹ 4500.00');
      expect(normalized).toContain('Billed: ₹ 320 units');
    });
  });

  describe('Sample 1: MPPKVVCL Bill Field Extraction', () => {
    const lines = normalizeOcrText(SAMPLE_MP_BILL).split('\n');

    it('extracts consumer name accurately', () => {
      const res = extractConsumerName(SAMPLE_MP_BILL, lines);
      expect(res.value).toBe('Rameshwar Prasad Sharma');
      expect(res.confidence).toBeGreaterThanOrEqual(75);
    });

    it('extracts consumer account number', () => {
      const res = extractConsumerNumber(SAMPLE_MP_BILL, lines);
      expect(res.value).toBe('MP-04-9843210');
      expect(res.confidence).toBe(90);
    });

    it('extracts net bill amount payable', () => {
      const res = extractBillAmount(SAMPLE_MP_BILL, lines);
      expect(res.value).toBe(2580);
    });

    it('extracts billed units in kWh', () => {
      const res = extractUnitsConsumed(SAMPLE_MP_BILL, lines);
      expect(res.value).toBe(340);
    });

    it('extracts previous and current meter readings', () => {
      const prev = extractPreviousReading(SAMPLE_MP_BILL, lines);
      const curr = extractCurrentReading(SAMPLE_MP_BILL, lines);
      expect(prev.value).toBe(4520);
      expect(curr.value).toBe(4860);
      expect((curr.value || 0) - (prev.value || 0)).toBe(340);
    });

    it('extracts bill date and due date into standardized YYYY-MM-DD', () => {
      const billDate = extractBillDate(SAMPLE_MP_BILL, lines);
      const dueDate = extractDueDate(SAMPLE_MP_BILL, lines);
      expect(billDate.value).toBe('2024-10-28');
      expect(dueDate.value).toBe('2024-11-15');
    });

    it('extracts billing period span', () => {
      const period = extractBillingPeriod(SAMPLE_MP_BILL, lines);
      expect(period.value).toBe('01/10/2024 to 31/10/2024');
    });
  });

  describe('Sample 2: BSES Bill Field Extraction', () => {
    const lines = normalizeOcrText(SAMPLE_BSES_BILL).split('\n');

    it('extracts CA account number and name', () => {
      const ca = extractConsumerNumber(SAMPLE_BSES_BILL, lines);
      const name = extractConsumerName(SAMPLE_BSES_BILL, lines);
      expect(ca.value).toBe('102948576');
      expect(name.value).toBe('Sunita Devi');
    });

    it('extracts bill amount and units', () => {
      const amount = extractBillAmount(SAMPLE_BSES_BILL, lines);
      const units = extractUnitsConsumed(SAMPLE_BSES_BILL, lines);
      expect(amount.value).toBe(3290);
      expect(units.value).toBe(420);
    });

    it('extracts dates and meter readings', () => {
      const billDate = extractBillDate(SAMPLE_BSES_BILL, lines);
      const dueDate = extractDueDate(SAMPLE_BSES_BILL, lines);
      const prev = extractPreviousReading(SAMPLE_BSES_BILL, lines);
      const curr = extractCurrentReading(SAMPLE_BSES_BILL, lines);

      expect(billDate.value).toBe('2024-10-12');
      expect(dueDate.value).toBe('2024-10-27');
      expect(prev.value).toBe(12450);
      expect(curr.value).toBe(12870);
    });
  });

  describe('Sample 3: Noisy MSEDCL Bill Format', () => {
    it('successfully parses with master parser', () => {
      const parsed = parseElectricityBill(SAMPLE_NOISY_BILL);
      expect(parsed.consumerName.value).toBe('Rajesh Vasantrao Kulkarni');
      expect(parsed.consumerNumber.value).toBe('028471938472');
      expect(parsed.totalAmount.value).toBe(2120);
      expect(parsed.unitsConsumed.value).toBe(290);
      expect(parsed.previousReading.value).toBe(8100);
      expect(parsed.currentReading.value).toBe(8390);
      expect(parsed.overallConfidence).toBeGreaterThan(70);
    });
  });

  describe('Requirement 9: Never Guess Missing or Uncertain Values', () => {
    it('leaves missing fields as null rather than inventing numbers', () => {
      const parsed = parseElectricityBill(SAMPLE_INCOMPLETE_BILL);

      // Total amount should be null because it's not in the text
      expect(parsed.totalAmount.value).toBeNull();
      expect(parsed.totalAmount.confidence).toBe(0);

      // Consumer name should be null
      expect(parsed.consumerName.value).toBeNull();
      expect(parsed.consumerName.confidence).toBe(0);

      // Consumer number should be null
      expect(parsed.consumerNumber.value).toBeNull();

      // Units was present and should be extracted
      expect(parsed.unitsConsumed.value).toBe(150);

      // Warning should be raised for missing amount
      expect(parsed.warnings.some((w) => w.includes('amount'))).toBe(true);
    });
  });
});

