import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M02 — Student Academic Profile
 */
@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'M02 — Student Academic Profile', status: 'ready' };
  }
}
