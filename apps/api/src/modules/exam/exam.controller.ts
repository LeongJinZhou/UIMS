import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ExamService } from './exam.service';

/**
 * M06 — Exam & Results
 */
@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Get()
  findAll() {
    return this.examService.findAll();
  }

  @Post(':semesterId/schedule')
  async scheduleExaminations(@Param('semesterId') semesterId: string) {
    return this.examService.scheduleExaminations(semesterId);
  }

  @Post(':courseOfferingId/results')
  async processExamResults(
    @Param('courseOfferingId') courseOfferingId: string,
    @Body() results: Array<{
      studentId: string;
      grade: string;
      gradePoint: number;
      marks?: number;
    }>
  ) {
    return this.examService.processExamResults(courseOfferingId, results);
  }

  @Get(':studentId/report')
  async generateGradeReport(@Param('studentId') studentId: string) {
    return this.examService.generateGradeReport(studentId);
  }

  @Post(':semesterId/exam-timetable')
  async generateExaminationTimetable(@Param('semesterId') semesterId: string) {
    return this.examService.generateExaminationTimetable(semesterId);
  }

  @Get(':semesterId/exam-timetable')
  async getExaminationTimetable(@Param('semesterId') semesterId: string) {
    return this.examService.getExaminationTimetable(semesterId);
  }
}
