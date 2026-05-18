import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M08 — HR & Lecturer Management
 */
@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'M08 — HR & Lecturer Management', status: 'ready' };
  }
}
