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
function normalizeDate(rawDateStr: string): string | null {
  if (!rawDateStr) return null;
  const cleaned = rawDateStr.replace(/[^\w\d\/\-\.]/g, '').trim();

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  // Pattern 2: DD-MMM-YYYY (e.g. 15-OCT-2024 or 15/Oct/2024)
  const dMmmYMatch = cleaned.match(/^(\d{1,2})[\/\-\.]([A-Za-z]{3,4})[\/\-\.](\d{2,4})$/);
  if (dMmmYMatch) {
    const day = dMmmYMatch[1].padStart(2, '0');
    const monthStr = dMmmYMatch[2].toUpperCase().substring(0, 3);
    let year = dMmmYMatch[3];
    if (year.length === 2) year = `20${year}`;

    const monthsMap: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
    };
    const month = monthsMap[monthStr] || '01';
    return `${year}-${month}-${day}`;
  }

  return cleaned;
}

/**
 * 1. Extract Consumer Name
 */
export function extractConsumerName(
  text: string,
  lines: string[]
): FieldExtractionResult<string> {
  const namePatterns = [
    /(?:Consumer\s*Name|Customer\s*Name|Name\s*of\s*Consumer|Account\s*Holder|Name\s*&?\s*Address)\s*[:\-]\s*([A-Za-z\s\.\/]{3,50})/i,
    /(?:Shri|Smt|M\/s|Mr\.?|Mrs\.?)\s+([A-Z][A-Za-z\s\.\/]{3,45})/i,
    /(?:Name)\s*[:\-]\s*([A-Za-z\s\.\/]{3,45})/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1]
        .split('\n')[0]
        .replace(/(?:Address|Tariff|Category|Phone|Contact|Mobile|Pin|Load|Phase|Sanctioned).*/i, '')
        .trim();

      // Ensure it is not a heading or random short word
      if (candidate.length >= 3 && !/^(bill|invoice|discom|electricity|power|board)$/i.test(candidate)) {
        return {
          value: candidate,
          confidence: 85,
          rawMatch: match[0],
        };
      }
    }
  }

  // Look for line-by-line matches
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(?:Consumer\s*Name|Name)\s*[:\-]?$/i.test(line) && lines[i + 1]) {
      const nextLine = lines[i + 1].trim();
      if (nextLine.length >= 3 && !/\d{4,}/.test(nextLine)) {
        return {
          value: nextLine,
          confidence: 75,
          rawMatch: nextLine,
        };
      }
    }
  }

  // Never guess if not found
  return { value: null, confidence: 0 };
}

/**
 * 2. Extract Consumer Account Number / CA No
 */
export function extractConsumerNumber(
  text: string,
  _lines: string[]
): FieldExtractionResult<string> {
  const patterns = [
    /(?:Consumer\s*(?:No|Number|ID)|CA\s*(?:No|Number)|Account\s*(?:No|ID|Number)|K\.?\s*No\.?|Service\s*(?:No|Connection\s*No))\s*[:\-]?\s*([A-Z0-9\-\/]{6,20})/i,
    /(?:Consumer\s*#|Account\s*#)\s*[:\-]?\s*([A-Z0-9\-\/]{6,20})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanNo = match[1].trim();
      if (/\d/.test(cleanNo) && cleanNo.length >= 6) {
        return {
          value: cleanNo,
          confidence: 90,
          rawMatch: match[0],
        };
      }
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * 3. Extract Total Bill Amount Payable
 */
export function extractBillAmount(
  text: string,
  lines: string[]
): FieldExtractionResult<number> {
  const amountPatterns = [
    /(?:Net\s*Amount\s*Payable|Total\s*Amount\s*Payable|Total\s*Payable|Net\s*Payable|Amount\s*Payable|Total\s*Bill\s*Amount|Current\s*Bill\s*Amount|Payable\s*Amount|Total\s*Demand|Net\s*Demand)\s*[:\-]?\s*(?:₹|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Total\s*Amount|Bill\s*Amount)\s*[:\-]?\s*(?:₹|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{2}))\s*(?:Payable|Due|Total)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanNum = parseFloat(cleanNumericString(match[1]));
      if (!isNaN(cleanNum) && cleanNum > 50 && cleanNum < 500000) {
        return {
          value: Math.round(cleanNum),
          confidence: 90,
          rawMatch: match[0],
        };
      }
    }
  }

  // Check lines labeled with Amount Payable
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:Amount\s*Payable|Total\s*Payable|Net\s*Amount)/i.test(line)) {
      const nums = line.match(/(?:₹|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/g);
      if (nums && nums.length > 0) {
        const lastNum = parseFloat(cleanNumericString(nums[nums.length - 1]));
        if (!isNaN(lastNum) && lastNum > 50) {
          return {
            value: Math.round(lastNum),
            confidence: 80,
            rawMatch: line,
          };
        }
      }
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * 4. Extract Units Consumed (kWh)
 */
export function extractUnitsConsumed(
  text: string,
  lines: string[]
): FieldExtractionResult<number> {
  const unitsPatterns = [
    /(?:Billed\s*Units|Units\s*Consumed|Total\s*Units|Consumption\s*\(?kWh\)?|Net\s*Units|Billed\s*Energy|Active\s*Units|Units\s*Billed|Units)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:kWh|Units|Unit)?/i,
    /(?:Consumption|Energy)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:kWh|Units)/i,
  ];

  for (const pattern of unitsPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanNum = parseFloat(cleanNumericString(match[1]));
      // Realistic monthly domestic consumption is usually between 5 and 10,000 units
      if (!isNaN(cleanNum) && cleanNum >= 0 && cleanNum <= 15000) {
        return {
          value: Math.round(cleanNum),
          confidence: 88,
          rawMatch: match[0],
        };
      }
    }
  }

  for (const line of lines) {
    if (/(?:Billed\s*Units|Total\s*Units|Consumption)/i.test(line)) {
      const m = line.match(/\b(\d{1,5}(?:\.\d{1,2})?)\s*(?:kWh|Units)?\b/i);
      if (m && m[1]) {
        const val = parseFloat(cleanNumericString(m[1]));
        if (!isNaN(val) && val >= 0 && val <= 15000) {
          return {
            value: Math.round(val),
            confidence: 75,
            rawMatch: line,
          };
        }
      }
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * 5. Extract Billing Period
 */
export function extractBillingPeriod(
  text: string,
  _lines: string[]
): FieldExtractionResult<string> {
  const periodPatterns = [
    /(?:Bill\s*Period|Billing\s*Period|Period)\s*[:\-]?\s*([0-9\/\-\.]{8,10}\s*(?:to|-|TO)\s*[0-9\/\-\.]{8,10})/i,
    /(?:Billing\s*Month|Bill\s*Month|For\s*the\s*month\s*of)\s*[:\-]?\s*([A-Za-z]{3,9}\s*[\-,\s]?\s*\d{2,4})/i,
    /(?:Month)\s*[:\-]?\s*([A-Za-z]{3,9}\s*[\-,\s]?\s*\d{4})/i,
  ];

  for (const pattern of periodPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return {
        value: match[1].trim(),
        confidence: 85,
        rawMatch: match[0],
      };
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * 6. Extract Previous Meter Reading
 */
export function extractPreviousReading(
  text: string,
  _lines: string[]
): FieldExtractionResult<number> {
  const prevPatterns = [
    /(?:Previous\s*Reading|Prev\s*Reading|Prior\s*Reading|Past\s*Reading|Old\s*Reading|Prev\s*Rdng|Initial\s*Reading)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Previous|Prev)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:Current|Curr|Present)/i,
  ];

  for (const pattern of prevPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseFloat(cleanNumericString(match[1]));
      if (!isNaN(num) && num >= 0) {
        return {
          value: Math.round(num),
          confidence: 85,
          rawMatch: match[0],
        };
      }
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * 7. Extract Current Meter Reading
 */
export function extractCurrentReading(
  text: string,
  _lines: string[]
): FieldExtractionResult<number> {
  const currPatterns = [
    /(?:Current\s*Reading|Curr\s*Reading|Present\s*Reading|New\s*Reading|Curr\s*Rdng|Final\s*Reading)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:Present|Current)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of currPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseFloat(cleanNumericString(match[1]));
      if (!isNaN(num) && num >= 0) {
        return {
          value: Math.round(num),
          confidence: 85,
          rawMatch: match[0],
        };
      }
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * 8. Extract Bill Date
 */
export function extractBillDate(
  text: string,
  _lines: string[]
): FieldExtractionResult<string> {
  const datePatterns = [
    /(?:Bill\s*Date|Date\s*of\s*Issue|Issue\s*Date|Bill\s*Issue\s*Date|Generated\s*Date)\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][A-Za-z]{3,4}[\/\-\.][0-9]{2,4})/i,
    /(?:Date)\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const parsed = normalizeDate(match[1]);
      if (parsed) {
        return {
          value: parsed,
          confidence: 90,
          rawMatch: match[0],
        };
      }
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * 9. Extract Due Date
 */
export function extractDueDate(
  text: string,
  _lines: string[]
): FieldExtractionResult<string> {
  const dueDatePatterns = [
    /(?:Due\s*Date|Pay\s*by\s*Date|Payable\s*By|Payment\s*Due\s*Date|Last\s*Date\s*for\s*Payment|Due\s*Date\s*\(Cash\)|Due\s*Date\s*\(Cheque\))\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{1,2}[\/\-\.][A-Za-z]{3,4}[\/\-\.][0-9]{2,4})/i,
    /(?:Due\s*on|Payable\s*on\s*or\s*before)\s*[:\-]?\s*([0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{2,4})/i,
  ];

  for (const pattern of dueDatePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const parsed = normalizeDate(match[1]);
      if (parsed) {
        return {
          value: parsed,
          confidence: 90,
          rawMatch: match[0],
        };
      }
    }
  }

  return { value: null, confidence: 0 };
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

  // Calculate weighted confidence
  const extractedFields = [
    consumerName.confidence,
    consumerNumber.confidence,
    totalAmount.confidence,
    unitsConsumed.confidence,
    billingPeriod.confidence,
    billDate.confidence,
    dueDate.confidence,
  ];
  const validConfidences = extractedFields.filter((c) => c > 0);
  const averageFieldConfidence =
    validConfidences.length > 0
      ? validConfidences.reduce((a, b) => a + b, 0) / validConfidences.length
      : 0;

  const overallConfidence = Math.round(
    (averageFieldConfidence * 0.7) + (engineConfidence * 0.3)
  );

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

