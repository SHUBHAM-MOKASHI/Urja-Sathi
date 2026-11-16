import { describe, it, expect } from 'vitest';
import { parseElectricityBill } from '../billParser';
import { validateBillData } from '../billValidation';

describe('C1 bill extraction regressions', () => {
  it.each([
    ['punctuated account', 'Consumer No.: 001234567890', 'consumerNumber', '001234567890'],
    ['ISO date', 'Bill Date: 2024-10-28', 'billDate', '2024-10-28'],
    ['due date is not issue date', 'Due Date: 15/11/2024', 'billDate', null],
    ['net payable priority', 'Current Bill Amount: 1000\nNet Amount Payable: 1500', 'totalAmount', 1500],
    ['billed units priority', 'Previous Month Units: 280\nBilled Units: 340', 'unitsConsumed', 340],
    ['OCR number correction', 'Total Payable: 2,12O.00', 'totalAmount', 2120],
    ['small payable', 'Net Amount Payable: 50', 'totalAmount', 50],
    ['named month range', 'Period: 01-Sep-2024 to 30-Sep-2024', 'billingPeriod', '01-Sep-2024 to 30-Sep-2024'],
    ['invalid calendar date', 'Bill Date: 31/02/2024', 'billDate', null],
    ['decimal consumption', 'Billed Units: 340.75', 'unitsConsumed', 340.75],
    ['ambiguous meter reading', 'Current Reading: 400\nCurrent Reading: 500', 'currentReading', null],
    ['ambiguous account', 'Consumer No: 001234567890\nConsumer No: 009876543210', 'consumerNumber', null],
    ['multiline amount', 'Net Amount Payable:\n2580', 'totalAmount', 2580],
    ['multiline units', 'Billed Units:\n340', 'unitsConsumed', 340],
    ['currency before label', 'Rs. 3290.00 Payable', 'totalAmount', 3290],
    ['conflicting consumer names', 'Consumer Name: Alice Sharma\nConsumer Name: Anita Sharma', 'consumerName', null],
    ['negative amount is not positive', 'Net Amount Payable: -100', 'totalAmount', null],
    ['ambiguous payable', 'Net Amount Payable: 1000\nNet Amount Payable: 1500', 'totalAmount', null],
  ])('%s', (_name, text, field, value) => {
    expect((parseElectricityBill(text) as any)[field].value).toBe(value);
  });
  it('does not call units-only extraction high confidence', () => {
    expect(parseElectricityBill('Units: 150').overallConfidence).toBeLessThan(60);
  });
  it('retains ambiguous candidates and warnings', () => {
    const parsed = parseElectricityBill('Billed Units: 200\nBilled Units: 300');
    expect(parsed.unitsConsumed.value).toBeNull();
    expect((parsed.unitsConsumed as any).candidates.map((c: any) => c.value)).toEqual([200, 300]);
    expect(parsed.warnings.join(' ')).toMatch(/ambiguous/i);
  });
  it('warns about numeric OCR substitutions', () => {
    expect(parseElectricityBill('Total Payable: 2,12O.00').warnings.join(' ')).toMatch(/correct/i);
  });
  it('rejects invalid supplied calendar dates', () => {
    expect(validateBillData({totalAmount: 100, unitsConsumed: 20, billDate: '2024-02-31'}).isValid).toBe(false);
  });
});
