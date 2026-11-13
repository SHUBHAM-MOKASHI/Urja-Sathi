import { dbService } from './db';
import { ElectricityBill } from '../types';
import { checkDuplicateBill } from './billValidation';

export const storageService = {
  /**
   * Save a confirmed bill into IndexedDB, checking for duplicates
   */
  async saveConfirmedBill(
    bill: ElectricityBill,
    allowDuplicate: boolean = false
  ): Promise<{ success: boolean; billId: string; wasDuplicate: boolean; warning?: string }> {
    const existingBills = await dbService.getAllBills();

    const dupCheck = checkDuplicateBill(
      {
        consumerNumber: bill.consumerNumber,
        billMonth: bill.billMonth,
        billDate: bill.billDate,
        unitsConsumed: bill.unitsConsumed,
        totalAmount: bill.totalAmount,
      },
      existingBills
    );

    if (dupCheck.isDuplicate && !allowDuplicate) {
      return {
        success: false,
        billId: dupCheck.duplicateBillId || '',
        wasDuplicate: true,
        warning: dupCheck.reason,
      };
    }

    const billToSave: ElectricityBill = {
      ...bill,
      id: bill.id || `bill_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: bill.createdAt || new Date().toISOString(),
      isDuplicate: dupCheck.isDuplicate,
    };

    await dbService.saveBill(billToSave);

    return {
      success: true,
      billId: billToSave.id,
      wasDuplicate: dupCheck.isDuplicate,
      warning: dupCheck.isDuplicate ? dupCheck.reason : undefined,
    };
  },

  /**
   * Get all stored bills sorted by date (newest first)
   */
  async getSavedBills(): Promise<ElectricityBill[]> {
    const bills = await dbService.getAllBills();
    return bills.sort((a, b) => new Date(b.billDate || b.createdAt).getTime() - new Date(a.billDate || a.createdAt).getTime());
  },

  /**
   * Delete a bill by ID
   */
  async deleteBill(billId: string): Promise<void> {
    await dbService.deleteBill(billId);
  },

  /**
   * Calculate aggregated metrics from stored bills
   */
  async getBillAnalytics(): Promise<{
    totalBillsCount: number;
    avgMonthlyKwh: number;
    avgMonthlyAmount: number;
    highestKwh: number;
    lowestKwh: number;
  }> {
    const bills = await dbService.getAllBills();
    if (bills.length === 0) {
      return {
        totalBillsCount: 0,
        avgMonthlyKwh: 0,
        avgMonthlyAmount: 0,
        highestKwh: 0,
        lowestKwh: 0,
      };
    }

    const totalUnits = bills.reduce((acc, b) => acc + (b.unitsConsumed || 0), 0);
    const totalAmount = bills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const unitsList = bills.map((b) => b.unitsConsumed || 0);

    return {
      totalBillsCount: bills.length,
      avgMonthlyKwh: Math.round(totalUnits / bills.length),
      avgMonthlyAmount: Math.round(totalAmount / bills.length),
      highestKwh: Math.max(...unitsList),
      lowestKwh: Math.min(...unitsList),
    };
  },
};

