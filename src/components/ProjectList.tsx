/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Project, 
  SystemSettings,
  UserRole,
  WorkItem,
  Activity,
  ProgressUpdate,
  AttendanceRecord,
  WarehouseMaterial
} from '../types';
import { getProjectProgress, getProjectStatusDetails } from '../utils/progressCalculations';
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
  GanttChartSquare
} from 'lucide-react';
import GanttChart from './GanttChart';

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
      budget: Number(formBudget)
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
      budget: Number(formBudget)
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
                        <button 
                          onClick={() => onNavigate && onNavigate('reports')}
                          title={isRtl ? 'عرض التقارير' : 'View Reports'}
                          className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleRowDuplicate(p.id)}
                          disabled={isReadOnly}
                          title={t.duplicate}
                          className={`text-gray-400 hover:text-teal-600 p-1.5 hover:bg-teal-50 rounded-lg transition ${isReadOnly ? 'opacity-35 cursor-not-allowed' : ''}`}
                        >
                          <Files className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(p)}
                          disabled={isReadOnly}
                          title={t.edit}
                          className={`text-gray-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded-lg transition ${isReadOnly ? 'opacity-35 cursor-not-allowed' : ''}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleRowDelete(p.id)}
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

    </div>
  );
}
