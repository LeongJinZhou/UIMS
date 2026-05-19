import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { ProgrammeModule } from './modules/programme/programme.module';
import { StudentModule } from './modules/student/student.module';
import { CourseModule } from './modules/course/course.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { VenueModule } from './modules/venue/venue.module';
import { ExamModule } from './modules/exam/exam.module';
import { EnrolmentModule } = from './modules/enrolment/enrolment.module';
import { HrModule } from './modules/hr/hr.module';
import { FinanceModule } from './modules/finance/finance.module';
import { NotificationModule } = from './modules/notification/notification.module';
import { IntegrationModule } from './modules/integration/integration.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Database
    DatabaseModule,

    // Feature modules (M01–M10)
    AuthModule,
    ProgrammeModule,       // M01
    StudentModule,         // M02
    CourseModule,           // M03
    TimetableModule,       // M04
    VenueModule,           // M05
    ExamModule,            // M06
    EnrolmentModule,       // M07
    HrModule,              // M08
    FinanceModule,         // M09
    NotificationModule,    // M10
    IntegrationModule,     // M11 - Integration Service
  ],
})
export class AppModule {}
