/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Project, 
  WorkItem, 
  Activity, 
  WarehouseMaterial, 
  EquipmentItem, 
  Worker, 
  UserRole,
  ProgressUpdate,
  SystemSettings
} from '../types';
import { 
  getActivityProgress, 
  getWorkItemProgress,
  getActivityStatus 
} from '../utils/progressCalculations';
import { runWithOklchSanitizer } from '../utils/pdfSanitizer';
import { 
  Plus, 
  Trash2, 
  Layers, 
  Workflow, 
  Calculator, 
  Sparkles, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  UserCheck, 
  Package, 
  Wrench, 
  Calendar, 
  TrendingUp, 
  Check, 
  X,
  PlusCircle,
  Play,
  AlertTriangle,
  Edit,
  Eye,
  Printer
} from 'lucide-react';

interface WorkItemsListProps {
  lang: 'ar' | 'en';
  t: any;
  settings: SystemSettings;
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  progressUpdates: ProgressUpdate[];
  materials: WarehouseMaterial[];
  equipment: EquipmentItem[];
  workers: Worker[];
  userRole: UserRole;
  onAddWorkItem: (item: WorkItem) => void;
  onDeleteWorkItem: (id: string) => void;
  onAddActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
  onUpdateActivity: (id: string, updated: Partial<Activity>) => void;
  onUpdateWorker?: (id: string, updated: Partial<Worker>) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export default function WorkItemsList({
  lang,
  t,
  settings,
  projects,
  workItems,
  activities,
  progressUpdates = [],
  materials,
  equipment,
  workers,
  userRole,
  onAddWorkItem,
  onDeleteWorkItem,
  onAddActivity,
  onDeleteActivity,
  onUpdateActivity,
  onUpdateWorker,
  openConfirm
}: WorkItemsListProps) {
  const isRtl = lang === 'ar';
  const isReadOnly = userRole === 'Viewer';

  const [isPrintingActivity, setIsPrintingActivity] = useState<string | null>(null);

  const handlePrintActivityDetailsPDF = async (act: Activity) => {
    try {
      setIsPrintingActivity(act.id);
      const html2pdf = (await import('html2pdf.js')).default;
      const stats = calculateSmartPlanningValues(act);
      const proj = projects.find(p => p.id === (workItems.find(wi => wi.id === act.workItemId)?.projectId));
      const projectName = proj ? (isRtl ? proj.nameAr : proj.nameEn) : '---';

      const content = `
        <div style="font-family: 'Cairo', 'Inter', sans-serif; padding: 30px; direction: ${isRtl ? 'rtl' : 'ltr'}; color: #1e293b; background-color: white;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #040957; padding-bottom: 15px; margin-bottom: 20px;">
            <div>
              <h1 style="margin: 0; font-size: 18px; color: #040957;">${isRtl ? settings.companyNameAr : settings.companyNameEn}</h1>
              <p style="margin: 5px 0 0 0; font-size: 10px; color: #64748b;">${isRtl ? 'تقرير تفاصيل النشاط والجدولة الزمنية' : 'Activity Detail & Schedule Analysis Report'}</p>
            </div>
            <div style="text-align: ${isRtl ? 'left' : 'right'};">
              <div style="font-size: 10px; font-weight: bold; color: #040957;">Activity ID: ${act.id}</div>
              <div style="font-size: 9px; color: #94a3b8;">${new Date().toLocaleString(isRtl ? 'ar-SA' : 'en-GB')}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">${isRtl ? 'المشروع' : 'Project'}</div>
              <div style="font-size: 11px; font-weight: bold; color: #1e293b;">${projectName}</div>
            </div>
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">${isRtl ? 'حالة النشاط' : 'Activity Health'}</div>
              <div style="font-size: 11px; font-weight: bold; color: ${stats.status === 'Delayed' ? '#dc2626' : '#166534'};">${stats.status.toUpperCase()}</div>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 14px; color: #040957; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">${isRtl ? 'معلومات النشاط الأساسية' : 'Core Activity Information'}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <strong style="font-size: 10px; color: #64748b;">${isRtl ? 'الاسم' : 'Name'}:</strong>
                <div style="font-size: 11px; font-weight: bold;">${isRtl ? act.nameAr : act.nameEn}</div>
              </div>
              <div>
                <strong style="font-size: 10px; color: #64748b;">${isRtl ? 'الكمية المستهدفة' : 'Target Quantity'}:</strong>
                <div style="font-size: 11px; font-weight: bold;">${act.totalQuantity} ${act.unit}</div>
              </div>
            </div>
            <div style="margin-top: 15px;">
              <strong style="font-size: 10px; color: #64748b;">${isRtl ? 'الوصف التنفيذي' : 'Execution Description'}:</strong>
              <div style="font-size: 10px; line-height: 1.6; color: #334155; background-color: #f1f5f9; padding: 10px; border-radius: 8px; margin-top: 5px;">
                ${isRtl ? (act.descriptionAr || '---') : (act.descriptionEn || '---')}
              </div>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h2 style="font-size: 14px; color: #040957; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">📊 ${isRtl ? 'تحليلات الجدولة والإنتاجية' : 'Schedule & Production Analytics'}</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
              <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center;">
                <div style="font-size: 8px; color: #64748b;">${isRtl ? 'التقدم المحقق' : 'Achieved Progress'}</div>
                <div style="font-size: 12px; font-weight: 900; color: #0284c7;">${getActivityProgress(act, progressUpdates)}%</div>
              </div>
              <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center;">
                <div style="font-size: 8px; color: #64748b;">${isRtl ? 'المدة المتوقعة' : 'Expected Duration'}</div>
                <div style="font-size: 12px; font-weight: 900;">${stats.expectedDurationDays} ${isRtl ? 'أيام' : 'Days'}</div>
              </div>
              <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center;">
                <div style="font-size: 8px; color: #64748b;">${isRtl ? 'الانتهاء المتوقع' : 'Expected Finish'}</div>
                <div style="font-size: 11px; font-weight: 900; color: #b45309;">${stats.expectedFinishDateStr}</div>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h3 style="font-size: 12px; color: #040957; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">👥 ${isRtl ? 'العمالة المخصصة' : 'Allocated Workforce'}</h3>
              <ul style="list-style: none; padding: 0; margin: 0; font-size: 10px;">
                ${act.workerIds.map(id => {
                  const w = workers.find(work => work.id === id);
                  return `<li style="padding: 5px 0; border-bottom: 1px dashed #f1f5f9;"><strong>${w?.fullName}</strong> - ${isRtl ? w?.professionAr : w?.professionEn}</li>`;
                }).join('')}
                ${act.workerIds.length === 0 ? `<li style="color: #94a3b8; font-style: italic;">No workers assigned</li>` : ''}
              </ul>
            </div>
            <div>
              <h3 style="font-size: 12px; color: #040957; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">🏗️ ${isRtl ? 'الموارد والمعدات' : 'Resources & Equipment'}</h3>
              <div style="font-size: 10px;">
                <div style="margin-bottom: 10px;">
                  <strong style="font-size: 9px; color: #64748b;">${isRtl ? 'المواد:' : 'Materials:'}</strong>
                  <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 3px;">
                    ${act.materialAllocations?.map(a => {
                      const m = materials.find(mat => mat.id === a.id);
                      return `<span style="background-color: #f0fdf4; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 9px;">${isRtl ? m?.nameAr : m?.nameEn}: ${a.quantity} ${m?.unit}</span>`;
                    }).join('') || 'None'}
                  </div>
                </div>
                <div>
                  <strong style="font-size: 9px; color: #64748b;">${isRtl ? 'المعدات:' : 'Equipment:'}</strong>
                  <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 3px;">
                    ${act.equipmentAllocations?.map(a => {
                      const e = equipment.find(eq => eq.id === a.id);
                      return `<span style="background-color: #fffbeb; color: #92400e; padding: 2px 6px; border-radius: 4px; font-size: 9px;">${isRtl ? e?.nameAr : e?.nameEn}: ${a.quantity}</span>`;
                    }).join('') || 'None'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 9px; color: #94a3b8;">
            ${isRtl ? 'تم إصدار هذا المستند آلياً من نظام إدارة الإنتاج الميداني' : 'This document is automatically generated by the Field Production Management System'}
          </div>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `Activity_Report_${act.id}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(content).save();
      });

    } catch (error) {
      console.error('Activity PDF Error:', error);
    } finally {
      setIsPrintingActivity(null);
    }
  };

  // Selected state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [expandedWorkItemIds, setExpandedWorkItemIds] = useState<string[]>([]);

  // Modals state
  const [isAddWiOpen, setIsAddWiOpen] = useState(false);
  const [isAddActOpen, setIsAddActOpen] = useState(false);
  const [selectedWiIdForActivity, setSelectedWiIdForActivity] = useState<string>('');

  // Work Item Form Values
  const [wiNameAr, setWiNameAr] = useState('');
  const [wiNameEn, setWiNameEn] = useState('');
  const [wiNumber, setWiNumber] = useState('');
  const [wiType, setWiType] = useState<'Primary' | 'Secondary'>('Primary');
  const [wiResp, setWiResp] = useState('');

  // Activity Form Values
  const [actNameAr, setActNameAr] = useState('');
  const [actNameEn, setActNameEn] = useState('');
  const [actQty, setActQty] = useState(100);
  const [actUnit, setActUnit] = useState('m');
  const [actDescAr, setActDescAr] = useState('');
  const [actDescEn, setActDescEn] = useState('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [materialAllocations, setMaterialAllocations] = useState<{id: string, quantity: number}[]>([]);
  const [equipmentAllocations, setEquipmentAllocations] = useState<{id: string, quantity: number}[]>([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [dependsOnId, setDependsOnId] = useState<string>('');

  // Active planning inspection
  const [inspectedActivityId, setInspectedActivityId] = useState<string | null>(null);

  // Edit/Details state
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activityForDetails, setActivityForDetails] = useState<Activity | null>(null);

  // Filter project-specific elements
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const projectWorkItems = useMemo(() => {
    return workItems.filter(wi => wi.projectId === selectedProjectId);
  }, [workItems, selectedProjectId]);

  // Expand helper
  const toggleExpandWi = (id: string) => {
    if (expandedWorkItemIds.includes(id)) {
      setExpandedWorkItemIds(expandedWorkItemIds.filter(item => item !== id));
    } else {
      setExpandedWorkItemIds([...expandedWorkItemIds, id]);
    }
  };

  // Safe checks for activities per workitem
  const getActivitiesForWi = (wiId: string) => {
    return activities.filter(act => act.workItemId === wiId);
  };

  // --- Smart Planning Calculation Formula ---
  const calculateSmartPlanningValues = (act: Activity) => {
    // 1. Daily Production = Sum of daily productivity of all linked workers
    const activeWorkers = workers.filter(w => act.workerIds.includes(w.id));
    const sumProductivity = activeWorkers.reduce((acc, curr) => acc + (curr.dailyProductivity || 0), 0) || 5; // Fallback 5 units/day if none selected

    // 2. Expected Duration = Total Quantity / sum productivity
    const expectedDurationDays = Math.ceil(act.totalQuantity / sumProductivity);

    // 3. Expected Finish Date: project start date + expected duration of activity
    const projStartDate = currentProject ? new Date(currentProject.startDate) : new Date();
    const expectedFinish = new Date(projStartDate);
    expectedFinish.setDate(expectedFinish.getDate() + expectedDurationDays);
    const expectedFinishDateStr = expectedFinish.toISOString().split('T')[0];

    // 4. Remaining work is computed based on actual progress submissions in the database
    const actualProgress = getActivityProgress(act, progressUpdates);
    const actualCompleted = Math.min(act.totalQuantity, Math.round((act.totalQuantity * actualProgress) / 100));
    const remaining = Math.max(0, act.totalQuantity - actualCompleted);

    // 5. Schedule status allocation using operational integration logic
    const { status, reason } = getActivityStatus(act, progressUpdates, materials);

    return {
      sumProductivity,
      expectedDurationDays,
      expectedFinishDateStr,
      actualCompleted,
      remaining,
      status,
      reason
    };
  };

  // Save new Work Item
  const handleSaveWorkItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!wiNameAr || !wiNameEn) {
      alert(isRtl ? 'الرجاء ملء الاسم بالكامل' : 'Please provide work item names');
      return;
    }

    const newItem: WorkItem = {
      id: `wi-${Date.now()}`,
      projectId: selectedProjectId,
      itemNumber: wiNumber || `WI-SEC-00${workItems.length + 1}`,
      nameAr: wiNameAr,
      nameEn: wiNameEn,
      workType: wiType,
      responsiblePerson: wiResp || 'Site Engineer Group'
    };

    onAddWorkItem(newItem);
    setIsAddWiOpen(false);
    // Reset
    setWiNameAr('');
    setWiNameEn('');
    setWiNumber('');
    setWiType('Primary');
    setWiResp('');
  };

  // Save new Activity
  const handleOpenAddActivity = (wiId: string) => {
    if (isReadOnly) return;
    setEditingActivityId(null);
    setSelectedWiIdForActivity(wiId);
    setActNameAr('');
    setActNameEn('');
    setActQty(120);
    setActUnit('m³');
    setActDescAr('');
    setActDescEn('');
    setSelectedMaterialIds([]);
    setSelectedEquipmentIds([]);
    setMaterialAllocations([]);
    setEquipmentAllocations([]);
    setSelectedWorkerIds([]);
    setDependsOnId('');
    setIsAddActOpen(true);
  };

  const handleOpenEditActivity = (act: Activity) => {
    if (isReadOnly) return;
    setEditingActivityId(act.id);
    setSelectedWiIdForActivity(act.workItemId);
    setActNameAr(act.nameAr);
    setActNameEn(act.nameEn);
    setActQty(act.totalQuantity);
    setActUnit(act.unit);
    setActDescAr(act.descriptionAr || '');
    setActDescEn(act.descriptionEn || '');
    setSelectedMaterialIds(act.materialIds || []);
    setSelectedEquipmentIds(act.equipmentIds || []);
    setMaterialAllocations(act.materialAllocations || []);
    setEquipmentAllocations(act.equipmentAllocations || []);
    setSelectedWorkerIds(act.workerIds || []);
    setDependsOnId(act.dependsOnActivityId || '');
    setIsAddActOpen(true);
  };

  const handleOpenDetails = (act: Activity) => {
    setActivityForDetails(act);
    setIsDetailsOpen(true);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!actNameAr || !actNameEn) {
      alert(isRtl ? 'الرجاء إدخال تفاصيل النشاط' : 'Please complete activity fields');
      return;
    }

    if (editingActivityId) {
      onUpdateActivity(editingActivityId, {
        nameAr: actNameAr,
        nameEn: actNameEn,
        totalQuantity: Number(actQty),
        unit: actUnit,
        descriptionAr: actDescAr,
        descriptionEn: actDescEn,
        materialIds: selectedMaterialIds,
        equipmentIds: selectedEquipmentIds,
        materialAllocations: materialAllocations,
        equipmentAllocations: equipmentAllocations,
        workerIds: selectedWorkerIds,
        dependsOnActivityId: dependsOnId || undefined
      });
    } else {
      const newAct: Activity = {
        id: `act-${Date.now()}`,
        workItemId: selectedWiIdForActivity,
        nameAr: actNameAr,
        nameEn: actNameEn,
        totalQuantity: Number(actQty),
        unit: actUnit,
        descriptionAr: actDescAr,
        descriptionEn: actDescEn,
        materialIds: selectedMaterialIds,
        equipmentIds: selectedEquipmentIds,
        materialAllocations: materialAllocations,
        equipmentAllocations: equipmentAllocations,
        workerIds: selectedWorkerIds,
        dependsOnActivityId: dependsOnId || undefined
      };
      onAddActivity(newAct);
    }

    setIsAddActOpen(false);
    setEditingActivityId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Project Tab selector */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <label className="block text-xs font-extrabold text-[#040957] uppercase tracking-wider mb-2">
          {isRtl ? 'اختر المشروع لعرض المخطط والجدولة' : 'Select Target Project for Schedule Computations'}
        </label>
        <div className="flex flex-wrap gap-2">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedProjectId(p.id);
                setExpandedWorkItemIds([]);
                setInspectedActivityId(null);
              }}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${p.id === selectedProjectId ? 'bg-[#040957] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isRtl ? p.nameAr : p.nameEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Work Items list & Smart Planning Sidebar Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Work items tree structure (2 Columns / Left) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-base text-[#040957] font-sans">
                  {t.workItemsTitle}
                </h3>
                <p className="text-xs text-gray-400">
                  {isRtl ? `يتضمن المشروع الحالي ${projectWorkItems.length} أقسام تجميعية رئيسية` : `The selected project holds ${projectWorkItems.length} core physical categories`}
                </p>
              </div>

              {!isReadOnly && (
                <button
                  onClick={() => {
                    setWiNumber(`WI-SEC-${projects.length}${workItems.length + 1}`);
                    setIsAddWiOpen(true);
                  }}
                  className="bg-[#0080FF] hover:bg-[#040957] text-white py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addWorkItem}</span>
                </button>
              )}
            </div>

            {/* Tree Items collapsible list */}
            {projectWorkItems.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs font-semibold">
                {isRtl ? 'لا توجد بنود عمل مسجلة للمشروع المختار، يرجى إنشاء بند جديد.' : 'No structural work items registered on this project. Click Add above.'}
              </div>
            ) : (
              <div className="space-y-3">
                {projectWorkItems.map(wi => {
                  const isExpanded = expandedWorkItemIds.includes(wi.id);
                  const nestedActs = getActivitiesForWi(wi.id);

                  return (
                    <div key={wi.id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-sm transition bg-white">
                      
                      {/* Collapsible item header */}
                      <div className="bg-gray-50/50 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleExpandWi(wi.id)}
                            className="bg-white border border-gray-150 p-1 rounded-lg text-gray-500 hover:text-[#0080FF]"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <div>
                            <span className="font-mono text-[9px] bg-[#040957]/10 text-[#040957] px-2 py-0.5 rounded-full font-bold">
                              {wi.itemNumber}
                            </span>
                            <h4 className="font-bold text-[#040957] text-sm font-sans mt-0.5">
                              {isRtl ? wi.nameAr : wi.nameEn}
                            </h4>
                            <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                              {isRtl ? 'المشرف المسؤول' : 'Lead Engineer'}: <span className="text-gray-600 font-semibold">{wi.responsiblePerson}</span>
                              <span className="mx-2">|</span>
                              {isRtl ? 'نوع العمل' : 'Type'}: <span className="text-[#0080FF] font-semibold">{wi.workType === 'Primary' ? t.primary : t.secondary}</span>
                              <span className="mx-2">|</span>
                              {isRtl ? 'الإنجاز الفعلي' : 'Actual Progress'}: <span className="text-emerald-600 font-bold font-mono">{getWorkItemProgress(wi, activities, progressUpdates)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleOpenAddActivity(wi.id)}
                            disabled={isReadOnly}
                            className={`bg-blue-50 hover:bg-blue-100 text-[#0080FF] p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${isReadOnly ? 'opacity-30 cursor-not-allowed' : ''}`}
                            title={t.addActivity}
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              openConfirm(
                                t.confirmDelete,
                                isRtl ? 'هل أنت متأكد من حذف هذا البند وكافة الأنشطة بداخله؟' : 'Are you sure you want to delete this work item and all its activities?',
                                () => onDeleteWorkItem(wi.id)
                              );
                            }}
                            disabled={isReadOnly}
                            className={`text-gray-300 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition ${isReadOnly ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Nested Activities List */}
                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-gray-100 space-y-2">
                          <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest pb-1 flex items-center gap-1">
                            <Workflow className="w-3 h-3 text-[#0080FF]" />
                            <span>{t.activitiesTitle} ({nestedActs.length})</span>
                          </div>

                          {nestedActs.length === 0 ? (
                            <p className="text-xs text-gray-400 py-3 italic">
                              {isRtl ? 'لا توجد أنشطة تسليم مدرجة تحت البند المختار، انقر زر الإضافة الموفر.' : 'No active activities enrolled under this work category. Click Add above.'}
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {nestedActs.map(act => {
                                const plans = calculateSmartPlanningValues(act);
                                const isInspected = inspectedActivityId === act.id;

                                return (
                                  <div 
                                    key={act.id}
                                    className={`p-3 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${isInspected ? 'border-indigo-400 bg-indigo-50/15 ring-1 ring-indigo-300' : 'border-gray-100 hover:border-gray-200'}`}
                                  >
                                    <div className="space-y-1">
                                      <h5 className="font-bold text-[#040957] text-xs">
                                        {isRtl ? act.nameAr : act.nameEn}
                                      </h5>
                                      <p className="text-[10px] text-gray-400 line-clamp-1 max-w-sm">
                                        {isRtl ? act.descriptionAr : act.descriptionEn}
                                      </p>
                                      
                                      {/* Micro resources details indicators */}
                                      <div className="flex gap-2 text-[9px] text-gray-500 font-semibold items-center">
                                        <span className="flex items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded text-[8px]">
                                          <UserCheck className="w-2.5 h-2.5 text-gray-600" />
                                          {act.workerIds.length} {isRtl ? 'عمال' : 'Labor'}
                                        </span>
                                        <span className="flex items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded text-[8px]">
                                          <Package className="w-2.5 h-2.5 text-gray-600" />
                                          {act.materialIds.length} {isRtl ? 'أصناف مواد' : 'Mat'}
                                        </span>
                                        <span className="flex items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded text-[8px]">
                                          <Wrench className="w-2.5 h-2.5 text-gray-600" />
                                          {act.equipmentIds.length} {isRtl ? 'معدات' : 'Mach'}
                                        </span>
                                      </div>
                                    </div>

                                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                        <div className="text-right flex-1 sm:flex-none">
                                          <div className="text-[10px] text-gray-400">{isRtl ? 'الحجم الكلي' : 'Total Scope'}</div>
                                          <div className="font-bold text-gray-700 font-mono text-xs">{act.totalQuantity} {act.unit}</div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                          <button 
                                            onClick={() => handleOpenDetails(act)}
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-1.5 rounded text-[10px] font-bold transition"
                                            title={isRtl ? 'تفاصيل' : 'Details'}
                                          >
                                            <Eye className="w-3.5 h-3.5" />
                                          </button>

                                          <button 
                                            onClick={() => handlePrintActivityDetailsPDF(act)}
                                            disabled={isPrintingActivity === act.id}
                                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded text-[10px] font-bold transition disabled:opacity-50"
                                            title={isRtl ? 'طباعة التفاصيل' : 'Print Details'}
                                          >
                                            {isPrintingActivity === act.id ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                          </button>

                                          {!isReadOnly && (
                                            <button 
                                              onClick={() => handleOpenEditActivity(act)}
                                              className="bg-amber-50 hover:bg-amber-100 text-amber-600 p-1.5 rounded text-[10px] font-bold transition"
                                              title={isRtl ? 'تعديل' : 'Edit'}
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                            </button>
                                          )}

                                          <button 
                                            onClick={() => setInspectedActivityId(act.id)}
                                            className="bg-[#040957] hover:bg-[#0080FF] text-white p-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                            title={isRtl ? 'حسابات الجدولة' : 'Inspect Plan'}
                                          >
                                            <Calculator className="w-3.5 h-3.5" />
                                          </button>

                                          <button 
                                            onClick={() => {
                                              openConfirm(
                                                t.confirmDelete,
                                                isRtl ? 'هل أنت متأكد من حذف هذا النشاط نهائياً؟' : 'Are you sure you want to delete this activity permanently?',
                                                () => onDeleteActivity(act.id)
                                              );
                                            }}
                                            disabled={isReadOnly}
                                            className="text-gray-300 hover:text-red-500 p-1.5 transition-colors disabled:opacity-30"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Smart Planning Engine panel (1 Column / Right) */}
        <div className="space-y-4">
          <div className="bg-gradient-to-b from-[#040957] to-[#010c2e] text-white p-5 rounded-2xl shadow-xl space-y-4">
            
            <div className="flex items-center gap-2 pb-2 border-b border-white/10">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              <h3 className="font-extrabold text-sm font-sans tracking-wide">
                {t.smartPlanning}
              </h3>
            </div>

            {inspectedActivityId ? (
              (() => {
                const act = activities.find(a => a.id === inspectedActivityId);
                if (!act) return <p className="text-xs text-blue-200">Invalid active node selected.</p>;
                
                const stats = calculateSmartPlanningValues(act);
                
                let signalColor = 'bg-emerald-500';
                let signalText = t.ahead;
                let textSignalStyles = 'text-emerald-400';
                if (stats.status === 'Delayed') {
                  signalColor = 'bg-red-500';
                  signalText = t.delayed;
                  textSignalStyles = 'text-red-400';
                } else if (stats.status === 'On Track') {
                  signalColor = 'bg-blue-400';
                  signalText = t.onTrack;
                  textSignalStyles = 'text-blue-300';
                }

                return (
                  <div className="space-y-4 animate-scaleIn">
                    {/* Activity name */}
                    <div>
                      <span className="text-[9px] uppercase tracking-widest text-[#0080FF] font-black block">Active Activity</span>
                      <h4 className="font-bold text-sm tracking-tight line-clamp-1">
                        {isRtl ? act.nameAr : act.nameEn}
                      </h4>
                    </div>

                    {/* Math parameters outputs card */}
                    <div className="grid grid-cols-2 gap-3 bg-white/5 p-3 rounded-xl border border-white/10 text-xs">
                      <div>
                        <span className="block text-[8px] text-gray-400 uppercase font-semibold">{isRtl ? 'الإنتاج اليومي التراكمي' : 'Daily Sum Productivity'}</span>
                        <span className="font-extrabold text-[#0080FF] font-mono text-sm">{stats.sumProductivity} {act.unit}/day</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-400 uppercase font-semibold">{t.expectedDuration}</span>
                        <span className="font-extrabold text-white font-mono text-sm">{stats.expectedDurationDays} {isRtl ? 'أيام' : 'Days'}</span>
                      </div>
                    </div>

                    {/* Schedule Finish Status */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-300">{t.scheduleHealth}:</span>
                        <span className={`font-black uppercase flex items-center gap-1.5 ${textSignalStyles}`}>
                          <span className={`w-2 h-2 rounded-full ${signalColor} inline-block animate-ping`}></span>
                          {signalText}
                        </span>
                      </div>
                      {stats.reason && (
                        <div className="text-[10px] bg-red-500/20 text-red-300 p-2 rounded-lg border border-red-500/30 font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{isRtl ? 'سبب التأخير: ' : 'Delay Reason: '} {stats.reason}</span>
                        </div>
                      )}
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center text-xs">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {isRtl ? 'تاريخ الاستلام التقديري' : 'Expected Finish'}
                        </span>
                        <span className="font-bold text-yellow-300 font-mono text-xs">{stats.expectedFinishDateStr}</span>
                      </div>
                    </div>

                    {/* Progress representation */}
                    {(() => {
                      const progressPercent = getActivityProgress(act, progressUpdates);
                      return (
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-300">{t.plannedVsActual}</span>
                            <span className="font-bold text-white font-mono">{progressPercent}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-[#0080FF]" style={{ width: `${progressPercent}%` }}></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                            <span>{isRtl ? `منجز: ${stats.actualCompleted}` : `Accomplished: ${stats.actualCompleted} ${act.unit}`}</span>
                            <span>{isRtl ? `متبقي: ${stats.remaining}` : `Remaining balance: ${stats.remaining} ${act.unit}`}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="text-[10px] text-blue-200/50 leading-relaxed italic bg-white/5 p-2.5 rounded-lg">
                      🛡️ {isRtl 
                        ? '* يتم تحديث هذه المتغيرات تلقائياً عند تغيير عدد العمال أو صب ومسح الحقول في الموقع.' 
                        : '* Standard deviation calculations are computed dynamically on each database worker allocation.'}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 text-blue-200/60 text-xs space-y-3">
                <Calculator className="w-10 h-10 text-white/20 mx-auto" />
                <p>{isRtl ? 'يرجى تحديد "حسابات الجدولة" لأي نشاط لمسح الإنتاجية والمدة المتوقعة فوراً.' : 'Select "Inspect Plan" on any sub-activity tool to trigger mathematical schedules.'}</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: ADD WORK ITEM */}
      {isAddWiOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-gray-100 animate-scaleIn">
            <div className="bg-[#040957] text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wide">{t.addWorkItem}</h3>
              <button onClick={() => setIsAddWiOpen(false)} className="text-white bg-white/10 hover:bg-white/20 p-1 rounded transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveWorkItem} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">{t.itemNumber} *</label>
                <input 
                  type="text" 
                  value={wiNumber} 
                  required
                  onChange={(e) => setWiNumber(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] bg-gray-50 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">{t.itemNameAr} *</label>
                  <input 
                    type="text" 
                    value={wiNameAr} 
                    required
                    placeholder="أعمال صب الأساس"
                    onChange={(e) => setWiNameAr(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">{t.itemNameEn} *</label>
                  <input 
                    type="text" 
                    value={wiNameEn} 
                    required
                    placeholder="Foundation pours"
                    onChange={(e) => setWiNameEn(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">{t.workType}</label>
                <select 
                  value={wiType}
                  onChange={(e) => setWiType(e.target.value as any)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-semibold text-gray-700 bg-white"
                >
                  <option value="Primary">{t.primary}</option>
                  <option value="Secondary">{t.secondary}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">{t.responsiblePerson} *</label>
                <input 
                  type="text" 
                  value={wiResp} 
                  required
                  placeholder="Eng. Ahmed Salim"
                  onChange={(e) => setWiResp(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddWiOpen(false)} className="bg-gray-100 hover:bg-gray-200 py-2 px-3 rounded-lg text-xs font-bold text-gray-600 transition">{t.cancel}</button>
                <button type="submit" className="bg-[#040957] hover:bg-[#0080FF] text-white py-2 px-4 rounded-lg text-xs font-bold transition shadow-sm">{t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT ACTIVITY */}
      {isAddActOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="bg-[#040957] text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wide">
                {editingActivityId ? (isRtl ? 'تعديل نشاط' : 'Edit Activity') : t.addActivity}
              </h3>
              <button onClick={() => setIsAddActOpen(false)} className="text-white bg-white/10 hover:bg-white/20 p-1 rounded transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">{t.activityNameAr} *</label>
                  <input 
                    type="text" 
                    value={actNameAr} 
                    required
                    placeholder="صب حديد سابك"
                    onChange={(e) => setActNameAr(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">{t.activityNameEn} *</label>
                  <input 
                    type="text" 
                    value={actNameEn} 
                    required
                    placeholder="SABIC steel pouring"
                    onChange={(e) => setActNameEn(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">{t.totalQuantity} *</label>
                  <input 
                    type="number" 
                    value={actQty} 
                    required
                    onChange={(e) => setActQty(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">{t.unit} (e.g. m³, ton) *</label>
                  <input 
                    type="text" 
                    value={actUnit} 
                    required
                    onChange={(e) => setActUnit(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">{t.descriptionAr}</label>
                <textarea 
                  value={actDescAr}
                  onChange={(e) => setActDescAr(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] h-16"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">{t.descriptionEn}</label>
                <textarea 
                  value={actDescEn}
                  onChange={(e) => setActDescEn(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] h-16"
                />
              </div>

              {/* Resource Links checkbox grids */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h4 className="font-bold text-[#040957] text-xs uppercase tracking-wide">{isRtl ? 'تخصيص الموارد في قاعدة البيانات للمحرك' : 'Allocate Registry Resources for Engine'}</h4>
                
                {/* Workers selection */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500">{t.selectWorkers}</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-24 overflow-y-auto border border-gray-100 p-2 rounded-xl bg-gray-50">
                    {workers.map(w => {
                      const active = selectedWorkerIds.includes(w.id);
                      // Check if worker is assigned elsewhere in active activities
                      const isOccupied = activities.some(a => a.id !== editingActivityId && a.workerIds.includes(w.id));
                      const canBeSelected = !isOccupied || w.allowMultiActivity || active;
                      
                      return (
                        <label key={w.id} className={`flex items-center gap-1.5 text-[10px] cursor-pointer p-1 rounded transition ${isOccupied ? 'bg-amber-50 text-amber-700 opacity-80' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={active}
                            disabled={!canBeSelected}
                            onChange={() => {
                              setSelectedWorkerIds(active ? selectedWorkerIds.filter(id => id !== w.id) : [...selectedWorkerIds, w.id]);
                            }}
                          />
                          <span className="truncate flex items-center gap-1 flex-1">
                            {w.fullName} 
                            {isOccupied && <span className={`text-[8px] px-1 rounded-full ${w.allowMultiActivity ? 'bg-blue-200 text-blue-700' : 'bg-amber-200'}`}>
                              {w.allowMultiActivity ? (isRtl ? 'مشترك' : 'Shared') : (isRtl ? 'مشغول' : 'Busy')}
                            </span>}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onUpdateWorker && onUpdateWorker(w.id, { allowMultiActivity: !w.allowMultiActivity });
                            }}
                            className={`p-1 rounded-md transition-all ${w.allowMultiActivity ? 'text-blue-600 bg-blue-100 shadow-sm scale-110' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`}
                            title={w.allowMultiActivity ? (isRtl ? 'تعطيل المهام المتعددة' : 'Disable Multi-tasking') : (isRtl ? 'تفعيل المهام المتعددة' : 'Enable Multi-tasking')}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                          </button>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Materials selection */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500">{t.selectMaterials}</label>
                  <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto border border-gray-100 p-2 rounded-xl bg-gray-50">
                    {materials.map(m => {
                      const active = selectedMaterialIds.includes(m.id);
                      const alloc = materialAllocations.find(a => a.id === m.id);
                      return (
                        <div key={m.id} className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
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
                              }}
                            />
                            <span className="truncate">{isRtl ? m.nameAr : m.nameEn} ({m.unit}) | {isRtl ? "المتاح:" : "Stock:"} {m.quantity}</span>
                          </label>
                          {active && (
                            <input
                              type="number"
                              min="1"
                              className="border border-gray-200 rounded px-1.5 py-0.5 text-[10px] w-full"
                              placeholder={isRtl ? 'الكمية المطلوبة' : 'Required Qty'}
                              value={alloc?.quantity || ''}
                              onChange={e => {
                                const val = Number(e.target.value);
                                setMaterialAllocations(prev => {
                                  const existing = prev.find(p => p.id === m.id);
                                  if (existing) {
                                    return prev.map(p => p.id === m.id ? { ...p, quantity: val } : p);
                                  }
                                  return [...prev, { id: m.id, quantity: val }];
                                });
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Equipment selection */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500">{t.selectEquipment}</label>
                  <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto border border-gray-100 p-2 rounded-xl bg-gray-50">
                    {equipment.map(e => {
                      const active = selectedEquipmentIds.includes(e.id);
                      const alloc = equipmentAllocations.find(a => a.id === e.id);
                      return (
                        <div key={e.id} className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-[10px] cursor-pointer">
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
                              }}
                            />
                            <span className="truncate">{isRtl ? e.nameAr : e.nameEn} | {isRtl ? "المتاح:" : "Stock:"} {e.totalQuantity}</span>
                          </label>
                          {active && (
                            <input
                              type="number"
                              min="1"
                              className="border border-gray-200 rounded px-1.5 py-0.5 text-[10px] w-full"
                              placeholder={isRtl ? 'الكمية المطلوبة' : 'Required Qty'}
                              value={alloc?.quantity || ''}
                              onChange={ev => {
                                const val = Number(ev.target.value);
                                setEquipmentAllocations(prev => {
                                  const existing = prev.find(p => p.id === e.id);
                                  if (existing) {
                                    return prev.map(p => p.id === e.id ? { ...p, quantity: val } : p);
                                  }
                                  return [...prev, { id: e.id, quantity: val }];
                                });
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dependency Selector */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-gray-500">{isRtl ? 'يعتمد على نشاط (تبعية)' : 'Depends on Activity (Dependency)'}</label>
                  <select 
                    value={dependsOnId}
                    onChange={(e) => setDependsOnId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] bg-gray-50 font-medium"
                  >
                    <option value="">{isRtl ? 'بدون تبعية' : 'No Dependency'}</option>
                    {activities.filter(a => a.workItemId === selectedWiIdForActivity).map(a => (
                      <option key={a.id} value={a.id}>{isRtl ? a.nameAr : a.nameEn}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setIsAddActOpen(false); setEditingActivityId(null); }} className="bg-gray-100 hover:bg-gray-200 py-2.5 px-4 rounded-xl text-xs font-bold text-gray-600 transition">{t.cancel}</button>
                <button type="submit" className="bg-[#040957] hover:bg-[#0080FF] text-white py-2.5 px-6 rounded-xl text-xs font-bold transition shadow-sm">{editingActivityId ? (isRtl ? 'تحديث' : 'Update') : t.save}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACTIVITY DETAILS */}
      {isDetailsOpen && activityForDetails && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="bg-[#040957] text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wide">{isRtl ? 'تفاصيل النشاط' : 'Activity Details'}</h3>
              <button onClick={() => setIsDetailsOpen(false)} className="text-white bg-white/10 hover:bg-white/20 p-1 rounded transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">{isRtl ? 'الاسم (عربي)' : 'Name (Arabic)'}</label>
                  <p className="font-bold text-sm text-[#040957]">{activityForDetails.nameAr}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">{isRtl ? 'الاسم (إنجليزي)' : 'Name (English)'}</label>
                  <p className="font-bold text-sm text-[#040957]">{activityForDetails.nameEn}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">{isRtl ? 'الكمية الكلية' : 'Total Quantity'}</label>
                  <p className="font-mono font-bold text-sm">{activityForDetails.totalQuantity} {activityForDetails.unit}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400 font-bold uppercase">{isRtl ? 'التبعية' : 'Dependency'}</label>
                  <p className="font-bold text-sm">
                    {activityForDetails.dependsOnActivityId 
                      ? (activities.find(a => a.id === activityForDetails.dependsOnActivityId)?.nameAr || activityForDetails.dependsOnActivityId)
                      : (isRtl ? 'لا يوجد' : 'None')}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase">{isRtl ? 'الوصف' : 'Description'}</label>
                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {isRtl ? (activityForDetails.descriptionAr || 'لا يوجد وصف') : (activityForDetails.descriptionEn || 'No description')}
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                {/* Workers Section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[#040957] text-xs flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#0080FF]" />
                    {isRtl ? 'العمال المخصصون' : 'Allocated Workers'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activityForDetails.workerIds.length > 0 ? (
                      workers.filter(w => activityForDetails.workerIds.includes(w.id)).map(w => (
                        <div key={w.id} className="flex items-center justify-between p-2 rounded-lg bg-blue-50/50 border border-blue-100">
                          <span className="text-xs font-bold text-blue-900">{w.fullName}</span>
                          <span className="text-[10px] text-blue-600 font-mono">{w.professionAr}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">{isRtl ? 'لم يتم تخصيص عمال' : 'No workers allocated'}</p>
                    )}
                  </div>
                </div>

                {/* Materials Section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[#040957] text-xs flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#0080FF]" />
                    {isRtl ? 'المواد المخصصة' : 'Allocated Materials'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activityForDetails.materialAllocations && activityForDetails.materialAllocations.length > 0 ? (
                      activityForDetails.materialAllocations.map(alloc => {
                        const m = materials.find(mat => mat.id === alloc.id);
                        return (
                          <div key={alloc.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                            <span className="text-xs font-bold text-emerald-900">{isRtl ? m?.nameAr : m?.nameEn}</span>
                            <span className="text-[10px] text-emerald-600 font-mono font-bold">{alloc.quantity} {m?.unit}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">{isRtl ? 'لم يتم تخصيص مواد' : 'No materials allocated'}</p>
                    )}
                  </div>
                </div>

                {/* Equipment Section */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[#040957] text-xs flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#0080FF]" />
                    {isRtl ? 'المعدات المخصصة' : 'Allocated Equipment'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activityForDetails.equipmentAllocations && activityForDetails.equipmentAllocations.length > 0 ? (
                      activityForDetails.equipmentAllocations.map(alloc => {
                        const e = equipment.find(eq => eq.id === alloc.id);
                        return (
                          <div key={alloc.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                            <span className="text-xs font-bold text-amber-900">{isRtl ? e?.nameAr : e?.nameEn}</span>
                            <span className="text-[10px] text-amber-600 font-mono font-bold">{alloc.quantity} {isRtl ? 'وحدة' : 'Units'}</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">{isRtl ? 'لم يتم تخصيص معدات' : 'No equipment allocated'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => setIsDetailsOpen(false)} 
                  className="bg-gray-100 text-gray-600 py-2 px-6 rounded-xl text-xs font-bold transition hover:bg-gray-200"
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
                <button 
                  onClick={() => handlePrintActivityDetailsPDF(activityForDetails)} 
                  disabled={isPrintingActivity === activityForDetails.id}
                  className="bg-[#040957] text-white py-2 px-6 rounded-xl text-xs font-bold transition shadow-md hover:bg-[#0080FF] flex items-center gap-2"
                >
                  {isPrintingActivity === activityForDetails.id ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-4 h-4" />}
                  {isRtl ? 'طباعة التقرير التفصيلي' : 'Print Detailed Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
