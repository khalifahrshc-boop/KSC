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
  Plus, Trash2, Layers, Workflow, Calculator, Sparkles, Clock, ChevronDown, ChevronUp, 
  HelpCircle, UserCheck, Package, Wrench, Calendar, TrendingUp, Check, X, Play, 
  AlertTriangle, Edit, Eye, Printer, Download, FileSpreadsheet, Search, CheckSquare,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ActivityWizardModal from './ActivityWizardModal';
import ActivityDetailsModal from './ActivityDetailsModal';

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

  // Search & Filters Row States (Image 2 style)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCritical, setFilterCritical] = useState(false);
  const [filterDelayed, setFilterDelayed] = useState(false);
  const [filterOnTrack, setFilterOnTrack] = useState(false);
  const [filterPrimaryOnly, setFilterPrimaryOnly] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);

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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Excel Procedures
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        "Work Item Code / كود بند العمل": "WI-01",
        "Work Item Name (Arabic) / اسم بند العمل (عربي)": "أعمال الحفر والردم",
        "Work Item Name (English) / اسم بند العمل (إنجليزي)": "Excavation Works",
        "Work Item Type (Primary/Secondary) / نوع بند العمل (رئيسي/ثانوي)": "Primary",
        "Activity Name (Arabic) / اسم النشاط (عربي)": "حفر التربة العادية",
        "Activity Name (English) / اسم النشاط (إنجليزي)": "Excavation of standard soil",
        "Description (Arabic) / الوصف (عربي)": "حفر الموقع للمناسيب المطلوبة حسب المخططات المعتمدة",
        "Description (English) / الوصف (إنجليزي)": "Site excavation to required levels according to approved drawings",
        "Total Quantity / الكمية الكلية": 1500,
        "Unit / الوحدة": "m³",
        "Is Critical? (Yes/No) / هل هو نشاط حرج؟ (نعم/لا)": "Yes",
        "Planned Daily Production / الإنتاجية اليومية المستهدفة": 150
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ActivitiesTemplate");
    
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 20 },
      { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 30 },
      { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 25 }
    ];

    XLSX.writeFile(wb, "Field_Activities_Import_Template.xlsx");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedProjectId) {
      alert(isRtl ? 'يرجى اختيار المشروع أولاً قبل رفع الأنشطة' : 'Please select a project first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        if (data.length === 0) {
          alert(isRtl ? 'ملف الإكسل فارغ' : 'The file is empty.');
          return;
        }

        let addedWorkItems = 0;
        let addedActivities = 0;
        const workItemCodeMap = new Map<string, string>();
        
        projectWorkItems.forEach(wi => {
          if (wi.itemNumber) workItemCodeMap.set(wi.itemNumber.trim().toUpperCase(), wi.id);
        });

        data.forEach((row: any, index: number) => {
          const findVal = (possibleKeys: string[]): string => {
            const foundKey = Object.keys(row).find(k => 
              possibleKeys.some(pk => k.toLowerCase().includes(pk.toLowerCase()))
            );
            return foundKey ? String(row[foundKey]).trim() : '';
          };

          const wiCode = findVal(['work item code', 'كود بند', 'كود البند', 'رمز بند']);
          const wiNameArVal = findVal(['work item name (arabic)', 'اسم بند العمل (عربي)', 'اسم البند (عربي)']);
          const wiNameEnVal = findVal(['work item name (english)', 'اسم بند العمل (إنجليزي)', 'اسم البند (إنجليزي)', 'work item name']);
          const wiTypeStr = findVal(['work item type', 'نوع بند', 'نوع البند', 'type']);
          const actNameArVal = findVal(['activity name (arabic)', 'اسم النشاط (عربي)', 'النشاط (عربي)']);
          const actNameEnVal = findVal(['activity name (english)', 'اسم النشاط (إنجليزي)', 'النشاط (إنجليزي)', 'activity name']);
          const descAr = findVal(['description (arabic)', 'الوصف (عربي)', 'وصف النشاط (عربي)']);
          const descEn = findVal(['description (english)', 'الوصف (إنجليزي)', 'وصف النشاط (إنجليزي)', 'description']);
          const qtyVal = findVal(['total quantity', 'الكمية الكلية', 'الكمية', 'quantity']);
          const qty = qtyVal ? Number(qtyVal) : 0;
          const unit = findVal(['unit', 'الوحدة', 'وحدة']) || 'm³';
          const isCriticalStr = findVal(['is critical', 'نشاط حرج', 'حرج']).toLowerCase();
          const isCritical = isCriticalStr.includes('yes') || isCriticalStr.includes('true') || isCriticalStr.includes('نعم') || isCriticalStr.includes('صح');

          if (!wiCode) return;

          let workItemId = workItemCodeMap.get(wiCode.toUpperCase());
          if (!workItemId) {
            workItemId = `wi-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            const newWi: WorkItem = {
              id: workItemId,
              projectId: selectedProjectId,
              nameAr: wiNameArVal || wiNameEnVal || `${wiCode} - Ar`,
              nameEn: wiNameEnVal || wiNameArVal || `${wiCode} - En`,
              itemNumber: wiCode,
              workType: (wiTypeStr.toLowerCase().includes('secondary') || wiTypeStr.includes('ثانوي')) ? 'Secondary' : 'Primary',
              responsiblePerson: ''
            };
            onAddWorkItem(newWi);
            workItemCodeMap.set(wiCode.toUpperCase(), workItemId);
            addedWorkItems++;
          }

          if (actNameArVal || actNameEnVal) {
            const newAct: Activity = {
              id: `act-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              workItemId,
              nameAr: actNameArVal || actNameEnVal || `نشاط ${index + 1}`,
              nameEn: actNameEnVal || actNameArVal || `Activity ${index + 1}`,
              descriptionAr: descAr,
              descriptionEn: descEn,
              totalQuantity: qty || 1,
              unit,
              materialIds: [],
              equipmentIds: [],
              workerIds: [],
              isCritical
            };
            onAddActivity(newAct);
            addedActivities++;
          }
        });

        alert(isRtl
          ? `تم الاستيراد بنجاح! تم إضافة ${addedWorkItems} بنود و ${addedActivities} أنشطة.`
          : `Import completed! Added ${addedWorkItems} work items and ${addedActivities} activities.`
        );

        if (e.target) e.target.value = '';
      } catch (err) {
        console.error(err);
        alert(isRtl ? 'فشل تحليل ملف إكسل' : 'Excel parse error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Safe checks for activities per workitem
  const getActivitiesForWi = (wiId: string) => {
    return activities.filter(act => act.workItemId === wiId);
  };

  // Predictive calculations (Mathematical Schedule Engine)
  const calculateSmartPlanningValues = (act: Activity) => {
    const activeWorkers = workers.filter(w => act.workerIds.includes(w.id));
    const sumProductivity = activeWorkers.reduce((acc, curr) => acc + (curr.dailyProductivity || 0), 0) || 5; 

    const actualProgress = getActivityProgress(act, progressUpdates);
    const isCompleted = actualProgress >= 100;

    const expectedDurationDays = isCompleted ? 0 : Math.ceil(act.totalQuantity / sumProductivity);
    
    // Deduce exact start date based on dependencies
    let startStr = currentProject ? currentProject.startDate : '';
    if (act.dependsOnActivityId) {
      const dep = activities.find(a => a.id === act.dependsOnActivityId);
      if (dep && dep.expectedFinishDate) {
        startStr = dep.expectedFinishDate;
      }
    }
    const expectedFinishDateStr = act.expectedFinishDate || (() => {
      const start = startStr ? new Date(startStr) : new Date();
      const expectedFinish = new Date(start);
      expectedFinish.setDate(expectedFinish.getDate() + (expectedDurationDays || Math.ceil(act.totalQuantity / sumProductivity)));
      return expectedFinish.toISOString().split('T')[0];
    })();

    const actualCompleted = Math.min(act.totalQuantity, Math.round((act.totalQuantity * actualProgress) / 100));
    const remaining = isCompleted ? 0 : Math.max(0, act.totalQuantity - actualCompleted);

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

  // Dynamic filter lists
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      // Filter by current project first
      const parentWi = workItems.find(wi => wi.id === act.workItemId);
      if (!parentWi || parentWi.projectId !== selectedProjectId) return false;

      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchAct = act.nameAr.toLowerCase().includes(query) || act.nameEn.toLowerCase().includes(query);
        const matchDesc = (act.descriptionAr || '').toLowerCase().includes(query) || (act.descriptionEn || '').toLowerCase().includes(query);
        const matchCode = parentWi.itemNumber.toLowerCase().includes(query);
        if (!matchAct && !matchDesc && !matchCode) return false;
      }

      // Critical Filter
      if (filterCritical && !act.isCritical) return false;

      // Smart predicting stats filters
      const stats = calculateSmartPlanningValues(act);
      if (filterDelayed && stats.status !== 'Delayed') return false;
      if (filterOnTrack && stats.status !== 'On Track' && stats.status !== 'Ahead') return false;

      return true;
    });
  }, [activities, workItems, selectedProjectId, searchQuery, filterCritical, filterDelayed, filterOnTrack]);

  const filteredWorkItems = useMemo(() => {
    return projectWorkItems.filter(wi => {
      // Work type filter
      if (filterPrimaryOnly && wi.workType !== 'Primary') return false;

      // Check query match or matching activities inside
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchWi = wi.itemNumber.toLowerCase().includes(query) || 
                        wi.nameAr.toLowerCase().includes(query) || 
                        wi.nameEn.toLowerCase().includes(query) ||
                        wi.responsiblePerson.toLowerCase().includes(query);
        
        const hasMatchingAct = filteredActivities.some(act => act.workItemId === wi.id);
        if (!matchWi && !hasMatchingAct) return false;
      }

      // Operational filters require nested activity compliance
      if (filterCritical || filterDelayed || filterOnTrack) {
        const hasMatchingAct = filteredActivities.some(act => act.workItemId === wi.id);
        if (!hasMatchingAct) return false;
      }

      return true;
    });
  }, [projectWorkItems, filterPrimaryOnly, searchQuery, filterCritical, filterDelayed, filterOnTrack, filteredActivities]);

  // Handle PDF details printing with native sanitizer
  const handlePrintActivityDetailsPDF = async (act: Activity) => {
    if (!act) return;
    setIsPrintingActivity(act.id);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const stats = calculateSmartPlanningValues(act);
      
      const content = document.createElement('div');
      content.style.padding = '20px';
      content.style.fontFamily = 'sans-serif';
      content.dir = isRtl ? 'rtl' : 'ltr';
      content.innerHTML = `
        <div style="border-bottom: 2px solid #040957; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #040957; margin: 0 0 5px 0;">${isRtl ? 'تقرير نشاط تسليم ميداني' : 'Field Activity Inspection Report'}</h2>
          <p style="color: #666; margin: 0; font-size: 12px;">${isRtl ? 'بوابة التخطيط والمتابعة الاستراتيجية للمستودع' : 'Strategic Inventory Planning Gateway'}</p>
        </div>
        <div style="margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr>
              <td style="padding: 6px; font-weight: bold; width: 30%;">${isRtl ? 'اسم النشاط (عربي):' : 'Name (Ar):'}</td>
              <td style="padding: 6px;">${act.nameAr}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold;">${isRtl ? 'اسم النشاط (إنجليزي):' : 'Name (En):'}</td>
              <td style="padding: 6px;">${act.nameEn}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold;">${isRtl ? 'الكمية الكلية المستهدفة:' : 'Volume Quantity:'}</td>
              <td style="padding: 6px; font-weight: bold; color: #040957;">${act.totalQuantity} ${act.unit}</td>
            </tr>
            <tr>
              <td style="padding: 6px; font-weight: bold;">${isRtl ? 'حالة المسار:' : 'Path Class:'}</td>
              <td style="padding: 6px;">${act.isCritical ? (isRtl ? '⚠️ مسار حرج وعاجل' : '⚠️ Critical Path') : (isRtl ? 'اعتيادي قياسي' : 'Routine')}</td>
            </tr>
          </table>
        </div>
        
        <div style="margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
          <h4 style="color: #040957; margin: 0 0 8px 0; font-size: 13px;">${isRtl ? 'النتائج المتوقعة من محرك التنبؤ الذكي' : 'Predictive Calculations Output'}</h4>
          <table style="width: 100%; font-size: 12px;">
            <tr>
              <td>${isRtl ? 'الإنتاجية اليومية للمجموعة:' : 'Daily Capacity:'}</td>
              <td style="font-weight: bold; text-align: left;">${stats.sumProductivity} ${act.unit}/day</td>
            </tr>
            <tr>
              <td>${isRtl ? 'المدة الزمنية المقدرة:' : 'Duration Forecast:'}</td>
              <td style="font-weight: bold; text-align: left;">${stats.expectedDurationDays} ${isRtl ? 'أيام' : 'Days'}</td>
            </tr>
            <tr>
              <td>${isRtl ? 'تاريخ التسليم المتوقع:' : 'Expected Finish Date:'}</td>
              <td style="font-weight: bold; color: #e11d48; text-align: left;">${stats.expectedFinishDateStr}</td>
            </tr>
          </table>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `Inspection_Report_${act.id}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(content).save();
      });

    } catch (err) {
      console.error(err);
    } finally {
      setIsPrintingActivity(null);
    }
  };

  // Add/Edit Work Item Logic
  const handleSaveWorkItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!wiNumber || !wiNameAr || !wiNameEn) {
      alert(isRtl ? 'الرجاء إدخال الحقول المطلوبة لبند العمل' : 'Please complete the required fields');
      return;
    }

    const editTarget = workItems.find(wi => wi.itemNumber === wiNumber && wi.projectId === selectedProjectId);
    if (editTarget) {
      // Editing
      onDeleteWorkItem(editTarget.id);
      onAddWorkItem({
        id: editTarget.id,
        projectId: selectedProjectId,
        nameAr: wiNameAr,
        nameEn: wiNameEn,
        itemNumber: wiNumber,
        workType: wiType,
        responsiblePerson: wiResp
      });
    } else {
      // Adding New
      onAddWorkItem({
        id: `wi-${Date.now()}`,
        projectId: selectedProjectId,
        nameAr: wiNameAr,
        nameEn: wiNameEn,
        itemNumber: wiNumber,
        workType: wiType,
        responsiblePerson: wiResp
      });
    }

    setIsAddWiOpen(false);
    setWiNameAr('');
    setWiNameEn('');
    setWiNumber('');
    setWiResp('');
  };

  const handleOpenAddActivity = (wiId: string) => {
    setSelectedWiIdForActivity(wiId);
    setEditingActivityId(null);
    setIsAddActOpen(true);
  };

  const handleOpenEditActivity = (act: Activity) => {
    setSelectedWiIdForActivity(act.workItemId);
    setEditingActivityId(act.id);
    setIsAddActOpen(true);
  };

  const handleSaveActivityFromWizard = (finalizedData: any) => {
    if (isReadOnly) return;
    if (editingActivityId) {
      onUpdateActivity(editingActivityId, finalizedData);
    } else {
      onAddActivity(finalizedData);
    }
    setIsAddActOpen(false);
    setEditingActivityId(null);
  };

  const handleOpenDetails = (act: Activity) => {
    setActivityForDetails(act);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* SASS TOP NAV BAR & PROJECT TAB SELECTOR (Image 2 Style Header) */}
      <div className="bg-[#0B1B3D] text-white px-6 py-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0080FF] rounded-xl text-white font-extrabold text-xs tracking-widest font-mono">
            FPMS
          </div>
          <div className="hidden sm:block h-6 w-[1px] bg-white/20"></div>
          <div className="text-xs font-semibold text-slate-300">
            {isRtl ? 'بوابة المتابعة والتخطيط الذكي للمشروع' : 'Strategic Schedule & Plan Dashboard'}
          </div>
        </div>

        {/* Project Selector tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {projects.map(p => {
            const isActive = p.id === selectedProjectId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedProjectId(p.id);
                  setExpandedWorkItemIds([]);
                  setInspectedActivityId(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                  isActive 
                    ? 'bg-[#0080FF] text-white shadow-md' 
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isRtl ? p.nameAr : p.nameEn}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <button
              onClick={() => {
                setWiNumber(`WI-${Date.now().toString().slice(-3)}`);
                setWiNameAr('');
                setWiNameEn('');
                setWiResp('');
                setWiType('Primary');
                setIsAddWiOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'إضافة بند عمل' : 'New Work Item'}</span>
            </button>
          )}
          {!isReadOnly && (
            <button
              onClick={() => setShowExcelImport(!showExcelImport)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                showExcelImport ? 'bg-white text-[#0B1B3D]' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isRtl ? 'استيراد Excel' : 'Excel File'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Excel template / upload drawer */}
      {showExcelImport && !isReadOnly && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 animate-scaleIn">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <h4 className="font-extrabold text-[#040957] text-xs">
                {isRtl ? 'استيراد الأنشطة والجدولة الذكية من إكسل' : 'Bulk Excel File Importer'}
              </h4>
              <p className="text-[10px] text-slate-500 font-bold">
                {isRtl ? 'يمكنك تعبئة وإدراج العشرات من الأنشطة وبنود العمل الميدانية بنقرة واحدة.' : 'Quickly populate field deliverables and activities into the schedule.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadExcelTemplate}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRtl ? 'تحميل نموذج Excel المعتمد' : 'Download Template'}</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#040957] text-white hover:bg-[#0080FF] py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{isRtl ? 'رفع ملف Excel معبأ' : 'Upload Data Sheet'}</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleExcelUpload} 
                accept=".xlsx, .xls" 
                className="hidden" 
              />
            </div>
          </div>
        </div>
      )}

      {/* SEARCH & ESTONIAN STYLE FILTERS ROW (Image 2 style) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-1/3">
          <input
            type="text"
            placeholder={isRtl ? 'البحث باسم بند العمل، النشاط أو الرمز...' : 'Search by work item, activity name or code...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] bg-slate-50/50 text-right md:text-right"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        </div>

        {/* Pills Checkbox-styled filters (Image 2) */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setFilterCritical(!filterCritical)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
              filterCritical 
                ? 'border-rose-500 bg-rose-50/50 text-rose-700' 
                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
              filterCritical ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-300 bg-white'
            }`}>
              {filterCritical && <Check className="w-2.5 h-2.5 stroke-[4]" />}
            </span>
            <span>{isRtl ? 'المسار الحرج' : 'Critical Path'}</span>
          </button>

          <button
            onClick={() => setFilterDelayed(!filterDelayed)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
              filterDelayed 
                ? 'border-red-500 bg-red-50/50 text-red-700' 
                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
              filterDelayed ? 'bg-red-600 border-red-600 text-white' : 'border-slate-300 bg-white'
            }`}>
              {filterDelayed && <Check className="w-2.5 h-2.5 stroke-[4]" />}
            </span>
            <span>{isRtl ? 'أنشطة متأخرة' : 'Delayed Alerts'}</span>
          </button>

          <button
            onClick={() => setFilterOnTrack(!filterOnTrack)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
              filterOnTrack 
                ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700' 
                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
              filterOnTrack ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
            }`}>
              {filterOnTrack && <Check className="w-2.5 h-2.5 stroke-[4]" />}
            </span>
            <span>{isRtl ? 'على المسار' : 'On Track'}</span>
          </button>

          <button
            onClick={() => setFilterPrimaryOnly(!filterPrimaryOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
              filterPrimaryOnly 
                ? 'border-blue-500 bg-blue-50/50 text-blue-700' 
                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
            }`}
          >
            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
              filterPrimaryOnly ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
            }`}>
              {filterPrimaryOnly && <Check className="w-2.5 h-2.5 stroke-[4]" />}
            </span>
            <span>{isRtl ? 'أصناف رئيسية' : 'Primary Only'}</span>
          </button>
        </div>
      </div>

      {/* MAIN TWO COLUMN LAYOUT (Image 2 style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Center side: The Cases List Table (2/3 width) */}
        <div className="lg:col-span-2 space-y-3">
          
          {/* Column Header for cases table */}
          <div className="hidden md:grid grid-cols-6 gap-4 px-4 py-3 bg-slate-100 border-b border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500 tracking-wider">
            <div>{isRtl ? 'بند العمل والرمز' : 'Work Item Code'}</div>
            <div>{isRtl ? 'المشرف المسؤول' : 'Lead Engineer'}</div>
            <div>{isRtl ? 'التقدم والمنجز' : 'Progress'}</div>
            <div>{isRtl ? 'الموارد المخصصة' : 'Resources'}</div>
            <div>{isRtl ? 'حالة الجدول الزمني' : 'Schedule Status'}</div>
            <div className="text-left">{isRtl ? 'التحكم' : 'Actions'}</div>
          </div>

          {filteredWorkItems.length === 0 ? (
            <div className="bg-white border border-slate-200 p-8 rounded-xl text-center">
              <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
              <p className="text-xs text-slate-400 font-bold">
                {isRtl ? 'لا توجد بنود عمل مطابقة للبحث أو الفلترة المطبقة.' : 'No executive work items conform to the applied filter parameters.'}
              </p>
            </div>
          ) : (
            filteredWorkItems.map(wi => {
              const isExpanded = expandedWorkItemIds.includes(wi.id);
              const nestedActs = filteredActivities.filter(act => act.workItemId === wi.id);

              // Compute labor and material counts for work item row
              let wiWorkersCount = 0;
              let wiMaterialsCount = 0;
              nestedActs.forEach(act => {
                wiWorkersCount += act.workerIds.length;
                wiMaterialsCount += act.materialIds.length;
              });

              return (
                <div key={wi.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-[#0080FF] transition-all">
                  <div className="p-4 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    
                    {/* ID & Code */}
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleExpandWi(wi.id)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[9px] bg-[#0080FF]/10 text-[#0080FF] px-2 py-0.5 rounded-full font-black uppercase">
                            {wi.itemNumber}
                          </span>
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                            wi.workType === 'Primary' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {wi.workType === 'Primary' ? (isRtl ? 'رئيسي' : 'Primary') : (isRtl ? 'ثانوي' : 'Secondary')}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-[#040957] text-xs mt-1 line-clamp-1">
                          {isRtl ? wi.nameAr : wi.nameEn}
                        </h4>
                        <span className="text-[10px] text-[#0080FF] font-bold">
                          {nestedActs.length} {isRtl ? 'أنشطة تسليم' : 'sub-activities'}
                        </span>
                      </div>
                    </div>

                    {/* Supervisor */}
                    <div className="text-xs">
                      <div className="font-bold text-slate-800">{wi.responsiblePerson || '---'}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{isRtl ? 'مهندس الموقع' : 'Site Lead'}</div>
                    </div>

                    {/* Progress */}
                    <div>
                      {(() => {
                        const progress = getWorkItemProgress(wi, activities, progressUpdates);
                        return (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-mono font-extrabold text-slate-700">{progress}%</span>
                              <span className="text-[9px] text-slate-400 font-bold">{isRtl ? 'منجز فعلي' : 'completed'}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Resources */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-100">
                        <UserCheck className="w-3 h-3 text-blue-500" />
                        {wiWorkersCount} {isRtl ? 'عمال' : 'Labor'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-emerald-100">
                        <Package className="w-3 h-3 text-emerald-500" />
                        {wiMaterialsCount} {isRtl ? 'مواد' : 'Mat'}
                      </span>
                    </div>

                    {/* Prediction status */}
                    <div>
                      {(() => {
                        let hasDelayed = false;
                        let hasOnTrack = false;
                        nestedActs.forEach(act => {
                          const stats = calculateSmartPlanningValues(act);
                          if (stats.status === 'Delayed') hasDelayed = true;
                          else if (stats.status === 'On Track' || stats.status === 'Ahead') hasOnTrack = true;
                        });

                        let pillColor = 'bg-slate-100 text-slate-600 border-slate-200';
                        let statusText = isRtl ? 'لا أنشطة' : 'No activity';
                        if (nestedActs.length > 0) {
                          if (hasDelayed) {
                            pillColor = 'bg-red-50 text-red-700 border-red-200';
                            statusText = isRtl ? 'تنبيه تأخير ⚠️' : 'Delay Alert ⚠️';
                          } else if (hasOnTrack) {
                            pillColor = 'bg-blue-50 text-blue-700 border-blue-200';
                            statusText = isRtl ? 'على المسار' : 'On Track';
                          } else {
                            pillColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            statusText = isRtl ? 'مستقر' : 'Stable';
                          }
                        }

                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${pillColor}`}>
                            {statusText}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 justify-end">
                      {!isReadOnly && (
                        <button 
                          onClick={() => handleOpenAddActivity(wi.id)}
                          className="p-1.5 bg-[#0080FF]/10 text-[#0080FF] hover:bg-[#0080FF] hover:text-white rounded-lg transition-all"
                          title={t.addActivity}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isReadOnly && (
                        <button 
                          onClick={() => {
                            setWiNumber(wi.itemNumber);
                            setWiNameAr(wi.nameAr);
                            setWiNameEn(wi.nameEn);
                            setWiType(wi.workType);
                            setWiResp(wi.responsiblePerson);
                            setSelectedProjectId(wi.projectId);
                            setIsAddWiOpen(true);
                          }}
                          className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg transition-all"
                          title={isRtl ? 'تعديل' : 'Edit'}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isReadOnly && (
                        <button 
                          onClick={() => {
                            openConfirm(
                              t.confirmDelete,
                              isRtl ? 'هل أنت متأكد من حذف بند العمل والأنشطة المرتبطة به؟' : 'Are you sure you want to delete this Work Item and all its nested activities?',
                              () => onDeleteWorkItem(wi.id),
                              true
                            );
                          }}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                          title={isRtl ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Expanded activities sub-grid */}
                  {isExpanded && (
                    <div className="px-6 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-2.5">
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <Workflow className="w-3.5 h-3.5 text-[#0080FF]" />
                        <span>{t.activitiesTitle} ({nestedActs.length})</span>
                      </div>

                      {nestedActs.length === 0 ? (
                        <p className="text-[11px] text-slate-400 py-3 italic">
                          {isRtl ? 'لا توجد أنشطة تسليم مدرجة تحت هذا البند، انقر زر الإضافة الموفر.' : 'No deliverables registered under this category yet.'}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {nestedActs.map(act => {
                            const plans = calculateSmartPlanningValues(act);
                            const isInspected = inspectedActivityId === act.id;

                            return (
                              <div 
                                key={act.id}
                                className={`p-3 bg-white rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-xs ${
                                  isInspected ? 'border-[#0080FF] ring-2 ring-[#0080FF]/10' : 'border-slate-100'
                                }`}
                              >
                                <div className="space-y-1 flex-1 max-w-sm text-right md:text-right">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="font-extrabold text-[#040957] text-xs">
                                      {isRtl ? act.nameAr : act.nameEn}
                                    </h5>
                                    {act.isCritical && (
                                      <span className="bg-rose-500/10 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-rose-300 animate-pulse">
                                        {isRtl ? 'حرج' : 'CRITICAL'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-semibold line-clamp-2 leading-relaxed">
                                    {isRtl ? act.descriptionAr : act.descriptionEn}
                                  </p>
                                  <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[9px] text-slate-400 font-bold mt-1">
                                    <span>👥 {act.workerIds.length} {isRtl ? 'عمال' : 'workers'}</span>
                                    <span>📦 {act.materialIds.length} {isRtl ? 'مواد' : 'items'}</span>
                                    {act.workZone && (
                                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                                        📍 {isRtl ? 'المنطقة:' : 'Zone:'} {act.workZone}
                                      </span>
                                    )}
                                    {act.role && (
                                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                                        💼 {isRtl ? 'الدور:' : 'Role:'} {act.role}
                                      </span>
                                    )}
                                    {act.location && (
                                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md max-w-[150px] truncate" title={act.location}>
                                        🧭 {isRtl ? 'الموقع:' : 'Loc:'} {act.location}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="min-w-[80px]">
                                  <div className="text-[9px] text-slate-400 font-bold">{isRtl ? 'الكمية الإجمالية' : 'Total Scope'}</div>
                                  <div className="font-mono font-extrabold text-xs text-slate-800">{act.totalQuantity} {act.unit}</div>
                                </div>

                                <div className="min-w-[110px]">
                                  <div className="text-[9px] text-slate-400 font-bold">{isRtl ? 'الانتهاء المتوقع' : 'Predicted Finish'}</div>
                                  <div className="font-mono text-[11px] font-extrabold text-amber-600 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-amber-500" />
                                    {plans.expectedFinishDateStr}
                                  </div>
                                </div>

                                <div className="min-w-[90px]">
                                  {(() => {
                                    const actProgress = getActivityProgress(act, progressUpdates);
                                    const isCompleted = actProgress >= 100;
                                    
                                    // Calculate ahead of schedule
                                    let isAheadOfSchedule = false;
                                    let savedDaysVal = 0;
                                    let completionDate = new Date();
                                    let actEnd = new Date();
                                    if (isCompleted) {
                                      const updates = progressUpdates.filter(upd => upd.activityId === act.id);
                                      const lastUpdate = updates.length > 0
                                        ? [...updates].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[updates.length - 1]
                                        : null;
                                      completionDate = lastUpdate ? new Date(lastUpdate.timestamp) : new Date();
                                      
                                      let startStr = currentProject ? currentProject.startDate : '';
                                      if (act.dependsOnActivityId) {
                                        const dep = activities.find(a => a.id === act.dependsOnActivityId);
                                        if (dep && dep.expectedFinishDate) {
                                          startStr = dep.expectedFinishDate;
                                        }
                                      }
                                      const endStr = act.expectedFinishDate || (currentProject ? currentProject.endDate : '');
                                      if (endStr) {
                                        actEnd = new Date(endStr);
                                        if (completionDate < actEnd) {
                                          isAheadOfSchedule = true;
                                          const diffMs = actEnd.getTime() - completionDate.getTime();
                                          savedDaysVal = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                                        }
                                      }
                                    }

                                    if (isCompleted) {
                                      return (
                                        <div className="flex flex-col gap-1">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border bg-emerald-100 text-emerald-800 border-emerald-300">
                                            {isRtl ? 'مكتمل' : 'Completed'}
                                          </span>
                                          {isAheadOfSchedule && (
                                            <span className="inline-flex items-center gap-0.5 text-[8px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded-md border border-emerald-200 animate-pulse">
                                              <CheckCircle2 className="w-2.5 h-2.5" />
                                              {savedDaysVal > 0 
                                                ? (isRtl ? `توفير ${savedDaysVal} يومّ` : `Saved ${savedDaysVal}d`)
                                                : (isRtl ? `توفير ساعات` : `Saved hrs`)}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    }

                                    let tagColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                    let tagText = isRtl ? 'على المسار' : 'On Track';
                                    if (plans.status === 'Delayed') {
                                      tagColor = 'bg-red-50 text-red-700 border-red-200';
                                      tagText = isRtl ? 'متأخر' : 'Delayed';
                                    } else if (plans.status === 'Ahead') {
                                      tagColor = 'bg-blue-50 text-blue-700 border-blue-200';
                                      tagText = isRtl ? 'متقدم' : 'Ahead';
                                    }
                                    return (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${tagColor}`}>
                                        {tagText}
                                      </span>
                                    );
                                  })()}
                                </div>

                                <div className="flex items-center gap-1.5 justify-end w-full md:w-auto">
                                  <button
                                    onClick={() => handleOpenDetails(act)}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                                    title={isRtl ? 'تفاصيل' : 'Details'}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handlePrintActivityDetailsPDF(act)}
                                    disabled={isPrintingActivity === act.id}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                                  >
                                    {isPrintingActivity === act.id ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                  </button>
                                  {!isReadOnly && (
                                    <button
                                      onClick={() => handleOpenEditActivity(act)}
                                      className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-all"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setInspectedActivityId(act.id)}
                                    className="p-1.5 bg-[#040957] text-white hover:bg-[#0080FF] rounded-lg transition-all flex items-center gap-1 text-[10px] font-black"
                                  >
                                    <Calculator className="w-3.5 h-3.5" />
                                  </button>
                                  {!isReadOnly && (
                                    <button
                                      onClick={() => {
                                        openConfirm(
                                          t.confirmDelete,
                                          isRtl ? 'حذف هذا النشاط نهائياً؟' : 'Delete this activity permanently?',
                                          () => onDeleteActivity(act.id),
                                          true
                                        );
                                      }}
                                      className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
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
            })
          )}
        </div>

        {/* Right side: Predictor Sidebar (Image 1 style deep navy card widget) */}
        <div className="bg-[#0B1B3D] text-white p-5 rounded-2xl shadow-xl space-y-5 h-fit">
          <div className="border-b border-white/10 pb-3">
            <span className="text-[9px] uppercase tracking-widest text-[#0080FF] font-black block">
              {isRtl ? 'محرك التخطيط والجدولة الذكي المؤتمت' : 'PREDICTIVE SCHEDULING CLOUD'}
            </span>
            <h3 className="font-extrabold text-sm mt-1 text-white">
              {isRtl ? 'لوحة التنبؤات والتحليلات الميدانية' : 'Automated Predictions & Insights'}
            </h3>
          </div>

          {inspectedActivityId ? (
            (() => {
              const selectedAct = activities.find(a => a.id === inspectedActivityId);
              if (!selectedAct) return null;
              const stats = calculateSmartPlanningValues(selectedAct);

              return (
                <div className="space-y-4 animate-scaleIn">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-xs text-white">{isRtl ? selectedAct.nameAr : selectedAct.nameEn}</h4>
                      <span className="text-[10px] text-slate-400 block font-mono font-bold">ID: {selectedAct.id.slice(0, 10)}</span>
                    </div>
                    <button 
                      onClick={() => setInspectedActivityId(null)}
                      className="text-slate-400 hover:text-white bg-white/5 p-1 rounded transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-slate-300 font-bold">{isRtl ? 'الإنتاجية اليومية للمجموعة:' : 'Group Capacity:'}</span>
                      <span className="font-mono text-emerald-400 font-black">{stats.sumProductivity} {selectedAct.unit}/day</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-slate-300 font-bold">{isRtl ? 'المدة الزمنية المقدرة:' : 'Duration Forecast:'}</span>
                      <span className="font-mono text-white font-black">{stats.expectedDurationDays} {isRtl ? 'أيام' : 'days'}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-slate-300 font-bold">{isRtl ? 'الانتهاء المتوقع:' : 'Expected Finish Date:'}</span>
                      <span className="font-mono text-amber-400 font-black">{stats.expectedFinishDateStr}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-slate-300 font-bold">{isRtl ? 'المنجز الفعلي حتى الآن:' : 'Completed Volume:'}</span>
                      <span className="font-mono text-white font-black">{stats.actualCompleted} {selectedAct.unit}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-slate-300 font-bold">{isRtl ? 'الكمية المتبقية للتسليم:' : 'Remaining Backlog:'}</span>
                      <span className="font-mono text-rose-400 font-black">{stats.remaining} {selectedAct.unit}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">{isRtl ? 'تحليل الحالة التشغيلية والجدولة' : 'Schedule Diagnostics'}</span>
                    <p className="text-[10px] text-slate-200 font-extrabold leading-relaxed">
                      {isRtl ? stats.reason : stats.reason}
                    </p>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2">
                <span className="text-[10px] text-[#0080FF] font-black uppercase tracking-wider block">{isRtl ? 'مؤشرات أداء المشروع الحالي' : 'CURRENT PROJECT METRICS'}</span>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-semibold">{isRtl ? 'إجمالي البنود' : 'Total Items'}</span>
                    <span className="font-mono text-white font-black text-sm">{projectWorkItems.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-semibold">{isRtl ? 'إجمالي الأنشطة' : 'Total Activities'}</span>
                    <span className="font-mono text-white font-black text-sm">
                      {activities.filter(a => projectWorkItems.some(wi => wi.id === a.workItemId)).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-semibold">{isRtl ? 'المسار الحرج ⚠️' : 'Critical Items'}</span>
                    <span className="font-mono text-rose-400 font-black text-sm">
                      {activities.filter(a => a.isCritical && projectWorkItems.some(wi => wi.id === a.workItemId)).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-semibold">{isRtl ? 'تاريخ البدء' : 'Start Date'}</span>
                    <span className="font-mono text-amber-400 font-black text-xs">
                      {currentProject?.startDate || '---'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0080FF]/10 border border-[#0080FF]/25 p-4 rounded-xl text-center space-y-2">
                <Calculator className="w-7 h-7 text-[#0080FF] mx-auto animate-pulse" />
                <p className="text-xs font-black text-white">{isRtl ? 'محرك التنبؤ وجدولة المهام الذكي' : 'Predictive Analysis Live'}</p>
                <p className="text-[10px] text-slate-300 leading-relaxed font-bold">
                  {isRtl 
                    ? 'اختر أي نشاط فرعي من القائمة وانقر زر "حسابات الجدولة" لمشاهدة التوقعات المباشرة وتقدير تاريخ الانتهاء وتحليل المخاطر فوراً.' 
                    : 'Select any deliverable and click Inspect Plan icon to inspect real-time durations, daily capacities, and backlog diagnostics.'}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* --- ADD/EDIT WORK ITEM MODAL (Estonian Border theme styled) --- */}
      {isAddWiOpen && !isReadOnly && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveWorkItem} className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="bg-[#040957] text-white p-4 flex justify-between items-center">
              <h3 className="font-extrabold text-xs uppercase tracking-wide">
                {isRtl ? 'إعداد وتسجيل بند عمل تنفيذي' : 'Register Executive Work Item'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddWiOpen(false)}
                className="text-white hover:text-slate-200 bg-white/10 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-right md:text-right">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">{isRtl ? 'رمز بند العمل (كود)' : 'Work Item Code'}</label>
                <input 
                  type="text" 
                  value={wiNumber} 
                  required
                  placeholder="WI-01"
                  onChange={(e) => setWiNumber(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-bold bg-slate-50/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">{isRtl ? 'الاسم باللغة العربية' : 'Name (Arabic)'}</label>
                <input 
                  type="text" 
                  value={wiNameAr} 
                  required
                  placeholder="أعمال الهياكل الخرسانية"
                  onChange={(e) => setWiNameAr(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-semibold bg-slate-50/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">{isRtl ? 'الاسم باللغة الإنجليزية' : 'Name (English)'}</label>
                <input 
                  type="text" 
                  value={wiNameEn} 
                  required
                  placeholder="Concrete Structure Works"
                  onChange={(e) => setWiNameEn(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-semibold bg-slate-50/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">{isRtl ? 'نوع بند العمل' : 'Work Category Type'}</label>
                <select
                  value={wiType}
                  onChange={(e) => setWiType(e.target.value as 'Primary' | 'Secondary')}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] bg-slate-50/50 font-semibold"
                >
                  <option value="Primary">{isRtl ? 'رئيسي / أساسي' : 'Primary / Groundwork'}</option>
                  <option value="Secondary">{isRtl ? 'ثانوي / تشطيبات' : 'Secondary / Finishes'}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">{isRtl ? 'المهندس المشرف المسؤول' : 'Lead Field Supervisor'}</label>
                <input 
                  type="text" 
                  value={wiResp} 
                  placeholder="م. محمد القحطاني"
                  onChange={(e) => setWiResp(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#0080FF] font-semibold bg-slate-50/50"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setIsAddWiOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 py-2 px-5 rounded-xl text-xs font-extrabold transition"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-6 rounded-xl text-xs font-black transition shadow-md"
              >
                {isRtl ? 'حفظ وتأكيد' : 'Confirm & Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- ADD/EDIT ACTIVITY STEPPER WIZARD (Image 1 High-fidelity Modal) --- */}
      <ActivityWizardModal 
        isOpen={isAddActOpen}
        onClose={() => {
          setIsAddActOpen(false);
          setEditingActivityId(null);
        }}
        onSave={handleSaveActivityFromWizard}
        activity={editingActivityId ? (activities.find(a => a.id === editingActivityId) || null) : null}
        workItemId={selectedWiIdForActivity}
        workers={workers}
        materials={materials}
        equipment={equipment}
        activities={activities}
        projectStartDate={currentProject?.startDate || ''}
        companyName={settings.companyNameEn || 'FPMS Group'}
        lang={lang}
        t={t}
        onUpdateWorker={onUpdateWorker}
      />

      {/* --- DETAILS DIALOG (High-fidelity Detailed Summary Viewer) --- */}
      <ActivityDetailsModal 
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        activity={activityForDetails}
        workers={workers}
        materials={materials}
        equipment={equipment}
        activities={activities}
        isPrinting={isPrintingActivity === activityForDetails?.id}
        onPrint={() => activityForDetails && handlePrintActivityDetailsPDF(activityForDetails)}
        lang={lang}
      />

    </div>
  );
}
