/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StartWorkRecord, Activity, WorkItem, Project, SystemSettings, ApprovalStep } from '../../types';
import { DEFAULT_START_WORK_PRECONDITIONS } from '../../utils/ptwCalculations';
import { StartWorkPrintableDoc } from './StartWorkPrintableDoc';
import { exportElementToPdf, printDocumentElement } from '../../utils/pdf/UniversalPdfEngine';
import { X, Printer, Download, CheckCircle2, ShieldCheck, AlertTriangle, Plus, FileText, Check, Shield } from 'lucide-react';

interface StartWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  startWork: StartWorkRecord | null;
  activityId?: string;
  activities: Activity[];
  workItems: WorkItem[];
  projects: Project[];
  settings: SystemSettings;
  lang: 'ar' | 'en';
  onSave: (record: StartWorkRecord) => void;
}

export const StartWorkModal: React.FC<StartWorkModalProps> = ({
  isOpen,
  onClose,
  startWork,
  activityId,
  activities,
  workItems,
  projects,
  settings,
  lang,
  onSave
}) => {
  const isRtl = lang === 'ar';

  const selectedActivity = activities.find(a => a.id === (startWork?.activityId || activityId));
  const selectedWorkItem = workItems.find(w => w.id === selectedActivity?.workItemId);
  const selectedProject = projects.find(p => p.id === selectedWorkItem?.projectId);

  const [formData, setFormData] = useState<Partial<StartWorkRecord>>({
    startWorkNumber: `STW-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    revision: 1,
    projectId: selectedProject?.id || 'proj-1',
    workItemId: selectedWorkItem?.id || 'wi-1',
    activityId: selectedActivity?.id || activityId || 'act-1',
    projectNameEn: selectedProject?.nameEn || 'Main Infrastructure Project',
    projectNameAr: selectedProject?.nameAr || 'مشروع البنية التحتية الرئيسي',
    projectNumber: selectedProject?.projectNumber || 'PRJ-001',
    areaLocationEn: selectedActivity?.locationEn || 'Zone A - Foundation Level',
    areaLocationAr: selectedActivity?.locationAr || 'المنطقة أ - مستوى الأساسات',
    workPackageCode: selectedWorkItem?.code || 'WP-01',
    contractorEn: settings.companyNameEn || 'National Contracting Co.',
    contractorAr: settings.companyNameAr || 'شركة المقاولات الوطنية',
    supervisorName: 'Eng. Khaled Al-Otaibi',
    plannedStartDate: new Date().toISOString().split('T')[0],
    plannedStartTime: '08:00',
    workforceCount: selectedActivity?.allocatedWorkers?.length || 10,
    equipmentDetails: 'Mobile Crane 50T, Excavator CAT 320, Compactor',
    specialInstructions: 'Ensure strict compliance with HSE safety protocols and barricade perimeter.',
    preconditions: DEFAULT_START_WORK_PRECONDITIONS.map(p => ({
      ...p,
      isMet: true
    })),
    isReadyToStart: true,
    approvals: [
      { id: 'app-1', order: 1, roleNameEn: 'HSE Safety Officer', roleNameAr: 'مسؤول السلامة والبيئة', status: 'Approved', approverName: 'Fahad Al-Harbi', decisionDate: new Date().toISOString().split('T')[0], decisionTime: '07:30' },
      { id: 'app-2', order: 2, roleNameEn: 'QA/QC Inspector', roleNameAr: 'مفتش ضبط الجودة', status: 'Approved', approverName: 'Saeed Al-Ghamdi', decisionDate: new Date().toISOString().split('T')[0], decisionTime: '07:45' },
      { id: 'app-3', order: 3, roleNameEn: 'Project Site Manager', roleNameAr: 'مدير تنفيذ المشروع', status: 'Approved', approverName: 'Eng. Tariq Mansour', decisionDate: new Date().toISOString().split('T')[0], decisionTime: '08:00' }
    ],
    status: 'Ready to Start'
  });

  useEffect(() => {
    if (startWork) {
      setFormData(startWork);
    } else if (selectedActivity) {
      setFormData(prev => ({
        ...prev,
        activityId: selectedActivity.id,
        areaLocationEn: selectedActivity.locationEn || prev.areaLocationEn,
        areaLocationAr: selectedActivity.locationAr || prev.areaLocationAr,
        workforceCount: selectedActivity.allocatedWorkers?.length || prev.workforceCount
      }));
    }
  }, [startWork, selectedActivity]);

  if (!isOpen) return null;

  const handlePreconditionToggle = (id: string) => {
    const updated = (formData.preconditions || []).map(p => 
      p.id === id ? { ...p, isMet: !p.isMet } : p
    );
    const allMet = updated.every(p => p.isMet);
    setFormData(prev => ({
      ...prev,
      preconditions: updated,
      isReadyToStart: allMet,
      status: allMet ? 'Ready to Start' : 'Pending Approval'
    }));
  };

  const handleSave = () => {
    const record: StartWorkRecord = {
      id: startWork?.id || `stw-${Date.now()}`,
      startWorkNumber: formData.startWorkNumber || 'STW-2026-0001',
      revision: formData.revision || 1,
      projectId: formData.projectId || 'proj-1',
      workItemId: formData.workItemId || 'wi-1',
      activityId: formData.activityId || 'act-1',
      permitId: formData.permitId,
      projectNameEn: formData.projectNameEn || 'Project',
      projectNameAr: formData.projectNameAr || 'المشروع',
      projectNumber: formData.projectNumber || 'PRJ-001',
      areaLocationEn: formData.areaLocationEn || 'Area',
      areaLocationAr: formData.areaLocationAr || 'المنطقة',
      workPackageCode: formData.workPackageCode,
      contractorEn: formData.contractorEn || 'Contractor',
      contractorAr: formData.contractorAr || 'المقاول',
      supervisorName: formData.supervisorName || 'Supervisor',
      plannedStartDate: formData.plannedStartDate || new Date().toISOString().split('T')[0],
      plannedStartTime: formData.plannedStartTime || '08:00',
      workforceCount: formData.workforceCount || 1,
      equipmentDetails: formData.equipmentDetails,
      materialsDetails: formData.materialsDetails,
      specialInstructions: formData.specialInstructions,
      preconditions: formData.preconditions || [],
      isReadyToStart: formData.isReadyToStart || false,
      approvals: formData.approvals || [],
      currentApprovalIndex: formData.currentApprovalIndex || 0,
      status: formData.status || 'Ready to Start',
      createdAt: startWork?.createdAt || new Date().toISOString(),
      createdBy: startWork?.createdBy || 'System Admin'
    };
    onSave(record);
    onClose();
  };

  const currentRecordObject: StartWorkRecord = {
    id: startWork?.id || 'preview-id',
    startWorkNumber: formData.startWorkNumber || 'STW-2026-0001',
    revision: formData.revision || 1,
    projectId: formData.projectId || 'proj-1',
    workItemId: formData.workItemId || 'wi-1',
    activityId: formData.activityId || 'act-1',
    projectNameEn: formData.projectNameEn || 'Project',
    projectNameAr: formData.projectNameAr || 'المشروع',
    projectNumber: formData.projectNumber || 'PRJ-001',
    areaLocationEn: formData.areaLocationEn || 'Area',
    areaLocationAr: formData.areaLocationAr || 'المنطقة',
    contractorEn: formData.contractorEn || 'Contractor',
    contractorAr: formData.contractorAr || 'المقاول',
    supervisorName: formData.supervisorName || 'Supervisor',
    plannedStartDate: formData.plannedStartDate || new Date().toISOString().split('T')[0],
    plannedStartTime: formData.plannedStartTime || '08:00',
    workforceCount: formData.workforceCount || 1,
    preconditions: formData.preconditions || [],
    isReadyToStart: formData.isReadyToStart || false,
    approvals: formData.approvals || [],
    currentApprovalIndex: 0,
    status: formData.status || 'Ready to Start',
    createdAt: new Date().toISOString(),
    createdBy: 'System'
  };

  const handlePrintOrDownload = async (action: 'print' | 'pdf') => {
    if (action === 'print') {
      printDocumentElement(`start-work-print-${currentRecordObject.id}`);
    } else {
      try {
        await exportElementToPdf(`start-work-print-${currentRecordObject.id}`, {
          filename: `${formData.startWorkNumber || 'StartWork'}.pdf`,
          isRtl
        });
      } catch (e) {
        console.error('PDF Export failed:', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-100 flex flex-col max-h-[92vh] animate-scaleIn">
        {/* Header */}
        <div className="bg-[#040957] text-white p-4 rounded-t-2xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wide">
                {isRtl ? 'إدارة محضر وبدء الأعمال الإنشائية (Start Work Record)' : 'Start Work & Pre-Execution Authorization'}
              </h3>
              <p className="text-[10px] text-blue-200">
                {isRtl ? `الرقم المرجعي: ${formData.startWorkNumber}` : `Ref: ${formData.startWorkNumber}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrintOrDownload('print')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isRtl ? 'طباعة رسمية' : 'Print Official'}</span>
            </button>
            <button
              onClick={() => handlePrintOrDownload('pdf')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRtl ? 'تنزيل PDF' : 'Download PDF'}</span>
            </button>
            <button onClick={onClose} className="text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-xl transition cursor-pointer ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body content with tabs or split view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
          {/* Form Editor Column */}
          <div className="p-6 overflow-y-auto space-y-5 text-right md:text-right border-l border-slate-200">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-200">
              {isRtl ? '1. بيانات الموقع والمشرف والعمالة' : '1. Site, Supervisor & Resources'}
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">{isRtl ? 'رقم المحضر:' : 'STW Number:'}</label>
                <input
                  type="text"
                  value={formData.startWorkNumber || ''}
                  onChange={e => setFormData({ ...formData, startWorkNumber: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">{isRtl ? 'المشرف المسؤول:' : 'Site Supervisor:'}</label>
                <input
                  type="text"
                  value={formData.supervisorName || ''}
                  onChange={e => setFormData({ ...formData, supervisorName: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">{isRtl ? 'المنطقة أو الموقع:' : 'Area / Location:'}</label>
                <input
                  type="text"
                  value={formData.areaLocationEn || ''}
                  onChange={e => setFormData({ ...formData, areaLocationEn: e.target.value, areaLocationAr: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">{isRtl ? 'عدد العمالة بالموقع:' : 'Workforce Count:'}</label>
                <input
                  type="number"
                  value={formData.workforceCount || 1}
                  onChange={e => setFormData({ ...formData, workforceCount: parseInt(e.target.value) || 1 })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">{isRtl ? 'المعدات والآليات المستخدمة:' : 'Equipment & Machinery:'}</label>
              <input
                type="text"
                value={formData.equipmentDetails || ''}
                onChange={e => setFormData({ ...formData, equipmentDetails: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider pt-3 pb-2 border-b border-slate-200">
              {isRtl ? '2. قائمة الشروط المسبقة وبنود الجاهزية (Pre-Conditions)' : '2. Mandatory Pre-Conditions Checklist'}
            </h4>

            <div className="space-y-2">
              {(formData.preconditions || []).map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handlePreconditionToggle(item.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    item.isMet ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' : 'bg-rose-50/50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs ${
                      item.isMet ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {item.isMet ? '✓' : '✕'}
                    </span>
                    <span className="text-xs font-bold">{isRtl ? item.titleAr : item.titleEn}</span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    item.isMet ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                  }`}>
                    {item.isMet ? (isRtl ? 'مستوفي' : 'PASS') : (isRtl ? 'معلق' : 'PENDING')}
                  </span>
                </div>
              ))}
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              formData.isReadyToStart ? 'bg-emerald-100 border-emerald-300 text-emerald-950' : 'bg-amber-100 border-amber-300 text-amber-950'
            }`}>
              <span className="font-extrabold text-xs">
                {formData.isReadyToStart ? (isRtl ? 'الحالة النهائية: مستعد للبدء (READY TO START)' : 'Status: READY TO START') : (isRtl ? 'الحالة النهائية: غير مستعد (NOT READY)' : 'Status: NOT READY')}
              </span>
              <span className="font-mono text-xs font-black">
                {formData.isReadyToStart ? 'APPROVED' : 'HOLD'}
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-[#040957] hover:bg-blue-900 text-white rounded-xl text-xs font-black transition shadow-sm cursor-pointer"
              >
                {isRtl ? 'حفظ وحفظ الاعتماد' : 'Save & Authorize Record'}
              </button>
            </div>
          </div>

          {/* Live Printable Document Preview Column */}
          <div className="bg-neutral-900 p-6 sm:p-12 overflow-y-auto hidden lg:flex flex-col items-center justify-start shadow-inner border-l border-neutral-800">
            <div className="bg-white shadow-2xl shadow-black/50 transition-transform origin-top hover:scale-[1.01] duration-300">
              <StartWorkPrintableDoc
                startWork={currentRecordObject}
                settings={settings}
                lang={lang}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
