import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async createSession(userId: string): Promise<{ token: string; expiresIn: number }> {
    // Generate JWT token
    const payload = { sub: userId };
    const token = this.jwtService.sign(payload, { expiresIn: '1h' }); // 1 hour expiration

    // Calculate expiration time (1 hour from now)
    const expiresIn = 3600; // 1 hour in seconds

    // Save session to database
    await this.prisma.session.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    return { token, expiresIn };
  }

  async validateSession(token: string): Promise<any> {
    // Check if token exists in database and is not expired
    const session = await this.prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() }, // Not expired
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Verify JWT token
    try {
      const payload = this.jwtService.verify(token);
      return { user: session.user, ...payload };
    } catch (error) {
      // If JWT verification fails, remove invalid session from database
      await this.prisma.session.delete({
        where: { token },
      });
      throw new UnauthorizedException('Invalid session token');
    }
  }

  async invalidateSession(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { token },
    });
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() }, // Expired sessions
      },
    });
    return result.count;
  }
}