import { Controller, Get, Post, Body, UseGuards, Request, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { SessionService } from '../session/session.service';

/**
 * Authentication & RBAC
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    const loginResult = await this.authService.login(req.user);
    // Create session and return token
    const session = await this.sessionService.createSession(req.user.id);
    return { ...loginResult, ...session };
  }

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await this.sessionService.invalidateSession(token);
    }
    return { message: 'Logged out successfully' };
  }

  @Get()
  findAll() {
    return this.authService.findAll();
  }
}
