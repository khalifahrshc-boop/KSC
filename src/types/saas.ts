/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionStatus =
  | 'TRIAL'
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELLED';

export type PaymentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'REJECTED';

export type PaymentMethod =
  | 'Bank Transfer'
  | 'Cash'
  | 'Card'
  | 'Online Payment'
  | 'Other';

export type LicenseStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'REVOKED';

export type DeviceStatus =
  | 'ACTIVE'
  | 'BLOCKED'
  | 'DEACTIVATED';

export type BillingCycle = 'Monthly' | 'Yearly';

export interface SaaSPlan {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  monthlyPrice: number;
  yearlyPrice: number;
  vatRate: number; // e.g. 15 for 15%
  maxUsers: number; // -1 for unlimited
  maxDevices: number; // -1 for unlimited
  maxProjects: number; // -1 for unlimited
  featuresEn: string[];
  featuresAr: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SaaSCustomer {
  id: string;
  companyNameEn: string;
  companyNameAr: string;
  contactPerson: string;
  mobile: string;
  email: string;
  commercialRegistration: string;
  vatNumber: string;
  addressEn: string;
  addressAr: string;
  country: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SaaSSubscription {
  id: string;
  tenantId: string; // Refers to Customer ID / Organization ID
  planId: string;
  licenseId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  billingCycle: BillingCycle;
  basePrice: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  status: SubscriptionStatus;
  autoRenewal: boolean;
  trialPeriodDays: number;
  gracePeriodDays: number;
  maxUsers: number;
  maxDevices: number;
  maxProjects: number;
  readOnlyOnExpiry?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface SaaSInvoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-000001
  tenantId: string;
  subscriptionId: string;
  planId: string;
  planNameEn: string;
  planNameAr: string;
  sellerNameEn: string;
  sellerNameAr: string;
  sellerVatNumber: string;
  customerNameEn: string;
  customerNameAr: string;
  customerVatNumber: string;
  customerCR: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotal: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  issueDate: string;
  dueDate: string;
  paymentStatus: PaymentStatus;
  qrCodeUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface SaaSPayment {
  id: string;
  tenantId: string;
  subscriptionId: string;
  invoiceId: string;
  amount: number;
  discount: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  referenceNumber: string;
  status: PaymentStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface SaaSLicense {
  id: string;
  licenseKey: string; // e.g. LIC-2026-000001
  tenantId: string;
  subscriptionId: string;
  planId: string;
  activationDate: string;
  expiryDate: string;
  status: LicenseStatus;
  maxUsers: number;
  maxDevices: number;
  maxProjects: number;
  lastValidation: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaaSDevice {
  id: string;
  deviceId: string;
  deviceName: string;
  os: string;
  appVersion: string;
  userId: string;
  userName: string;
  tenantId: string;
  licenseId: string;
  firstSeen: string;
  lastSeen: string;
  status: DeviceStatus;
}

export interface SaaSAuditLog {
  id: string;
  tenantId?: string;
  actorId: string;
  actorName: string;
  action:
    | 'SUBSCRIPTION_CREATED'
    | 'SUBSCRIPTION_ACTIVATED'
    | 'SUBSCRIPTION_SUSPENDED'
    | 'SUBSCRIPTION_RESUMED'
    | 'SUBSCRIPTION_RENEWED'
    | 'SUBSCRIPTION_EXTENDED'
    | 'PLAN_CHANGED'
    | 'PAYMENT_CREATED'
    | 'PAYMENT_CONFIRMED'
    | 'PAYMENT_REJECTED'
    | 'PAYMENT_REFUNDED'
    | 'LICENSE_CREATED'
    | 'LICENSE_ACTIVATED'
    | 'LICENSE_SUSPENDED'
    | 'LICENSE_REVOKED'
    | 'DEVICE_DEACTIVATED'
    | 'DEVICE_BLOCKED'
    | 'DEVICE_REACTIVATED'
    | 'CUSTOMER_CREATED'
    | 'CUSTOMER_UPDATED'
    | 'PLAN_CREATED'
    | 'PLAN_UPDATED';
  entityType: 'Subscription' | 'Plan' | 'Customer' | 'Invoice' | 'Payment' | 'License' | 'Device' | 'Settings';
  entityId: string;
  timestamp: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface SaaSSettings {
  id?: string;
  defaultVatRate: number; // 15
  defaultGracePeriodDays: number; // 7
  defaultTrialPeriodDays: number; // 14
  enableReadOnlyOnExpiry: boolean; // true
  companyNameEn: string;
  companyNameAr: string;
  sellerVatNumber: string;
  sellerCommercialRegistration: string;
  currency: string; // 'SAR'
  updatedAt?: string;
}

export interface SaaSEnforcementCheck {
  isAllowed: boolean;
  status: SubscriptionStatus;
  isReadOnly: boolean;
  daysRemaining: number;
  errorCode?: 'SUBSCRIPTION_EXPIRED' | 'SUBSCRIPTION_SUSPENDED' | 'PAYMENT_REQUIRED' | 'USER_LIMIT_REACHED' | 'PROJECT_LIMIT_REACHED' | 'DEVICE_LIMIT_REACHED';
  messageEn?: string;
  messageAr?: string;
  currentUsers?: number;
  maxUsers?: number;
  currentProjects?: number;
  maxProjects?: number;
  currentDevices?: number;
  maxDevices?: number;
  resourceLimits?: {
    maxUsers: number;
    maxProjects: number;
    maxDevices: number;
  };
}
