/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { auth } from '../../../lib/firebase';
import { dbApi } from '../../../lib/api';
import { createUserWithEmailAndPassword, sendEmailVerification, deleteUser } from 'firebase/auth';
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { SaaSPlan, SaaSSettings } from '../../../types/saas';
import {
  DEFAULT_SAAS_PLANS,
  DEFAULT_SAAS_SETTINGS,
  createNewTenantRegistration,
  SaaSRegistrationPayload
} from '../../../services/saasService';

interface SaaSPublicRegisterProps {
  plans?: SaaSPlan[];
  settings?: SaaSSettings;
  initialPlanId?: string;
  onSuccessRegistration: (registeredData: {
    customer: any;
    user: any;
    subscription: any;
    license: any;
    auditLog: any;
  }) => void;
  onCancel: () => void;
  onOpenLogin?: () => void;
}

export const SaaSPublicRegister: React.FC<SaaSPublicRegisterProps> = ({
  plans = DEFAULT_SAAS_PLANS,
  settings = DEFAULT_SAAS_SETTINGS,
  initialPlanId,
  onSuccessRegistration,
  onCancel
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId || plans[1]?.id || plans[0]?.id || 'plan_pro');
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Yearly');

  const [form, setForm] = useState({
    companyNameAr: '',
    companyNameEn: '',
    commercialRegistration: '',
    vatNumber: '',
    addressAr: 'الرياض، المملكة العربية السعودية',
    addressEn: 'Riyadh, Saudi Arabia',
    contactPerson: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    emailNotifications: true,
    smsNotifications: true,
    acceptTerms: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan = plans.find(p => p.id === selectedPlanId) || plans[0] || DEFAULT_SAAS_PLANS[0];

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!form.companyNameAr.trim()) errs.companyNameAr = 'اسم المنشأة بالعربية مطلوب.';
    if (!form.commercialRegistration.trim()) {
      errs.commercialRegistration = 'رقم السجل التجاري مطلوب.';
    } else if (!/^\d{10}$/.test(form.commercialRegistration.trim())) {
      errs.commercialRegistration = 'السجل التجاري يجب أن يتكون من 10 أرقام.';
    }

    if (form.vatNumber.trim() && !/^\d{15}$/.test(form.vatNumber.trim())) {
      errs.vatNumber = 'الرقم الضريبي يجب أن يتكون من 15 رقماً ويبدأ بـ 3.';
    }

    if (!form.contactPerson.trim()) errs.contactPerson = 'اسم مدير الحساب / المسؤول مطلوب.';

    if (!form.email.trim()) {
      errs.email = 'البريد الإلكتروني مطلوب.';
    } else if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
      errs.email = 'صيغة البريد الإلكتروني غير صحيحة.';
    }

    if (!form.mobile.trim()) errs.mobile = 'رقم الجوال مطلوب.';

    if (!form.password) {
      errs.password = 'كلمة المرور مطلوبة.';
    } else if (form.password.length < 6) {
      errs.password = 'كلمة المرور يجب ألا تقل عن 6 خانات.';
    }

    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'كلمتا المرور غير متطابقتين.';
    }

    if (!form.acceptTerms) {
      errs.acceptTerms = 'يجب الموافقة على الشروط والأحكام للاستمرار.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      let fbUid: string | undefined;
      let fbUser: any;

      // 1. Create Firebase Auth user
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
        fbUser = userCredential.user;
        fbUid = userCredential.user.uid;

        // 2. Send email verification
        try {
          await sendEmailVerification(userCredential.user);
        } catch (vErr) {
          console.warn('Verification email notice:', vErr);
        }
      } catch (authErr: any) {
        console.warn('Auth user creation notice:', authErr);
        if (authErr.code === 'auth/email-already-in-use') {
          setErrors({
            submit: 'البريد الإلكتروني مسجل مسبقاً في النظام. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر.'
          });
          setIsSubmitting(false);
          return;
        } else if (authErr.code === 'auth/weak-password') {
          setErrors({
            password: 'كلمة المرور ضعيفة. يرجى اختيار كلمة مرور مكونة من 6 خانات على الأقل.'
          });
          setIsSubmitting(false);
          return;
        } else if (authErr.code === 'auth/operation-not-allowed') {
          setErrors({
            submit: 'تسجيل الدخول بالبريد الإلكتروني غير مفعل في Firebase. يرجى تفعيله من لوحة تحكم Firebase.'
          });
          setIsSubmitting(false);
          return;
        } else {
          setErrors({
            submit: authErr.message || 'فشل إنشاء حساب المستخدم في النظام.'
          });
          setIsSubmitting(false);
          return;
        }
      }

      const payload: SaaSRegistrationPayload = {
        fbUserId: fbUid,
        companyNameAr: form.companyNameAr,
        companyNameEn: form.companyNameEn || form.companyNameAr,
        commercialRegistration: form.commercialRegistration,
        vatNumber: form.vatNumber || '300000000000003',
        contactPerson: form.contactPerson,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
        selectedPlanId,
        billingCycle,
        addressAr: form.addressAr,
        addressEn: form.addressEn,
        emailNotifications: form.emailNotifications,
        smsNotifications: form.smsNotifications
      };

      const result = createNewTenantRegistration(payload, plans, settings);

      try {
        await dbApi.saveMultiple([
          { collection: 'saasCustomers', data: result.customer },
          { collection: 'users', data: result.user },
          { collection: 'saasSubscriptions', data: result.subscription },
          { collection: 'saasLicenses', data: result.license },
          { collection: 'saasAuditLogs', data: result.auditLog }
        ]);
      } catch (dbErr) {
        console.error('Database provisioning failed:', dbErr);
        
        // Rollback: Delete the Firebase Auth user if database provisioning fails to maintain idempotency
        if (fbUser) {
          try {
            await deleteUser(fbUser);
          } catch (delErr) {
            console.error('Failed to rollback Firebase Auth user:', delErr);
          }
        }
        
        setErrors({ submit: 'فشل إنشاء بيانات المنشأة. يرجى المحاولة مرة أخرى لاحقاً.' });
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccessRegistration(result);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setIsSubmitting(false);
      setErrors({ submit: err.message || 'حدث خطأ أثناء إنشاء حساب المنشأة. يرجى المحاولة مرة أخرى.' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3 space-x-reverse cursor-pointer" onClick={onCancel}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">تسجيل منشأة جديدة في المنصة</h1>
              <p className="text-xs text-slate-400">انضم للشركات المعتمدة في إدارة المقاولات والعمليات الميدانية</p>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg transition-all"
          >
            إلغاء والعودة
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Plan Selector Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-sky-500/10 border-b border-r border-sky-500/20 px-3 py-1 rounded-br-xl text-sky-400 text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>تجربة مجانية لمدة {settings?.defaultTrialPeriodDays || 14} يوماً</span>
            </div>

            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-sky-400" />
              <span>1. اختيار الباقة ودورة الفوترة</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {plans.map(p => {
                const isSelected = p.id === selectedPlanId;
                const price = billingCycle === 'Yearly' ? Math.round(p.yearlyPrice / 12) : p.monthlyPrice;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`cursor-pointer rounded-xl p-4 border transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm text-white">{p.nameAr}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div className="text-xs text-slate-400 mb-2">{p.descriptionAr}</div>
                    <div className="text-lg font-black text-sky-300">{price.toLocaleString()} <span className="text-xs font-normal text-slate-400">ر.س/شهرياً</span></div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>دورة التجديد بعد التجربة:</span>
                <button
                  type="button"
                  onClick={() => setBillingCycle('Yearly')}
                  className={`px-3 py-1 rounded-lg font-bold ${billingCycle === 'Yearly' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  سنوية (خصم 20%)
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('Monthly')}
                  className={`px-3 py-1 rounded-lg font-bold ${billingCycle === 'Monthly' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  شهرية
                </button>
              </div>
              <div className="text-slate-400">
                الحدود: <span className="text-white font-bold">{selectedPlan.maxUsers === -1 ? 'غير محدود' : selectedPlan.maxUsers} مستخدمين</span> • <span className="text-white font-bold">{selectedPlan.maxProjects === -1 ? 'غير محدود' : selectedPlan.maxProjects} مشاريع</span>
              </div>
            </div>
          </div>

          {/* 2. Company Information */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              <span>2. بيانات الشركة / المنشأة الرسمية</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المنشأة بالعربية <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  placeholder="مثال: شركة البحر الأحمر للمقاولات العامة"
                  value={form.companyNameAr}
                  onChange={e => setForm({ ...form, companyNameAr: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
                {errors.companyNameAr && <p className="text-xs text-rose-400 mt-1">{errors.companyNameAr}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المنشأة بالإنجليزية (اختياري)</label>
                <input
                  type="text"
                  placeholder="e.g. Red Sea Contracting Group"
                  value={form.companyNameEn}
                  onChange={e => setForm({ ...form, companyNameEn: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم السجل التجاري (10 أرقام) <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="1010XXXXXX"
                  value={form.commercialRegistration}
                  onChange={e => setForm({ ...form, commercialRegistration: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                  dir="ltr"
                />
                {errors.commercialRegistration && <p className="text-xs text-rose-400 mt-1">{errors.commercialRegistration}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الرقم الضريبي (15 رقماً)</label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="310123456700003"
                  value={form.vatNumber}
                  onChange={e => setForm({ ...form, vatNumber: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                  dir="ltr"
                />
                {errors.vatNumber && <p className="text-xs text-rose-400 mt-1">{errors.vatNumber}</p>}
              </div>
            </div>
          </div>

          {/* 3. Account Administrator Information */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-sky-400" />
              <span>3. بيانات مدير الحساب / المسؤول التنفيذي</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المسؤول بالكامل <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  placeholder="م. أحمد بن خالد العتيبي"
                  value={form.contactPerson}
                  onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
                {errors.contactPerson && <p className="text-xs text-rose-400 mt-1">{errors.contactPerson}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">البريد الإلكتروني <span className="text-rose-400">*</span></label>
                <input
                  type="email"
                  placeholder="admin@company.sa"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  dir="ltr"
                />
                {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم الجوال <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  placeholder="+966 50 123 4567"
                  value={form.mobile}
                  onChange={e => setForm({ ...form, mobile: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                  dir="ltr"
                />
                {errors.mobile && <p className="text-xs text-rose-400 mt-1">{errors.mobile}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور <span className="text-rose-400">*</span></label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
                {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تأكيد كلمة المرور <span className="text-rose-400">*</span></label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
                {errors.confirmPassword && <p className="text-xs text-rose-400 mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Notifications Preferences */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap gap-6 text-xs text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.emailNotifications}
                  onChange={e => setForm({ ...form, emailNotifications: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
                />
                <span>تفعيل التنبيهات وإشعارات الفواتير عبر البريد الإلكتروني</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.smsNotifications}
                  onChange={e => setForm({ ...form, smsNotifications: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
                />
                <span>تفعيل التنبيهات عبر الرسائل النصية القصيرة (SMS)</span>
              </label>
            </div>
          </div>

          {/* 4. Terms and Submit */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={e => setForm({ ...form, acceptTerms: e.target.checked })}
                className="mt-1 rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-xs text-slate-300 leading-relaxed">
                أقر بصحة البيانات وأوافق على شروط وأحكام استخدام المنصة التجارية واتفاقية مستوى الخدمة وحماية البيانات الخاصة بقطاع المقاولات.
              </span>
            </label>
            {errors.acceptTerms && <p className="text-xs text-rose-400">{errors.acceptTerms}</p>}

            {errors.submit && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.submit}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-extrabold text-base rounded-xl shadow-xl shadow-sky-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>جاري إنشاء حساب المنشأة والتجربة...</span>
              ) : (
                <>
                  <span>تأكيد تسجيل المنشأة وبدء التجربة المجانية</span>
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
