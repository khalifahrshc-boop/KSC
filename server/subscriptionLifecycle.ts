/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SaaSSubscription,
  SubscriptionStatus,
  SaaSAuditLog,
  SaaSPlan,
  SaaSLicense
} from '../src/types/saas';
import { NotificationPayload } from '../src/types/providers';

// 1. Authoritative State Machine Transitions
export const SAAS_VALID_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIAL: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED', 'PENDING_PAYMENT', 'PAST_DUE'],
  PENDING_PAYMENT: ['ACTIVE', 'CANCELLED', 'SUSPENDED', 'EXPIRED'],
  ACTIVE: ['PAST_DUE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'],
  PAST_DUE: ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
  EXPIRED: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
  CANCELLED: ['ACTIVE', 'TRIAL']
};

export function isValidTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  if (from === to) return true;
  return SAAS_VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface LifecycleEvaluationResult {
  subscriptionId: string;
  tenantId: string;
  previousStatus: SubscriptionStatus;
  newStatus: SubscriptionStatus;
  statusChanged: boolean;
  daysRemaining: number;
  isGracePeriod: boolean;
  auditLog?: SaaSAuditLog;
  notification?: NotificationPayload;
  error?: string;
}

export interface LifecycleBatchReport {
  timestamp: string;
  totalEvaluated: number;
  totalChanged: number;
  results: LifecycleEvaluationResult[];
  errors: Array<{ subscriptionId: string; tenantId: string; error: string }>;
}

/**
 * Calculate days remaining strictly using UTC midnight timestamps
 */
export function calculateUtcDaysRemaining(endDateStr: string, referenceDate: Date = new Date()): number {
  if (!endDateStr) return 0;
  
  const [year, month, day] = endDateStr.split('-').map(Number);
  if (!year || !month || !day) return 0;

  const targetUtc = Date.UTC(year, month - 1, day);
  const nowUtc = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );

  const diffMs = targetUtc - nowUtc;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine target subscription status based on subscription state, end date, and grace period
 */
export function evaluateSubscriptionLifecycle(
  sub: SaaSSubscription,
  referenceDate: Date = new Date()
): {
  targetStatus: SubscriptionStatus;
  daysRemaining: number;
  isGracePeriod: boolean;
  reason: string;
} {
  const daysRemaining = calculateUtcDaysRemaining(sub.endDate, referenceDate);
  const graceDays = sub.gracePeriodDays ?? 7;

  // 1. Manual terminal or frozen states (never automatically modify unless renewed)
  if (sub.status === 'SUSPENDED') {
    return {
      targetStatus: 'SUSPENDED',
      daysRemaining,
      isGracePeriod: false,
      reason: 'Subscription remains manually or administratively SUSPENDED'
    };
  }

  if (sub.status === 'CANCELLED') {
    return {
      targetStatus: 'CANCELLED',
      daysRemaining,
      isGracePeriod: false,
      reason: 'Subscription is CANCELLED'
    };
  }

  // 2. Active or Trial with days remaining
  if (daysRemaining > 0) {
    const activeStatus = sub.status === 'TRIAL' ? 'TRIAL' : 'ACTIVE';
    return {
      targetStatus: activeStatus,
      daysRemaining,
      isGracePeriod: false,
      reason: `Subscription is valid with ${daysRemaining} days remaining`
    };
  }

  // 3. Past end date (daysRemaining <= 0)
  const daysPastExpiry = Math.abs(daysRemaining);

  // Check if within Grace Period
  if (daysPastExpiry <= graceDays) {
    return {
      targetStatus: 'PAST_DUE',
      daysRemaining,
      isGracePeriod: true,
      reason: `Subscription past end date (${daysPastExpiry} days overdue, within ${graceDays}-day grace period)`
    };
  }

  // Past Grace Period -> EXPIRED
  return {
    targetStatus: 'EXPIRED',
    daysRemaining,
    isGracePeriod: false,
    reason: `Subscription expired (${daysPastExpiry} days overdue, exceeded ${graceDays}-day grace period)`
  };
}

/**
 * Process a single subscription through the lifecycle state machine with full idempotency and audit logging
 */
export function processSubscriptionItem(
  sub: SaaSSubscription,
  referenceDate: Date = new Date()
): {
  updatedSubscription: SaaSSubscription;
  evaluation: LifecycleEvaluationResult;
} {
  const previousStatus = sub.status;
  const { targetStatus, daysRemaining, isGracePeriod, reason } = evaluateSubscriptionLifecycle(sub, referenceDate);
  const utcNow = referenceDate.toISOString();

  // IDEMPOTENCY CHECK: If status hasn't changed, return without modifying or generating redundant logs
  if (previousStatus === targetStatus) {
    return {
      updatedSubscription: sub,
      evaluation: {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        previousStatus,
        newStatus: targetStatus,
        statusChanged: false,
        daysRemaining,
        isGracePeriod
      }
    };
  }

  // Validate state transition against state machine
  if (!isValidTransition(previousStatus, targetStatus)) {
    return {
      updatedSubscription: sub,
      evaluation: {
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        previousStatus,
        newStatus: previousStatus,
        statusChanged: false,
        daysRemaining,
        isGracePeriod,
        error: `Invalid transition attempted from ${previousStatus} to ${targetStatus}`
      }
    };
  }

  // Clone and update subscription safely
  const updatedSubscription: SaaSSubscription = {
    ...sub,
    status: targetStatus,
    updatedAt: utcNow
  };

  // Generate audit log for state transition
  const auditLog: SaaSAuditLog = {
    id: `audit_cron_${Date.now()}_${sub.id}`,
    tenantId: sub.tenantId,
    actorId: 'SYSTEM_CRON',
    actorName: 'Automated Lifecycle Worker',
    action: targetStatus === 'EXPIRED'
      ? 'SUBSCRIPTION_SUSPENDED'
      : targetStatus === 'PAST_DUE'
      ? 'SUBSCRIPTION_UPDATED' as any
      : 'SUBSCRIPTION_ACTIVATED',
    entityType: 'Subscription',
    entityId: sub.id,
    timestamp: utcNow,
    previousValue: { status: previousStatus },
    newValue: { status: targetStatus, daysRemaining },
    reason: `Automated lifecycle transition: ${reason}`,
    metadata: {
      source: 'SYSTEM_CRON',
      previousStatus,
      newStatus: targetStatus,
      daysRemaining,
      executionTimestamp: utcNow
    }
  };

  // Generate notification event if applicable
  let notification: NotificationPayload | undefined;
  if (targetStatus === 'PAST_DUE') {
    notification = {
      recipientName: sub.tenantId,
      type: 'SUBSCRIPTION_EXPIRING',
      titleEn: 'Subscription Past Due - Grace Period Active',
      titleAr: 'الاشتراك متأخر - فترة السماح نشطة',
      messageEn: `Your subscription ended on ${sub.endDate}. Please renew within ${sub.gracePeriodDays} days to prevent service disruption.`,
      messageAr: `انتهت فترة الاشتراك بتاريخ ${sub.endDate}. يرجى التجديد خلال ${sub.gracePeriodDays} أيام لتفادي انقطاع الخدمة.`
    };
  } else if (targetStatus === 'EXPIRED') {
    notification = {
      recipientName: sub.tenantId,
      type: 'SUBSCRIPTION_EXPIRED',
      titleEn: 'Subscription Expired - Read Only Mode',
      titleAr: 'انتهت صلاحية الاشتراك - وضع القراءة فقط',
      messageEn: `Your subscription has expired. The account is now operating in Read-Only mode. All historical project data is preserved.`,
      messageAr: `انتهت صلاحية الاشتراك. يعمل الحساب حالياً في وضع القراءة فقط. جميع بيانات المشاريع التاريخية محفوظة بالكامل.`
    };
  }

  return {
    updatedSubscription,
    evaluation: {
      subscriptionId: sub.id,
      tenantId: sub.tenantId,
      previousStatus,
      newStatus: targetStatus,
      statusChanged: true,
      daysRemaining,
      isGracePeriod,
      auditLog,
      notification
    }
  };
}

/**
 * Execute batch lifecycle evaluation for a collection of subscriptions
 */
export function runSubscriptionLifecycleBatch(
  subscriptions: SaaSSubscription[],
  referenceDate: Date = new Date()
): {
  updatedSubscriptions: SaaSSubscription[];
  auditLogs: SaaSAuditLog[];
  report: LifecycleBatchReport;
} {
  const utcNow = referenceDate.toISOString();
  const updatedSubscriptions: SaaSSubscription[] = [];
  const auditLogs: SaaSAuditLog[] = [];
  const results: LifecycleEvaluationResult[] = [];
  const errors: Array<{ subscriptionId: string; tenantId: string; error: string }> = [];

  for (const sub of subscriptions) {
    try {
      const { updatedSubscription, evaluation } = processSubscriptionItem(sub, referenceDate);
      updatedSubscriptions.push(updatedSubscription);
      results.push(evaluation);

      if (evaluation.statusChanged && evaluation.auditLog) {
        auditLogs.push(evaluation.auditLog);
      }
      if (evaluation.error) {
        errors.push({
          subscriptionId: sub.id,
          tenantId: sub.tenantId,
          error: evaluation.error
        });
      }
    } catch (err: any) {
      errors.push({
        subscriptionId: sub.id,
        tenantId: sub.tenantId,
        error: err.message || 'Unknown processing error'
      });
      // Preserve original subscription on error (never corrupt or drop)
      updatedSubscriptions.push(sub);
    }
  }

  const totalChanged = results.filter(r => r.statusChanged).length;

  const report: LifecycleBatchReport = {
    timestamp: utcNow,
    totalEvaluated: subscriptions.length,
    totalChanged,
    results,
    errors
  };

  return {
    updatedSubscriptions,
    auditLogs,
    report
  };
}

/**
 * Super Admin or Payment reactivation workflow
 */
export function reactivateSubscription(
  subscription: SaaSSubscription,
  license?: SaaSLicense,
  params?: {
    additionalDays?: number;
    newEndDate?: string;
    actorName?: string;
    actorId?: string;
    paymentReference?: string;
    planId?: string;
  }
): {
  updatedSubscription: SaaSSubscription;
  updatedLicense?: SaaSLicense;
  auditLog: SaaSAuditLog;
} {
  const utcNow = new Date().toISOString();
  const previousStatus = subscription.status;

  let newEndDate = params?.newEndDate;
  if (!newEndDate) {
    const daysToAdd = params?.additionalDays || (subscription.billingCycle === 'Yearly' ? 365 : 30);
    const startDateObj = new Date();
    startDateObj.setUTCDate(startDateObj.getUTCDate() + daysToAdd);
    newEndDate = startDateObj.toISOString().split('T')[0];
  }

  const updatedSubscription: SaaSSubscription = {
    ...subscription,
    status: 'ACTIVE',
    paymentStatus: 'PAID',
    planId: params?.planId || subscription.planId,
    startDate: new Date().toISOString().split('T')[0],
    endDate: newEndDate,
    updatedAt: utcNow
  };

  let updatedLicense: SaaSLicense | undefined;
  if (license) {
    updatedLicense = {
      ...license,
      status: 'ACTIVE',
      expiryDate: newEndDate,
      planId: params?.planId || license.planId,
      lastValidation: utcNow,
      updatedAt: utcNow
    };
  }

  const auditLog: SaaSAuditLog = {
    id: `audit_reactivate_${Date.now()}_${subscription.id}`,
    tenantId: subscription.tenantId,
    actorId: params?.actorId || 'SUPER_ADMIN',
    actorName: params?.actorName || 'System Administrator',
    action: 'SUBSCRIPTION_ACTIVATED',
    entityType: 'Subscription',
    entityId: subscription.id,
    timestamp: utcNow,
    previousValue: { status: previousStatus, endDate: subscription.endDate },
    newValue: { status: 'ACTIVE', endDate: newEndDate, paymentReference: params?.paymentReference },
    reason: `Subscription reactivated to ACTIVE. Extended through ${newEndDate}. ${params?.paymentReference ? `Ref: ${params.paymentReference}` : ''}`,
    metadata: {
      source: 'ADMIN_RENEWAL',
      previousStatus,
      newStatus: 'ACTIVE',
      newEndDate
    }
  };

  return {
    updatedSubscription,
    updatedLicense,
    auditLog
  };
}
