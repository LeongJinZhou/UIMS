import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M09 — Finance & Fees
 */
@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'M09 — Finance & Fees', status: 'ready' };
  }
}
