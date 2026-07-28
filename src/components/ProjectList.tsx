/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Project, 
  SystemSettings,
  UserRole,
  WorkItem,
  Activity,
  ProgressUpdate,
  AttendanceRecord,
  WarehouseMaterial,
  Worker,
  EquipmentItem
} from '../types';
import { dbApi } from '../lib/api';
import { getProjectProgress, getProjectStatusDetails, getWorkItemProgress, getActivityProgress } from '../utils/progressCalculations';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Copy, 
  Files, 
  Download, 
  Printer, 
  SlidersHorizontal, 
  ArrowUpDown, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  X, 
  CornerDownRight,
  LayoutGrid,
  GanttChartSquare,
  CheckCircle2,
  Award,
  Lock,
  Unlock,
  Calendar as CalendarIcon
} from 'lucide-react';
import GanttChart from './GanttChart';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ProjectListProps {
  lang: 'ar' | 'en';
  t: any;
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  progressUpdates: ProgressUpdate[];
  attendanceRecords: AttendanceRecord[];
  materials: WarehouseMaterial[];
  settings: SystemSettings;
  userRole: UserRole;
  workers?: Worker[];
  equipment?: EquipmentItem[];
  onAddProject: (project: Project) => void;
  onUpdateProject: (id: string, updated: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onDeleteProjects: (ids: string[]) => void;
  onDuplicateProject: (id: string) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
  onNavigate?: (mod: string) => void;
}

export default function ProjectList({
  lang,
  t,
  projects,
  workItems,
  activities,
  progressUpdates = [],
  attendanceRecords = [],
  materials = [],
  settings,
  userRole,
  workers = [],
  equipment = [],
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onDeleteProjects,
  onDuplicateProject,
  openConfirm,
  onNavigate
}: ProjectListProps) {
  const isRtl = lang === 'ar';
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Ahead' | 'On Track' | 'Delayed'>('all');
  const [sortField, setSortField] = useState<keyof Project>('projectNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('table');
  
  // Multi Select State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Form Field State
  const [formNumber, setFormNumber] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formClientAr, setFormClientAr] = useState('');
  const [formClientEn, setFormClientEn] = useState('');
  const [formLocationAr, setFormLocationAr] = useState('');
  const [formLocationEn, setFormLocationEn] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formPM, setFormPM] = useState('');
  const [formStatus, setFormStatus] = useState<'Ahead' | 'On Track' | 'Delayed'>('On Track');
  const [formBudget, setFormBudget] = useState(500000);
  const [formMorningMeetingPlan, setFormMorningMeetingPlan] = useState('');
  const [formIsCompleted, setFormIsCompleted] = useState(false);
  const [formCompletionDate, setFormCompletionDate] = useState('');

  // Lock & Unlock Overrides State
  const [unlockedProjectIds, setUnlockedProjectIds] = useState<string[]>([]);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [unlockProjectId, setUnlockProjectId] = useState<string | null>(null);
  const [unlockIdNumber, setUnlockIdNumber] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockAction, setUnlockAction] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);

  // Detailed Completion Report Modal State
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportProject, setReportProject] = useState<Project | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const loadAdmins = async () => {
      try {
        const list = await dbApi.getAll<any>('admins');
        setAdmins(list);
      } catch (err) {
        console.error('Error fetching admins for override check:', err);
      }
    };
    loadAdmins();
  }, []);

  const [notification, setNotification] = useState<string | null>(null);

  const isReadOnly = userRole === 'Viewer';

  // Sort and filter logic
  const handleSort = (field: keyof Project) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedProjects = [...projects]
    .filter(p => {
      const searchStr = `${p.projectNumber} ${p.nameAr} ${p.nameEn} ${p.clientAr} ${p.clientEn} ${p.projectManager}`.toLowerCase();
      const matchSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc' 
          ? (valA as number) - (valB as number) 
          : (valB as number) - (valA as number);
      }
    });

  // Bulk toggles
  const handleToggleSelectAll = () => {
    if (selectedIds.length === sortedProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedProjects.map(p => p.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Trigger Notification
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const checkLock = (project: Project, onAuthorized: () => void) => {
    if (project.isCompleted && !unlockedProjectIds.includes(project.id)) {
      setUnlockProjectId(project.id);
      setUnlockAction(() => onAuthorized);
      setUnlockError(null);
      setUnlockIdNumber('');
      setUnlockPassword('');
      setIsUnlockOpen(true);
    } else {
      onAuthorized();
    }
  };

  const handleVerifyUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    const foundAdmin = admins.find(a => a.idNumber === unlockIdNumber.trim() && a.password === unlockPassword.trim());
    if (foundAdmin) {
      if (unlockProjectId) {
        setUnlockedProjectIds(prev => [...prev, unlockProjectId]);
      }
      setIsUnlockOpen(false);
      if (unlockAction) {
        unlockAction();
      }
    } else {
      setUnlockError(isRtl ? 'بيانات التحقق غير صحيحة، يرجى التحقق من الهوية وكلمة المرور' : 'Incorrect authentication credentials. Please try again.');
    }
  };

  // CRUD Actions
  const handleOpenAdd = () => {
    if (isReadOnly) return;
    setFormNumber(`PRJ-2026-00${projects.length + 1}`);
    setFormNameAr('');
    setFormNameEn('');
    setFormClientAr('');
    setFormClientEn('');
    setFormLocationAr('');
    setFormLocationEn('');
    setFormStartDate('2026-06-18');
    setFormEndDate('2026-12-30');
    setFormPM('');
    setFormStatus('On Track');
    setFormBudget(1200000);
    setFormMorningMeetingPlan('');
    setFormIsCompleted(false);
    setFormCompletionDate('');
    setIsAddOpen(true);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    
    // Simple verification
    if (!formNameAr || !formNameEn || !formClientAr || !formClientEn) {
      alert(isRtl ? 'الرجاء ملء كافة المتطلبات' : 'Please complete all required fields');
      return;
    }

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      projectNumber: formNumber,
      nameAr: formNameAr,
      nameEn: formNameEn,
      clientAr: formClientAr,
      clientEn: formClientEn,
      locationAr: formLocationAr,
      locationEn: formLocationEn,
      startDate: formStartDate,
      endDate: formEndDate,
      projectManager: formPM || 'Engs. Al-Sudairi Group',
      status: formStatus,
      budget: Number(formBudget),
      morningMeetingPlan: formMorningMeetingPlan,
      isCompleted: formIsCompleted,
      completionDate: formIsCompleted ? (formCompletionDate || new Date().toISOString().split('T')[0]) : ''
    };

    onAddProject(newProj);
    setIsAddOpen(false);
    showNotification(isRtl ? 'تم إضافة المشروع الجديد بنجاح مضافاً لقاعدة البيانات' : 'New project added successfully into registry Database');
  };

  const handleOpenEdit = (p: Project) => {
    if (isReadOnly) return;
    setCurrentProject(p);
    setFormNumber(p.projectNumber);
    setFormNameAr(p.nameAr);
    setFormNameEn(p.nameEn);
    setFormClientAr(p.clientAr);
    setFormClientEn(p.clientEn);
    setFormLocationAr(p.locationAr);
    setFormLocationEn(p.locationEn);
    setFormStartDate(p.startDate);
    setFormEndDate(p.endDate);
    setFormPM(p.projectManager);
    setFormStatus(p.status);
    setFormBudget(p.budget || 500000);
    setFormMorningMeetingPlan(p.morningMeetingPlan || '');
    setFormIsCompleted(p.isCompleted || false);
    setFormCompletionDate(p.completionDate || p.endDate || '');
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !currentProject) return;

    onUpdateProject(currentProject.id, {
      projectNumber: formNumber,
      nameAr: formNameAr,
      nameEn: formNameEn,
      clientAr: formClientAr,
      clientEn: formClientEn,
      locationAr: formLocationAr,
      locationEn: formLocationEn,
      startDate: formStartDate,
      endDate: formEndDate,
      projectManager: formPM,
      status: formStatus,
      budget: Number(formBudget),
      morningMeetingPlan: formMorningMeetingPlan,
      isCompleted: formIsCompleted,
      completionDate: formIsCompleted ? (formCompletionDate || new Date().toISOString().split('T')[0]) : ''
    });

    setIsEditOpen(false);
    setCurrentProject(null);
    showNotification(isRtl ? 'تم تحديث بيانات المشروع والجدولة الذكية بنجاح' : 'Project information and smart schedules updated successfully');
  };

  const handleCopyClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showNotification(isRtl ? 'تم نسخ الرمز التعريفي للمشروع' : 'Project reference copied to clipboard');
  };

  const handleRowDuplicate = (id: string) => {
    if (isReadOnly) return;
    onDuplicateProject(id);
    showNotification(isRtl ? 'تم محاكاة وتكرار المشروع الفرعي المعين' : 'Project structure duplicated successfully');
  };

  const handleRowDelete = (id: string) => {
    if (isReadOnly) return;
    openConfirm(
      t.confirmDelete,
      isRtl ? 'سيتم حذف جميع بنود العمل والأنشطة المرتبطة بهذا المشروع نهائياً.' : 'This will permanently erase all work items and activities tied to this project.',
      () => {
        onDeleteProject(id);
        setSelectedIds(selectedIds.filter(selected => selected !== id));
        showNotification(isRtl ? 'تم حذف المشروع نهائياً من الخوادم' : 'Project permanently ejected from active database');
      }
    );
  };

  // Bulk Commands
  const handleBulkDelete = () => {
    if (isReadOnly) return;
    if (selectedIds.length === 0) return;

    // Check if any selected project is completed and not unlocked
    const lockedCompleted = projects.filter(
      p => selectedIds.includes(p.id) && p.isCompleted && !unlockedProjectIds.includes(p.id)
    );

    if (lockedCompleted.length > 0) {
      alert(
        isRtl 
          ? `بعض المشاريع المحددة (${lockedCompleted.map(p => p.projectNumber).join(', ')}) مغلقة ومؤمنة. يجب فك تأمينها أولاً لتتمكن من الحذف.`
          : `Some selected projects (${lockedCompleted.map(p => p.projectNumber).join(', ')}) are completed and locked. Please unlock them first to delete.`
      );
      return;
    }

    openConfirm(
      t.bulkActions,
      isRtl ? `هل أنت متأكد من حذف ${selectedIds.length} مشاريع ممسوحة دفعة واحدة؟` : `Are you sure you want to eject ${selectedIds.length} projects simultaneously?`,
      () => {
        onDeleteProjects(selectedIds);
        setSelectedIds([]);
        showNotification(isRtl ? 'تم حذف المشاريع المحددة بنجاح مجمع' : 'Bulk deletion of selected projects completed');
      }
    );
  };

  // Technical Exports
  const handleExportCSV = () => {
    const header = isRtl 
      ? 'رمز المشروع,الاسم بالعربية,العميل,الموقع,تاريخ البدء,تاريخ التسليم,الحالة,الميزانية\n'
      : 'Code,Project Name,Client,Location,Start,Deadline,Status,Budget (SAR)\n';
    
    const rows = sortedProjects.map(p => {
      const name = isRtl ? p.nameAr : p.nameEn;
      const client = isRtl ? p.clientAr : p.clientEn;
      const loc = isRtl ? p.locationAr : p.locationEn;
      return `"${p.projectNumber}","${name}","${client}","${loc}","${p.startDate}","${p.endDate}","${p.status}",${p.budget || 0}`;
    }).join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Enterprise_Projects_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(isRtl ? 'تم تصدير ورقة عمل إكسل بنجاح ملائم' : 'Exported standard spreadsheet format successfully');
  };

  const handleExportPrint = () => {
    const listElement = document.getElementById('project-list-printable-content');
    if (!listElement) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '100%';
    iframe.style.bottom = '100%';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    if (iframe.contentWindow) {
      const doc = iframe.contentWindow.document;
      doc.dir = isRtl ? 'rtl' : 'ltr';
      
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
        <head>
          <title>${isRtl ? 'تقرير المشاريع' : 'Projects Report'}</title>
          <link rel="stylesheet" href="${window.location.origin}/index.css">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 30px; background: white; }
            .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #040957; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-placeholder { font-size: 40px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: ${isRtl ? 'right' : 'left'}; }
            th { background-color: #f9fafb; font-weight: 800; text-transform: uppercase; color: #4b5563; }
            .actions-cell, .selection-cell, .actions-btns { display: none !important; }
            @page { margin: 1cm; }
          </style>
        </head>
        <body>
          <div class="print-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="logo-placeholder">
                ${settings.companyLogoUrl && (settings.companyLogoUrl.startsWith('data:') || settings.companyLogoUrl.startsWith('http')) ? 
                  `<img src="${settings.companyLogoUrl}" style="height: 40px; width: auto; object-fit: contain;" referrerPolicy="no-referrer" />` : 
                  settings.companyLogoUrl || '🏢'
                }
              </div>
              <div>
                <h1 style="font-size: 16px; margin: 0; color: #040957;">${isRtl ? settings.companyNameAr : settings.companyNameEn}</h1>
                <p style="font-size: 10px; margin: 0; color: #6b7280;">Official Project Catalog Registry</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h2 style="font-size: 14px; margin: 0; color: #040957;">${isRtl ? 'تقرير قائمة المشاريع' : 'Project List Report'}</h2>
              <p style="font-size: 10px; margin: 0; color: #6b7280;">Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div id="print-content">
            ${listElement.innerHTML}
          </div>
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        // Optional: remove after a while
      }, 500);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
      
      <div id="project-list-printable-content" className="space-y-4">
        {/* Notifications Toast is NOT part of printable content */}
      {notification && (
        <div className={`fixed bottom-5 ${isRtl ? 'left-5' : 'right-5'} z-50 bg-white text-slate-800 py-3 px-6 rounded-xl shadow-xl flex items-center gap-3 animate-bounce border border-slate-200`}>
          <div className="w-2.5 h-2.5 rounded-full bg-[#0080FF] inline-block animate-ping"></div>
          <span className="text-xs font-bold font-sans text-slate-700">{notification}</span>
        </div>
      )}

      {/* Title & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#040957] font-sans flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#0080FF] rounded-full"></span>
            {t.projects}
          </h2>
          <p className="text-xs text-gray-400">
            {isRtl ? 'إنشاء، تعديل، أرشفة وتخطيط المشاريع الاستراتيجية الكبرى للمؤسسة' : 'Create, edit, duplicate & archive master construction projects'}
          </p>
        </div>

        {/* Read Only Warn / Add project button */}
        {isReadOnly ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold py-1.5 px-3 rounded-lg max-w-xs leading-tight">
            🛡️ {t.viewer_read_only}
          </div>
        ) : (
          <button 
            onClick={handleOpenAdd}
            className="bg-[#0080FF] text-white hover:bg-[#0080FF]/90 font-sans py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createProject}</span>
          </button>
        )}
      </div>

      {/* Advanced Filters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#F1F1F1]/50 p-4 rounded-xl border border-gray-100 items-center">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 border border-gray-200 bg-white text-gray-800 rounded-xl text-xs focus:ring-2 focus:ring-[#0080FF] outline-none font-medium`}
          />
        </div>

        {/* Status Dropdown */}
        <div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full bg-white border border-gray-200 py-2 px-3 text-xs rounded-xl focus:ring-2 focus:ring-[#0080FF] outline-none font-semibold text-gray-600 appearance-none"
          >
            <option value="all">{isRtl ? 'جميع الحالات التشغيلية' : 'All Allocations'}</option>
            <option value="Ahead">{t.ahead}</option>
            <option value="On Track">{t.onTrack}</option>
            <option value="Delayed">{t.delayed}</option>
          </select>
        </div>

        {/* Action triggers */}
        <div className="flex gap-2 justify-end">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 mr-2">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#0080FF] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title={isRtl ? 'عرض الجدول' : 'Table View'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('gantt')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'gantt' ? 'bg-[#0080FF] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              title={isRtl ? 'مخطط غانت' : 'Gantt Chart'}
            >
              <GanttChartSquare className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={handleExportCSV}
            title={t.exportExcel}
            className="bg-white border border-gray-200 p-2 text-gray-600 rounded-xl hover:text-emerald-600 hover:border-emerald-200 transition"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={handleExportPrint}
            title={t.print}
            className="bg-white border border-gray-200 p-2 text-gray-600 rounded-xl hover:text-[#0080FF] hover:border-blue-200 transition"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex items-center justify-between text-xs font-semibold text-[#040957] animate-slideDown">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4.5 h-4.5 text-[#0080FF]" />
            <span>
              {selectedIds.length} {t.selectedItems}
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleBulkDelete}
              disabled={isReadOnly}
              className={`bg-red-50 text-red-700 hover:bg-red-100 py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 transition ${isReadOnly ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isRtl ? 'حذف مجمع' : 'Bulk Delete'}</span>
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="bg-white border border-gray-200 text-gray-500 py-1.5 px-3 rounded-lg text-xs hover:bg-gray-100 transition"
            >
              {isRtl ? 'إلغاء التحديد' : 'Deselect'}
            </button>
          </div>
        </div>
      )}

      {/* Projects Advanced Table Layout / Gantt View */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 w-10 text-center">
                  <button onClick={handleToggleSelectAll} className="hover:opacity-80 transition">
                    {selectedIds.length === sortedProjects.length && sortedProjects.length > 0 ? (
                      <CheckSquare className="w-4.5 h-4.5 text-[#0080FF]" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-gray-300" />
                    )}
                  </button>
                </th>
                
                <th className="p-4 cursor-pointer hover:text-[#0080FF]" onClick={() => handleSort('projectNumber')}>
                  <div className="flex items-center gap-1">
                    <span>{isRtl ? 'الرمز الفريد' : 'Project Number'}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th className="p-4 cursor-pointer hover:text-[#0080FF]" onClick={() => handleSort('nameAr')}>
                  <div className="flex items-center gap-1">
                    <span>{t.projectName}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th className="p-4 cursor-pointer hover:text-[#0080FF]" onClick={() => handleSort('clientAr')}>
                  <div className="flex items-center gap-1">
                    <span>{t.client}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th className="p-4 cursor-pointer hover:text-[#0080FF]" onClick={() => handleSort('startDate')}>
                  <div className="flex items-center gap-1">
                    <span>{isRtl ? 'مدة العقد' : 'Term Duration'}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th className="p-4 cursor-pointer text-right hover:text-[#0080FF]" onClick={() => handleSort('budget')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{t.budget}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>

                <th className="p-4 text-center">{isRtl ? 'نسبة الإنجاز الفعلية' : 'Actual Completion %'}</th>
                <th className="p-4 text-center">{t.status}</th>
                <th className="p-4 text-right w-36">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {sortedProjects.map(p => {
                const isSelected = selectedIds.includes(p.id);
                // Dynamic Status Calculation based on all current inputs
                const dynamicStatus = getProjectStatusDetails(p, workItems, activities, progressUpdates, attendanceRecords, materials);
                
                let statusLabel = t.onTrack;
                let statusClass = 'bg-blue-50 text-blue-700 border-blue-100';
                
                if (dynamicStatus.status === 'Ahead') {
                  statusLabel = t.ahead;
                  statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                } else if (dynamicStatus.status === 'Delayed') {
                  statusLabel = t.delayed;
                  statusClass = 'bg-red-50 text-red-700 border-red-100';
                }

                return (
                  <tr 
                    key={p.id} 
                    className={`hover:bg-blue-50/20 transition-colors ${isSelected ? 'bg-blue-50/10' : ''}`}
                  >
                    {/* Row Select Check */}
                    <td className="p-4 text-center">
                      <button onClick={() => handleToggleSelectRow(p.id)} className="hover:opacity-85">
                        {isSelected ? (
                          <CheckSquare className="w-4.5 h-4.5 text-[#0080FF]" />
                        ) : (
                          <Square className="w-4.5 h-4.5 text-gray-200" />
                        )}
                      </button>
                    </td>

                    {/* Number */}
                    <td className="p-4 font-mono font-bold text-gray-800">
                      <div className="flex items-center gap-1.5">
                        <span>{p.projectNumber}</span>
                        <button 
                          onClick={() => handleCopyClipboard(p.projectNumber)}
                          title={isRtl ? 'نسخ الرمز' : 'Copy referral'}
                          className="text-gray-300 hover:text-[#0080FF] transition"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {p.isCompleted && (
                          <button
                            onClick={() => {
                              if (unlockedProjectIds.includes(p.id)) {
                                setUnlockedProjectIds(prev => prev.filter(id => id !== p.id));
                                showNotification(isRtl ? 'تم إعادة إغلاق وتأمين المشروع' : 'Project re-locked successfully');
                              } else {
                                checkLock(p, () => {
                                  showNotification(isRtl ? 'تم فتح تأمين المشروع للتعديل المؤقت' : 'Project unlocked temporarily for edits');
                                });
                              }
                            }}
                            title={unlockedProjectIds.includes(p.id) ? (isRtl ? 'مفتوح للتعديل المؤقت (انقر للإغلاق)' : 'Unlocked temporarily (click to lock)') : (isRtl ? 'مؤمن ومغلق (انقر لفك القفل)' : 'Locked & Completed (click to unlock)')}
                            className="transition shrink-0 ml-1"
                          >
                            {unlockedProjectIds.includes(p.id) ? (
                              <Unlock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-red-500 font-bold" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="p-4">
                      <div className="font-bold text-[#040957] font-sans">
                        {isRtl ? p.nameAr : p.nameEn}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5 max-w-xs truncate">
                        📍 {isRtl ? p.locationAr : p.locationEn}
                      </div>
                    </td>

                    {/* Client */}
                    <td className="p-4 font-medium text-gray-600">
                      {isRtl ? p.clientAr : p.clientEn}
                    </td>

                    {/* Dates */}
                    <td className="p-4 space-y-0.5">
                      <div className="text-[11px] text-gray-500 font-mono">
                        {isRtl ? 'البدء' : 'St'}: {p.startDate}
                      </div>
                      <div className="text-[11px] text-[#040957] font-extrabold font-mono">
                        {isRtl ? 'التسليم' : 'Dl'}: {p.endDate}
                      </div>
                    </td>

                    {/* Budget */}
                    <td className="p-4 text-right font-bold text-gray-700 font-mono">
                      {p.budget ? p.budget.toLocaleString() : '---'}
                    </td>

                    {/* Actual Progress Column */}
                    <td className="p-4 text-center">
                      {(() => {
                        const progress = getProjectProgress(p, workItems, activities, progressUpdates);
                        return (
                          <div className="flex flex-col items-center gap-1 min-w-[80px]">
                            <span className="font-bold font-mono text-emerald-600 text-[11px]">{progress}%</span>
                            <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        {/* Completed Report / Trigger Button */}
                        <button 
                          onClick={() => {
                            if (p.isCompleted) {
                              setReportProject(p);
                              setIsReportOpen(true);
                            } else {
                              openConfirm(
                                isRtl ? 'إكمال وإغلاق المشروع' : 'Complete & Lock Project',
                                isRtl 
                                  ? 'هل أنت متأكد من رغبتك في إكمال وإغلاق هذا المشروع؟ سيتم تأمينه ومنع أي تعديل عليه لاحقاً إلا برقم هوية وكلمة مرور المدير.'
                                  : 'Are you sure you want to complete and lock this project? It will be archived and locked from further edits unless overridden by the manager.',
                                async () => {
                                  const todayStr = new Date().toISOString().split('T')[0];
                                  onUpdateProject(p.id, {
                                    isCompleted: true,
                                    completionDate: todayStr
                                  });
                                  showNotification(isRtl ? 'تم إكمال وتأمين المشروع بنجاح!' : 'Project marked as completed and locked successfully!');
                                  setReportProject({ ...p, isCompleted: true, completionDate: todayStr });
                                  setIsReportOpen(true);
                                }
                              );
                            }
                          }}
                          title={p.isCompleted ? (isRtl ? 'تقرير إغلاق المشروع (PDF)' : 'Project Completion Report (PDF)') : (isRtl ? 'تعليم كـ مكتمل وإغلاق' : 'Mark as Completed')}
                          className={`p-1.5 rounded-lg transition ${
                            p.isCompleted 
                              ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' 
                              : 'text-gray-300 hover:text-emerald-500 hover:bg-emerald-50/50'
                          }`}
                        >
                          {p.isCompleted ? <Award className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>

                        <button 
                          onClick={() => onNavigate && onNavigate('reports')}
                          title={isRtl ? 'عرض التقارير' : 'View Reports'}
                          className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => checkLock(p, () => handleRowDuplicate(p.id))}
                          disabled={isReadOnly}
                          title={t.duplicate}
                          className={`text-gray-400 hover:text-teal-600 p-1.5 hover:bg-teal-50 rounded-lg transition ${isReadOnly ? 'opacity-35 cursor-not-allowed' : ''}`}
                        >
                          <Files className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => checkLock(p, () => handleOpenEdit(p))}
                          disabled={isReadOnly}
                          title={t.edit}
                          className={`text-gray-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition ${isReadOnly ? 'opacity-35 cursor-not-allowed' : ''}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => checkLock(p, () => handleRowDelete(p.id))}
                          disabled={isReadOnly}
                          title={t.delete}
                          className={`text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition ${isReadOnly ? 'opacity-35 cursor-not-allowed' : ''}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedProjects.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-400 font-medium">
                    {isRtl ? 'لا توجد مشاريع مسجلة حالياً تطابق الاستعلام.' : 'No active projects catalogued matching this state query.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <GanttChart 
          lang={lang}
          projects={sortedProjects}
          workItems={workItems}
          activities={activities}
          progressUpdates={progressUpdates}
          materials={materials}
          workers={workers}
          equipment={equipment}
          attendanceRecords={attendanceRecords}
        />
      )}

      </div>

      {notification && (
        <div className={`fixed bottom-5 ${isRtl ? 'left-5' : 'right-5'} z-50 bg-[#040957] text-white py-3 px-6 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce border border-blue-400`}>
          <div className="w-2.5 h-2.5 rounded-full bg-[#0080FF] inline-block animate-ping"></div>
          <span className="text-xs font-bold font-sans">{notification}</span>
        </div>
      )}

      {/* Integrated Add/Edit Modals */}
      {(isAddOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 animate-scaleIn">
            <div className="bg-gradient-to-r from-[#040957] to-[#0080FF] text-white p-5 rounded-t-2xl flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base font-sans">
                  {isAddOpen ? t.createProject : t.editProject}
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  {isRtl ? 'يرجى مراجعة الخوازيق وحساب الجداول الفنية بدقة' : 'Please verify all mechanical and budget requirements carefully'}
                </p>
              </div>
              <button 
                onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                className="text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={isAddOpen ? handleSaveNew : handleSaveEdit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Project Number */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{t.projectNumber} *</label>
                  <input 
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs bg-gray-50 focus:ring-2 focus:ring-[#0080FF] outline-none"
                  />
                </div>

                {/* Status Selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{t.status} *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none font-semibold text-gray-700"
                  >
                    <option value="On Track">{t.onTrack}</option>
                    <option value="Ahead">{t.ahead}</option>
                    <option value="Delayed">{t.delayed}</option>
                  </select>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{t.projectNameAr} *</label>
                  <input 
                    type="text"
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    required
                    placeholder="مثال: قطار الحرمين تفرعة ٢"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{t.projectNameEn} *</label>
                  <input 
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    required
                    placeholder="E.g. Haramain Track Segment"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none"
                  />
                </div>
              </div>

              {/* Clients */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{t.clientAr} *</label>
                  <input 
                    type="text"
                    value={formClientAr}
                    onChange={(e) => setFormClientAr(e.target.value)}
                    required
                    placeholder="الهيئة العامة للمياه"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{t.clientEn} *</label>
                  <input 
                    type="text"
                    value={formClientEn}
                    onChange={(e) => setFormClientEn(e.target.value)}
                    required
                    placeholder="National Water Company"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none"
                  />
                </div>
              </div>

              {/* Geographic Site Locations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{t.locationAr} *</label>
                  <input 
                    type="text"
                    value={formLocationAr}
                    onChange={(e) => setFormLocationAr(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{t.locationEn} *</label>
                  <input 
                    type="text"
                    value={formLocationEn}
                    onChange={(e) => setFormLocationEn(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none"
                  />
                </div>
              </div>

              {/* Term Timings / PM */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{t.startDate}</label>
                  <input 
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{t.endDate}</label>
                  <input 
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">{isRtl ? 'الموازنة الاستباقية' : 'Capital Allocation'}</label>
                  <input 
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none"
                  />
                </div>
              </div>

              {/* Completion Status (Conditional Fields) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                <div className="flex items-center gap-2 pt-3">
                  <input 
                    type="checkbox"
                    id="formIsCompleted"
                    checked={formIsCompleted}
                    onChange={(e) => setFormIsCompleted(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="formIsCompleted" className="text-xs font-bold text-emerald-800 cursor-pointer select-none">
                    {isRtl ? 'تم إكمال وتأمين المشروع' : 'Mark Project as Completed & Locked'}
                  </label>
                </div>

                {formIsCompleted && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-emerald-800">{isRtl ? 'تاريخ الإغلاق الفعلي' : 'Actual Completion Date'} *</label>
                    <input 
                      type="date"
                      value={formCompletionDate}
                      onChange={(e) => setFormCompletionDate(e.target.value)}
                      required
                      className="w-full border border-emerald-200 bg-white rounded-xl p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-900"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#040957]">{t.projectManager} *</label>
                <input 
                  type="text"
                  value={formPM}
                  onChange={(e) => setFormPM(e.target.value)}
                  placeholder="E.g. Eng. Fahad Abdullah"
                  required
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none"
                />
              </div>

              {/* Morning Meeting Plan */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#040957]">
                  {isRtl ? 'خطة الاجتماع الصباحي والمهام المطلوبة' : 'Morning Meeting Plan & Required Tasks'}
                </label>
                <textarea
                  value={formMorningMeetingPlan}
                  onChange={(e) => setFormMorningMeetingPlan(e.target.value)}
                  placeholder={isRtl ? 'أدخل خطة الاجتماع الصباحي والمهام اليومية المطلوبة ليتمكن الميدانيون من مراجعتها...' : 'Enter the morning meeting outline and daily critical tasks for field supervisors...'}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] outline-none resize-none font-sans"
                />
              </div>

              {/* Foot Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-sans font-bold py-2.5 px-4 rounded-xl text-xs transition"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="bg-[#040957] text-white hover:bg-[#0080FF] font-sans font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md"
                >
                  {t.save}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MANAGER UNLOCK MODAL */}
      {isUnlockOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-[#040957] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-extrabold font-sans text-white">
                  {isRtl ? 'حماية المدير - فك قفل المشروع' : 'Manager Security - Unlock Project'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => { setIsUnlockOpen(false); setUnlockAction(null); }}
                className="text-white/70 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleVerifyUnlock} className="p-6 space-y-4">
              <div className="text-xs text-gray-500 leading-relaxed font-sans">
                {isRtl 
                  ? 'هذا المشروع مكتمل ومغلق لتأمين البيانات. لا يمكن إجراء أي تعديل أو حذف إلا بإدخال الهوية الوطنية وكلمة المرور لمدير النظام.'
                  : 'This project is archived and locked. To authorize modifications, please authenticate using a valid administrator ID number and password.'}
              </div>

              {unlockError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2 font-sans">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{unlockError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">
                    {isRtl ? 'رقم هوية المدير / المستخدم' : 'Manager National ID / Username'}
                  </label>
                  <input 
                    type="text"
                    value={unlockIdNumber}
                    onChange={(e) => setUnlockIdNumber(e.target.value)}
                    required
                    placeholder="e.g. 1092837465"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-red-500 outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#040957]">
                    {isRtl ? 'كلمة المرور الخاصة بالمدير' : 'Manager Security Password'}
                  </label>
                  <input 
                    type="password"
                    value={unlockPassword}
                    onChange={(e) => setUnlockPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-red-500 outline-none font-sans"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsUnlockOpen(false); setUnlockAction(null); }}
                  className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-sans font-bold py-2.5 rounded-xl text-xs transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-red-900 text-white hover:bg-red-800 font-sans font-bold py-2.5 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'فك تأمين التعديل' : 'Unlock Editing'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRAND PROJECT COMPLETION DETAILED REPORT MODAL */}
      {isReportOpen && reportProject && (() => {
        // Data Calculations
        const start = new Date(reportProject.startDate);
        const end = new Date(reportProject.endDate);
        const allottedDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
        
        const completion = new Date(reportProject.completionDate || reportProject.endDate || new Date().toISOString().split('T')[0]);
        const actualDays = Math.ceil((completion.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;

        const diffDays = actualDays - allottedDays;
        const diffHours = diffDays * 8;

        const filteredWIs = workItems.filter(wi => wi.projectId === reportProject.id);
        const wiIds = filteredWIs.map(wi => wi.id);
        const filteredActs = activities.filter(act => wiIds.includes(act.workItemId));

        const workerIds = new Set<string>();
        filteredActs.forEach(act => {
          if (act.workerIds) act.workerIds.forEach(id => workerIds.add(id));
        });
        attendanceRecords
          .filter(rec => rec.projectId === reportProject.id && rec.isPresent)
          .forEach(rec => workerIds.add(rec.workerId));
        
        const involvedWorkersList = (workers || []).filter(w => workerIds.has(w.id));
        const pUpdates = progressUpdates.filter(pu => {
          const act = activities.find(a => a.id === pu.activityId);
          return act && wiIds.includes(act.workItemId);
        });

        const overallProgress = getProjectProgress(reportProject, workItems, activities, progressUpdates);
        
        let timingStatusText = '';
        let timingStatusClass = '';
        let hoursStatusText = '';
        
        if (diffDays < 0) {
          timingStatusText = isRtl 
            ? `متقدم بـ ${Math.abs(diffDays)} أيام عن موعد التسليم` 
            : `Delivered ${Math.abs(diffDays)} Days Ahead of contractual timeline`;
          timingStatusClass = 'bg-emerald-50 text-emerald-800 border-emerald-100';
          hoursStatusText = isRtl 
            ? `تم توفير ${Math.abs(diffHours)} ساعة عمل من القوى العاملة المخططة` 
            : `Saved ${Math.abs(diffHours)} site workforce man-hours`;
        } else if (diffDays > 0) {
          timingStatusText = isRtl 
            ? `متأخر بـ ${diffDays} أيام عن موعد التسليم` 
            : `Delayed ${diffDays} Days beyond contracted deadline`;
          timingStatusClass = 'bg-red-50 text-red-800 border-red-100';
          hoursStatusText = isRtl 
            ? `استهلاك ${diffHours} ساعة عمل إضافية غير مخطط لها` 
            : `Overrun of ${diffHours} site workforce man-hours`;
        } else {
          timingStatusText = isRtl 
            ? 'تم التسليم منضبطاً باليوم والساعة في الموعد تماماً' 
            : 'Delivered precisely on schedule matching deadline';
          timingStatusClass = 'bg-blue-50 text-blue-800 border-blue-100';
          hoursStatusText = isRtl 
            ? 'متطابق تماماً مع تقديرات الجدولة والجهد المخطط' 
            : 'Completed matching structural budget estimates perfectly';
        }

        const handleExportPDF = (mode: 'download' | 'print' = 'download') => {
          const diffText = diffDays < 0 
            ? (isRtl ? `مبكر بـ ${Math.abs(diffDays)} أيام` : `${Math.abs(diffDays)} Days Early`)
            : diffDays > 0 
              ? (isRtl ? `متأخر بـ ${diffDays} أيام` : `${diffDays} Days Delayed`)
              : (isRtl ? 'في الموعد المحدد' : 'On Schedule');

          const hoursText = diffHours < 0 
            ? (isRtl ? `توفير ${Math.abs(diffHours)} ساعة` : `Saved ${Math.abs(diffHours)} Hours`)
            : diffHours > 0 
              ? (isRtl ? `زيادة ${diffHours} ساعة` : `Extra ${diffHours} Hours`)
              : (isRtl ? 'متطابق تماماً' : 'Exactly Match');

          const fieldSupervisor = progressUpdates.find(pu => pu.projectId === reportProject.id)?.reporterName 
            || workItems.find(wi => wi.projectId === reportProject.id)?.responsiblePerson 
            || (isRtl ? 'يوسف الحربي' : 'Yousef Al-Harbi');

          const watermarkText = ((settings.companyNameEn || 'AL-SUDAIRI').split(' ')[0] || 'AL-SUDAIRI').toUpperCase() + ' PMO';

          const printHtml = `
            <!DOCTYPE html>
            <html dir="${isRtl ? 'rtl' : 'ltr'}">
            <head>
              <meta charset="utf-8">
              <title>Completion Certificate - ${reportProject.projectNumber}</title>
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }

                * {
                  box-sizing: border-box;
                }

                body, .pdf-render-container {
                  font-family: ${isRtl ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif"};
                  color: #0f172a;
                  background: #ffffff;
                  margin: 0;
                  padding: 0;
                  font-size: 11px;
                  line-height: 1.5;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }

                /* Dual Border Certificate Frame */
                .certificate-container {
                  border: 5px double #040957;
                  padding: 24px;
                  position: relative;
                  background: #ffffff;
                  min-height: 275mm; /* Maximize A4 height page-1 */
                  overflow: hidden;
                }

                .certificate-container::before {
                  content: "";
                  position: absolute;
                  top: 4px;
                  left: 4px;
                  right: 4px;
                  bottom: 4px;
                  border: 1px solid #c5a880;
                  pointer-events: none;
                }

                /* Subtle Watermark Symbol */
                .certificate-watermark {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(-25deg);
                  font-size: 72px;
                  font-weight: 900;
                  color: rgba(197, 168, 128, 0.05);
                  z-index: 0;
                  pointer-events: none;
                  white-space: nowrap;
                  text-align: center;
                  letter-spacing: 4px;
                }

                .content-wrapper {
                  position: relative;
                  z-index: 10;
                }

                /* Corporate Header Styles */
                .header-section {
                  display: table;
                  width: 100%;
                  border-bottom: 2px solid #040957;
                  padding-bottom: 12px;
                  margin-bottom: 20px;
                }

                .header-logo-container {
                  display: table-cell;
                  vertical-align: middle;
                  width: 50%;
                }

                .header-meta-container {
                  display: table-cell;
                  vertical-align: middle;
                  width: 50%;
                  text-align: ${isRtl ? 'left' : 'right'};
                  font-family: 'Plus Jakarta Sans', sans-serif;
                }

                .logo-title-en {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 15px;
                  font-weight: 800;
                  color: #040957;
                  letter-spacing: 1px;
                  line-height: 1.1;
                }

                .logo-title-ar {
                  font-family: 'Cairo', sans-serif;
                  font-size: 12px;
                  font-weight: 700;
                  color: #c5a880;
                  margin-top: 4px;
                  letter-spacing: 0;
                }

                .doc-badge {
                  display: inline-block;
                  background-color: #040957;
                  color: #ffffff;
                  font-size: 8px;
                  font-weight: 700;
                  padding: 3px 8px;
                  border-radius: 4px;
                  margin-top: 5px;
                  letter-spacing: 0.5px;
                }

                /* Document Title styling */
                .certificate-title-block {
                  text-align: center;
                  margin: 20px auto;
                  max-width: 90%;
                }

                .certificate-title-en {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 18px;
                  font-weight: 800;
                  color: #040957;
                  letter-spacing: 0.5px;
                  text-transform: uppercase;
                  margin: 0;
                  line-height: 1.2;
                }

                .certificate-title-ar {
                  font-family: 'Cairo', sans-serif;
                  font-size: 16px;
                  font-weight: 800;
                  color: #c5a880;
                  margin-top: 4px;
                  margin-bottom: 12px;
                }

                .certificate-subtitle {
                  font-size: 10px;
                  color: #475569;
                  max-width: 80%;
                  margin: 0 auto;
                  line-height: 1.5;
                  text-align: center;
                }

                /* Section Header styling */
                .pmo-section-heading {
                  font-size: 11px;
                  font-weight: 800;
                  color: #040957;
                  text-transform: uppercase;
                  border-left: ${isRtl ? 'none' : '3px solid #c5a880'};
                  border-right: ${isRtl ? '3px solid #c5a880' : 'none'};
                  padding-left: ${isRtl ? '0' : '8px'};
                  padding-right: ${isRtl ? '8px' : '0'};
                  margin-top: 24px;
                  margin-bottom: 10px;
                  letter-spacing: 0.5px;
                }

                /* Data Grid Tables */
                .metadata-matrix {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 15px;
                }

                .metadata-matrix th {
                  background-color: #f8fafc;
                  border: 1px solid #e2e8f0;
                  color: #040957;
                  font-weight: 700;
                  text-align: ${isRtl ? 'right' : 'left'};
                  padding: 7px 10px;
                  font-size: 9.5px;
                  width: 18%;
                }

                .metadata-matrix td {
                  border: 1px solid #e2e8f0;
                  padding: 7px 10px;
                  text-align: ${isRtl ? 'right' : 'left'};
                  font-size: 10px;
                  color: #334155;
                  width: 32%;
                }

                /* Beautiful KPI Grid */
                .kpi-container-table {
                  width: 100%;
                  border-collapse: separate;
                  border-spacing: 8px 0;
                  margin: 15px -8px;
                }

                .kpi-cell {
                  width: 25%;
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-top: 3px solid #040957;
                  border-radius: 6px;
                  padding: 10px 12px;
                  text-align: center;
                }

                .kpi-cell-value {
                  font-size: 15px;
                  font-weight: 800;
                  color: #040957;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                }

                .kpi-cell-label {
                  font-size: 8.5px;
                  color: #64748b;
                  font-weight: 600;
                  margin-top: 4px;
                  line-height: 1.2;
                }

                /* Visual Progress Indicator */
                .progress-pnl {
                  background: #fdfdfd;
                  border: 1px solid #e2e8f0;
                  border-radius: 8px;
                  padding: 12px 16px;
                  margin-bottom: 18px;
                  display: table;
                  width: 100%;
                }

                .progress-lbl-col {
                  display: table-cell;
                  width: 40%;
                  vertical-align: middle;
                }

                .progress-bar-col {
                  display: table-cell;
                  width: 60%;
                  vertical-align: middle;
                  text-align: right;
                }

                .pnl-heading {
                  font-weight: 700;
                  color: #040957;
                  font-size: 10px;
                }

                .pnl-sub {
                  font-size: 8.5px;
                  color: #64748b;
                  margin-top: 2px;
                }

                .pb-track {
                  background-color: #e2e8f0;
                  border-radius: 6px;
                  height: 10px;
                  overflow: hidden;
                  display: inline-block;
                  width: 80%;
                  vertical-align: middle;
                }

                .pb-fill {
                  background-color: #10b981;
                  height: 100%;
                  border-radius: 6px;
                }

                .pb-text {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 11px;
                  font-weight: 800;
                  color: #10b981;
                  display: inline-block;
                  width: 18%;
                  text-align: right;
                  vertical-align: middle;
                }

                /* Registry Data Tables */
                .data-grid-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 20px;
                }

                .data-grid-table th {
                  background-color: #040957;
                  color: #ffffff;
                  font-weight: 700;
                  font-size: 9px;
                  padding: 6px 8px;
                  text-align: ${isRtl ? 'right' : 'left'};
                  border: 1px solid #1e293b;
                  text-transform: uppercase;
                }

                .data-grid-table td {
                  border: 1px solid #e2e8f0;
                  padding: 5px 8px;
                  font-size: 9px;
                  color: #334155;
                  text-align: ${isRtl ? 'right' : 'left'};
                }

                .data-grid-table tr:nth-child(even) {
                  background-color: #f8fafc;
                }

                .tr-group-header {
                  background-color: #f1f5f9 !important;
                  font-weight: 700;
                  color: #040957;
                }

                /* Sign-off Stamps section */
                .signature-matrix {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 30px;
                  page-break-inside: avoid;
                }

                .signature-matrix td {
                  width: 33.33%;
                  text-align: center;
                  vertical-align: top;
                  padding: 0 15px;
                }

                .sig-title {
                  font-size: 10px;
                  font-weight: 700;
                  color: #040957;
                  margin-bottom: 4px;
                }

                .sig-dept {
                  font-size: 8px;
                  color: #64748b;
                  margin-bottom: 8px;
                }

                .sig-dotted-line {
                  border-bottom: 1px dashed #cbd5e1;
                  margin: 15px auto 8px auto;
                  width: 80%;
                }

                .digital-seal-box {
                  border: 1px dashed #c5a880;
                  background: rgba(197, 168, 128, 0.02);
                  border-radius: 6px;
                  padding: 8px;
                  font-size: 8px;
                  color: #94a3b8;
                  min-height: 60px;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  max-width: 140px;
                  margin: 5px auto 0 auto;
                }

                .pmo-verified-stamp {
                  border: 2px solid #10b981;
                  color: #10b981;
                  border-radius: 4px;
                  padding: 2px 6px;
                  font-size: 8px;
                  font-weight: 800;
                  letter-spacing: 0.5px;
                  text-transform: uppercase;
                  transform: rotate(-3deg);
                  display: inline-block;
                  margin-top: 4px;
                }

                .page-breaker {
                  page-break-before: always;
                }

                @media print {
                  body {
                    padding: 0;
                  }
                  .certificate-container {
                    min-height: auto;
                  }
                }
              </style>
            </head>
            <body>
              <!-- PAGE 1: OFFICIAL COMPLETION CERTIFICATE -->
              <div class="certificate-container">
                <div class="certificate-watermark">${watermarkText}</div>
                
                <div class="content-wrapper">
                  <!-- Header Section -->
                  <table class="header-section">
                    <tr>
                      <td class="header-logo-container" style="vertical-align: middle;">
                        <div style="display: flex; align-items: center; gap: 10px; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
                          ${settings.companyLogoUrl && (settings.companyLogoUrl.startsWith('data:') || settings.companyLogoUrl.startsWith('http'))
                            ? `<img src="${settings.companyLogoUrl}" style="max-height: 40px; width: auto; object-fit: contain; vertical-align: middle;" referrerPolicy="no-referrer" />`
                            : `<span style="font-size: 28px; vertical-align: middle; line-height: 1;">${settings.companyLogoUrl || '🏢'}</span>`
                          }
                          <div style="text-align: ${isRtl ? 'right' : 'left'};">
                            <div class="logo-title-en" style="font-size: 11px; font-weight: 800; color: #040957; line-height: 1.2;">${(settings.companyNameEn || 'AL-SUDAIRI ENGINEERING GROUP').toUpperCase()}</div>
                            <div class="logo-title-ar" style="font-size: 10px; font-weight: bold; color: #040957; margin-top: 3px; line-height: 1.2;">${settings.companyNameAr || 'مجموعة السديري للمقاولات والاستشارات الهندسية'}</div>
                          </div>
                        </div>
                      </td>
                      <td class="header-meta-container">
                        <div style="font-size: 9px; color: #475569; font-weight: 700;">
                          ${isRtl ? 'وثيقة مرجعية:' : 'DOC ID:'} <span style="font-family: monospace;">CERT-${reportProject.projectNumber}</span>
                        </div>
                        <div style="font-size: 8px; color: #64748b; margin-top: 2px;">
                          ${isRtl ? 'تاريخ الاعتماد:' : 'Authorized Date:'} ${reportProject.completionDate || new Date().toISOString().split('T')[0]}
                        </div>
                        <div class="doc-badge">${isRtl ? 'مؤمن ومشفر رقمياً' : 'DIGITALLY SECURED & ARCHIVED'}</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Title Block -->
                  <div class="certificate-title-block">
                    <h1 class="certificate-title-en">Certificate of Physical Completion</h1>
                    <h2 class="certificate-title-ar">شهادة إنجاز وتسليم الأعمال الميدانية الكلية</h2>
                    <p class="certificate-subtitle">
                      ${isRtl 
                        ? `تشهد إدارة المشاريع في ${settings.companyNameAr || 'مجموعة السديري للتشييد والبنى التحتية الكبرى'} بأن البنود والأعمال الإنشائية والفنية المحددة أدناه قد تم الانتهاء منها واختبار جودتها ومطابقتها للمخططات الفنية المعتمدة وتسليمها للجهة المستفيدة.`
                        : `The Project Management Office of ${settings.companyNameEn || 'Al-Sudairi Construction & Civil Infrastructure Group'} hereby certifies that the civil, architectural, and electro-mechanical scope of works for the project specified below has been completed, inspected, and handed over in full compliance with construction blueprints.`}
                    </p>
                  </div>

                  <!-- Project Metadata Grid -->
                  <div class="pmo-section-heading">
                    ${isRtl ? 'بيانات هوية المشروع الرسمية' : 'Official Project Identity Matrix'}
                  </div>
                  
                  <table class="metadata-matrix">
                    <tr>
                      <th>${isRtl ? 'رقم وثيقة المشروع' : 'Project Ref Number'}</th>
                      <td style="font-family: monospace; font-weight: bold; color: #040957;">${reportProject.projectNumber}</td>
                      <th>${isRtl ? 'المالك / الجهة المستفيدة' : 'Project Client / Owner'}</th>
                      <td style="font-weight: 600;">${isRtl ? reportProject.clientAr : reportProject.clientEn}</td>
                    </tr>
                    <tr>
                      <th>${isRtl ? 'اسم المشروع المعتمد' : 'Official Project Title'}</th>
                      <td style="font-weight: bold;">${isRtl ? reportProject.nameAr : reportProject.nameEn}</td>
                      <th>${isRtl ? 'الموقع والنطاق الجغرافي' : 'Site / Location'}</th>
                      <td>📍 ${isRtl ? reportProject.locationAr : reportProject.locationEn}</td>
                    </tr>
                    <tr>
                      <th>${isRtl ? 'تاريخ البدء الرسمي' : 'Official Start Date'}</th>
                      <td style="font-family: monospace;">${reportProject.startDate}</td>
                      <th>${isRtl ? 'تاريخ التسليم التعاقدي' : 'Contract Deadline'}</th>
                      <td style="font-family: monospace; color: #c5a880; font-weight: bold;">${reportProject.endDate}</td>
                    </tr>
                    <tr>
                      <th>${isRtl ? 'التسليم والإغلاق الفعلي' : 'Actual Handover Date'}</th>
                      <td style="font-family: monospace; color: #10b981; font-weight: bold;">${reportProject.completionDate || '---'}</td>
                      <th>${isRtl ? 'المدير المسؤول المعتمد' : 'Assigned Project Manager'}</th>
                      <td>💼 ${reportProject.projectManager}</td>
                    </tr>
                  </table>

                  <!-- KPI metrics table -->
                  <div class="pmo-section-heading">
                    ${isRtl ? 'مؤشرات الأداء الزمني والإنتاجية' : 'Timing & Productivity Performance Metrics'}
                  </div>

                  <table class="kpi-container-table">
                    <tr>
                      <td class="kpi-cell">
                        <div class="kpi-cell-value">${allottedDays}</div>
                        <div class="kpi-cell-label">${isRtl ? 'الأيام المخططة بالعقد' : 'Contract Days Allocated'}</div>
                      </td>
                      <td class="kpi-cell">
                        <div class="kpi-cell-value" style="color: #0080FF;">${actualDays}</div>
                        <div class="kpi-cell-label">${isRtl ? 'الأيام الفعلية للتنفيذ' : 'Actual Completion Days'}</div>
                      </td>
                      <td class="kpi-cell" style="border-top-color: ${diffDays <= 0 ? '#10b981' : '#ef4444'};">
                        <div class="kpi-cell-value" style="color: ${diffDays <= 0 ? '#10b981' : '#ef4444'};">
                          ${diffDays === 0 ? '0' : (diffDays < 0 ? `-${Math.abs(diffDays)}` : `+${diffDays}`)}
                        </div>
                        <div class="kpi-cell-label">
                          ${isRtl ? 'الفارق الزمني الفعلي' : 'Schedule Variance (Days)'}
                          <br/><span style="font-size: 7.5px; font-weight: bold; color: ${diffDays <= 0 ? '#10b981' : '#ef4444'};">${diffText}</span>
                        </div>
                      </td>
                      <td class="kpi-cell" style="border-top-color: ${diffDays <= 0 ? '#10b981' : '#ef4444'};">
                        <div class="kpi-cell-value" style="color: ${diffDays <= 0 ? '#10b981' : '#ef4444'};">
                          ${diffHours === 0 ? '0' : (diffHours < 0 ? `-${Math.abs(diffHours)}` : `+${diffHours}`)}
                        </div>
                        <div class="kpi-cell-label">
                          ${isRtl ? 'الوفد/الزيادة بساعات العمل' : 'Man-Hours Performance'}
                          <br/><span style="font-size: 7.5px; font-weight: bold; color: ${diffDays <= 0 ? '#10b981' : '#ef4444'};">${hoursText}</span>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Progress Bar and Closeout declaration -->
                  <div class="progress-pnl">
                    <div class="progress-lbl-col">
                      <div class="pnl-heading">
                        ${isRtl ? 'مؤشر ومعدل الإنجاز التراكمي الفعلي:' : 'Cumulative Physical Completion Indicator:'}
                      </div>
                      <div class="pnl-sub">
                        ${isRtl ? 'تم الانتهاء والتحقق من كافة مراحل البنود التنفيذية' : 'All structural checkpoints and milestones successfully validated'}
                      </div>
                    </div>
                    <div class="progress-bar-col">
                      <div class="pb-track">
                        <div class="pb-fill" style="width: ${overallProgress}%;"></div>
                      </div>
                      <div class="pb-text">${overallProgress}%</div>
                    </div>
                  </div>

                  <!-- Sign-off Block on Page 1 -->
                  <table class="signature-matrix">
                    <tr>
                      <td>
                        <div class="sig-title">${isRtl ? 'مشرف الموقع الميداني' : 'Field Site Supervisor'}</div>
                        <div class="sig-dept" style="font-weight: bold; color: #334155; font-size: 8.5px; margin-bottom: 4px;">
                          ${fieldSupervisor}
                        </div>
                        <div class="sig-signature" style="font-family: 'Courier New', Courier, monospace; font-style: italic; font-weight: bold; color: #1e3a8a; font-size: 11px; margin: 5px 0; text-align: center;">
                          ${fieldSupervisor.replace('Eng. ', '').replace('Lead Sup. ', '')}
                        </div>
                        <div class="sig-dotted-line" style="margin-top: 2px;"></div>
                        <div class="digital-seal-box" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                          <div style="border: 2px solid rgba(16, 185, 129, 0.4); color: #10b981; font-family: 'Courier New', Courier, monospace; font-size: 7px; font-weight: 900; padding: 4px; width: 65px; height: 65px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; transform: rotate(-5deg); margin: 0 auto 4px auto; background: rgba(16, 185, 129, 0.02); text-align: center; line-height: 1.1;">
                            <span style="font-size: 6px; font-weight: bold; text-transform: uppercase;">${(settings.companyNameEn || 'AL-SUDAIRI').split(' ')[0]}</span>
                            <span style="font-size: 7px; font-weight: 900; margin: 1px 0;">APPROVED</span>
                            <span style="font-size: 6px;">${reportProject.completionDate || new Date().toISOString().split('T')[0]}</span>
                          </div>
                          <span style="color: #10b981; font-weight: bold; font-size: 7.5px;">${isRtl ? 'التوقيع الرقمي معتمد' : 'Digitally Signed'}</span>
                          <span style="font-size: 6px; color: #94a3b8; margin-top: 2px; font-family: monospace;">ID: SU-CIV-${reportProject.projectNumber}</span>
                        </div>
                      </td>
                      <td>
                        <div class="sig-title">${isRtl ? 'مدير المشروع المعتمد' : 'Authorized Project Manager'}</div>
                        <div class="sig-dept" style="font-weight: bold; color: #334155; font-size: 8.5px; margin-bottom: 4px;">
                          ${reportProject.projectManager}
                        </div>
                        <div class="sig-signature" style="font-family: 'Courier New', Courier, monospace; font-style: italic; font-weight: bold; color: #1e3a8a; font-size: 11px; margin: 5px 0; text-align: center;">
                          ${reportProject.projectManager.replace('Eng. ', '').replace('Project Manager ', '')}
                        </div>
                        <div class="sig-dotted-line" style="margin-top: 2px;"></div>
                        <div class="digital-seal-box" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                          ${settings.officialStampUrl && (settings.officialStampUrl.startsWith('data:') || settings.officialStampUrl.startsWith('http'))
                            ? `<img src="${settings.officialStampUrl}" style="max-height: 35px; width: auto; object-fit: contain; margin: 0 auto 3px auto; filter: hue-rotate(140deg);" referrerPolicy="no-referrer" />`
                            : `<span style="font-size: 20px; margin-bottom: 2px;">${settings.officialStampUrl || '💠'}</span>`
                          }
                          <span class="pmo-verified-stamp" style="font-size: 6.5px; padding: 1px 3px; border-color: #0080FF; color: #0080FF; font-weight: bold;">
                            ${isRtl ? 'تدقيق ومطابقة الـ PMO' : 'PMO AUDITED & VERIFIED'}
                          </span>
                          <span style="font-size: 6px; color: #94a3b8; font-family: monospace; margin-top: 2px;">TAX: ${settings.taxNumber || '310248201900003'}</span>
                        </div>
                      </td>
                      <td>
                        <div class="sig-title">${isRtl ? 'اعتماد الإدارة التنفيذية' : 'Executive VP of Operations'}</div>
                        <div class="sig-dept" style="font-weight: bold; color: #334155; font-size: 8.5px; margin-bottom: 4px;">
                          ${isRtl ? settings.managerNameAr : settings.managerNameEn}
                        </div>
                        <div class="sig-signature" style="font-family: 'Courier New', Courier, monospace; font-style: italic; font-weight: bold; color: #1e3a8a; font-size: 11px; margin: 5px 0; text-align: center;">
                          ${settings.managerSignature || 'Mishaal.Sudairi.Opr'}
                        </div>
                        <div class="sig-dotted-line" style="margin-top: 2px;"></div>
                        <div class="digital-seal-box" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                          ${settings.officialStampUrl && (settings.officialStampUrl.startsWith('data:') || settings.officialStampUrl.startsWith('http'))
                            ? `<img src="${settings.officialStampUrl}" style="max-height: 35px; width: auto; object-fit: contain; margin: 0 auto 3px auto;" referrerPolicy="no-referrer" />`
                            : `<span style="font-size: 20px; margin-bottom: 2px;">${settings.officialStampUrl || '💮'}</span>`
                          }
                          <span style="font-weight: bold; font-size: 7px; color: #040957; text-align: center;">${isRtl ? settings.companyNameAr : settings.companyNameEn}</span>
                          <span style="font-size: 6px; color: #94a3b8; font-family: monospace; margin-top: 1px;">CR: ${settings.commercialRegistration || '1010349102'}</span>
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>

              <!-- PAGE 2: TECHNICAL ANNEX & WORKS REGISTRY -->
              <div class="page-breaker"></div>
              <div class="certificate-container" style="min-height: auto;">
                <div class="content-wrapper">
                  <!-- Header Section for Page 2 -->
                  <table class="header-section" style="margin-bottom: 15px; border-bottom: 1px solid #cbd5e1;">
                    <tr>
                      <td style="vertical-align: middle;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
                          ${settings.companyLogoUrl && (settings.companyLogoUrl.startsWith('data:') || settings.companyLogoUrl.startsWith('http'))
                            ? `<img src="${settings.companyLogoUrl}" style="max-height: 20px; width: auto; object-fit: contain; vertical-align: middle;" referrerPolicy="no-referrer" />`
                            : `<span style="font-size: 14px; vertical-align: middle; line-height: 1;">${settings.companyLogoUrl || '🏢'}</span>`
                          }
                          <span class="logo-title-en" style="font-size: 10px; font-weight: 800; color: #040957;">${(settings.companyNameEn || 'AL-SUDAIRI ENGINEERING GROUP').toUpperCase()}</span>
                        </div>
                      </td>
                      <td style="text-align: ${isRtl ? 'left' : 'right'}; font-size: 9px; color: #64748b; vertical-align: middle;">
                        <span>${isRtl ? 'الملحق الفني التابع للشهادة رقم:' : 'Technical Annex to Cert:'} RPT-${reportProject.projectNumber}</span>
                      </td>
                    </tr>
                  </table>

                  <div class="certificate-title-block" style="margin: 10px 0; text-align: ${isRtl ? 'right' : 'left'};">
                    <h2 class="certificate-title-en" style="font-size: 13px;">Technical Closeout Registry & Site Logs</h2>
                    <h3 class="certificate-title-ar" style="font-size: 12px; margin-top: 2px;">سجل البنود الفنية والأنشطة الإنشائية ومحاضر الأعمال</h3>
                  </div>

                  <!-- Completed Work Items Table -->
                  <div class="pmo-section-heading">
                    ${isRtl ? 'سجل كميات ومخرجات بنود الأعمال المنجزة' : 'Work Items & Quantities Closeout Registry'}
                  </div>

                  <table class="data-grid-table">
                    <thead>
                      <tr>
                        <th style="width: 8%; text-align: center;">#</th>
                        <th>${isRtl ? 'البند الرئيسي والنشاط الفرعي' : 'Work Item Description & Sub-Activities'}</th>
                        <th style="width: 20%;">${isRtl ? 'الكمية الفنية المنفذة' : 'Physical Qty Achieved'}</th>
                        <th style="width: 15%; text-align: center;">${isRtl ? 'نسبة الإنجاز' : 'Progress'}</th>
                        <th style="width: 18%;">${isRtl ? 'تاريخ الإنجاز والاعتماد' : 'Target/Completion Date'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filteredWIs.map((wi, index) => {
                        const wiProgress = getWorkItemProgress(wi, activities, progressUpdates);
                        const linkedActs = filteredActs.filter(act => act.workItemId === wi.id);
                        
                        return `
                          <tr class="tr-group-header">
                            <td style="text-align: center;">${index + 1}</td>
                            <td>🏢 ${isRtl ? wi.nameAr : wi.nameEn} <span style="font-weight: normal; font-size: 8px;">(${isRtl ? 'بند عمل رئيسي' : 'Core Work Item'})</span></td>
                            <td>${linkedActs.length} ${isRtl ? 'أنشطة منفذة' : 'Activities'}</td>
                            <td style="text-align: center; font-weight: bold;">${wiProgress}%</td>
                            <td>---</td>
                          </tr>
                          ${linkedActs.map((act, actIdx) => {
                            return `
                              <tr>
                                <td style="text-align: center; color: #64748b;">${index + 1}.${actIdx + 1}</td>
                                <td style="padding-left: ${isRtl ? '8px' : '20px'}; padding-right: ${isRtl ? '20px' : '8px'}; color: #475569;">
                                  ↳ ${isRtl ? act.nameAr : act.nameEn}
                                  <br/><span style="font-size: 7.5px; color: #94a3b8;">${isRtl ? 'النطاق/المنطقة:' : 'Zone/Area:'} ${act.workZone || '---'}</span>
                                </td>
                                <td>${act.totalQuantity} ${act.unit}</td>
                                <td style="text-align: center; font-weight: bold; color: #10b981;">${getActivityProgress(act, progressUpdates)}%</td>
                                <td>${act.expectedFinishDate || '---'}</td>
                              </tr>
                            `;
                          }).join('')}
                        `;
                      }).join('')}
                    </tbody>
                  </table>

                  <!-- Site Workforce Table -->
                  <div class="pmo-section-heading">
                    ${isRtl ? 'سجل الكوادر البشرية والقوى العاملة المعتمدة بالموقع' : 'Certified On-site Engineering & Workforce Registry'}
                  </div>

                  <table class="data-grid-table">
                    <thead>
                      <tr>
                        <th style="width: 15%;">${isRtl ? 'الرقم الوظيفي / شارة الدخول' : 'Badge / Employee ID'}</th>
                        <th>${isRtl ? 'الاسم الكامل المعتمد' : 'Employee Full Name'}</th>
                        <th style="width: 30%;">${isRtl ? 'المسمى الوظيفي والدور بالمشروع' : 'Project Role / Profession'}</th>
                        <th style="width: 25%;">${isRtl ? 'رقم الهوية الوطنية / الإقامة' : 'National ID / Iqama'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${involvedWorkersList.length > 0 ? involvedWorkersList.map(w => `
                        <tr>
                          <td style="font-family: monospace; font-weight: bold; color: #040957;">${w.badgeNumber || w.id}</td>
                          <td style="font-weight: 600;">${w.fullName}</td>
                          <td>${isRtl ? w.professionAr : w.professionEn}</td>
                          <td style="font-family: monospace;">${w.nationalId}</td>
                        </tr>
                      `).join('') : `
                        <tr>
                          <td colspan="4" style="text-align: center; color: #94a3b8; font-style: italic; padding: 12px;">
                            ${isRtl ? 'لا يوجد سجل عمالة مرصود للحضور الفعلي' : 'No onsite attendance records logged for this project.'}
                          </td>
                        </tr>
                      `}
                    </tbody>
                  </table>

                  <!-- Chronological logs / timeline -->
                  <div class="pmo-section-heading" style="margin-top: 20px;">
                    ${isRtl ? 'الخط الزمني الميداني والتقارير اليومية للأعمال' : 'Chronological Site Development Timeline'}
                  </div>
                  
                  <div style="border-${isRtl ? 'right' : 'left'}: 2px solid #040957; padding-${isRtl ? 'right' : 'left'}: 12px; margin-${isRtl ? 'right' : 'left'}: 8px; margin-top: 10px;">
                    <div style="margin-bottom: 12px; position: relative;">
                      <div style="position: absolute; ${isRtl ? '-right' : '-17px'}: -17px; top: 3px; width: 8px; height: 8px; border-radius: 50%; background: #040957;"></div>
                      <span style="font-weight: bold; font-family: monospace; color: #040957;">🚀 ${reportProject.startDate}</span>
                      <div style="font-size: 8.5px; color: #64748b; margin-top: 1px;">
                        ${isRtl ? 'انطلاق أعمال التجهيز والبدء الرسمي للموقع والموبلايزيشن' : 'Official Site Mobilization & Start of Core Construction'}
                      </div>
                    </div>
                    
                    ${pUpdates.slice(0, 4).map(pu => {
                      const act = activities.find(a => a.id === pu.activityId);
                      return `
                        <div style="margin-bottom: 12px; position: relative;">
                          <div style="position: absolute; ${isRtl ? '-right' : '-17px'}: -17px; top: 3px; width: 6px; height: 6px; border-radius: 50%; background: #cbd5e1;"></div>
                          <span style="font-weight: bold; font-family: monospace; color: #475569;">📅 ${pu.timestamp.split('T')[0]}</span>
                          <div style="font-size: 8.5px; color: #334155; margin-top: 1px;">
                            ${isRtl ? 'تحديث إنجاز بدني للنشاط:' : 'Recorded physical achievement for'} <strong>${act ? (isRtl ? act.nameAr : act.nameEn) : '---'}</strong> - 
                            ${isRtl ? 'الكمية المنفذة:' : 'Qty Complete:'} <strong>${pu.completedQuantity}</strong>
                            ${pu.notes ? `<span style="color: #64748b; font-style: italic; display: block; margin-top: 1px;">"${pu.notes}"</span>` : ''}
                          </div>
                        </div>
                      `;
                    }).join('')}

                    <div style="margin-bottom: 5px; position: relative;">
                      <div style="position: absolute; ${isRtl ? '-right' : '-17px'}: -17px; top: 3px; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></div>
                      <span style="font-weight: bold; font-family: monospace; color: #10b981;">🏆 ${reportProject.completionDate || '---'}</span>
                      <div style="font-size: 8.5px; color: #10b981; font-weight: bold; margin-top: 1px;">
                        🏁 ${isRtl ? 'إغلاق المشروع الرسمي وتسليم المفاتيح النهائي واعتماد استشاري الموقع' : 'Official Project Completion, Consultant Handover & PMO Audit Closeout'}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </body>
            </html>
          `;

          if (mode === 'print') {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);
            
            const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
            if (iframeDoc) {
              iframeDoc.open();
              iframeDoc.write(printHtml);
              iframeDoc.close();
              setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                  document.body.removeChild(iframe);
                }, 1000);
              }, 500);
            }
          } else {
            if (isGeneratingPDF) return;
            setIsGeneratingPDF(true);

            // Create off-screen container for rendering (safely positioned far offscreen but in the DOM)
            const container = document.createElement('div');
            container.className = 'pdf-render-container';
            container.dir = isRtl ? 'rtl' : 'ltr';
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.width = '210mm'; // Standard A4 series width
            container.style.backgroundColor = '#ffffff'; // Prevent transparency black/blank bug
            container.style.color = '#0f172a';
            container.style.zIndex = '99999'; // Render above but offscreen
            container.style.pointerEvents = 'none'; // Ensure no interference with user interactions
            container.style.opacity = '1'; // Must be fully visible for html2canvas
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.innerHTML = printHtml;
            document.body.appendChild(container);

            const opt = {
              margin:       10, // Margins in mm (uniform on all sides)
              filename:     `Completion_Certificate_${reportProject.projectNumber}.pdf`,
              image:        { type: 'jpeg' as const, quality: 0.98 },
              html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0,
                backgroundColor: '#ffffff' // Ensure solid white background
              },
              jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
              pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
            };

            // Wait for all images to fully load inside the container
            const imgs = container.querySelectorAll('img');
            const loadPromises = Array.from(imgs).map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Resolve even on error to avoid blocking PDF generation
              });
            });

            Promise.all(loadPromises).then(() => {
              // Tiny timeout to guarantee rendering paint has taken effect
              setTimeout(() => {
                html2pdf()
                  .set(opt)
                  .from(container)
                  .save()
                  .then(() => {
                    document.body.removeChild(container);
                    setIsGeneratingPDF(false);
                  })
                  .catch((err: any) => {
                    console.error('PDF generation error, falling back to print mode:', err);
                    if (document.body.contains(container)) {
                      document.body.removeChild(container);
                    }
                    setIsGeneratingPDF(false);
                    // Fallback to print
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'absolute';
                    iframe.style.width = '0px';
                    iframe.style.height = '0px';
                    iframe.style.border = 'none';
                    document.body.appendChild(iframe);
                    
                    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
                    if (iframeDoc) {
                      iframeDoc.open();
                      iframeDoc.write(printHtml);
                      iframeDoc.close();
                      setTimeout(() => {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                        setTimeout(() => {
                          document.body.removeChild(iframe);
                        }, 1000);
                      }, 500);
                    }
                  });
              }, 300);
            }).catch(() => {
              // Safety fallback if image promises fail
              html2pdf()
                .set(opt)
                .from(container)
                .save()
                .then(() => {
                  document.body.removeChild(container);
                  setIsGeneratingPDF(false);
                })
                .catch(() => {
                  if (document.body.contains(container)) {
                    document.body.removeChild(container);
                  }
                  setIsGeneratingPDF(false);
                });
            });
          }
        };

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9990] animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl border border-gray-100 max-w-4xl w-full shadow-2xl overflow-hidden my-8">
              {/* Modal Header */}
              <div className="bg-[#040957] text-white p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 p-2 rounded-xl text-white">
                    <Award className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-sans text-white">
                      {isRtl ? 'التقرير الختامي لإغلاق وإنجاز المشروع' : 'Official Project Completion & Audit Closeout Report'}
                    </h3>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      RPT-{reportProject.projectNumber} • {isRtl ? 'مؤمن ومشفر' : 'Digitally Secured'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => handleExportPDF('download')}
                    disabled={isGeneratingPDF}
                    className="bg-[#10b981] hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-sans font-bold py-2 px-3 sm:px-4 rounded-xl text-xs transition shadow flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>{isRtl ? 'تحميل...' : 'Downloading...'}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'حفظ PDF' : 'Download PDF'}</span>
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleExportPDF('print')}
                    disabled={isGeneratingPDF}
                    className="bg-[#0080FF] hover:bg-blue-600 disabled:opacity-50 text-white font-sans font-bold py-2 px-3 sm:px-4 rounded-xl text-xs transition shadow flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'طباعة الشهادة' : 'Print'}</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setIsReportOpen(false); setReportProject(null); }}
                    className="text-white/70 hover:text-white transition p-2 rounded-xl hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto" id="completion-report-scroll-container">
                
                {/* Visual Stamp Certificate Banner */}
                <div className="border-2 border-emerald-500/20 bg-emerald-50/20 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 border-dashed">
                  <div className="space-y-1 text-center md:text-right">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{isRtl ? 'معتمد ومكتمل' : 'APPROVED & COMPLETED'}</span>
                    </div>
                    <h4 className="text-base font-extrabold text-[#040957]">
                      {isRtl ? 'شهادة إكمال مشروع ومطابقة استشارية' : 'Certificate of Physical Completion & Technical Closeout'}
                    </h4>
                    <p className="text-xs text-gray-500 max-w-xl">
                      {isRtl 
                        ? 'تشهد مجموعة السديري الهندسية بأن هذا المشروع قد تم الانتهاء من كافة بنود أعماله ومطابقتها للمخططات المعتمدة وتم أرشفته وتأمين بياناته.'
                        : 'Al-Sudairi Civil Engineering Group certifies that this project has successfully concluded all registered structural activities, verified by field consultants.'}
                    </p>
                  </div>
                  {/* Stamp Design */}
                  <div className="border-4 border-emerald-500/30 text-emerald-600 font-mono text-[10px] font-black p-3 rounded-full rotate-12 shrink-0 select-none animate-pulse flex flex-col items-center">
                    <span>AL-SUDAIRI</span>
                    <span className="text-[8px] opacity-85">PMO APPROVED</span>
                    <span>{reportProject.completionDate || new Date().toISOString().split('T')[0]}</span>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-right">
                  <div className="p-3.5 bg-gray-50/50 rounded-xl border border-gray-100 space-y-1">
                    <span className="text-[10px] text-gray-400 block font-semibold">{isRtl ? 'المشروع والرمز' : 'Project Ref'}</span>
                    <strong className="text-xs text-[#040957] block font-mono">{reportProject.projectNumber}</strong>
                    <span className="text-[11px] text-gray-600 block">{isRtl ? reportProject.nameAr : reportProject.nameEn}</span>
                  </div>

                  <div className="p-3.5 bg-gray-50/50 rounded-xl border border-gray-100 space-y-1">
                    <span className="text-[10px] text-gray-400 block font-semibold">{isRtl ? 'صاحب العمل / العميل' : 'Client / Owner'}</span>
                    <strong className="text-xs text-[#040957] block">{isRtl ? reportProject.clientAr : reportProject.clientEn}</strong>
                    <span className="text-[11px] text-gray-500 block">📍 {isRtl ? reportProject.locationAr : reportProject.locationEn}</span>
                  </div>

                  <div className="p-3.5 bg-gray-50/50 rounded-xl border border-gray-100 space-y-1">
                    <span className="text-[10px] text-gray-400 block font-semibold">{isRtl ? 'تاريخ البدء والتسليم المعتمد' : 'Duration Schedule'}</span>
                    <div className="text-xs text-gray-700 font-mono space-y-0.5">
                      <div>🛫 {isRtl ? 'البدء:' : 'Start:'} {reportProject.startDate}</div>
                      <div className="font-bold text-red-700">🏁 {isRtl ? 'التعاقدي:' : 'Contractual:'} {reportProject.endDate}</div>
                      <div className="font-bold text-emerald-700">🏆 {isRtl ? 'الفعلي:' : 'Actual Close:'} {reportProject.completionDate || '---'}</div>
                    </div>
                  </div>
                </div>

                {/* Timing & Performance Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#040957] border-b border-gray-100 pb-1.5 uppercase tracking-wide text-right">
                    {isRtl ? 'تحليل الأداء الزمني والجهد البدني' : 'Workforce Scheduling & Timing Delta Analysis'}
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-0.5">
                      <span className="text-[20px] font-black text-[#040957] font-mono">{allottedDays}</span>
                      <span className="text-[10px] text-gray-500 block font-bold">{isRtl ? 'أيام العقد المخططة' : 'Contractual Days'}</span>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-0.5">
                      <span className="text-[20px] font-black text-blue-600 font-mono">{actualDays}</span>
                      <span className="text-[10px] text-gray-500 block font-bold">{isRtl ? 'الأيام الفعلية المستغرقة' : 'Actual Days Spent'}</span>
                    </div>

                    <div className={`p-4 rounded-xl border text-center space-y-0.5 ${timingStatusClass}`}>
                      <span className="text-[18px] font-black font-mono block">
                        {diffDays === 0 ? '0' : (diffDays < 0 ? `-${Math.abs(diffDays)}` : `+${diffDays}`)} {isRtl ? 'أيام' : 'Days'}
                      </span>
                      <span className="text-[9px] block font-bold leading-tight">{timingStatusText}</span>
                    </div>

                    <div className={`p-4 rounded-xl border text-center space-y-0.5 ${timingStatusClass}`}>
                      <span className="text-[18px] font-black font-mono block">
                        {diffHours === 0 ? '0' : (diffHours < 0 ? `-${Math.abs(diffHours)}` : `+${diffHours}`)} {isRtl ? 'ساعة' : 'Hrs'}
                      </span>
                      <span className="text-[9px] block font-bold leading-tight">{hoursStatusText}</span>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-0.5 text-right">
                      <span className="text-[11px] font-bold text-slate-700">{isRtl ? 'مؤشر الإنجاز المالي والبدني الكلي' : 'Overall Cumulative Project Progress'}</span>
                      <span className="text-xs text-gray-400 block">{isRtl ? 'تراكمي لجميع البند والأنشطة الإنشائية' : 'Aggregated of all completed work items'}</span>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-1/2">
                      <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${overallProgress}%` }}></div>
                      </div>
                      <span className="font-mono font-black text-emerald-600 text-sm shrink-0">{overallProgress}%</span>
                    </div>
                  </div>
                </div>

                {/* Work Items List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#040957] border-b border-gray-100 pb-1.5 uppercase tracking-wide text-right">
                    {isRtl ? 'سجل البنود التفصيلية ونسب الإنجاز' : 'Subdivided Work Items & Completed Outputs'}
                  </h4>

                  <div className="border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100 text-xs">
                    {filteredWIs.map((wi, wiIdx) => {
                      const wiProgress = getWorkItemProgress(wi, activities, progressUpdates);
                      const wiActs = filteredActs.filter(act => act.workItemId === wi.id);
                      
                      return (
                        <div key={wi.id} className="p-4 space-y-2 text-right">
                          <div className="flex items-center justify-between font-bold text-[#040957]">
                            <div className="flex items-center gap-2">
                              <span className="bg-[#040957]/10 text-[#040957] w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono">{wiIdx + 1}</span>
                              <span>{isRtl ? wi.nameAr : wi.nameEn}</span>
                            </div>
                            <span className="text-emerald-600 font-mono font-black">{wiProgress}%</span>
                          </div>

                          {wiActs.length > 0 ? (
                            <div className="pl-4 pr-8 space-y-1.5 text-[11px] text-gray-600">
                              {wiActs.map(act => (
                                <div key={act.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-1 border-b border-gray-100/50">
                                  <span className="font-semibold text-gray-700">↳ {isRtl ? act.nameAr : act.nameEn}</span>
                                  <div className="flex items-center gap-4 font-mono text-[10px] text-gray-500">
                                    <span>{isRtl ? 'الكمية:' : 'Qty:'} {act.totalQuantity} {act.unit}</span>
                                    <span>{isRtl ? 'التقدم:' : 'Progress:'} {getActivityProgress(act, progressUpdates)}%</span>
                                    <span className="font-bold text-gray-700">🗓️ {act.expectedFinishDate || '---'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-400 pl-8 font-medium">
                              {isRtl ? 'لا توجد أنشطة مسجلة تحت هذا البند.' : 'No registered activities for this item.'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Workforce Register */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#040957] border-b border-gray-100 pb-1.5 uppercase tracking-wide text-right">
                    {isRtl ? 'سجل القوى العاملة والعمالة المشاركة في التنفيذ' : 'On-Site Human Resource & Workforce Register'}
                  </h4>

                  <div className="border border-gray-100 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-right divide-y divide-gray-100">
                      <thead className="bg-slate-50 text-[10px] font-bold text-[#040957] text-right">
                        <tr>
                          <th className="p-3 text-right">{isRtl ? 'كود العامل' : 'Worker ID'}</th>
                          <th className="p-3 text-right">{isRtl ? 'الاسم' : 'Name'}</th>
                          <th className="p-3 text-right">{isRtl ? 'المهنة / التخصص الفني' : 'Technical Profession'}</th>
                          <th className="p-3 text-right">{isRtl ? 'الهوية الوطنية' : 'National ID'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700 text-[11px]">
                        {involvedWorkersList.length > 0 ? involvedWorkersList.map(w => (
                          <tr key={w.id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-mono font-bold text-[#040957]">{w.badgeNumber || w.id}</td>
                            <td className="p-3 font-semibold">{w.fullName}</td>
                            <td className="p-3 text-gray-500">{isRtl ? w.professionAr : w.professionEn}</td>
                            <td className="p-3 font-mono">{w.nationalId}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} className="p-5 text-center text-gray-400 font-medium">
                              {isRtl ? 'لم يتم تدوين حضور عمالة معتمد لهذا المشروع' : 'No site workforce presence recorded'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Timeline and History Logs */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#040957] border-b border-gray-100 pb-1.5 uppercase tracking-wide text-right">
                    {isRtl ? 'التقويم الفعلي للتقدم وسجل التحديثات اليومية' : 'Chronological site Log & Milestone Calendar'}
                  </h4>

                  <div className="relative border-r-2 border-[#040957]/20 mr-3 pr-5 space-y-4 text-xs text-gray-600 font-sans pt-2 text-right">
                    <div className="relative">
                      <div className="absolute -right-[27px] top-0.5 bg-[#040957] text-white p-1 rounded-full border-4 border-white shrink-0">
                        <Plus className="w-2.5 h-2.5" />
                      </div>
                      <strong className="text-gray-800 font-bold block">{reportProject.startDate}</strong>
                      <span className="text-[11px] block">{isRtl ? 'انطلاق وتدشين أعمال الموقع والبدء الرسمي' : 'Mobilization & site official layout launch'}</span>
                    </div>

                    {pUpdates.slice(0, 10).map((pu, puIdx) => {
                      const linkedAct = activities.find(a => a.id === pu.activityId);
                      return (
                        <div key={pu.id || puIdx} className="relative">
                          <div className="absolute -right-[27px] top-0.5 bg-blue-500 text-white p-1 rounded-full border-4 border-white shrink-0">
                            <CalendarIcon className="w-2.5 h-2.5" />
                          </div>
                          <strong className="text-gray-800 font-bold font-mono block">{pu.timestamp.split('T')[0]}</strong>
                          <div className="text-[11px] block leading-relaxed text-gray-500">
                            {isRtl ? 'تحديث إنجاز مالي وبدني للنشاط' : 'Recorded progress on activity'} <strong className="text-[#040957]">"{linkedAct ? (isRtl ? linkedAct.nameAr : linkedAct.nameEn) : '---'}"</strong>: 
                            <span className="font-bold text-gray-800 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 ml-1">
                              {pu.completedQuantity} {linkedAct ? linkedAct.unit : ''}
                            </span>
                            {pu.notes && <p className="text-[10px] text-gray-400 italic mt-0.5 font-sans">"{pu.notes}"</p>}
                          </div>
                        </div>
                      );
                    })}

                    <div className="relative">
                      <div className="absolute -right-[27px] top-0.5 bg-emerald-500 text-white p-1 rounded-full border-4 border-white shrink-0 animate-pulse">
                        <Award className="w-2.5 h-2.5" />
                      </div>
                      <strong className="text-emerald-700 font-black block">{reportProject.completionDate || reportProject.endDate}</strong>
                      <span className="text-[11px] block text-emerald-800 font-bold">
                        🏁 {isRtl ? 'الإغلاق النهائي المعتمد للموقع وتسليم العميل' : 'Final physical handover, inspection, and formal seal lock'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sign-off Sheet block for print visual parity */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-gray-100 text-center text-[10px] text-gray-500 font-sans">
                  <div className="space-y-1 p-3 border border-gray-100 rounded-xl bg-slate-50/50">
                    <strong className="text-slate-800 block">{isRtl ? 'مهندس الموقع الفني' : 'Field Supervisor'}</strong>
                    <span>{isRtl ? 'تم التحقق من الأعمال الميدانية' : 'Field Activities Verified'}</span>
                    <div className="h-10 border-b border-dashed border-gray-300 w-1/2 mx-auto"></div>
                  </div>
                  <div className="space-y-1 p-3 border border-gray-100 rounded-xl bg-slate-50/50">
                    <strong className="text-slate-800 block">{isRtl ? 'مدير المشروع المعتمد' : 'Project Manager'}</strong>
                    <span>{isRtl ? 'تم مراجعة الفارق والجدولة' : 'Schedule & Delta Approved'}</span>
                    <div className="h-10 border-b border-dashed border-gray-300 w-1/2 mx-auto"></div>
                  </div>
                  <div className="space-y-1 p-3 border border-gray-100 rounded-xl bg-slate-50/50">
                    <strong className="text-slate-800 block">{isRtl ? 'المدير العام والختم' : 'General Director Signoff'}</strong>
                    <span>{isRtl ? 'الاعتماد المالي وإغلاق الملف' : 'Finance Closeout approved'}</span>
                    <div className="h-10 border-b border-dashed border-gray-300 w-1/2 mx-auto"></div>
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-2 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => { setIsReportOpen(false); setReportProject(null); }}
                  className="bg-[#040957] text-white hover:bg-slate-800 font-sans font-bold py-2 px-5 rounded-xl text-xs transition shadow-sm"
                >
                  {isRtl ? 'إغلاق المعاينة' : 'Close Preview'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* HELPER FUNCTIONS IN COMPONENT SCRIPT SCOPE */}
      {(() => {
        (window as any).checkProjectLock = checkLock;
        (window as any).unlockedProjectIds = unlockedProjectIds;
        return null;
      })()}

    </div>
  );
}
