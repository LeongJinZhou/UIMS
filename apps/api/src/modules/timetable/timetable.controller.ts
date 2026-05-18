import { Controller, Get } from '@nestjs/common';
import { TimetableService } from './timetable.service';

/**
 * M04 — Timetable Generator
 */
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get()
  findAll() {
    return this.timetableService.findAll();
  }
}
