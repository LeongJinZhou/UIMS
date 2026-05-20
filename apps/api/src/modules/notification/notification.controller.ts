import { Controller, Get, Post, Body, Param } from '@nestjs/common';
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

  @Post('send')
  async sendNotification(@Body() body: {
    recipientId: string;
    title: string;
    body: string;
    channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[];
    data?: Record<string, any>;
  }) {
    return this.notificationService.sendNotification(body);
  }

  @Get('list')
  async getNotifications(
    @Body() filters: {
      userId: string;
      isRead?: boolean;
      channel?: string;
      startDate?: string; // ISO date string
      endDate?: string; // ISO date string
    }
  ) {
    // Convert string dates to Date objects if provided
    const processedFilters = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };
    return this.notificationService.getNotifications(processedFilters.userId, processedFilters);
  }

  @Post('mark-as-read/:notificationId')
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @Body() body: {
      userId: string;
    }
  ) {
    return this.notificationService.markAsRead(notificationId, body.userId);
  }

  @Post('mark-all-read')
  async markAllAsRead(@Body() body: {
    userId: string;
  }) {
    return this.notificationService.markAllAsRead(body.userId);
  }

  @Get('unread-count/:userId')
  async getUnreadCount(@Param('userId') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Post('template')
  async createTemplate(@Body() body: {
    code: string;
    title: string;
    body: string;
    channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
    description?: string;
  }) {
    return this.notificationService.createTemplate(body);
  }

  @Get('template/:identifier')
  async getTemplate(
    @Param('identifier') identifier: string,
    @Body() query: {
      byCode?: boolean;
    } = {}
  ) {
    return this.notificationService.getTemplate(identifier, !!query.byCode);
  }

  @Post('template/:id/update')
  async updateTemplate(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      body?: string;
      channel?: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
      description?: string;
    }
  ) {
    return this.notificationService.updateTemplate(id, body);
  }

  @Post('template/:id/delete')
  async deleteTemplate(@Param('id') id: string) {
    return this.notificationService.deleteTemplate(id);
  }

  @Post('send-templated')
  async sendTemplatedNotification(@Body() body: {
    recipientId: string;
    templateCode: string;
    channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
    templateData?: Record<string, any>;
  }) {
    return this.notificationService.sendTemplatedNotification(body);
  }

  // Appeal Management Endpoints
  @Post('appeals')
  async createAppeal(@Body() body: {
    studentId: string;
    appealType: string;
    semesterId: string;
    reason: string;
    supportingDocuments?: string[];
  }) {
    return this.notificationService.createAppeal(body);
  }

  @Get('appeals/:appealId')
  async getAppeal(@Param('appealId') appealId: string) {
    return this.notificationService.getAppeal(appealId);
  }

  @Get('appeals')
  async getAppeals(
    @Body() filters: {
      studentId?: string;
      appealType?: string;
      semesterId?: string;
      status?: string;
    } = {}
  ) {
    return this.notificationService.getAppeals(filters);
  }

  @Post('appeals/:appealId/update')
  async updateAppeal(
    @Param('appealId') appealId: string,
    @Body() body: {
      appealType?: string;
      semesterId?: string;
      reason?: string;
      supportingDocuments?: string[];
      status?: string;
      reviewedBy?: string;
      approvedBy?: string;
      aiAssessment?: Record<string, any>;
    }
  ) {
    return this.notificationService.updateAppeal(appealId, body);
  }

  @Post('appeals/:appealId/documents')
  async addSupportingDocuments(
    @Param('appealId') appealId: string,
    @Body() body: {
      documentUrls: string[];
    }
  ) {
    return this.notificationService.addSupportingDocuments(appealId, body.documentUrls);
  }

  @Get('appeals/analytics')
  async getAppealAnalytics(
    @Body() filters: {
      appealType?: string;
      semesterId?: string;
      dateStart?: string; // ISO date string
      dateEnd?: string; // ISO date string
    } = {}
  ) {
    // Convert string dates to Date objects if provided
    const processedFilters = {
      ...filters,
      dateStart: filters.dateStart ? new Date(filters.dateStart) : undefined,
      dateEnd: filters.dateEnd ? new Date(filters.dateEnd) : undefined,
    };
    return this.notificationService.getAppealAnalytics(processedFilters);
  }
}
