/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SaaSInvoice,
  SaaSPayment,
  SaaSCustomer,
  SaaSSubscription,
  SaaSPlan,
  SaaSLicense,
  SaaSAuditLog
} from '../../types/saas';
import {
  FileText,
  CreditCard,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  DollarSign,
  AlertCircle,
  Check,
  X,
  Info,
  ShieldCheck
} from 'lucide-react';
import { generateSaaSInvoicePdf } from '../../utils/pdf/SaaSInvoicePdf';

interface SaaSInvoicesPaymentsTabProps {
  invoices: SaaSInvoice[];
  payments: SaaSPayment[];
  customers: SaaSCustomer[];
  subscriptions: SaaSSubscription[];
  plans?: SaaSPlan[];
  licenses?: SaaSLicense[];
  lang: 'ar' | 'en';
  onSavePayment?: (pay: SaaSPayment) => void;
  onSaveInvoice?: (inv: SaaSInvoice) => void;
  onSaveSubscription?: (sub: SaaSSubscription) => void;
  onSaveLicense?: (lic: SaaSLicense) => void;
  onAddAuditLog?: (log: SaaSAuditLog) => void;
  currentUser?: { name: string; id: string };
}

export default function SaaSInvoicesPaymentsTab({
  invoices,
  payments,
  customers,
  subscriptions,
  plans = [],
  licenses = [],
  lang,
  onSavePayment,
  onSaveInvoice,
  onSaveSubscription,
  onSaveLicense,
  onAddAuditLog,
  currentUser
}: SaaSInvoicesPaymentsTabProps) {
  const isRtl = lang === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'payments' | 'pending'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for Payment Actions
  const [selectedPaymentForConfirm, setSelectedPaymentForConfirm] = useState<SaaSPayment | null>(null);
  const [selectedPaymentForReject, setSelectedPaymentForReject] = useState<SaaSPayment | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const pendingPayments = payments.filter(p => p.status === 'PENDING');

  const filteredInvoices = invoices.filter(inv => {
    const searchLower = searchTerm.toLowerCase();
    const cust = customers.find(c => c.id === inv.tenantId);
    return (
      inv.invoiceNumber.toLowerCase().includes(searchLower) ||
      inv.tenantId.toLowerCase().includes(searchLower) ||
      (cust && (cust.companyNameEn.toLowerCase().includes(searchLower) || cust.companyNameAr.toLowerCase().includes(searchLower)))
    );
  });

  const filteredPayments = payments.filter(pay => {
    const searchLower = searchTerm.toLowerCase();
    const cust = customers.find(c => c.id === pay.tenantId);
    const matchesSearch =
      pay.id.toLowerCase().includes(searchLower) ||
      pay.referenceNumber.toLowerCase().includes(searchLower) ||
      pay.tenantId.toLowerCase().includes(searchLower) ||
      (cust && (cust.companyNameEn.toLowerCase().includes(searchLower) || cust.companyNameAr.toLowerCase().includes(searchLower)));

    if (activeSubTab === 'pending') {
      return matchesSearch && pay.status === 'PENDING';
    }
    return matchesSearch;
  });

  // Handle Confirming Payment (ADMIN ACTION)
  const handleConfirmPayment = () => {
    if (!selectedPaymentForConfirm) return;

    const pay = selectedPaymentForConfirm;
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    // Find customer & subscription
    const sub = subscriptions.find(s => s.id === pay.subscriptionId || s.tenantId === pay.tenantId);
    const inv = invoices.find(i => i.id === pay.invoiceId || i.tenantId === pay.tenantId);
    const lic = licenses.find(l => l.tenantId === pay.tenantId || (sub && l.id === sub.licenseId));

    const cycle = sub?.billingCycle || 'Yearly';
    const daysToAdd = cycle === 'Yearly' ? 365 : 30;
    const nextEndDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Confirm Payment
    const updatedPay: SaaSPayment = {
      ...pay,
      status: 'CONFIRMED',
      notes: `${pay.notes || ''} [تمت الموافقة من الإدارة بتاريخ ${todayStr}: ${adminNote.trim() || 'اعتماد بنكي مؤكد'}]`,
      createdAt: pay.createdAt || nowIso
    };

    // 2. Update Invoice to PAID
    let updatedInv: SaaSInvoice | null = null;
    if (inv) {
      updatedInv = {
        ...inv,
        paymentStatus: 'PAID',
        dueDate: todayStr
      };
    }

    // 3. Update Subscription to ACTIVE & extend dates
    let updatedSub: SaaSSubscription | null = null;
    if (sub) {
      updatedSub = {
        ...sub,
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        startDate: todayStr,
        endDate: nextEndDate,
        updatedAt: nowIso
      };
    }

    // 4. Update License to ACTIVE & extend expiry
    let updatedLic: SaaSLicense | null = null;
    if (lic) {
      updatedLic = {
        ...lic,
        status: 'ACTIVE',
        activationDate: todayStr,
        expiryDate: nextEndDate,
        lastValidation: nowIso,
        updatedAt: nowIso
      };
    }

    // Save state
    if (onSavePayment) onSavePayment(updatedPay);
    if (updatedInv && onSaveInvoice) onSaveInvoice(updatedInv);
    if (updatedSub && onSaveSubscription) onSaveSubscription(updatedSub);
    if (updatedLic && onSaveLicense) onSaveLicense(updatedLic);

    // Add Audit Log
    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit_${Date.now()}`,
        tenantId: pay.tenantId,
        actorId: currentUser?.id || 'admin',
        actorName: currentUser?.name || 'SaaS Admin',
        action: 'PAYMENT_CONFIRMED',
        entityType: 'Payment',
        entityId: pay.id,
        timestamp: nowIso,
        reason: adminNote.trim() || 'تم اعتماد التحويل البنكي وتفعيل الاشتراك بنجاح'
      });
    }

    setSelectedPaymentForConfirm(null);
    setAdminNote('');
    setActionSuccessMsg('تم تأكيد الدفع وتفعيل اشتراك ورخصة المنصة للعميل بنجاح!');
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  // Handle Rejecting Payment (ADMIN ACTION)
  const handleRejectPayment = () => {
    if (!selectedPaymentForReject) return;

    if (!rejectionReason.trim()) {
      alert('يرجى كتابة سبب الرفض لتوضيح السبب للعميل.');
      return;
    }

    const pay = selectedPaymentForReject;
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.split('T')[0];

    const inv = invoices.find(i => i.id === pay.invoiceId || i.tenantId === pay.tenantId);

    // 1. Reject Payment
    const updatedPay: SaaSPayment = {
      ...pay,
      status: 'REJECTED',
      notes: `${pay.notes || ''} [سبب رفض الإدارة: ${rejectionReason.trim()}]`
    };

    // 2. Mark Invoice as CANCELLED / UNPAID
    let updatedInv: SaaSInvoice | null = null;
    if (inv) {
      updatedInv = {
        ...inv,
        paymentStatus: 'CANCELLED'
      };
    }

    // Subscription & License remain unchanged!

    if (onSavePayment) onSavePayment(updatedPay);
    if (updatedInv && onSaveInvoice) onSaveInvoice(updatedInv);

    // Audit Log
    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit_${Date.now()}`,
        tenantId: pay.tenantId,
        actorId: currentUser?.id || 'admin',
        actorName: currentUser?.name || 'SaaS Admin',
        action: 'PAYMENT_REJECTED',
        entityType: 'Payment',
        entityId: pay.id,
        timestamp: nowIso,
        reason: rejectionReason.trim()
      });
    }

    setSelectedPaymentForReject(null);
    setRejectionReason('');
    setActionSuccessMsg('تم تسجيل رفض طلب التحويل البنكي وتحديث السجل بنجاح.');
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner if Pending Payments Exist */}
      {pendingPayments.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <div className="font-bold text-sm">توجد ({pendingPayments.length}) طلبات سداد تحويل بنكي قيد التدقيق والمراجعة</div>
              <div className="text-xs text-amber-200/80">يرجى مراجعة مرجع التحويل واختيار "تأكيد واستلام" لتفعيل اشتراك العميل آلياً.</div>
            </div>
          </div>
          <button
            onClick={() => setActiveSubTab('pending')}
            className="px-4 py-2 bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl hover:bg-amber-400 transition-all shadow"
          >
            عرض الطلبات المعلقة ({pendingPayments.length})
          </button>
        </div>
      )}

      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === 'invoices'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            {isRtl ? 'الفواتير الضريبية (Invoices)' : 'Tax Invoices'} ({invoices.length})
          </button>

          <button
            onClick={() => setActiveSubTab('payments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeSubTab === 'payments'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            {isRtl ? 'سجل جميع المدفوعات' : 'All Payments'} ({payments.length})
          </button>

          <button
            onClick={() => setActiveSubTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 relative ${
              activeSubTab === 'pending'
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>طلبات قيد المراجعة</span>
            {pendingPayments.length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-600 text-white text-[10px] font-mono rounded-full">
                {pendingPayments.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 rtl:right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'ابحث برقم الفاتورة، الشركة أو المرجع...' : 'Search invoice, company or ref...'}
            className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* VIEW 1: INVOICES LIST */}
      {activeSubTab === 'invoices' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                  <th className="p-4">{isRtl ? 'رقم الفاتورة' : 'Invoice Number'}</th>
                  <th className="p-4">{isRtl ? 'العميل' : 'Customer'}</th>
                  <th className="p-4">{isRtl ? 'الباقة' : 'Plan'}</th>
                  <th className="p-4">{isRtl ? 'تاريخ الإصدار' : 'Issue Date'}</th>
                  <th className="p-4">{isRtl ? 'الحالة' : 'Status'}</th>
                  <th className="p-4 text-left rtl:text-left">{isRtl ? 'المبلغ الشامل للضريبة' : 'Total Amount'}</th>
                  <th className="p-4 text-center">{isRtl ? 'تحميل PDF' : 'Download PDF'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.map(inv => {
                  const cust = customers.find(c => c.id === inv.tenantId);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        {cust ? (isRtl ? cust.companyNameAr : cust.companyNameEn) : inv.tenantId}
                      </td>
                      <td className="p-4">
                        {isRtl ? inv.planNameAr : inv.planNameEn}
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {inv.issueDate}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          inv.paymentStatus === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : inv.paymentStatus === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400'
                        }`}>
                          {inv.paymentStatus === 'PENDING' ? 'قيد السداد' : inv.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-left rtl:text-left font-bold text-slate-900 dark:text-white">
                        {inv.totalAmount.toLocaleString()} SAR
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => generateSaaSInvoicePdf(inv)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2 & 3: PAYMENTS LEDGER & PENDING REVIEWS */}
      {(activeSubTab === 'payments' || activeSubTab === 'pending') && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                  <th className="p-4">{isRtl ? 'المعرف والمرجع البنكي' : 'ID & Bank Ref'}</th>
                  <th className="p-4">{isRtl ? 'اسم المنشأة والعميل' : 'Customer Company'}</th>
                  <th className="p-4">{isRtl ? 'طريقة الدفع' : 'Payment Method'}</th>
                  <th className="p-4">{isRtl ? 'التاريخ' : 'Date'}</th>
                  <th className="p-4">{isRtl ? 'الحالة' : 'Status'}</th>
                  <th className="p-4">{isRtl ? 'المبلغ الصافي + الضريبة' : 'Amount + VAT'}</th>
                  <th className="p-4 text-center">{isRtl ? 'إجراءات التدقيق والاعتماد' : 'Admin Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                      لا توجد مدفوعات مطابقة للبحث أو الملاحظة حالياً.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(pay => {
                    const cust = customers.find(c => c.id === pay.tenantId);
                    const isPending = pay.status === 'PENDING';

                    return (
                      <tr key={pay.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/30 ${isPending ? 'bg-amber-500/5' : ''}`}>
                        <td className="p-4 font-mono text-xs">
                          <span className="font-bold text-slate-900 dark:text-white block">{pay.id}</span>
                          <span className="text-sky-600 dark:text-sky-400 font-bold text-xs">{pay.referenceNumber}</span>
                        </td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          <div>{cust ? (isRtl ? cust.companyNameAr : cust.companyNameEn) : pay.tenantId}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-normal">CR: {cust?.commercialRegistration || '—'}</div>
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {pay.paymentMethod}
                        </td>
                        <td className="p-4 font-mono text-xs">
                          {pay.paymentDate}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            pay.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                              : pay.status === 'CONFIRMED' || pay.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                              : pay.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                              : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {pay.status === 'PENDING' ? 'قيد المراجعة' : pay.status === 'CONFIRMED' || pay.status === 'PAID' ? 'مؤكد ومسدد' : pay.status === 'REJECTED' ? 'مرفوض' : pay.status}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">
                          <div>{pay.totalAmount.toLocaleString()} SAR</div>
                          <div className="text-[10px] text-slate-400 font-normal">شامل ضريبة 15%</div>
                        </td>
                        <td className="p-4 text-center">
                          {isPending ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedPaymentForConfirm(pay)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تأكيد التحصيل</span>
                              </button>
                              <button
                                onClick={() => setSelectedPaymentForReject(pay)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رفض</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              {pay.status === 'CONFIRMED' || pay.status === 'PAID' ? 'تم الاعتماد والتفعيل' : 'مرفوض'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {selectedPaymentForConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>اعتماد وتأكيد الإيداع البنكي للعميل</span>
              </h3>
              <button onClick={() => setSelectedPaymentForConfirm(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">العميل / المنشأة:</span>
                  <strong className="text-white">
                    {customers.find(c => c.id === selectedPaymentForConfirm.tenantId)?.companyNameAr || selectedPaymentForConfirm.tenantId}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">المرجع البنكي:</span>
                  <strong className="font-mono text-sky-400">{selectedPaymentForConfirm.referenceNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">طريقة الدفع والتاريخ:</span>
                  <span className="text-slate-300 font-mono">{selectedPaymentForConfirm.paymentMethod} ({selectedPaymentForConfirm.paymentDate})</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-sm text-emerald-400">
                  <span>إجمالي المبلغ المؤكد:</span>
                  <span className="font-mono">{selectedPaymentForConfirm.totalAmount.toLocaleString()} SAR</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">ملاحظة الإدارة عند الاعتماد (اختياري)</label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="مثال: تم التأكد من كشف حساب الأهلي / مطابقة الإيداع..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px] leading-relaxed">
                تنبيه: تأكيد السداد سيقوم تلقائياً بتحديث حالة الفاتورة إلى <strong>PAID</strong> وتفعيل الاشتراك والرخصة التجارية وتمديد صلاحيتها آلياً.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleConfirmPayment}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow transition-all"
                >
                  تأكيد التحصيل وتفعيل الاشتراك
                </button>
                <button
                  onClick={() => setSelectedPaymentForConfirm(null)}
                  className="px-5 py-3 bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {selectedPaymentForReject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                <span>رفض طلب الإيداع البنكي</span>
              </h3>
              <button onClick={() => setSelectedPaymentForReject(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">المرجع البنكي:</span>
                  <strong className="font-mono text-sky-400">{selectedPaymentForReject.referenceNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">المبلغ المطالب:</span>
                  <strong className="font-mono text-rose-400">{selectedPaymentForReject.totalAmount.toLocaleString()} SAR</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">سبب عدم الاعتماد / الرفض *</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="مثال: لم نتمكن من مطابقة مرجع التحويل في كشف الحساب، أو المبلغ المحول غير مكتمل..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRejectPayment}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl shadow transition-all"
                >
                  تأكيد رفض طلب التحويل
                </button>
                <button
                  onClick={() => setSelectedPaymentForReject(null)}
                  className="px-5 py-3 bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
