import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M05 — Venue & Resource Manager
 */
@Injectable()
export class VenueService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'M05 — Venue & Resource Manager', status: 'ready' };
  }
}
