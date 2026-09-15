/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  evaluateSubscriptionLifecycle,
  processSubscriptionItem,
  runSubscriptionLifecycleBatch,
  reactivateSubscription,
  calculateUtcDaysRemaining
} from './subscriptionLifecycle';
import { SaaSSubscription, SaaSLicense } from '../src/types/saas';

function runTests() {
  console.log('--- STARTING SAAS SUBSCRIPTION LIFECYCLE AUTOMATION TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const baseDate = new Date('2026-08-24T00:00:00.000Z');

  // Test 1: Trial still active (endDate: 2026-08-30)
  const activeTrial: SaaSSubscription = {
    id: 'sub_trial_1',
    tenantId: 'tenant_trial_active',
    planId: 'plan_basic',
    licenseId: 'lic_1',
    startDate: '2026-08-16',
    endDate: '2026-08-30',
    billingCycle: 'Monthly',
    basePrice: 999,
    discount: 0,
    vatRate: 15,
    vatAmount: 149.85,
    totalAmount: 1148.85,
    paymentStatus: 'PENDING',
    status: 'TRIAL',
    autoRenewal: false,
    trialPeriodDays: 14,
    gracePeriodDays: 7,
    maxUsers: 5,
    maxDevices: 5,
    maxProjects: 3,
    readOnlyOnExpiry: true,
    createdBy: 'Tester',
    createdAt: '2026-08-16T00:00:00.000Z',
    updatedAt: '2026-08-16T00:00:00.000Z'
  };

  const evalTrialActive = evaluateSubscriptionLifecycle(activeTrial, baseDate);
  assert(evalTrialActive.targetStatus === 'TRIAL' && evalTrialActive.daysRemaining === 6, '1. Active trial with remaining days remains TRIAL');

  // Test 2: Trial expired within grace period (endDate: 2026-08-22, baseDate: 2026-08-24 -> 2 days overdue, grace: 7)
  const expiredTrialInGrace: SaaSSubscription = {
    ...activeTrial,
    id: 'sub_trial_grace',
    endDate: '2026-08-22'
  };
  const evalTrialGrace = evaluateSubscriptionLifecycle(expiredTrialInGrace, baseDate);
  assert(evalTrialGrace.targetStatus === 'PAST_DUE' && evalTrialGrace.isGracePeriod === true, '2. Expired trial within grace period transitions to PAST_DUE');

  // Test 3: Trial expired past grace period (endDate: 2026-08-10, baseDate: 2026-08-24 -> 14 days overdue, grace: 7)
  const expiredTrialPastGrace: SaaSSubscription = {
    ...activeTrial,
    id: 'sub_trial_expired',
    endDate: '2026-08-10'
  };
  const evalTrialExpired = evaluateSubscriptionLifecycle(expiredTrialPastGrace, baseDate);
  assert(evalTrialExpired.targetStatus === 'EXPIRED' && evalTrialExpired.isGracePeriod === false, '3. Expired trial past grace period transitions to EXPIRED');

  // Test 4: Active subscription inside grace period (endDate: 2026-08-20, baseDate: 2026-08-24 -> 4 days overdue, grace: 7)
  const activePastDue: SaaSSubscription = {
    ...activeTrial,
    id: 'sub_active_past_due',
    status: 'ACTIVE',
    endDate: '2026-08-20'
  };
  const evalActivePastDue = evaluateSubscriptionLifecycle(activePastDue, baseDate);
  assert(evalActivePastDue.targetStatus === 'PAST_DUE' && evalActivePastDue.isGracePeriod === true, '4. Active subscription past end date within grace period transitions to PAST_DUE');

  // Test 5: Grace period expired (endDate: 2026-08-01, baseDate: 2026-08-24 -> 23 days overdue, grace: 7)
  const pastDueExpired: SaaSSubscription = {
    ...activeTrial,
    id: 'sub_past_due_expired',
    status: 'PAST_DUE',
    endDate: '2026-08-01'
  };
  const evalPastDueExpired = evaluateSubscriptionLifecycle(pastDueExpired, baseDate);
  assert(evalPastDueExpired.targetStatus === 'EXPIRED' && evalPastDueExpired.isGracePeriod === false, '5. PAST_DUE subscription past grace period transitions to EXPIRED');

  // Test 6: Expired subscription remains EXPIRED (idempotent evaluation)
  const alreadyExpired: SaaSSubscription = {
    ...activeTrial,
    id: 'sub_already_expired',
    status: 'EXPIRED',
    endDate: '2026-07-01'
  };
  const evalAlreadyExpired = processSubscriptionItem(alreadyExpired, baseDate);
  assert(evalAlreadyExpired.evaluation.newStatus === 'EXPIRED' && evalAlreadyExpired.evaluation.statusChanged === false, '6. Already EXPIRED subscription produces statusChanged = false');

  // Test 7: Manually SUSPENDED subscription remains SUSPENDED
  const suspendedSub: SaaSSubscription = {
    ...activeTrial,
    id: 'sub_suspended',
    status: 'SUSPENDED',
    endDate: '2026-06-01'
  };
  const evalSuspended = processSubscriptionItem(suspendedSub, baseDate);
  assert(evalSuspended.evaluation.newStatus === 'SUSPENDED' && evalSuspended.evaluation.statusChanged === false, '7. SUSPENDED subscription remains SUSPENDED without modification');

  // Test 8: CANCELLED subscription remains CANCELLED
  const cancelledSub: SaaSSubscription = {
    ...activeTrial,
    id: 'sub_cancelled',
    status: 'CANCELLED',
    endDate: '2026-08-01'
  };
  const evalCancelled = processSubscriptionItem(cancelledSub, baseDate);
  assert(evalCancelled.evaluation.newStatus === 'CANCELLED' && evalCancelled.evaluation.statusChanged === false, '8. CANCELLED subscription remains CANCELLED');

  // Test 9: Active subscription with valid remaining days remains ACTIVE
  const activeSub: SaaSSubscription = {
    ...activeTrial,
    id: 'sub_active_valid',
    status: 'ACTIVE',
    endDate: '2026-12-31'
  };
  const evalActive = processSubscriptionItem(activeSub, baseDate);
  assert(evalActive.evaluation.newStatus === 'ACTIVE' && evalActive.evaluation.statusChanged === false, '9. Active subscription with valid dates remains ACTIVE');

  // Test 10: Super Admin / Payment Reactivation (SUSPENDED -> ACTIVE)
  const license: SaaSLicense = {
    id: 'lic_1',
    licenseKey: 'LIC-2026-123456',
    tenantId: 'tenant_reactivate',
    subscriptionId: 'sub_reactivate',
    planId: 'plan_pro',
    activationDate: '2026-01-01',
    expiryDate: '2026-06-01',
    status: 'SUSPENDED',
    maxUsers: 20,
    maxDevices: 20,
    maxProjects: 10,
    lastValidation: '2026-06-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z'
  };
  const reactivated = reactivateSubscription(suspendedSub, license, {
    newEndDate: '2027-08-24',
    actorName: 'Super Admin User',
    paymentReference: 'PAY-SNB-2026-99'
  });
  assert(
    reactivated.updatedSubscription.status === 'ACTIVE' &&
    reactivated.updatedSubscription.endDate === '2027-08-24' &&
    reactivated.updatedLicense?.status === 'ACTIVE' &&
    reactivated.auditLog.action === 'SUBSCRIPTION_ACTIVATED',
    '10. Reactivation successfully transitions to ACTIVE with updated license and audit log'
  );

  // Test 11: Batch Execution Idempotency & Tenant Isolation
  const multiTenantBatch: SaaSSubscription[] = [
    { ...activeTrial, id: 'sub_tenant_A', tenantId: 'tenant_A', endDate: '2026-08-20' }, // will change to PAST_DUE
    { ...activeTrial, id: 'sub_tenant_B', tenantId: 'tenant_B', status: 'ACTIVE', endDate: '2027-01-01' } // unchanged
  ];

  const firstBatchRun = runSubscriptionLifecycleBatch(multiTenantBatch, baseDate);
  assert(firstBatchRun.report.totalEvaluated === 2 && firstBatchRun.report.totalChanged === 1, '11a. First batch run processes correct state changes');
  assert(firstBatchRun.updatedSubscriptions.find(s => s.tenantId === 'tenant_A')?.status === 'PAST_DUE', '11b. Tenant A status updated to PAST_DUE');
  assert(firstBatchRun.updatedSubscriptions.find(s => s.tenantId === 'tenant_B')?.status === 'ACTIVE', '11c. Tenant B remains ACTIVE (isolation confirmed)');

  // Run second time with output from first run
  const secondBatchRun = runSubscriptionLifecycleBatch(firstBatchRun.updatedSubscriptions, baseDate);
  assert(secondBatchRun.report.totalChanged === 0 && secondBatchRun.auditLogs.length === 0, '12. Second batch run is strictly IDEMPOTENT (0 changes, 0 duplicate logs)');

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
