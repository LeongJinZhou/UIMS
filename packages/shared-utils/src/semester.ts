import { ACADEMIC_CALENDAR, SEMESTERS_PER_YEAR } from '@uims/shared-constants';

/**
 * Convert an intake anchor (e.g., "202510") to a structured semester reference.
 * Format: YYYYMM where MM is intake month (04=April, 07=July, 10=October).
 */
export function parseIntakeAnchor(anchor: string): {
  year: number;
  month: number;
  startingSemester: 'SEMESTER_1' | 'SEMESTER_2' | 'SEMESTER_3';
} {
  const year = parseInt(anchor.substring(0, 4), 10);
  const month = parseInt(anchor.substring(4, 6), 10);

  let startingSemester: 'SEMESTER_1' | 'SEMESTER_2' | 'SEMESTER_3';

  if (month === 10 || month === 11) {
    startingSemester = 'SEMESTER_1'; // October intake → starts Semester 1 (Nov)
  } else if (month === 4) {
    startingSemester = 'SEMESTER_2'; // April intake → starts Semester 2 (Apr)
  } else if (month === 7) {
    startingSemester = 'SEMESTER_3'; // July intake → starts Semester 3 (Jul)
  } else {
    throw new Error(`Invalid intake month: ${month}. Must be 4, 7, or 10.`);
  }

  return { year, month, startingSemester };
}

/**
 * Map an MQA plan semester position to a real calendar semester.
 * Semester positions are 1-indexed from the student's intake.
 */
export function mapSemesterToCalendar(
  intakeAnchor: string,
  semesterPosition: number,
): {
  year: number;
  semesterName: string;
  semesterType: 'LONG' | 'SHORT';
  label: string; // e.g., "2026-S2"
} {
  const { year, startingSemester } = parseIntakeAnchor(intakeAnchor);

  const semesterOrder = ['SEMESTER_1', 'SEMESTER_2', 'SEMESTER_3'] as const;
  const startIndex = semesterOrder.indexOf(startingSemester);

  // Calculate which calendar semester this maps to
  const absoluteIndex = startIndex + (semesterPosition - 1);
  const cycleOffset = Math.floor(absoluteIndex / SEMESTERS_PER_YEAR);
  const semesterIndex = absoluteIndex % SEMESTERS_PER_YEAR;

  const semesterKey = semesterOrder[semesterIndex];
  const semester = ACADEMIC_CALENDAR[semesterKey];

  // Calculate the actual year — depends on the semester's start month
  let calendarYear = year + cycleOffset;
  if (semesterKey === 'SEMESTER_1' && startIndex > 0) {
    // Semester 1 starts in November — may need year adjustment
    calendarYear = year + cycleOffset;
  }

  return {
    year: calendarYear,
    semesterName: semester.name,
    semesterType: semester.type,
    label: `${calendarYear}-S${semesterIndex + 1}`,
  };
}

/**
 * Get the next calendar semester after a given one.
 */
export function getNextSemester(currentLabel: string): string {
  const match = currentLabel.match(/^(\d{4})-S(\d)$/);
  if (!match) throw new Error(`Invalid semester label: ${currentLabel}`);

  const year = parseInt(match[1], 10);
  const semNum = parseInt(match[2], 10);

  if (semNum < SEMESTERS_PER_YEAR) {
    return `${year}-S${semNum + 1}`;
  }
  return `${year + 1}-S1`;
}
