/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SaaSSettings } from '../../types/saas';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

interface SaaSSettingsTabProps {
  settings: SaaSSettings;
  lang: 'ar' | 'en';
  onSaveSettings: (settings: SaaSSettings) => void;
}

export default function SaaSSettingsTab({ settings, lang, onSaveSettings }: SaaSSettingsTabProps) {
  const isRtl = lang === 'ar';

  const [defaultVatRate, setDefaultVatRate] = useState(settings.defaultVatRate || 15);
  const [defaultTrialPeriodDays, setDefaultTrialPeriodDays] = useState(settings.defaultTrialPeriodDays || 14);
  const [defaultGracePeriodDays, setDefaultGracePeriodDays] = useState(settings.defaultGracePeriodDays || 7);
  const [enableReadOnlyOnExpiry, setEnableReadOnlyOnExpiry] = useState(settings.enableReadOnlyOnExpiry ?? true);
  const [companyNameAr, setCompanyNameAr] = useState(settings.companyNameAr || '');
  const [companyNameEn, setCompanyNameEn] = useState(settings.companyNameEn || '');
  const [sellerVatNumber, setSellerVatNumber] = useState(settings.sellerVatNumber || '');
  const [sellerCommercialRegistration, setSellerCommercialRegistration] = useState(settings.sellerCommercialRegistration || '');
  const [currency, setCurrency] = useState(settings.currency || 'SAR');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    const newSettings: SaaSSettings = {
      ...settings,
      defaultVatRate,
      defaultTrialPeriodDays,
      defaultGracePeriodDays,
      enableReadOnlyOnExpiry,
      companyNameAr,
      companyNameEn,
      sellerVatNumber,
      sellerCommercialRegistration,
      currency,
      updatedAt: new Date().toISOString()
    };

    onSaveSettings(newSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-600" />
            {isRtl ? 'إعدادات المنصة واشتراكات النظام' : 'Global SaaS System Configuration'}
          </h3>
          <p className="text-xs text-slate-500">
            {isRtl ? 'ضبط الإعدادات الافتراضية للضريبة، الفترات التجريبية، مهلة السماح، وبيانات الفوترة المعتمدة.' : 'Configure global default settings for VAT, trial periods, grace days, and official seller tax invoice details.'}
          </p>
        </div>

        {savedSuccess && (
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            {isRtl ? 'تم الحفظ بنجاح' : 'Saved!'}
          </span>
        )}
      </div>

      <div className="space-y-4 text-sm">
        {/* Tax & Financial Defaults */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isRtl ? 'نسبة الضريبة الافتراضية (%)' : 'Default VAT Rate (%)'}
            </label>
            <input
              type="number"
              value={defaultVatRate}
              onChange={e => setDefaultVatRate(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isRtl ? 'العملة الأساسية' : 'Platform Currency'}
            </label>
            <input
              type="text"
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        {/* Periods */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isRtl ? 'مدة الفترة التجريبية (بالأيام)' : 'Default Trial Period (Days)'}
            </label>
            <input
              type="number"
              value={defaultTrialPeriodDays}
              onChange={e => setDefaultTrialPeriodDays(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isRtl ? 'مهلة السماح بعد الانتهاء (بالأيام)' : 'Default Grace Period (Days)'}
            </label>
            <input
              type="number"
              value={defaultGracePeriodDays}
              onChange={e => setDefaultGracePeriodDays(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>
        </div>

        {/* Read-Only Mode Toggle */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-900 dark:text-white block text-sm">
              {isRtl ? 'وضع القراءة فقط عند انتهاء الاشتراك (Read-Only Mode)' : 'Enable Read-Only Mode on Expiry'}
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRtl ? 'عند تفعيل الخيار، يمكن للمستخدمين تصفح بياناتهم وتقاريرهم القديمة ولكن يُحظر إنشاء وتعديل البيانات.' : 'When enabled, users with expired subscriptions can view existing data but are blocked from creating or updating items.'}
            </p>
          </div>
          <input
            type="checkbox"
            checked={enableReadOnlyOnExpiry}
            onChange={e => setEnableReadOnlyOnExpiry(e.target.checked)}
            className="w-5 h-5 text-sky-600 rounded"
          />
        </div>

        {/* Official Seller Invoice Info */}
        <div className="pt-4 border-t space-y-4">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">
            {isRtl ? 'بيانات المورد / مالك المنصة بالفاتورة المعتمدة' : 'Official Platform Owner Invoice Details'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isRtl ? 'اسم الشركة المالكة (بالعربي)' : 'Platform Company Name (Arabic)'}
              </label>
              <input
                type="text"
                value={companyNameAr}
                onChange={e => setCompanyNameAr(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isRtl ? 'اسم الشركة المالكة (بالإنجليزي)' : 'Platform Company Name (English)'}
              </label>
              <input
                type="text"
                value={companyNameEn}
                onChange={e => setCompanyNameEn(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isRtl ? 'الرقم الضريبي للمورد (VAT)' : 'Seller VAT Number'}
              </label>
              <input
                type="text"
                value={sellerVatNumber}
                onChange={e => setSellerVatNumber(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {isRtl ? 'السجل التجاري للمورد (CR)' : 'Seller Commercial Registration'}
              </label>
              <input
                type="text"
                value={sellerCommercialRegistration}
                onChange={e => setSellerCommercialRegistration(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow"
        >
          <Save className="w-4 h-4" />
          {isRtl ? 'حفظ إعدادات المنصة' : 'Save System Settings'}
        </button>
      </div>
    </div>
  );
}
