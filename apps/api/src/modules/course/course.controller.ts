import { Controller, Get } from '@nestjs/common';
import { CourseService } from './course.service';

/**
 * M03 — Course & Prerequisite Engine
 */
@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  findAll() {
    return this.courseService.findAll();
  }
}
