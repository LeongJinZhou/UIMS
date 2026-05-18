import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Authentication & RBAC
 */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return { module: 'Authentication & RBAC', status: 'ready' };
  }
}
