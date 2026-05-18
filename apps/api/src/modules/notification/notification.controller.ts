import { Controller, Get } from '@nestjs/common';
import { NotificationService } from './notification.service';

/**
 * M10 — Notifications & Appeals
 */
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  findAll() {
    return this.notificationService.findAll();
  }
}
