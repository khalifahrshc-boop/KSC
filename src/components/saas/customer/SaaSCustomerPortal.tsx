/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Receipt,
  KeyRound,
  Building2,
  Users,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Download,
  Printer,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  Smartphone,
  Info,
  RefreshCw,
  Plus
} from 'lucide-react';
import {
  SaaSPlan,
  SaaSCustomer,
  SaaSSubscription,
  SaaSInvoice,
  SaaSPayment,
  SaaSLicense,
  SaaSDevice,
  SaaSSettings
} from '../../../types/saas';
import {
  calculateDaysRemaining,
  calculateEffectiveSubscriptionStatus,
  generateInvoiceNumber,
  generateLicenseKey,
  DEFAULT_SAAS_PLANS,
  DEFAULT_SAAS_SETTINGS
} from '../../../services/saasService';

import {
  ONLINE_PAYMENT_GATEWAY_NOTICE,
  EMAIL_PROVIDER_NOTICE,
  SMS_PROVIDER_NOTICE,
  WHATSAPP_PROVIDER_NOTICE,
  defaultPaymentProvider,
  defaultNotificationProvider
} from '../../../services/providerService';

import { generateSaaSInvoicePdf } from '../../../utils/pdf/SaaSInvoicePdf';

interface SaaSCustomerPortalProps {
  customer: SaaSCustomer;
  subscription: SaaSSubscription;
  license: SaaSLicense;
  plans?: SaaSPlan[];
  invoices?: SaaSInvoice[];
  payments?: SaaSPayment[];
  devices?: SaaSDevice[];
  settings?: SaaSSettings;
  tenantUsersCount?: number;
  tenantProjectsCount?: number;
  tenantDevicesCount?: number;
  lang?: 'ar' | 'en';
  onUpdateCustomerProfile?: (updated: Partial<SaaSCustomer>) => void;
  onConfirmPaymentCheckout?: (paymentData: {
    invoice: SaaSInvoice;
    payment: SaaSPayment;
    updatedSubscription: SaaSSubscription;
    updatedLicense: SaaSLicense;
  }) => void;
  onDeactivateDevice?: (deviceId: string) => void;
  onNavigateToWorkspace?: () => void;
}

export const SaaSCustomerPortal: React.FC<SaaSCustomerPortalProps> = ({
  customer,
  subscription,
  license,
  plans = DEFAULT_SAAS_PLANS,
  invoices = [],
  payments = [],
  devices = [],
  settings = DEFAULT_SAAS_SETTINGS,
  tenantUsersCount = 1,
  tenantProjectsCount = 1,
  tenantDevicesCount = 1,
  lang = 'ar',
  onUpdateCustomerProfile,
  onConfirmPaymentCheckout,
  onDeactivateDevice,
  onNavigateToWorkspace
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'subscription' | 'plans' | 'invoices' | 'payments' | 'license' | 'company' | 'settings'
  >('overview');

  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<SaaSPlan>(
    plans.find(p => p.id === subscription?.planId) || plans[0] || DEFAULT_SAAS_PLANS[0]
  );
  const [checkoutBillingCycle, setCheckoutBillingCycle] = useState<'Monthly' | 'Yearly'>(subscription?.billingCycle || 'Yearly');
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'Bank Transfer' | 'Online Gateway'>('Bank Transfer');
  const [bankReference, setBankReference] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutSuccessMessage, setCheckoutSuccessMessage] = useState('');

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    companyNameAr: customer.companyNameAr || '',
    companyNameEn: customer.companyNameEn || '',
    commercialRegistration: customer.commercialRegistration || '',
    vatNumber: customer.vatNumber || '',
    contactPerson: customer.contactPerson || '',
    email: customer.email || '',
    mobile: customer.mobile || '',
    addressAr: customer.addressAr || '',
    addressEn: customer.addressEn || ''
  });
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Derived Effective Status
  const effStatus = calculateEffectiveSubscriptionStatus(subscription);
  const currentPlan = plans.find(p => p.id === subscription.planId) || plans[0] || DEFAULT_SAAS_PLANS[0];

  const tenantInvoices = invoices.filter(i => i.tenantId === customer.id);
  const tenantPayments = payments.filter(p => p.tenantId === customer.id);
  const tenantDevicesList = devices.filter(d => d.tenantId === customer.id);

  // Resource Quota Limits
  const maxUsers = subscription?.maxUsers ?? currentPlan?.maxUsers ?? 5;
  const maxProjects = subscription?.maxProjects ?? currentPlan?.maxProjects ?? 3;
  const maxDevices = subscription?.maxDevices ?? currentPlan?.maxDevices ?? 5;

  const usersPct = maxUsers === -1 ? 0 : Math.min(100, Math.round((tenantUsersCount / maxUsers) * 100));
  const projectsPct = maxProjects === -1 ? 0 : Math.min(100, Math.round((tenantProjectsCount / maxProjects) * 100));
  const devicesPct = maxDevices === -1 ? 0 : Math.min(100, Math.round((tenantDevicesCount / maxDevices) * 100));

  // Payment Confirmation Processing Handler
  const handleExecutePaymentCheckout = () => {
    if (checkoutPaymentMethod === 'Bank Transfer' && !bankReference.trim()) {
      alert('يرجى إدخال رقم المرجع البنكي للإيداع.');
      return;
    }

    if (checkoutPaymentMethod === 'Online Gateway') {
      alert(`${ONLINE_PAYMENT_GATEWAY_NOTICE}. يرجى استخدام التحويل البنكي أو تسجيل الإيداع.`);
      return;
    }

    setIsProcessingCheckout(true);

    try {
      const nowIso = new Date().toISOString();
      const todayStr = nowIso.split('T')[0];
      const nextEndDate = new Date(
        Date.now() + (checkoutBillingCycle === 'Yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0];

      const vatRate = selectedCheckoutPlan.vatRate || settings.defaultVatRate || 15;
      const basePrice = checkoutBillingCycle === 'Yearly' ? selectedCheckoutPlan.yearlyPrice : selectedCheckoutPlan.monthlyPrice;
      const vatAmount = (basePrice * vatRate) / 100;
      const totalAmount = basePrice + vatAmount;

      const newInvNum = generateInvoiceNumber(Math.floor(10000 + Math.random() * 89999));
      const invId = `inv_${Date.now()}`;
      const payId = `pay_${Date.now()}`;

      const newInvoice: SaaSInvoice = {
        id: invId,
        invoiceNumber: newInvNum,
        tenantId: customer.id,
        subscriptionId: subscription.id,
        planId: selectedCheckoutPlan.id,
        planNameEn: selectedCheckoutPlan.nameEn,
        planNameAr: selectedCheckoutPlan.nameAr,
        sellerNameEn: settings.companyNameEn,
        sellerNameAr: settings.companyNameAr,
        sellerVatNumber: settings.sellerVatNumber,
        customerNameEn: customer.companyNameEn || customer.companyNameAr,
        customerNameAr: customer.companyNameAr,
        customerVatNumber: customer.vatNumber,
        customerCR: customer.commercialRegistration,
        billingPeriodStart: todayStr,
        billingPeriodEnd: nextEndDate,
        subtotal: basePrice,
        discount: 0,
        vatRate,
        vatAmount,
        totalAmount,
        issueDate: todayStr,
        dueDate: todayStr,
        paymentStatus: 'PENDING',
        createdAt: nowIso
      };

      const refNumber = bankReference.trim() || `TRF-${Date.now().toString().slice(-8)}`;

      const newPayment: SaaSPayment = {
        id: payId,
        tenantId: customer.id,
        subscriptionId: subscription.id,
        invoiceId: invId,
        amount: basePrice,
        discount: 0,
        vatAmount,
        totalAmount,
        paymentMethod: 'Bank Transfer',
        paymentDate: todayStr,
        referenceNumber: refNumber,
        status: 'PENDING',
        notes: checkoutNotes || 'إيداع بنكي لتجديد/ترقية اشتراك المنصة (قيد المراجعة)',
        createdBy: customer.contactPerson || 'Customer Admin',
        createdAt: nowIso
      };

      // Do NOT automatically set subscription status to ACTIVE or extend end date!
      // Keep current subscription and license state, updating only pending payment status reference
      const updatedSub: SaaSSubscription = {
        ...subscription,
        paymentStatus: 'PENDING',
        updatedAt: nowIso
      };

      const updatedLic: SaaSLicense = {
        ...license,
        updatedAt: nowIso
      };

      if (onConfirmPaymentCheckout) {
        onConfirmPaymentCheckout({
          invoice: newInvoice,
          payment: newPayment,
          updatedSubscription: updatedSub,
          updatedLicense: updatedLic
        });
      }

      defaultNotificationProvider.sendEmail({
        toEmail: customer.email,
        recipientName: customer.contactPerson,
        type: 'PAYMENT_SUCCESSFUL',
        titleAr: 'تم استلام طلب السداد بنجاح (قيد التدقيق)',
        titleEn: 'Payment Submitted (Pending Verification)',
        messageAr: `تم إيداع مرجع التحويل البنكي (${refNumber}) لمنشأتك ${customer.companyNameAr}. الطلب قيد مراجعة الإدارة.`,
        messageEn: `Bank transfer reference (${refNumber}) received for ${customer.companyNameEn}. Awaiting admin review.`
      });

      setTimeout(() => {
        setIsProcessingCheckout(false);
        setCheckoutSuccessMessage(`تم تسليم طلب السداد بنجاح (المرجع: ${refNumber}). طلبك قيد المراجعة والتدقيق لدى إدارة المنصة.`);
        setTimeout(() => {
          setShowCheckout(false);
          setCheckoutSuccessMessage('');
          setBankReference('');
          setCheckoutNotes('');
        }, 2000);
      }, 500);
    } catch (e) {
      console.error(e);
      setIsProcessingCheckout(false);
      alert('حدث خطأ أثناء معالجة الدفع.');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateCustomerProfile) {
      onUpdateCustomerProfile(profileForm);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 lg:p-8" dir="rtl">
      {/* 1. Header & Navigation Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
              {customer.companyNameAr?.[0] || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-white">{customer.companyNameAr}</h1>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  subscription.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : subscription.status === 'TRIAL'
                    ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {subscription.status === 'TRIAL' ? 'فترة تجريبية' : subscription.status === 'ACTIVE' ? 'اشتراك نشط' : 'منتهي الصلاحية'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-4">
                <span>السجل التجاري: <strong className="text-white font-mono">{customer.commercialRegistration}</strong></span>
                <span>•</span>
                <span>الرقم الضريبي: <strong className="text-white font-mono">{customer.vatNumber || 'غ/م'}</strong></span>
                <span>•</span>
                <span>الباقة: <strong className="text-sky-400">{currentPlan.nameAr}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToWorkspace && (
              <button
                onClick={onNavigateToWorkspace}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl border border-slate-700 transition-all flex items-center gap-2"
              >
                <span>الدخول لبيئة العمل الفعالة</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <button
              onClick={() => {
                setSelectedCheckoutPlan(currentPlan);
                setShowCheckout(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-sky-300" />
              <span>ترقية الباقة / تجديد الاشتراك</span>
            </button>
          </div>
        </div>

        {/* Status Warning Banner */}
        {subscription.status === 'TRIAL' && (
          <div className="mt-4 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                أنت الآن في الفترة التجريبية المجانية لـ <strong>{customer.companyNameAr}</strong>. المتبقي <strong>{effStatus.daysRemaining} يوماً</strong> قبل الانتهاء.
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedCheckoutPlan(currentPlan);
                setShowCheckout(true);
              }}
              className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-xs transition-colors shrink-0"
            >
              اختر باقة واشترك الآن
            </button>
          </div>
        )}

        {effStatus.isExpired && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                انتهت صلاحية اشتراك منشأتك. التطبيق حالياً في وضع القراءة فقط. يرجى تجديد الاشتراك لاستعادة كامل الصلاحيات.
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedCheckoutPlan(currentPlan);
                setShowCheckout(true);
              }}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-colors shrink-0"
            >
              تجديد الاشتراك الآن
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Tabbed Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Menu */}
        <div className="lg:col-span-1 space-y-2 bg-slate-900 border border-slate-800 p-4 rounded-2xl h-fit">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 py-2">لوحة الحساب التجاري</div>

          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'overview' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>نظرة عامة والملخص</span>
          </button>

          <button
            onClick={() => setActiveTab('subscription')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'subscription' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>اشتراكي الحالي</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'plans' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>الباقات والترقية</span>
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'invoices' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-4 h-4" />
              <span>فواتيري الضريبية</span>
            </div>
            <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">{tenantInvoices.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'payments' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <span>سجل المدفوعات</span>
            </div>
            <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">{tenantPayments.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('license')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'license' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>الرخصة والأجهزة</span>
          </button>

          <button
            onClick={() => setActiveTab('company')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'company' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>ملف المنشأة</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'settings' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>الإعدادات والربط</span>
          </button>
        </div>

        {/* Right Content View */}
        <div className="lg:col-span-3 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Pending Payment Review Banner */}
              {tenantPayments.some(p => p.status === 'PENDING') && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <div className="font-bold text-sm">توجد عملية تحويل بنكي قيد المراجعة والاعتماد لدى إدارة المنصة</div>
                    <div className="text-xs text-amber-200/80 mt-1">
                      تم تسجيل المرجع البنكي ({tenantPayments.find(p => p.status === 'PENDING')?.referenceNumber}). جاري التحقق من الإيداع البنكي وسيرتفع اشتراكك ورخصتك فور الاعتماد النهائي.
                    </div>
                  </div>
                </div>
              )}

              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 mb-2">الباقة النشطة</div>
                  <div className="text-2xl font-black text-white">{currentPlan.nameAr}</div>
                  <div className="text-xs text-sky-400 mt-2">دورة الفوترة: {subscription.billingCycle}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 mb-2">الأيام المتبقية في الاشتراك</div>
                  <div className="text-3xl font-black text-sky-400 font-mono">{effStatus.daysRemaining} <span className="text-sm font-normal text-slate-400">يوم</span></div>
                  <div className="text-xs text-slate-500 mt-2">ينتهي في: {subscription.endDate}</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <div className="text-xs font-bold text-slate-400 mb-2">حالة الرخصة الأجهزة</div>
                  <div className="text-2xl font-black text-emerald-400">{license.status}</div>
                  <div className="text-xs font-mono text-slate-400 mt-2">{license.licenseKey}</div>
                </div>
              </div>

              {/* Quota Progress Cards */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-sky-400" />
                  <span>استهلاك الموارد المتاحة في الباقة</span>
                </h3>

                {/* Users Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">المستخدمين المعتمدين (Users)</span>
                    <span className="text-sky-400 font-mono">
                      {tenantUsersCount} / {maxUsers === -1 ? 'غير محدود' : maxUsers}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div className="bg-sky-500 h-full rounded-full transition-all" style={{ width: `${maxUsers === -1 ? 10 : usersPct}%` }}></div>
                  </div>
                </div>

                {/* Projects Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">المشاريع النشطة (Projects)</span>
                    <span className="text-indigo-400 font-mono">
                      {tenantProjectsCount} / {maxProjects === -1 ? 'غير محدود' : maxProjects}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${maxProjects === -1 ? 10 : projectsPct}%` }}></div>
                  </div>
                </div>

                {/* Devices Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-300">الأجهزة المصرحة (Devices)</span>
                    <span className="text-emerald-400 font-mono">
                      {tenantDevicesCount} / {maxDevices === -1 ? 'غير محدود' : maxDevices}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${maxDevices === -1 ? 10 : devicesPct}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY SUBSCRIPTION */}
          {activeTab === 'subscription' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">تفاصيل الاشتراك التجاري النشط</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-slate-400 block">اسم الباقة الحالية:</span>
                    <span className="text-base font-bold text-white">{currentPlan.nameAr}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">تاريخ بداية الاشتراك:</span>
                    <span className="font-mono text-slate-200">{subscription.startDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">تاريخ التجديد القادم:</span>
                    <span className="font-mono text-sky-400 font-bold">{subscription.endDate}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">دورة الفوترة:</span>
                    <span className="text-slate-200">{subscription.billingCycle}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-slate-400 block">قيمة الاشتراك (الأساسي):</span>
                    <span className="font-mono text-slate-200">{subscription.basePrice.toLocaleString()} ر.س</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">ضريبة القيمة المضافة ({subscription.vatRate}%):</span>
                    <span className="font-mono text-slate-200">{subscription.vatAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">إجمالي المستحق عند التجديد:</span>
                    <span className="font-mono text-xl font-bold text-emerald-400">{subscription.totalAmount.toLocaleString()} ر.س</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">حالة الدفع:</span>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {subscription.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex flex-wrap gap-4">
                <button
                  onClick={() => {
                    setSelectedCheckoutPlan(currentPlan);
                    setShowCheckout(true);
                  }}
                  className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-sky-500/20"
                >
                  تجديد الاشتراك الآن
                </button>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl border border-slate-700 transition-all"
                >
                  تغيير / ترقية الباقة
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PLANS & UPGRADE */}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-2">استعراض باقات الاشتراك</h3>
                <p className="text-slate-400 text-xs mb-6">يمكنك ترقية الباقة فورياً للاستفادة من المزايا والسعات الإضافية.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map(p => {
                    const isCurrent = p.id === subscription.planId;
                    return (
                      <div
                        key={p.id}
                        className={`rounded-2xl p-6 bg-slate-950 border transition-all ${
                          isCurrent ? 'border-sky-500 ring-1 ring-sky-500' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-white text-base">{p.nameAr}</h4>
                          {isCurrent && <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-bold">باقتك الحالية</span>}
                        </div>
                        <p className="text-slate-400 text-xs mb-4">{p.descriptionAr}</p>
                        <div className="text-2xl font-black text-sky-300 mb-4">{p.monthlyPrice.toLocaleString()} <span className="text-xs font-normal text-slate-400">ر.س/شهرياً</span></div>

                        <button
                          onClick={() => {
                            setSelectedCheckoutPlan(p);
                            setShowCheckout(true);
                          }}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                            isCurrent
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              : 'bg-sky-500 hover:bg-sky-400 text-white shadow-md'
                          }`}
                        >
                          {isCurrent ? 'إعادة التجديد بهذه الباقة' : 'الترقية لهذه الباقة'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">الفواتير الضريبية المعتمدة (ZATCA Invoices)</h3>
                <span className="text-xs text-slate-400">جميع الفواتير صادرة آلياً برمز الاستجابة السريعة QR</span>
              </div>

              {tenantInvoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  لا توجد فواتير صادرة لهذا الحساب حتى الآن.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">رقم الفاتورة</th>
                        <th className="p-3">تاريخ الإصدار</th>
                        <th className="p-3">الباقة / البيان</th>
                        <th className="p-3">المبلغ قبل الضريبة</th>
                        <th className="p-3">الضريبة (15%)</th>
                        <th className="p-3">الإجمالي</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {tenantInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-800/50">
                          <td className="p-3 font-mono font-bold text-sky-400" dir="ltr">{inv.invoiceNumber}</td>
                          <td className="p-3 font-mono" dir="ltr">{inv.issueDate}</td>
                          <td className="p-3 font-bold text-white">{inv.planNameAr}</td>
                          <td className="p-3 font-mono" dir="ltr">{inv.subtotal.toLocaleString()} SAR</td>
                          <td className="p-3 font-mono" dir="ltr">{inv.vatAmount.toLocaleString()} SAR</td>
                          <td className="p-3 font-mono font-bold text-emerald-400" dir="ltr">{inv.totalAmount.toLocaleString()} SAR</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {inv.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => generateSaaSInvoicePdf(inv)}
                              className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white rounded-lg transition-all text-xs font-bold flex items-center justify-center gap-1 mx-auto"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>تحميل ZATCA PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white">سجل المدفوعات والإيداعات البنكية</h3>

              {tenantPayments.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  لا توجد عمليات دفع مسجلة لهذا الحساب.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">تاريخ العملية</th>
                        <th className="p-3">المرجع البنكي</th>
                        <th className="p-3">طريقة الدفع</th>
                        <th className="p-3">المبلغ الصافي</th>
                        <th className="p-3">الضريبة</th>
                        <th className="p-3">الإجمالي المسدد</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3">ملاحظات الإدارة / المرجع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {tenantPayments.map(pay => (
                        <tr key={pay.id} className="hover:bg-slate-800/50">
                          <td className="p-3 font-mono" dir="ltr">{pay.paymentDate}</td>
                          <td className="p-3 font-mono text-sky-400" dir="ltr">{pay.referenceNumber}</td>
                          <td className="p-3">{pay.paymentMethod}</td>
                          <td className="p-3 font-mono" dir="ltr">{pay.amount.toLocaleString()} SAR</td>
                          <td className="p-3 font-mono" dir="ltr">{pay.vatAmount.toLocaleString()} SAR</td>
                          <td className="p-3 font-mono font-bold text-emerald-400" dir="ltr">{pay.totalAmount.toLocaleString()} SAR</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              pay.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : pay.status === 'CONFIRMED' || pay.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : pay.status === 'REJECTED'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {pay.status === 'PENDING' ? 'قيد المراجعة' : pay.status === 'CONFIRMED' || pay.status === 'PAID' ? 'مؤكد ومسدد' : pay.status === 'REJECTED' ? 'مرفوض' : pay.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[11px] max-w-xs truncate">
                            {pay.notes || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: LICENSE & DEVICES */}
          {activeTab === 'license' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white">رخصة المنصة التجارية والأجهزة المعتمدة</h3>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <div className="text-xs text-slate-400">مفتاح الرخصة المعتمد (License Key)</div>
                  <div className="text-xl font-mono font-black text-sky-400 mt-1">{license.licenseKey}</div>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>الحالة: <strong className="text-emerald-400">{license.status}</strong></div>
                  <div>تاريخ الانتهاء: <strong className="text-white font-mono">{license.expiryDate}</strong></div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>الأجهزة الميدانية المصرح لها بالاتصال</span>
                </h4>

                {tenantDevicesList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    لم يتم تسجيل أجهزة جديدة بعد. يتم تسجيل الجهاز تلقائياً عند أول دخول للنظام.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tenantDevicesList.map(dev => (
                      <div key={dev.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white">{dev.deviceName}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">{dev.os} • {dev.appVersion}</div>
                          <div className="text-[10px] text-slate-500 mt-1">آخر ظهور: {dev.lastSeen}</div>
                        </div>

                        {onDeactivateDevice && (
                          <button
                            onClick={() => onDeactivateDevice(dev.id)}
                            className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-all text-xs font-bold"
                          >
                            إلغاء التنشيط
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: COMPANY PROFILE */}
          {activeTab === 'company' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white">إدارة ملف المنشأة وبيانات الفوترة</h3>

              {profileSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>تم تحديث بيانات المنشأة بنجاح.</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">اسم المنشأة بالعربية</label>
                  <input
                    type="text"
                    value={profileForm.companyNameAr}
                    onChange={e => setProfileForm({ ...profileForm, companyNameAr: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">اسم المنشأة بالإنجليزية</label>
                  <input
                    type="text"
                    value={profileForm.companyNameEn}
                    onChange={e => setProfileForm({ ...profileForm, companyNameEn: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">رقم السجل التجاري</label>
                  <input
                    type="text"
                    value={profileForm.commercialRegistration}
                    onChange={e => setProfileForm({ ...profileForm, commercialRegistration: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500 text-sm"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">الرقم الضريبي (15 رقماً)</label>
                  <input
                    type="text"
                    value={profileForm.vatNumber}
                    onChange={e => setProfileForm({ ...profileForm, vatNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500 text-sm"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">اسم المسؤول التنفيذي</label>
                  <input
                    type="text"
                    value={profileForm.contactPerson}
                    onChange={e => setProfileForm({ ...profileForm, contactPerson: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm"
                    dir="ltr"
                  />
                </div>

                <div className="md:col-span-2 pt-4">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm rounded-xl transition-all shadow-md"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 8: SETTINGS & PROVIDER STATUS */}
          {activeTab === 'settings' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-bold text-white">إعدادات الربط وحالة مزودي الخدمات الخارجية</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Provider Badge */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">بوابة الدفع الإلكتروني (Online Payment Gateway)</div>
                  <div className="text-sm font-bold text-amber-400 font-mono">{ONLINE_PAYMENT_GATEWAY_NOTICE}</div>
                  <div className="text-[10px] text-slate-500 mt-2">
                    النظام جاهز برمجياً للربط مع بوابات مدى، مدى هيبرباي، وجيدبا. التسجيل الحالي يتم بالإيداع البنكي المباشر.
                  </div>
                </div>

                {/* Email Provider Badge */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">مزود البريد الإلكتروني (Email Delivery)</div>
                  <div className="text-sm font-bold text-sky-400 font-mono">{EMAIL_PROVIDER_NOTICE}</div>
                  <div className="text-[10px] text-slate-500 mt-2">
                    البنية التحتية لإصدار الإشعارات وإرسال الفواتير جاهزة. يتم تسجيل الفعاليات داخلياً في سجلا التدقيق.
                  </div>
                </div>

                {/* SMS Provider Badge */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">مزود الرسائل النصية (SMS Delivery)</div>
                  <div className="text-sm font-bold text-indigo-400 font-mono">{SMS_PROVIDER_NOTICE}</div>
                  <div className="text-[10px] text-slate-500 mt-2">
                    البنية التحتية جاهزة للربط مع مزودي SMS المحليين بالمملكة.
                  </div>
                </div>

                {/* WhatsApp Provider Badge */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">مزود أتمتة واتساب (WhatsApp Business API)</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono">{WHATSAPP_PROVIDER_NOTICE}</div>
                  <div className="text-[10px] text-slate-500 mt-2">
                    البنية التحتية جاهزة للربط مع Meta WhatsApp Cloud API.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-sky-400" />
                <span>إتمام عملية التجديد / سداد اشتراك المنصة</span>
              </h3>
              <button
                onClick={() => setShowCheckout(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                إغلاق
              </button>
            </div>

            {checkoutSuccessMessage ? (
              <div className="p-6 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <div className="text-base font-bold text-emerald-400">{checkoutSuccessMessage}</div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Plan Details & Calculation */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between font-bold text-slate-300">
                    <span>الباقة المختارة:</span>
                    <span className="text-sky-400">{selectedCheckoutPlan.nameAr}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>دورة الفوترة:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setCheckoutBillingCycle('Yearly')}
                        className={`px-2 py-0.5 rounded ${checkoutBillingCycle === 'Yearly' ? 'bg-sky-500 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}
                      >
                        سنوي
                      </button>
                      <button
                        type="button"
                        onClick={() => setCheckoutBillingCycle('Monthly')}
                        className={`px-2 py-0.5 rounded ${checkoutBillingCycle === 'Monthly' ? 'bg-sky-500 text-white font-bold' : 'bg-slate-800 text-slate-400'}`}
                      >
                        شهري
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-2 space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>المبلغ قبل الضريبة:</span>
                      <span className="font-mono">
                        {(checkoutBillingCycle === 'Yearly' ? selectedCheckoutPlan.yearlyPrice : selectedCheckoutPlan.monthlyPrice).toLocaleString()} ر.س
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>ضريبة القيمة المضافة ({selectedCheckoutPlan.vatRate || 15}%):</span>
                      <span className="font-mono">
                        {(((checkoutBillingCycle === 'Yearly' ? selectedCheckoutPlan.yearlyPrice : selectedCheckoutPlan.monthlyPrice) * (selectedCheckoutPlan.vatRate || 15)) / 100).toLocaleString()} ر.س
                      </span>
                    </div>
                    <div className="flex justify-between font-extrabold text-sm text-emerald-400 border-t border-slate-800 pt-1">
                      <span>الإجمالي المباشر:</span>
                      <span className="font-mono">
                        {((checkoutBillingCycle === 'Yearly' ? selectedCheckoutPlan.yearlyPrice : selectedCheckoutPlan.monthlyPrice) * (1 + (selectedCheckoutPlan.vatRate || 15) / 100)).toLocaleString()} ر.س
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block font-bold text-slate-300 mb-2">اختر طريقة السداد:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod('Bank Transfer')}
                      className={`p-3 rounded-xl border text-right font-bold transition-all ${
                        checkoutPaymentMethod === 'Bank Transfer' ? 'border-sky-500 bg-sky-950/20 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      إيداع / تحويل بنكي مباشر
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutPaymentMethod('Online Gateway')}
                      className={`p-3 rounded-xl border text-right font-bold transition-all relative ${
                        checkoutPaymentMethod === 'Online Gateway' ? 'border-sky-500 bg-sky-950/20 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <span>مدى / Visa / Apple Pay</span>
                      <span className="block text-[9px] text-amber-400 mt-0.5">غير متصل حالياً</span>
                    </button>
                  </div>
                </div>

                {checkoutPaymentMethod === 'Bank Transfer' ? (
                  <div className="space-y-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-300 leading-relaxed">
                      الحساب البنكي المعتمد: <strong>البنك الأهلي السعودي (SNB)</strong><br />
                      الآيبان: <strong className="font-mono text-sky-400" dir="ltr">SA92 1000 0000 3101 2345 6700</strong>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1">رقم المرجع البنكي للإيداع *</label>
                      <input
                        type="text"
                        placeholder="TRF-XXXXXX"
                        value={bankReference}
                        onChange={e => setBankReference(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                        dir="ltr"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{ONLINE_PAYMENT_GATEWAY_NOTICE}. يرجى تحويل الخيار إلى "تحويل بنكي" لإكمال عملية التسجيل.</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isProcessingCheckout}
                  onClick={handleExecutePaymentCheckout}
                  className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {isProcessingCheckout ? 'جاري تأكيد عملية الدفع...' : 'تأكيد السداد وتفعيل اشتراك المنصة'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
