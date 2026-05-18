import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M03 — Course & Prerequisite Engine
 */
@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'M03 — Course & Prerequisite Engine', status: 'ready' };
  }
}
