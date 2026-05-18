import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M10 — Notifications & Appeals
 */
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'M10 — Notifications & Appeals', status: 'ready' };
  }
}
