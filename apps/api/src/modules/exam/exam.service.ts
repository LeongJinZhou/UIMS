import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M06 — Exam & Results
 */
@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'M06 — Exam & Results', status: 'ready' };
  }
}
