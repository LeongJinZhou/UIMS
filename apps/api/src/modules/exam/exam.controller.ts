import { Controller, Get } from '@nestjs/common';
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
}
