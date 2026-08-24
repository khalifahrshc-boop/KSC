/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SaaSPlan } from '../../types/saas';
import {
  Plus,
  Check,
  Edit2,
  X,
  Layers,
  Users,
  Smartphone,
  Briefcase,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface SaaSPlansTabProps {
  plans: SaaSPlan[];
  lang: 'ar' | 'en';
  onSavePlan: (plan: SaaSPlan) => void;
}

export default function SaaSPlansTab({ plans, lang, onSavePlan }: SaaSPlansTabProps) {
  const isRtl = lang === 'ar';

  const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [yearlyPrice, setYearlyPrice] = useState<number>(0);
  const [vatRate, setVatRate] = useState<number>(15);
  const [maxUsers, setMaxUsers] = useState<number>(5);
  const [maxDevices, setMaxDevices] = useState<number>(5);
  const [maxProjects, setMaxProjects] = useState<number>(3);
  const [featuresArText, setFeaturesArText] = useState('');
  const [featuresEnText, setFeaturesEnText] = useState('');
  const [isActive, setIsActive] = useState(true);

  const handleEditPlan = (plan: SaaSPlan) => {
    setEditingPlan(plan);
    setNameAr(plan.nameAr);
    setNameEn(plan.nameEn);
    setDescAr(plan.descriptionAr);
    setDescEn(plan.descriptionEn);
    setMonthlyPrice(plan.monthlyPrice);
    setYearlyPrice(plan.yearlyPrice);
    setVatRate(plan.vatRate);
    setMaxUsers(plan.maxUsers);
    setMaxDevices(plan.maxDevices);
    setMaxProjects(plan.maxProjects);
    setFeaturesArText(plan.featuresAr.join('\n'));
    setFeaturesEnText(plan.featuresEn.join('\n'));
    setIsActive(plan.isActive);
    setIsModalOpen(true);
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setNameAr('');
    setNameEn('');
    setDescAr('');
    setDescEn('');
    setMonthlyPrice(999);
    setYearlyPrice(9990);
    setVatRate(15);
    setMaxUsers(10);
    setMaxDevices(10);
    setMaxProjects(5);
    setFeaturesArText('ميزة 1\nميزة 2\nميزة 3');
    setFeaturesEnText('Feature 1\nFeature 2\nFeature 3');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleSavePlan = () => {
    if (!nameAr || !nameEn) {
      alert('Plan names are required');
      return;
    }

    const planToSave: SaaSPlan = {
      id: editingPlan ? editingPlan.id : `plan_${Date.now()}`,
      nameAr,
      nameEn,
      descriptionAr: descAr,
      descriptionEn: descEn,
      monthlyPrice,
      yearlyPrice,
      vatRate,
      maxUsers,
      maxDevices,
      maxProjects,
      featuresAr: featuresArText.split('\n').filter(f => f.trim().length > 0),
      featuresEn: featuresEnText.split('\n').filter(f => f.trim().length > 0),
      isActive,
      displayOrder: editingPlan ? editingPlan.displayOrder : plans.length + 1,
      createdAt: editingPlan ? editingPlan.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSavePlan(planToSave);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isRtl ? 'إدارة باقات اشتراك المنصة' : 'SaaS Subscription Plans'}
          </h3>
          <p className="text-xs text-slate-500">
            {isRtl ? 'قم بتشكيل وتحديد أسعار وسعة الباقات المتاحة للعملاء.' : 'Configure SaaS plans, pricing, user/device limits, and feature sets.'}
          </p>
        </div>

        <button
          onClick={handleCreatePlan}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {isRtl ? 'إضافة باقة جديدة' : 'Create New Plan'}
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={`bg-white dark:bg-slate-800 rounded-2xl border ${
              plan.isActive ? 'border-slate-200 dark:border-slate-700' : 'border-rose-200 dark:border-rose-950 opacity-70'
            } shadow-sm overflow-hidden flex flex-col justify-between`}
          >
            {/* Header */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-xs font-bold rounded-lg uppercase">
                  {plan.id}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  plan.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isRtl ? plan.nameAr : plan.nameEn}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isRtl ? plan.descriptionAr : plan.descriptionEn}
                </p>
              </div>

              {/* Price Tags */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">{isRtl ? 'الاشتراك الشهري:' : 'Monthly:'}</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {plan.monthlyPrice.toLocaleString()} <span className="text-xs font-normal text-slate-500">SAR</span>
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-500">{isRtl ? 'الاشتراك السنوي:' : 'Yearly:'}</span>
                  <span className="text-lg font-extrabold text-sky-600 dark:text-sky-400">
                    {plan.yearlyPrice.toLocaleString()} <span className="text-xs font-normal text-slate-500">SAR</span>
                  </span>
                </div>
              </div>

              {/* Resource Capacity Limits */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block">{isRtl ? 'المستخدمين' : 'Users'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{plan.maxUsers === -1 ? '∞' : plan.maxUsers}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block">{isRtl ? 'الأجهزة' : 'Devices'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{plan.maxDevices === -1 ? '∞' : plan.maxDevices}</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block">{isRtl ? 'المشاريع' : 'Projects'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{plan.maxProjects === -1 ? '∞' : plan.maxProjects}</span>
                </div>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isRtl ? 'المزايا المضمنة:' : 'Included Features:'}
                </span>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {(isRtl ? plan.featuresAr : plan.featuresEn).map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => handleEditPlan(plan)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                {isRtl ? 'تعديل الباقة' : 'Edit Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT / CREATE PLAN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingPlan ? (isRtl ? 'تعديل بيانات الباقة' : 'Edit SaaS Plan') : (isRtl ? 'إنشاء باقة اشتراك جديدة' : 'Create New SaaS Plan')}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'اسم الباقة (عربي)' : 'Plan Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'اسم الباقة (إنجليزي)' : 'Plan Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'سعر الشهر (ر.س)' : 'Monthly Price (SAR)'}
                  </label>
                  <input
                    type="number"
                    value={monthlyPrice}
                    onChange={e => setMonthlyPrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'سعر السنة (ر.س)' : 'Yearly Price (SAR)'}
                  </label>
                  <input
                    type="number"
                    value={yearlyPrice}
                    onChange={e => setYearlyPrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'حد المستخدمين (-1 لغير محدود)' : 'Max Users (-1 for ∞)'}
                  </label>
                  <input
                    type="number"
                    value={maxUsers}
                    onChange={e => setMaxUsers(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'حد الأجهزة (-1 لغير محدود)' : 'Max Devices (-1 for ∞)'}
                  </label>
                  <input
                    type="number"
                    value={maxDevices}
                    onChange={e => setMaxDevices(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'حد المشاريع (-1 لغير محدود)' : 'Max Projects (-1 for ∞)'}
                  </label>
                  <input
                    type="number"
                    value={maxProjects}
                    onChange={e => setMaxProjects(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                  />
                </div>
              </div>

              {/* Features Multiline Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'المزايا بالعربي (كل ميزة في سطر)' : 'Features (Arabic, 1 per line)'}
                  </label>
                  <textarea
                    value={featuresArText}
                    onChange={e => setFeaturesArText(e.target.value)}
                    rows={4}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {isRtl ? 'المزايا بالإنجليزي (كل ميزة في سطر)' : 'Features (English, 1 per line)'}
                  </label>
                  <textarea
                    value={featuresEnText}
                    onChange={e => setFeaturesEnText(e.target.value)}
                    rows={4}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isRtl ? 'الباقة نشطة ومتاحة للاشتراك' : 'Plan is Active for Subscriptions'}
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleSavePlan} className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl">
                {isRtl ? 'حفظ تغييرات الباقة' : 'Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
