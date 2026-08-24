/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SaaSPlan,
  SaaSCustomer,
  SaaSSubscription,
  SaaSInvoice,
  SaaSPayment,
  SaaSLicense,
  SaaSDevice,
  SaaSAuditLog,
  SaaSSettings,
  SubscriptionStatus,
  PaymentStatus,
  LicenseStatus,
  SaaSEnforcementCheck
} from '../types/saas';

// STATE MACHINE TRANSITION VALIDATION
const VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIAL: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'PENDING_PAYMENT'],
  PENDING_PAYMENT: ['ACTIVE', 'CANCELLED', 'SUSPENDED'],
  ACTIVE: ['PAST_DUE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'],
  PAST_DUE: ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
  EXPIRED: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
  CANCELLED: ['ACTIVE', 'TRIAL']
};

export function isValidStateTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// GENERATORS
export function generateLicenseKey(): string {
  const year = new Date().getFullYear();
  const randomHex = Math.floor(100000 + Math.random() * 900000);
  return `LIC-${year}-${randomHex}`;
}

export function generateInvoiceNumber(sequenceNumber: number = Math.floor(Math.random() * 89999) + 10000): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(sequenceNumber).padStart(6, '0')}`;
}

// DATE & EXPIRATION CALCULATIONS
export function calculateDaysRemaining(endDateStr: string): number {
  if (!endDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(endDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateEffectiveSubscriptionStatus(sub: SaaSSubscription): {
  status: SubscriptionStatus;
  daysRemaining: number;
  isExpired: boolean;
  isGracePeriod: boolean;
} {
  const daysRemaining = calculateDaysRemaining(sub.endDate);
  
  if (sub.status === 'SUSPENDED' || sub.status === 'CANCELLED') {
    return {
      status: sub.status,
      daysRemaining,
      isExpired: true,
      isGracePeriod: false
    };
  }

  if (daysRemaining > 0) {
    return {
      status: sub.status === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
      daysRemaining,
      isExpired: false,
      isGracePeriod: false
    };
  }

  // Days remaining <= 0 (Past end date)
  const graceDays = sub.gracePeriodDays || 7;
  const daysPastExpiry = Math.abs(daysRemaining);

  if (daysPastExpiry <= graceDays) {
    return {
      status: 'PAST_DUE',
      daysRemaining,
      isExpired: false,
      isGracePeriod: true
    };
  }

  return {
    status: 'EXPIRED',
    daysRemaining,
    isExpired: true,
    isGracePeriod: false
  };
}

// ENFORCEMENT & LIMIT CHECKS
export function checkSubscriptionEnforcement(
  sub: SaaSSubscription | null,
  currentUsersCount: number,
  currentProjectsCount: number,
  currentDevicesCount: number
): SaaSEnforcementCheck {
  if (!sub) {
    return {
      isAllowed: false,
      status: 'EXPIRED',
      isReadOnly: true,
      daysRemaining: 0,
      errorCode: 'SUBSCRIPTION_EXPIRED',
      messageEn: 'No active subscription found. Access is restricted.',
      messageAr: 'لم يتم العثور على اشتراك نشط. الوصول محظور.'
    };
  }

  const { status, daysRemaining, isExpired, isGracePeriod } = calculateEffectiveSubscriptionStatus(sub);

  if (status === 'SUSPENDED') {
    return {
      isAllowed: false,
      status,
      isReadOnly: true,
      daysRemaining,
      errorCode: 'SUBSCRIPTION_SUSPENDED',
      messageEn: 'Subscription is suspended by system administration.',
      messageAr: 'تم تعليق الاشتراك من قبل إدارة النظام.'
    };
  }

  if (isExpired && !isGracePeriod) {
    const isReadOnly = sub.readOnlyOnExpiry ?? true;
    return {
      isAllowed: !isReadOnly,
      status: 'EXPIRED',
      isReadOnly,
      daysRemaining,
      errorCode: 'SUBSCRIPTION_EXPIRED',
      messageEn: isReadOnly
        ? 'Subscription has expired. Application is in Read-Only mode.'
        : 'Subscription has expired. Access is restricted.',
      messageAr: isReadOnly
        ? 'انتهت صلاحية الاشتراك. التطبيق في وضع القراءة فقط.'
        : 'انتهت صلاحية الاشتراك. تم تقييد الوصول.'
    };
  }

  // Check limits
  if (sub.maxUsers !== -1 && currentUsersCount >= sub.maxUsers) {
    return {
      isAllowed: true, // Existing functionality allowed, creation blocked
      status,
      isReadOnly: false,
      daysRemaining,
      errorCode: 'USER_LIMIT_REACHED',
      messageEn: `User limit reached (${currentUsersCount}/${sub.maxUsers}). Upgrade your plan to add more users.`,
      messageAr: `تم الوصول إلى الحد الأقصى للمستخدمين (${currentUsersCount}/${sub.maxUsers}). يرجى ترقية الباقة لإضافة المزيد.`,
      currentUsers: currentUsersCount,
      maxUsers: sub.maxUsers
    };
  }

  if (sub.maxProjects !== -1 && currentProjectsCount >= sub.maxProjects) {
    return {
      isAllowed: true,
      status,
      isReadOnly: false,
      daysRemaining,
      errorCode: 'PROJECT_LIMIT_REACHED',
      messageEn: `Project limit reached (${currentProjectsCount}/${sub.maxProjects}). Upgrade your plan to create new projects.`,
      messageAr: `تم الوصول إلى الحد الأقصى للمشاريع (${currentProjectsCount}/${sub.maxProjects}). يرجى ترقية الباقة لإنشاء مشاريع جديدة.`,
      currentProjects: currentProjectsCount,
      maxProjects: sub.maxProjects
    };
  }

  if (sub.maxDevices !== -1 && currentDevicesCount >= sub.maxDevices) {
    return {
      isAllowed: true,
      status,
      isReadOnly: false,
      daysRemaining,
      errorCode: 'DEVICE_LIMIT_REACHED',
      messageEn: `Device limit reached (${currentDevicesCount}/${sub.maxDevices}). Deactivate a device or upgrade your plan.`,
      messageAr: `تم الوصول إلى الحد الأقصى للأجهزة (${currentDevicesCount}/${sub.maxDevices}). قم بإلغاء تنشيط جهاز أو ترقية الباقة.`,
      currentDevices: currentDevicesCount,
      maxDevices: sub.maxDevices
    };
  }

  return {
    isAllowed: true,
    status,
    isReadOnly: false,
    daysRemaining,
    currentUsers: currentUsersCount,
    maxUsers: sub.maxUsers,
    currentProjects: currentProjectsCount,
    maxProjects: sub.maxProjects,
    currentDevices: currentDevicesCount,
    maxDevices: sub.maxDevices
  };
}

export function enforceSubscriptionAccess(
  sub: SaaSSubscription | null,
  plans: SaaSPlan[],
  usage: { activeUsersCount: number; activeDevicesCount: number; activeProjectsCount: number }
): SaaSEnforcementCheck & { resourceLimits: { maxUsers: number; maxProjects: number; maxDevices: number } } {
  const check = checkSubscriptionEnforcement(
    sub,
    usage.activeUsersCount,
    usage.activeProjectsCount,
    usage.activeDevicesCount
  );
  const plan = plans.find(p => p.id === sub?.planId);
  return {
    ...check,
    resourceLimits: {
      maxUsers: sub?.maxUsers ?? plan?.maxUsers ?? 5,
      maxProjects: sub?.maxProjects ?? plan?.maxProjects ?? 3,
      maxDevices: sub?.maxDevices ?? plan?.maxDevices ?? 5,
    }
  };
}

// DEFAULT SEED DATA FOR SAAS
export const DEFAULT_SAAS_PLANS: SaaSPlan[] = [
  {
    id: 'plan_basic',
    nameEn: 'Basic Starter',
    nameAr: 'الباقة الأساسية',
    descriptionEn: 'Ideal for small subcontractors & single site teams.',
    descriptionAr: 'مثالية لمقاولي الباطن والفرق الميدانية الصغيرة.',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    vatRate: 15,
    maxUsers: 5,
    maxDevices: 5,
    maxProjects: 3,
    featuresEn: [
      '3 Active Projects',
      '5 System Users',
      '5 Active Devices',
      'Daily Field Work Reporting',
      'PTW & Start Cards',
      'Basic PDF Reports'
    ],
    featuresAr: [
      '3 مشاريع نشطة',
      '5 مستخدمين في النظام',
      '5 أجهزة نشطة',
      'تقارير العمل الميداني اليومية',
      'تصاريح العمل وكروت البدء',
      'تقارير PDF أساسية'
    ],
    isActive: true,
    displayOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'plan_pro',
    nameEn: 'Professional Contractor',
    nameAr: 'الباقة الاحترافية',
    descriptionEn: 'Designed for growing construction firms with multiple project teams.',
    descriptionAr: 'مصممة لشركات المقاولات المتنامية مع فرق عمل متعددة.',
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    vatRate: 15,
    maxUsers: 20,
    maxDevices: 20,
    maxProjects: 10,
    featuresEn: [
      '10 Active Projects',
      '20 System Users',
      '20 Active Devices',
      'All Basic Features',
      'Warehouse & Inventory Management',
      'AI Smart Field Work Integrity Audits',
      'Advanced ZATCA-compliant PDF Generation',
      'Custom Approvals & Signatures'
    ],
    featuresAr: [
      '10 مشاريع نشطة',
      '20 مستخدم في النظام',
      '20 جهاز نشط',
      'جميع المزايا الأساسية',
      'إدارة المستودعات والإنتاجية',
      'تدقيق وتقييم الذكاء الاصطناعي الذكي',
      'تصدير PDF متقدم معتمد',
      'اعتمادات وتواقيع مخصصة'
    ],
    isActive: true,
    displayOrder: 2,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'plan_enterprise',
    nameEn: 'Enterprise Corporate',
    nameAr: 'باقة المؤسسات والشركات الكبرى',
    descriptionEn: 'Unlimited capacity & dedicated SaaS infrastructure support.',
    descriptionAr: 'سعة غير محدودة ودعم مخصص للبنية التحتية.',
    monthlyPrice: 5999,
    yearlyPrice: 59990,
    vatRate: 15,
    maxUsers: -1,
    maxDevices: -1,
    maxProjects: -1,
    featuresEn: [
      'Unlimited Projects',
      'Unlimited Users',
      'Unlimited Devices',
      'Dedicated Customer Account Manager',
      'Multi-tenant Isolation & RBAC',
      'Full Audit Trails & Custom Integrations',
      'Priority SLA Support'
    ],
    featuresAr: [
      'مشاريع غير محدودة',
      'مستخدمين غير محدودين',
      'أجهزة غير محدودة',
      'مدير حساب مخصص للعميل',
      'عزل مستأجر كامل وأمان تقدم',
      'سجل تدقيق شامل وتكاملات مخصصة',
      'دعم أولوية وسرعة استجابة'
    ],
    isActive: true,
    displayOrder: 3,
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export const DEFAULT_SAAS_SETTINGS: SaaSSettings = {
  id: 'global_saas_settings',
  defaultVatRate: 15,
  defaultGracePeriodDays: 7,
  defaultTrialPeriodDays: 14,
  enableReadOnlyOnExpiry: true,
  companyNameEn: 'Saudi SaaS Construction Tech Systems Ltd.',
  companyNameAr: 'شركة أنظمة منصة المقاولات السعودية المحدودة',
  sellerVatNumber: '310123456700003',
  sellerCommercialRegistration: '1010987654',
  currency: 'SAR'
};

export const SEED_SAAS_CUSTOMERS: SaaSCustomer[] = [
  {
    id: 'cust_001',
    companyNameEn: 'Al-Rashed Construction Group',
    companyNameAr: 'مجموعة الراشد للمقاولات العامة',
    contactPerson: 'Eng. Ahmed Al-Rashed',
    mobile: '+966 50 123 4567',
    email: 'ahmed@alrashed-const.sa',
    commercialRegistration: '1010887766',
    vatNumber: '310987654300003',
    addressEn: 'King Fahd Road, Olaya District, Riyadh, KSA',
    addressAr: 'طريق الملك فهد، حي العليا، الرياض، المملكة العربية السعودية',
    country: 'Saudi Arabia',
    status: 'ACTIVE',
    notes: 'Primary enterprise contractor operating major infrastructure projects.',
    createdAt: '2026-01-10T08:00:00.000Z'
  },
  {
    id: 'cust_002',
    companyNameEn: 'Al-Jazirah Contracting Est.',
    companyNameAr: 'مؤسسة الجزيرة للمقاولات',
    contactPerson: 'Saleh Al-Otaibi',
    mobile: '+966 55 987 6543',
    email: 'saleh@aljazirah-build.com',
    commercialRegistration: '2050443322',
    vatNumber: '311223344500003',
    addressEn: 'Dammam Highway, Al-Khobar, KSA',
    addressAr: 'طريق الدمام السريع، الخبر، المملكة العربية السعودية',
    country: 'Saudi Arabia',
    status: 'ACTIVE',
    notes: 'Mid-sized building contractor focusing on commercial towers.',
    createdAt: '2026-02-01T10:00:00.000Z'
  }
];

export const SEED_SAAS_SUBSCRIPTIONS: SaaSSubscription[] = [
  {
    id: 'sub_001',
    tenantId: 'cust_001',
    planId: 'plan_pro',
    licenseId: 'lic_001',
    startDate: '2026-01-10',
    endDate: '2027-01-10',
    billingCycle: 'Yearly',
    basePrice: 24990,
    discount: 1000,
    vatRate: 15,
    vatAmount: 3598.5,
    totalAmount: 27588.5,
    paymentStatus: 'PAID',
    status: 'ACTIVE',
    autoRenewal: true,
    trialPeriodDays: 14,
    gracePeriodDays: 7,
    maxUsers: 20,
    maxDevices: 20,
    maxProjects: 10,
    readOnlyOnExpiry: true,
    createdBy: 'System Owner',
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-01-10T08:30:00.000Z'
  },
  {
    id: 'sub_002',
    tenantId: 'cust_002',
    planId: 'plan_basic',
    licenseId: 'lic_002',
    startDate: '2026-02-01',
    endDate: '2026-03-01',
    billingCycle: 'Monthly',
    basePrice: 999,
    discount: 0,
    vatRate: 15,
    vatAmount: 149.85,
    totalAmount: 1148.85,
    paymentStatus: 'PAID',
    status: 'ACTIVE',
    autoRenewal: true,
    trialPeriodDays: 14,
    gracePeriodDays: 7,
    maxUsers: 5,
    maxDevices: 5,
    maxProjects: 3,
    readOnlyOnExpiry: true,
    createdBy: 'System Owner',
    createdAt: '2026-02-01T10:30:00.000Z',
    updatedAt: '2026-02-01T10:30:00.000Z'
  }
];

export const SEED_SAAS_LICENSES: SaaSLicense[] = [
  {
    id: 'lic_001',
    licenseKey: 'LIC-2026-882194',
    tenantId: 'cust_001',
    subscriptionId: 'sub_001',
    planId: 'plan_pro',
    activationDate: '2026-01-10',
    expiryDate: '2027-01-10',
    status: 'ACTIVE',
    maxUsers: 20,
    maxDevices: 20,
    maxProjects: 10,
    lastValidation: '2026-08-23T12:00:00.000Z',
    createdAt: '2026-01-10T08:30:00.000Z',
    updatedAt: '2026-08-23T12:00:00.000Z'
  },
  {
    id: 'lic_002',
    licenseKey: 'LIC-2026-339120',
    tenantId: 'cust_002',
    subscriptionId: 'sub_002',
    planId: 'plan_basic',
    activationDate: '2026-02-01',
    expiryDate: '2026-03-01',
    status: 'ACTIVE',
    maxUsers: 5,
    maxDevices: 5,
    maxProjects: 3,
    lastValidation: '2026-08-23T12:00:00.000Z',
    createdAt: '2026-02-01T10:30:00.000Z',
    updatedAt: '2026-08-23T12:00:00.000Z'
  }
];

export const SEED_SAAS_INVOICES: SaaSInvoice[] = [
  {
    id: 'inv_001',
    invoiceNumber: 'INV-2026-000001',
    tenantId: 'cust_001',
    subscriptionId: 'sub_001',
    planId: 'plan_pro',
    planNameEn: 'Professional Contractor',
    planNameAr: 'الباقة الاحترافية',
    sellerNameEn: 'Saudi SaaS Construction Tech Systems Ltd.',
    sellerNameAr: 'شركة أنظمة منصة المقاولات السعودية المحدودة',
    sellerVatNumber: '310123456700003',
    customerNameEn: 'Al-Rashed Construction Group',
    customerNameAr: 'مجموعة الراشد للمقاولات العامة',
    customerVatNumber: '310987654300003',
    customerCR: '1010887766',
    billingPeriodStart: '2026-01-10',
    billingPeriodEnd: '2027-01-10',
    subtotal: 23990,
    discount: 1000,
    vatRate: 15,
    vatAmount: 3598.5,
    totalAmount: 27588.5,
    issueDate: '2026-01-10',
    dueDate: '2026-01-25',
    paymentStatus: 'PAID',
    createdAt: '2026-01-10T08:30:00.000Z'
  }
];

export const SEED_SAAS_PAYMENTS: SaaSPayment[] = [
  {
    id: 'pay_001',
    tenantId: 'cust_001',
    subscriptionId: 'sub_001',
    invoiceId: 'inv_001',
    amount: 23990,
    discount: 1000,
    vatAmount: 3598.5,
    totalAmount: 27588.5,
    paymentMethod: 'Bank Transfer',
    paymentDate: '2026-01-12',
    referenceNumber: 'TRF-99823410',
    status: 'PAID',
    notes: 'Annual subscription fee paid via SNB Bank Transfer.',
    createdBy: 'System Owner',
    createdAt: '2026-01-12T11:00:00.000Z'
  }
];

export const SEED_SAAS_DEVICES: SaaSDevice[] = [
  {
    id: 'dev_001',
    deviceId: 'DEV-IPAD-RHD-01',
    deviceName: 'iPad Pro Site Terminal 1',
    os: 'iOS 18.2',
    appVersion: 'v2.4.0',
    userId: 'usr_001',
    userName: 'Eng. Ahmed Al-Rashed',
    tenantId: 'cust_001',
    licenseId: 'lic_001',
    firstSeen: '2026-01-11T09:00:00.000Z',
    lastSeen: '2026-08-23T16:00:00.000Z',
    status: 'ACTIVE'
  },
  {
    id: 'dev_002',
    deviceId: 'DEV-WIN-OFFICE-01',
    deviceName: 'Riyadh HQ Engineering Workstation',
    os: 'Windows 11 Pro',
    appVersion: 'v2.4.0',
    userId: 'usr_002',
    userName: 'Project Manager',
    tenantId: 'cust_001',
    licenseId: 'lic_001',
    firstSeen: '2026-01-11T10:00:00.000Z',
    lastSeen: '2026-08-23T16:30:00.000Z',
    status: 'ACTIVE'
  }
];

export const SEED_SAAS_AUDIT_LOGS: SaaSAuditLog[] = [
  {
    id: 'audit_001',
    tenantId: 'cust_001',
    actorId: 'admin_master',
    actorName: 'System Administrator',
    action: 'SUBSCRIPTION_ACTIVATED',
    entityType: 'Subscription',
    entityId: 'sub_001',
    timestamp: '2026-01-10T08:30:00.000Z',
    newValue: { status: 'ACTIVE', licenseKey: 'LIC-2026-882194' },
    reason: 'Initial onboarding payment confirmed for Al-Rashed Group.'
  }
];

export const SEED_SAAS_PLANS = DEFAULT_SAAS_PLANS;

export interface SaaSRegistrationPayload {
  companyNameAr: string;
  companyNameEn: string;
  commercialRegistration: string;
  vatNumber: string;
  contactPerson: string;
  email: string;
  mobile: string;
  password: string;
  selectedPlanId: string;
  billingCycle?: 'Monthly' | 'Yearly';
  addressAr?: string;
  addressEn?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
}

export function createNewTenantRegistration(
  payload: SaaSRegistrationPayload,
  plans: SaaSPlan[],
  settings: SaaSSettings
): {
  customer: SaaSCustomer;
  user: any;
  subscription: SaaSSubscription;
  license: SaaSLicense;
  auditLog: SaaSAuditLog;
} {
  const tenantId = `cust_${Date.now()}`;
  const userId = `usr_${Date.now()}`;
  const subId = `sub_${Date.now()}`;
  const licenseId = `lic_${Date.now()}`;
  const nowIso = new Date().toISOString();
  const todayStr = new Date().toISOString().split('T')[0];

  const trialDays = settings?.defaultTrialPeriodDays || 14;
  const endDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const selectedPlan = plans.find(p => p.id === payload.selectedPlanId) || plans[0] || DEFAULT_SAAS_PLANS[0];

  const customer: SaaSCustomer = {
    id: tenantId,
    companyNameAr: payload.companyNameAr,
    companyNameEn: payload.companyNameEn || payload.companyNameAr,
    contactPerson: payload.contactPerson,
    email: payload.email,
    mobile: payload.mobile,
    commercialRegistration: payload.commercialRegistration,
    vatNumber: payload.vatNumber,
    addressAr: payload.addressAr || 'الرياض، المملكة العربية السعودية',
    addressEn: payload.addressEn || 'Riyadh, Saudi Arabia',
    country: 'Saudi Arabia',
    status: 'ACTIVE',
    createdAt: nowIso
  };

  const user = {
    id: userId,
    name: payload.contactPerson,
    email: payload.email,
    password: payload.password,
    role: 'admin',
    tenantId,
    company: payload.companyNameAr,
    active: true,
    mobile: payload.mobile,
    emailNotifications: payload.emailNotifications ?? true,
    smsNotifications: payload.smsNotifications ?? true,
    createdAt: nowIso
  };

  const vatRate = selectedPlan.vatRate || settings.defaultVatRate || 15;
  const cycle = payload.billingCycle || 'Monthly';
  const basePrice = cycle === 'Yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice;
  const vatAmount = (basePrice * vatRate) / 100;
  const totalAmount = basePrice + vatAmount;

  const subscription: SaaSSubscription = {
    id: subId,
    tenantId,
    planId: selectedPlan.id,
    licenseId,
    startDate: todayStr,
    endDate,
    billingCycle: cycle,
    basePrice,
    discount: 0,
    vatRate,
    vatAmount,
    totalAmount,
    paymentStatus: 'PENDING',
    status: 'TRIAL',
    autoRenewal: false,
    trialPeriodDays: trialDays,
    gracePeriodDays: settings.defaultGracePeriodDays || 7,
    maxUsers: selectedPlan.maxUsers,
    maxProjects: selectedPlan.maxProjects,
    maxDevices: selectedPlan.maxDevices,
    readOnlyOnExpiry: settings.enableReadOnlyOnExpiry ?? true,
    createdBy: payload.contactPerson,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const license: SaaSLicense = {
    id: licenseId,
    licenseKey: generateLicenseKey(),
    tenantId,
    subscriptionId: subId,
    planId: selectedPlan.id,
    activationDate: todayStr,
    expiryDate: endDate,
    status: 'ACTIVE',
    maxUsers: selectedPlan.maxUsers,
    maxProjects: selectedPlan.maxProjects,
    maxDevices: selectedPlan.maxDevices,
    lastValidation: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const auditLog: SaaSAuditLog = {
    id: `audit_${Date.now()}`,
    tenantId,
    actorId: userId,
    actorName: payload.contactPerson,
    action: 'CUSTOMER_CREATED',
    entityType: 'Customer',
    entityId: tenantId,
    timestamp: nowIso,
    newValue: {
      companyNameAr: payload.companyNameAr,
      plan: selectedPlan.nameAr,
      trialDays
    },
    reason: 'Self-service registration completed successfully.'
  };

  return { customer, user, subscription, license, auditLog };
}

