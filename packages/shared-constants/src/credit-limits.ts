// ============================================
// Credit Limit Rules (Section 6.5 of Blueprint)
// ============================================

/** Maximum credit hours per semester type */
export const CREDIT_LIMITS = {
  /** Long Semester (Nov→Apr or Apr→Jul) */
  LONG_SEMESTER: 20,

  /** Short Semester (Jul→Nov) */
  SHORT_SEMESTER: 10,

  /** Long Semester with approved overload appeal */
  LONG_SEMESTER_OVERLOAD: 21,

  /** Minimum credit hours to remain enrolled */
  MINIMUM_PER_SEMESTER: 3,
} as const;

/** Extension semester follows its calendar type */
export const EXTENSION_CREDIT_LIMIT = {
  LONG: CREDIT_LIMITS.LONG_SEMESTER,
  SHORT: CREDIT_LIMITS.SHORT_SEMESTER,
} as const;
