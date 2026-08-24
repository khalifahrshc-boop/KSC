/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SaaSSubscription,
  SaaSCustomer,
  SaaSPlan,
  SaaSInvoice,
  SaaSPayment,
  SaaSLicense,
  SubscriptionStatus,
  PaymentStatus,
  BillingCycle,
  SaaSDevice,
  SaaSAuditLog
} from '../../types/saas';
import {
  calculateDaysRemaining,
  calculateEffectiveSubscriptionStatus,
  generateLicenseKey,
  generateInvoiceNumber,
  isValidStateTransition
} from '../../services/saasService';
import {
  Search,
  Filter,
  Plus,
  Play,
  Pause,
  RotateCw,
  Calendar,
  ArrowUpRight,
  Shield,
  FileText,
  CreditCard,
  X,
  Check,
  AlertCircle,
  Clock,
  Key,
  Smartphone,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { generateSaaSInvoicePdf } from '../../utils/pdf/SaaSInvoicePdf';

interface SaaSSubscriptionsTabProps {
  subscriptions: SaaSSubscription[];
  customers: SaaSCustomer[];
  plans: SaaSPlan[];
  invoices: SaaSInvoice[];
  payments: SaaSPayment[];
  licenses: SaaSLicense[];
  devices: SaaSDevice[];
  auditLogs: SaaSAuditLog[];
  lang: 'ar' | 'en';
  onSaveSubscription: (sub: SaaSSubscription) => void;
  onSaveInvoice: (inv: SaaSInvoice) => void;
  onSavePayment: (pay: SaaSPayment) => void;
  onSaveLicense: (lic: SaaSLicense) => void;
  onAddAuditLog: (log: SaaSAuditLog) => void;
  currentUser: { name: string; id: string };
}

export default function SaaSSubscriptionsTab({
  subscriptions,
  customers,
  plans,
  invoices,
  payments,
  licenses,
  devices,
  auditLogs,
  lang,
  onSaveSubscription,
  onSaveInvoice,
  onSavePayment,
  onSaveLicense,
  onAddAuditLog,
  currentUser
}: SaaSSubscriptionsTabProps) {
  const isRtl = lang === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Modals & Drawer State
  const [selectedSub, setSelectedSub] = useState<SaaSSubscription | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // New Subscription Form State
  const [newTenantId, setNewTenantId] = useState(customers[0]?.id || '');
  const [newPlanId, setNewPlanId] = useState(plans[0]?.id || '');
  const [newBillingCycle, setNewBillingCycle] = useState<BillingCycle>('Monthly');
  const [newDiscount, setNewDiscount] = useState<number>(0);
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAutoRenewal, setNewAutoRenewal] = useState(true);

  // Extend Modal Form State
  const [extendDays, setExtendDays] = useState<number>(30);
  const [extendReason, setExtendReason] = useState('');

  // Change Plan Form State
  const [targetPlanId, setTargetPlanId] = useState('');

  // Record Payment Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'Bank Transfer' | 'Cash' | 'Card' | 'Online Payment' | 'Other'>('Bank Transfer');
  const [payRefNo, setPayRefNo] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Filter Subscriptions
  const filteredSubs = subscriptions.filter(sub => {
    const cust = customers.find(c => c.id === sub.tenantId);
    const lic = licenses.find(l => l.id === sub.licenseId);
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      sub.id.toLowerCase().includes(searchLower) ||
      (cust && (cust.companyNameEn.toLowerCase().includes(searchLower) || cust.companyNameAr.toLowerCase().includes(searchLower))) ||
      (lic && lic.licenseKey.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter === 'ALL' || sub.status === statusFilter;
    const matchesPayment = paymentFilter === 'ALL' || sub.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Handle Create Subscription
  const handleCreateSubscription = () => {
    const plan = plans.find(p => p.id === newPlanId);
    const cust = customers.find(c => c.id === newTenantId);
    if (!plan || !cust) return;

    const basePrice = newBillingCycle === 'Monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const discountedPrice = Math.max(0, basePrice - newDiscount);
    const vatRate = plan.vatRate || 15;
    const vatAmount = (discountedPrice * vatRate) / 100;
    const totalAmount = discountedPrice + vatAmount;

    // Calculate End Date
    const start = new Date(newStartDate);
    const end = new Date(start);
    if (newBillingCycle === 'Monthly') {
      end.setMonth(end.getMonth() + 1);
    } else {
      end.setFullYear(end.getFullYear() + 1);
    }
    const endDateStr = end.toISOString().split('T')[0];

    const subId = `sub_${Date.now()}`;
    const licId = `lic_${Date.now()}`;
    const licenseKey = generateLicenseKey();

    // Create License First
    const newLicense: SaaSLicense = {
      id: licId,
      licenseKey,
      tenantId: cust.id,
      subscriptionId: subId,
      planId: plan.id,
      activationDate: newStartDate,
      expiryDate: endDateStr,
      status: 'INACTIVE', // Becomes active upon payment / activation
      maxUsers: plan.maxUsers,
      maxDevices: plan.maxDevices,
      maxProjects: plan.maxProjects,
      lastValidation: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create Subscription
    const newSub: SaaSSubscription = {
      id: subId,
      tenantId: cust.id,
      planId: plan.id,
      licenseId: licId,
      startDate: newStartDate,
      endDate: endDateStr,
      billingCycle: newBillingCycle,
      basePrice,
      discount: newDiscount,
      vatRate,
      vatAmount,
      totalAmount,
      paymentStatus: 'PENDING',
      status: 'PENDING_PAYMENT',
      autoRenewal: newAutoRenewal,
      trialPeriodDays: 14,
      gracePeriodDays: 7,
      maxUsers: plan.maxUsers,
      maxDevices: plan.maxDevices,
      maxProjects: plan.maxProjects,
      readOnlyOnExpiry: true,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Generate Initial Invoice
    const invoiceNumber = generateInvoiceNumber();
    const newInvoice: SaaSInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      tenantId: cust.id,
      subscriptionId: subId,
      planId: plan.id,
      planNameEn: plan.nameEn,
      planNameAr: plan.nameAr,
      sellerNameEn: 'Saudi SaaS Construction Tech Systems Ltd.',
      sellerNameAr: 'شركة أنظمة منصة المقاولات السعودية المحدودة',
      sellerVatNumber: '310123456700003',
      customerNameEn: cust.companyNameEn,
      customerNameAr: cust.companyNameAr,
      customerVatNumber: cust.vatNumber,
      customerCR: cust.commercialRegistration,
      billingPeriodStart: newStartDate,
      billingPeriodEnd: endDateStr,
      subtotal: discountedPrice,
      discount: newDiscount,
      vatRate,
      vatAmount,
      totalAmount,
      issueDate: newStartDate,
      dueDate: newStartDate,
      paymentStatus: 'PENDING',
      createdAt: new Date().toISOString()
    };

    onSaveLicense(newLicense);
    onSaveInvoice(newInvoice);
    onSaveSubscription(newSub);

    onAddAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: cust.id,
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: 'SUBSCRIPTION_CREATED',
      entityType: 'Subscription',
      entityId: subId,
      timestamp: new Date().toISOString(),
      newValue: { planId: plan.id, billingCycle: newBillingCycle, totalAmount },
      reason: 'New subscription registered by SaaS Admin.'
    });

    setIsCreateModalOpen(false);
  };

  // State Transition Execution Handler
  const handleTransition = (sub: SaaSSubscription, targetStatus: SubscriptionStatus, actionName: string, reasonText?: string) => {
    if (!isValidStateTransition(sub.status, targetStatus)) {
      alert(`Invalid state transition from ${sub.status} to ${targetStatus}`);
      return;
    }

    const updatedSub: SaaSSubscription = {
      ...sub,
      status: targetStatus,
      paymentStatus: targetStatus === 'ACTIVE' ? 'PAID' : sub.paymentStatus,
      updatedAt: new Date().toISOString()
    };

    // Sync corresponding License status
    const lic = licenses.find(l => l.id === sub.licenseId);
    if (lic) {
      const updatedLic: SaaSLicense = {
        ...lic,
        status: targetStatus === 'ACTIVE' ? 'ACTIVE' : targetStatus === 'SUSPENDED' ? 'SUSPENDED' : targetStatus === 'EXPIRED' ? 'EXPIRED' : 'INACTIVE',
        updatedAt: new Date().toISOString()
      };
      onSaveLicense(updatedLic);
    }

    onSaveSubscription(updatedSub);
    if (selectedSub?.id === sub.id) {
      setSelectedSub(updatedSub);
    }

    onAddAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: sub.tenantId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: actionName as any,
      entityType: 'Subscription',
      entityId: sub.id,
      timestamp: new Date().toISOString(),
      previousValue: { status: sub.status },
      newValue: { status: targetStatus },
      reason: reasonText || `Subscription status updated to ${targetStatus}`
    });
  };

  // Handle Extension
  const handleExtendSubscription = () => {
    if (!selectedSub || extendDays <= 0) return;

    const currentExpiry = new Date(selectedSub.endDate);
    currentExpiry.setDate(currentExpiry.getDate() + extendDays);
    const newExpiryStr = currentExpiry.toISOString().split('T')[0];

    const updatedSub: SaaSSubscription = {
      ...selectedSub,
      endDate: newExpiryStr,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString()
    };

    const lic = licenses.find(l => l.id === selectedSub.licenseId);
    if (lic) {
      onSaveLicense({
        ...lic,
        expiryDate: newExpiryStr,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString()
      });
    }

    onSaveSubscription(updatedSub);
    setSelectedSub(updatedSub);

    onAddAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: selectedSub.tenantId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: 'SUBSCRIPTION_EXTENDED',
      entityType: 'Subscription',
      entityId: selectedSub.id,
      timestamp: new Date().toISOString(),
      previousValue: { endDate: selectedSub.endDate },
      newValue: { endDate: newExpiryStr, extendedDays: extendDays },
      reason: extendReason || 'Subscription validity extended by administrator.'
    });

    setIsExtendModalOpen(false);
    setExtendReason('');
  };

  // Handle Plan Change (Upgrade / Downgrade)
  const handleChangePlan = () => {
    if (!selectedSub || !targetPlanId) return;
    const plan = plans.find(p => p.id === targetPlanId);
    if (!plan) return;

    const basePrice = selectedSub.billingCycle === 'Monthly' ? plan.monthlyPrice : plan.yearlyPrice;
    const vatAmount = (basePrice * (plan.vatRate || 15)) / 100;

    const updatedSub: SaaSSubscription = {
      ...selectedSub,
      planId: plan.id,
      maxUsers: plan.maxUsers,
      maxDevices: plan.maxDevices,
      maxProjects: plan.maxProjects,
      basePrice,
      vatAmount,
      totalAmount: basePrice + vatAmount,
      updatedAt: new Date().toISOString()
    };

    const lic = licenses.find(l => l.id === selectedSub.licenseId);
    if (lic) {
      onSaveLicense({
        ...lic,
        planId: plan.id,
        maxUsers: plan.maxUsers,
        maxDevices: plan.maxDevices,
        maxProjects: plan.maxProjects,
        updatedAt: new Date().toISOString()
      });
    }

    onSaveSubscription(updatedSub);
    setSelectedSub(updatedSub);

    onAddAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: selectedSub.tenantId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: 'PLAN_CHANGED',
      entityType: 'Subscription',
      entityId: selectedSub.id,
      timestamp: new Date().toISOString(),
      previousValue: { planId: selectedSub.planId },
      newValue: { planId: plan.id },
      reason: `Plan changed to ${plan.nameEn}`
    });

    setIsChangePlanModalOpen(false);
  };

  // Handle Record Payment
  const handleRecordPayment = () => {
    if (!selectedSub || payAmount <= 0) return;

    const inv = invoices.find(i => i.subscriptionId === selectedSub.id);
    const paymentId = `pay_${Date.now()}`;
    const subVatRate = selectedSub.vatRate ?? 15;
    const vatAmount = (payAmount * subVatRate) / (100 + subVatRate);

    const newPay: SaaSPayment = {
      id: paymentId,
      tenantId: selectedSub.tenantId,
      subscriptionId: selectedSub.id,
      invoiceId: inv ? inv.id : `inv_${Date.now()}`,
      amount: payAmount - vatAmount,
      discount: 0,
      vatAmount,
      totalAmount: payAmount,
      paymentMethod: payMethod,
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: payRefNo || `REF-${Math.floor(Math.random() * 900000) + 100000}`,
      status: 'PAID',
      notes: payNotes,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    // Update Invoice status
    if (inv) {
      onSaveInvoice({
        ...inv,
        paymentStatus: 'PAID'
      });
    }

    // Update Subscription status to ACTIVE & PAID
    const updatedSub: SaaSSubscription = {
      ...selectedSub,
      paymentStatus: 'PAID',
      status: 'ACTIVE',
      updatedAt: new Date().toISOString()
    };

    // Activate License
    const lic = licenses.find(l => l.id === selectedSub.licenseId);
    if (lic) {
      onSaveLicense({
        ...lic,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString()
      });
    }

    onSavePayment(newPay);
    onSaveSubscription(updatedSub);
    setSelectedSub(updatedSub);

    onAddAuditLog({
      id: `audit_${Date.now()}`,
      tenantId: selectedSub.tenantId,
      actorId: currentUser.id,
      actorName: currentUser.name,
      action: 'PAYMENT_CONFIRMED',
      entityType: 'Payment',
      entityId: paymentId,
      timestamp: new Date().toISOString(),
      newValue: { amount: payAmount, paymentMethod: payMethod, ref: payRefNo },
      reason: 'Manual payment confirmed by SaaS Admin.'
    });

    setIsPaymentModalOpen(false);
    setPayAmount(0);
    setPayRefNo('');
    setPayNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header & Filters */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 rtl:right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'ابحث باسم الشركة، رقم الاشتراك، أو مفتاح الترخيص...' : 'Search company, subscription ID, or license key...'}
            className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">{isRtl ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="TRIAL">TRIAL</option>
            <option value="PENDING_PAYMENT">PENDING PAYMENT</option>
            <option value="PAST_DUE">PAST DUE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">{isRtl ? 'جميع الدفعات' : 'All Payments'}</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
          </select>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            {isRtl ? 'إنشاء اشتراك جديد' : 'New Subscription'}
          </button>
        </div>
      </div>

      {/* Subscriptions Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right rtl:text-right text-slate-700 dark:text-slate-300">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                <th className="p-4">{isRtl ? 'رقم الاشتراك / الترخيص' : 'Subscription / License'}</th>
                <th className="p-4">{isRtl ? 'العميل / الشركة' : 'Customer Company'}</th>
                <th className="p-4">{isRtl ? 'الباقة والدورة' : 'Plan & Cycle'}</th>
                <th className="p-4">{isRtl ? 'الحالة' : 'Status'}</th>
                <th className="p-4">{isRtl ? 'حالة الدفع' : 'Payment Status'}</th>
                <th className="p-4">{isRtl ? 'تاريخ الانتهاء (الأيام المتبقية)' : 'Expiry (Days Left)'}</th>
                <th className="p-4 text-left rtl:text-left">{isRtl ? 'المبلغ' : 'Total Amount'}</th>
                <th className="p-4 text-center">{isRtl ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    {isRtl ? 'لا توجد اشتراكات تطابق البحث' : 'No subscriptions found matching filters.'}
                  </td>
                </tr>
              ) : (
                filteredSubs.map(sub => {
                  const cust = customers.find(c => c.id === sub.tenantId);
                  const plan = plans.find(p => p.id === sub.planId);
                  const lic = licenses.find(l => l.id === sub.licenseId);
                  const daysLeft = calculateDaysRemaining(sub.endDate);

                  return (
                    <tr 
                      key={sub.id} 
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedSub(sub)}
                    >
                      <td className="p-4 font-mono text-xs">
                        <span className="font-bold text-slate-900 dark:text-white block">{sub.id}</span>
                        <span className="text-slate-400 text-[11px]">{lic ? lic.licenseKey : 'NO LICENSE'}</span>
                      </td>

                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        {cust ? (isRtl ? cust.companyNameAr : cust.companyNameEn) : sub.tenantId}
                      </td>

                      <td className="p-4">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {plan ? (isRtl ? plan.nameAr : plan.nameEn) : sub.planId}
                        </span>
                        <span className="text-xs text-slate-400 block">{sub.billingCycle}</span>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-block ${
                          sub.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : sub.status === 'TRIAL'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                            : sub.status === 'PAST_DUE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : sub.status === 'SUSPENDED'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {sub.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          sub.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                        }`}>
                          {sub.paymentStatus}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-mono text-xs block text-slate-900 dark:text-white">{sub.endDate}</span>
                        <span className={`text-[11px] font-bold ${daysLeft > 14 ? 'text-emerald-600' : daysLeft > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {daysLeft > 0 ? `${daysLeft} ${isRtl ? 'يوم متبقي' : 'days left'}` : `${Math.abs(daysLeft)} ${isRtl ? 'يوم منتهي' : 'days expired'}`}
                        </span>
                      </td>

                      <td className="p-4 text-left rtl:text-left font-bold text-slate-900 dark:text-white">
                        {sub.totalAmount.toLocaleString()} SAR
                      </td>

                      <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedSub(sub)}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                          title="Control Center"
                        >
                          <ChevronRight className="w-5 h-5 rtl:rotate-180" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUBSCRIPTION CONTROL CENTER DRAWER / DETAIL MODAL */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 h-full overflow-y-auto p-6 shadow-2xl space-y-6 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <span className="text-xs font-mono text-sky-600 dark:text-sky-400 font-bold">{selectedSub.id}</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {customers.find(c => c.id === selectedSub.tenantId)?.companyNameAr || selectedSub.tenantId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Status & Primary Control Actions Grid */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 uppercase">{isRtl ? 'الحالة الحالية' : 'Current Status'}</span>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                      selectedSub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {selectedSub.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      Payment: {selectedSub.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="text-right rtl:text-left font-mono">
                  <span className="text-xs text-slate-500 uppercase">{isRtl ? 'ينتهي في' : 'Expires On'}</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedSub.endDate}</p>
                </div>
              </div>

              {/* ACTION BUTTONS BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                {selectedSub.status !== 'ACTIVE' && (
                  <button
                    onClick={() => handleTransition(selectedSub, 'ACTIVE', 'SUBSCRIPTION_ACTIVATED', 'Activated by admin')}
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-4 h-4" />
                    {isRtl ? 'تنشيط الخدمة' : 'Activate'}
                  </button>
                )}

                {selectedSub.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleTransition(selectedSub, 'SUSPENDED', 'SUBSCRIPTION_SUSPENDED', 'Suspended by admin')}
                    className="p-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Pause className="w-4 h-4" />
                    {isRtl ? 'تعليق الخدمة' : 'Suspend'}
                  </button>
                )}

                <button
                  onClick={() => setIsExtendModalOpen(true)}
                  className="p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-4 h-4" />
                  {isRtl ? 'تمديد الصلاحية' : 'Extend'}
                </button>

                <button
                  onClick={() => {
                    setTargetPlanId(selectedSub.planId);
                    setIsChangePlanModalOpen(true);
                  }}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  {isRtl ? 'تغيير الباقة' : 'Change Plan'}
                </button>

                <button
                  onClick={() => {
                    setPayAmount(selectedSub.totalAmount);
                    setIsPaymentModalOpen(true);
                  }}
                  className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  {isRtl ? 'تسجيل دفع' : 'Record Payment'}
                </button>
              </div>
            </div>

            {/* License & Device Limits */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-sky-500" />
                {isRtl ? 'تفاصيل الترخيص وسعة الأجهزة والمستخدمين' : 'License Key & Resource Limits'}
              </h4>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500">{isRtl ? 'المستخدمين' : 'Max Users'}</span>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                    {selectedSub.maxUsers === -1 ? '∞' : selectedSub.maxUsers}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500">{isRtl ? 'الأجهزة' : 'Max Devices'}</span>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                    {selectedSub.maxDevices === -1 ? '∞' : selectedSub.maxDevices}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500">{isRtl ? 'المشاريع' : 'Max Projects'}</span>
                  <p className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                    {selectedSub.maxProjects === -1 ? '∞' : selectedSub.maxProjects}
                  </p>
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                {isRtl ? 'الفواتير الصادرة' : 'Generated Invoices'}
              </h4>

              <div className="space-y-2">
                {invoices.filter(i => i.subscriptionId === selectedSub.id).map(inv => (
                  <div key={inv.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                      <p className="text-xs text-slate-500">{inv.issueDate} | {inv.totalAmount.toLocaleString()} SAR</p>
                    </div>
                    <button
                      onClick={() => generateSaaSInvoicePdf(inv)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      PDF
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Log Trail for this Subscription */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                {isRtl ? 'سجل العمليات والتدقيق (Audit Trail)' : 'Subscription Audit Trail'}
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {auditLogs.filter(a => a.entityId === selectedSub.id).map(log => (
                  <div key={log.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-600 dark:text-purple-400">{log.action}</span>
                      <span className="text-[10px] text-slate-400">{log.timestamp.split('T')[0]}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{log.reason}</p>
                    <span className="text-[10px] text-slate-400">By: {log.actorName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SUBSCRIPTION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isRtl ? 'إنشاء اشتراك جديد لمؤسسة' : 'Create New Customer Subscription'}
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'اختر الشركة / العميل' : 'Select Customer'}
                </label>
                <select
                  value={newTenantId}
                  onChange={e => setNewTenantId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {isRtl ? c.companyNameAr : c.companyNameEn} ({c.vatNumber || c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'اختر باقة الاشتراك' : 'Select SaaS Plan'}
                </label>
                <select
                  value={newPlanId}
                  onChange={e => setNewPlanId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {isRtl ? p.nameAr : p.nameEn} ({p.monthlyPrice} SAR/mo | {p.yearlyPrice} SAR/yr)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'دورة الفوترة' : 'Billing Cycle'}
                  </label>
                  <select
                    value={newBillingCycle}
                    onChange={e => setNewBillingCycle(e.target.value as BillingCycle)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  >
                    <option value="Monthly">{isRtl ? 'شهري' : 'Monthly'}</option>
                    <option value="Yearly">{isRtl ? 'سنوي' : 'Yearly'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'خصم (ر.س)' : 'Discount (SAR)'}
                  </label>
                  <input
                    type="number"
                    value={newDiscount}
                    onChange={e => setNewDiscount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'تاريخ البدء' : 'Start Date'}
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={e => setNewStartDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateSubscription}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl"
              >
                {isRtl ? 'حفظ وتأكيد الاشتراك' : 'Confirm Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXTEND SUBSCRIPTION MODAL */}
      {isExtendModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isRtl ? 'تمديد فترات الاشتراك' : 'Extend Subscription Expiry'}
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'عدد الأيام للتمديد' : 'Days to Extend'}
                </label>
                <input
                  type="number"
                  value={extendDays}
                  onChange={e => setExtendDays(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'سبب التمديد' : 'Reason / Note'}
                </label>
                <textarea
                  value={extendReason}
                  onChange={e => setExtendReason(e.target.value)}
                  placeholder={isRtl ? 'اكتب سبب التمديد...' : 'Enter extension justification...'}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setIsExtendModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleExtendSubscription} className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl">
                {isRtl ? 'حفظ التمديد' : 'Save Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE PLAN MODAL */}
      {isChangePlanModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isRtl ? 'ترقية / تغيير باقة الاشتراك' : 'Change SaaS Plan'}
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'الباقة الجديدة' : 'Select Target Plan'}
                </label>
                <select
                  value={targetPlanId}
                  onChange={e => setTargetPlanId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>
                      {isRtl ? p.nameAr : p.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setIsChangePlanModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleChangePlan} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">
                {isRtl ? 'تأكيد تغيير الباقة' : 'Apply Plan Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentModalOpen && selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isRtl ? 'تسجيل دفعة جديدة للعميل' : 'Record Manual Payment'}
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'المبلغ المسدد (ر.س)' : 'Payment Amount (SAR)'}
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'طريقة الدفع' : 'Payment Method'}
                </label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                >
                  <option value="Bank Transfer">{isRtl ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  <option value="Cash">{isRtl ? 'نقداً' : 'Cash'}</option>
                  <option value="Card">{isRtl ? 'بطاقة ائتمانية' : 'Card'}</option>
                  <option value="Online Payment">{isRtl ? 'دفع إلكتروني' : 'Online Payment'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'رقم التحويل / المرجع' : 'Reference / Transaction No.'}
                </label>
                <input
                  type="text"
                  value={payRefNo}
                  onChange={e => setPayRefNo(e.target.value)}
                  placeholder="e.g. TRF-9982310"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleRecordPayment} className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-xl">
                {isRtl ? 'تأكيد وتحصيل الدفعة' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
