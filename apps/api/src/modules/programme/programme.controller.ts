import { Controller, Get, Post, Body, UploadedFile, UseInterceptors, Param } from '@nestjs/common';
import { ProgrammeService } from './programme.service';
import { MqaValidationService } from './validation/mqa-validation.service';
import { FileInterceptor } from '@nestjs/platform-express';

/**
 * M01 — Programme & MQA Repository
 */
@Controller('programme')
export class ProgrammeController {
  constructor(
    private readonly programmeService: ProgrammeService,
    private readonly mqaValidationService: MqaValidationService,
  ) {}

  @Get()
  findAll() {
    return this.programmeService.findAll();
  }

  @Post('import-mqa')
  @UseInterceptors(FileInterceptor('file'))
  async importMqaCourseStructure(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    // Save file temporarily
    const filePath = `/tmp/${file.originalname}`;
    // In a real implementation, you would save the file and then process it
    // For now, we'll return a placeholder response
    return {
      message: 'File upload endpoint ready - implement file saving and processing',
      filename: file.originalname,
      size: file.size,
    };
  }

  @Get(':versionId/validate')
  async validateMqaStructure(@Param('versionId') versionId: string) {
    return this.mqaValidationService.getValidationSummary(versionId);
  }

  @Get(':versionId/structure')
  async getProgrammeStructure(@Param('versionId') versionId: string) {
    return this.programmeService.getProgrammeStructure(versionId);
  }

  @Get(':versionId/semester/:semesterNumber')
  async getSemesterDetails(
    @Param('versionId') versionId: string,
    @Param('semesterNumber') semesterNumber: number,
  ) {
    return this.programmeService.getSemesterDetails(versionId, semesterNumber);
  }
}
