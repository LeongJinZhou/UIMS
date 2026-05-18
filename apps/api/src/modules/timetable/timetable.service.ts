import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M04 — Timetable Generator
 */
@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'M04 — Timetable Generator', status: 'ready' };
  }
}
