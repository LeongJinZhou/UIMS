import { Controller, Get } from '@nestjs/common';
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
}
