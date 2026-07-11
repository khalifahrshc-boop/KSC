/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Project, 
  WorkItem, 
  Activity, 
  Worker, 
  SupervisorCheckIn, 
  AttendanceRecord, 
  ProgressUpdate, 
  SafetyRecord, 
  DelayRecord, 
  IssueReport, 
  FieldWorkSubmission,
  SystemSettings
} from '../types';
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
  ChevronLeft,
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Trash2,
  Copy,
  Users,
  Calendar,
  Building,
  FileText,
  Menu,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { dbApi } from '../lib/api';

interface FieldPortalProps {
  settings: SystemSettings;
  lang: 'ar' | 'en';
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  workers: Worker[];
  onAddPendingSubmission: (submission: FieldWorkSubmission) => Promise<void>;
  onReturnToMain: () => void;
}

export default function FieldPortal({
  settings,
  lang,
  projects,
  workItems,
  activities,
  workers,
  onAddPendingSubmission,
  onReturnToMain
}: FieldPortalProps) {
  const isRtl = lang === 'ar';
  
  // Choose project
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Supervisor Check-in state
  const [supName, setSupName] = useState('');
  const [supNationalId, setSupNationalId] = useState('');
  const [supBadge, setSupBadge] = useState('');
  const [supTitle, setSupTitle] = useState('');
  const [signatureText, setSignatureText] = useState('');
  const [isSignCanvasDrawn, setIsSignCanvasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  // Active steps in wizard
  // Steps: 1: Check-In & Project, 2: Attendance, 3: Production/Progress, 4: Safety & Delay & Issues, 5: Review & Submit
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [successSubmissionId, setSuccessSubmissionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Attendance state
  const [workerAttendanceState, setWorkerAttendanceState] = useState<Record<string, {
    isPresent: boolean;
    status: 'Present' | 'Absent' | 'Late' | 'Sick' | 'AnnualLeave' | 'ShortLeave';
    startTime: string;
    breakTime: string;
    endTime: string;
    shiftTime: string;
    notes: string;
  }>>({});

  // 3. Production Updates state (list of multiple updates submitted during the day)
  const [prodUpdates, setProdUpdates] = useState<Omit<ProgressUpdate, 'id' | 'projectId'>[]>([]);
  
  // Individual update form state
  const [prodWiId, setProdWiId] = useState('');
  const [prodActId, setProdActId] = useState('');
  const [prodTime, setProdTime] = useState('10:00 AM');
  const [prodCompletedQty, setProdCompletedQty] = useState<number>(10);
  const [prodWorkersUsed, setProdWorkersUsed] = useState<number>(2);
  const [prodNotes, setProdNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, content: string}[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // 4. Safety Audit
  const [hasSafetyRecord, setHasSafetyRecord] = useState(false);
  const [safeStatus, setSafeStatus] = useState<boolean>(true);
  const [safeViolations, setSafeViolations] = useState<number>(0);
  const [safeNotes, setSafeNotes] = useState('');
  const [safeActions, setSafeActions] = useState('');

  // 5. Delays
  const [hasDelayRecord, setHasDelayRecord] = useState(false);
  const [delayReasonAr, setDelayReasonAr] = useState('');
  const [delayReasonEn, setDelayReasonEn] = useState('');
  const [delayType, setDelayType] = useState<DelayRecord['delayType']>('Material Shortage');
  const [delayImpact, setDelayImpact] = useState<DelayRecord['impactLevel']>('Medium');
  const [delayResPlanAr, setDelayResPlanAr] = useState('');
  const [delayResPlanEn, setDelayResPlanEn] = useState('');

  // 6. Issues
  const [hasIssueReport, setHasIssueReport] = useState(false);
  const [issueTitleAr, setIssueTitleAr] = useState('');
  const [issueTitleEn, setIssueTitleEn] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePriority, setIssuePriority] = useState<IssueReport['priority']>('High');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectWorkItems = workItems.filter(wi => wi.projectId === selectedProjectId);
  const currentWorkItem = workItems.find(wi => wi.id === prodWiId) || projectWorkItems[0];
  const itemActivities = activities.filter(act => act.workItemId === (currentWorkItem?.id || ''));

  // Copy shareable portal link
  const handleCopyLink = () => {
    const portalUrl = `${window.location.origin}${window.location.pathname}?portal=field#portal=field`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(portalUrl).then(() => {
          triggerToast(isRtl ? 'تم نسخ الرابط السحابي بنجاح!' : 'Portal link copied to clipboard!');
        }).catch((err) => {
          throw err;
        });
      } else {
        throw new Error("Clipboard API not available");
      }
    } catch (e) {
      console.warn("Clipboard API failed, using fallback copy", e);
      const textArea = document.createElement("textarea");
      textArea.value = portalUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          triggerToast(isRtl ? 'تم نسخ الرابط السحابي بنجاح!' : 'Portal link copied to clipboard!');
        } else {
          throw new Error("execCommand copy unsuccessful");
        }
      } catch (err) {
        alert(isRtl ? `الرجاء نسخ هذا الرابط يدوياً: ${portalUrl}` : `Please copy this link manually: ${portalUrl}`);
      }
      document.body.removeChild(textArea);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Set default selectors when project changes
  useEffect(() => {
    if (projectWorkItems.length > 0) {
      setProdWiId(projectWorkItems[0].id);
    } else {
      setProdWiId('');
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (itemActivities.length > 0) {
      setProdActId(itemActivities[0].id);
    } else {
      setProdActId('');
    }
  }, [prodWiId]);

  // Initial attendance setup
  useEffect(() => {
    const newState: Record<string, any> = {};
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
    setWorkerAttendanceState(newState);
  }, [selectedProjectId, workers]);

  // Signature canvas handlers
  useEffect(() => {
    if (currentStep === 1 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#040957';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
      }
    }
  }, [currentStep]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setIsSignCanvasDrawn(true);
  };

  const stopDraw = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSignCanvasDrawn(false);
  };

  // Add a production update
  const handleAddProductionRecord = () => {
    if (!prodActId) {
      alert(isRtl ? 'الرجاء اختيار نشاط عمل فرعي' : 'Please select a sub-activity');
      return;
    }

    const activityObj = activities.find(a => a.id === prodActId);
    if (!activityObj) return;

    const fileList = uploadedFiles.map(f => f.content);

    const newUpdate = {
      workItemId: prodWiId,
      activityId: prodActId,
      time: prodTime,
      completedQuantity: prodCompletedQty,
      numberOfWorkers: prodWorkersUsed,
      equipmentUsed: [],
      completionPercentage: Math.round((prodCompletedQty / activityObj.totalQuantity) * 100),
      notes: prodNotes,
      photos: fileList,
      documents: []
    };

    setProdUpdates(prev => [...prev, newUpdate]);
    setProdNotes('');
    setUploadedFiles([]);
    triggerToast(isRtl ? 'تمت إضافة تحديث الإنتاج بنجاح' : 'Production record added to summary');
  };

  const handleRemoveProductionRecord = (idx: number) => {
    setProdUpdates(prev => prev.filter((_, i) => i !== idx));
  };

  // File Upload Handlers (Drag & Drop)
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          content: event.target!.result as string
        }]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      Array.from(e.target.files).forEach(processFile);
    }
  };

  // Submit complete Daily Field Work Report
  const handleSubmitReport = async () => {
    if (!supName || !supBadge) {
      alert(isRtl ? 'الرجاء إدخال اسم المشرف ورقم الشارة' : 'Please fill supervisor name and badge number');
      setCurrentStep(1);
      return;
    }

    try {
      setIsSubmitting(true);

      // Create CheckIn record
      const checkInRecord: SupervisorCheckIn = {
        id: `check-${Date.now()}`,
        projectId: selectedProjectId,
        supervisorName: supName,
        nationalId: supNationalId,
        badgeNumber: supBadge,
        jobTitle: supTitle || 'Field Inspector',
        signatureData: signatureText || 'Signed in Supervisor Portal',
        timestamp: new Date().toISOString()
      };

      // Compile Attendance records
      const attendanceList: AttendanceRecord[] = [];
      Object.keys(workerAttendanceState).forEach((wId) => {
        const state = workerAttendanceState[wId];
        const wrk = workers.find(w => w.id === wId);
        if (wrk) {
          attendanceList.push({
            id: `att-${Date.now()}-${wId}`,
            projectId: selectedProjectId,
            date: reportDate,
            workerId: wId,
            workerName: wrk.fullName,
            professionAr: wrk.professionAr,
            professionEn: wrk.professionEn,
            isPresent: state.isPresent,
            status: state.status,
            startTime: state.isPresent ? state.startTime : '',
            breakTime: state.isPresent ? state.breakTime : '',
            endTime: state.isPresent ? state.endTime : '',
            shiftTime: state.isPresent ? state.shiftTime : '',
            supervisorName: supName,
            notes: state.notes,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Assemble ProgressUpdates
      const progressList: ProgressUpdate[] = prodUpdates.map((p, index) => ({
        ...p,
        id: `upd-${Date.now()}-${index}`,
        projectId: selectedProjectId,
        reporterName: supName,
        timestamp: new Date().toISOString()
      }));

      // Assemble SafetyRecord if exists
      let safetyRec: SafetyRecord | undefined = undefined;
      if (hasSafetyRecord) {
        safetyRec = {
          id: `saf-${Date.now()}`,
          projectId: selectedProjectId,
          isSafe: safeStatus,
          violationsCount: safeViolations,
          notes: safeNotes,
          correctiveActions: safeActions,
          timestamp: new Date().toISOString()
        };
      }

      // Assemble DelayRecord if exists
      let delayRec: DelayRecord | undefined = undefined;
      if (hasDelayRecord && (delayReasonAr || delayReasonEn)) {
        delayRec = {
          id: `del-${Date.now()}`,
          projectId: selectedProjectId,
          reasonAr: delayReasonAr || 'غير محدد',
          reasonEn: delayReasonEn || 'Not specified',
          delayType: delayType,
          impactLevel: delayImpact,
          resolutionPlanAr: delayResPlanAr,
          resolutionPlanEn: delayResPlanEn,
          timestamp: new Date().toISOString()
        };
      }

      // Assemble IssueReport if exists
      let issueRec: IssueReport | undefined = undefined;
      if (hasIssueReport && (issueTitleAr || issueTitleEn)) {
        issueRec = {
          id: `iss-${Date.now()}`,
          projectId: selectedProjectId,
          titleAr: issueTitleAr || 'بلاغ مشكلة',
          titleEn: issueTitleEn || 'Field Incident',
          description: issueDesc,
          priority: issuePriority,
          photos: [],
          isApproved: false,
          timestamp: new Date().toISOString()
        };
      }

      // Build overall submission
      const submission: FieldWorkSubmission = {
        id: `sub-${Date.now()}`,
        projectId: selectedProjectId,
        date: reportDate,
        supervisorName: supName,
        badgeNumber: supBadge,
        nationalId: supNationalId,
        jobTitle: supTitle,
        signatureData: signatureText || 'Authorized Digitally',
        timestamp: new Date().toISOString(),
        status: 'Pending',
        checkIn: checkInRecord,
        attendanceRecords: attendanceList,
        progressUpdates: progressList,
        safetyRecord: safetyRec,
        delayRecord: delayRec,
        issueReport: issueRec
      };

      await onAddPendingSubmission(submission);
      setSuccessSubmissionId(submission.id);
      triggerToast(isRtl ? 'تم تقديم التقرير بنجاح!' : 'Field report submitted successfully!');
    } catch (e) {
      console.error(e);
      alert(isRtl ? 'حدث خطأ أثناء تقديم التقرير' : 'An error occurred while submitting the report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans py-4 px-2">
      {/* HEADER BAR FOR PORTAL */}
      <div className="bg-[#040957] text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-amber-400 text-slate-900 font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full">
            {isRtl ? 'بوابة الإشراف الميداني الرقمية' : 'Digital Field Supervisor Portal'}
          </span>
          <h1 className="text-xl font-black mt-1.5 flex items-center gap-2">
            <span>📱</span>
            {isRtl ? settings.companyNameAr : settings.companyNameEn}
          </h1>
          <p className="text-xs text-gray-300 mt-1">
            {isRtl ? 'منصة توثيق ومزامنة بنود العمل والمطالبات المباشرة' : 'Secure offline-ready field supervisor logging system'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-bold transition text-amber-300"
          >
            <Copy className="w-4 h-4" />
            <span>{isRtl ? 'نسخ رابط الجوال' : 'Copy Mobile Link'}</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold py-3 px-6 rounded-2xl shadow-2xl animate-bounce text-xs">
          ✅ {toastMessage}
        </div>
      )}

      {successSubmissionId ? (
        /* SUCCESS STATUS SCREEN */
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-[#1C2638] p-8 rounded-3xl border border-gray-150 dark:border-gray-800 text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#040957] dark:text-white">
              {isRtl ? 'تم رفع التقرير الميداني بنجاح!' : 'Field Report Submitted Successfully!'}
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              {isRtl 
                ? 'تم إرسال التقرير بنجاح إلى قائمة الموافقات المعلقة لمهندس المشروع.' 
                : 'Your daily logs are transmitted securely to the PM review ledger.'}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl max-w-sm mx-auto text-right text-xs space-y-2.5 font-mono border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between">
              <span className="text-gray-400">{isRtl ? 'كود التقرير:' : 'Report ID:'}</span>
              <span className="font-bold text-[#040957] dark:text-[#0080FF]">{successSubmissionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{isRtl ? 'المشرف المسؤول:' : 'Supervisor:'}</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{supName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{isRtl ? 'المشروع:' : 'Project:'}</span>
              <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                {selectedProject ? (isRtl ? selectedProject.nameAr : selectedProject.nameEn) : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{isRtl ? 'التاريخ الميداني:' : 'Work Date:'}</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{reportDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{isRtl ? 'حالة الاعتماد:' : 'Approval Status:'}</span>
              <span className="font-bold text-amber-500 animate-pulse bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                {isRtl ? 'قيد المراجعة والاعتماد' : 'PENDING APPROVAL'}
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setSuccessSubmissionId(null);
                setProdUpdates([]);
                setHasSafetyRecord(false);
                setHasDelayRecord(false);
                setHasIssueReport(false);
                setCurrentStep(1);
              }}
              className="bg-[#040957] hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-2xl text-xs transition"
            >
              {isRtl ? 'تقديم تقرير ميداني آخر' : 'Submit Another Report'}
            </button>
          </div>
        </motion.div>
      ) : (
        /* MULTI-STEP REPORT WIZARD FORM */
        <div className="bg-white dark:bg-[#182132] border border-gray-150 dark:border-gray-800 rounded-3xl shadow-xl overflow-hidden">
          
          {/* STEP INDICATOR TABS */}
          <div className="grid grid-cols-5 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10 text-center">
            {[
              { id: 1, title: isRtl ? '١. المشرف' : '1. Check-In', icon: User },
              { id: 2, title: isRtl ? '٢. العمالة' : '2. Attendance', icon: Users },
              { id: 3, title: isRtl ? '٣. الإنتاج' : '3. Output', icon: Clock },
              { id: 4, title: isRtl ? '٤. السجل المالي والبيئي' : '4. Safety & Delays', icon: ShieldAlert },
              { id: 5, title: isRtl ? '٥. المراجعة' : '5. Submit', icon: CheckCircle }
            ].map(step => (
              <button
                key={step.id}
                onClick={() => {
                  if (step.id < currentStep || supName) {
                    setCurrentStep(step.id);
                  } else {
                    alert(isRtl ? 'الرجاء إدخال بيانات المشرف والمشروع أولاً' : 'Please initialize supervisor credentials first');
                  }
                }}
                className={`py-3.5 px-1 flex flex-col items-center gap-1 transition ${currentStep === step.id ? 'bg-[#040957] text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <step.icon className="w-4 h-4" />
                <span className="text-[9px] font-black hidden sm:inline">{step.title}</span>
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {/* STEP 1: SUPERVISOR & PROJECT SELECTION */}
            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-[#040957] dark:text-white">
                    👤 {isRtl ? 'تسجيل حضور المشرف والموقع' : 'Supervisor & Site Setup'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isRtl ? 'يرجى إدخال هويتك واختيار المشروع الميداني النشط وتاريخ التقرير.' : 'Declare your supervisor credentials, active project layout, and today\'s report date.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'اسم المشرف بالكامل:' : 'Supervisor Full Name:'}</label>
                    <input 
                      type="text" 
                      value={supName}
                      onChange={(e) => setSupName(e.target.value)}
                      placeholder={isRtl ? 'مثال: يوسف الحربي' : 'e.g. Yousef Al-Harbi'}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'رقم الشارة الوظيفية:' : 'Badge Number:'}</label>
                    <input 
                      type="text" 
                      value={supBadge}
                      onChange={(e) => setSupBadge(e.target.value)}
                      placeholder="e.g. BDG-9844"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'رقم الهوية الوطنية/الإقامة:' : 'National / Residency ID:'}</label>
                    <input 
                      type="text" 
                      value={supNationalId}
                      onChange={(e) => setSupNationalId(e.target.value)}
                      placeholder="e.g. 1098471201"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'المسمى الوظيفي:' : 'Job Title:'}</label>
                    <input 
                      type="text" 
                      value={supTitle}
                      onChange={(e) => setSupTitle(e.target.value)}
                      placeholder="e.g. Senior Site General Inspector"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'المشروع المستهدف:' : 'Target Project Site:'}</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.projectNumber} - {isRtl ? p.nameAr : p.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'تاريخ التقرير الميداني:' : 'Report Log Date:'}</label>
                    <input 
                      type="date" 
                      value={reportDate}
                      onChange={(e) => setReportDate(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold"
                    />
                  </div>
                </div>

                {/* SIGNATURE SECTION */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  <label className="text-xs font-bold text-gray-500 block">✍️ {isRtl ? 'توقيع المشرف الرقمي:' : 'Supervisor Authorized Signature:'}</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        {isRtl 
                          ? 'ارسم توقيعك على اللوحة المخصصة للموافقة على التقرير بشكل معتمد.' 
                          : 'Draw your ink signature below to validate reports prior to PM database entry.'}
                      </p>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
                        <canvas
                          ref={canvasRef}
                          width={350}
                          height={120}
                          onMouseDown={startDraw}
                          onMouseMove={draw}
                          onMouseUp={stopDraw}
                          onMouseLeave={stopDraw}
                          onTouchStart={startDraw}
                          onTouchMove={draw}
                          onTouchEnd={stopDraw}
                          className="w-full h-28 cursor-crosshair block"
                        />
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="absolute bottom-2 right-2 bg-slate-900/65 text-white hover:bg-slate-900 px-2.5 py-1 rounded text-[10px] font-bold"
                        >
                          {isRtl ? 'مسح' : 'Clear'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400">
                        {isRtl 
                          ? 'أو بدلاً من الرسم، اكتب اسمك الصريح كتوقيع نصي بديل:' 
                          : 'Or, type your full name here to authorize as alternative digital text stamp:'}
                      </p>
                      <input 
                        type="text" 
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        placeholder={isRtl ? 'اكتب اسمك الثلاثي هنا للتفويض' : 'Type name to authorize'}
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold h-28 text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      if (!supName || !supBadge) {
                        alert(isRtl ? 'يرجى ملء اسم المشرف ورقم شارته للمتابعة' : 'Supervisor name and badge are required');
                        return;
                      }
                      setCurrentStep(2);
                    }}
                    className="bg-[#040957] hover:bg-blue-800 text-white font-extrabold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
                  >
                    <span>{isRtl ? 'التالي: الحضور والعمالة' : 'Next: Attendance & Labour'}</span>
                    <ChevronLeft className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: WORKFORCE ATTENDANCE */}
            {currentStep === 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-[#040957] dark:text-white">
                    📋 {isRtl ? 'كشف تحضير العمالة والموظفين' : 'Workforce Attendance Log'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isRtl ? 'حدد حضور وغياب موظفي الموقع لهذا اليوم وحدد أوقات عملهم.' : 'Tick حضور for present employees, or change status to Late, Sick, or Leave with custom notes.'}
                  </p>
                </div>

                <div className="border border-gray-150 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50/50 dark:bg-gray-900/10">
                  <table className="w-full text-right text-xs divide-y divide-gray-100 dark:divide-gray-800">
                    <thead className="bg-gray-100/50 dark:bg-gray-800/40 text-[10px] text-gray-400 font-bold uppercase">
                      <tr>
                        <th className="p-3 text-right">{isRtl ? 'الموظف / المهنة' : 'Employee / Role'}</th>
                        <th className="p-3 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                        <th className="p-3 text-right">{isRtl ? 'ساعات وتفاصيل العمل' : 'Times & Notes'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-transparent">
                      {workers.filter(w => w.status === 'Active').map(w => {
                        const state = workerAttendanceState[w.id] || {
                          isPresent: true,
                          status: 'Present',
                          startTime: '07:30 AM',
                          breakTime: '12:00 PM',
                          endTime: '04:30 PM',
                          shiftTime: '9h',
                          notes: ''
                        };

                        const handleStatusChange = (status: any) => {
                          const isPres = status === 'Present' || status === 'Late' || status === 'ShortLeave';
                          setWorkerAttendanceState(prev => ({
                            ...prev,
                            [w.id]: {
                              ...state,
                              isPresent: isPres,
                              status
                            }
                          }));
                        };

                        return (
                          <tr key={w.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                            <td className="p-3">
                              <div className="font-extrabold text-gray-800 dark:text-gray-100 text-xs">{w.fullName}</div>
                              <div className="text-[10px] text-gray-400">{isRtl ? w.professionAr : w.professionEn} | ID: {w.badgeNumber}</div>
                            </td>
                            <td className="p-3 text-center">
                              <select
                                value={state.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className={`text-[11px] font-bold p-1 px-2.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-700 dark:text-white ${state.isPresent ? 'border-emerald-200 text-emerald-600' : 'border-rose-200 text-rose-500'}`}
                              >
                                <option value="Present">{isRtl ? 'حضور' : 'Present'}</option>
                                <option value="Late">{isRtl ? 'متأخر' : 'Late'}</option>
                                <option value="Absent">{isRtl ? 'غياب' : 'Absent'}</option>
                                <option value="Sick">{isRtl ? 'مرضي' : 'Sick'}</option>
                                <option value="AnnualLeave">{isRtl ? 'إجازة سنوية' : 'Annual Leave'}</option>
                                <option value="ShortLeave">{isRtl ? 'إجازة قصيرة' : 'Short Leave'}</option>
                              </select>
                            </td>
                            <td className="p-3 space-y-2">
                              {state.isPresent ? (
                                <div className="flex flex-wrap gap-2 items-center">
                                  <input 
                                    type="text" 
                                    value={state.startTime}
                                    onChange={(e) => setWorkerAttendanceState(prev => ({ ...prev, [w.id]: { ...state, startTime: e.target.value } }))}
                                    className="border border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 rounded p-1 text-[10px] w-16 text-center font-bold text-gray-700 dark:text-white"
                                    title="Start Time"
                                  />
                                  <span className="text-gray-300">-</span>
                                  <input 
                                    type="text" 
                                    value={state.endTime}
                                    onChange={(e) => setWorkerAttendanceState(prev => ({ ...prev, [w.id]: { ...state, endTime: e.target.value } }))}
                                    className="border border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 rounded p-1 text-[10px] w-16 text-center font-bold text-gray-700 dark:text-white"
                                    title="End Time"
                                  />
                                  <input 
                                    type="text" 
                                    value={state.notes}
                                    onChange={(e) => setWorkerAttendanceState(prev => ({ ...prev, [w.id]: { ...state, notes: e.target.value } }))}
                                    placeholder={isRtl ? 'ملاحظات المشرف...' : 'Supervisor notes...'}
                                    className="border border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 rounded p-1 text-[10px] flex-1 min-w-[100px] text-gray-700 dark:text-white"
                                  />
                                </div>
                              ) : (
                                <input 
                                  type="text" 
                                  value={state.notes}
                                  onChange={(e) => setWorkerAttendanceState(prev => ({ ...prev, [w.id]: { ...state, notes: e.target.value } }))}
                                  placeholder={isRtl ? 'سبب الغياب...' : 'Reason for absence...'}
                                  className="border border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 rounded p-1 text-[10px] w-full text-gray-700 dark:text-white"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
                  >
                    <ChevronRight className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                    <span>{isRtl ? 'السابق: البيانات والتحضير' : 'Back: Supervisor info'}</span>
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-[#040957] hover:bg-blue-800 text-white font-extrabold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
                  >
                    <span>{isRtl ? 'التالي: الإنتاج والكميات' : 'Next: Production Logs'}</span>
                    <ChevronLeft className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PRODUCTION LOGS */}
            {currentStep === 3 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-[#040957] dark:text-white">
                    ⏱️ {isRtl ? 'إدخال كميات الإنتاج والمنجز الفعلي' : 'Site Production & Quantities'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isRtl ? 'سجل تقدم بنود العمل والأنشطة والكميات المنجزة ميدانياً مع إمكانية إرفاق صور.' : 'Log concrete poured, excavation, or steel layout done during shifts.'}
                  </p>
                </div>

                {projectWorkItems.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 font-bold">
                    ⚠️ {isRtl ? 'الرجاء إضافة بنود عمل للمشروع أولاً.' : 'Please add work items in main program first.'}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-900/20 p-5 rounded-2xl border border-gray-150 dark:border-gray-800 space-y-4">
                    <h3 className="text-xs font-black text-[#040957] dark:text-[#0080FF] uppercase tracking-wider">
                      ➕ {isRtl ? 'إضافة تحديث ميداني جديد' : 'Add New Production Log'}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">{isRtl ? 'البند التنفيذي الرئيسي:' : 'Work Category:'}</label>
                        <select
                          value={prodWiId}
                          onChange={(e) => setProdWiId(e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-850 dark:text-white font-bold"
                        >
                          {projectWorkItems.map(wi => (
                            <option key={wi.id} value={wi.id}>
                              {isRtl ? wi.nameAr : wi.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">{isRtl ? 'النشاط الميداني الفرعي:' : 'Sub-activity:'}</label>
                        <select
                          value={prodActId}
                          onChange={(e) => setProdActId(e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-850 dark:text-white font-bold"
                        >
                          {itemActivities.map(act => (
                            <option key={act.id} value={act.id}>
                              {isRtl ? act.nameAr : act.nameEn} ({act.totalQuantity} {act.unit})
                            </option>
                          ))}
                          {itemActivities.length === 0 && (
                            <option value="">{isRtl ? 'لا توجد أنشطة نشطة' : 'No activities linked'}</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">{isRtl ? 'الكمية المنجزة الفعلية:' : 'Completed Quantity:'}</label>
                        <input 
                          type="number" 
                          value={prodCompletedQty}
                          onChange={(e) => setProdCompletedQty(Number(e.target.value))}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">{isRtl ? 'عدد العمال المشاركين:' : 'Workers Involved:'}</label>
                        <input 
                          type="number" 
                          value={prodWorkersUsed}
                          onChange={(e) => setProdWorkersUsed(Number(e.target.value))}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">{isRtl ? 'توقيت التسجيل الفعلي:' : 'Record Shift Time:'}</label>
                        <select
                          value={prodTime}
                          onChange={(e) => setProdTime(e.target.value)}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold"
                        >
                          <option value="09:00 AM">09:00 AM</option>
                          <option value="11:00 AM">11:00 AM</option>
                          <option value="01:00 PM">01:00 PM</option>
                          <option value="03:00 PM">03:00 PM</option>
                          <option value="05:00 PM">05:00 PM</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{isRtl ? 'ملاحظات الإنجاز بالموقع:' : 'Execution Notes:'}</label>
                      <textarea
                        value={prodNotes}
                        onChange={(e) => setProdNotes(e.target.value)}
                        placeholder={isRtl ? 'صف بالتفصيل حالة الصب أو أعمال الحفريات المنتهية...' : 'Describe poured materials or completed boring depth...'}
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-semibold h-16"
                      />
                    </div>

                    {/* DRAG AND DROP FILE UPLOAD AREA */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 block">
                        📸 {isRtl ? 'إرفاق صور/مستندات لإثبات الموقع (إفلات الملفات هنا):' : 'Attach Verification Photos / Soil Documents (Drag & Drop):'}
                      </label>
                      
                      <div 
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer ${dragActive ? 'border-amber-400 bg-amber-500/10' : 'border-gray-250 dark:border-gray-700 hover:border-amber-400 bg-white dark:bg-gray-900/40'}`}
                      >
                        <input 
                          type="file"
                          id="file-portal-upload"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label htmlFor="file-portal-upload" className="cursor-pointer flex flex-col items-center gap-2">
                          <UploadCloud className="w-8 h-8 text-amber-500 animate-pulse" />
                          <div>
                            <span className="font-extrabold text-xs text-[#040957] dark:text-amber-400">
                              {isRtl ? 'اضغط لرفع الصور' : 'Click to upload files'}
                            </span>
                            <span className="text-gray-400 text-[11px] block mt-1">
                              {isRtl ? 'أو اسحب وأفلت الصور الميدانية الحية هنا' : 'or drag and drop live field snapshots here'}
                            </span>
                          </div>
                        </label>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {uploadedFiles.map((f, i) => (
                            <div key={i} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-xl text-[10px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 shadow-sm">
                              {f.name.match(/\.(jpeg|jpg|gif|png)$/i) ? '🖼️' : '📄'}
                              <span className="truncate max-w-[120px]">{f.name}</span>
                              <button 
                                type="button" 
                                onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                className="text-red-500 hover:text-red-700 font-extrabold"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddProductionRecord}
                        className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isRtl ? 'حفظ وإضافة التحديث للقائمة' : 'Add Update to Summary'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* CURRENT SUBMITTED LIST */}
                {prodUpdates.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-extrabold text-[#040957] dark:text-white uppercase tracking-wider">
                      📊 {isRtl ? 'قائمة تحديثات اليوم المدخلة للمراجعة:' : 'Today\'s production updates list:'}
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {prodUpdates.map((p, idx) => {
                        const act = activities.find(a => a.id === p.activityId);
                        const wi = workItems.find(w => w.id === p.workItemId);
                        return (
                          <div key={idx} className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center justify-between gap-4 hover:border-amber-400 transition">
                            <div className="space-y-1 flex-1">
                              <div className="text-[10px] bg-[#040957] text-white px-2 py-0.5 rounded font-bold w-fit">
                                {p.time}
                              </div>
                              <h5 className="font-extrabold text-xs text-gray-800 dark:text-gray-200">
                                {act ? (isRtl ? act.nameAr : act.nameEn) : ''}
                              </h5>
                              <p className="text-[10px] text-gray-400 font-medium">
                                {wi ? (isRtl ? wi.nameAr : wi.nameEn) : ''} | {isRtl ? 'المنجز:' : 'Completed:'} <strong className="text-emerald-600">{p.completedQuantity} {act?.unit}</strong>
                              </p>
                              {p.notes && <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">📝 {p.notes}</p>}
                              {p.photos && p.photos.length > 0 && (
                                <div className="flex gap-1 pt-1.5">
                                  {p.photos.map((ph, pi) => (
                                    <div key={pi} className="w-10 h-10 rounded-lg overflow-hidden border">
                                      <img src={ph} alt="snapshot" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveProductionRecord(idx)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                              title="Delete log"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
                  >
                    <ChevronRight className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                    <span>{isRtl ? 'السابق: تحضير العمالة' : 'Back: Workforce'}</span>
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="bg-[#040957] hover:bg-blue-800 text-white font-extrabold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
                  >
                    <span>{isRtl ? 'التالي: سجل السلامة والمشكلات' : 'Next: Safety & Delays'}</span>
                    <ChevronLeft className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: SAFETY, DELAYS, ISSUES */}
            {currentStep === 4 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-[#040957] dark:text-white">
                    🛡️ {isRtl ? 'السلامة، معوقات الجدول، والمشكلات الحرجة' : 'Safety, Timeline Delays & Site Incidents'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isRtl ? 'وثّق مدى الامتثال للسلامة، وسجل أي تأخير أو مشاكل تحتاج لتدخل المشرف.' : 'Report safety audits, supply shortages, or machinery failures immediately.'}
                  </p>
                </div>

                {/* SAFETY SECTION */}
                <div className="border border-gray-150 dark:border-gray-800 rounded-2xl p-5 space-y-4 bg-gray-50/30 dark:bg-gray-900/10">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasSafetyRecord}
                        onChange={(e) => setHasSafetyRecord(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-xs font-black text-gray-850 dark:text-white">{isRtl ? 'تفعيل تقرير السلامة للموقع اليوم' : 'Activate Daily Safety Report'}</span>
                    </label>
                  </div>

                  {hasSafetyRecord && (
                    <div className="space-y-4 pt-3 border-t border-gray-150 dark:border-gray-800 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 block">{isRtl ? 'حالة الموقع العامة:' : 'Site Safety status:'}</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSafeStatus(true)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${safeStatus ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white text-gray-700'}`}
                            >
                              {isRtl ? 'آمن (لا توجد مخاطر)' : 'Safe (No Hazards)'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSafeStatus(false)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${!safeStatus ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white text-gray-700'}`}
                            >
                              {isRtl ? 'غير آمن (مخاطر نشطة)' : 'Unsafe (Hazards Detected)'}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'عدد المخالفات المرصودة:' : 'Violations count:'}</label>
                          <input 
                            type="number" 
                            value={safeViolations}
                            onChange={(e) => setSafeViolations(Number(e.target.value))}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'ملاحظات المشرف للسلامة:' : 'Audit Notes:'}</label>
                          <textarea
                            value={safeNotes}
                            onChange={(e) => setSafeNotes(e.target.value)}
                            placeholder={isRtl ? 'مثال: تم التفتيش على الخوذات وأحزمة الأمان...' : 'Helmet compliance, safety nets checked...'}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2 h-14 text-xs focus:ring-2 bg-white dark:bg-gray-850 text-gray-800 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'الإجراءات التصحيحية الفورية:' : 'Corrective Actions:'}</label>
                          <textarea
                            value={safeActions}
                            onChange={(e) => setSafeActions(e.target.value)}
                            placeholder={isRtl ? 'مثال: تم طرد عامل لم يلتزم بالخوذة في النطاق الحرج...' : 'Immediate action details...'}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2 h-14 text-xs focus:ring-2 bg-white dark:bg-gray-850 text-gray-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* DELAYS SECTION */}
                <div className="border border-gray-150 dark:border-gray-800 rounded-2xl p-5 space-y-4 bg-gray-50/30 dark:bg-gray-900/10">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasDelayRecord}
                        onChange={(e) => setHasDelayRecord(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-xs font-black text-gray-850 dark:text-white">{isRtl ? 'تسجيل تأخير في سير العمل اليوم' : 'Log Site Work Delay'}</span>
                    </label>
                  </div>

                  {hasDelayRecord && (
                    <div className="space-y-4 pt-3 border-t border-gray-150 dark:border-gray-800 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'نوع التأخير الميداني:' : 'Delay Classification:'}</label>
                          <select
                            value={delayType}
                            onChange={(e) => setDelayType(e.target.value as any)}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs focus:ring-2 bg-white dark:bg-gray-850 text-gray-850 dark:text-white font-bold"
                          >
                            <option value="Material Shortage">{isRtl ? 'نقص مواد المخزن' : 'Material Shortage'}</option>
                            <option value="Equipment Breakdown">{isRtl ? 'عطل الآليات والمعدات' : 'Equipment Breakdown'}</option>
                            <option value="Weather">{isRtl ? 'الأحوال الجوية السيئة' : 'Weather'}</option>
                            <option value="Labor Absenteeism">{isRtl ? 'غياب العمالة والمقاولين' : 'Labor Absenteeism'}</option>
                            <option value="Design Clarification">{isRtl ? 'طلب استيضاح هندسي' : 'Design Clarification'}</option>
                            <option value="Other">{isRtl ? 'أسباب أخرى مخصصة' : 'Other'}</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'مستوى تأثير التأخير:' : 'Impact Severity:'}</label>
                          <select
                            value={delayImpact}
                            onChange={(e) => setDelayImpact(e.target.value as any)}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs focus:ring-2 bg-white dark:bg-gray-850 text-gray-850 dark:text-white font-bold"
                          >
                            <option value="Low">{isRtl ? 'منخفض (ساعات بسيطة)' : 'Low (Minor)'}</option>
                            <option value="Medium">{isRtl ? 'متوسط (يؤخر شفت واحد)' : 'Medium'}</option>
                            <option value="High">{isRtl ? 'عالي (يؤثر على S-Curve)' : 'High (Critical)'}</option>
                            <option value="Critical">{isRtl ? 'حرج (توقف الموقع بالكامل)' : 'Critical (Total Stop)'}</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'السبب الفعلي للتأخير (عربي):' : 'Detailed Delay Cause (Arabic):'}</label>
                          <textarea
                            value={delayReasonAr}
                            onChange={(e) => setDelayReasonAr(e.target.value)}
                            placeholder="مثال: تأخر توريد الرمل من المورد بسبب شح السائقين..."
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2 h-14 text-xs focus:ring-2 bg-white dark:bg-gray-850 text-gray-800 dark:text-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'السبب الفعلي بالتفصيل (En):' : 'Detailed Delay Cause (English):'}</label>
                          <textarea
                            value={delayReasonEn}
                            onChange={(e) => setDelayReasonEn(e.target.value)}
                            placeholder="e.g. Concrete ready mix truck delayed due to highway traffic..."
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2 h-14 text-xs focus:ring-2 bg-white dark:bg-gray-850 text-gray-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CRITICAL ISSUES SECTION */}
                <div className="border border-gray-150 dark:border-gray-800 rounded-2xl p-5 space-y-4 bg-gray-50/30 dark:bg-gray-900/10">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasIssueReport}
                        onChange={(e) => setHasIssueReport(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-xs font-black text-gray-850 dark:text-white">{isRtl ? 'الإبلاغ عن حادث أو مشكلة طارئة وحرجة' : 'Dispatch Emergency Site Ticket'}</span>
                    </label>
                  </div>

                  {hasIssueReport && (
                    <div className="space-y-4 pt-3 border-t border-gray-150 dark:border-gray-800 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'عنوان البلاغ (عربي):' : 'Incident Title (Arabic):'}</label>
                          <input 
                            type="text" 
                            value={issueTitleAr}
                            onChange={(e) => setIssueTitleAr(e.target.value)}
                            placeholder="مثال: تسرب مياه عميق بنطاق الحفر المائل"
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2 h-10 text-xs focus:ring-2 bg-white dark:bg-gray-850 text-gray-800 dark:text-white font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'عنوان البلاغ (English):' : 'Incident Title (English):'}</label>
                          <input 
                            type="text" 
                            value={issueTitleEn}
                            onChange={(e) => setIssueTitleEn(e.target.value)}
                            placeholder="e.g. Ground water leakage at Pile segment"
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2 h-10 text-xs focus:ring-2 bg-white dark:bg-gray-850 text-gray-800 dark:text-white font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'أولوية المشكلة:' : 'Ticket Priority:'}</label>
                          <select
                            value={issuePriority}
                            onChange={(e) => setIssuePriority(e.target.value as any)}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs focus:ring-2 bg-white dark:bg-gray-850 text-gray-850 dark:text-white font-bold"
                          >
                            <option value="Low">{isRtl ? 'منخفضة (للمطالعة لاحقاً)' : 'Low'}</option>
                            <option value="Medium">{isRtl ? 'متوسطة' : 'Medium'}</option>
                            <option value="High">{isRtl ? 'مرتفعة (تتطلب معالجة فورية)' : 'High'}</option>
                            <option value="Urgent">{isRtl ? 'طارئة جداً (خطر على الأرواح/الجدول)' : 'Urgent (Stop Work)'}</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'تفاصيل البلاغ والضرر:' : 'Incident Description:'}</label>
                          <textarea
                            value={issueDesc}
                            onChange={(e) => setIssueDesc(e.target.value)}
                            placeholder={isRtl ? 'اكتب هنا كل التفاصيل الميدانية...' : 'Write all field findings here...'}
                            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-2 h-14 text-xs focus:ring-2 bg-white dark:bg-gray-850 text-gray-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
                  >
                    <ChevronRight className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                    <span>{isRtl ? 'السابق: إنتاجية الموقع' : 'Back: Output logs'}</span>
                  </button>
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="bg-[#040957] hover:bg-blue-800 text-white font-extrabold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
                  >
                    <span>{isRtl ? 'التالي: المراجعة والإرسال' : 'Next: Review & Transmit'}</span>
                    <ChevronLeft className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: REVIEW & TRANSMIT */}
            {currentStep === 5 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-[#040957] dark:text-white">
                    📝 {isRtl ? 'مراجعة وتوقيع التقرير اليومي الشامل' : 'Daily Report Consolidated Review'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isRtl ? 'راجع الأقسام المدخلة في التقرير قبل رفعها للمدير للمصادقة.' : 'Verify all logs, attendance ratios, and incident metrics before central database write.'}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-2xl border border-gray-150 dark:border-gray-800 space-y-4 text-xs font-sans">
                  
                  {/* Supervisor Header Review */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold">{isRtl ? 'اسم المشرف:' : 'Supervisor:'}</span>
                      <p className="font-extrabold text-gray-800 dark:text-gray-100 mt-0.5">{supName}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold">{isRtl ? 'المشروع:' : 'Project:'}</span>
                      <p className="font-extrabold text-[#040957] dark:text-[#0080FF] mt-0.5 truncate">{selectedProject ? (isRtl ? selectedProject.nameAr : selectedProject.nameEn) : ''}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold">{isRtl ? 'التاريخ الميداني:' : 'Log Date:'}</span>
                      <p className="font-extrabold text-gray-800 dark:text-gray-100 mt-0.5 font-mono">{reportDate}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold">{isRtl ? 'توقيع المصادقة:' : 'Authorized Signature:'}</span>
                      <p className="font-bold text-gray-500 mt-0.5 italic">{signatureText ? '✍️ Text stamp' : (isSignCanvasDrawn ? '🖋️ Drawn Signature' : '⚠️ Unsigned')}</p>
                    </div>
                  </div>

                  {/* Sections Review */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-extrabold text-[#040957] dark:text-amber-400 text-xs tracking-wider">{isRtl ? 'ملخص الأقسام الجاهزة للإرسال:' : 'Draft Sections Ready for Central Queue:'}</h4>
                    
                    {/* Attendance section summary */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border">
                      <div className="flex items-center gap-2">
                        <Users className="w-4.5 h-4.5 text-blue-500" />
                        <div>
                          <span className="font-extrabold text-gray-850 dark:text-gray-250 block text-xs">{isRtl ? 'كشف تحضير العمالة' : 'Workforce Attendance checklist'}</span>
                          <span className="text-[10px] text-gray-400">{isRtl ? 'يتم تحضير كافة عمال شفت الموقع المسجلين.' : 'Ready to push to database logs.'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold uppercase">
                        {isRtl ? 'جاهز' : 'READY'}
                      </span>
                    </div>

                    {/* Progress updates section summary */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4.5 h-4.5 text-amber-500" />
                        <div>
                          <span className="font-extrabold text-gray-850 dark:text-gray-250 block text-xs">{isRtl ? 'تحديثات الإنتاج والمنجز' : 'Production Output registers'}</span>
                          <span className="text-[10px] text-gray-400">
                            {isRtl ? `تم تسجيل ${prodUpdates.length} تحديثات تقدم ميدانية.` : `Contains ${prodUpdates.length} shift logs.`}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${prodUpdates.length > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                        {prodUpdates.length > 0 ? (isRtl ? 'جاهز' : 'READY') : (isRtl ? 'اختياري (فارغ)' : 'OPTIONAL (EMPTY)')}
                      </span>
                    </div>

                    {/* Safety section summary */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4.5 h-4.5 text-emerald-500" />
                        <div>
                          <span className="font-extrabold text-gray-850 dark:text-gray-250 block text-xs">{isRtl ? 'سجل الامتثال والسلامة اليومية' : 'Daily Safety compliance log'}</span>
                          <span className="text-[10px] text-gray-400">
                            {hasSafetyRecord 
                              ? (isRtl ? `الحالة: ${safeStatus ? 'آمن' : 'غير آمن'}, المخالفات: ${safeViolations}` : `Status: ${safeStatus ? 'Safe' : 'Unsafe'}, Violations: ${safeViolations}`) 
                              : (isRtl ? 'لم يتم تفعيل هذا القسم اليوم.' : 'Safety log not checked.')}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${hasSafetyRecord ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                        {hasSafetyRecord ? (isRtl ? 'مفعّل' : 'ACTIVE') : (isRtl ? 'تجاوز القسم' : 'SKIPPED')}
                      </span>
                    </div>

                    {/* Delay & Incident section summary */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800 border">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                        <div>
                          <span className="font-extrabold text-gray-850 dark:text-gray-250 block text-xs">{isRtl ? 'معوقات الجدول الحركي وبلاغات الطوارئ' : 'Timeline delays & Incident tickets'}</span>
                          <span className="text-[10px] text-gray-400">
                            {hasDelayRecord || hasIssueReport 
                              ? (isRtl ? 'تم صياغة حوادث معوقات لرفعها لمهندس المشروع.' : 'Ready to escalate with critical priority.')
                              : (isRtl ? 'لا توجد بلاغات مسجلة لليوم.' : 'No active delays/issues filed.')}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${hasDelayRecord || hasIssueReport ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                        {hasDelayRecord || hasIssueReport ? (isRtl ? 'مفعّل' : 'ESCALATING') : (isRtl ? 'تجاوز القسم' : 'SKIPPED')}
                      </span>
                    </div>

                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
                  >
                    <ChevronRight className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                    <span>{isRtl ? 'السابق: سجلات الطوارئ' : 'Back: Safety'}</span>
                  </button>

                  <button
                    onClick={handleSubmitReport}
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-black px-8 py-3.5 rounded-2xl text-xs flex items-center gap-2 transition shadow-xl"
                  >
                    {isSubmitting ? (
                      <div className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4.5 h-4.5" />
                    )}
                    <span>{isRtl ? 'رفع التقرير الميداني للموافقة 🚀' : 'Transmit Daily Field Report 🚀'}</span>
                  </button>
                </div>
              </motion.div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
