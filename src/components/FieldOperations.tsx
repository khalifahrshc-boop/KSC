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
  FieldWorkSubmission
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
  Copy
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
  currentUser
}: FieldOperationsProps) {
  const isRtl = lang === 'ar';
  const isReadOnly = userRole === 'Viewer';

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  // Sub Module view tabs
  const [activeTab, setActiveTab] = useState<'checkin' | 'attendance' | 'production' | 'safety' | 'delays' | 'issues' | 'approvals'>('checkin');
  const [portalCopied, setPortalCopied] = useState(false);


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
      completionPercentage: Math.round(((activityProgress + qtyToAdd) / (currentActivity?.totalQuantity || 1)) * 100),
      notes: prodNotes,
      photos: simulatedFiles.filter(f => f.type === 'photo').map(f => f.name),
      documents: simulatedFiles.filter(f => f.type === 'doc').map(f => f.name),
      timestamp: new Date().toISOString()
    };

    onAddProgressUpdate(updateRec);
    // Reset forms
    setProdNotes('');
    setSimulatedFiles([]);
    triggerToast(t.updateSuccess);
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
            className="bg-white dark:bg-[#1C2638] p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 border border-slate-200 dark:border-slate-800"
          >
            <div className="relative text-[#040957] dark:text-[#0080FF]">
              <div className="w-16 h-16 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
              <Printer className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-[#040957] dark:text-white uppercase tracking-widest mb-2">
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
      <div className="bg-[#040957] text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900">
        <div>
          <span className="text-[10px] bg-red-500 hover:bg-red-600 text-white py-0.5 px-2.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
            {isRtl ? 'نظام التحكم والمراقبة اللوحي بالموقع' : 'Site Field Tablet Controller'}
          </span>
          <h2 className="text-xl font-black mt-1 font-sans">
            {t.fieldDashboard}
          </h2>
          <p className="text-xs text-blue-100">
            {isRtl ? 'تحديث فوري كل ساعتين، إمضاء حضور، رصد مخالفات هاس، وتسجيل المعوقات' : 'Continuous 2-hour logs, safety compliance seals, and delay audits'}
          </p>
        </div>

        {/* Project Selector inside controller */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-300 hidden md:inline">{isRtl ? 'المشروع القائم' : 'Focused project'}:</label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-white/10 text-white font-bold border border-white/20 py-1.5 px-3 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#0080FF]"
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
      <div className="bg-white border-b border-gray-200 p-2 flex flex-wrap gap-1.5 scrollbar-thin">
        <button
          onClick={() => setActiveTab('checkin')}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'checkin' ? 'bg-[#040957] text-white shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <User className="w-3.5 h-3.5" />
          <span>{isRtl ? '١. توقيع حضور المشرف' : '1. Supervisor Verify'}</span>
        </button>

        <button
          onClick={() => setActiveTab('production')}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'production' ? 'bg-[#040957] text-white shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isRtl ? '٢. تحديز الإنجاز (ساعتين)' : '2. Production Input'}</span>
        </button>

        <button
          onClick={() => setActiveTab('safety')}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'safety' ? 'bg-[#040957] text-white shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{isRtl ? '٣. تدقيق السلامة EHS' : '3. Safety Audit'}</span>
        </button>

        <button
          onClick={() => setActiveTab('delays')}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'delays' ? 'bg-[#040957] text-white shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{isRtl ? '٤. سجل تأخيرات الموقع' : '4. Delays Registrar'}</span>
        </button>

        <button
          onClick={() => setActiveTab('issues')}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'issues' ? 'bg-[#040957] text-white shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{isRtl ? '٥. شكاوي وبلاغات معوقة' : '5. Issue Dispatcher'}</span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'attendance' ? 'bg-[#040957] text-white shadow-xs' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{isRtl ? '٦. تحضير الموظفين والعمالة' : '6. Employee Attendance'}</span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`py-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1.5 relative ${activeTab === 'approvals' ? 'bg-[#040957] text-white shadow-md' : 'text-gray-500 hover:bg-amber-100/50 hover:text-amber-700'}`}
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
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-[#1C2638] dark:to-[#182132] border border-blue-100 dark:border-gray-800 p-5 rounded-2xl space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-[#040957] dark:text-amber-400 flex items-center gap-1.5 font-sans">
                      <span>📱</span>
                      {isRtl ? 'رابط بوابة العمل الميداني للمشرفين' : 'Supervisor Field Portal Link'}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-sans">
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
                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-[11px] font-mono font-bold text-gray-500 dark:text-gray-350"
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
                    className={`shrink-0 font-bold text-[10px] py-2 px-4 rounded-lg transition font-sans flex items-center gap-1.5 border ${
                      portalCopied 
                        ? 'bg-emerald-500 text-white border-emerald-500' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
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
                          className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                            isPending 
                              ? 'border-amber-250 bg-amber-50/15 hover:border-amber-350 shadow-sm' 
                              : isApproved 
                              ? 'border-emerald-250 bg-emerald-50/5' 
                              : 'border-red-250 bg-red-50/5'
                          }`}
                        >
                          {/* Submission Header Panel */}
                          <div className="p-4 flex flex-wrap items-center justify-between gap-4 border-b bg-gray-50/60 dark:bg-[#141B29]/40 border-gray-150">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-gray-800 dark:text-gray-200">
                                  {isRtl ? 'تقرير المشرف:' : 'Supervisor:'} {sub.supervisorName}
                                </span>
                                <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                  isPending 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                    : isApproved 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                    : 'bg-red-100 text-red-800 border border-red-200'
                                }`}>
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
                            {isPending && (
                              <div className="flex gap-2 shrink-0">
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
                              </div>
                            )}

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
                          <div className="p-4 bg-white/40 dark:bg-transparent text-xs space-y-4">
                            
                            {/* 1. Attendance section */}
                            {sub.attendanceRecords && sub.attendanceRecords.length > 0 && (
                              <div className="space-y-1.5">
                                <h5 className="font-bold text-[#040957] text-[11px] flex items-center gap-1">
                                  <span>👥</span>
                                  {isRtl ? 'كشف تحضير العمالة والموظفين:' : 'Workforce Daily Attendance Roster:'}
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {sub.attendanceRecords.map(rec => (
                                    <div key={rec.id} className="bg-gray-50 dark:bg-slate-800/40 p-2 rounded-lg border border-gray-150 flex justify-between items-center">
                                      <div>
                                        <div className="font-extrabold text-[10px] text-gray-700 dark:text-gray-200">{rec.workerName}</div>
                                        <div className="text-[9px] text-gray-400">{isRtl ? rec.professionAr : rec.professionEn}</div>
                                      </div>
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                        rec.status === 'Present' 
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                          : rec.status === 'Late' 
                                          ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                          : 'bg-red-50 text-red-700 border border-red-100'
                                      }`}>
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
                                      <div key={p.id} className="bg-amber-50/20 dark:bg-[#1E2640]/10 p-3 rounded-xl border border-amber-150/40">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className="font-black text-xs text-amber-800">
                                              {isRtl ? actObj?.nameAr : actObj?.nameEn}
                                            </span>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                              ⏱️ {p.time} | 👷 {p.numberOfWorkers} {isRtl ? 'عمال' : 'workers'}
                                            </p>
                                          </div>
                                          <span className="font-mono text-xs font-black text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded">
                                            +{p.completedQuantity} {actObj?.unit}
                                          </span>
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
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                  sub.safetyRecord.isSafe 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                    : 'bg-red-100 text-red-800 border border-red-200'
                                }`}>
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
                      <label className="block text-xs font-bold text-gray-500">{isRtl ? 'نوع النشاط الميداني' : 'Sub-activity'}</label>
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
                        onChange={(e) => setProdCompletedQty(Number(e.target.value))}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-semibold"
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

        </div>
      </div>

          </div>
  );
}