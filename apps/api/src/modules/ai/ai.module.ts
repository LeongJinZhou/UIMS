import { Module } from '@nestjs/common';
import { AtRiskStudentService } from './at-risk-student.service';
import { AcademicChatbotService } from './academic-chatbot.service';

@Module({
  providers: [AtRiskStudentService, AcademicChatbotService],
  exports: [AtRiskStudentService, AcademicChatbotService],
})
export class AiModule {}