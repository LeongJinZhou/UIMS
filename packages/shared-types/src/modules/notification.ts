import { AppealType, AppealStatus, NotificationChannel } from '../enums';

/** Notification */
export interface Notification {
  id: string;
  recipientId: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  sentAt: string;
  readAt?: string;
}

/** Appeal (overload, prerequisite waiver, etc.) */
export interface Appeal {
  id: string;
  studentId: string;
  appealType: AppealType;
  semesterId: string;
  reason: string;
  supportingDocuments?: string[];
  aiAssessment?: AiAppealAssessment;
  status: AppealStatus;
  reviewedBy?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** AI pre-assessment of an appeal */
export interface AiAppealAssessment {
  recommendation: 'APPROVE' | 'REJECT' | 'NEEDS_REVIEW';
  confidence: number;        // 0.0 – 1.0
  gpaTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  currentGpa: number;
  loadHistory: {
    semester: string;
    credits: number;
    gpa: number;
  }[];
  reasoning: string;
  riskFactors: string[];
}
