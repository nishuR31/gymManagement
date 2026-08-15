export const roleNames = ["SUPER_ADMIN", "GYM_OWNER", "ADMIN", "STAFF", "MEMBER"] as const;

export type RoleName = (typeof roleNames)[number];

export interface AuthUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleName;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
  hasPasskeys: boolean;
  securityDisableRequested: boolean;
}

export interface PasskeyDto {
  id: string;
  createdAt: string;
}

export interface ProfileUpdateDto {
  firstName: string;
  lastName: string;
  email: string;
}

export interface PasswordUpdateDto {
  currentPassword?: string;
  newPassword: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
}

export const memberStatuses = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;

export type MemberStatus = (typeof memberStatuses)[number];

export interface MemberDto {
  id: string;
  memberCode: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalNotes?: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  status: MemberStatus;
  joinedAt: string;
  suspendedAt: string | null;
  suspendedReason: string | null;
  lastAttendanceDate?: string | null;
  streakDays?: number;
  notices?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemberLoginSetupDto {
  member: MemberDto;
  user: AuthUserDto;
  temporaryPassword: string;
  regenerated: boolean;
}

export const checkInMethods = ["QR", "MEMBER_ID", "USERNAME_SEARCH"] as const;

export type CheckInMethod = (typeof checkInMethods)[number];

export interface AttendanceMemberSummaryDto {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  imageUrl: string | null;
}

export interface AttendanceDto {
  id: string;
  memberId: string;
  checkInAt: string;
  checkOutAt: string | null;
  checkInMethod: CheckInMethod;
  checkedInBy: string | null;
  durationMinutes: number | null;
  autoClosed: boolean;
  member: AttendanceMemberSummaryDto;
}

export interface PaginatedAttendanceDto {
  data: AttendanceDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface DailyAttendanceDto {
  date: string;
  count: number;
  data: AttendanceDto[];
}

export interface MonthlyAttendanceDayDto {
  date: string;
  count: number;
}

export interface MonthlyAttendanceDto {
  month: string;
  days: MonthlyAttendanceDayDto[];
}

export const membershipSubscriptionStatuses = ["ACTIVE", "EXPIRED", "FROZEN", "CANCELLED"] as const;

export type MembershipSubscriptionStatus = (typeof membershipSubscriptionStatuses)[number];

export interface MembershipPlanDto {
  id: string;
  name: string;
  durationDays: number;
  priceCents: number;
  ptIncluded: boolean;
  lockerIncluded: boolean;
  guestPassesIncluded: number;
  accessTiming: string | null;
  gracePeriodDays: number;
  freezeAllowed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicMembershipPlanDto {
  name: string;
  description: string | null;
  priceCents: number;
  durationDays: number;
}

export const inquiryStatuses = ["NEW", "READ"] as const;

export type InquiryStatus = (typeof inquiryStatuses)[number];

export interface InquiryDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
}

export interface PaginatedInquiryDto {
  data: InquiryDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface MembershipSubscriptionDto {
  id: string;
  memberId: string;
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: MembershipSubscriptionStatus;
  freezeStartDate: string | null;
  freezeEndDate: string | null;
  priceAtPurchaseCents: number;
  createdAt: string;
  updatedAt: string;
}

export const invoiceStatuses = ["PENDING", "PARTIALLY_PAID", "PAID", "REFUNDED", "CANCELLED"] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const paymentMethods = ["CASH", "UPI", "CARD", "ONLINE"] as const;

export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentAnalyticsRanges = ["daily", "weekly", "monthly", "yearly"] as const;

export type PaymentAnalyticsRange = (typeof paymentAnalyticsRanges)[number];

export interface RefundDto {
  id: string;
  paymentId: string;
  amountCents: number;
  reason: string;
  refundedBy: string;
  refundedAt: string;
}

export interface PaymentDto {
  id: string;
  invoiceId: string;
  amountCents: number;
  method: PaymentMethod;
  paidAt: string;
  recordedBy: string;
  refundableCents: number;
  refunds: RefundDto[];
  createdAt: string;
}

export interface InvoiceDto {
  id: string;
  memberId: string;
  subscriptionId: string | null;
  amountDueCents: number;
  amountPaidCents: number;
  remainingCents: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  payments: PaymentDto[];
}

export interface PendingDuesDto {
  invoiceCount: number;
  totalRemainingCents: number;
  invoices: InvoiceDto[];
}

export interface PaymentAnalyticsBucketDto {
  label: string;
  revenueCents: number;
}

export interface PaymentAnalyticsDto {
  range: PaymentAnalyticsRange;
  totalRevenueCents: number;
  buckets: PaymentAnalyticsBucketDto[];
}

export const productCategories = ["PROTEIN", "CREATINE", "ACCESSORY", "MERCHANDISE", "OTHER"] as const;

export type ProductCategory = (typeof productCategories)[number];

export const stockMovementTypes = ["PURCHASE", "SALE", "ADJUSTMENT"] as const;

export type StockMovementType = (typeof stockMovementTypes)[number];

export const productOrderStatuses = ["PENDING", "CONFIRMED", "READY", "COMPLETED", "CANCELLED"] as const;

export type ProductOrderStatus = (typeof productOrderStatuses)[number];

export const productOrderPaymentStatuses = ["PENDING", "PAID"] as const;

export type ProductOrderPaymentStatus = (typeof productOrderPaymentStatuses)[number];

export interface ProductDto {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: ProductCategory;
  sku: string;
  priceCents: number;
  costCents: number;
  reorderThreshold: number;
  isActive: boolean;
  currentStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductOrderDto {
  id: string;
  orderCode: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  memberPhone: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  amountCents: number;
  paymentStatus: ProductOrderPaymentStatus;
  status: ProductOrderStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDto {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovementDto {
  id: string;
  productId: string;
  supplierId: string | null;
  type: StockMovementType;
  quantityDelta: number;
  unitCostCents: number | null;
  unitPriceCents: number | null;
  reference: string | null;
  recordedBy: string;
  createdAt: string;
}

export interface LowStockProductDto extends ProductDto {}

export interface InventoryValuationDto {
  totalValueCents: number;
  products: Array<{
    productId: string;
    name: string;
    sku: string;
    currentStock: number;
    costCents: number;
    valueCents: number;
  }>;
}

export const staffProfileRoles = ["ADMIN", "STAFF", "TRAINER"] as const;

export type StaffProfileRole = (typeof staffProfileRoles)[number];

export const staffAttendanceStatuses = ["OPEN", "CLOSED"] as const;

export type StaffAttendanceStatus = (typeof staffAttendanceStatuses)[number];

export const leaveRequestStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;

export type LeaveRequestStatus = (typeof leaveRequestStatuses)[number];

export interface StaffProfileDto {
  id: string;
  userId: string;
  role: StaffProfileRole;
  salaryCents?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAttendanceDto {
  id: string;
  staffProfileId: string;
  checkInAt: string;
  checkOutAt: string | null;
  durationMinutes: number | null;
  status: StaffAttendanceStatus;
}

export interface PaginatedStaffAttendanceDto {
  data: StaffAttendanceDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface LeaveRequestDto {
  id: string;
  staffProfileId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface WorkoutExerciseDto {
  name: string;
  sets: number;
  reps: number;
  notes?: string | undefined;
}

export interface DietMealDto {
  name: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes?: string | undefined;
}

export interface WorkoutPlanTemplateDto {
  id: string;
  name: string;
  exercises: WorkoutExerciseDto[];
  isActive: boolean;
}

export interface MemberWorkoutPlanDto {
  id: string;
  memberId: string;
  templateId: string;
  trainerId: string | null;
  startDate: string;
  exercises: WorkoutExerciseDto[];
}

export interface DietPlanTemplateDto {
  id: string;
  name: string;
  meals: DietMealDto[];
  isActive: boolean;
}

export interface MemberDietPlanDto {
  id: string;
  memberId: string;
  templateId: string;
  trainerId: string | null;
  startDate: string;
  meals: DietMealDto[];
}

export const notificationCategories = ["SYSTEM", "PAYMENT", "MEMBERSHIP", "ATTENDANCE", "INVENTORY", "STAFF"] as const;

export type NotificationCategory = (typeof notificationCategories)[number];

export const notificationPriorities = ["LOW", "NORMAL", "HIGH"] as const;

export type NotificationPriority = (typeof notificationPriorities)[number];

export interface NotificationDto {
  id: string;
  userId: string | null;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotificationDto {
  data: NotificationDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogDto {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PaginatedAuditLogDto {
  data: AuditLogDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SettingDto {
  key: string;
  value: unknown;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GymInfoDto {
  name: string;
  phone: string;
  email: string;
  address: string;
  businessHours: Record<string, string>;
}

export interface DashboardSummaryDto {
  membersCurrentlyInGym: number;
  todaysAttendance: number;
  todaysRevenueCents: number;
  monthlyRevenueCents: number;
  pendingDuesCents: number;
  pendingDuesCount: number;
  membershipsExpiringSoon: MembershipSubscriptionDto[];
  recentPayments: PaymentDto[];
  lowStockAlerts: LowStockProductDto[];
  recentActivity: AuditLogDto[];
  redListMembers: MemberDto[];
}

export interface ReportBucketDto {
  label: string;
  count?: number;
  amountCents?: number;
}

export interface ReportDto {
  type: string;
  generatedAt: string;
  totals: Record<string, number>;
  buckets: ReportBucketDto[];
  rows: Record<string, string | number | null>[];
}
