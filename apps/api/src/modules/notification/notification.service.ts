import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * M10 — Notifications & Appeals
 */
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a notification to a user via specified channels
   */
  async sendNotification(
    data: {
      recipientId: string;
      title: string;
      body: string;
      channels: ('EMAIL' | 'SMS' | 'PUSH' | 'IN_APP')[];
      data?: Record<string, any>; // Optional additional data
    }
  ): Promise<any> {
    // Validate recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: data.recipientId },
    });

    if (!recipient) {
      throw new NotFoundException(`Recipient not found: ${data.recipientId}`);
    }

    // Create notification record
    const notification = await this.prisma.notification.create({
      data: {
        recipientId: data.recipientId,
        title: data.title,
        body: data.body,
        channel: data.channels[0], // For simplicity, we store the first channel; in reality, we might create multiple records or have a different schema
        data: data.data,
        isRead: false,
      },
    });

    // In a real implementation, we would send the notification via the respective channels
    // For now, we just record it and return the notification
    // We would typically have separate services for each channel (email, sms, push) that we call here

    // For each channel, we would call the appropriate service
    // Example:
    // if (data.channels.includes('EMAIL')) {
    //   await this.emailService.sendEmail(...);
    // }
    // ... and so on for SMS, PUSH, etc.

    // Since we don't have those services implemented, we'll just return the notification
    // and note that in a real system, the sending would happen here.

    return {
      id: notification.id,
      recipientId: notification.recipientId,
      title: notification.title,
      body: notification.body,
      channel: notification.channel,
      data: notification.data,
      isRead: notification.isRead,
      sentAt: notification.sentAt,
    };
  }

  /**
   * Get notifications for a user with optional filtering
   */
  async getNotifications(
    userId: string,
    filters: {
      isRead?: boolean;
      channel?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<any> {
    const { isRead, channel, startDate, endDate } = filters;

    const whereClause: any = { recipientId: userId };
    if (isRead !== undefined) whereClause.isRead = isRead;
    if (channel) whereClause.channel = channel;
    if (startDate) whereClause.sentAt = { gte: startDate };
    if (endDate) {
      if (whereClause.sentAt) {
        whereClause.sentAt.lte = endDate;
      } else {
        whereClause.sentAt = { lte: endDate };
      }
    }

    const notifications = await this.prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        sentAt: 'desc',
      },
      include: {
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return notifications;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<any> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification not found or access denied: ${notificationId}`);
    }

    const updatedNotification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return updatedNotification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<any> {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });

    return count;
  }

  /**
   * Create a notification template
   */
  async createTemplate(
    data: {
      code: string; // Unique identifier for the template
      title: string;
      body: string;
      channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
      description?: string;
    }
  ): Promise<any> {
    // Check if template with this code already exists
    const existing = await this.prisma.notificationTemplate.findFirst({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException(`Template with code ${data.code} already exists`);
    }

    const template = await this.prisma.notificationTemplate.create({
      data: {
        code: data.code,
        title: data.title,
        body: data.body,
        channel: data.channel,
        description: data.description,
      },
    });

    return template;
  }

  /**
   * Get a notification template by ID or code
   */
  async getTemplate(identifier: string, byCode: boolean = false): Promise<any> {
    let template;

    if (byCode) {
      template = await this.prisma.notificationTemplate.findFirst({
        where: { code: identifier },
      });
    } else {
      template = await this.prisma.notificationTemplate.findUnique({
        where: { id: identifier },
      });
    }

    if (!template) {
      throw new NotFoundException(`Template not found: ${identifier}`);
    }

    return template;
  }

  /**
   * Update a notification template
   */
  async updateTemplate(
    id: string,
    data: {
      title?: string;
      body?: string;
      channel?: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
      description?: string;
    }
  ): Promise<any> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    const updatedTemplate = await this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        title: data.title,
        body: data.body,
        channel: data.channel,
        description: data.description,
      },
    });

    return updatedTemplate;
  }

  /**
   * Delete a notification template
   */
  async deleteTemplate(id: string): Promise<any> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    await this.prisma.notificationTemplate.delete({
      where: { id },
    });

    return { message: 'Template deleted successfully' };
  }

  /**
   * Send a templated notification
   */
  async sendTemplatedNotification(
    data: {
      recipientId: string;
      templateCode: string;
      channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
      templateData?: Record<string, any>; // Data to replace in the template
    }
  ): Promise<any> {
    // Get the template
    const template = await this.getTemplate(data.templateCode, true);

    // Replace placeholders in the template with actual data
    let title = template.title;
    let body = template.body;

    if (data.templateData) {
      for (const [key, value] of Object.entries(data.templateData)) {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, 'g'), String(value));
        body = body.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    // Send the notification
    return this.sendNotification({
      recipientId: data.recipientId,
      title,
      body,
      channels: [data.channel],
    });
  }

  /**
   * Appeal Management Methods
   */

  /**
   * Create a new appeal
   */
  async createAppeal(
    data: {
      studentId: string;
      appealType: string;
      semesterId: string;
      reason: string;
      supportingDocuments?: string[]; // Array of document URLs or IDs
    }
  ): Promise<any> {
    // Validate student exists
    const student = await this.prisma.student.findUnique({
      where: { id: data.studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student not found: ${data.studentId}`);
    }

    // Validate semester exists
    const semester = await this.prisma.semester.findUnique({
      where: { id: data.semesterId },
    });

    if (!semester) {
      throw new NotFoundException(`Semester not found: ${data.semesterId}`);
    }

    // Create appeal
    const appeal = await this.prisma.appeal.create({
      data: {
        studentId: data.studentId,
        appealType: data.appealType as any, // Map to enum
        semesterId: data.semesterId,
        reason: data.reason,
        supportingDocuments: data.supportingDocuments || [],
        status: 'PENDING',
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    return appeal;
  }

  /**
   * Get an appeal by ID
   */
  async getAppeal(appealId: string): Promise<any> {
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal not found: ${appealId}`);
    }

    return appeal;
  }

  /**
   * Get appeals with optional filtering
   */
  async getAppeals(filters: {
    studentId?: string;
    appealType?: string;
    semesterId?: string;
    status?: string;
  } = {}): Promise<any> {
    const { studentId, appealType, semesterId, status } = filters;

    const whereClause: any = {};
    if (studentId) whereClause.studentId = studentId;
    if (appealType) whereClause.appealType = appealType;
    if (semesterId) whereClause.semesterId = semesterId;
    if (status) whereClause.status = status;

    const appeals = await this.prisma.appeal.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return appeals;
  }

  /**
   * Update an appeal (e.g., for AI review, PC review, etc.)
   */
  async updateAppeal(
    appealId: string,
    data: {
      appealType?: string;
      semesterId?: string;
      reason?: string;
      supportingDocuments?: string[];
      status?: string;
      reviewedBy?: string;
      approvedBy?: string;
      aiAssessment?: Record<string, any>;
    }
  ): Promise<any> {
    // Validate appeal exists
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal not found: ${appealId}`);
    }

    // Update appeal
    const updatedAppeal = await this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        appealType: data.appealType ? data.appealType as any : undefined,
        semesterId: data.semesterId,
        reason: data.reason,
        supportingDocuments: data.supportingDocuments,
        status: data.status,
        reviewedBy: data.reviewedBy,
        approvedBy: data.approvedBy,
        aiAssessment: data.aiAssessment,
        updatedAt: new Date(),
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    return updatedAppeal;
  }

  /**
   * Add supporting documents to an appeal
   */
  async addSupportingDocuments(
    appealId: string,
    documentUrls: string[]
  ): Promise<any> {
    // Validate appeal exists
    const appeal = await this.prisma.appeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) {
      throw new NotFoundException(`Appeal not found: ${appealId}`);
    }

    // Update appeal with new documents (append to existing)
    const updatedAppeal = await this.prisma.appeal.update({
      where: { id: appealId },
      data: {
        supportingDocuments: {
          push: documentUrls,
        },
        updatedAt: new Date(),
      },
    });

    return updatedAppeal;
  }

  /**
   * Get appeal analytics
   */
  async getAppealAnalytics(filters: {
    appealType?: string;
    semesterId?: string;
    dateStart?: Date;
    dateEnd?: Date;
  } = {}): Promise<any> {
    const { appealType, semesterId, dateStart, dateEnd } = filters;

    const whereClause: any = {};
    if (appealType) whereClause.appealType = appealType;
    if (semesterId) whereClause.semesterId = semesterId;
    if (dateStart) whereClause.createdAt = { gte: dateStart };
    if (dateEnd) {
      if (whereClause.createdAt) {
        whereClause.createdAt.lte = dateEnd;
      } else {
        whereClause.createdAt = { lte: dateEnd };
      }
    }

    const appeals = await this.prisma.appeal.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    const total = appeals.length;
    const byStatus = appeals.reduce((acc, appeal) => {
      acc[appeal.status] = (acc[appeal.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = appeals.reduce((acc, appeal) => {
      acc[appeal.appealType] = (acc[appeal.appealType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgProcessingTime = appeals
      .filter((appeal) => appeal.updatedAt && appeal.createdAt)
      .reduce((sum, appeal) => {
        const diff = appeal.updatedAt.getTime() - appeal.createdAt.getTime();
        return sum + diff;
      }, 0) / (appeals.filter((a) => a.updatedAt && a.createdAt).length || 1);

    return {
      totalAppeals: total,
      appealsByStatus: byStatus,
      appealsByType: byType,
      averageProcessingTimeMs: avgProcessingTime,
      dateRange: {
        start: dateStart,
        end: dateEnd,
      },
    };
  }

  findAll() {
    return { module: 'M10 — Notifications & Appeals', status: 'ready' };
  }
}
