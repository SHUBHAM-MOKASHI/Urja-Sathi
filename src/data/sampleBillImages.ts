/**
 * Generates high-fidelity, high-contrast electricity bill sample images on a canvas
 * for instant offline testing and judge demonstration.
 */

export interface SampleBillOption {
  id: string;
  name: string;
  discom: string;
  consumerName: string;
  consumerNo: string;
  units: number;
  amount: number;
  prevReading: number;
  currReading: number;
  billDate: string;
  dueDate: string;
  period: string;
}

export const SAMPLE_BILLS: SampleBillOption[] = [
  {
    id: 'sample_mp',
    name: 'MPPKVVCL Domestic (Indore)',
    discom: 'MPPKVVCL - MADHYA PRADESH PASHCHIM KSHETRA',
    consumerName: 'Rameshwar Prasad Sharma',
    consumerNo: 'MP-04-9843210',
    units: 340,
    amount: 2580,
    prevReading: 4520,
    currReading: 4860,
    billDate: '28/10/2024',
    dueDate: '15/11/2024',
    period: '01/10/2024 to 31/10/2024',
  },
  {
    id: 'sample_bses',
    name: 'BSES Rajdhani (Delhi)',
    discom: 'BSES RAJDHANI POWER LIMITED - DELHI',
    consumerName: 'Sunita Devi',
    consumerNo: 'CA-102948576',
    units: 420,
    amount: 3290,
    prevReading: 12450,
    currReading: 12870,
    billDate: '12/10/2024',
    dueDate: '27/10/2024',
    period: '01/09/2024 to 30/09/2024',
  },
  {
    id: 'sample_msedcl',
    name: 'MSEDCL Mahavitaran (Maharashtra)',
    discom: 'MAHARASHTRA STATE ELECTRICITY DIST. CO. LTD.',
    consumerName: 'Rajesh Vasantrao Kulkarni',
    consumerNo: '028471938472',
    units: 290,
    amount: 2120,
    prevReading: 8100,
    currReading: 8390,
    billDate: '05/10/2024',
    dueDate: '20/10/2024',
    period: '01/09/2024 to 30/09/2024',
  },
];

/**
 * Creates a clear visual Bill document on an HTML Canvas and exports as a File / Blob
 */
export function generateSampleBillCanvas(sample: SampleBillOption): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1150;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background Paper
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer border & header
  ctx.strokeStyle = '#052E16';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // Header banner
  ctx.fillStyle = '#14532D';
  ctx.fillRect(24, 24, canvas.width - 48, 80);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(sample.discom, canvas.width / 2, 60);
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('ELECTRICITY CONSUMPTION BILL (LT DOMESTIC)', canvas.width / 2, 85);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';

  // Section 1: Consumer Details
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(40, 130, canvas.width - 80, 160);

  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('CONSUMER IDENTIFICATION & CONNECTION DETAILS', 55, 155);

  ctx.font = '14px Arial, sans-serif';
  ctx.fillText(`Consumer Name: ${sample.consumerName}`, 55, 190);
  ctx.fillText(`Consumer No: ${sample.consumerNo}`, 55, 220);
  ctx.fillText(`Tariff / Category: Domestic LV-1`, 55, 250);

  ctx.fillText(`Bill Date: ${sample.billDate}`, 520, 190);
  ctx.fillText(`Due Date: ${sample.dueDate}`, 520, 220);
  ctx.fillText(`Bill Period: ${sample.period}`, 520, 250);

  // Section 2: Meter Readings
  ctx.strokeRect(40, 310, canvas.width - 80, 150);
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('METER READING & ENERGY CONSUMPTION RECORD', 55, 335);

  ctx.font = '14px Arial, sans-serif';
  ctx.fillText(`Previous Reading: ${sample.prevReading}`, 55, 375);
  ctx.fillText(`Current Reading: ${sample.currReading}`, 320, 375);
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillStyle = '#15803D';
  ctx.fillText(`Billed Units: ${sample.units} kWh`, 600, 375);

  ctx.fillStyle = '#475569';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillText(`Meter Status: Normal Ok`, 55, 415);
  ctx.fillText(`Multiplying Factor (MF): 1.0`, 320, 415);
  ctx.fillText(`Sanctioned Load: 3.0 kW`, 600, 415);

  // Section 3: Tariff Charges Table
  ctx.strokeRect(40, 480, canvas.width - 80, 290);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('BILLING CHARGES BREAKDOWN', 55, 510);

  // Table header
  ctx.fillStyle = '#F1F5F9';
  ctx.fillRect(45, 525, canvas.width - 90, 35);
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillText('Description', 60, 547);
  ctx.fillText('Units / Basis', 350, 547);
  ctx.fillText('Rate (₹)', 550, 547);
  ctx.fillText('Amount (₹)', 730, 547);

  // Table rows
  ctx.font = '13px Arial, sans-serif';
  ctx.fillStyle = '#1E293B';
  const energyCharges = Math.round(sample.amount * 0.88);
  const fixedCharges = 140;
  const duty = sample.amount - energyCharges - fixedCharges;

  ctx.fillText('Energy Charges (Telescopic)', 60, 585);
  ctx.fillText(`${sample.units} kWh`, 350, 585);
  ctx.fillText('Variable', 550, 585);
  ctx.fillText(`₹ ${energyCharges}.00`, 730, 585);

  ctx.fillText('Fixed Demand Meter Charges', 60, 625);
  ctx.fillText('3 kW Load', 350, 625);
  ctx.fillText('₹ 46.67/kW', 550, 625);
  ctx.fillText(`₹ ${fixedCharges}.00`, 730, 625);

  ctx.fillText('Electricity Duty & Tax', 60, 665);
  ctx.fillText('State Tariff', 350, 665);
  ctx.fillText('5.0%', 550, 665);
  ctx.fillText(`₹ ${duty}.00`, 730, 665);

  // Total Banner Box
  ctx.fillStyle = '#DCFCE7';
  ctx.fillRect(45, 700, canvas.width - 90, 60);
  ctx.strokeStyle = '#16A34A';
  ctx.strokeRect(45, 700, canvas.width - 90, 60);

  ctx.fillStyle = '#14532D';
  ctx.font = 'bold 18px Arial, sans-serif';
  ctx.fillText('Net Amount Payable:', 65, 738);
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText(`₹ ${sample.amount}.00`, 680, 740);

  // Section 4: Notice & QR Barcode simulation
  ctx.strokeRect(40, 790, canvas.width - 80, 200);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText('IMPORTANT NOTICE & ENERGY SAVING TIPS', 55, 820);

  ctx.fillStyle = '#475569';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('• Avoid peak-hour surge tariffs by scheduling high-load appliances between 11 AM - 4 PM.', 55, 855);
  ctx.fillText('• Adopt rooftop solar under PM Surya Ghar Muft Bijli Yojana to claim up to ₹78,000 subsidy.', 55, 885);
  ctx.fillText('• Make prompt digital payment on or before due date to avail 0.5% prompt payment discount.', 55, 915);

  // QR / Barcode aesthetic
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(55, 940, 260, 35);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#000000' : '#FFFFFF';
    ctx.fillRect(60 + i * 6, 945, 3 + (i % 3), 25);
  }

  // Footer Discom
  ctx.fillStyle = '#64748B';
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('This is a computer-generated electricity bill document. URJA SAATHI Offline OCR Verification.', canvas.width / 2, 1110);

  return canvas;
}

/**
 * Creates a sample File object for immediate upload testing
 */
export async function createSampleBillFile(sample: SampleBillOption): Promise<File> {
  const canvas = generateSampleBillCanvas(sample);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob || new Blob()], `${sample.id}_bill.jpg`, {
        type: 'image/jpeg',
      });
      resolve(file);
    }, 'image/jpeg', 0.95);
  });
}
