/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SaaSPlan,
  SaaSCustomer,
  SaaSSubscription,
  SaaSInvoice,
  SaaSPayment,
  SaaSLicense,
  SaaSDevice,
  SaaSAuditLog,
  SaaSSettings
} from '../../types/saas';
import SaaSDashboard from './SaaSDashboard';
import SaaSSubscriptionsTab from './SaaSSubscriptionsTab';
import SaaSCustomersTab from './SaaSCustomersTab';
import SaaSPlansTab from './SaaSPlansTab';
import SaaSInvoicesPaymentsTab from './SaaSInvoicesPaymentsTab';
import SaaSLicensesDevicesTab from './SaaSLicensesDevicesTab';
import SaaSAuditLogsTab from './SaaSAuditLogsTab';
import SaaSSettingsTab from './SaaSSettingsTab';
import {
  BarChart3,
  CreditCard,
  Building2,
  Layers,
  FileText,
  Key,
  Shield,
  Settings,
  ShieldCheck,
  Crown
} from 'lucide-react';

interface SaaSAdminControlCenterProps {
  subscriptions: SaaSSubscription[];
  customers: SaaSCustomer[];
  plans: SaaSPlan[];
  invoices: SaaSInvoice[];
  payments: SaaSPayment[];
  licenses: SaaSLicense[];
  devices: SaaSDevice[];
  auditLogs: SaaSAuditLog[];
  settings: SaaSSettings;
  lang: 'ar' | 'en';
  currentUser: { name: string; id: string };
  onSaveSubscription: (sub: SaaSSubscription) => void;
  onSaveCustomer: (cust: SaaSCustomer) => void;
  onSavePlan: (plan: SaaSPlan) => void;
  onSaveInvoice: (inv: SaaSInvoice) => void;
  onSavePayment: (pay: SaaSPayment) => void;
  onSaveLicense: (lic: SaaSLicense) => void;
  onSaveDevice: (dev: SaaSDevice) => void;
  onSaveSettings: (set: SaaSSettings) => void;
  onAddAuditLog: (log: SaaSAuditLog) => void;
}

export default function SaaSAdminControlCenter({
  subscriptions,
  customers,
  plans,
  invoices,
  payments,
  licenses,
  devices,
  auditLogs,
  settings,
  lang,
  currentUser,
  onSaveSubscription,
  onSaveCustomer,
  onSavePlan,
  onSaveInvoice,
  onSavePayment,
  onSaveLicense,
  onSaveDevice,
  onSaveSettings,
  onAddAuditLog
}: SaaSAdminControlCenterProps) {
  const isRtl = lang === 'ar';
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const navItems = [
    { id: 'dashboard', labelAr: 'لوحة قيادة الاشتراكات', labelEn: 'SaaS Dashboard', icon: BarChart3 },
    { id: 'subscriptions', labelAr: 'إدارة الاشتراكات', labelEn: 'Subscriptions', icon: CreditCard },
    { id: 'customers', labelAr: 'العملاء والشركات', labelEn: 'Customers', icon: Building2 },
    { id: 'plans', labelAr: 'باقات الاشتراك', labelEn: 'SaaS Plans', icon: Layers },
    { id: 'invoices', labelAr: 'الفواتير والمدفوعات', labelEn: 'Invoices & Ledger', icon: FileText },
    { id: 'licenses', labelAr: 'التراخيص والأجهزة', labelEn: 'Licenses & Devices', icon: Key },
    { id: 'audit', labelAr: 'سجل التدقيق الشامل', labelEn: 'Audit Trail', icon: Shield },
    { id: 'settings', labelAr: 'إعدادات المنصة', labelEn: 'System Settings', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      {/* Control Center Banner Header */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4 z-10">
          <div className="p-3 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black tracking-tight">
                {isRtl ? 'مركز التحكم في اشتراكات المنصة (SaaS Admin)' : 'SaaS Platform Administrative Control Center'}
              </h2>
              <span className="px-2.5 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-bold rounded-full">
                PLATFORM OWNER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isRtl ? 'إدارة الاشتراكات، إصدار التراخيص، متابعة الفواتير والتحصيلات، وضبط سعة الأجهزة والمستخدمين.' : 'Manage subscriptions, issue license keys, track ZATCA invoices & payments, and enforce plan resource limits.'}
            </p>
          </div>
        </div>

        {/* Quick User Badge */}
        <div className="text-right rtl:text-left text-xs text-slate-400 z-10 font-mono">
          <span>Active Admin: <strong className="text-white">{currentUser.name}</strong></span>
        </div>

        {/* Background Decorative Accent */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1 overflow-x-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{isRtl ? item.labelAr : item.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Panes */}
      {activeTab === 'dashboard' && (
        <SaaSDashboard
          subscriptions={subscriptions}
          customers={customers}
          invoices={invoices}
          payments={payments}
          plans={plans}
          licenses={licenses}
          lang={lang}
          onNavigateToTab={tab => setActiveTab(tab)}
        />
      )}

      {activeTab === 'subscriptions' && (
        <SaaSSubscriptionsTab
          subscriptions={subscriptions}
          customers={customers}
          plans={plans}
          invoices={invoices}
          payments={payments}
          licenses={licenses}
          devices={devices}
          auditLogs={auditLogs}
          lang={lang}
          onSaveSubscription={onSaveSubscription}
          onSaveInvoice={onSaveInvoice}
          onSavePayment={onSavePayment}
          onSaveLicense={onSaveLicense}
          onAddAuditLog={onAddAuditLog}
          currentUser={currentUser}
        />
      )}

      {activeTab === 'customers' && (
        <SaaSCustomersTab
          customers={customers}
          subscriptions={subscriptions}
          invoices={invoices}
          payments={payments}
          licenses={licenses}
          devices={devices}
          lang={lang}
          onSaveCustomer={onSaveCustomer}
        />
      )}

      {activeTab === 'plans' && (
        <SaaSPlansTab
          plans={plans}
          lang={lang}
          onSavePlan={onSavePlan}
        />
      )}

      {activeTab === 'invoices' && (
        <SaaSInvoicesPaymentsTab
          invoices={invoices}
          payments={payments}
          customers={customers}
          subscriptions={subscriptions}
          plans={plans}
          licenses={licenses}
          lang={lang}
          onSavePayment={onSavePayment}
          onSaveInvoice={onSaveInvoice}
          onSaveSubscription={onSaveSubscription}
          onSaveLicense={onSaveLicense}
          onAddAuditLog={onAddAuditLog}
          currentUser={currentUser}
        />
      )}

      {activeTab === 'licenses' && (
        <SaaSLicensesDevicesTab
          licenses={licenses}
          devices={devices}
          customers={customers}
          subscriptions={subscriptions}
          lang={lang}
          onSaveDevice={onSaveDevice}
          onSaveLicense={onSaveLicense}
        />
      )}

      {activeTab === 'audit' && (
        <SaaSAuditLogsTab
          auditLogs={auditLogs}
          lang={lang}
        />
      )}

      {activeTab === 'settings' && (
        <SaaSSettingsTab
          settings={settings}
          lang={lang}
          onSaveSettings={onSaveSettings}
        />
      )}
    </div>
  );
}
