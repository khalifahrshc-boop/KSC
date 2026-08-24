/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  SaaSSubscription,
  SaaSCustomer,
  SaaSInvoice,
  SaaSPayment,
  SaaSPlan,
  SaaSLicense
} from '../../types/saas';
import {
  Users,
  Building2,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Key,
  ShieldAlert,
  ArrowUpRight,
  DollarSign
} from 'lucide-react';

interface SaaSDashboardProps {
  subscriptions: SaaSSubscription[];
  customers: SaaSCustomer[];
  invoices: SaaSInvoice[];
  payments: SaaSPayment[];
  plans: SaaSPlan[];
  licenses: SaaSLicense[];
  lang: 'ar' | 'en';
  onNavigateToTab: (tab: string) => void;
}

export default function SaaSDashboard({
  subscriptions,
  customers,
  invoices,
  payments,
  plans,
  licenses,
  lang,
  onNavigateToTab
}: SaaSDashboardProps) {
  const isRtl = lang === 'ar';

  // Calculate Metrics
  const totalCustomersCount = customers.length;
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE');
  const trialSubs = subscriptions.filter(s => s.status === 'TRIAL');
  const pendingPaymentSubs = subscriptions.filter(s => s.paymentStatus === 'PENDING' || s.status === 'PENDING_PAYMENT');
  const pastDueSubs = subscriptions.filter(s => s.status === 'PAST_DUE');
  const suspendedSubs = subscriptions.filter(s => s.status === 'SUSPENDED');
  const expiredSubs = subscriptions.filter(s => s.status === 'EXPIRED');

  // Expiring in next 14 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiringSoonCount = subscriptions.filter(s => {
    if (s.status !== 'ACTIVE' && s.status !== 'TRIAL') return false;
    const expiry = new Date(s.endDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 14;
  }).length;

  // Monthly Recurring Revenue (MRR) calculation
  const mrr = subscriptions.reduce((acc, sub) => {
    if (sub.status !== 'ACTIVE') return acc;
    if (sub.billingCycle === 'Monthly') return acc + sub.basePrice;
    if (sub.billingCycle === 'Yearly') return acc + sub.basePrice / 12;
    return acc;
  }, 0);

  const arr = mrr * 12;

  // Revenue & Outstanding
  const totalPaidRevenue = payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const totalOutstanding = invoices
    .filter(i => i.paymentStatus === 'PENDING')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isRtl ? 'الإيرادات الشهرية المكررة (MRR)' : 'Monthly Recurring Revenue (MRR)'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {mrr.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-slate-500">SAR</span>
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center font-medium">
                <ArrowUpRight className="w-3.5 h-3.5 mr-1 rtl:ml-1" />
                ARR: {arr.toLocaleString('en-US', { maximumFractionDigits: 0 })} SAR
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Active Subscriptions Card */}
        <div 
          onClick={() => onNavigateToTab('subscriptions')}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-sky-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isRtl ? 'الاشتراكات النشطة' : 'Active Subscriptions'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {activeSubs.length} <span className="text-xs font-normal text-slate-500">/ {subscriptions.length} {isRtl ? 'إجمالي' : 'Total'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {trialSubs.length} {isRtl ? 'تجريبي' : 'Trials'} | {suspendedSubs.length} {isRtl ? 'معلق' : 'Suspended'}
              </p>
            </div>
            <div className="p-3 bg-sky-50 dark:bg-sky-950/50 rounded-xl text-sky-600 dark:text-sky-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Total Revenue Collected */}
        <div 
          onClick={() => onNavigateToTab('invoices')}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-indigo-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isRtl ? 'إجمالي التحصيلات والمدفوعات' : 'Total Revenue Collected'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalPaidRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-slate-500">SAR</span>
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                {isRtl ? 'المبالغ المتبقية:' : 'Outstanding:'} {totalOutstanding.toLocaleString('en-US')} SAR
              </p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Customers Count */}
        <div 
          onClick={() => onNavigateToTab('customers')}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-violet-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isRtl ? 'العملاء والشركات' : 'Registered Customers'}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalCustomersCount}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {expiringSoonCount} {isRtl ? 'تنتهي قريبًا (خلال 14 يوم)' : 'expiring within 14 days'}
              </p>
            </div>
            <div className="p-3 bg-violet-50 dark:bg-violet-950/50 rounded-xl text-violet-600 dark:text-violet-400">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Lifecycle Quick Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
          {isRtl ? 'حالة وشبكة اشتراكات المنصة الحالية' : 'Subscription Lifecycle Distribution'}
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">ACTIVE</span>
            <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1">{activeSubs.length}</p>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/30 p-3.5 rounded-xl border border-sky-100 dark:border-sky-900/40 text-center">
            <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase">TRIAL</span>
            <p className="text-2xl font-extrabold text-sky-900 dark:text-sky-200 mt-1">{trialSubs.length}</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/40 text-center">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">PAST DUE</span>
            <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">{pastDueSubs.length}</p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950/30 p-3.5 rounded-xl border border-orange-100 dark:border-orange-900/40 text-center">
            <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase">PENDING PAYMENT</span>
            <p className="text-2xl font-extrabold text-orange-900 dark:text-orange-200 mt-1">{pendingPaymentSubs.length}</p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/30 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/40 text-center">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase">SUSPENDED</span>
            <p className="text-2xl font-extrabold text-purple-900 dark:text-purple-200 mt-1">{suspendedSubs.length}</p>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/30 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40 text-center">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase">EXPIRED</span>
            <p className="text-2xl font-extrabold text-rose-900 dark:text-rose-200 mt-1">{expiredSubs.length}</p>
          </div>
        </div>
      </div>

      {/* Plan Breakdown & Active Subscriptions Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plans Breakdown */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {isRtl ? 'باقات الاشتراك المتاحة' : 'SaaS Plans Overview'}
            </h4>
            <button 
              onClick={() => onNavigateToTab('plans')}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              {isRtl ? 'إدارة الباقات' : 'Manage Plans'}
            </button>
          </div>

          <div className="space-y-3">
            {plans.map(plan => {
              const count = subscriptions.filter(s => s.planId === plan.id && s.status === 'ACTIVE').length;
              return (
                <div key={plan.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {isRtl ? plan.nameAr : plan.nameEn}
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {plan.monthlyPrice.toLocaleString()} SAR/{isRtl ? 'شهر' : 'mo'} | {plan.yearlyPrice.toLocaleString()} SAR/{isRtl ? 'سنة' : 'yr'}
                    </p>
                  </div>
                  <div className="text-right rtl:text-left">
                    <span className="px-2.5 py-1 bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 text-xs font-bold rounded-lg">
                      {count} {isRtl ? 'اشتراك نشط' : 'Active Subs'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Active Customers / Subscriptions */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {isRtl ? 'أحدث اشتراكات العملاء' : 'Recent Customer Subscriptions'}
            </h4>
            <button 
              onClick={() => onNavigateToTab('subscriptions')}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              {isRtl ? 'عرض الكل' : 'View All'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                  <th className="p-3">{isRtl ? 'العميل' : 'Customer'}</th>
                  <th className="p-3">{isRtl ? 'الباقة' : 'Plan'}</th>
                  <th className="p-3">{isRtl ? 'الحالة' : 'Status'}</th>
                  <th className="p-3">{isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                  <th className="p-3 text-left rtl:text-left">{isRtl ? 'المبلغ' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {subscriptions.slice(0, 5).map(sub => {
                  const cust = customers.find(c => c.id === sub.tenantId);
                  const plan = plans.find(p => p.id === sub.planId);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="p-3 font-medium text-slate-900 dark:text-white">
                        {cust ? (isRtl ? cust.companyNameAr : cust.companyNameEn) : sub.tenantId}
                      </td>
                      <td className="p-3">
                        {plan ? (isRtl ? plan.nameAr : plan.nameEn) : sub.planId}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : sub.status === 'PENDING_PAYMENT'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                            : sub.status === 'SUSPENDED'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {sub.endDate}
                      </td>
                      <td className="p-3 text-left rtl:text-left font-bold text-slate-900 dark:text-white">
                        {sub.totalAmount.toLocaleString()} SAR
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
