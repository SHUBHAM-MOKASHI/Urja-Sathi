import { FieldExtractionResult, ParsedBillData } from '../types';

/**
 * Normalizes raw OCR text by removing strange control artifacts,
 * standardizing whitespace, and replacing common OCR symbol aberrations.
 */
export function normalizeOcrText(rawText: string): string {
  if (!rawText) return '';

  return (
    rawText
      // Standardize newlines
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove non-printable or noisy control characters except standard punctuation and unicode rupees
      .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Standardize rupee symbols and currency abbreviations
      .replace(/(?:₹|Rs\.?|INR|R\.s\.?)\s*/gi, '₹ ')
      // Normalize multiple consecutive spaces on the same line to single space
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
  );
}

/**
 * Clean up common numeric string OCR confusions (e.g. O -> 0, l/I -> 1)
 */
function cleanNumericString(str: string): string {
  return str
    .replace(/[oO]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/[sS](?=\d)/g, '5')
    .replace(/,/g, '') // remove thousands separators
    .trim();
}

/**
 * Parses and extracts Indian or ISO dates into a standardized string (YYYY-MM-DD or readable DD/MM/YYYY)
 */
export function normalizeDate(raw: string): string | null {
  const value = raw.trim();
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local = value.match(/^(\d{1,2})[\/.-](\d{1,2}|[A-Za-z]{3,9})[\/.-](\d{2}|\d{4})$/);
  if (!iso && !local) return null;
  let year: number, month: number, day: number;
  if (iso) { [, year, month, day] = iso.map(Number); }
  else {
    day = Number(local![1]);
    const token = local![2];
    month = /^\d+$/.test(token) ? Number(token) : ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(token.toLowerCase().slice(0,3)) + 1;
    year = Number(local![3]) + (local![3].length === 2 ? 2000 : 0);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || month < 1 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

/** Preserve all evidence; equal-ranked conflicting candidates require explicit review. */
function choose<T>(candidates: NonNullable<FieldExtractionResult<T>['candidates']>, confidence: number): FieldExtractionResult<T> {
  if (!candidates.length) return {value:null, confidence:0, candidates};
  const priority = Math.max(...candidates.map(c => c.priority));
  const best = candidates.filter(c => c.priority === priority);
  const ambiguous = new Set(best.map(c => c.value)).size > 1;
  return {value: ambiguous ? null : best[0].value, confidence: ambiguous ? 0 : best.some(c=>c.corrected) ? Math.min(confidence,65) : confidence,
    rawMatch: ambiguous ? undefined : best[0].rawMatch, candidates, ambiguous};
}

function numericCandidates(text: string, labels: string[], confidence: number): FieldExtractionResult<number> {
  const candidates: NonNullable<FieldExtractionResult<number>['candidates']> = [];
  const spans: [number, number][] = [];
  labels.forEach((label, index) => {
    const pattern = new RegExp(`(?:${label})\\s*[:.-]?\\s*(?:₹|Rs\\.?)?\\s*([0-9OoIl|][0-9OoIl|,.]*)(?![A-Za-z0-9,.])`, 'gi');
    for (const match of text.matchAll(pattern)) {
      const start = match.index!;
      const end = start + match[0].length;
      if (spans.some(([a,b]) => start >= a && end <= b)) continue;
      spans.push([start,end]);
      const token = match[1];
      const cleaned = cleanNumericString(token);
      if (!/^(?:\d+|\d{1,3}(?:,\d{2,3})+)(?:\.\d{1,2})?$/.test(token.replace(/[oO]/g,'0').replace(/[Il|]/g,'1'))) continue;
      const value = Number(cleaned);
      if (Number.isFinite(value) && value >= 0) candidates.push({value,rawMatch:match[0],priority:labels.length-index,corrected:/[OoIl|]/.test(token)});
    }
  });
  return choose(candidates, confidence);
}

/**
 * 1. Extract Consumer Name
 */
export function extractConsumerName(text: string, lines: string[]): FieldExtractionResult<string> {
  const candidates: NonNullable<FieldExtractionResult<string>['candidates']> = [];
  const patterns = [
    /(?:Consumer\s*Name|Customer\s*Name|Name\s*of\s*Consumer|Account\s*Holder|Name\s*&?\s*Address)\s*[:\-]\s*([A-Za-z \t.\/]{3,50})/gi,
    /(?:Shri|Smt|M\/s|Mr\.?|Mrs\.?)\s+([A-Za-z \t.\/]{3,45})/gi,
    /\bName\s*[:\-]\s*([A-Za-z \t.\/]{3,45})/gi,
  ];
  for (const [index, pattern] of patterns.entries()) {
    for (const match of text.matchAll(pattern)) {
      const value = match[1].replace(/(?:Address|Tariff|Category|Phone|Contact|Mobile|Pin|Load|Phase|Sanctioned).*/i, '').trim();
      if (value.length >= 3 && !/^(bill|invoice|discom|electricity|power|board)$/i.test(value)) {
        candidates.push({ value, rawMatch: match[0], priority: index === 0 ? 2 : 1 });
      }
    }
  }
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^(?:Consumer\s*Name|Name)\s*[:\-]?$/i.test(lines[i])) {
      const value = lines[i + 1].trim();
      if (value.length >= 3 && !/\d{4,}|:/.test(value)) candidates.push({ value, rawMatch: value, priority: 2 });
    }
  }
  return choose(candidates, 85);
}

/**
 * 2. Extract Consumer Account Number / CA No
 */
export function extractConsumerNumber(
  text: string,
  _lines: string[]
): FieldExtractionResult<string> {
  const patterns = [
    /(?:Consumer\s*(?:No|Number|ID)|CA\s*(?:No|Number)|Account\s*(?:No|ID|Number)|K\.?\s*No\.?|Service\s*(?:No|Connection\s*No))\s*\.?\s*[:\-]?\s*([A-Z0-9\-\/]{6,20})/i,
    /(?:Consumer\s*#|Account\s*#)\s*[:\-]?\s*([A-Z0-9\-\/]{6,20})/i,
  ];

  const candidates: NonNullable<FieldExtractionResult<string>['candidates']> = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(new RegExp(pattern.source,'gi'))) {
      const value = match[1].trim();
      if (/\d/.test(value) && value.length >= 6) candidates.push({value,rawMatch:match[0],priority:1});
    }
  }
  return choose(candidates,90);
}

/**
 * 3. Extract Total Bill Amount Payable
 */
export function extractBillAmount(text: string, _lines: string[]): FieldExtractionResult<number> {
  const result = numericCandidates(text, [
    String.raw`\b(?:Net\s*Amount\s*Payable|Total\s*Amount\s*Payable|Total\s*Payable|Net\s*Payable|Amount\s*Payable|Payable\s*Amount|Total\s*Demand|Net\s*Demand)`,
    String.raw`\b(?:Total\s*Bill\s*Amount|Total\s*Amount|Current\s*Bill\s*Amount|Bill\s*Amount)`,
  ], 90);
  const candidates = result.candidates || [];
  for (const match of text.matchAll(/(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:Payable|Due|Total)\b/gi)) {
    const value = Number(match[1].replace(/,/g, ''));
    if (Number.isFinite(value)) candidates.push({ value, rawMatch: match[0], priority: 1 });
  }
  return choose(candidates, 90);
}

export function extractUnitsConsumed(text: string, _lines: string[]): FieldExtractionResult<number> {
  // Historical rows are not candidates for current billed consumption.
  const current = text.split('\n').filter(line => !/previous\s*month|last\s*month|histor(?:y|ical)/i.test(line)).join('\n');
  return numericCandidates(current, [
    String.raw`\b(?:Billed\s*Units|Units\s*Consumed|Total\s*Units|Consumption\s*\(?kWh\)?|Net\s*Units|Billed\s*Energy|Active\s*Units|Units\s*Billed)`,
    String.raw`\b(?:Units|Consumption|Energy)`,
  ], 88);
}

/**
 * 5. Extract Billing Period
 */
export function extractBillingPeriod(
  text: string,
  _lines: string[]
): FieldExtractionResult<string> {
  const candidates: NonNullable<FieldExtractionResult<string>['candidates']> = [];
  const dates = String.raw`(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-](?:\d{1,2}|[A-Za-z]{3,9})[\/.-](?:\d{4}|\d{2}))`;
  const ranges = new RegExp(String.raw`(?:Bill\s*Period|Billing\s*Period|Period)\s*[:\-]?\s*(${dates}\s*(?:to|\s-\s)\s*${dates})`, 'gi');
  for (const m of text.matchAll(ranges)) {
    const ends = m[1].split(/\s+to\s+|\s+-\s+/i).map(normalizeDate);
    if (ends.length === 2 && ends[0] && ends[1] && ends[0] <= ends[1]) candidates.push({value:m[1],rawMatch:m[0],priority:2});
  }
  const months = /(?:Billing\s*Month|Bill\s*Month|For\s*the\s*month\s*of|\bMonth)\s*[:\-]?\s*([A-Za-z]{3,9}\s*[\-,\s]?\s*\d{2,4})/gi;
  for (const m of text.matchAll(months)) candidates.push({value:m[1].trim(),rawMatch:m[0],priority:1});
  return choose(candidates,85);
}

/**
 * 6. Extract Previous Meter Reading
 */
export function extractPreviousReading(text: string, _lines: string[]): FieldExtractionResult<number> {
  return numericCandidates(text, [String.raw`\b(?:Previous\s*Reading|Prev\s*Reading|Prior\s*Reading|Past\s*Reading|Old\s*Reading|Prev\s*Rdng|Initial\s*Reading)`, String.raw`\b(?:Previous|Prev)`],85);
}
export function extractCurrentReading(text: string, _lines: string[]): FieldExtractionResult<number> {
  return numericCandidates(text, [String.raw`\b(?:Current\s*Reading|Curr\s*Reading|Present\s*Reading|New\s*Reading|Curr\s*Rdng|Final\s*Reading)`, String.raw`\b(?:Present|Current)(?!\s*(?:Bill|Month|Charges))`],85);
}

function extractDate(text: string, labels: string): FieldExtractionResult<string> {
  const pattern = new RegExp(String.raw`(?:${labels})[ \t]*[:\-]?[ \t]*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.-](?:\d{1,2}|[A-Za-z]{3,9})[\/.-](?:\d{4}|\d{2}))(?!\d)`, 'gi');
  const candidates: NonNullable<FieldExtractionResult<string>['candidates']> = [];
  for (const m of text.matchAll(pattern)) {
    const value = normalizeDate(m[1]);
    if (value) candidates.push({value,rawMatch:m[0],priority:1});
  }
  return choose(candidates,90);
}
export function extractBillDate(text: string, _lines: string[]): FieldExtractionResult<string> {
  return extractDate(text, String.raw`\bBill\s*(?:Issue\s*)?Date|\bDate\s*of\s*Issue|\bIssue\s*Date|\bGenerated\s*Date`);
}
export function extractDueDate(text: string, _lines: string[]): FieldExtractionResult<string> {
  return extractDate(text, String.raw`\bDue\s*Date(?:\s*\((?:Cash|Cheque)\))?|\bPay\s*by\s*Date|\bPayable\s*By|\bPayment\s*Due\s*Date|\bLast\s*Date\s*for\s*Payment|\bDue\s*on|\bPayable\s*on\s*or\s*before`);
}

/**
 * Master parser uniting all field extractions
 */
export function parseElectricityBill(
  rawText: string,
  engineConfidence: number = 80
): ParsedBillData {
  const normalizedText = normalizeOcrText(rawText);
  const lines = normalizedText.split('\n').filter((l) => l.trim().length > 0);

  const consumerName = extractConsumerName(normalizedText, lines);
  const consumerNumber = extractConsumerNumber(normalizedText, lines);
  const totalAmount = extractBillAmount(normalizedText, lines);
  const unitsConsumed = extractUnitsConsumed(normalizedText, lines);
  const billingPeriod = extractBillingPeriod(normalizedText, lines);
  const previousReading = extractPreviousReading(normalizedText, lines);
  const currentReading = extractCurrentReading(normalizedText, lines);
  const billDate = extractBillDate(normalizedText, lines);
  const dueDate = extractDueDate(normalizedText, lines);

  // Check mathematical consistency if meter readings are found
  const warnings: string[] = [];

  if (currentReading.value !== null && previousReading.value !== null) {
    if (currentReading.value < previousReading.value) {
      warnings.push('Meter reading anomaly: Current reading is less than previous reading.');
    } else if (unitsConsumed.value !== null) {
      const diff = currentReading.value - previousReading.value;
      if (Math.abs(diff - unitsConsumed.value) > 2) {
        warnings.push(
          `Units consumed (${unitsConsumed.value} kWh) differs from meter difference (${diff} kWh). Check for meter multiplier or manual correction.`
        );
      }
    }
  }

  if (totalAmount.value === null) {
    warnings.push('Total bill amount was not detected with high certainty. Please enter manually.');
  }

  if (unitsConsumed.value === null) {
    warnings.push('Billed electricity units (kWh) were not detected with certainty. Please enter manually.');
  }

  const fields = {consumerName, consumerNumber, totalAmount, unitsConsumed, billingPeriod, previousReading, currentReading, billDate, dueDate};
  const engine = Number.isFinite(engineConfidence) ? Math.max(0,Math.min(100,engineConfidence)) : 0;
  for (const [name, field] of Object.entries(fields)) {
    if (field.ambiguous) warnings.push(`Ambiguous ${name}: multiple equally plausible values. Enter the correct value and confirm the candidates before saving.`);
    if (field.candidates?.some(c=>c.corrected)) warnings.push(`OCR numeric correction in ${name}. Check the original image before confirming.`);
    field.confidence = Math.round(Math.min(field.confidence, engine));
  }
  if (!billDate.value) warnings.push('Bill date is missing or invalid. Enter the actual issue date; it is never inferred from the due date.');
  const scores = Object.values(fields).map(field=>field.confidence);
  let overallConfidence = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  if ([totalAmount,unitsConsumed,billDate].some(field=>field.value === null)) overallConfidence = Math.min(49,overallConfidence);
  if (warnings.some(w=>w.includes('Meter') || w.includes('differs'))) overallConfidence = Math.min(69,overallConfidence);

  return {
    consumerName,
    consumerNumber,
    totalAmount,
    unitsConsumed,
    billingPeriod,
    previousReading,
    currentReading,
    billDate,
    dueDate,
    overallConfidence,
    normalizedText,
    warnings,
  };
}

