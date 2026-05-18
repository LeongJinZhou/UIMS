import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { StudentService } from './student.service';

/**
 * M02 — Student Academic Profile
 */
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  findAll() {
    return this.studentService.findAll();
  }

  @Post(':studentId/generate-plan')
  async generateAcademicPlan(@Param('studentId') studentId: string) {
    return this.studentService.generateAcademicPlan(studentId);
  }

  @Get(':studentId/plan')
  async getAcademicPlan(@Param('studentId') studentId: string) {
    // First get the student to verify they exist, then get their plan
    const student = await this.studentService['prisma'].student.findUnique({
      where: { id: studentId },
      include: {
        academicPlan: true,
      },
    });

    if (!student) {
      throw new Error(`Student not found: ${studentId}`);
    }

    if (!student.academicPlan) {
      return { message: 'No academic plan found for this student' };
    }

    return this.studentService.getAcademicPlanDetails(student.academicPlan.id);
  }

  @Post(':studentId/fail-course')
  async handleCourseFailure(
    @Param('studentId') studentId: string,
    @Body() body: { courseId: string; failedSemesterNumber: number }
  ) {
    return this.studentService.handleCourseFailure(
      studentId,
      body.courseId,
      body.failedSemesterNumber
    );
  }
}
