import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M07 — Enrolment & Registration
 */
@Injectable()
export class EnrolmentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'M07 — Enrolment & Registration', status: 'ready' };
  }
}
