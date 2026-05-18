import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M01 — Programme & MQA Repository
 */
@Injectable()
export class ProgrammeService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'M01 — Programme & MQA Repository', status: 'ready' };
  }
}
