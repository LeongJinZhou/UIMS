import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProgrammeController } from './programme.controller';
import { ProgrammeService } from './programme.service';
import { MqaValidationService } from './validation/mqa-validation.service';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [ProgrammeController],
  providers: [ProgrammeService, MqaValidationService],
  exports: [ProgrammeService, MqaValidationService],
})
export class ProgrammeModule {}
