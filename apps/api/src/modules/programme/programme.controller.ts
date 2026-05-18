import { Controller, Get } from '@nestjs/common';
import { ProgrammeService } from './programme.service';

/**
 * M01 — Programme & MQA Repository
 */
@Controller('programme')
export class ProgrammeController {
  constructor(private readonly programmeService: ProgrammeService) {}

  @Get()
  findAll() {
    return this.programmeService.findAll();
  }
}
