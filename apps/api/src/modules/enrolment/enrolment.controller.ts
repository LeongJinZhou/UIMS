import { Controller, Get } from '@nestjs/common';
import { EnrolmentService } from './enrolment.service';

/**
 * M07 — Enrolment & Registration
 */
@Controller('enrolment')
export class EnrolmentController {
  constructor(private readonly enrolmentService: EnrolmentService) {}

  @Get()
  findAll() {
    return this.enrolmentService.findAll();
  }
}
