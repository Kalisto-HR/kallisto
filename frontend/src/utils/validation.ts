/**
 * validation.ts
 * Reusable client-side validation functions for form inputs.
 */

/**
 * Basic email regex pattern for validation.
 * Checks for: local@domain.tld format
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * UUID v4 regex pattern for validation.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates an email address.
 * @param email - The email string to validate
 * @returns Error message if invalid, null if valid
 */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return "Email is required";
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return "Please enter a valid email address";
  }
  return null;
}

/**
 * Validates that a field is not empty.
 * @param value - The value to check
 * @param fieldName - The name of the field for the error message
 * @returns Error message if empty, null if valid
 */
export function validateRequired(value: string, fieldName: string): string | null {
  if (!value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validates minimum length of a string.
 * @param value - The value to check
 * @param fieldName - The name of the field for the error message
 * @param min - Minimum required length
 * @returns Error message if too short, null if valid
 */
export function validateMinLength(value: string, fieldName: string, min: number): string | null {
  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  return null;
}

/**
 * Checks if a string is a valid UUID v4 format.
 * @param value - The string to check
 * @returns true if valid UUID, false otherwise
 */
export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}
