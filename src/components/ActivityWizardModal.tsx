/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Worker, WarehouseMaterial, EquipmentItem } from '../types';
import { 
  X, Check, ChevronRight, ChevronLeft, Calendar, 
  Sparkles, UserCheck, Package, Wrench, HelpCircle, 
  Trash2, AlertTriangle, Play, Info
} from 'lucide-react';

interface ActivityWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: any) => void;
  activity: Activity | null; // null if adding
  workItemId: string;
  workers: Worker[];
  materials: WarehouseMaterial[];
  equipment: EquipmentItem[];
  activities: Activity[];
  projectStartDate: string;
  companyName: string;
  lang: 'ar' | 'en';
  t: any;
  onUpdateWorker?: (id: string, updated: Partial<Worker>) => void;
}

export default function ActivityWizardModal({
  isOpen,
  onClose,
  onSave,
  activity,
  workItemId,
  workers,
  materials,
  equipment,
  activities,
  projectStartDate,
  companyName,
  lang,
  t,
  onUpdateWorker
}: ActivityWizardModalProps) {
  const isRtl = lang === 'ar';

  // Form states
  const [currentStep, setCurrentStep] = useState(1);
  const [actNameAr, setActNameAr] = useState('');
  const [actNameEn, setActNameEn] = useState('');
  const [actQty, setActQty] = useState(100);
  const [actUnit, setActUnit] = useState('m³');
  const [actDescAr, setActDescAr] = useState('');
  const [actDescEn, setActDescEn] = useState('');
  const [workZone, setWorkZone] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  
  const [materialAllocations, setMaterialAllocations] = useState<{id: string, quantity: number}[]>([]);
  const [equipmentAllocations, setEquipmentAllocations] = useState<{id: string, quantity: number}[]>([]);
  
  const [dependsOnId, setDependsOnId] = useState<string>('');
  const [actIsCritical, setActIsCritical] = useState<boolean>(false);
  const [autoSavedTime, setAutoSavedTime] = useState('');

  // Set initial form values if editing
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      const now = new Date();
      setAutoSavedTime(
        now.toLocaleTimeString(isRtl ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );

      if (activity) {
        setActNameAr(activity.nameAr || '');
        setActNameEn(activity.nameEn || '');
        setActQty(activity.totalQuantity || 100);
        setActUnit(activity.unit || 'm³');
        setActDescAr(activity.descriptionAr || '');
        setActDescEn(activity.descriptionEn || '');
        setWorkZone(activity.workZone || '');
        setRole(activity.role || '');
        setLocation(activity.location || '');
        setSelectedWorkerIds(activity.workerIds || []);
        setSelectedMaterialIds(activity.materialIds || []);
        setMaterialAllocations(activity.materialAllocations || []);
        setSelectedEquipmentIds(activity.equipmentIds || []);
        setEquipmentAllocations(activity.equipmentAllocations || []);
        setDependsOnId(activity.dependsOnActivityId || '');
        setActIsCritical(activity.isCritical || false);
      } else {
        setActNameAr('');
        setActNameEn('');
        setActQty(100);
        setActUnit('m³');
        setActDescAr('');
        setActDescEn('');
        setWorkZone('');
        setRole('');
        setLocation('');
        setSelectedWorkerIds([]);
        setSelectedMaterialIds([]);
        setMaterialAllocations([]);
        setSelectedEquipmentIds([]);
        setEquipmentAllocations([]);
        setDependsOnId('');
        setActIsCritical(false);
      }
    }
  }, [isOpen, activity]);

  // Handle auto-save visual cues upon changing any parameter
  const triggerAutoSaveTimeUpdate = () => {
    const now = new Date();
    setAutoSavedTime(
      now.toLocaleTimeString(isRtl ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  };

  // Stepper descriptions (Image 1 vertical nav)
  const steps = useMemo(() => [
    { number: 1, labelAr: 'نوع النشاط والاسم', labelEn: 'Type & Identity' },
    { number: 2, labelAr: 'الكمية والمواصفات', labelEn: 'Quantity & Scope' },
    { number: 3, labelAr: 'الموارد والعمالة', labelEn: 'Workforce & Resources' },
    { number: 4, labelAr: 'الجدولة والتبعية', labelEn: 'Timeline & Dependencies' },
    { number: 5, labelAr: 'المراجعة والتأكيد', labelEn: 'Review & Confirm' }
  ], []);

  // Compute Smart calculations on the fly for the right sidebar (Image 1 Right widget)
  const smartStats = useMemo(() => {
    const activeWorkers = workers.filter(w => selectedWorkerIds.includes(w.id));
    const sumProductivity = activeWorkers.reduce((acc, curr) => acc + (curr.dailyProductivity || 0), 0) || 5; 
    const expectedDurationDays = Math.ceil(actQty / sumProductivity);

    const projStartDate = projectStartDate ? new Date(projectStartDate) : new Date();
    const expectedFinish = new Date(projStartDate);
    expectedFinish.setDate(expectedFinish.getDate() + expectedDurationDays);
    const expectedFinishDateStr = expectedFinish.toISOString().split('T')[0];

    return {
      sumProductivity,
      expectedDurationDays,
      expectedFinishDateStr,
      workersCount: activeWorkers.length,
      materialsCount: selectedMaterialIds.length,
      equipmentCount: selectedEquipmentIds.length
    };
  }, [selectedWorkerIds, actQty, projectStartDate, workers, selectedMaterialIds, selectedEquipmentIds]);

  const handleNext = () => {
    if (currentStep === 1 && (!actNameAr || !actNameEn)) {
      alert(isRtl ? 'الرجاء كتابة اسم النشاط باللغتين العربية والإنجليزية' : 'Please provide Activity names in both English and Arabic');
      return;
    }
    if (currentStep === 2 && (!actQty || actQty <= 0 || !actUnit)) {
      alert(isRtl ? 'الرجاء تحديد كمية ومقاس صحيح للعمل' : 'Please enter a valid target quantity and unit');
      return;
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      triggerAutoSaveTimeUpdate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalizedActivityData = {
      id: activity?.id || `act-${Date.now()}`,
      workItemId,
      nameAr: actNameAr,
      nameEn: actNameEn,
      totalQuantity: Number(actQty),
      unit: actUnit,
      descriptionAr: actDescAr,
      descriptionEn: actDescEn,
      workZone,
      role,
      location,
      materialIds: selectedMaterialIds,
      equipmentIds: selectedEquipmentIds,
      materialAllocations: materialAllocations,
      equipmentAllocations: equipmentAllocations,
      workerIds: selectedWorkerIds,
      dependsOnActivityId: dependsOnId || undefined,
      isCritical: actIsCritical
    };
    onSave(finalizedActivityData);
  };

  const resetFormValues = () => {
    setActNameAr('');
    setActNameEn('');
    setActQty(100);
    setActUnit('m³');
    setActDescAr('');
    setActDescEn('');
    setWorkZone('');
    setRole('');
    setLocation('');
    setSelectedWorkerIds([]);
    setSelectedMaterialIds([]);
    setMaterialAllocations([]);
    setSelectedEquipmentIds([]);
    setEquipmentAllocations([]);
    setDependsOnId('');
    setActIsCritical(false);
    setCurrentStep(1);
    triggerAutoSaveTimeUpdate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-100 flex flex-col md:flex-row overflow-hidden max-h-[92vh] animate-scaleIn">
        
        {/* Step Navigation Sidebar (Image 1 Left Stepper) */}
        <div className="w-full md:w-1/4 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {isRtl ? 'خطوات تسجيل الإجراء الميداني' : 'FIELD ACTION WORKFLOW'}
              </span>
              <h3 className="font-extrabold text-sm text-[#040957] mt-1">
                {isRtl ? 'تسجيل وتجهيز النشاط' : 'Activity Register'}
              </h3>
            </div>

            {/* Stepper bubbles connected with vertical dashed line */}
            <div className="relative space-y-6">
              {/* Vertical line indicator */}
              <div className={`absolute ${isRtl ? 'right-[15px]' : 'left-[15px]'} top-2 bottom-2 w-[2px] border-l border-dashed border-slate-300 z-0`}></div>

              {steps.map(step => {
                const isActive = step.number === currentStep;
                const isCompleted = step.number < currentStep;

                return (
                  <button
                    key={step.number}
                    type="button"
                    onClick={() => {
                      if (step.number <= currentStep || (actNameAr && actNameEn)) {
                        setCurrentStep(step.number);
                      }
                    }}
                    className="flex items-center gap-4 text-right z-10 relative group w-full"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border transition-all ${
                      isActive 
                        ? 'bg-[#0080FF] text-white border-[#0080FF] scale-115 shadow-md shadow-[#0080FF]/25' 
                        : isCompleted
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-slate-400 border-slate-200 group-hover:border-[#0080FF]'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.number}
                    </div>
                    <div className="text-right">
                      <p className={`text-[11px] font-bold tracking-tight ${isActive ? 'text-[#0080FF]' : 'text-slate-500'}`}>
                        {isRtl ? step.labelAr : step.labelEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden md:block pt-4 border-t border-slate-200">
            <p className="text-[9px] text-slate-400 leading-relaxed font-bold">
              ℹ️ {isRtl ? 'تخطيط الأنشطة وربطها بالمستودع يغذي فوراً محرك التنبؤ الذكي لمسار المشروع.' : 'Linking activities dynamically guides our predictive engine schedule calculations.'}
            </p>
          </div>
        </div>

        {/* Center Main Form Step Area (Image 1 Main Form) */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between">
          
          {/* Header Banner with Title & Auto-Save Indicator */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-black text-[#040957] font-sans">
                {activity ? (isRtl ? 'تعديل وتحديث النشاط' : 'Edit Registered Activity') : (isRtl ? 'تسجيل نشاط ميداني جديد' : 'Juhtumi registreerimine')}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-[#0080FF] font-extrabold mt-0.5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  {isRtl ? `تم الحفظ تلقائياً في قاعدة البيانات: ${autoSavedTime}` : `Automaatselt salvestatud: ${autoSavedTime}`}
                </span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              type="button"
              className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6 flex-1">
            
            {/* STEP 1: CATEGORY & TITLE */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-scaleIn">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-black text-[#040957] tracking-wider block">
                    {isRtl ? 'تصنيف بند العمل المرتبط' : 'TARGET EXECUTION GROUP'}
                  </span>
                  <p className="text-xs font-extrabold text-slate-600">
                    {isRtl ? 'سوف يتم إدراج هذا النشاط تحت هذا القسم المختار تلقائياً.' : 'This activity will automatically nest under the selected executive sector.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white border border-[#040957]/15 rounded-xl space-y-3 shadow-xs">
                    <div className="border-b border-slate-100 pb-2">
                      <span className="text-[11px] font-extrabold text-[#040957] uppercase tracking-wider">{isRtl ? 'اسم النشاط والترميز الميداني' : 'ACTIVITY DESCRIPTOR & CODES'}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">{t.activityNameAr} <span className="text-red-500 font-bold">- kohustuslik</span></label>
                        <input 
                          type="text" 
                          value={actNameAr} 
                          required
                          placeholder="صب خرسانة مقاومة للكبريتات"
                          onChange={(e) => { setActNameAr(e.target.value); triggerAutoSaveTimeUpdate(); }}
                          className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-semibold bg-slate-50/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">{t.activityNameEn} <span className="text-red-500 font-bold">- kohustuslik</span></label>
                        <input 
                          type="text" 
                          value={actNameEn} 
                          required
                          placeholder="Pouring sulfate-resistant concrete"
                          onChange={(e) => { setActNameEn(e.target.value); triggerAutoSaveTimeUpdate(); }}
                          className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-semibold bg-slate-50/50"
                        />
                      </div>
                    </div>

                    {/* NEW FIELDS: WORK ZONE, ROLE, AND LOCATION */}
                    <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
                      <span className="text-[11px] font-extrabold text-[#040957] uppercase tracking-wider block">
                        📍 {isRtl ? 'الموقع الجغرافي والدور الوظيفي المحدد للنشاط' : 'PINPOINT POSITION & SITE RESPONSIBILITY'}
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700">{isRtl ? 'نطاق العمل (المنطقة):' : 'Work Zone:'}</label>
                          <input 
                            type="text" 
                            value={workZone} 
                            placeholder={isRtl ? 'مثال: المنطقة أ' : 'e.g. Zone A'}
                            onChange={(e) => { setWorkZone(e.target.value); triggerAutoSaveTimeUpdate(); }}
                            className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-semibold bg-slate-50/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700">{isRtl ? 'المسؤولية/الدور بالموقع:' : 'Role / Purpose:'}</label>
                          <input 
                            type="text" 
                            value={role} 
                            placeholder={isRtl ? 'مثال: أعمال صب الخرسانة المسلحة' : 'e.g. Concrete placement'}
                            onChange={(e) => { setRole(e.target.value); triggerAutoSaveTimeUpdate(); }}
                            className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-semibold bg-slate-50/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700">{isRtl ? 'موقع التنفيذ التفصيلي:' : 'Pinpoint Location:'}</label>
                          <input 
                            type="text" 
                            value={location} 
                            placeholder={isRtl ? 'مثال: الطابق الأرضي، قطاع ٢' : 'e.g. Sector 2, Ground Floor'}
                            onChange={(e) => { setLocation(e.target.value); triggerAutoSaveTimeUpdate(); }}
                            className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-semibold bg-slate-50/50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: QUANTITY & SCOPE */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-scaleIn">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-xs">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-extrabold text-[#040957] uppercase tracking-wider">{isRtl ? 'الكمية المستهدفة وحجم المقاس' : 'TARGET VOLUME & METRIC UNITS'}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">{t.totalQuantity} <span className="text-red-500 font-bold">- kohustuslik</span></label>
                      <input 
                        type="number" 
                        value={actQty} 
                        required
                        min="1"
                        onChange={(e) => { setActQty(Number(e.target.value)); triggerAutoSaveTimeUpdate(); }}
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-mono font-bold bg-slate-50/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">{t.unit} <span className="text-red-500 font-bold">- kohustuslik</span></label>
                      <input 
                        type="text" 
                        value={actUnit} 
                        required
                        placeholder="m³, ton, meter"
                        onChange={(e) => { setActUnit(e.target.value); triggerAutoSaveTimeUpdate(); }}
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-bold bg-slate-50/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-xs">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-extrabold text-[#040957] uppercase tracking-wider">{isRtl ? 'الوصف الفني والتنفيذي للعمل' : 'TECHNICAL DESCRIPTION'}</span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">{t.descriptionAr}</label>
                      <textarea 
                        value={actDescAr}
                        onChange={(e) => { setActDescAr(e.target.value); triggerAutoSaveTimeUpdate(); }}
                        placeholder="توضيح خطوات الصب ومحتوى الخرسانة والمورد المعتمد..."
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] h-20 bg-slate-50/50 leading-relaxed"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">{t.descriptionEn}</label>
                      <textarea 
                        value={actDescEn}
                        onChange={(e) => { setActDescEn(e.target.value); triggerAutoSaveTimeUpdate(); }}
                        placeholder="Detail the concrete mix content, supplier, slump tests required..."
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] h-20 bg-slate-50/50 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: WORKFORCE & RESOURCES */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-scaleIn">
                
                {/* Workers selection */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                  <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                    <span className="text-[11px] font-extrabold text-[#040957] uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-[#0080FF]" />
                      {isRtl ? 'تخصيص القوى البشرية في قاعدة البيانات' : 'WORKFORCE & LABOR ASSIGNMENT'}
                    </span>
                    <span className="text-[9px] font-extrabold bg-[#0080FF]/10 text-[#0080FF] px-2 py-0.5 rounded">
                      {selectedWorkerIds.length} {isRtl ? 'موظفين مختارين' : 'selected'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-100">
                    {workers.map(w => {
                      const active = selectedWorkerIds.includes(w.id);
                      const isOccupied = activities.some(a => a.id !== (activity?.id) && a.workerIds.includes(w.id));
                      const canBeSelected = !isOccupied || w.allowMultiActivity || active;

                      return (
                        <div 
                          key={w.id} 
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            active 
                              ? 'border-[#0080FF] bg-blue-50/30' 
                              : 'border-slate-100 bg-white hover:border-slate-200'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                            <input 
                              type="checkbox" 
                              checked={active}
                              disabled={!canBeSelected}
                              onChange={() => {
                                if (active) {
                                  setSelectedWorkerIds(selectedWorkerIds.filter(id => id !== w.id));
                                } else {
                                  setSelectedWorkerIds([...selectedWorkerIds, w.id]);
                                }
                                triggerAutoSaveTimeUpdate();
                              }}
                              className="rounded text-[#0080FF] focus:ring-[#0080FF] w-4 h-4"
                            />
                            <div className="text-right">
                              <p className="text-xs font-extrabold text-slate-800">{w.fullName}</p>
                              <p className="text-[9px] text-slate-400 font-mono font-semibold">
                                {isRtl ? w.professionAr : w.professionEn} | {w.dailyProductivity} {actUnit}/day
                              </p>
                            </div>
                          </label>

                          <div className="flex items-center gap-1.5">
                            {isOccupied && (
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${w.allowMultiActivity ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                {w.allowMultiActivity ? (isRtl ? 'مشترك' : 'Shared') : (isRtl ? 'مشغول' : 'Busy')}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateWorker && onUpdateWorker(w.id, { allowMultiActivity: !w.allowMultiActivity });
                                triggerAutoSaveTimeUpdate();
                              }}
                              className={`p-1.5 rounded-lg transition-all ${w.allowMultiActivity ? 'text-blue-600 bg-blue-100' : 'text-slate-400 bg-slate-100 hover:bg-slate-200'}`}
                              title={w.allowMultiActivity ? (isRtl ? 'تعطيل المهام المتعددة' : 'Disable Multi-tasking') : (isRtl ? 'تفعيل المهام المتعددة' : 'Enable Multi-tasking')}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Materials selection */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-extrabold text-[#040957] uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[#0080FF]" />
                      {isRtl ? 'تخصيص وسحب مواد المستودع' : 'MATERIALS ALLOCATION FROM STOCK'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-100">
                    {materials.map(m => {
                      const active = selectedMaterialIds.includes(m.id);
                      const alloc = materialAllocations.find(a => a.id === m.id);
                      return (
                        <div key={m.id} className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={active}
                              onChange={() => {
                                if (active) {
                                  setSelectedMaterialIds(selectedMaterialIds.filter(id => id !== m.id));
                                  setMaterialAllocations(materialAllocations.filter(a => a.id !== m.id));
                                } else {
                                  setSelectedMaterialIds([...selectedMaterialIds, m.id]);
                                  setMaterialAllocations([...materialAllocations, { id: m.id, quantity: 1 }]);
                                }
                                triggerAutoSaveTimeUpdate();
                              }}
                              className="rounded text-[#0080FF] focus:ring-[#0080FF] w-4 h-4"
                            />
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-800">{isRtl ? m.nameAr : m.nameEn}</span>
                              <span className="text-[9px] text-slate-400 block font-bold">{isRtl ? 'المتاح:' : 'Stock:'} {m.quantity} {m.unit}</span>
                            </div>
                          </label>
                          {active && (
                            <input
                              type="number"
                              min="1"
                              value={alloc?.quantity || ''}
                              placeholder={isRtl ? 'الكمية المطلوبة للنشاط' : 'Required Stock Units'}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setMaterialAllocations(prev => {
                                  const existing = prev.find(p => p.id === m.id);
                                  if (existing) {
                                    return prev.map(p => p.id === m.id ? { ...p, quantity: val } : p);
                                  }
                                  return [...prev, { id: m.id, quantity: val }];
                                });
                                triggerAutoSaveTimeUpdate();
                              }}
                              className="border border-slate-200 rounded-lg p-1.5 text-xs w-full outline-none focus:ring-2 focus:ring-[#0080FF] font-mono font-bold"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Equipment selection */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-extrabold text-[#040957] uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-[#0080FF]" />
                      {isRtl ? 'حجز الآليات والمعدات التشغيلية' : 'HEAVY MACHINERY & EQUIPMENT RESERVATION'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-40 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-100">
                    {equipment.map(e => {
                      const active = selectedEquipmentIds.includes(e.id);
                      const alloc = equipmentAllocations.find(a => a.id === e.id);
                      return (
                        <div key={e.id} className="p-2.5 bg-white rounded-xl border border-slate-100 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={active}
                              onChange={() => {
                                if (active) {
                                  setSelectedEquipmentIds(selectedEquipmentIds.filter(id => id !== e.id));
                                  setEquipmentAllocations(equipmentAllocations.filter(a => a.id !== e.id));
                                } else {
                                  setSelectedEquipmentIds([...selectedEquipmentIds, e.id]);
                                  setEquipmentAllocations([...equipmentAllocations, { id: e.id, quantity: 1 }]);
                                }
                                triggerAutoSaveTimeUpdate();
                              }}
                              className="rounded text-[#0080FF] focus:ring-[#0080FF] w-4 h-4"
                            />
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-800">{isRtl ? e.nameAr : e.nameEn}</span>
                              <span className="text-[9px] text-slate-400 block font-bold">{isRtl ? 'المتاح لأسطولنا:' : 'Total Active Fleet:'} {e.totalQuantity}</span>
                            </div>
                          </label>
                          {active && (
                            <input
                              type="number"
                              min="1"
                              value={alloc?.quantity || ''}
                              placeholder={isRtl ? 'العدد المطلوب حكزه' : 'Units to reserve'}
                              onChange={ev => {
                                const val = Number(ev.target.value);
                                setEquipmentAllocations(prev => {
                                  const existing = prev.find(p => p.id === e.id);
                                  if (existing) {
                                    return prev.map(p => p.id === e.id ? { ...p, quantity: val } : p);
                                  }
                                  return [...prev, { id: e.id, quantity: val }];
                                });
                                triggerAutoSaveTimeUpdate();
                              }}
                              className="border border-slate-200 rounded-lg p-1.5 text-xs w-full outline-none focus:ring-2 focus:ring-[#0080FF] font-mono font-bold"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: TIMELINE & DEPENDENCIES */}
            {currentStep === 4 && (
              <div className="space-y-4 animate-scaleIn">
                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-[11px] font-extrabold text-[#040957] uppercase tracking-wider">{isRtl ? 'تحديد تبعية النشاط وجدولة المهام' : 'PLANNING DEPENDENCY'}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">{isRtl ? 'يعتمد على النشاط السابق' : 'Predecessor Activity Link'}</label>
                    <select 
                      value={dependsOnId}
                      onChange={(e) => { setDependsOnId(e.target.value); triggerAutoSaveTimeUpdate(); }}
                      className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] bg-slate-50/50 font-semibold"
                    >
                      <option value="">{isRtl ? 'لا يوجد تبعية (يبدأ النشاط فوراً)' : 'No Dependency (Start immediately)'}</option>
                      {activities.filter(a => a.workItemId === workItemId && a.id !== activity?.id).map(a => (
                        <option key={a.id} value={a.id}>{isRtl ? a.nameAr : a.nameEn}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-rose-500/5 border border-rose-200 rounded-xl space-y-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-500 text-white rounded-lg">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={actIsCritical}
                          onChange={(e) => { setActIsCritical(e.target.checked); triggerAutoSaveTimeUpdate(); }}
                          className="w-4 h-4 text-rose-600 border-rose-300 rounded focus:ring-rose-500 accent-rose-600"
                        />
                        <span className="text-xs font-black text-rose-700">
                          {isRtl ? 'نشاط حرج ومصيري ومحوري (Critical Path)' : 'Critical Activity (Affects Overall Completion Date)'}
                        </span>
                      </label>
                      <p className="text-[10px] text-rose-600/80 leading-relaxed font-bold max-w-lg">
                        {isRtl 
                          ? 'الأنشطة الحرجة تؤثر مباشرة على تاريخ انتهاء تسليم المشروع النهائي. أي تأخير في رصد إنتاجيتهم الميدانية اليومية سينبه فورا مهندس النظام بحدوث تأخر عام.' 
                          : 'Critical path activities directly dictate final delivery parameters. Any delayed reporting here instantly triggers red-health indicators globally.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW & CONFIRM */}
            {currentStep === 5 && (
              <div className="space-y-4 animate-scaleIn">
                <div className="p-4 bg-[#0B1B3D]/5 border border-[#0B1B3D]/10 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#0B1B3D]/10">
                    <Info className="w-4 h-4 text-[#0080FF]" />
                    <span className="text-xs font-extrabold text-[#040957] uppercase tracking-wider">
                      {isRtl ? 'ملخص ومراجعة تفاصيل التسجيل' : 'DATA ENTRY SUMMARY REPORT'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold text-slate-700">
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">{isRtl ? 'الاسم باللغة العربية' : 'Name (Arabic)'}</span>
                      <span className="text-[#040957]">{actNameAr}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">{isRtl ? 'الاسم باللغة الإنجليزية' : 'Name (English)'}</span>
                      <span className="text-[#040957]">{actNameEn}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">{isRtl ? 'الكمية المستهدفة' : 'Volume Scope'}</span>
                      <span className="font-mono text-[#0080FF]">{actQty} {actUnit}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">{isRtl ? 'عدد الطاقم الميداني' : 'Allocated Workforce'}</span>
                      <span>{selectedWorkerIds.length} {isRtl ? 'عمال' : 'Laborers'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">{isRtl ? 'المواد المجدولة' : 'Materials Stock Allocations'}</span>
                      <span>{selectedMaterialIds.length} {isRtl ? 'أصناف' : 'items'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">{isRtl ? 'المسار الزمني' : 'Schedule Criticality'}</span>
                      <span className={actIsCritical ? 'text-rose-600' : 'text-emerald-600'}>
                        {actIsCritical ? (isRtl ? 'حرج للغاية ⚠️' : 'Critical Path ⚠️') : (isRtl ? 'نشاط قياسي عادي' : 'Routine Path')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-lg">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <p className="text-[10px] text-emerald-800 font-bold leading-relaxed">
                    {isRtl 
                      ? 'تم التحقق من صحة جميع المدخلات. بالضغط على زر الحفظ والتأكيد بالأسفل، سيتم إدراج النشاط وحساب الإنتاج اليومي وتوقيت التسليم فوراً.' 
                      : 'All inputs comply with structural database validation. Confirming writes the records and prompts predictive calculations instantly.'}
                  </p>
                </div>
              </div>
            )}

          </form>

          {/* Stepper Buttons and Footer actions */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-6 bg-white">
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={handleBack}
                disabled={currentStep === 1}
                className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 py-2.5 px-4 rounded-xl text-xs font-extrabold text-slate-600 transition flex items-center gap-1"
              >
                <ChevronLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                <span>{isRtl ? 'السابق' : 'Back'}</span>
              </button>

              {currentStep < 5 ? (
                <button 
                  type="button" 
                  onClick={handleNext}
                  className="bg-[#040957] hover:bg-[#0080FF] text-white py-2.5 px-5 rounded-xl text-xs font-black transition flex items-center gap-1 shadow-sm"
                >
                  <span>{isRtl ? 'التالي' : 'Next'}</span>
                  <ChevronRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={handleFormSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-6 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isRtl ? 'حفظ وتأكيد النشاط' : 'Save & Register Activity'}</span>
                </button>
              )}
            </div>

            {currentStep < 5 && (
              <button 
                type="button" 
                onClick={resetFormValues}
                className="text-slate-400 hover:text-rose-500 font-bold text-xs transition"
              >
                {isRtl ? 'إعادة تعيين النموذج' : 'Reset Form'}
              </button>
            )}
          </div>

        </div>

        {/* Status Widget Sidebar (Image 1 Right Sidebar) */}
        <div className="w-full md:w-1/4 bg-[#0B1B3D] text-white p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-[#0080FF] font-black block">
                {isRtl ? 'حالة النشاط في محرك الجدولة' : 'SCHEDULING PRE-INDICATORS'}
              </span>
              <div className="flex justify-between items-center mt-2 pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-slate-300">{isRtl ? 'الحالة الحالية' : 'Active State'}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-white/10 text-slate-200 border border-white/20 uppercase">
                  {activity ? (isRtl ? 'تعديل' : 'Editing') : (isRtl ? 'مسودة' : 'Draft')}
                </span>
              </div>
            </div>

            {/* General Info Box */}
            <div className="space-y-1.5 text-[11px] text-slate-300">
              <p className="font-extrabold text-[9px] text-slate-400 uppercase tracking-wider">{isRtl ? 'المعلومات العامة' : 'General info'}</p>
              <div className="flex justify-between font-mono">
                <span>ID:</span>
                <span className="text-white font-bold">{activity?.id ? activity.id.slice(0, 10) + '...' : 'ACT-TEMP'}</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? 'تاريخ البدء:' : 'Start Date:'}</span>
                <span className="text-white font-bold">{projectStartDate || '---'}</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? 'المنشئ:' : 'Creator:'}</span>
                <span className="text-white font-bold">{companyName || 'FPMS Group'}</span>
              </div>
            </div>

            {/* Smart Predictor box */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-3.5 pt-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#0080FF] block">
                {isRtl ? 'حسابات التنبؤ الفوري الذكية' : 'LIVE CALCULATIONS'}
              </span>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">{isRtl ? 'الإنتاجية اليومية للمجموعة' : 'Daily Productivity'}</span>
                  <span className="font-mono text-emerald-400 font-black text-sm">{smartStats.sumProductivity} {actUnit}/day</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">{isRtl ? 'المدة المتوقعة' : 'Expected Duration'}</span>
                  <span className="font-mono text-white font-black text-sm">{smartStats.expectedDurationDays} {isRtl ? 'أيام' : 'Days'}</span>
                </div>

                <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    {isRtl ? 'الانتهاء المتوقع' : 'Expected Finish'}
                  </span>
                  <span className="font-mono text-amber-400 font-black text-xs">{smartStats.expectedFinishDateStr}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-center">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block">
              FPMS PREDICTIVE CLOUD
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
