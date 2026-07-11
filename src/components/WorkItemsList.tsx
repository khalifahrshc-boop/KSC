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
  ProgressUpdate
} from '../types';
import { 
  getActivityProgress, 
  getWorkItemProgress,
  getActivityStatus 
} from '../utils/progressCalculations';
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
  AlertTriangle
} from 'lucide-react';

interface WorkItemsListProps {
  lang: 'ar' | 'en';
  t: any;
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
  openConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export default function WorkItemsList({
  lang,
  t,
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
  openConfirm
}: WorkItemsListProps) {
  const isRtl = lang === 'ar';
  const isReadOnly = userRole === 'Viewer';

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
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

  // Active planning inspection
  const [inspectedActivityId, setInspectedActivityId] = useState<string | null>(null);

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
    setSelectedWiIdForActivity(wiId);
    setActNameAr('');
    setActNameEn('');
    setActQty(120);
    setActUnit('m³');
    setActDescAr('');
    setActDescEn('');
    setSelectedMaterialIds([]);
    setSelectedEquipmentIds([]);
    setSelectedWorkerIds([]);
    setIsAddActOpen(true);
  };

  const handleSaveActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!actNameAr || !actNameEn) {
      alert(isRtl ? 'الرجاء إدخال تفاصيل النشاط' : 'Please complete activity fields');
      return;
    }

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
      workerIds: selectedWorkerIds
    };

    onAddActivity(newAct);
    setIsAddActOpen(false);
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

                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                      <div className="text-right">
                                        <div className="text-[10px] text-gray-400">{isRtl ? 'الحجم الكلي' : 'Total Scope'}</div>
                                        <div className="font-bold text-gray-700 font-mono text-xs">{act.totalQuantity} {act.unit}</div>
                                      </div>

                                      <button 
                                        onClick={() => setInspectedActivityId(act.id)}
                                        className="bg-[#040957] hover:bg-[#0080FF] text-white py-1 px-2.5 rounded text-[10px] font-bold flex items-center gap-1 transition"
                                      >
                                        <Calculator className="w-3 h-3" />
                                        <span>{isRtl ? 'حسابات الجدولة' : 'Inspect Plan'}</span>
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
                                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
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

      {/* MODAL: ADD ACTIVITY */}
      {isAddActOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-100 animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="bg-[#040957] text-white p-4 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wide">{t.addActivity}</h3>
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
                      return (
                        <label key={w.id} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={active}
                            onChange={() => {
                              setSelectedWorkerIds(active ? selectedWorkerIds.filter(id => id !== w.id) : [...selectedWorkerIds, w.id]);
                            }}
                          />
                          <span className="truncate">{w.fullName} ({w.dailyProductivity}m)</span>
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
                      return (
                        <label key={m.id} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={active}
                            onChange={() => {
                              setSelectedMaterialIds(active ? selectedMaterialIds.filter(id => id !== m.id) : [...selectedMaterialIds, m.id]);
                            }}
                          />
                          <span className="truncate">{isRtl ? m.nameAr : m.nameEn}</span>
                        </label>
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
                      return (
                        <label key={e.id} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={active}
                            onChange={() => {
                              setSelectedEquipmentIds(active ? selectedEquipmentIds.filter(id => id !== e.id) : [...selectedEquipmentIds, e.id]);
                            }}
                          />
                          <span className="truncate">{isRtl ? e.nameAr : e.nameEn}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddActOpen(false)} className="bg-gray-100 hover:bg-gray-200 py-2.5 px-4 rounded-xl text-xs font-bold text-gray-600 transition">{t.cancel}</button>
                <button type="submit" className="bg-[#040957] hover:bg-[#0080FF] text-white py-2.5 px-5 rounded-xl text-xs font-bold transition shadow-md">{t.save}</button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
