import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Schedule examinations for a semester based on course offerings
   * This is a simplified implementation - in reality would involve complex scheduling algorithms
   */
  async scheduleExaminations(semesterId: string): Promise<any> {
    // Get semester with course offerings
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
      include: {
        courseOfferings: {
          include: {
            course: true,
            timetableSlots: {
              include: {
                timetable: true,
              },
            },
          },
        },
      },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found: ${semesterId}`);
    }

    // For now, return a placeholder response indicating the service is ready
    // In a full implementation, this would:
    // 1. Analyze course offerings and timetables to determine exam periods
    // 2. Schedule exams avoiding conflicts (same student having two exams at same time)
    // 3. Allocate venues based on expected student count and exam type
    // 4. Assign invigilators
    // 5. Create exam timetable
    return {
      message: 'Examination scheduling service ready - implement scheduling algorithm',
      semesterId,
      semesterLabel: semester.label,
      courseOfferingsCount: semester.courseOfferings.length,
      nextSteps: [
        'Implement examination scheduling algorithm',
        'Add venue allocation based on expected attendance',
        'Implement invigilator assignment',
        'Create examination timetable generation',
        'Add exam timetable approval workflow',
        'Implement exam results processing and grade calculation'
      ]
    };
  }

  /**
   * Process exam results for a course offering
   */
  async processExamResults(
    courseOfferingId: string,
    results: Array<{
      studentId: string;
      grade: string; // e.g., 'A', 'B+', 'F'
      gradePoint: number;
      marks?: number;
    }>
  ): Promise<any> {
    // Validate course offering exists
    const courseOffering = await this.prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: true,
        semester: true,
      },
    });

    if (!courseOffering) {
      throw new NotFoundException(`Course offering not found: ${courseOfferingId}`);
    }

    // Process each result
    const processedResults = [];
    for (const result of results) {
      // Validate student exists
      const student = await this.prisma.student.findUnique({
        where: { id: result.studentId },
      });

      if (!student) {
        throw new NotFoundException(`Student not found: ${result.studentId}`);
      }

      // Determine grade status based on grade
      let gradeStatus: 'PASS' | 'FAIL' | 'INCOMPLETE' | 'WITHDRAWN';
      // Simplified: assuming grades A-D are pass, F is fail
      // In reality, this would come from grading scheme
      const passGrades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
      if (passGrades.includes(result.grade)) {
        gradeStatus = 'PASS';
      } else if (result.grade === 'F') {
        gradeStatus = 'FAIL';
      } else {
        gradeStatus = 'INCOMPLETE'; // Default for other cases
      }

      // Create or update exam result
      const examResult = await this.prisma.examResult.upsert({
        where: {
          studentId_courseOfferingId: {
            studentId: result.studentId,
            courseOfferingId: courseOfferingId,
          },
        },
        update: {
          grade: result.grade,
          gradePoint: result.gradePoint,
          marks: result.marks,
          gradeStatus: gradeStatus,
          releasedAt: new Date(),
          releasedBy: 'SYSTEM', // In reality, would be the user who released
        },
        create: {
          studentId: result.studentId,
          courseOfferingId: courseOfferingId,
          courseId: courseOffering.courseId,
          grade: result.grade,
          gradePoint: result.gradePoint,
          marks: result.marks,
          gradeStatus: gradeStatus,
          releasedAt: new Date(),
          releasedBy: 'SYSTEM',
        },
      });

      processedResults.push(examResult);
    }

    return {
      message: `Processed ${processedResults.length} exam results for course offering ${courseOffering.course.code}`,
      courseOffering: {
        id: courseOffering.id,
        course: {
          id: courseOffering.course.id,
          code: courseOffering.course.code,
          name: courseOffering.course.name,
        },
        semester: {
          id: courseOffering.semester.id,
          label: courseOffering.semester.label,
        },
      },
      results: processedResults,
    };
  }

  /**
   * Generate grade reports for a student
   */
  async generateGradeReport(studentId: string): Promise<any> {
    // Get student with exam results
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        examResults: {
          include: {
            courseOffering: {
              include: {
                course: true,
                semester: true,
              },
            },
          },
          orderBy: {
            releasedAt: 'desc',
          },
        },
        academicPlan: {
          include: {
            semesters: {
              include: {
                plannedCourses: {
                  include: {
                    course: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${studentId}`);
    }

    // Calculate GPA and statistics
    let totalCredits = 0;
    let totalGradePoints = 0;
    let passedCourses = 0;
    let totalCourses = 0;

    const examResults = student.examResults.filter(
      result => result.releasedAt !== null
    );

    for (const result of examResults) {
      totalCourses++;
      if (result.gradeStatus === 'PASS') {
        passedCourses++;
        totalCredits += result.courseOffering.course.creditHours;
        totalGradePoints += (result.gradePoint || 0) * result.courseOffering.course.creditHours;
      }
    }

    const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    // Group results by semester
    const resultsBySemester = {};
    for (const result of examResults) {
      const semesterLabel = result.courseOffering.semester.label;
      if (!resultsBySemester[semesterLabel]) {
        resultsBySemester[semesterLabel] = [];
      }
      resultsBySemester[semesterLabel].push(result);
    }

    return {
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.user?.name || 'Unknown',
        email: student.user?.email || '',
      },
      gpa: Number(gpa.toFixed(2)),
      totalCreditsEarned: totalCredits,
      totalCoursesTaken: totalCourses,
      coursesPassed: passedCourses,
      passRate: totalCourses > 0 ? (passedCourses / totalCourses) * 100 : 0,
      resultsBySemester: Object.keys(resultsBySemester).map(semester => ({
        semester: semester,
        results: resultsBySemester[semester].map(result => ({
          courseCode: result.courseOffering.course.code,
          courseName: result.courseOffering.course.name,
          grade: result.grade,
          gradePoint: result.gradePoint,
          marks: result.marks,
          releasedAt: result.releasedAt,
        })),
      })),
      academicPlan: student.academicPlan ? {
        id: student.academicPlan.id,
        originalGraduation: student.academicPlan.originalGraduation,
        projectedGraduation: student.academicPlan.projectedGraduation,
        hasExtension: student.academicPlan.hasExtension,
        lastRevisedAt: student.academicPlan.lastRevisedAt,
      } : null,
    };
  }

  /**
   * Generate examination timetable for a semester
   */
  async generateExaminationTimetable(semesterId: string): Promise<any> {
    // Placeholder - in reality would:
    // 1. Determine exam periods based on teaching weeks
    // 2. Schedule exams for each course offering avoiding student conflicts
    // 3. Allocate venues and invigilators
    // 4. Create examination timetable entity
    return {
      message: 'Examination timetable generation service ready - implement algorithm',
      semesterId,
      nextSteps: [
        'Implement examination period determination',
        'Add conflict-free exam scheduling algorithm',
        'Implement venue allocation for exams',
        'Add invigilator assignment',
        'Create examination timetable entity',
        'Add examination timetable approval workflow'
      ]
    };
  }

  /**
   * Get examination timetable for a semester
   */
  async getExaminationTimetable(semesterId: string): Promise<any> {
    // Placeholder
    return {
      message: 'Examination timetable retrieval not yet implemented',
      semesterId,
    };
  }

  findAll() {
    return { module: 'M06 — Exam & Results', status: 'ready' };
  }
}