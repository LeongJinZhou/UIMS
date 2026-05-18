import { CREDIT_LIMITS } from '@uims/shared-constants';

/**
 * Get the credit limit for a given semester type and whether an overload appeal is approved.
 */
export function getCreditLimit(
  semesterType: 'LONG' | 'SHORT',
  hasOverloadApproval: boolean = false,
): number {
  if (semesterType === 'SHORT') {
    return CREDIT_LIMITS.SHORT_SEMESTER;
  }
  return hasOverloadApproval
    ? CREDIT_LIMITS.LONG_SEMESTER_OVERLOAD
    : CREDIT_LIMITS.LONG_SEMESTER;
}

/**
 * Calculate available credit headroom in a semester.
 */
export function calculateCreditHeadroom(
  semesterType: 'LONG' | 'SHORT',
  currentCredits: number,
  hasOverloadApproval: boolean = false,
): number {
  const limit = getCreditLimit(semesterType, hasOverloadApproval);
  return Math.max(0, limit - currentCredits);
}

/**
 * Check if adding a course would exceed the credit limit.
 */
export function wouldExceedCreditLimit(
  semesterType: 'LONG' | 'SHORT',
  currentCredits: number,
  additionalCredits: number,
  hasOverloadApproval: boolean = false,
): boolean {
  const limit = getCreditLimit(semesterType, hasOverloadApproval);
  return (currentCredits + additionalCredits) > limit;
}
