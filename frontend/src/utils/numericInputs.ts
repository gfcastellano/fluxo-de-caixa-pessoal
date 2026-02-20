/**
 * Numeric Input Utilities
 *
 * Provides consistent parsing and validation functions for numeric inputs.
 * Supports both money (decimal) and integer inputs with flexible separator handling.
 */

/**
 * Parse money input (accepts comma or period as decimal separator)
 * @param value The input string value
 * @returns Parsed number or null if invalid
 */
export function parseMoneyInput(value: string): number | null {
  if (!value?.trim()) return null;

  const normalized = value.replace(',', '.');
  const parsed = parseFloat(normalized);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse integer input
 * @param value The input string value
 * @returns Parsed integer or null if invalid
 */
export function parseIntegerInput(value: string): number | null {
  if (!value?.trim()) return null;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

interface ValidateMoneyOptions {
  required?: boolean;
  min?: number;
  max?: number;
}

/**
 * Validate money input
 * @param value The input string value
 * @param t Translation function for error messages
 * @param options Validation options (required, min, max)
 * @returns Error message or null if valid
 */
export function validateMoney(
  value: string,
  t: (key: string, defaultValue?: string) => string,
  options?: ValidateMoneyOptions
): string | null {
  const { required = true, min = 0, max } = options || {};

  if (!value?.trim()) {
    return required ? t('errors.amountRequired', 'Amount is required') : null;
  }

  const parsed = parseMoneyInput(value);
  if (parsed === null) {
    return t('errors.invalidNumber', 'Invalid number format');
  }

  if (parsed <= min) {
    return t('errors.amountPositive', `Amount must be greater than ${min}`);
  }

  if (max !== undefined && parsed > max) {
    return t('errors.amountExceeded', `Amount cannot exceed ${max}`);
  }

  return null;
}

interface ValidateIntegerOptions {
  required?: boolean;
  min?: number;
  max?: number;
}

/**
 * Validate integer input within range
 * @param value The input string value
 * @param t Translation function for error messages
 * @param options Validation options (required, min, max)
 * @returns Error message or null if valid
 */
export function validateInteger(
  value: string,
  t: (key: string, defaultValue?: string) => string,
  options?: ValidateIntegerOptions
): string | null {
  const { required = true, min = 1, max } = options || {};

  if (!value?.trim()) {
    return required ? t('errors.fieldRequired', 'Field is required') : null;
  }

  const parsed = parseIntegerInput(value);
  if (parsed === null) {
    return t('errors.invalidNumber', 'Invalid number');
  }

  if (parsed < min || (max !== undefined && parsed > max)) {
    return t(
      'errors.valueOutOfRange',
      `Value must be between ${min} and ${max}`
    );
  }

  return null;
}

/**
 * Format number for display (with decimal places)
 * @param value The number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatMoneyForDisplay(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Safely convert string input to number for submission
 * Handles parsing errors gracefully
 * @param value The input string value
 * @param isInteger Whether to parse as integer (default: false)
 * @returns Number or null if invalid
 */
export function parseNumericInput(
  value: string,
  isInteger = false
): number | null {
  if (isInteger) {
    return parseIntegerInput(value);
  }
  return parseMoneyInput(value);
}
