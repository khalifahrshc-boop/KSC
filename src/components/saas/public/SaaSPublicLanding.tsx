/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Building2,
  HardHat,
  FileCheck2,
  Boxes,
  Receipt,
  Users,
  Sparkles,
  ArrowRight,
  Zap,
  Globe2,
  Phone,
  Mail,
  HelpCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { SaaSPlan } from '../../../types/saas';
import { DEFAULT_SAAS_PLANS } from '../../../services/saasService';

interface SaaSPublicLandingProps {
  plans?: SaaSPlan[];
  lang?: 'ar' | 'en';
  onStartRegister: (planId?: string) => void;
  onOpenLogin: () => void;
}

export const SaaSPublicLanding: React.FC<SaaSPublicLandingProps> = ({
  plans = DEFAULT_SAAS_PLANS,
  lang = 'ar',
  onStartRegister,
  onOpenLogin
}) => {
  const [billingCycle, setBillingCycle] = useState<'Monthly' | 'Yearly'>('Yearly');
  const activePlans = plans.filter(p => p.isActive) || DEFAULT_SAAS_PLANS;

  const featuresList = [
    {
      icon: HardHat,
      titleAr: 'إدارة العمليات الميدانية وكروت البدء',
      titleEn: 'Field Operations & Workstart Cards',
      descAr: 'تنفيذ أنشطة المقاولات بمرونة مع رفع الصور وكروت البدء اليومية للحفاظ على سلامة الموقع.'
    },
    {
      icon: FileCheck2,
      titleAr: 'تصاريح العمل الرقمية (PTW)',
      titleEn: 'Digital Permits to Work (PTW)',
      descAr: 'إصدار واعتماد تصاريح العمل الساخن، المرتفعات، والأماكن المغلقة بتواقيع موثقة.'
    },
    {
      icon: Boxes,
      titleAr: 'إدارة المستودعات ومواد البناء',
      titleEn: 'Warehouse & Materials Inventory',
      descAr: 'تتبع صرف الأثاث والمواد، حركات المخزون، وتنبيهات حد الطلب والموقع.'
    },
    {
      icon: Receipt,
      titleAr: 'الفوترة الإلكترونية والاشتراكات (ZATCA)',
      titleEn: 'ZATCA Tax Invoicing & SaaS Ledger',
      descAr: 'إصدار الفواتير الضريبية المعتمدة برمز QR وفق متطلبات المرحلة الأولى لهيئة الزكاة والضريبة.'
    },
    {
      icon: Users,
      titleAr: 'إدارة العمالة وساعات الحضور',
      titleEn: 'Workforce & Attendance Tracking',
      descAr: 'ضبط حضور فرق المقاولين والمهندسين، وإعداد تقارير الحضور الشهرية بدقة.'
    },
    {
      icon: Sparkles,
      titleAr: 'تدقيق الذكاء الاصطناعي وجودة العمل',
      titleEn: 'AI Field Integrity & Quality Audits',
      descAr: 'تحليل جودة التقارير الميدانية بالذكاء الاصطناعي واكتشاف المخاطر تلقائياً.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* 1. Header Navbar */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-sky-500/20">
              S
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                منصة السديري للمقاولات
                <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono">SaaS Enterprise</span>
              </div>
              <div className="text-xs text-slate-400">Sudairi Construction SaaS Platform</div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-sky-400 transition-colors">المميزات</a>
            <a href="#pricing" className="hover:text-sky-400 transition-colors">الباقات والأسعار</a>
            <a href="#comparison" className="hover:text-sky-400 transition-colors">مقارنة المزايا</a>
            <a href="#contact" className="hover:text-sky-400 transition-colors">تواصل معنا</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => onStartRegister()}
              className="px-5 py-2.5 text-sm font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span>ابدأ تجربة مجانية</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-semibold mb-8">
            <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>تجربة مجانية لمدة 14 يوماً — بدون الحاجة لبطاقة إئتمان</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight max-w-4xl mx-auto mb-6">
            المنصة التجارية السحابية الشاملة <br />
            <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              لإدارة شركات المقاولات والعمليات الميدانية
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            نظام متكامل يمنح شركتك القوة للتحكم في المشاريع، كروت بدء العمل، تصاريح PTW، عمالة الموقع، المستودعات، والفوترة الإلكترونية المعتمدة من هيئة الزكاة (ZATCA Phase 1).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => onStartRegister()}
              className="w-full sm:w-auto px-8 py-4 text-base font-extrabold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl shadow-xl shadow-sky-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
            >
              <span>تسجيل منشأة جديدة (14 يوم مجاناً)</span>
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            <a
              href="#pricing"
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-all text-center"
            >
              استعرض الباقات والأسعار
            </a>
          </div>

          <div className="mt-16 pt-10 border-t border-slate-800/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-slate-400 text-sm">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>عزل تام لبيانات المستأجر (Multi-Tenant)</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Receipt className="w-5 h-5 text-sky-400" />
              <span>فواتير ضريبية برمز ZATCA QR</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>تفعيل فوري ورخص أجهزة محدودة</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Globe2 className="w-5 h-5 text-indigo-400" />
              <span>دعم كامل للغة العربية والإنجليزية</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid */}
      <section id="features" className="py-20 bg-slate-900/50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">مميزات المنصة وحلول المقاولات الميدانية</h2>
            <p className="text-slate-400 text-base">
              تم بناء التطبيق لتلبية متطلبات الشركات والمقاولين بالمملكة وفق أحدث اللوائح والمعايير التنظيمية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuresList.map((f, idx) => {
              const IconComp = f.icon;
              return (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/5 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{f.titleAr}</h3>
                  <div className="text-xs text-sky-400/80 font-mono mb-3" dir="ltr">{f.titleEn}</div>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.descAr}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Dynamic Pricing Page */}
      <section id="pricing" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-4">باقات الاشتراك الشفافة والأسعار</h2>
            <p className="text-slate-400 text-base mb-8">
              اختر الباقة المناسبة لحجم منشأتك. يمكنك الترقية أو التغيير في أي وقت.
            </p>

            {/* Monthly / Yearly Switcher */}
            <div className="inline-flex items-center bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-inner">
              <button
                onClick={() => setBillingCycle('Monthly')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  billingCycle === 'Monthly' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                فلترة شهرية / Monthly
              </button>
              <button
                onClick={() => setBillingCycle('Yearly')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  billingCycle === 'Yearly' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>اشتراك سنوي / Yearly</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  وفر 20%
                </span>
              </button>
            </div>
          </div>

          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {activePlans.map(plan => {
              const isPopular = plan.id === 'plan_pro';
              const price = billingCycle === 'Yearly' ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
              const totalPriceAnnual = plan.yearlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl bg-slate-900 p-8 flex flex-col justify-between transition-all duration-300 ${
                    isPopular
                      ? 'border-2 border-sky-500 shadow-2xl shadow-sky-500/10 scale-105 z-10'
                      : 'border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 right-1/2 translate-x-1/2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg">
                      الباقة الأكثر طلباً
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-white">{plan.nameAr}</h3>
                      <span className="text-xs font-mono text-slate-400" dir="ltr">{plan.nameEn}</span>
                    </div>
                    <p className="text-slate-400 text-xs mb-6 h-10 line-clamp-2">{plan.descriptionAr}</p>

                    <div className="mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{price.toLocaleString()}</span>
                        <span className="text-sm font-bold text-slate-400">ر.س / شهرياً</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {billingCycle === 'Yearly'
                          ? `تُدفع سنوياً ${totalPriceAnnual.toLocaleString()} ر.س (غير شاملة ضريبة 15%)`
                          : 'تُدفع شهرياً (غير شاملة ضريبة 15%)'}
                      </div>
                    </div>

                    <div className="space-y-3 mb-8">
                      <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">حدود الموارد:</div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Users className="w-4 h-4 text-sky-400" />
                        <span>{plan.maxUsers === -1 ? 'مستخدمين غير محدودين' : `حتى ${plan.maxUsers} مستخدمين`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Building2 className="w-4 h-4 text-sky-400" />
                        <span>{plan.maxProjects === -1 ? 'مشاريع غير محدودة' : `حتى ${plan.maxProjects} مشاريع`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <HardHat className="w-4 h-4 text-sky-400" />
                        <span>{plan.maxDevices === -1 ? 'أجهزة غير محدودة' : `حتى ${plan.maxDevices} أجهزة`}</span>
                      </div>

                      <div className="border-t border-slate-800 my-4"></div>

                      <div className="text-xs font-bold text-slate-400 mb-2">المميزات المضمنة:</div>
                      {plan.featuresAr?.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onStartRegister(plan.id)}
                    className={`w-full py-3.5 px-6 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25'
                        : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                    }`}
                  >
                    <span>ابدأ تجربة مجانية بهذه الباقة</span>
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Detailed Plan Comparison Table */}
      <section id="comparison" className="py-20 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-extrabold text-white mb-2">مقارنة شاملة بين الباقات</h2>
            <p className="text-slate-400 text-sm">جدول تفصيلي يوضح المزايا وحدود كل باقة</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-300">
                  <th className="p-4 font-bold">الميزة / المعيار</th>
                  <th className="p-4 font-bold text-center">الأساسية (Basic)</th>
                  <th className="p-4 font-bold text-center text-sky-400">الاحترافية (Pro)</th>
                  <th className="p-4 font-bold text-center text-emerald-400">المؤسسات (Enterprise)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-4 font-medium">عدد المستخدمين (Users)</td>
                  <td className="p-4 text-center">5</td>
                  <td className="p-4 text-center font-bold text-sky-300">20</td>
                  <td className="p-4 text-center font-bold text-emerald-400">غير محدود</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">عدد المشاريع (Projects)</td>
                  <td className="p-4 text-center">3</td>
                  <td className="p-4 text-center font-bold text-sky-300">10</td>
                  <td className="p-4 text-center font-bold text-emerald-400">غير محدود</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">الأجهزة المصرحة (Devices)</td>
                  <td className="p-4 text-center">5</td>
                  <td className="p-4 text-center font-bold text-sky-300">20</td>
                  <td className="p-4 text-center font-bold text-emerald-400">غير محدود</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">تصاريح العمل الرقمية PTW</td>
                  <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">إدارة المستودعات ومواد البناء</td>
                  <td className="p-4 text-center text-slate-600">—</td>
                  <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">الفوترة الضريبية برمز ZATCA QR</td>
                  <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">تدقيق الجودة بالذكاء الاصطناعي</td>
                  <td className="p-4 text-center text-slate-600">—</td>
                  <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="p-4 text-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">مدير حساب مخصص والدعم الفني</td>
                  <td className="p-4 text-center text-slate-400">عادي</td>
                  <td className="p-4 text-center text-sky-300">أولوية متوسطة</td>
                  <td className="p-4 text-center font-bold text-emerald-400">مدير مخصص 24/7</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer id="contact" className="py-12 bg-slate-950 border-t border-slate-800 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2 text-center md:text-right">
            <div className="text-sm font-bold text-white">شركة أنظمة منصة المقاولات السعودية المحدودة</div>
            <div>السجل التجاري: 1010987654 | الرقم الضريبي: 310123456700003</div>
            <div>الرياض، المملكة العربية السعودية — جميع الحقوق محفوظة © {new Date().getFullYear()}</div>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={onOpenLogin} className="hover:text-white transition-colors">دخول المنشآت</button>
            <a href="#pricing" className="hover:text-white transition-colors">الأسعار</a>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">ZATCA Compliant SaaS</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
