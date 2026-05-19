export class AppealAssessDto {
  appealType: string;
  description: string;
  supportingDocuments?: string[];
  courseId?: string;
  semesterId?: string;
  studentId?: string; // Usually comes from auth context, but included for completeness
}