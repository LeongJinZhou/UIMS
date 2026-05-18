/** Fee record */
export interface Fee {
  id: string;
  studentId: string;
  semesterId: string;
  feeType: 'TUITION' | 'RETAKE' | 'OVERLOAD' | 'APPEAL' | 'LATE_PAYMENT';
  amount: number;
  currency: string;        // "MYR"
  description: string;
  creditHours?: number;
  createdAt: string;
}

/** Payment record */
export interface Payment {
  id: string;
  studentId: string;
  invoiceId: string;
  amount: number;
  method: 'ONLINE' | 'BANK_TRANSFER' | 'CASH' | 'SCHOLARSHIP';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paidAt?: string;
  reference: string;
}

/** Invoice for a semester */
export interface Invoice {
  id: string;
  studentId: string;
  semesterId: string;
  fees: Fee[];
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  dueDate: string;
  issuedAt: string;
}

/** Fee impact calculation (for overload/retake preview) */
export interface FeeImpact {
  additionalCredits: number;
  additionalFee: number;
  totalSemesterFee: number;
  breakdown: {
    feeType: string;
    credits: number;
    amount: number;
  }[];
}
