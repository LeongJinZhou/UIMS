import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProgrammeService } from '../programme/programme.service';
import { TimetableService } from '../timetable/timetable.service';
import { ExamService } from '../exam/exam.service';
import { StudentService } from '../student/student.service';

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly programmeService: ProgrammeService,
    private readonly timetableService: TimetableService,
    private readonly examService: ExamService,
    private readonly studentService: StudentService,
  ) {}

  /**
   * Handle course offering changes - propagate to timetable and exam modules
   * Called when course offerings are created, updated, or deleted
   */
  async handleCourseOfferingChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    courseOfferingId: string,
  ): Promise<void> {
    // Get the course offering with related data
    const courseOffering = await this.prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: true,
        semester: true,
        lecturer: true,
      },
    });

    if (!courseOffering) {
      throw new NotFoundException(`Course offering not found: ${courseOfferingId}`);
    }

    // Notify timetable module of potential impact
    await this.timetableService.handleCourseOfferingChange(
      operation,
      courseOffering,
    );

    // Notify exam module of potential impact
    await this.examService.handleCourseOfferingChange(
      operation,
      courseOffering,
    );

    // Notify student module of potential impact on academic plans
    await this.studentService.handleCourseOfferingChange(
      operation,
      courseOffering,
    );
  }

  /**
   * Handle semester changes - propagate to all related modules
   * Called when semester data is updated
   */
  async handleSemesterChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    semesterId: string,
  ): Promise<void> {
    // Get the semester with related data
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
      include: {
        offerings: {
          include: {
            course: true,
            lecturer: true,
            sections: true,
          },
        },
      },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found: ${semesterId}`);
    }

    // Notify timetable module
    await this.timetableService.handleSemesterChange(operation, semester);

    // Notify exam module
    await this.examService.handleSemesterChange(operation, semester);

    // Notify student module
    await this.studentService.handleSemesterChange(operation, semester);
  }

  /**
   * Handle student enrolment changes - update progress tracking
   */
  async handleEnrolmentChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    enrolmentId: string,
  ): Promise<void> {
    // Get the enrolment with related data
    const enrolment = await this.prisma.enrolment.findUnique({
      where: { id: enrolmentId },
      include: {
        student: true,
        courseOffering: {
          include: {
            course: true,
            semester: true,
          },
        },
        section: true,
      },
    });

    if (!enrolment) {
      throw new NotFoundException(`Enrolment not found: ${enrolmentId}`);
    }

    // Update student progress based on new enrolment/exam results
    await this.studentService.updateStudentProgress(enrolment.studentId);
  }

  /**
   * Handle exam results changes - update student progress and academic plans
   */
  async handleExamResultsChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    examResultId: string,
  ): Promise<void> {
    // Get the exam result with related data
    const examResult = await this.prisma.examResult.findUnique({
      where: { id: examResultId },
      include: {
        student: true,
        courseOffering: {
          include: {
            course: true,
            semester: true,
          },
        },
      },
    });

    if (!examResult) {
      throw new NotFoundException(`Exam result not found: ${examResultId}`);
    }

    // Update student progress based on exam results
    await this.studentService.updateStudentProgress(examResult.studentId);
  }

  /**
   * Synchronize data between modules when needed
   * This can be called periodically or triggered by specific events
   */
  async synchronizeModuleData(): Promise<void> {
    // Ensure all modules have consistent data
    // This is a placeholder for a more comprehensive synchronization mechanism

    // For now, we'll just log that synchronization occurred
    console.log('Module data synchronization completed at', new Date().toISOString());
  }
}