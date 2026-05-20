import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class MqaValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate MQA course structure for a programme version
   * Checks for:
   * - Credit hour limits per semester
   * - Prerequisite consistency
   * - Course availability
   * - Elective vs core course balance
   */
  async validateMqaStructure(programmeVersionId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get programme version with related data
    const programmeVersion = await this.prisma.programmeVersion.findUnique({
      where: { id: programmeVersionId },
      include: {
        programme: true,
        semesterPlans: {
          include: {
            courses: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!programmeVersion) {
      throw new BadRequestException(`Programme version not found: ${programmeVersionId}`);
    }

    // Validate each semester plan
    for (const semesterPlan of programmeVersion.semesterPlans) {
      const semesterErrors = await this.validateSemesterPlan(semesterPlan);
      errors.push(...semesterErrors.errors);
      warnings.push(...semesterErrors.warnings);
    }

    // Validate prerequisite relationships across semesters
    const prerequisiteErrors = await this.validatePrerequisites(
      programmeVersion.semesterPlans,
    );
    errors.push(...prerequisiteErrors);

    // Check for orphaned courses (courses in plan but not in programme)
    const orphanedErrors = await this.validateCourseMembership(
      programmeVersion,
    );
    errors.push(...orphanedErrors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single semester plan
   */
  private async validateSemesterPlan(
    semesterPlan: any,
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get all courses in this semester with their details
    const coursesWithDetails = await this.prisma.mqaPlanCourse.findMany({
      where: { semesterPlanId: semesterPlan.id },
      include: {
        course: true,
      },
    });

    // Calculate total credits
    const totalCredits = coursesWithDetails.reduce(
      (sum: number, planCourse: any) => sum + planCourse.course.creditHours,
      0,
    );

    // Check credit hour limits based on semester type
    // We need to determine if this is a long or short semester
    // For simplicity, we'll use alternating pattern or check against programme calendar
    const isLongSemester =
      semesterPlan.semesterNumber % 2 === 1; // Odd semesters = long
    const maxCredits = isLongSemester ? 20 : 10; // 20 for long, 10 for short
    const appealMaxCredits = isLongSemester ? 21 : 10; // With appeal

    if (totalCredits > appealMaxCredits) {
      errors.push(
        `Semester ${semesterPlan.semesterNumber} exceeds maximum credit hours (${
          totalCredits
        } > ${appealMaxCredits})`,
      );
    } else if (totalCredits > maxCredits) {
      warnings.push(
        `Semester ${semesterPlan.semesterNumber} exceeds standard credit hours (${
          totalCredits
        } > ${maxCredits}) - requires appeal`,
      );
    }

    // Check minimum credits (should have at least some courses)
    if (coursesWithDetails.length === 0) {
      errors.push(
        `Semester ${semesterPlan.semesterNumber} has no courses assigned`,
      );
    }

    // Validate elective balance (recommendation: max 50% electives)
    const electiveCount = coursesWithDetails.filter(
      (pc: any) => pc.isElective,
    ).length;
    const totalCourses = coursesWithDetails.length;
    const electiveRatio =
      totalCourses > 0 ? electiveCount / totalCourses : 0;

    if (electiveRatio > 0.5) {
      warnings.push(
        `Semester ${semesterPlan.semesterNumber} has high elective ratio (${
          (electiveRatio * 100).toFixed(1)
        }%)`,
      );
    }

    return { errors, warnings };
  }

  /**
   * Validate prerequisite relationships
   */
  private async validatePrerequisites(
    semesterPlans: any[],
  ): Promise<string[]> {
    const errors: string[] = [];

    // Build a map of available courses by semester
    const availableCoursesBySemester = new Map();

    for (const semesterPlan of semesterPlans) {
      const courses = await this.prisma.mqaPlanCourse.findMany({
        where: { semesterPlanId: semesterPlan.id },
        include: {
          course: true,
        },
      });

      const courseCodes = courses.map((pc: any) => pc.course.code);
      availableCoursesBySemester.set(
        semesterPlan.semesterNumber,
        new Set(courseCodes),
      );
    }

    // Check each course's prerequisites
    for (const semesterPlan of semesterPlans) {
      const courses = await this.prisma.mqaPlanCourse.findMany({
        where: { semesterPlanId: semesterPlan.id },
        include: {
          course: {
            include: {
              prerequisites: {
                include: {
                  prerequisiteCourse: true,
                },
              },
            },
          },
        },
      });

      for (const planCourse of courses) {
        const course = planCourse.course;
        for (const prerequisite of course.prerequisites) {
          const prereqCourse = prerequisite.prerequisiteCourse;

          // Find which semester the prerequisite course is in
          let prereqSemester = null;
          for (const [semesterNum, courseSet] of
            availableCoursesBySemester.entries()) {
            if (courseSet.has(prereqCourse.code)) {
              prereqSemester = semesterNum;
              break;
            }
          }

          // If prerequisite course is not found in any semester, error
          if (prereqSemester === null) {
            errors.push(
              `Prerequisite course ${prereqCourse.code} for course ${course.code} not found in any semester`,
            );
            continue;
          }

          // If prerequisite is in same or later semester, error (should be in earlier semester)
          if (prereqSemester >= semesterPlan.semesterNumber) {
            errors.push(
              `Prerequisite course ${prereqCourse.code} (semester ${prereqSemester}) must be completed before course ${course.code} (semester ${semesterPlan.semesterNumber})`,
            );
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate that all courses in the plan belong to the programme
   */
  private async validateCourseMembership(
    programmeVersion: any,
  ): Promise<string[]> {
    const errors: string[] = [];

    // Get all courses that belong to this programme
    const programmeCourses = await this.prisma.course.findMany({
      where: { programmeId: programmeVersion.programmeId },
      select: { id: true, code: true },
    });

    const programmeCourseIds = new Set(
      programmeCourses.map((c: any) => c.id),
    );

    // Check each semester plan for courses not belonging to the programme
    for (const semesterPlan of programmeVersion.semesterPlans) {
      const planCourses = await this.prisma.mqaPlanCourse.findMany({
        where: { semesterPlanId: semesterPlan.id },
        include: {
          course: true,
        },
      });

      for (const planCourse of planCourses) {
        if (!programmeCourseIds.has(planCourse.course.id)) {
          errors.push(
            `Course ${planCourse.course.code} in semester ${semesterPlan.semesterNumber} does not belong to programme ${programmeVersion.programme.code}`,
          );
        }
      }
    }

    return errors;
  }

  /**
   * Validate that all required core courses are present
   */
  private async validateRequiredCourses(
    programmeVersion: any,
  ): Promise<string[]> {
    const errors: string[] = [];

    // Get all mandatory courses (non-elective) that should be in the plan
    // This would typically come from MQA requirements
    // For now, we'll skip this as it requires more specific MQA data
    // In a real implementation, this would check against MQA-mandated courses

    return errors;
  }

  /**
   * Get validation summary for display
   */
  async getValidationSummary(
    programmeVersionId: string,
  ): Promise<any> {
    const validationResult = await this.validateMqaStructure(
      programmeVersionId,
    );

    // Get additional statistics
    const programmeVersion = await this.prisma.programmeVersion.findUnique({
      where: { id: programmeVersionId },
      include: {
        programme: true,
        semesterPlans: {
          include: {
            courses: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!programmeVersion) {
      throw new BadRequestException(`Programme version not found: ${programmeVersionId}`);
    }

    const totalSemesters = programmeVersion.semesterPlans.length;
    let totalCourses = 0;
    let totalCredits = 0;

    for (const semesterPlan of (programmeVersion.semesterPlans as any[])) {
      const coursesCount = await this.prisma.mqaPlanCourse.count({
        where: { semesterPlanId: semesterPlan.id },
      });
      totalCourses += coursesCount;

      const planCourses = await this.prisma.mqaPlanCourse.findMany({
        where: { semesterPlanId: semesterPlan.id },
        include: {
          course: true,
        },
      });
      totalCredits += planCourses.reduce((sum: number, pc: any) => sum + (pc.course?.creditHours || 0), 0);
    }

    return {
      programme: {
        id: programmeVersion.programme.id,
        code: programmeVersion.programme.code,
        name: programmeVersion.programme.name,
        version: programmeVersion.version,
      },
      validation: validationResult,
      statistics: {
        totalSemesters,
        totalCourses,
        totalCredits,
        averageCreditsPerSemester:
          totalSemesters > 0 ? totalCredits / totalSemesters : 0,
      },
    };
  }
}