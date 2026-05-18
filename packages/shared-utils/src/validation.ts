/**
 * Validate a University student ID format (e.g., "University2025001").
 */
export function isValidStudentId(id: string): boolean {
  return /^University\d{7}$/.test(id);
}

/**
 * Validate a course code format (e.g., "COMP301", "MATH201").
 */
export function isValidCourseCode(code: string): boolean {
  return /^[A-Z]{3,6}\d{3,4}$/.test(code);
}

/**
 * Validate an intake anchor format (e.g., "202510").
 */
export function isValidIntakeAnchor(anchor: string): boolean {
  if (!/^\d{6}$/.test(anchor)) return false;
  const month = parseInt(anchor.substring(4, 6), 10);
  return [4, 7, 10].includes(month);
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate a semester label (e.g., "2026-S1").
 */
export function isValidSemesterLabel(label: string): boolean {
  return /^\d{4}-S[123]$/.test(label);
}
