import { Controller, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Authentication & RBAC
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  findAll() {
    return this.authService.findAll();
  }
}
