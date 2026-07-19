/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Project, 
  WorkItem, 
  Activity, 
  SupervisorCheckIn, 
  ProgressUpdate, 
  SafetyRecord, 
  DelayRecord, 
  IssueReport, 
  UserRole,
  Worker,
  AttendanceRecord,
  SystemSettings,
  FieldWorkSubmission,
  WarehouseMaterial,
  MaterialConsumption,
  MaterialDelivery,
  FieldRequest
} from '../types';
import AttendanceReportGenerator from './AttendanceReportGenerator';
import { renderToString } from 'react-dom/server';
import { runWithOklchSanitizer } from '../utils/pdfSanitizer';
import { motion } from 'motion/react';
import { 
  Check, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  HelpCircle, 
  User, 
  UploadCloud, 
  ChevronRight, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  PenTool, 
  Camera, 
  FileText,
  FileSpreadsheet,
  X,
  Users,
  Printer,
  Copy,
  Eye,
  Edit,
  Package,
  Wrench,
  UserCheck,
  Calculator,
  Calendar,
  Truck,
  ShoppingCart
} from 'lucide-react';

interface FieldOperationsProps {
  settings: SystemSettings;
  lang: 'ar' | 'en';
  t: any;
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  progressUpdates: ProgressUpdate[];
  workers: Worker[];
  attendanceRecords: AttendanceRecord[];
  userRole: UserRole;
  onAddCheckIn: (checkIn: SupervisorCheckIn) => void;
  onAddAttendanceRecords: (records: AttendanceRecord[]) => void;
  onAddProgressUpdate: (update: ProgressUpdate) => void;
  onAddSafetyRecord: (record: SafetyRecord) => void;
  onAddDelayRecord: (record: DelayRecord) => void;
  onAddIssueReport: (report: IssueReport) => void;
  fieldSubmissions?: FieldWorkSubmission[];
  onApproveSubmission?: (submissionId: string, managerName: string) => Promise<void>;
  onRejectSubmission?: (submissionId: string, reason: string) => Promise<void>;
  currentUser?: any;
  materials: WarehouseMaterial[];
  fieldRequests?: FieldRequest[];
  onUpdateFieldRequest?: (request: FieldRequest) => Promise<void>;
}


const calculateActualHours = (start: string, end: string): number | null => {
  if (!start || !end) return null;

  const parseTime = (timeStr: string) => {
    const clean = timeStr.trim().toUpperCase();
    const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
    if (!match) {
      const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
      if (match24) {
        return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
      }
      return null;
    }
    let hr = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const ampm = match[3];

    if (ampm) {
      if (ampm === 'PM' && hr < 12) hr += 12;
      if (ampm === 'AM' && hr === 12) hr = 0;
    }
    return hr * 60 + min;
  };

  const startMin = parseTime(start);
  const endMin = parseTime(end);

  if (startMin === null || endMin === null) return null;

  let diff = endMin - startMin;
  if (diff < 0) {
    diff += 24 * 60; // Crosses midnight
  }
  return Number((diff / 60).toFixed(2));
};

export default function FieldOperations({
  settings,
  lang,
  t,
  projects,
  workItems,
  activities,
  progressUpdates,
  workers,
  attendanceRecords,
  userRole,
  onAddCheckIn,
  onAddAttendanceRecords,
  onAddProgressUpdate,
  onAddSafetyRecord,
  onAddDelayRecord,
  onAddIssueReport,
  fieldSubmissions = [],
  onApproveSubmission,
  onRejectSubmission,
  currentUser,
  materials,
  fieldRequests = [],
  onUpdateFieldRequest
}: FieldOperationsProps) {
  const isRtl = lang === 'ar';
  const isReadOnly = userRole === 'Viewer';

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  // AI Audit States
  const [auditingSubId, setAuditingSubId] = useState<string | null>(null);
  const [auditResults, setAuditResults] = useState<Record<string, {
    integrityScore: number;
    status: 'Verified' | 'Warning' | 'High Risk';
    verificationSummaryEn: string;
    verificationSummaryAr: string;
    anomalies: Array<{ typeEn: string; typeAr: string; severity: 'Low' | 'Medium' | 'High'; detailsEn: string; detailsAr: string }>;
    processImprovements: Array<{ titleEn: string; titleAr: string; descriptionEn: string; descriptionAr: string; impact: string }>;
  }>>({});
  const [auditError, setAuditError] = useState<Record<string, string>>({});
  const [auditLoadingMessage, setAuditLoadingMessage] = useState<string>('');

  const runSmartAudit = async (submission: any) => {
    setAuditingSubId(submission.id);
    setAuditError(prev => ({ ...prev, [submission.id]: '' }));
    
    const messages = isRtl 
      ? [
          'جاري فحص توافق أعداد العمالة المسجلة...',
          'جاري مقارنة الكميات المنجزة مع الحدود الإنشائية المخططة...',
          'جاري تدقيق السجلات المتقاطعة مع محاضر الأعطال والطقس...',
          'جاري صياغة التوصيات الإدارية وتحسين خطط تدارك التأخير...'
        ]
      : [
          'Analyzing workforce attendance ratios...',
          'Checking reported quantities against structural planning targets...',
          'Cross-referencing production output logs with reported delays...',
          'Generating strategic process optimization plans...'
        ];
        
    let msgIdx = 0;
    setAuditLoadingMessage(messages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setAuditLoadingMessage(messages[msgIdx]);
    }, 2000);

    try {
      const response = await fetch('/api/gemini/audit-submission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission,
          activities,
          workers
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to complete smart audit');
      }

      const result = await response.json();
      setAuditResults(prev => ({ ...prev, [submission.id]: result }));
    } catch (err: any) {
      console.error(err);
      setAuditError(prev => ({ ...prev, [submission.id]: err.message }));
    } finally {
      clearInterval(interval);
      setAuditingSubId(null);
    }
  };

  // Sub Module view tabs
  const [activeTab, setActiveTab] = useState<'checkin' | 'attendance' | 'production' | 'safety' | 'delays' | 'issues' | 'approvals' | 'requests'>('checkin');
  const [portalCopied, setPortalCopied] = useState(false);

  // Material tracking state
  const [materialDeliveries, setMaterialDeliveries] = useState<Omit<MaterialDelivery, 'id'>[]>([]);
  const [currentConsumptions, setCurrentConsumptions] = useState<MaterialConsumption[]>([]);
  const [tempMatId, setTempMatId] = useState('');
  const [tempMatQty, setTempMatQty] = useState(0);
  const [tempDelId, setTempDelId] = useState('');
  const [tempDelQty, setTempDelQty] = useState(0);


  // --- Attendance Sheet Form State ---
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workerAttendanceState, setWorkerAttendanceState] = useState<Record<string, {
    isPresent: boolean;
    status: 'Present' | 'Absent' | 'Late' | 'Sick' | 'AnnualLeave' | 'ShortLeave';
    startTime: string;
    breakTime: string;
    endTime: string;
    shiftTime: string;
    notes: string;
  }>>({});

  // Populate worker attendance defaults or load existing records
  useEffect(() => {
    // 1. Find if we already have records for this project and date
    const existingForDay = attendanceRecords.filter(
      r => r.projectId === selectedProjectId && r.date === attendanceDate
    );

    const newState: Record<string, any> = {};

    if (existingForDay.length > 0) {
      // Load existing records
      existingForDay.forEach(rec => {
        newState[rec.workerId] = {
          isPresent: rec.isPresent,
          status: rec.status || (rec.isPresent ? 'Present' : 'Absent'),
          startTime: rec.startTime,
          breakTime: rec.breakTime,
          endTime: rec.endTime,
          shiftTime: rec.shiftTime,
          notes: rec.notes || ''
        };
      });
    } else {
      // Generate default values for active workers
      workers.forEach(w => {
        if (w.status === 'Active') {
          newState[w.id] = {
            isPresent: true,
            status: 'Present',
            startTime: '07:30 AM',
            breakTime: '12:00 PM',
            endTime: '04:30 PM',
            shiftTime: isRtl ? 'شفت صباحي - ٩ ساعات' : 'Morning Shift - 9h',
            notes: ''
          };
        }
      });
    }

    setWorkerAttendanceState(newState);
  }, [selectedProjectId, attendanceDate, workers, attendanceRecords]);

  // --- 1. Supervisor Check-In Form State ---
  const [supName, setSupName] = useState('Yousef Al-Harbi');
  const [supNationalId, setSupNationalId] = useState('1098471201');
  const [supBadge, setSupBadge] = useState('BDG-8854');
  const [supTitle, setSupTitle] = useState('Senior Site General Inspector');
  const [signatureText, setSignatureText] = useState('');
  const [isSignCanvasDrawn, setIsSignCanvasDrawn] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);

  // --- 2. Progress Update (Every 2 hr) Form State ---
  const [prodWiId, setProdWiId] = useState('');
  const [prodActId, setProdActId] = useState('');
  const [prodTime, setProdTime] = useState('10:00 AM');
  const [prodCompletedQty, setProdCompletedQty] = useState(15);
  const [prodWorkersUsed, setProdWorkersUsed] = useState(4);
  const [prodNotes, setProdNotes] = useState('');
  const [simulatedFiles, setSimulatedFiles] = useState<{name: string, type: string}[]>([]);

  // Activity Details State
  const [isActivityDetailsOpen, setIsActivityDetailsOpen] = useState(false);
  const [activityForDetails, setActivityForDetails] = useState<Activity | null>(null);

  const handleOpenActivityDetails = (actId: string) => {
    const act = activities.find(a => a.id === actId);
    if (act) {
      setActivityForDetails(act);
      setIsActivityDetailsOpen(true);
    }
  };

  // --- 3. Safety Module Form State ---
  const [safeStatus, setSafeStatus] = useState<boolean>(true);
  const [safeViolations, setSafeViolations] = useState<number>(0);
  const [safeNotes, setSafeNotes] = useState('');
  const [safeActions, setSafeActions] = useState('');

  // --- 4. Delay Register State ---
  const [delayReasonAr, setDelayReasonAr] = useState('');
  const [delayReasonEn, setDelayReasonEn] = useState('');
  const [delayType, setDelayType] = useState<DelayRecord['delayType']>('Material Shortage');
  const [delayImpact, setDelayImpact] = useState<DelayRecord['impactLevel']>('Medium');
  const [delayResPlanAr, setDelayResPlanAr] = useState('');
  const [delayResPlanEn, setDelayResPlanEn] = useState('');

  // --- 5. Issues Dispatcher State ---
  const [issueTitleAr, setIssueTitleAr] = useState('');
  const [issueTitleEn, setIssueTitleEn] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePriority, setIssuePriority] = useState<IssueReport['priority']>('High');

  // General Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter nested selectors
  const projectWorkItems = workItems.filter(wi => wi.projectId === selectedProjectId);
  const currentWorkItem = workItems.find(wi => wi.id === prodWiId) || projectWorkItems[0];
  const itemActivities = activities.filter(act => act.workItemId === (currentWorkItem?.id || ''));
  const currentActivity = activities.find(a => a.id === prodActId);

  // Calculate remaining quantity for current activity
  const activityProgress = progressUpdates
    .filter(upd => upd.activityId === prodActId)
    .reduce((sum, upd) => sum + upd.completedQuantity, 0);
  
  const remainingQty = currentActivity ? Math.max(0, currentActivity.totalQuantity - activityProgress) : 0;

  // Clamp and validate completed quantity input to remain within remainingQty
  useEffect(() => {
    if (prodCompletedQty > remainingQty) {
      setProdCompletedQty(remainingQty);
    }
  }, [prodActId, remainingQty, prodCompletedQty]);

  // Calculate present workers count for current attendance date
  const presentWorkersCount = Object.values(workerAttendanceState).filter((a: any) => a.isPresent).length;

  // Clamping prodWorkersUsed if it exceeds presentWorkersCount
  useEffect(() => {
    if (prodWorkersUsed > presentWorkersCount) {
      setProdWorkersUsed(presentWorkersCount);
    }
  }, [presentWorkersCount, prodWorkersUsed]);

  // Sync state on project change
  useEffect(() => {
    if (projectWorkItems.length > 0) {
      setProdWiId(projectWorkItems[0].id);
    } else {
      setProdWiId('');
    }
  }, [selectedProjectId, workItems]);

  useEffect(() => {
    if (itemActivities.length > 0) {
      setProdActId(itemActivities[0].id);
    } else {
      setProdActId('');
    }
  }, [prodWiId, activities]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Canvas-like simple signature pad logic:
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  let drawing = false;

  useEffect(() => {
    if (activeTab === 'checkin' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#040957';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
      }
    }
  }, [activeTab]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawing = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setIsSignCanvasDrawn(true);
  };

  const stopDraw = () => {
    drawing = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSignCanvasDrawn(false);
  };

  // CheckIn submit
  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!isSignCanvasDrawn && !signatureText) {
      alert(isRtl ? 'يرجى توقيع الحقل الرقمي للمشرف' : 'Please provide or draw digital signature');
      return;
    }

    const checkInRecord: SupervisorCheckIn = {
      id: `check-${Date.now()}`,
      projectId: selectedProjectId,
      supervisorName: supName,
      nationalId: supNationalId,
      badgeNumber: supBadge,
      jobTitle: supTitle,
      signatureData: signatureText || 'Hand-drawn Ink authorized',
      timestamp: new Date().toISOString()
    };

    onAddCheckIn(checkInRecord);
    setCheckInDone(true);
    triggerToast(t.checkinSuccess);
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrintingSubmission, setIsPrintingSubmission] = useState(false);

  const handlePrintSubmissionPDF = async (submission: FieldWorkSubmission) => {
    try {
      setIsPrintingSubmission(true);
      const html2pdf = (await import('html2pdf.js')).default;
      
      const targetProj = projects.find(p => p.id === submission.projectId);
      const projectName = targetProj ? (isRtl ? targetProj.nameAr : targetProj.nameEn) : '---';

      // Build attendance table
      let attendanceHtml = '';
      if (submission.attendanceRecords && submission.attendanceRecords.length > 0) {
        attendanceHtml = `
          <div style="margin-top: 15px;">
            <h4 style="font-size: 12px; color: #040957; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">
              👥 ${isRtl ? 'كشف حضور العمالة المرفق' : 'Attached Workforce Attendance'}
            </h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: ${isRtl ? 'right' : 'left'};">${isRtl ? 'الاسم' : 'Name'}</th>
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${isRtl ? 'المهنة' : 'Profession'}</th>
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${isRtl ? 'الحالة' : 'Status'}</th>
                  <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${isRtl ? 'ملاحظات' : 'Notes'}</th>
                </tr>
              </thead>
              <tbody>
                ${submission.attendanceRecords.map(r => `
                  <tr>
                    <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold;">${r.workerName}</td>
                    <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${isRtl ? r.professionAr : r.professionEn}</td>
                    <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">
                      <span style="color: ${r.isPresent ? '#059669' : '#dc2626'}; font-weight: bold;">${r.status}</span>
                    </td>
                    <td style="padding: 6px; border: 1px solid #e2e8f0;">${r.notes || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      // Build production updates
      let productionHtml = '';
      if (submission.progressUpdates && submission.progressUpdates.length > 0) {
        productionHtml = `
          <div style="margin-top: 20px;">
            <h4 style="font-size: 12px; color: #040957; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px;">
              📊 ${isRtl ? 'تفاصيل الإنجاز والإنتاجية' : 'Production & Progress Details'}
            </h4>
            ${submission.progressUpdates.map(p => {
              const act = activities.find(a => a.id === p.activityId);
              return `
                <div style="background-color: #fcfcfc; border: 1px solid #f1f5f9; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <strong style="font-size: 11px; color: #1e293b;">${isRtl ? act?.nameAr : act?.nameEn}</strong>
                    <span style="font-size: 10px; color: #0284c7; font-weight: 800;">+${p.completedQuantity} ${act?.unit || ''}</span>
                  </div>
                  <div style="font-size: 9px; color: #64748b; display: flex; gap: 15px;">
                    <span>⏱️ ${p.time}</span>
                    <span>👷 ${p.numberOfWorkers} ${isRtl ? 'عمال' : 'workers'}</span>
                  </div>
                  ${p.notes ? `<p style="font-size: 9px; color: #475569; margin: 5px 0 0 0; font-style: italic;">Notes: ${p.notes}</p>` : ''}
                  ${p.materialConsumptions && p.materialConsumptions.length > 0 ? `
                    <div style="margin-top: 8px; padding-top: 5px; border-top: 1px dashed #e2e8f0;">
                      <span style="font-size: 8px; font-weight: bold; color: #040957; text-transform: uppercase;">${isRtl ? 'المواد المستهلكة:' : 'Materials Used:'}</span>
                      <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 3px;">
                        ${p.materialConsumptions.map(c => `
                          <span style="font-size: 8px; background-color: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px;">
                            ${isRtl ? c.materialNameAr : c.materialNameEn}: ${c.quantityUsed} ${c.unit}
                          </span>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      // Build safety/delay/issue summaries
      let extrasHtml = '';
      if (submission.safetyRecord || submission.delayRecord || submission.issueReport) {
        extrasHtml = `
          <div style="margin-top: 20px; display: grid; grid-template-cols: 1fr; gap: 15px;">
            ${submission.safetyRecord ? `
              <div style="border: 1px solid #bbf7d0; background-color: #f0fdf4; padding: 10px; border-radius: 8px;">
                <h5 style="margin: 0 0 5px 0; font-size: 10px; color: #166534;">🛡️ ${isRtl ? 'سجل السلامة' : 'Safety Record'}</h5>
                <p style="margin: 0; font-size: 9px;">${isRtl ? 'الحالة:' : 'Status:'} ${submission.safetyRecord.isSafe ? (isRtl ? 'آمن' : 'Safe') : (isRtl ? 'مخالفات' : 'Violations')}</p>
                ${submission.safetyRecord.notes ? `<p style="margin: 3px 0 0 0; font-size: 8px; color: #4b5563;">${submission.safetyRecord.notes}</p>` : ''}
              </div>
            ` : ''}
            ${submission.delayRecord ? `
              <div style="border: 1px solid #fed7aa; background-color: #fff7ed; padding: 10px; border-radius: 8px;">
                <h5 style="margin: 0 0 5px 0; font-size: 10px; color: #9a3412;">⚠️ ${isRtl ? 'سجل التأخير' : 'Delay Record'}</h5>
                <p style="margin: 0; font-size: 9px;">${isRtl ? 'السبب:' : 'Reason:'} ${isRtl ? submission.delayRecord.reasonAr : submission.delayRecord.reasonEn}</p>
                <p style="margin: 3px 0 0 0; font-size: 8px; color: #4b5563;">Impact: ${submission.delayRecord.impactLevel}</p>
              </div>
            ` : ''}
          </div>
        `;
      }

      const formattedDate = new Date(submission.timestamp).toLocaleString(isRtl ? 'ar-SA' : 'en-GB');

      const content = `
        <div style="font-family: 'Cairo', 'Inter', sans-serif; padding: 30px; direction: ${isRtl ? 'rtl' : 'ltr'}; color: #1e293b;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #040957; padding-bottom: 15px; margin-bottom: 20px;">
            <div>
              <h1 style="margin: 0; font-size: 18px; color: #040957;">${isRtl ? settings.companyNameAr : settings.companyNameEn}</h1>
              <p style="margin: 5px 0 0 0; font-size: 10px; color: #64748b;">${isRtl ? 'تقرير تفاصيل العمل الميداني والاعتماد الرقمي' : 'Official Field Work Detail & Digital Approval Report'}</p>
            </div>
            <div style="text-align: ${isRtl ? 'left' : 'right'};">
              <div style="font-size: 10px; font-weight: bold; color: #040957;">ID: ${submission.id}</div>
              <div style="font-size: 9px; color: #94a3b8;">${formattedDate}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">${isRtl ? 'المشروع' : 'Project'}</div>
              <div style="font-size: 11px; font-weight: bold; color: #1e293b;">${projectName}</div>
            </div>
            <div style="background-color: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
              <div style="font-size: 8px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">${isRtl ? 'المشرف المسؤول' : 'Responsible Supervisor'}</div>
              <div style="font-size: 11px; font-weight: bold; color: #1e293b;">${submission.supervisorName} (${submission.badgeNumber})</div>
            </div>
          </div>

          <div style="background-color: ${submission.status === 'Approved' ? '#f0fdf4' : submission.status === 'Rejected' ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${submission.status === 'Approved' ? '#bbf7d0' : submission.status === 'Rejected' ? '#fecaca' : '#fef08a'}; border-radius: 10px; padding: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: ${submission.status === 'Approved' ? '#166534' : submission.status === 'Rejected' ? '#991b1b' : '#92400e'};">
              ${isRtl ? 'حالة الطلب السحابية:' : 'Cloud Submission Status:'} ${submission.status.toUpperCase()}
            </span>
            ${submission.approvedBy ? `<span style="font-size: 9px; color: #166534; font-weight: bold;">Verified by: ${submission.approvedBy}</span>` : ''}
          </div>

          ${attendanceHtml}
          ${productionHtml}
          ${extrasHtml}

          <div style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 20px; text-align: center; font-size: 9px; color: #94a3b8;">
            ${isRtl ? 'هذا المستند تم توليده رقمياً من نظام إدارة الميدان السحابي ولا يحتاج لختم حي' : 'This document is digitally generated by the Cloud Field Management System and is officially verified.'}
          </div>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `Detail_Report_${submission.id}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(content).save();
      });

    } catch (error) {
      console.error('Submission PDF Error:', error);
      alert('Error generating PDF report.');
    } finally {
      setIsPrintingSubmission(false);
    }
  };

  const generateAttendancePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const html2pdf = (await import('html2pdf.js')).default;
      
      const currentProject = projects.find(p => p.id === selectedProjectId);
      if (!currentProject) return;

      const recordsToPrint: AttendanceRecord[] = [];
      Object.keys(workerAttendanceState).forEach((workerId) => {
        const state = workerAttendanceState[workerId];
        if (!state) return;
        const worker = workers.find(w => w.id === workerId);
        if (worker) {
          const hasTimes = state.status === 'Present' || state.status === 'Late';
          recordsToPrint.push({
            id: `print-${workerId}`,
            projectId: selectedProjectId,
            date: attendanceDate,
            workerId: workerId,
            workerName: worker.fullName,
            professionAr: worker.professionAr,
            professionEn: worker.professionEn,
            isPresent: hasTimes,
            status: state.status,
            startTime: hasTimes ? state.startTime : '',
            breakTime: hasTimes ? state.breakTime : '',
            endTime: hasTimes ? state.endTime : '',
            shiftTime: hasTimes ? state.shiftTime : '',
            supervisorName: supName,
            notes: state.notes || '',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Create a temporary container for rendering the component
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      document.body.appendChild(container);

      // Render the component to a string
      const reportHtml = renderToString(
        <AttendanceReportGenerator
          lang={lang}
          settings={settings}
          project={currentProject}
          reportDate={attendanceDate}
          attendanceRecords={recordsToPrint}
          workers={workers}
          reportNumber={`ATT-${attendanceDate.replace(/-/g, '')}-${currentProject.projectNumber}`}
          supervisorName={supName}
          preparedBy={supName}
        />
      );

      container.innerHTML = reportHtml;

      // Add tailwind for styles if needed, but the component uses classes that should already be in the bundle
      // However, for PDF generation we might need to inject the styles explicitly or use a more robust method.
      // html2pdf can capture the rendered element.
      
      const opt = {
        margin: [0, 0] as [number, number],
        filename: `${isRtl ? 'كشف_الحضور' : 'Attendance_Report'}_${attendanceDate}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(container.firstChild as HTMLElement).save();
      });
      
      document.body.removeChild(container);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert(isRtl ? 'فشل في تصدير PDF' : 'Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const exportAttendanceToExcel = () => {
    const currentProject = projects.find(p => p.id === selectedProjectId);
    if (!currentProject) return;

    const recordsToPrint: AttendanceRecord[] = [];
    Object.keys(workerAttendanceState).forEach((workerId) => {
      const state = workerAttendanceState[workerId];
      if (!state) return;
      const worker = workers.find(w => w.id === workerId);
      if (worker) {
        const hasTimes = state.status === 'Present' || state.status === 'Late';
        recordsToPrint.push({
          id: `print-${workerId}`,
          projectId: selectedProjectId,
          date: attendanceDate,
          workerId: workerId,
          workerName: worker.fullName,
          professionAr: worker.professionAr,
          professionEn: worker.professionEn,
          isPresent: hasTimes,
          status: state.status,
          startTime: hasTimes ? state.startTime : '',
          breakTime: hasTimes ? state.breakTime : '',
          endTime: hasTimes ? state.endTime : '',
          shiftTime: hasTimes ? state.shiftTime : '',
          supervisorName: supName,
          notes: state.notes || '',
          timestamp: new Date().toISOString()
        });
      }
    });

    const compEn = settings?.companyNameEn || 'Rashed Al-Subaie Contracting Co.';
    const compAr = settings?.companyNameAr || 'شركة الرشيد للمقاولات';

    const total = recordsToPrint.length;
    const present = recordsToPrint.filter(r => r.status === 'Present').length;
    const absent = recordsToPrint.filter(r => r.status === 'Absent').length;
    const late = recordsToPrint.filter(r => r.status === 'Late').length;
    const leave = recordsToPrint.filter(r => ['AnnualLeave', 'ShortLeave', 'Sick'].includes(r.status)).length;
    const hours = recordsToPrint.reduce((acc, r) => r.isPresent ? acc + 8 : acc, 0);
    const overtime = recordsToPrint.reduce((acc, r) => r.status === 'Late' ? acc + 2 : acc, 0);

    let csvContent = "";

    // Header & Company Info
    csvContent += `"${compEn} | ${compAr}"\n`;
    csvContent += `"${isRtl ? 'كشف تحضير الموظفين والعمالة اليومية المعتمد' : 'OFFICIAL DAILY EMPLOYEE ATTENDANCE SHEET & TIME LOG'}"\n`;
    csvContent += `"\n`; // spacer

    // Metadata Block
    csvContent += `"${isRtl ? 'رقم الكشف المرجعي:' : 'Roster Reference No:'}","${`ATT-${attendanceDate.replace(/-/g, '')}-${currentProject.projectNumber}`}"\n`;
    csvContent += `"${isRtl ? 'المشروع الميداني:' : 'Field Project Name:'}","${isRtl ? currentProject.nameAr : currentProject.nameEn}"\n`;
    csvContent += `"${isRtl ? 'الموقع الجغرافي:' : 'Project Location:'}","${isRtl ? currentProject.locationAr : currentProject.locationEn}"\n`;
    csvContent += `"${isRtl ? 'تاريخ التحضير المعتمد:' : 'Roster Approved Date:'}","${attendanceDate}"\n`;
    csvContent += `"${isRtl ? 'المشرف المسؤول:' : 'Responsible Supervisor:'}","${supName}"\n`;
    csvContent += `"\n`; // spacer

    // Summary Statistics Block
    csvContent += `"${isRtl ? 'ملخص إحصائيات الحضور والعمل اليومي' : 'DAILY ATTENDANCE ANALYTICS SUMMARY'}"\n`;
    csvContent += `"${isRtl ? 'إجمالي الموظفين والعمالة:' : 'Total Roster Workforce:'}","${total}"\n`;
    csvContent += `"${isRtl ? 'عدد الحضور الفعلي:' : 'Present Personnel:'}","${present}"\n`;
    csvContent += `"${isRtl ? 'عدد الغياب والمنقطعين:' : 'Absent Personnel:'}","${absent}"\n`;
    csvContent += `"${isRtl ? 'عدد المتأخرين عن العمل:' : 'Late Personnel:'}","${late}"\n`;
    csvContent += `"${isRtl ? 'حالات الإجازات المرضية والاعتيادية:' : 'On Leave/Sick:'}","${leave}"\n`;
    csvContent += `"${isRtl ? 'إجمالي ساعات العمل المنجزة:' : 'Total Production Hours:'}","${hours} h"\n`;
    csvContent += `"${isRtl ? 'إجمالي ساعات العمل الإضافي:' : 'Total Overtime Hours:'}","${overtime} h"\n`;
    csvContent += `"\n`; // spacer

    // Detailed Roster Table Header
    const header = isRtl
      ? 'الرقم,اسم الموظف بالكامل,رقم الكود الميداني,رقم الإقامة أو الهوية,المهنة بالإنجليزية,المهنة بالعربية,الحالة الحالية,وقت بدء الدوام,خروج الاستراحة,عودة الاستراحة,وقت نهاية الدوام,الوردية وساعات العمل,ملاحظات وتوجيهات المشرف الميداني\n'
      : 'No.,Employee Full Name,Field Badge ID,National/Iqama ID,Designation (English),Designation (Arabic),Attendance Status,Clock-In Time,Break Out,Break In,Clock-Out Time,Shift / Work Hours,Supervisor Roster Notes & Comments\n';

    csvContent += header;

    recordsToPrint.forEach((record, index) => {
      const worker = workers.find(w => w.id === record.workerId);
      const nationalId = worker?.nationalId || '---';
      const badgeId = worker?.badgeNumber || '---';

      let statusStr: string = record.status;
      if (isRtl) {
        switch (record.status) {
          case 'Present': statusStr = 'حاضر'; break;
          case 'Absent': statusStr = 'غائب'; break;
          case 'Late': statusStr = 'متأخر'; break;
          case 'AnnualLeave': statusStr = 'إجازة سنوية'; break;
          case 'ShortLeave': statusStr = 'إجازة قصيرة'; break;
          case 'Sick': statusStr = 'مرضي'; break;
          default: statusStr = 'عطلة'; break;
        }
      }

      // Calculate break times if present
      let breakOut = '--:--';
      let breakIn = '--:--';
      if (record.isPresent && record.breakTime) {
        breakOut = record.breakTime;
        const clean = record.breakTime.trim();
        const match = clean.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
        if (match) {
          let hrs = parseInt(match[1]);
          const mins = match[2];
          const ampm = match[3];
          let nextHrs = hrs + 1;
          let nextAmpm = ampm;
          if (ampm) {
            if (nextHrs === 12) {
              nextAmpm = ampm.toUpperCase() === 'AM' ? 'PM' : 'AM';
            } else if (nextHrs > 12) {
              nextHrs = nextHrs - 12;
            }
            breakIn = `${nextHrs.toString().padStart(2, '0')}:${mins} ${nextAmpm}`;
          } else {
            if (nextHrs >= 24) nextHrs = nextHrs - 24;
            breakIn = `${nextHrs.toString().padStart(2, '0')}:${mins}`;
          }
        }
      }

      csvContent += `"${index + 1}","${record.workerName}","${badgeId}","${nationalId}","${record.professionEn || ''}","${record.professionAr || ''}","${statusStr}","${record.startTime || '--:--'}","${breakOut}","${breakIn}","${record.endTime || '--:--'}","${record.shiftTime || ''}","${record.notes || ''}"\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Roster_${attendanceDate}_${currentProject.projectNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Attendance submit
  const handleAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const recordsToSave: AttendanceRecord[] = [];
    const nowStr = new Date().toISOString();

    Object.keys(workerAttendanceState).forEach((workerId) => {
      const state = workerAttendanceState[workerId];
      if (!state) return;
      const worker = workers.find(w => w.id === workerId);
      if (worker) {
        const hasTimes = state.status === 'Present' || state.status === 'Late';
        recordsToSave.push({
          id: `att-${Date.now()}-${workerId}`,
          projectId: selectedProjectId,
          date: attendanceDate,
          workerId: workerId,
          workerName: worker.fullName,
          professionAr: worker.professionAr,
          professionEn: worker.professionEn,
          isPresent: hasTimes,
          status: state.status,
          startTime: hasTimes ? state.startTime : '',
          breakTime: hasTimes ? state.breakTime : '',
          endTime: hasTimes ? state.endTime : '',
          shiftTime: hasTimes ? state.shiftTime : '',
          supervisorName: supName,
          notes: state.notes || '',
          timestamp: nowStr
        });
      }
    });

    if (recordsToSave.length === 0) {
      alert(isRtl ? 'لا يوجد عمال نشطين لتسجيل حضورهم' : 'No active workers found to save attendance');
      return;
    }

    onAddAttendanceRecords(recordsToSave);
    triggerToast(isRtl ? 'تم حفظ كشف الحضور والتحضير اليومي للعمالة!' : 'Worker daily attendance roster saved successfully!');

    // Automatically trigger PDF print after saving
    setTimeout(() => {
      generateAttendancePDF();
    }, 500);
  };

  // Progress Update submit
  const handleProgressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!prodActId) {
      alert(isRtl ? 'الرجاء تحديد النشاط الميداني' : 'Please select target sub-activity');
      return;
    }

    const qtyToAdd = Number(prodCompletedQty);
    if (qtyToAdd <= 0) {
      alert(isRtl ? 'الرجاء إدخال كمية صحيحة' : 'Please enter a valid quantity');
      return;
    }

    if (prodWorkersUsed > presentWorkersCount) {
      alert(isRtl 
        ? `لا يمكن أن يتجاوز عدد العمال عدد الحاضرين اليوم (${presentWorkersCount}).` 
        : `Number of workers cannot exceed present workers count (${presentWorkersCount}).`);
      return;
    }

    if (qtyToAdd > remainingQty) {
      alert(isRtl 
        ? `لا يمكن تجاوز الكمية المتبقية (${remainingQty} ${currentActivity?.unit}).` 
        : `Cannot exceed remaining quantity (${remainingQty} ${currentActivity?.unit}).`);
      return;
    }

    const updateRec: ProgressUpdate = {
      id: `upd-${Date.now()}`,
      projectId: selectedProjectId,
      workItemId: prodWiId,
      activityId: prodActId,
      reporterName: supName, // Using supervisor name as reporter
      time: prodTime,
      completedQuantity: qtyToAdd,
      numberOfWorkers: Number(prodWorkersUsed),
      equipmentUsed: ['Machinery Active'],
      materialConsumptions: currentConsumptions,
      completionPercentage: Math.round(((activityProgress + qtyToAdd) / (currentActivity?.totalQuantity || 1)) * 100),
      notes: prodNotes,
      photos: simulatedFiles.filter(f => f.type === 'photo').map(f => f.name),
      documents: simulatedFiles.filter(f => f.type === 'doc').map(f => f.name),
      timestamp: new Date().toISOString()
    };

    onAddProgressUpdate(updateRec);
    // Reset forms
    setProdNotes('');
    setCurrentConsumptions([]);
    setSimulatedFiles([]);
    triggerToast(t.updateSuccess);
  };

  const handleAddMaterialDelivery = (materialId: string, quantity: number) => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat || quantity <= 0) return;

    const delivery: Omit<MaterialDelivery, 'id'> = {
      materialId,
      materialNameEn: mat.nameEn,
      materialNameAr: mat.nameAr,
      quantityDelivered: quantity,
      unit: mat.unit,
      timestamp: new Date().toISOString(),
      activityId: prodActId
    };

    setMaterialDeliveries(prev => [...prev, delivery]);
    triggerToast(isRtl ? 'تم تسجيل توريد المادة للموقع' : 'Material delivery recorded on site');
  };

  const handleAddConsumption = (materialId: string, quantity: number) => {
    const mat = materials.find(m => m.id === materialId);
    if (!mat || quantity <= 0) return;

    // Calculate current available on site for this activity
    const delivered = materialDeliveries
      .filter(d => d.activityId === prodActId && d.materialId === materialId)
      .reduce((sum, d) => sum + d.quantityDelivered, 0);
    
    const consumedInSession = progressUpdates
      .filter(upd => upd.activityId === prodActId)
      .flatMap(upd => upd.materialConsumptions || [])
      .filter(c => c.materialId === materialId)
      .reduce((sum, c) => sum + c.quantityUsed, 0);
    
    const currentFormConsumed = currentConsumptions
      .filter(c => c.materialId === materialId)
      .reduce((sum, c) => sum + c.quantityUsed, 0);

    const availableOnSite = delivered - consumedInSession - currentFormConsumed;

    if (quantity > availableOnSite) {
      alert(isRtl 
        ? `الكمية المتوفرة في الموقع (${availableOnSite} ${mat.unit}) أقل من الكمية المطلوبة.` 
        : `Available on site (${availableOnSite} ${mat.unit}) is less than requested quantity.`);
      return;
    }

    const consumption: MaterialConsumption = {
      materialId,
      materialNameEn: mat.nameEn,
      materialNameAr: mat.nameAr,
      quantityUsed: quantity,
      unit: mat.unit
    };

    setCurrentConsumptions(prev => [...prev, consumption]);
  };

  // Safety Submit
  const handleSafetySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const safetyRec: SafetyRecord = {
      id: `safe-${Date.now()}`,
      projectId: selectedProjectId,
      isSafe: safeStatus,
      violationsCount: safeViolations,
      notes: safeNotes || 'Conducted inspection site clean.',
      correctiveActions: safeActions || 'Routine precaution.',
      timestamp: new Date().toISOString()
    };

    onAddSafetyRecord(safetyRec);
    // Reset
    setSafeNotes('');
    setSafeActions('');
    setSafeViolations(0);
    triggerToast(t.safetySuccess);
  };

  // Delay record submit
  const handleDelaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!delayReasonAr && !delayReasonEn) {
      alert(isRtl ? 'يرجى إدخال تفاصيل المانع الميداني' : 'Please input disruption parameters');
      return;
    }

    const delayRec: DelayRecord = {
      id: `del-${Date.now()}`,
      projectId: selectedProjectId,
      reasonAr: delayReasonAr,
      reasonEn: delayReasonEn,
      delayType: delayType,
      impactLevel: delayImpact,
      resolutionPlanAr: delayResPlanAr,
      resolutionPlanEn: delayResPlanEn,
      timestamp: new Date().toISOString()
    };

    onAddDelayRecord(delayRec);
    // Reset
    setDelayReasonAr('');
    setDelayReasonEn('');
    setDelayResPlanAr('');
    setDelayResPlanEn('');
    triggerToast(isRtl ? 'تم بث محضر التعطيل، وإعادة موازنة محرك التخطيط' : 'Delay log dispatched; smart schedule models updated');
  };

  // Issue report submit
  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!issueTitleEn || !issueTitleAr) {
      alert(isRtl ? 'يرجى كتابة عنوان المعوق الطارئ' : 'Please complete issue titles');
      return;
    }

    const rep: IssueReport = {
      id: `iss-${Date.now()}`,
      projectId: selectedProjectId,
      titleAr: issueTitleAr,
      titleEn: issueTitleEn,
      description: issueDesc,
      priority: issuePriority,
      photos: [],
      isApproved: false, // PM will review and approve
      timestamp: new Date().toISOString()
    };

    onAddIssueReport(rep);
    // Reset
    setIssueTitleAr('');
    setIssueTitleEn('');
    setIssueDesc('');
    triggerToast(isRtl ? 'تم رفع البلاغ وبث تنبيه فوري لمدير المشروع' : 'Issue ticket dispatched for emergency review');
  };

  // Simulate file click uploading
  const triggerFileSimulation = (type: 'photo' | 'doc') => {
    const names = type === 'photo' 
      ? ['IMG_BOREHOLE_4A.PNG', 'CONCRETE_SLUMP_SAMPLE.JPG', 'EXCAVATOR_CAT4.JPEG']
      : ['MATERIAL_MILL_CERTIFICATE.PDF', 'ULTRASONIC_INTEGRITY_LOG.XLSX', 'BAR_BENDING_LIST.PDF'];
    
    const randomName = names[Math.floor(Math.random() * names.length)];
    setSimulatedFiles([...simulatedFiles, { name: `${Date.now().toString().slice(-4)}_${randomName}`, type }]);
  };

  return (
    <div id="field-operations-root" className="bg-[#F1F1F1] p-0 rounded-2xl overflow-hidden shadow-sm border border-gray-200">
      {/* PDF Generation Overlay */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 border border-slate-200"
          >
            <div className="relative text-[#040957]">
              <div className="w-16 h-16 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
              <Printer className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-[#040957] uppercase tracking-widest mb-2">
                {isRtl ? 'جاري تصدير التقرير' : 'Generating Report'}
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">
                {isRtl ? 'يرجى الانتظار، يتم معالجة البيانات...' : 'Please wait, processing data...'}
              </p>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed bottom-5 ${isRtl ? 'left-5' : 'right-5'} z-50 bg-emerald-600 border border-emerald-500 text-white py-3 px-5 rounded-xl shadow-2xl flex items-center gap-3 animate-slideIn`}>
          <CheckCircle className="w-5 h-5 text-white animate-spin" />
          <span className="text-xs font-bold font-sans">{toastMessage}</span>
        </div>
      )}

      {/* Blue Header Site Tablet banner */}
      <div className="bg-white border-b border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] bg-blue-50 border border-blue-100 text-[#0080FF] py-1 px-3 rounded-full font-bold uppercase tracking-wider">
            {isRtl ? 'نظام التحكم والمراقبة اللوحي بالموقع' : 'Site Field Tablet Controller'}
          </span>
          <h2 className="text-xl font-black mt-2 font-sans text-[#040957]">
            {t.fieldDashboard}
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            {isRtl ? 'تحديث فوري كل ساعتين، إمضاء حضور، رصد مخالفات هاس، وتسجيل المعوقات' : 'Continuous 2-hour logs, safety compliance seals, and delay audits'}
          </p>
        </div>

        {/* Project Selector inside controller */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 hidden md:inline">{isRtl ? 'المشروع القائم' : 'Focused project'}:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-50 text-slate-800 font-bold border border-gray-200 py-1.5 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#0080FF] cursor-pointer"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id} className="text-[#040957]">
                {isRtl ? p.nameAr : p.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Under-header Operations Selector Buttons */}
      <div className="bg-slate-50/50 border-b border-gray-200 p-2.5 flex flex-wrap gap-1.5 scrollbar-thin">
        <button
          onClick={() => setActiveTab('checkin')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${activeTab === 'checkin' ? 'bg-blue-50 border-blue-200 text-[#0080FF] font-extrabold shadow-xs' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{isRtl ? '١. توقيع حضور المشرف' : '1. Supervisor Verify'}</span>
        </button>

        <button
          onClick={() => setActiveTab('production')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${activeTab === 'production' ? 'bg-blue-50 border-blue-200 text-[#0080FF] font-extrabold shadow-xs' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isRtl ? '٢. تحديز الإنجاز (ساعتين)' : '2. Production Input'}</span>
        </button>

        <button
          onClick={() => setActiveTab('safety')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${activeTab === 'safety' ? 'bg-blue-50 border-blue-200 text-[#0080FF] font-extrabold shadow-xs' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{isRtl ? '٣. تدقيق السلامة EHS' : '3. Safety Audit'}</span>
        </button>

        <button
          onClick={() => setActiveTab('delays')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${activeTab === 'delays' ? 'bg-blue-50 border-blue-200 text-[#0080FF] font-extrabold shadow-xs' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{isRtl ? '٤. سجل تأخيرات الموقع' : '4. Delays Registrar'}</span>
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${activeTab === 'issues' ? 'bg-blue-50 border-blue-200 text-[#0080FF] font-extrabold shadow-xs' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{isRtl ? '٥. شكاوي وبلاغات معوقة' : '5. Issue Dispatcher'}</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${activeTab === 'attendance' ? 'bg-blue-50 border-blue-200 text-[#0080FF] font-extrabold shadow-xs' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{isRtl ? '٦. تحضير الموظفين والعمالة' : '6. Employee Attendance'}</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 relative border cursor-pointer ${activeTab === 'requests' ? 'bg-blue-50 border-blue-200 text-[#0080FF] font-extrabold shadow-xs' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>{isRtl ? 'طلبات الموارد الميدانية' : 'Field Resource Requests'}</span>
          {fieldRequests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="bg-[#0080FF] text-white text-[9px] rounded-full px-1.5 py-0.5 font-black shrink-0">
              {fieldRequests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 relative border cursor-pointer ${activeTab === 'approvals' ? 'bg-blue-50 border-blue-200 text-[#0080FF] font-extrabold shadow-xs' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
        >
          <span>⭐</span>
          <span>{isRtl ? 'اعتمادات العمل الميداني' : 'Field Approvals Queue'}</span>
          {fieldSubmissions.filter(s => s.status === 'Pending').length > 0 && (
            <span className="bg-red-500 text-white text-[9px] rounded-full px-1.5 py-0.5 font-black animate-bounce shrink-0">
              {fieldSubmissions.filter(s => s.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>


      {/* Main Form container space */}
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs max-w-3xl mx-auto">
          
          {/* ReadOnly warnings */}
          {isReadOnly && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold p-3 rounded-xl mb-4 leading-relaxed">
              🔐 {isRtl 
                ? 'حظر الهوية: أنت مسجل حالياً בצلاحية مراجعة فقط. لا يمكن إدخال الإنجاز الفعلي أو التوقيع لحماية قاعدة البيانات من العينات العشوائية.'
                : 'Security Alert: You are viewing this tablet with ready-only clearances. Digital signatures and progressive audits are temporarily locked.'}
            </div>
          )}

          {/* TAB 1: SUPERVISOR CHECK-IN */}
          {activeTab === 'checkin' && (
            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-extrabold text-base text-[#040957] font-sans flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-[#0080FF]" />
                  {t.supervisorCheckin}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{isRtl ? 'إقرار الحضور والمطابقة للتصنيفات الهندسية والامتثال المهني يومياً' : 'Formal certification of site readiness and safety compliance'}</p>
              </div>

              {checkInDone ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                  <h4 className="font-bold text-emerald-800 text-sm">{isRtl ? 'تم توقيع حضورك بنجاح!' : 'Attendance Authenticated successfully'}</h4>
                  <p className="text-xs text-emerald-600">{isRtl ? `الاسم: ${supName} | الشارة: ${supBadge}` : `Name: ${supName} | Badge ID: ${supBadge}`}</p>
                  <button 
                    type="button" 
                    onClick={() => setCheckInDone(false)}
                    className="text-xs text-[#040957] font-bold underline hover:text-[#0080FF]"
                  >
                    {isRtl ? 'إعادة التوقيع مجدداً' : 'Re-verify Signature'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500">{t.supervisorName}</label>
                      <input 
                        type="text" 
                        value={supName}
                        onChange={(e) => setSupName(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500">{t.nationalId}</label>
                      <input 
                        type="text" 
                        value={supNationalId}
                        onChange={(e) => setSupNationalId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500">{t.badgeNumber}</label>
                      <input 
                        type="text" 
                        value={supBadge}
                        onChange={(e) => setSupBadge(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500">{t.jobTitle}</label>
                      <input 
                        type="text" 
                        value={supTitle}
                        onChange={(e) => setSupTitle(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2 text-xs"
                      />
                    </div>
                  </div>

                  {/* Draw Signature Pad Component */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500">{t.supervisorSignature}</label>
                    <div className="border border-gray-300 rounded-xl overflow-hidden bg-gray-50 flex flex-col items-center p-3">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={120}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        className="bg-white border border-gray-200 rounded-lg cursor-crosshair max-w-full"
                      />
                      <div className="flex gap-4 w-full mt-2 justify-between items-center text-xs">
                        <button 
                          type="button" 
                          onClick={clearCanvas} 
                          className="text-red-500 hover:underline font-bold"
                        >
                          {isRtl ? 'تنظيف التوقيع ممسوحاً' : 'Clear drawing'}
                        </button>
                        <span className="text-gray-400 text-[10px] italic">
                          {isRtl ? '* حرك الفأرة/الإصبع للرقم في المربع أعلاه للتوقيع الرقمي.' : '* Use mouse/touch screen to draw digital ink signature.'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 mt-2">
                      <label className="block text-[10px] font-bold text-gray-400">{isRtl ? 'أو اكتب توقيعاً كتابياً بديلاً' : 'Or type a structured token signature alternatively'}</label>
                      <input 
                        type="text" 
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        placeholder="Yousef.AlHarbi.ExecSign"
                        className="w-full border border-gray-200 rounded-xl p-2 text-xs font-semibold font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isReadOnly}
                      className="w-full bg-[#040957] hover:bg-[#0080FF] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm"
                    >
                      {t.checkinBtn}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* TAB: EMPLOYEE ATTENDANCE */}
          {activeTab === 'attendance' && (
            <form onSubmit={handleAttendanceSubmit} className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-[#040957] font-sans flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#0080FF]" />
                    {isRtl ? 'كشف تحضير الموظفين والعمالة اليومية' : 'Daily Employee Attendance Sheet'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isRtl ? 'تحضير العمال والموظفين الميدانيين وإدخال ساعات العمل والاستراحات والشفتات' : 'Roster tracking, clock-in, breaks, clock-out and shift logs'}
                  </p>
                </div>
                {/* Actions & Date Picker */}
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={generateAttendancePDF}
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#0080FF] border border-[#0080FF]/30 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    {isRtl ? 'طباعة كشف الحضور (PDF)' : 'Print Attendance (PDF)'}
                  </button>

                  <button
                    type="button"
                    onClick={exportAttendanceToExcel}
                    className="flex items-center gap-2 bg-white hover:bg-gray-50 text-emerald-600 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    {isRtl ? 'تحميل إكسل (Excel)' : 'Download Excel (XLSX)'}
                  </button>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-500 font-sans">{isRtl ? 'تاريخ التحضير:' : 'Roster Date:'}</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="border border-gray-200 rounded-xl p-1.5 text-xs font-bold text-[#040957] outline-none focus:ring-2 focus:ring-[#0080FF] font-sans"
                    />
                  </div>
                </div>
              </div>

              {workers.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 font-bold font-sans">
                  ⚠️ {isRtl ? 'لا توجد قوى بشرية مسجلة في النظام.' : 'No workforce registered in the system.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Supervisor Indicator */}
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-center justify-between text-xs font-sans">
                    <span className="text-gray-500">
                      👤 {isRtl ? 'المشرف المسؤول عن التحضير:' : 'Responsible Supervisor:'}{' '}
                      <strong className="text-[#040957]">{supName}</strong>
                    </span>
                    <span className="text-gray-400 font-mono text-[10px]">
                      {attendanceDate}
                    </span>
                  </div>

                  {/* Workers Table/List */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
                    {workers.map(worker => {
                      const wState = workerAttendanceState[worker.id] || {
                        isPresent: true,
                        status: 'Present',
                        startTime: '07:30 AM',
                        breakTime: '12:00 PM',
                        endTime: '04:30 PM',
                        shiftTime: isRtl ? 'شفت صباحي - ٩ ساعات' : 'Morning Shift - 9h',
                        notes: ''
                      };

                      const updateWorkerState = (key: string, value: any) => {
                        setWorkerAttendanceState(prev => {
                          const currentWorkerState = prev[worker.id] || {
                            isPresent: true,
                            status: 'Present',
                            startTime: '07:30 AM',
                            breakTime: '12:00 PM',
                            endTime: '04:30 PM',
                            shiftTime: isRtl ? 'شفت صباحي - ٩ ساعات' : 'Morning Shift - 9h',
                            notes: ''
                          };
                          const updated = {
                            ...currentWorkerState,
                            [key]: value
                          };

                          if (key === 'startTime' || key === 'endTime') {
                            const actualHrs = calculateActualHours(updated.startTime, updated.endTime);
                            if (actualHrs !== null) {
                              updated.shiftTime = isRtl 
                                ? `مخصص - ${actualHrs} ساعات` 
                                : `Custom - ${actualHrs} hours`;
                            }
                          }
                          return {
                            ...prev,
                            [worker.id]: updated
                          };
                        });
                      };

                      return (
                        <div key={worker.id} className="p-4 flex flex-col gap-3 transition hover:bg-gray-50/50">
                          {/* Worker Header Info */}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-[#040957]">
                                {worker.fullName}
                              </span>
                              <span className="text-[10px] bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full font-bold font-mono">
                                {worker.badgeNumber}
                              </span>
                            </div>

                            {/* Attendance Status Selector */}
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] font-bold text-gray-400 font-sans">{isRtl ? 'الحالة اليومية:' : 'Daily Status:'}</label>
                              <select
                                value={wState.status || (wState.isPresent ? 'Present' : 'Absent')}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  const hasTimes = val === 'Present' || val === 'Late';
                                  setWorkerAttendanceState(prev => ({
                                    ...prev,
                                    [worker.id]: {
                                      ...wState,
                                      status: val,
                                      isPresent: hasTimes
                                    }
                                  }));
                                }}
                                className="border border-gray-200 rounded-lg py-1 px-2 text-xs font-bold text-[#040957] bg-white focus:ring-2 focus:ring-[#0080FF] focus:border-[#0080FF] outline-none"
                              >
                                <option value="Present">🟢 {isRtl ? 'حضور' : 'Present'}</option>
                                <option value="Absent">🔴 {isRtl ? 'غياب' : 'Absent'}</option>
                                <option value="Late">🟡 {isRtl ? 'تأخير' : 'Late'}</option>
                                <option value="Sick">🤢 {isRtl ? 'مريض' : 'Sick'}</option>
                                <option value="AnnualLeave">🌴 {isRtl ? 'إجازة سنوية' : 'Annual Leave'}</option>
                                <option value="ShortLeave">⏱️ {isRtl ? 'إجازة قصيرة' : 'Short Leave'}</option>
                              </select>
                            </div>
                          </div>

                          {/* Worker details: Profession */}
                          <div className="text-[11px] text-gray-500 font-semibold -mt-1">
                            💼 {isRtl ? worker.professionAr : worker.professionEn}
                          </div>

                          {/* Attendance Fields (visible only if present) */}
                          {wState.isPresent && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 ml-6">
                              {/* Start Time */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-400">{isRtl ? 'بدء العمل' : 'Start Time'}</label>
                                <select
                                  value={wState.startTime}
                                  onChange={(e) => updateWorkerState('startTime', e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg p-1.5 text-xs text-[#040957] font-semibold bg-white cursor-pointer focus:ring-2 focus:ring-[#0080FF] focus:border-transparent outline-none"
                                >
                                  {(() => {
                                    const standardStarts = ["06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM", "09:00 AM", "06:00 PM", "07:00 PM", "08:00 PM"];
                                    const showCustom = wState.startTime && !standardStarts.includes(wState.startTime);
                                    return (
                                      <>
                                        {standardStarts.map((t) => (
                                          <option key={t} value={t}>{t}</option>
                                        ))}
                                        {showCustom && (
                                          <option value={wState.startTime}>{wState.startTime} (Custom)</option>
                                        )}
                                      </>
                                    );
                                  })()}
                                </select>
                              </div>

                              {/* Break Time */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-400">{isRtl ? 'وقت الاستراحة' : 'Break Time'}</label>
                                <select
                                  value={wState.breakTime}
                                  onChange={(e) => updateWorkerState('breakTime', e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg p-1.5 text-xs text-[#040957] font-semibold bg-white cursor-pointer focus:ring-2 focus:ring-[#0080FF] focus:border-transparent outline-none"
                                >
                                  {(() => {
                                    const standardBreaks = ["11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "10:00 PM", "11:00 PM", "12:00 AM"];
                                    const showCustom = wState.breakTime && !standardBreaks.includes(wState.breakTime);
                                    return (
                                      <>
                                        {standardBreaks.map((t) => (
                                          <option key={t} value={t}>{t}</option>
                                        ))}
                                        {showCustom && (
                                          <option value={wState.breakTime}>{wState.breakTime} (Custom)</option>
                                        )}
                                      </>
                                    );
                                  })()}
                                </select>
                              </div>

                              {/* End Time */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-400">{isRtl ? 'انتهاء العمل' : 'End Time'}</label>
                                <select
                                  value={wState.endTime}
                                  onChange={(e) => updateWorkerState('endTime', e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg p-1.5 text-xs text-[#040957] font-semibold bg-white cursor-pointer focus:ring-2 focus:ring-[#0080FF] focus:border-transparent outline-none"
                                >
                                  {(() => {
                                    const standardEnds = ["03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "07:00 PM", "02:00 AM", "03:00 AM", "04:00 AM", "05:00 AM"];
                                    const showCustom = wState.endTime && !standardEnds.includes(wState.endTime);
                                    return (
                                      <>
                                        {standardEnds.map((t) => (
                                          <option key={t} value={t}>{t}</option>
                                        ))}
                                        {showCustom && (
                                          <option value={wState.endTime}>{wState.endTime} (Custom)</option>
                                        )}
                                      </>
                                    );
                                  })()}
                                </select>
                              </div>

                              {/* Shift Time */}
                              <div className="space-y-1">
                                <label className="block text-[10px] font-bold text-gray-400">{isRtl ? 'وقت الشفت' : 'Shift Time'}</label>
                                <select
                                  value={wState.shiftTime}
                                  onChange={(e) => updateWorkerState('shiftTime', e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg p-1.5 text-xs text-[#040957] font-semibold bg-white"
                                >
                                  {isRtl ? (
                                    <>
                                      <option value="شفت صباحي - ٩ ساعات">صباحي (٩ ساعات)</option>
                                      <option value="شفت مسائي - ٩ ساعات">مسائي (٩ ساعات)</option>
                                      <option value="شفت ليلي - ٨ ساعات">ليلي (٨ ساعات)</option>
                                      <option value="شفت إضافي - ١٢ ساعة">إضافي (١٢ ساعة)</option>
                                      {wState.shiftTime && wState.shiftTime.startsWith('مخصص') && (
                                        <option value={wState.shiftTime}>{wState.shiftTime}</option>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <option value="Morning Shift - 9h">Morning (9 hours)</option>
                                      <option value="Evening Shift - 9h">Evening (9 hours)</option>
                                      <option value="Night Shift - 8h">Night (8 hours)</option>
                                      <option value="Overtime Shift - 12h">Overtime (12 hours)</option>
                                      {wState.shiftTime && wState.shiftTime.startsWith('Custom') && (
                                        <option value={wState.shiftTime}>{wState.shiftTime}</option>
                                      )}
                                    </>
                                  )}
                                </select>
                                {(() => {
                                  const hours = calculateActualHours(wState.startTime, wState.endTime);
                                  return hours !== null ? (
                                    <div className="text-[9px] font-black text-emerald-600 mt-1 flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 w-fit">
                                      <span>⏱️</span>
                                      <span>{isRtl ? `العمل الفعلي المكتوب: ${hours} ساعة` : `Actual parsed: ${hours} hrs`}</span>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Notes / Special Instructions */}
                          <div className="ml-6 pt-1">
                            <input
                              type="text"
                              value={wState.notes}
                              onChange={(e) => updateWorkerState('notes', e.target.value)}
                              placeholder={isRtl ? 'ملاحظات المشرف الميدانية (مثل: تأخر، عمل إضافي، توجيه خاص)' : 'Supervisor field notes (e.g. late arrival, special task)'}
                              className="w-full border border-gray-150 rounded-lg p-1.5 text-[11px] text-gray-600 focus:border-[#0080FF]"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isReadOnly}
                      className="w-full bg-[#040957] hover:bg-[#0080FF] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      {isRtl ? 'حفظ كشف حضور الموظفين والعمالة' : 'Save Employee Attendance Sheet'}
                    </button>
                  </div>
                </div>
              )}

              {/* Attendance Log History Section for Quick Review */}
              <div className="pt-6 border-t border-gray-100 font-sans">
                <h4 className="font-extrabold text-xs text-[#040957] uppercase tracking-wider mb-3">
                  📋 {isRtl ? 'سجل الحضور المحفوظ مؤخراً' : 'Recently Saved Attendance Logs'}
                </h4>
                {attendanceRecords.filter(r => r.projectId === selectedProjectId).length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">
                    {isRtl ? 'لا توجد سجلات حضور محفوظة لهذا المشروع حتى الآن.' : 'No saved attendance records for this project yet.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-gray-150 rounded-xl bg-gray-50/50 max-h-60 overflow-y-auto">
                    <table className="w-full text-right text-xs text-gray-500 divide-y divide-gray-100">
                      <thead className="text-[10px] text-gray-400 bg-gray-100/70 font-bold uppercase">
                        <tr>
                          <th className="p-2.5 text-right">{isRtl ? 'التاريخ' : 'Date'}</th>
                          <th className="p-2.5 text-right">{isRtl ? 'الموظف' : 'Employee'}</th>
                          <th className="p-2.5 text-right">{isRtl ? 'الحالة' : 'Status'}</th>
                          <th className="p-2.5 text-right">{isRtl ? 'مواعيد العمل الاستراحة والشفت' : 'Work Times, Break & Shift'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-sans">
                        {attendanceRecords
                          .filter(r => r.projectId === selectedProjectId)
                          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                          .slice(0, 15)
                          .map(rec => (
                            <tr key={rec.id} className="hover:bg-white/50 transition">
                              <td className="p-2.5 font-mono text-[10px] text-right font-bold text-[#040957]">
                                {rec.date}
                              </td>
                              <td className="p-2.5 text-right">
                                <div className="font-bold text-gray-800">{rec.workerName}</div>
                                <div className="text-[10px] text-gray-400">{isRtl ? rec.professionAr : rec.professionEn}</div>
                              </td>
                              <td className="p-2.5 text-right">
                                {(() => {
                                  const status = rec.status || (rec.isPresent ? 'Present' : 'Absent');
                                  let label = '';
                                  let colorClasses = '';
                                  if (status === 'Present') {
                                    label = isRtl ? 'حضور' : 'Present';
                                    colorClasses = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                                  } else if (status === 'Absent') {
                                    label = isRtl ? 'غياب' : 'Absent';
                                    colorClasses = 'bg-rose-50 text-rose-700 border border-rose-100';
                                  } else if (status === 'Late') {
                                    label = isRtl ? 'تأخير' : 'Late';
                                    colorClasses = 'bg-amber-50 text-amber-700 border border-amber-100';
                                  } else if (status === 'Sick') {
                                    label = isRtl ? 'مريض' : 'Sick';
                                    colorClasses = 'bg-purple-50 text-purple-700 border border-purple-100';
                                  } else if (status === 'AnnualLeave') {
                                    label = isRtl ? 'إجازة سنوية' : 'Annual Leave';
                                    colorClasses = 'bg-blue-50 text-blue-700 border border-blue-100';
                                  } else if (status === 'ShortLeave') {
                                    label = isRtl ? 'إجازة قصيرة' : 'Short Leave';
                                    colorClasses = 'bg-teal-50 text-teal-700 border border-teal-100';
                                  } else {
                                    label = rec.isPresent ? (isRtl ? 'حاضر' : 'Present') : (isRtl ? 'غائب' : 'Absent');
                                    colorClasses = rec.isPresent ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
                                  }
                                  return (
                                    <span className={`text-[9px] py-0.5 px-2 rounded-full font-bold ${colorClasses}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="p-2.5 text-right text-[10px] text-gray-600">
                                {rec.isPresent ? (
                                  <div>
                                    <span>⏱️ {rec.startTime} - {rec.endTime}</span>
                                    <span className="mx-1.5 text-gray-300">|</span>
                                    <span>☕ {rec.breakTime}</span>
                                    <span className="mx-1.5 text-gray-300">|</span>
                                    <span className="bg-blue-50 text-[#040957] font-semibold py-0.5 px-1.5 rounded text-[9px]">{rec.shiftTime}</span>
                                    {rec.notes && <div className="text-[10px] text-gray-400 italic mt-0.5">📝 {rec.notes}</div>}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </form>
          )}

          {/* TAB: FIELD RESOURCE REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base text-blue-700 font-sans flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    {isRtl ? 'طلبات الموارد الميدانية للمشرفين' : 'Supervisor Field Resource Requests'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isRtl ? 'إدارة واعتماد طلبات المواد والمعدات والعمالة الإضافية الواردة من الميدان.' : 'Manage and approve incoming site requests for materials, equipment, and extra manpower.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {fieldRequests.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-12 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                      {isRtl ? 'لا توجد طلبات معلقة حالياً' : 'No pending requests found'}
                    </h4>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fieldRequests
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(req => (
                        <div key={req.id} className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition group">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ req.type === 'Material' ? 'bg-blue-50 text-blue-600' : req.type === 'Equipment' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600' }`}>
                                {req.type === 'Material' ? <Package className="w-6 h-6" /> : 
                                 req.type === 'Equipment' ? <Truck className="w-6 h-6" /> : 
                                 <Users className="w-6 h-6" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-black text-[#040957]">{isRtl ? req.resourceNameAr : req.resourceNameEn}</h4>
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${ req.priority === 'Emergency' ? 'bg-red-600 text-white animate-pulse' : req.priority === 'Urgent' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500' }`}>
                                    {req.priority.toUpperCase()}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-500 font-bold flex items-center gap-2 mt-0.5">
                                  <span>{isRtl ? 'بواسطة:' : 'By:'} {req.supervisorName}</span>
                                  <span>•</span>
                                  <span>{new Date(req.timestamp).toLocaleString()}</span>
                                </div>
                                {req.notes && (
                                  <div className="mt-2 text-[10px] text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100 italic">
                                    "{req.notes}"
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <div className="text-right px-4 border-r border-gray-100">
                                <div className="text-[10px] font-bold text-gray-400 uppercase">{isRtl ? 'الكمية المطلوبة' : 'Qty Requested'}</div>
                                <div className="text-lg font-black text-[#040957]">{req.quantity} <span className="text-xs text-gray-400">{req.unit}</span></div>
                              </div>

                              <div className="flex gap-2">
                                {req.status === 'Pending' ? (
                                  <>
                                    <button
                                      onClick={() => onUpdateFieldRequest && onUpdateFieldRequest({ ...req, status: 'Approved' })}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl text-[10px] font-black transition flex items-center gap-1.5 shadow-sm"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      {isRtl ? 'اعتماد الطلب' : 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => onUpdateFieldRequest && onUpdateFieldRequest({ ...req, status: 'Rejected' })}
                                      className="bg-red-50 hover:bg-red-100 text-red-600 py-2 px-4 rounded-xl text-[10px] font-black transition"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      {isRtl ? 'رفض' : 'Reject'}
                                    </button>
                                  </>
                                ) : (
                                  <div className={`py-2 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest ${ req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700' }`}>
                                    {req.status === 'Approved' ? (isRtl ? 'تم الاعتماد' : 'Approved') :
                                     req.status === 'Rejected' ? (isRtl ? 'تم الرفض' : 'Rejected') :
                                     (isRtl ? 'تم التوريد' : 'Fulfilled')}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: FIELD WORK APPROVALS QUEUE */}
          {activeTab === 'approvals' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base text-amber-700 font-sans flex items-center gap-2">
                    <span>⭐</span>
                    {isRtl ? 'اعتماد التقارير والمحاضر الميدانية للمشرفين' : 'Field Supervisor Log Approvals'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isRtl ? 'مراجعة وتدقيق كشوف الحضور، الإنجاز، السلامة، والبلاغات قبل دمجها بالنظام' : 'Review attendance sheets, safety compliance, delays, and progress before syncing'}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-[#040957] text-white px-2.5 py-1 rounded-lg">
                  {fieldSubmissions.length} Total
                </span>
              </div>

              {/* Field Portal Link Quick Share Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-[#040957] flex items-center gap-1.5 font-sans">
                      <span>📱</span>
                      {isRtl ? 'رابط بوابة العمل الميداني للمشرفين' : 'Supervisor Field Portal Link'}
                    </h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed font-sans">
                      {isRtl 
                        ? 'انسخ هذا الرابط المباشر وأرسله للمشرفين الميدانيين لتسجيل الحضور، تحديثات الإنجاز اليومي، السلامة، والبلاغات مباشرة من هواتفهم.' 
                        : 'Distribute this URL to field supervisors. They can record attendance, production, safety logs, and escalate issues directly from their mobile web browsers.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const portalUrl = `${window.location.origin}${window.location.pathname}?portal=field#portal=field`;
                      window.open(portalUrl, '_blank');
                    }}
                    className="shrink-0 bg-[#040957] hover:bg-blue-800 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg transition font-sans flex items-center justify-center gap-1 shadow-sm self-start"
                  >
                    <span>🔗</span>
                    {isRtl ? 'فتح البوابة' : 'Open Portal'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}${window.location.pathname}?portal=field#portal=field`}
                    className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-[11px] font-mono font-bold text-gray-500"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      const portalUrl = `${window.location.origin}${window.location.pathname}?portal=field#portal=field`;
                      try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(portalUrl).then(() => {
                            setPortalCopied(true);
                            setTimeout(() => setPortalCopied(false), 2000);
                          });
                        } else {
                          throw new Error();
                        }
                      } catch (err) {
                        const textArea = document.createElement("textarea");
                        textArea.value = portalUrl;
                        textArea.style.position = "fixed";
                        textArea.style.left = "-9999px";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        try {
                          document.execCommand('copy');
                          setPortalCopied(true);
                          setTimeout(() => setPortalCopied(false), 2000);
                        } catch (e) {
                          alert(isRtl ? `الرابط: ${portalUrl}` : `Link: ${portalUrl}`);
                        }
                        document.body.removeChild(textArea);
                      }
                    }}
                    className={`shrink-0 font-bold text-[10px] py-2 px-4 rounded-lg transition font-sans flex items-center gap-1.5 border ${ portalCopied ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 ' }`}
                  >
                    {portalCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 animate-pulse" />
                        <span>{isRtl ? 'تم النسخ!' : 'Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isRtl ? 'نسخ الرابط' : 'Copy Link'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {fieldSubmissions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-2xl border border-gray-150 border-dashed">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto opacity-70 mb-3 animate-pulse" />
                  <p className="text-xs font-bold font-sans">
                    {isRtl ? 'لا توجد سجلات مرفوعة بانتظار المراجعة حالياً.' : 'No field reports are currently pending supervisor submission.'}
                  </p>
                  <p className="text-[10px] text-gray-450 mt-1">
                    {isRtl ? 'سيتم سرد التقارير اليومية هنا بمجرد توقيعها وإرسالها من البوابة الميدانية.' : 'Supervisor-submitted daily rosters will automatically populate here.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 font-sans">
                  {/* Collapsible detail items */}
                  {fieldSubmissions
                    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                    .map(sub => {
                      const isPending = sub.status === 'Pending';
                      const isApproved = sub.status === 'Approved';
                      const isRejected = sub.status === 'Rejected';
                      const targetProj = projects.find(p => p.id === sub.projectId);

                      return (
                        <div 
                          key={sub.id} 
                          className={`border rounded-2xl overflow-hidden transition-all duration-200 ${ isPending ? 'border-amber-250 bg-amber-50/15 hover:border-amber-350 shadow-sm' : isApproved ? 'border-emerald-250 bg-emerald-50/5' : 'border-red-250 bg-red-50/5' }`}
                        >
                          {/* Submission Header Panel */}
                          <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b bg-gray-50/60 border-gray-150">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-gray-800">
                                  {isRtl ? 'تقرير المشرف:' : 'Supervisor:'} {sub.supervisorName}
                                </span>
                                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${ isPending ? 'bg-amber-100 text-amber-800 border border-amber-200' : isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200' }`}>
                                  {isRtl 
                                    ? (isPending ? 'قيد المراجعة' : isApproved ? 'تم الاعتماد والدمج' : 'مرفوض') 
                                    : sub.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1">
                                🏢 {isRtl ? targetProj?.nameAr : targetProj?.nameEn} | 📆 {new Date(sub.timestamp).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>

                            {/* Approval/Rejection buttons */}
                            <div className="flex gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handlePrintSubmissionPDF(sub)}
                                disabled={isPrintingSubmission}
                                className="bg-white hover:bg-gray-100 text-slate-700 border border-gray-200 font-extrabold text-[11px] py-1.5 px-3 rounded-lg shadow-xs flex items-center gap-1 transition cursor-pointer"
                                title={isRtl ? 'طباعة التفاصيل' : 'Print Details'}
                              >
                                {isPrintingSubmission ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                <span className="hidden sm:inline">{isRtl ? 'طباعة' : 'Print'}</span>
                              </button>

                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (onApproveSubmission) {
                                        if (confirm(isRtl ? 'هل أنت متأكد من مراجعة واعتماد هذا التقرير اليومي بالكامل ودمجه بقاعدة البيانات؟' : 'Are you sure you want to approve this field report and merge its data?')) {
                                          await onApproveSubmission(sub.id, currentUser?.name || 'Authorized Manager');
                                          triggerToast(isRtl ? 'تم اعتماد التقرير الميداني ودمجه بنجاح!' : 'Field Work approved and integrated successfully!');
                                        }
                                      }
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-lg shadow-xs flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isRtl ? 'اعتماد ودمج' : 'Approve & Sync'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (onRejectSubmission) {
                                        const reason = prompt(isRtl ? 'أدخل سبب رفض التقرير والاعتراض الميداني:' : 'Enter reason for rejecting this log submission:');
                                        if (reason !== null) {
                                          await onRejectSubmission(sub.id, reason || 'Incomplete data');
                                          triggerToast(isRtl ? 'تم رفض التقرير وإعادته للمشرف للتعديل' : 'Field Work rejected and sent back to supervisor');
                                        }
                                      }
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-lg shadow-xs flex items-center gap-1 transition cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>{isRtl ? 'رفض' : 'Reject'}</span>
                                  </button>
                                </>
                              )}
                            </div>

                            {isApproved && (
                              <div className="text-[10px] text-emerald-600 font-extrabold">
                                ✓ {isRtl ? `اعتمد بواسطة: ${sub.approvedBy}` : `Approved by: ${sub.approvedBy}`}
                              </div>
                            )}

                            {isRejected && (
                              <div className="text-[10px] text-red-600 font-extrabold">
                                🗙 {isRtl ? `سبب الرفض: ${sub.rejectionReason}` : `Rejection reason: ${sub.rejectionReason}`}
                              </div>
                            )}
                          </div>

                          {/* Submission Content Summary Card */}
                          <div className="p-4 bg-white/40 text-xs space-y-4">
                            
                            {/* Smart AI Audit and Process Optimization Section */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">🛡️</span>
                                  <div>
                                    <h4 className="font-extrabold text-[#040957] text-xs">
                                      {isRtl ? 'تدقيق سلامة المخرجات الميدانية ومؤشرات الإنتاجية' : 'Smart Output Integrity & Process Audit'}
                                    </h4>
                                    <p className="text-[10px] text-slate-500">
                                      {isRtl ? 'يكتشف تضخيم الكميات والتناقضات الميدانية ويقدم توصيات لمعالجة الانحرافات' : 'Identifies over-reporting, attendance-production mismatches, and suggests recovery tracks'}
                                    </p>
                                  </div>
                                </div>
                                
                                {!auditResults[sub.id] && auditingSubId !== sub.id && (
                                  <button
                                    type="button"
                                    onClick={() => runSmartAudit(sub)}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[11px] py-1.5 px-4 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>⚡</span>
                                    <span>{isRtl ? 'بدء التحليل والتدقيق' : 'Run Smart AI Audit'}</span>
                                  </button>
                                )}
                              </div>

                              {auditingSubId === sub.id && (
                                <div className="bg-white border border-blue-100 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
                                  <div className="relative w-8 h-8">
                                    <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                                    <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                                  </div>
                                  <p className="text-xs font-black text-[#040957]">{isRtl ? 'جاري تحليل سلامة التقرير...' : 'Analyzing report integrity...'}</p>
                                  <p className="text-[10px] text-blue-600 font-bold animate-pulse">{auditLoadingMessage}</p>
                                </div>
                              )}

                              {auditError[sub.id] && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[10px] font-semibold text-red-700 space-y-1">
                                  <p className="font-extrabold">⚠️ {isRtl ? 'فشل التدقيق الذكي' : 'Smart Audit Failed'}</p>
                                  <p>{auditError[sub.id]}</p>
                                  <button 
                                    onClick={() => runSmartAudit(sub)}
                                    className="text-blue-600 underline font-bold"
                                  >
                                    {isRtl ? 'إعادة المحاولة' : 'Try Again'}
                                  </button>
                                </div>
                              )}

                              {auditResults[sub.id] && (
                                <div className="space-y-3 divide-y divide-slate-150">
                                  {/* 1. Score & Status Summary Panel */}
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-3">
                                    <div className="md:col-span-3 flex flex-col items-center justify-center p-3 bg-white border rounded-xl text-center">
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{isRtl ? 'درجة الموثوقية' : 'Integrity Score'}</span>
                                      <div className={`text-3xl font-black mt-1 ${
                                        auditResults[sub.id].integrityScore >= 80 ? 'text-emerald-600' :
                                        auditResults[sub.id].integrityScore >= 60 ? 'text-amber-500' : 'text-red-500'
                                      }`}>
                                        {auditResults[sub.id].integrityScore}%
                                      </div>
                                      <span className={`text-[9px] font-black px-2 py-0.5 mt-1 rounded-full ${
                                        auditResults[sub.id].status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                        auditResults[sub.id].status === 'Warning' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                        'bg-red-50 text-red-700 border border-red-100'
                                      }`}>
                                        {isRtl 
                                          ? (auditResults[sub.id].status === 'Verified' ? 'موثوق ومعتمد' : auditResults[sub.id].status === 'Warning' ? 'تنبيه/ملاحظات' : 'مخاطر عالية/اشتباه تضخيم')
                                          : auditResults[sub.id].status
                                        }
                                      </span>
                                    </div>
                                    <div className="md:col-span-9 flex flex-col justify-center p-3 bg-white border rounded-xl">
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{isRtl ? 'ملخص التدقيق الذكي' : 'Audit Verdict Summary'}</span>
                                      <p className="text-[11px] font-semibold text-slate-700 mt-1.5 leading-relaxed">
                                        {isRtl ? auditResults[sub.id].verificationSummaryAr : auditResults[sub.id].verificationSummaryEn}
                                      </p>
                                      {auditResults[sub.id].status !== 'Verified' && isPending && (
                                        <div className="mt-3 flex gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const prefill = isRtl 
                                                ? `ملاحظات التدقيق الذكي: ${auditResults[sub.id].verificationSummaryAr}` 
                                                : `AI Audit: ${auditResults[sub.id].verificationSummaryEn}`;
                                              const reason = prompt(isRtl ? 'تعديل سبب الرفض الموجه للمشرف مسبقاً:' : 'Edit the rejection feedback for the supervisor:', prefill);
                                              if (reason !== null) {
                                                onRejectSubmission && onRejectSubmission(sub.id, reason || 'Incomplete/bloated data');
                                                triggerToast(isRtl ? 'تم رفض التقرير وإرساله لإعادة التدقيق مسبقاً' : 'Report rejected and supervisor requested to revise.');
                                              }
                                            }}
                                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-extrabold text-[10px] py-1 px-2.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                          >
                                            <span>🚫</span>
                                            {isRtl ? 'رفض مع إرفاق ملاحظات التدقيق الذكي' : 'Reject & Autofill AI Reason'}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* 2. Detected Anomalies / Anti-Fraud Checks */}
                                  <div className="pt-3">
                                    <h5 className="font-extrabold text-[#040957] text-[11px] flex items-center gap-1 mb-2">
                                      <span>🛡️</span>
                                      {isRtl ? 'رصد تناقضات البيانات والإنجازات:' : 'Discrepancy & Over-reporting Checks:'}
                                    </h5>
                                    {auditResults[sub.id].anomalies.length === 0 ? (
                                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 text-emerald-800 rounded-xl text-[10px] font-bold flex items-center gap-2">
                                        <span>✓</span>
                                        {isRtl ? 'لم يتم العثور على أي تناقضات أو اشتباه في تضخيم الإنجازات.' : 'No output inconsistencies or suspected over-reporting found. Ratios are aligned.'}
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        {auditResults[sub.id].anomalies.map((anom, idx) => (
                                          <div key={idx} className={`p-2.5 border rounded-xl flex gap-2 text-[10px] leading-relaxed ${
                                            anom.severity === 'High' ? 'bg-red-50 border-red-150 text-red-900' :
                                            anom.severity === 'Medium' ? 'bg-amber-50 border-amber-150 text-amber-900' :
                                            'bg-slate-50 border-slate-200 text-slate-800'
                                          }`}>
                                            <span className="text-xs shrink-0">{anom.severity === 'High' ? '🚨' : anom.severity === 'Medium' ? '⚠️' : 'ℹ️'}</span>
                                            <div>
                                              <span className="font-black block uppercase text-[9px] tracking-wide opacity-80">
                                                {isRtl ? anom.typeAr : anom.typeEn} ({anom.severity})
                                              </span>
                                              <p className="mt-0.5 font-semibold">
                                                {isRtl ? anom.detailsAr : anom.detailsEn}
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* 3. Decision Support & Process Optimizations */}
                                  <div className="pt-3">
                                    <h5 className="font-extrabold text-indigo-900 text-[11px] flex items-center gap-1 mb-2">
                                      <span>💡</span>
                                      {isRtl ? 'مساعد اتخاذ القرار وتوصيات تحسين العمليات الميدانية:' : 'Decision Support & Field Process Improvements:'}
                                    </h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {auditResults[sub.id].processImprovements.map((imp, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1 shadow-2xs">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-black text-[10px] text-indigo-950 block">
                                              {isRtl ? imp.titleAr : imp.titleEn}
                                            </span>
                                            <span className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 shrink-0">
                                              {imp.impact}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                                            {isRtl ? imp.descriptionAr : imp.descriptionEn}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* 4. Action footer */}
                                  <div className="pt-2 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => runSmartAudit(sub)}
                                      className="text-slate-500 hover:text-slate-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      🔄 {isRtl ? 'إعادة تحليل التقرير' : 'Re-run Analysis'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* 1. Attendance section */}
                            {sub.attendanceRecords && sub.attendanceRecords.length > 0 && (
                              <div className="space-y-1.5">
                                <h5 className="font-bold text-[#040957] text-[11px] flex items-center gap-1">
                                  <span>👥</span>
                                  {isRtl ? 'كشف تحضير العمالة والموظفين:' : 'Workforce Daily Attendance Roster:'}
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {sub.attendanceRecords.map(rec => (
                                    <div key={rec.id} className="bg-gray-50 p-2 rounded-lg border border-gray-150 flex justify-between items-center">
                                      <div>
                                        <div className="font-extrabold text-[10px] text-gray-700">{rec.workerName}</div>
                                        <div className="text-[9px] text-gray-400">{isRtl ? rec.professionAr : rec.professionEn}</div>
                                      </div>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${ rec.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : rec.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-red-50 text-red-700 border border-red-100' }`}>
                                        {rec.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 2. Production / Progress updates section */}
                            {sub.progressUpdates && sub.progressUpdates.length > 0 && (
                              <div className="space-y-1.5 pt-3 border-t border-gray-150">
                                <h5 className="font-bold text-amber-750 text-[11px] flex items-center gap-1">
                                  <span>📊</span>
                                  {isRtl ? 'تقارير الإنتاجية والإنجاز الفعلي:' : 'Production & Progressive Outputs:'}
                                </h5>
                                <div className="space-y-2">
                                  {sub.progressUpdates.map(p => {
                                    const actObj = activities.find(a => a.id === p.activityId);
                                    return (
                                      <div key={p.id} className="bg-amber-50/20 p-3 rounded-xl border border-amber-150/40">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className="font-black text-xs text-amber-800">
                                              {isRtl ? actObj?.nameAr : actObj?.nameEn}
                                            </span>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                              ⏱️ {p.time} | 👷 {p.numberOfWorkers} {isRtl ? 'عمال' : 'workers'}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button 
                                              onClick={() => handleOpenActivityDetails(p.activityId)}
                                              className="p-1 hover:bg-amber-100 rounded text-amber-700 transition"
                                              title="View Activity Details"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="font-mono text-xs font-black text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded">
                                              +{p.completedQuantity} {actObj?.unit}
                                            </span>
                                          </div>
                                        </div>
                                        {p.notes && (
                                          <p className="text-[10px] text-gray-500 italic mt-1.5 bg-white/50 p-1.5 rounded border border-gray-150">
                                            📝 {p.notes}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* 3. Safety Check Section */}
                            {sub.safetyRecord && (
                              <div className="space-y-1.5 pt-3 border-t border-gray-150 flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <span>🛡️</span>
                                  <span className="font-bold text-emerald-800 text-[11px]">
                                    {isRtl ? 'حالة تدقيق السلامة EHS:' : 'EHS Safety Audit Log:'}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${ sub.safetyRecord.isSafe ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200' }`}>
                                  {sub.safetyRecord.isSafe 
                                    ? (isRtl ? 'آمن وممتثل بالكامل' : 'Safe & Secure') 
                                    : (isRtl ? `مخالفات (${sub.safetyRecord.violationsCount})` : `Unsafe: ${sub.safetyRecord.violationsCount} violations`)}
                                </span>
                              </div>
                            )}

                            {/* 4. Delay disruption section */}
                            {sub.delayRecord && (
                              <div className="space-y-1.5 pt-3 border-t border-gray-150 bg-red-50/20 p-3 rounded-xl border border-red-100/55">
                                <h5 className="font-bold text-red-800 text-[11px] flex items-center gap-1">
                                  <span>⚠️</span>
                                  {isRtl ? 'محضر معوقات أو تعطل الموقع:' : 'Disruption / Delay Incident Log:'}
                                </h5>
                                <div className="text-[11px] text-gray-750">
                                  <div className="font-extrabold text-red-900">{sub.delayRecord.delayType} (Impact: {sub.delayRecord.impactLevel})</div>
                                  <p className="mt-1 font-semibold">{isRtl ? sub.delayRecord.reasonAr : sub.delayRecord.reasonEn}</p>
                                  {(sub.delayRecord.resolutionPlanAr || sub.delayRecord.resolutionPlanEn) && (
                                    <div className="mt-2 text-[10px] text-gray-500 bg-white/60 p-2 rounded border border-gray-150">
                                      <span className="font-bold block text-[#040957]">{isRtl ? 'خطة تدارك التأخير:' : 'Action resolution plan:'}</span>
                                      {isRtl ? sub.delayRecord.resolutionPlanAr : sub.delayRecord.resolutionPlanEn}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 5. Issue tickets section */}
                            {sub.issueReport && (
                              <div className="space-y-1.5 pt-3 border-t border-gray-150 bg-yellow-50/20 p-3 rounded-xl border border-yellow-100/55">
                                <h5 className="font-bold text-yellow-800 text-[11px] flex items-center gap-1">
                                  <span>🚨</span>
                                  {isRtl ? 'بلاغ معوق إنشائي طارئ:' : 'Emergency Critical Issue Log:'}
                                </h5>
                                <div className="text-[11px]">
                                  <div className="font-extrabold text-yellow-900">{isRtl ? sub.issueReport.titleAr : sub.issueReport.titleEn} (Priority: {sub.issueReport.priority})</div>
                                  {sub.issueReport.description && <p className="mt-1 text-gray-600 italic font-semibold">" {sub.issueReport.description} "</p>}
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROGRESS UPDATE */}
          {activeTab === 'production' && (

            <form onSubmit={handleProgressSubmit} className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-extrabold text-base text-[#040957] font-sans flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  {t.progressUpdatesTitle}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{isRtl ? 'تسجيل الكميات الخرسانية المسكوبة والحديد أو الحفريات المنجزة دورياً' : 'Chronological submission of physical outputs to predictive planning'}</p>
              </div>

              {projectWorkItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400 font-bold">
                  ⚠️ {isRtl ? 'الرجاء إضافة بنود عمل للمشروع أولاً.' : 'Please add work items to selected project first.'}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Work Item Selector */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500">{isRtl ? 'البند التنفيذي المستهدف' : 'Category sector'}</label>
                      <select
                        value={prodWiId}
                        onChange={(e) => setProdWiId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-700 font-bold"
                      >
                        {projectWorkItems.map(wi => (
                          <option key={wi.id} value={wi.id}>
                            {isRtl ? wi.nameAr : wi.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Activity Selector */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 flex justify-between items-center">
                        <span>{isRtl ? 'نوع النشاط الميداني' : 'Sub-activity'}</span>
                        {prodActId && (
                          <button 
                            type="button"
                            onClick={() => handleOpenActivityDetails(prodActId)}
                            className="text-[10px] text-[#0080FF] font-bold hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            {isRtl ? 'عرض التفاصيل والموارد' : 'View Details & Resources'}
                          </button>
                        )}
                      </label>
                      <select
                        value={prodActId}
                        onChange={(e) => setProdActId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-700 font-bold"
                      >
                        {itemActivities.map(act => (
                          <option key={act.id} value={act.id}>
                            {isRtl ? act.nameAr : act.nameEn} ({act.totalQuantity} {act.unit})
                          </option>
                        ))}
                        {itemActivities.length === 0 && (
                          <option value="">{isRtl ? 'لا توجد أنشطة نشطة للربط' : 'No activities linked to category'}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Time Stamp Hourly selection */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500">{isRtl ? 'وقت التحديث الفترات' : 'Update Interval'}</label>
                      <select
                        value={prodTime}
                        onChange={(e) => setProdTime(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs"
                      >
                        <option value="08:00 AM">08:00 AM</option>
                        <option value="10:00 AM">10:00 AM</option>
                        <option value="12:00 PM">12:00 PM</option>
                        <option value="02:00 PM">02:00 PM</option>
                        <option value="04:00 PM">04:00 PM</option>
                        <option value="06:00 PM">06:00 PM</option>
                      </select>
                    </div>

                    {/* Completed quantity */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500">
                        {t.completedQty} 
                        <span className="text-[10px] text-blue-600 ml-1">
                          ({isRtl ? 'المتبقي:' : 'Remaining:'} {remainingQty} {currentActivity?.unit})
                        </span>
                      </label>
                      <input 
                        type="number"
                        value={prodCompletedQty}
                        max={remainingQty}
                        min={0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > remainingQty) {
                            setProdCompletedQty(remainingQty);
                          } else if (val < 0) {
                            setProdCompletedQty(0);
                          } else {
                            setProdCompletedQty(val);
                          }
                        }}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Workers Involved Input */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500 flex justify-between items-center">
                        <span>{isRtl ? 'عدد العمال المشاركين:' : 'Workers Involved:'}</span>
                        <span className="text-amber-600 font-mono text-[10px]">
                          ({isRtl ? 'الحاضرون:' : 'Present:'} {presentWorkersCount})
                        </span>
                      </label>
                      <input 
                        type="number" 
                        value={prodWorkersUsed}
                        max={presentWorkersCount}
                        min={0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > presentWorkersCount) {
                            setProdWorkersUsed(presentWorkersCount);
                          } else if (val < 0) {
                            setProdWorkersUsed(0);
                          } else {
                            setProdWorkersUsed(val);
                          }
                        }}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Calculated Progress Display (Automatic & Cumulative) */}
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-500">{t.progressPercentage} ({isRtl ? 'تلقائي تراكمي' : 'Auto Cumulative'})</label>
                      <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-2.5 flex items-center justify-between">
                         <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden mr-3 rtl:ml-3 rtl:mr-0">
                            <div 
                              className="h-full bg-emerald-500 transition-all duration-500" 
                              style={{ width: `${Math.min(100, Math.round(((activityProgress + Number(prodCompletedQty)) / (currentActivity?.totalQuantity || 1)) * 100))}%` }}
                            ></div>
                         </div>
                         <span className="font-mono text-xs font-bold text-[#040957]">
                           {Math.min(100, Math.round(((activityProgress + Number(prodCompletedQty)) / (currentActivity?.totalQuantity || 1)) * 100))}%
                         </span>
                      </div>
                      {currentActivity?.plannedDailyProduction && (
                        <div className="text-[9px] text-gray-400 font-bold mt-1">
                          {isRtl ? 'إنجاز الوردية المتوقع لهذا التحديث:' : 'Expected shift achievement for this update:'} 
                          <span className="text-blue-600 ml-1">
                            {Math.round((Number(prodCompletedQty) / (currentActivity.plannedDailyProduction / 4)) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Remaining Balance breakdown panel */}
                    <div className="sm:col-span-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-2xl p-4 mt-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black uppercase text-[#040957] tracking-wider flex items-center gap-1.5">
                          🎯 {isRtl ? 'حالة التوازن والمطابقة للنشاط' : 'Sub-Activity Balance Tracker'}
                        </span>
                        <span className="bg-blue-100 text-[#040957] text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                          {currentActivity?.unit}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="bg-white rounded-xl border border-slate-100 p-2.5 shadow-sm">
                          <span className="block text-[14px] font-black text-slate-800 font-mono leading-none">
                            {currentActivity?.totalQuantity || 0}
                          </span>
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider mt-1 block">
                            {isRtl ? 'إجمالي المخطط' : 'Total Planned'}
                          </span>
                        </div>
                        
                        <div className="bg-white rounded-xl border border-slate-100 p-2.5 shadow-sm">
                          <span className="block text-[14px] font-black text-indigo-600 font-mono leading-none">
                            {activityProgress}
                          </span>
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider mt-1 block">
                            {isRtl ? 'المنجز مسبقاً' : 'Previously Done'}
                          </span>
                        </div>

                        <div className="bg-[#040957] rounded-xl p-2.5 shadow-sm text-white">
                          <span className="block text-[14px] font-black font-mono leading-none text-amber-400">
                            {remainingQty}
                          </span>
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider mt-1 block">
                            {isRtl ? 'الرصيد المتبقي الحالي' : 'Current Remaining'}
                          </span>
                        </div>

                        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-2.5 shadow-sm">
                          <span className="block text-[14px] font-black text-emerald-700 font-mono leading-none">
                            {Math.max(0, remainingQty - Number(prodCompletedQty))}
                          </span>
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider mt-1 block">
                            {isRtl ? 'المتبقي المتوقع بعد الحفظ' : 'Projected After Save'}
                          </span>
                        </div>
                      </div>

                      {Number(prodCompletedQty) >= remainingQty && remainingQty > 0 && (
                        <div className="bg-amber-50 text-amber-800 rounded-lg p-2 mt-2 text-[10px] font-bold flex items-center gap-1 border border-amber-200">
                          ⚠️ {isRtl ? `تنبيه: لقد استهلكت كامل الرصيد المتبقي المتاح (${remainingQty} ${currentActivity?.unit})` : `Warning: You are recording the entire remaining scope (${remainingQty} ${currentActivity?.unit})`}
                        </div>
                      )}
                    </div>

                    {/* MATERIAL MANAGEMENT SECTION */}
                    <div className="sm:col-span-3 space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-[#040957] uppercase tracking-widest flex items-center gap-1.5">
                          🏗️ {isRtl ? 'إدارة المواد والمخزون الميداني' : 'On-Site Material & Inventory Management'}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Delivery from Warehouse */}
                        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-amber-800 uppercase">
                              {isRtl ? 'إضافة مواد من المستودع للموقع (توريد)' : 'Add Materials from Warehouse (Delivery)'}
                            </span>
                            <Truck className="w-4 h-4 text-amber-500" />
                          </div>
                          <div className="flex flex-col gap-2">
                            <select
                              value={tempDelId}
                              onChange={(e) => setTempDelId(e.target.value)}
                              className="w-full border border-gray-200 rounded-xl p-2 text-[11px] font-bold bg-white"
                            >
                              <option value="">{isRtl ? 'اختر المادة...' : 'Select Material...'}</option>
                              {materials.map(m => (
                                <option key={m.id} value={m.id}>{isRtl ? m.nameAr : m.nameEn} ({m.unit})</option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <input 
                                type="number"
                                value={tempDelQty}
                                onChange={(e) => setTempDelQty(Number(e.target.value))}
                                placeholder={isRtl ? 'الكمية' : 'Qty'}
                                className="w-full border border-gray-200 rounded-xl p-2 text-[11px] font-bold bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (tempDelId && tempDelQty > 0) {
                                    handleAddMaterialDelivery(tempDelId, tempDelQty);
                                    setTempDelId('');
                                    setTempDelQty(0);
                                  }
                                }}
                                className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-2 px-4 rounded-xl text-[10px] transition shrink-0"
                              >
                                {isRtl ? 'تسجيل توريد' : 'Record Delivery'}
                              </button>
                            </div>
                          </div>

                          {materialDeliveries.filter(d => d.activityId === prodActId).length > 0 && (
                            <div className="pt-2 flex flex-wrap gap-2">
                              {materialDeliveries.filter(d => d.activityId === prodActId).map((d, i) => (
                                <div key={i} className="bg-white px-2 py-1 rounded-lg border border-amber-200 text-[9px] font-bold flex items-center gap-1.5">
                                  🚚 {isRtl ? d.materialNameAr : d.materialNameEn}: {d.quantityDelivered} {d.unit}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Consumption Tracking */}
                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-800 uppercase">
                              {isRtl ? 'تسجيل الاستهلاك لهذا التحديث' : 'Record Consumption for this Update'}
                            </span>
                            <Package className="w-4 h-4 text-blue-500" />
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <select
                              value={tempMatId}
                              onChange={(e) => setTempMatId(e.target.value)}
                              className="w-full border border-gray-200 rounded-xl p-2 text-[11px] font-bold bg-white"
                            >
                              <option value="">{isRtl ? 'اختر المادة للموقع...' : 'Select Material...'}</option>
                              {materials.map(m => {
                                const delivered = materialDeliveries
                                  .filter(d => d.activityId === prodActId && d.materialId === m.id)
                                  .reduce((sum, d) => sum + d.quantityDelivered, 0);
                                const consumed = progressUpdates
                                  .filter(upd => upd.activityId === prodActId)
                                  .flatMap(upd => upd.materialConsumptions || [])
                                  .filter(c => c.materialId === m.id)
                                  .reduce((sum, c) => sum + c.quantityUsed, 0);
                                const onSite = delivered - consumed;
                                if (onSite <= 0) return null;
                                return (
                                  <option key={m.id} value={m.id}>
                                    {isRtl ? m.nameAr : m.nameEn} ({isRtl ? 'المتوفر:' : 'Avail:'} {onSite} {m.unit})
                                  </option>
                                );
                              })}
                            </select>
                            <div className="flex gap-2">
                              <input 
                                type="number"
                                value={tempMatQty}
                                onChange={(e) => setTempMatQty(Number(e.target.value))}
                                placeholder={isRtl ? 'الكمية' : 'Qty'}
                                className="w-full border border-gray-200 rounded-xl p-2 text-[11px] font-bold bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (tempMatId && tempMatQty > 0) {
                                    handleAddConsumption(tempMatId, tempMatQty);
                                    setTempMatId('');
                                    setTempMatQty(0);
                                  }
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-[10px] transition shrink-0"
                              >
                                {isRtl ? 'إضافة استهلاك' : 'Add Consumption'}
                              </button>
                            </div>
                          </div>

                          {currentConsumptions.length > 0 && (
                            <div className="pt-2 flex flex-wrap gap-2">
                              {currentConsumptions.map((c, i) => (
                                <div key={i} className="bg-white px-2 py-1 rounded-lg border border-blue-200 text-[9px] font-bold flex items-center gap-1.5 group">
                                  ⚙️ {isRtl ? c.materialNameAr : c.materialNameEn}: -{c.quantityUsed} {c.unit}
                                  <button 
                                    type="button"
                                    onClick={() => setCurrentConsumptions(prev => prev.filter((_, idx) => idx !== i))}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attachment drops */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500">{t.attachmentLabel}</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 cursor-pointer transition">
                      <UploadCloud className="w-8 h-8 text-[#0080FF] mx-auto animate-pulse" />
                      <p className="text-xs text-gray-500 mt-2">
                        {isRtl ? 'اسحب وأفلت الصور الميدانية الموثقة أو انقر للأرفاق الفوري' : 'Drag and drop authenticated site photos or tap to upload'}
                      </p>
                      
                      {/* Sim buttons to inject attachments */}
                      <div className="flex gap-2 justify-center mt-3 text-[10px]">
                        <button 
                          type="button" 
                          onClick={() => triggerFileSimulation('photo')}
                          className="bg-indigo-50 border border-indigo-150 py-1.5 px-3 rounded text-[#040957] font-semibold flex items-center gap-1 hover:bg-indigo-100"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{isRtl ? '+ محاكاة إرفاق صورة' : '+ Sim Photo'}</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => triggerFileSimulation('doc')}
                          className="bg-emerald-50 border border-emerald-150 py-1.5 px-3 rounded text-emerald-800 font-semibold flex items-center gap-1 hover:bg-emerald-100"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{isRtl ? '+ محاكاة إرفاق مستند' : '+ Sim PDF'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Preview rendered uploads */}
                    {simulatedFiles.length > 0 && (
                      <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 space-y-1 text-[11px] font-semibold">
                        <span className="text-gray-400 font-black tracking-wider uppercase text-[9px] block">Uploaded Assets</span>
                        {simulatedFiles.map((f, i) => (
                          <div key={i} className="flex justify-between items-center text-gray-700 bg-white border border-gray-100 p-1.5 rounded">
                            <span className="truncate">{f.type === 'photo' ? '🖼️' : '📄'} {f.name}</span>
                            <button 
                              type="button" 
                              onClick={() => setSimulatedFiles(simulatedFiles.filter((_, idx) => idx !== i))}
                              className="text-red-500 font-bold hover:underline"
                            >
                              {isRtl ? 'إبعاد' : 'Remove'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-500">{t.notes}</label>
                    <textarea 
                      value={prodNotes}
                      placeholder="..."
                      onChange={(e) => setProdNotes(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2 text-xs h-20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isReadOnly}
                    className="w-full bg-[#0080FF] hover:bg-[#040957] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm"
                  >
                    {t.submitUpdateBtn}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 3: SAFETY AUDIT */}
          {activeTab === 'safety' && (
            <form onSubmit={handleSafetySubmit} className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-extrabold text-base text-emerald-700 font-sans flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-emerald-500" />
                  {t.safetyAuditTitle}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{isRtl ? 'التحقق من الخلو من الانتهاكات وصلاحيات مخالب الرافعة وحزام الأمان' : 'Environmental, Health, and Safety (EHS) supervisor seal checklist'}</p>
              </div>

              {/* Toggle switch Safe/Unsafe */}
              <div className="bg-[#F1F1F1] p-4 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-[#040957]">{t.isSafeQuestion}</span>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => { setSafeStatus(true); setSafeViolations(0); }}
                    className={`py-1.5 px-4 rounded-lg font-bold text-xs transition ${safeStatus ? 'bg-emerald-500 text-white shadow-xs' : 'bg-white text-gray-500 border border-gray-200'}`}
                  >
                    {isRtl ? 'آمن وممتثل' : 'Safe / Secure'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSafeStatus(false); setSafeViolations(1); }}
                    className={`py-1.5 px-4 rounded-lg font-bold text-xs transition ${!safeStatus ? 'bg-red-500 text-white shadow-xs' : 'bg-white text-gray-500 border border-gray-200'}`}
                  >
                    {isRtl ? 'يوجد مخالفة / غير آمن' : 'Unsafe Alert'}
                  </button>
                </div>
              </div>

              {!safeStatus && (
                <div className="space-y-1 animate-slideDown">
                  <label className="block text-xs font-bold text-red-700">{t.violationsCount}</label>
                  <input 
                    type="number"
                    value={safeViolations}
                    onChange={(e) => setSafeViolations(Number(e.target.value))}
                    className="w-16 border border-red-300 bg-red-50/20 rounded-xl p-2 text-xs font-extrabold text-red-700"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500">{t.safetyNotes}</label>
                <textarea 
                  value={safeNotes}
                  onChange={(e) => setSafeNotes(e.target.value)}
                  placeholder="E.g. Scaffoldings inspected, harnesses verified..."
                  className="w-full border border-gray-200 rounded-xl p-2 text-xs h-20"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-500">{t.correctiveAction}</label>
                <textarea 
                  value={safeActions}
                  onChange={(e) => setSafeActions(e.target.value)}
                  placeholder="Required measures..."
                  className="w-full border border-gray-200 rounded-xl p-2 text-xs h-20"
                />
              </div>

              <button
                type="submit"
                disabled={isReadOnly}
                className="w-full bg-emerald-600 hover:bg-[#040957] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm"
              >
                {t.submitSafetyAudit}
              </button>
            </form>
          )}

          {/* TAB 4: DELAYS REGISTRAR */}
          {activeTab === 'delays' && (
            <form onSubmit={handleDelaySubmit} className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-extrabold text-base text-red-700 font-sans flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  {t.delayLogTitle}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{isRtl ? 'تسجيل أسباب الإيقاف أو الخلل في توفير المواد، الآليات، أو المناخ' : 'Record environmental delays and allocate planning variables'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Delay type */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500">{t.delayType}</label>
                  <select
                    value={delayType}
                    onChange={(e) => setDelayType(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#000]"
                  >
                    <option value="Material Shortage">{isRtl ? 'نقص ونفاد المواد' : 'Material Shortage'}</option>
                    <option value="Equipment Breakdown">{isRtl ? 'أعطال في الآليات والقرائن' : 'Equipment Breakdown'}</option>
                    <option value="Weather">{isRtl ? 'أعاصير أو عواصف مناخية' : 'Weather'}</option>
                    <option value="Labor Absenteeism">{isRtl ? 'معوق غياب العمالة الكافي' : 'Labor Absenteeism'}</option>
                    <option value="Design Clarification">{isRtl ? 'تعديلات وتوضيحات هندسية' : 'Design Clarification'}</option>
                    <option value="Other">{isRtl ? 'أخرى' : 'Other'}</option>
                  </select>
                </div>

                {/* Impact Level */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500">{isRtl ? 'درجة الخطورة والتأثير' : 'Critical Path Impact'}</label>
                  <select
                    value={delayImpact}
                    onChange={(e) => setDelayImpact(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#000] font-bold text-red-700"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Reasons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 font-sans">
                  <label className="block text-xs font-bold text-gray-500">{t.delayReasonAr} *</label>
                  <input 
                    type="text" 
                    value={delayReasonAr}
                    required
                    onChange={(e) => setDelayReasonAr(e.target.value)}
                    placeholder="تأخر الشاحنة المبردة للصب"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs"
                  />
                </div>
                <div className="space-y-1 font-sans">
                  <label className="block text-xs font-bold text-gray-500">{t.delayReasonEn} *</label>
                  <input 
                    type="text" 
                    value={delayReasonEn}
                    required
                    onChange={(e) => setDelayReasonEn(e.target.value)}
                    placeholder="Concrete pump delivery delayed"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs"
                  />
                </div>
              </div>

              {/* Resolution blueprints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500">{t.resolutionPlanAr}</label>
                  <textarea 
                    value={delayResPlanAr}
                    onChange={(e) => setDelayResPlanAr(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2 text-xs h-16"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500">{t.resolutionPlanEn}</label>
                  <textarea 
                    value={delayResPlanEn}
                    onChange={(e) => setDelayResPlanEn(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2 text-xs h-16"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isReadOnly}
                className="w-full bg-red-600 hover:bg-[#040957] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm animate-pulse"
              >
                {t.submitDelayBtn}
              </button>
            </form>
          )}

          {/* TAB 5: ISSUE REPORT */}
          {activeTab === 'issues' && (
            <form onSubmit={handleIssueSubmit} className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-extrabold text-base text-yellow-700 font-sans flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  {t.issueReportTitle}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{isRtl ? 'رفع العينات الشاذة والضياع والأعطال الميكانيكية لمدير المشروع فوراً' : 'Dispatch instant field issue reports to corporate PM center'}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500">{t.issueNameAr} *</label>
                  <input 
                    type="text" 
                    value={issueTitleAr}
                    required
                    onChange={(e) => setIssueTitleAr(e.target.value)}
                    placeholder="تسريب مياه جوهرية"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500">{t.issueNameEn} *</label>
                  <input 
                    type="text" 
                    value={issueTitleEn}
                    required
                    onChange={(e) => setIssueTitleEn(e.target.value)}
                    placeholder="Ground water aquifer seepage"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500">{t.priorityLabel}</label>
                  <select
                    value={issuePriority}
                    onChange={(e) => setIssuePriority(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#000] font-bold text-amber-700"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium font-bold">Medium</option>
                    <option value="High font-black">High</option>
                    <option value="Urgent font-black">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500">{isRtl ? 'ملاحظات المشكلة الإنشائية' : 'Site Issue details'}</label>
                  <textarea 
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2 text-xs h-12"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isReadOnly}
                className="w-full bg-yellow-600 hover:bg-[#040957] text-white py-2.5 rounded-xl font-bold text-xs transition shadow-sm font-sans"
              >
                {t.submitIssueBtn}
              </button>
            </form>
          )}

          {/* ACTIVITY DETAILS MODAL */}
          {isActivityDetailsOpen && activityForDetails && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
                >
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-[#040957] to-blue-900 p-6 text-white flex justify-between items-center text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-xl">
                        <FileText className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className={isRtl ? 'text-right' : 'text-left'}>
                        <h3 className="text-lg font-black tracking-tight">
                          {isRtl ? 'تفاصيل النشاط الميداني' : 'Activity Plan Details'}
                        </h3>
                        <p className="text-xs text-blue-200 font-medium">
                          {isRtl ? 'الموارد المخصصة والجدول الزمني' : 'Allocated Resources & Schedule'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsActivityDetailsOpen(false)}
                      className="p-2 hover:bg-white/10 rounded-full transition"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className={`p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6 ${isRtl ? 'text-right' : 'text-left'}`}>
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          {isRtl ? 'اسم النشاط (Ar)' : 'Activity Name (Ar)'}
                        </span>
                        <p className="text-sm font-black text-slate-800 leading-tight">
                          {activityForDetails.nameAr}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                          {isRtl ? 'Activity Name (En)' : 'Activity Name (En)'}
                        </span>
                        <p className="text-sm font-black text-slate-800 leading-tight">
                          {activityForDetails.nameEn}
                        </p>
                      </div>
                    </div>

                    {/* Quantities & Schedule */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                        <div className={`flex items-center gap-2 mb-1 text-blue-600 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <Calculator className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-wider">{isRtl ? 'الكمية الإجمالية' : 'Total Qty'}</span>
                        </div>
                        <p className="text-lg font-black text-blue-900 font-mono">
                          {activityForDetails.totalQuantity} <span className="text-xs font-bold">{activityForDetails.unit}</span>
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                        <div className={`flex items-center gap-2 mb-1 text-amber-600 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-wider">{isRtl ? 'البداية' : 'Start'}</span>
                        </div>
                        <p className="text-sm font-black text-amber-900 font-mono">
                          {activityForDetails.startDate}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <div className={`flex items-center gap-2 mb-1 text-emerald-600 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-wider">{isRtl ? 'النهاية' : 'End'}</span>
                        </div>
                        <p className="text-sm font-black text-emerald-900 font-mono">
                          {activityForDetails.endDate}
                        </p>
                      </div>
                    </div>

                    {/* Resource Allocations */}
                    <div className="space-y-4">
                      <h4 className={`text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Users className="w-4 h-4 text-indigo-500" />
                        {isRtl ? 'تخصيص الموارد المخططة' : 'Planned Resource Allocations'}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Workers */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-4">
                          <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-slate-50 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <UserCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold text-slate-600">{isRtl ? 'العمالة المخصصة' : 'Allocated Workers'}</span>
                          </div>
                          <div className="space-y-2">
                            {activityForDetails.workerIds.length > 0 ? (
                              activityForDetails.workerIds.map(id => {
                                const w = workers.find(worker => worker.id === id);
                                return (
                                  <div key={id} className={`flex items-center justify-between bg-slate-50 p-2 rounded-xl text-[11px] font-bold ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                                    <span className="text-slate-700">{w ? w.fullName : id}</span>
                                    <span className="text-slate-400 font-mono text-[9px]">{w?.badgeNumber}</span>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[10px] text-slate-400 italic text-center py-2">{isRtl ? 'لا يوجد عمال مخصصين' : 'No workers assigned'}</p>
                            )}
                          </div>
                        </div>

                        {/* Equipment */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-4">
                          <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-slate-50 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <Wrench className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-slate-600">{isRtl ? 'المعدات والآليات' : 'Equipment & Machinery'}</span>
                          </div>
                          <div className="space-y-2">
                            {activityForDetails.equipmentAllocations && activityForDetails.equipmentAllocations.length > 0 ? (
                              activityForDetails.equipmentAllocations.map((eq, i) => (
                                <div key={i} className={`flex items-center justify-between bg-slate-50 p-2 rounded-xl text-[11px] font-bold ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                                  <span className="text-slate-700">{isRtl ? eq.equipmentNameAr : eq.equipmentNameEn}</span>
                                  <span className="text-blue-600 font-mono text-[10px]">{eq.quantity} {isRtl ? 'وحدة' : 'Units'}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-slate-400 italic text-center py-2">{isRtl ? 'لا توجد معدات مخصصة' : 'No equipment assigned'}</p>
                            )}
                          </div>
                        </div>

                        {/* Materials */}
                        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 p-4">
                          <div className={`flex items-center gap-2 mb-3 pb-2 border-b border-slate-50 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <Package className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-bold text-slate-600">{isRtl ? 'المواد المخطط استهلاكها' : 'Planned Materials'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {activityForDetails.materialAllocations && activityForDetails.materialAllocations.length > 0 ? (
                              activityForDetails.materialAllocations.map((mat, i) => (
                                <div key={i} className={`flex items-center justify-between bg-slate-50 p-2 rounded-xl text-[11px] font-bold ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                                  <span className="text-slate-700">{isRtl ? mat.materialNameAr : mat.materialNameEn}</span>
                                  <span className="text-emerald-600 font-mono text-[10px]">{mat.quantity} {mat.unit}</span>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-2">
                                <p className="text-[10px] text-slate-400 italic text-center py-2">{isRtl ? 'لا توجد مواد مخصصة' : 'No materials assigned'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className={`p-6 bg-slate-50 border-t border-slate-100 flex justify-end ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <button 
                      onClick={() => setIsActivityDetailsOpen(false)}
                      className="px-8 py-3 bg-[#040957] text-white rounded-2xl text-xs font-black hover:bg-blue-900 transition shadow-lg shadow-blue-900/20"
                    >
                      {isRtl ? 'إغلاق النافذة' : 'Close Details'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
