/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  StartCard, 
  WorkPermit, 
  Project, 
  WorkItem, 
  Activity, 
  SystemSettings, 
  UserRole,
  PermitTypeConfig,
  PermitAuditLog,
  ActivityAuthorizationStatus,
  Worker,
  EquipmentItem,
  WarehouseMaterial
} from '../../types';
import { 
  DEFAULT_PERMIT_TYPES, 
  evaluateActivityAuthorization,
  isPermitExpired
} from '../../utils/ptwCalculations';
import { StartCardModal } from './StartCardModal';
import { PermitModal } from './PermitModal';
import { PTWPrintPreviewModal } from './PTWPrintPreviewModal';
import { 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Users, 
  QrCode, 
  Building2, 
  Eye, 
  Edit3, 
  Trash2, 
  Lock, 
  Unlock, 
  PauseCircle, 
  PlayCircle,
  History,
  Flame,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface PTWManagementPanelProps {
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  workers?: Worker[];
  equipment?: EquipmentItem[];
  materials?: WarehouseMaterial[];
  startCards: StartCard[];
  permits: WorkPermit[];
  permitTypes?: PermitTypeConfig[];
  auditLogs: PermitAuditLog[];
  settings: SystemSettings;
  userRoles: UserRole[];
  currentUserName?: string;
  onSaveStartCard: (card: StartCard) => Promise<void>;
  onDeleteStartCard: (id: string) => Promise<void>;
  onSavePermit: (permit: WorkPermit) => Promise<void>;
  onDeletePermit: (id: string) => Promise<void>;
  onLogAudit: (log: Omit<PermitAuditLog, 'id' | 'timestamp'>) => Promise<void>;
  lang: 'ar' | 'en';
}

export const PTWManagementPanel: React.FC<PTWManagementPanelProps> = ({
  projects,
  workItems,
  activities,
  workers = [],
  equipment = [],
  materials = [],
  startCards,
  permits,
  permitTypes = DEFAULT_PERMIT_TYPES,
  auditLogs,
  settings,
  userRoles,
  currentUserName = 'Eng. Site Lead',
  onSaveStartCard,
  onDeleteStartCard,
  onSavePermit,
  onDeletePermit,
  onLogAudit,
  lang
}) => {
  const isRtl = lang === 'ar';

  // Active View Tab
  const [activeMainTab, setActiveMainTab] = useState<'cards' | 'permits' | 'readiness' | 'audit'>('cards');

  // Filter States
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isStartCardModalOpen, setIsStartCardModalOpen] = useState(false);
  const [editingStartCard, setEditingStartCard] = useState<StartCard | null>(null);

  const [isPermitModalOpen, setIsPermitModalOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<WorkPermit | null>(null);

  // Print & PDF Preview Modal State
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    type: 'permit' | 'startCard';
    permit?: WorkPermit | null;
    startCard?: StartCard | null;
  }>({
    isOpen: false,
    type: 'permit',
    permit: null,
    startCard: null
  });

  const handleOpenPrintPreview = (type: 'permit' | 'startCard', item: WorkPermit | StartCard) => {
    if (type === 'permit') {
      setPrintModalState({
        isOpen: true,
        type: 'permit',
        permit: item as WorkPermit,
        startCard: null
      });
    } else {
      setPrintModalState({
        isOpen: true,
        type: 'startCard',
        permit: null,
        startCard: item as StartCard
      });
    }
  };

  // Filtered Start Cards
  const filteredStartCards = useMemo(() => {
    return startCards.filter(card => {
      if (selectedProjectId !== 'all' && card.projectId !== selectedProjectId) return false;
      if (selectedStatus !== 'all' && card.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = card.cardNumber.toLowerCase();
        const descEn = (card.workDescriptionEn || '').toLowerCase();
        const descAr = (card.workDescriptionAr || '').toLowerCase();
        return num.includes(q) || descEn.includes(q) || descAr.includes(q);
      }
      return true;
    });
  }, [startCards, selectedProjectId, selectedStatus, searchQuery]);

  // Filtered Permits
  const filteredPermits = useMemo(() => {
    return permits.filter(p => {
      if (selectedProjectId !== 'all' && p.projectId !== selectedProjectId) return false;
      if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = p.permitNumber.toLowerCase();
        const descEn = (p.descriptionOfWorkEn || '').toLowerCase();
        const descAr = (p.descriptionOfWorkAr || '').toLowerCase();
        return num.includes(q) || descEn.includes(q) || descAr.includes(q);
      }
      return true;
    });
  }, [permits, selectedProjectId, selectedStatus, searchQuery]);

  // Computed Evaluation for all activities
  const activityEvaluations = useMemo(() => {
    const targetActivities = selectedProjectId === 'all' 
      ? activities 
      : activities.filter(a => {
          const parentWi = workItems.find(w => w.id === a.workItemId);
          return parentWi?.projectId === selectedProjectId;
        });

    return targetActivities.map(act => {
      const parentWi = workItems.find(w => w.id === act.workItemId);
      const proj = projects.find(p => p.id === parentWi?.projectId);
      const evalResult = evaluateActivityAuthorization(act, parentWi, proj, startCards, permits);
      return {
        activity: act,
        workItem: parentWi,
        project: proj,
        evalResult
      };
    });
  }, [activities, workItems, projects, startCards, permits, selectedProjectId]);

  // Stats Calculations
  const stats = useMemo(() => {
    const totalSC = startCards.length;
    const approvedSC = startCards.filter(sc => sc.status === 'Approved').length;
    const pendingSC = startCards.filter(sc => sc.status === 'Submitted' || sc.status === 'Draft').length;

    const totalPTW = permits.length;
    const activePTW = permits.filter(p => p.status === 'Active' || p.status === 'Approved').length;
    const suspendedPTW = permits.filter(p => p.status === 'Suspended').length;

    const authorizedActivitiesCount = activityEvaluations.filter(e => e.evalResult.isAuthorized).length;
    const blockedActivitiesCount = activityEvaluations.filter(e => !e.evalResult.isAuthorized).length;

    return {
      totalSC,
      approvedSC,
      pendingSC,
      totalPTW,
      activePTW,
      suspendedPTW,
      authorizedActivitiesCount,
      blockedActivitiesCount
    };
  }, [startCards, permits, activityEvaluations]);

  // Handlers for Start Cards
  const handleOpenNewStartCard = () => {
    setEditingStartCard(null);
    setIsStartCardModalOpen(true);
  };

  const handleEditStartCard = (card: StartCard) => {
    setEditingStartCard(card);
    setIsStartCardModalOpen(true);
  };

  // Handlers for Permits
  const handleOpenNewPermit = () => {
    setEditingPermit(null);
    setIsPermitModalOpen(true);
  };

  const handleEditPermit = (permit: WorkPermit) => {
    setEditingPermit(permit);
    setIsPermitModalOpen(true);
  };

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header Banner - Light Executive Design */}
      <div className="bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/30 border border-slate-200/90 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-200 shadow-xs">
                <ShieldCheck className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {isRtl ? 'نظام حوكمة كروت بدء العمل وتصاريح السلامة (PTW & Start Cards)' : 'Start Card & Permit to Work (PTW) Governance'}
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {isRtl ? 'حوكمة الجاهزية الفنية والسلامة وضوابط التفويض الميداني قبل السماح ببدء التنفيذ' : 'Multi-tier readiness inspection, safety verification & work authorization gate'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenNewStartCard}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isRtl ? 'إصدار كارت بدء عمل (Start Card)' : '+ Issue Start Card'}</span>
            </button>

            <button
              onClick={handleOpenNewPermit}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isRtl ? 'إصدار تصريح عمل (PTW)' : '+ Issue Work Permit'}</span>
            </button>
          </div>
        </div>

        {/* Rule Banner Notice - Light warning style */}
        <div className="mt-5 p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-600 text-white font-bold tracking-wide text-[10.5px]">
              {isRtl ? 'قاعدة إلزامية' : 'STRICT MANDATE'}
            </span>
            <span className="text-amber-950 font-semibold">
              {isRtl ? 'لا تصريح = لا عمل (NO AUTHORIZATION = NO START) - يُحظر بدء أي نشاط قبل اعتماد كارت البدء وتصاريح السلامة المطلوبة.' : 'NO AUTHORIZATION = NO START: Activities are strictly locked until mandatory Start Card & PTW approvals are verified.'}
            </span>
          </div>
          <span className="hidden md:inline-block text-[11px] text-amber-900 font-mono font-medium">
            {stats.authorizedActivitiesCount} {isRtl ? 'نشاط مصرح' : 'Authorized'} / {stats.blockedActivitiesCount} {isRtl ? 'نشاط محظور' : 'Locked'}
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Start Cards */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between hover:border-blue-200 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">
              {isRtl ? 'إجمالي كروت بدء العمل' : 'Total Start Cards'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {stats.totalSC}
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {stats.approvedSC} {isRtl ? 'معتمد' : 'Approved'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Work Permits */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between hover:border-rose-200 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">
              {isRtl ? 'تصاريح العمل (PTW)' : 'Active Work Permits'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-rose-600 font-mono">
                {stats.activePTW}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                / {stats.totalPTW} {isRtl ? 'إجمالي' : 'Total'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Suspended / Action Needed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between hover:border-amber-200 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">
              {isRtl ? 'تصاريح موقوفة مؤقتاً' : 'Suspended Permits'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-600 font-mono">
                {stats.suspendedPTW}
              </span>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                {isRtl ? 'تتطلب معالجة' : 'Needs Check'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
            <PauseCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Authorization Readiness */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">
              {isRtl ? 'جاهزية الأنشطة للتنفيذ' : 'Activities Authorized'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                {stats.authorizedActivitiesCount}
              </span>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                ({stats.blockedActivitiesCount} {isRtl ? 'محظور' : 'Locked'})
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
            <Unlock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-sm space-y-4">
        {/* Top Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto text-xs font-bold border border-slate-200/60">
            <button
              onClick={() => setActiveMainTab('cards')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeMainTab === 'cards' 
                  ? 'bg-white text-blue-900 shadow-sm border border-slate-200/80 font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>{isRtl ? 'سجل كروت بدء العمل' : 'Start Cards Register'}</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10.5px]">
                {startCards.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('permits')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeMainTab === 'permits' 
                  ? 'bg-white text-rose-900 shadow-sm border border-slate-200/80 font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>{isRtl ? 'سجل تصاريح العمل (PTW)' : 'Permits Register'}</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10.5px]">
                {permits.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('readiness')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeMainTab === 'readiness' 
                  ? 'bg-white text-emerald-900 shadow-sm border border-slate-200/80 font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>{isRtl ? 'بوابة تفويض الأنشطة (Gate)' : 'Authorization Gate'}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10.5px]">
                {activityEvaluations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('audit')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeMainTab === 'audit' 
                  ? 'bg-white text-purple-900 shadow-sm border border-slate-200/80 font-extrabold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4 text-purple-600" />
              <span>{isRtl ? 'سجل التدقيق والمتابعة' : 'Audit Trail'}</span>
            </button>
          </div>

          {/* Search & Project Filter */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 md:w-56">
              <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 text-slate-400`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث بالرقم أو التوصيف...' : 'Search by number...'}
                className={`w-full text-xs ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none font-semibold focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">{isRtl ? 'جميع المشاريع' : 'All Projects'}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab 1: Start Cards Register */}
        {activeMainTab === 'cards' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3 text-start w-32">{isRtl ? 'رقم الكارت' : 'Card No.'}</th>
                    <th className="p-3 text-start">{isRtl ? 'المشروع وحزمة العمل' : 'Project & Work Package'}</th>
                    <th className="p-3 text-start">{isRtl ? 'توصيف العمل' : 'Work Description'}</th>
                    <th className="p-3 text-center w-28">{isRtl ? 'المستوى' : 'Level'}</th>
                    <th className="p-3 text-center w-36">{isRtl ? 'الفحص والجاهزية' : 'Checklist Gates'}</th>
                    <th className="p-3 text-center w-36">{isRtl ? 'سلسلة الاعتمادات' : 'Approvals'}</th>
                    <th className="p-3 text-center w-28">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="p-3 text-center w-28">{isRtl ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStartCards.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        {isRtl ? 'لا توجد كروت بدء عمل مسجلة حالياً' : 'No Start Cards found'}
                      </td>
                    </tr>
                  ) : (
                    filteredStartCards.map(card => {
                      const passCount = card.checklist?.filter(c => c.status === 'Pass').length || 0;
                      const totalCheck = card.checklist?.length || 1;
                      const appCount = card.approvals?.filter(a => a.status === 'Approved').length || 0;
                      const totalApp = card.approvals?.length || 1;

                      return (
                        <tr key={card.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-blue-900">
                            {card.cardNumber}
                            <span className="block text-[10px] text-slate-400 font-sans">Rev {card.revision}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">
                              {isRtl ? card.projectNameAr : card.projectNameEn}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {card.workPackageCode || 'WP'} • {card.workAreaZone || 'Site Area'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800 block">
                              {isRtl ? card.workDescriptionAr : card.workDescriptionEn}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {card.plannedStartDate} → {card.plannedFinishDate} ({card.expectedDurationDays}d)
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border ${
                              card.level === 'Group' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {card.level === 'Group' ? (isRtl ? 'حزمة كاملة' : 'Package') : (isRtl ? 'نشاط محدد' : 'Activity')}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1 font-mono text-[11px]">
                              <span className={`font-bold ${passCount === totalCheck ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {passCount}/{totalCheck}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                ({Math.round((passCount / totalCheck) * 100)}%)
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1 font-mono text-[11px]">
                              <span className={`font-bold ${appCount === totalApp ? 'text-emerald-700' : 'text-blue-700'}`}>
                                {appCount}/{totalApp}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                {appCount === totalApp ? (isRtl ? 'مكتمل' : 'Done') : (isRtl ? 'قيد المراجعة' : 'Pending')}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              card.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              card.status === 'Submitted' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              card.status === 'Rejected' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              {card.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenPrintPreview('startCard', card)}
                                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                title={isRtl ? 'معاينة وطباعة وتصدير PDF' : 'Print Preview & PDF Export'}
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditStartCard(card)}
                                className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                title={isRtl ? 'عرض وتعديل والاعتماد' : 'View / Edit / Sign'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeleteStartCard(card.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title={isRtl ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Permits Register */}
        {activeMainTab === 'permits' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3 text-start w-32">{isRtl ? 'رقم التصريح' : 'Permit No.'}</th>
                    <th className="p-3 text-start w-36">{isRtl ? 'نوع التصريح' : 'Permit Type'}</th>
                    <th className="p-3 text-start">{isRtl ? 'نطاق العمل والموقع' : 'Work Scope & Location'}</th>
                    <th className="p-3 text-center w-24">{isRtl ? 'مستوى الخطر' : 'Risk'}</th>
                    <th className="p-3 text-center w-40">{isRtl ? 'فترة الصلاحية' : 'Validity Window'}</th>
                    <th className="p-3 text-center w-28">{isRtl ? 'ضوابط السلامة' : 'Controls'}</th>
                    <th className="p-3 text-center w-28">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="p-3 text-center w-28">{isRtl ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPermits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        {isRtl ? 'لا توجد تصاريح عمل مسجلة حالياً' : 'No Work Permits found'}
                      </td>
                    </tr>
                  ) : (
                    filteredPermits.map(permit => {
                      const isExpired = isPermitExpired(permit);
                      const ctrlCount = permit.safetyControls?.filter(c => c.isImplemented).length || 0;
                      const totalCtrl = permit.safetyControls?.length || 1;

                      return (
                        <tr key={permit.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-rose-800">
                            {permit.permitNumber}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span className="font-bold text-slate-900">
                                {isRtl ? permit.permitTypeNameAr : permit.permitTypeNameEn}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800 block">
                              {isRtl ? permit.descriptionOfWorkAr : permit.descriptionOfWorkEn}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {permit.exactWorkArea} • {permit.shift} Shift ({permit.numberOfWorkers} workers)
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                              permit.riskLevel === 'Critical' ? 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold' :
                              permit.riskLevel === 'High' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              permit.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {permit.riskLevel}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-[11px]">
                            <span className="block text-slate-800 font-medium">
                              {permit.validUntilDate} {permit.validUntilTime}
                            </span>
                            {isExpired && permit.status === 'Active' ? (
                              <span className="text-[10px] font-bold text-rose-600">EXPIRED</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">{permit.validFromDate} {permit.validFromTime}</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono text-[11px]">
                            <span className="text-emerald-700 font-bold">{ctrlCount}/{totalCtrl}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              permit.status === 'Active' || permit.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              permit.status === 'Suspended' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              permit.status === 'Closed' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                              'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {permit.status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenPrintPreview('permit', permit)}
                                className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title={isRtl ? 'معاينة وطباعة وتصدير PDF' : 'Print Preview & PDF Export'}
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditPermit(permit)}
                                className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title={isRtl ? 'عرض وتعديل وتوقيع' : 'View / Edit / Sign'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeletePermit(permit.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                title={isRtl ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Authorization Gate Matrix */}
        {activeMainTab === 'readiness' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-emerald-950">
                  {isRtl ? 'بوابة التحقق الفوري: مطابقة كل نشاط ميداني مع كارت البدء والتصاريح المطلوبة' : 'Live Authorization Gate: Activity compliance vs Start Card & PTW requirements'}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 text-start w-64">{isRtl ? 'النشاط الميداني' : 'Activity Name'}</th>
                      <th className="p-3 text-start w-48">{isRtl ? 'المشروع وحزمة العمل' : 'Project / Package'}</th>
                      <th className="p-3 text-center w-36">{isRtl ? 'كارت بدء العمل' : 'Start Card'}</th>
                      <th className="p-3 text-center w-36">{isRtl ? 'تصاريح السلامة (PTW)' : 'Required PTW'}</th>
                      <th className="p-3 text-center w-40">{isRtl ? 'حالة التفويض النهائي' : 'Authorization Status'}</th>
                      <th className="p-3 text-center w-36">{isRtl ? 'إجراء سريع' : 'Quick Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {activityEvaluations.map(({ activity, workItem, project, evalResult }) => (
                      <tr key={activity.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-slate-900 block">
                            {isRtl ? activity.nameAr : activity.nameEn}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {activity.totalQuantity} {activity.unit} • {activity.startDate || 'TBD'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block">
                            {isRtl ? workItem?.nameAr : workItem?.nameEn}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {isRtl ? project?.nameAr : project?.nameEn}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {evalResult.hasStartCard ? (
                            <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {evalResult.startCardStatus}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              {isRtl ? 'غير متوفر' : 'Missing'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {evalResult.isPtwRequired ? (
                            evalResult.isPtwApproved ? (
                              <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {evalResult.ptwStatus}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {evalResult.ptwStatus}
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                              {isRtl ? 'غير مطلوب' : 'Not Required'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 border ${
                            evalResult.isAuthorized 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {evalResult.isAuthorized ? <Unlock className="w-3.5 h-3.5 text-emerald-700" /> : <Lock className="w-3.5 h-3.5 text-rose-700" />}
                            <span>{evalResult.isAuthorized ? (isRtl ? 'مصرح بالبدء' : 'AUTHORIZED') : (isRtl ? 'محظور البدء' : 'LOCKED')}</span>
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {!evalResult.hasStartCard ? (
                            <button
                              onClick={handleOpenNewStartCard}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-xs"
                            >
                              {isRtl ? 'إصدار كارت' : '+ Start Card'}
                            </button>
                          ) : !evalResult.isPtwApproved && evalResult.isPtwRequired ? (
                            <button
                              onClick={handleOpenNewPermit}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold shadow-xs"
                            >
                              {isRtl ? 'إصدار تصريح' : '+ PTW'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-bold">
                              {isRtl ? 'جاهز للتنفيذ' : 'Ready to Start'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Trail */}
        {activeMainTab === 'audit' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 font-bold text-xs text-slate-700 border-b border-slate-200">
              {isRtl ? 'سجل العمليات والاعتمادات والتعديلات الزمنية' : 'Live System Audit & Approval Trail'}
            </div>
            <div className="divide-y divide-slate-100 bg-white">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {isRtl ? 'لا توجد سجلات تدقيق حتى الآن' : 'No audit records yet'}
                </div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50/80">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center font-bold">
                        {log.recordType === 'StartCard' ? 'SC' : 'PTW'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{log.recordNumber}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                            log.action === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            log.action === 'Rejected' || log.action === 'Suspended' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                            'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {log.action}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">{log.comments}</p>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="font-semibold text-slate-800 block">{log.userName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp.substring(0, 16).replace('T', ' ')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Start Card Modal */}
      <AnimatePresence>
        {isStartCardModalOpen && (
          <StartCardModal
            isOpen={isStartCardModalOpen}
            onClose={() => setIsStartCardModalOpen(false)}
            startCard={editingStartCard}
            projects={projects}
            workItems={workItems}
            activities={activities}
            settings={settings}
            userRoles={userRoles}
            currentUserName={currentUserName}
            onSave={onSaveStartCard}
            onLogAudit={onLogAudit}
            lang={lang}
          />
        )}
      </AnimatePresence>

      {/* Permit to Work Modal */}
      <AnimatePresence>
        {isPermitModalOpen && (
          <PermitModal
            isOpen={isPermitModalOpen}
            onClose={() => setIsPermitModalOpen(false)}
            permit={editingPermit}
            startCards={startCards}
            permitTypes={permitTypes}
            projects={projects}
            workItems={workItems}
            activities={activities}
            workers={workers}
            equipment={equipment}
            materials={materials}
            settings={settings}
            userRoles={userRoles}
            currentUserName={currentUserName}
            onSave={onSavePermit}
            onLogAudit={onLogAudit}
            lang={lang}
          />
        )}
      </AnimatePresence>

      {/* Official Print & PDF Preview Modal */}
      <AnimatePresence>
        {printModalState.isOpen && (
          <PTWPrintPreviewModal
            isOpen={printModalState.isOpen}
            onClose={() => setPrintModalState(prev => ({ ...prev, isOpen: false }))}
            type={printModalState.type}
            permit={printModalState.permit}
            startCard={printModalState.startCard}
            settings={settings}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PTWManagementPanel;
