import { Controller, Get } from '@nestjs/common';
import { HrService } from './hr.service';

/**
 * M08 — HR & Lecturer Management
 */
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get()
  findAll() {
    return this.hrService.findAll();
  }
}
