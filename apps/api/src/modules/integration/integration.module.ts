import { Module } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { ProgrammeModule } from '../programme/programme.module';
import { TimetableModule } from '../timetable/timetable.module';
import { ExamModule } from '../exam/exam.module';
import { StudentModule } from '../student/student.module';

@Module({
  imports: [ProgrammeModule, TimetableModule, ExamModule, StudentModule],
  providers: [IntegrationService],
  exports: [IntegrationService],
})
export class IntegrationModule {}