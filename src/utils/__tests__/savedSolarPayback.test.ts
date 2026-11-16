import { describe, expect, it } from 'vitest';
import { formatSavedSolarPayback } from '../formatters';

describe('saved solar assessment history payback', () => {
  it.each([null, undefined, 0, -1, NaN, Infinity])('does not render unavailable %s as years', value => {
    expect(formatSavedSolarPayback(value, 2000)).toBe('Not available');
  });
  it.each([0, -1000])('identifies non-positive annual savings %s as uneconomic', savings => {
    expect(formatSavedSolarPayback(0, savings)).toBe('Not economically viable');
  });
  it('preserves a valid historical payback', () => {
    expect(formatSavedSolarPayback(5.2, 12000)).toBe('5.2 Years');
  });
});
