/** Legacy saved assessments use zero for unavailable payback; never render it as instant recovery. */
export function formatSavedSolarPayback(years: number | null | undefined, annualSavings: number): string {
  if (Number.isFinite(annualSavings) && annualSavings <= 0) return 'Not economically viable';
  if (typeof years !== 'number' || !Number.isFinite(years) || years <= 0) return 'Not available';
  return `${years} Years`;
}

/** Format numerical amount into Indian Rupee format (e.g. ₹ 4,500). */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format energy units in kWh
 */
export function formatKwh(units: number): string {
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(units)} kWh`;
}

/**
 * Format carbon emission reduction (kg or metric tons)
 */
export function formatCO2(tons: number): string {
  if (tons < 1) {
    return `${Math.round(tons * 1000)} kg CO₂e`;
  }
  return `${tons.toFixed(2)} tonnes CO₂e`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

/**
 * Format standard readable date
 */
export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

