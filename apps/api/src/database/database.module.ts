import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Database module — provides PrismaService globally.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
