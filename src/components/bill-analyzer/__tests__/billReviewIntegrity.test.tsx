import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillReviewForm } from '../BillReviewForm';
import { runEnergySavingsEngine, PRESET_1BHK } from '../../../services/energyEngine';
import { runSolarFeasibilityEngine } from '../../../services/solarEngine';
import { getLiveHouseholdImpact } from '../../../services/impactTrackerService';
import { formatDate } from '../../../utils/formatters';
import { dbService } from '../../../services/db';
import { storageService } from '../../../services/storageService';
import { parseElectricityBill } from '../../../services/billParser';
const harness = vi.hoisted(() => ({cells: [] as any[], cursor: 0}));
vi.mock('react', async () => {
  const actual = await vi.importActual<any>('react');
  return {...actual, useRef: (value: any) => { const i=harness.cursor++; if (!(i in harness.cells)) harness.cells[i]={current:value}; return harness.cells[i]; }, useEffect: () => {}, useState: (initial: any) => {
    const i = harness.cursor++;
    if (!(i in harness.cells)) harness.cells[i] = typeof initial === 'function' ? initial() : initial;
    return [harness.cells[i], (value: any) => {harness.cells[i] = typeof value === 'function' ? value(harness.cells[i]) : value;}];
  }};
});
function nodes(node: any): any[] {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray((node.props as any).children).flatMap(nodes)];
}
function render(props: any) { harness.cursor=0; return BillReviewForm(props) as any; }
beforeEach(() => {harness.cells=[]; harness.cursor=0;});
const text = 'Consumer No: 001234567890\nBill Date: 01/10/2024\nDue Date: 20/10/2024\nBilled Units: 340\nNet Amount Payable: 2580';
describe('C1 mandatory review/save regressions', () => {
 it('blocks unresolved candidates until explicit confirmation and retains evidence', async () => {
  const save=vi.fn(); const props={parsedData:parseElectricityBill(text+'\nNet Amount Payable: 3000'),onConfirmSave:save,onCancel:vi.fn()};
  let tree=render(props);
  await tree.props.onSubmit({preventDefault(){}}); expect(save).not.toHaveBeenCalled();
  // Locate the empty required amount by its numeric type, independent of placeholder wording.
  const amount=nodes(tree).find(n=>n.type==='input' && n.props.type==='number' && n.props.value==='');
  amount.props.onChange({target:{value:'2580'}});
  nodes(tree).find(n=>n.type==='input' && n.props.type==='checkbox' && !n.props.id).props.onChange({target:{checked:true}});
  tree=render(props); await tree.props.onSubmit({preventDefault(){}});
  expect(save.mock.calls[0][0].totalAmount).toBe(2580);
  expect(save.mock.calls[0][0].extractionEvidence.totalAmount.candidates).toHaveLength(2);
 });
 it('requires a real bill date but permits an explicitly unknown due date',async()=>{
  const save=vi.fn();const props={parsedData:parseElectricityBill('Billed Units: 340\nNet Amount Payable: 2580'),onConfirmSave:save,onCancel:vi.fn()};
  let tree=render(props);await tree.props.onSubmit({preventDefault(){}});expect(save).not.toHaveBeenCalled();
  nodes(tree).find(n=>n.type==='input' && n.props.type==='date').props.onChange({target:{value:'2024-10-01'}});
  tree=render(props);await tree.props.onSubmit({preventDefault(){}});
  const bill=save.mock.calls[0][0];expect(bill.dueDateStatus).toBe('unknown');
  expect(bill.dueDate || 'Paid').toBe('Not provided');expect(formatDate(bill.dueDate)).toBe('Not provided');
 });
 it('locks repeated saves until persistence finishes',async()=>{
  let finish!:()=>void;const save=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve;}));
  const props={parsedData:parseElectricityBill(text),onConfirmSave:save,onCancel:vi.fn()};
  const tree=render(props); const pending=tree.props.onSubmit({preventDefault(){}});
  await tree.props.onSubmit({preventDefault(){}});expect(save).toHaveBeenCalledTimes(1);finish();await pending;
 });
 it('round-trips new metadata without changing legacy downstream calculations',async()=>{
  const save=vi.fn();const tree=render({parsedData:parseElectricityBill(text),onConfirmSave:save,onCancel:vi.fn()});
  await tree.props.onSubmit({preventDefault(){}});const bill=save.mock.calls[0][0];
  const legacy={...bill,fixedCharges:120,surcharges:91,chargeStatus:undefined,extractionEvidence:undefined};
  const stored:any[]=[legacy];
  const read=vi.spyOn(dbService,'getAllBills').mockImplementation(async()=>structuredClone(stored));
  const write=vi.spyOn(dbService,'saveBill').mockImplementation(async value=>{stored.push(structuredClone(value));});
  try {
   await storageService.saveConfirmedBill({...bill,id:'c1-new'},true);
   const records=await storageService.getSavedBills();expect(records).toHaveLength(2);
   expect(records.find(r=>r.id==='c1-new')?.chargeStatus?.fixedCharges).toBe('unknown');
   const energy=(b:any)=>runEnergySavingsEngine({billedUnitsKwh:b.unitsConsumed,billAmountInr:b.totalAmount,householdMembers:4,userBudgetInr:5000,appliances:PRESET_1BHK});
   const solar=(b:any)=>runSolarFeasibilityEngine({monthlyConsumptionKwh:b.unitsConsumed,monthlyElectricityBillInr:b.totalAmount,usableRoofAreaSqFt:350,roofOwnership:'owned_individual'});
   expect(energy(bill)).toEqual(energy(legacy));expect(solar(bill)).toEqual(solar(legacy));
   expect(getLiveHouseholdImpact([{...bill,source:'sample'}])).toEqual([]);
   expect((await storageService.getBillAnalytics()).avgMonthlyAmount).toBe(2580);
  } finally {read.mockRestore();write.mockRestore();}
 });
 it('does not invent missing dates', () => {
  const tree=render({parsedData:parseElectricityBill(''),onConfirmSave:vi.fn(),onCancel:vi.fn()});
  expect(nodes(tree).filter(n=>n.type==='input' && n.props.type==='date').map(n=>n.props.value)).toEqual(['','']);
 });
 it.each(['sample','manual'])('preserves %s source', async source => {
  const save=vi.fn(); const tree=render({parsedData:parseElectricityBill(text),source,onConfirmSave:save,onCancel:vi.fn()});
  await tree.props.onSubmit({preventDefault(){}});
  expect(save.mock.calls[0][0].source).toBe(source);
 });
 it('does not attach invented charges or mark unchanged fields edited', async () => {
  const save=vi.fn(); const tree=render({parsedData:parseElectricityBill(text),onConfirmSave:save,onCancel:vi.fn()});
  await tree.props.onSubmit({preventDefault(){}});
  const bill=save.mock.calls[0][0];
  expect(bill.slabBreakdown).toBeUndefined();
  expect(bill.chargeStatus).toEqual({fixedCharges:'unknown',surcharges:'unknown'});
  expect(bill.userEdited).toBe(false);
 });
});
