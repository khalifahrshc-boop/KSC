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
  SystemSettings,
  WarehouseMaterial,
  MaterialConsumption,
  MaterialDelivery,
  FieldRequest,
  EquipmentItem
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
  FileSpreadsheet,
  Globe,
  Printer,
  Eye,
  Edit,
  Package,
  Wrench,
  UserCheck,
  Calculator,
  Truck,
  ShoppingCart,
  Zap
} from 'lucide-react';
import { getActivityProgress } from '../utils/progressCalculations';
import { dbApi } from '../lib/api';
import { runWithOklchSanitizer } from '../utils/pdfSanitizer';

interface FieldPortalProps {
  settings: SystemSettings;
  lang: 'ar' | 'en';
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  workers: Worker[];
  materials: WarehouseMaterial[];
  equipment: EquipmentItem[];
  progressUpdates?: ProgressUpdate[];
  fieldRequests?: FieldRequest[];
  onAddPendingSubmission: (submission: FieldWorkSubmission) => Promise<void>;
  onAddFieldRequest: (request: Omit<FieldRequest, 'id'>) => Promise<void>;
  onReturnToMain: () => void;
  onToggleLanguage: () => void;
}

export default function FieldPortal({
  settings,
  lang,
  projects,
  workItems,
  activities,
  workers,
  materials,
  equipment,
  progressUpdates = [],
  fieldRequests = [],
  onAddPendingSubmission,
  onAddFieldRequest,
  onReturnToMain,
  onToggleLanguage
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
  const [lastSubmission, setLastSubmission] = useState<FieldWorkSubmission | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

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
  const [materialDeliveries, setMaterialDeliveries] = useState<Omit<MaterialDelivery, 'id'>[]>([]);
  
  // Individual update form state
  const [prodWiId, setProdWiId] = useState('');
  const [prodActId, setProdActId] = useState('');
  const [prodTime, setProdTime] = useState('10:00 AM');
  const [prodCompletedQty, setProdCompletedQty] = useState<number>(10);
  const [prodWorkersUsed, setProdWorkersUsed] = useState<number>(2);
  const [prodWorkerNames, setProdWorkerNames] = useState<string[]>([]);
  const [customWorkerName, setCustomWorkerName] = useState('');
  const [prodNotes, setProdNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, content: string}[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Material consumption in current form
  const [currentConsumptions, setCurrentConsumptions] = useState<MaterialConsumption[]>([]);
  const [tempMatId, setTempMatId] = useState('');
  const [tempMatQty, setTempMatQty] = useState(0);
  const [tempDelId, setTempDelId] = useState('');
  const [tempDelQty, setTempDelQty] = useState(0);

  // Field Requests state
  const [reqType, setReqType] = useState<FieldRequest['type']>('Material');
  const [reqResourceId, setReqResourceId] = useState('');
  const [reqQuantity, setReqQuantity] = useState(1);
  const [reqPriority, setReqPriority] = useState<FieldRequest['priority']>('Normal');
  const [reqNotes, setReqNotes] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const handleSubmitFieldRequest = async () => {
    if (!reqResourceId) {
      alert(isRtl ? 'الرجاء اختيار المورد المطلوب!' : 'Please select the requested resource!');
      return;
    }
    if (reqQuantity <= 0) {
      alert(isRtl ? 'الرجاء إدخال كمية صحيحة!' : 'Please enter a valid quantity!');
      return;
    }

    try {
      setIsSubmittingRequest(true);
      
      let resNameEn = '';
      let resNameAr = '';
      let resUnit = 'Units';

      if (reqType === 'Material') {
        const m = materials.find(mat => mat.id === reqResourceId);
        resNameEn = m?.nameEn || '';
        resNameAr = m?.nameAr || '';
        resUnit = m?.unit || 'Units';
      } else if (reqType === 'Equipment') {
        const e = equipment.find(eq => eq.id === reqResourceId);
        resNameEn = e?.nameEn || '';
        resNameAr = e?.nameAr || '';
        resUnit = 'Units';
      } else {
        resNameEn = reqResourceId;
        resNameAr = reqResourceId;
        resUnit = isRtl ? 'عمال' : 'Workers';
      }

      await onAddFieldRequest({
        projectId: selectedProjectId,
        supervisorId: supBadge || '000',
        supervisorName: supName || 'Field Supervisor',
        type: reqType,
        resourceId: reqResourceId,
        resourceNameEn: resNameEn,
        resourceNameAr: resNameAr,
        quantity: reqQuantity,
        unit: resUnit,
        status: 'Pending',
        priority: reqPriority,
        notes: reqNotes,
        timestamp: new Date().toISOString()
      });

      triggerToast(isRtl ? 'تم إرسال طلب الموارد بنجاح!' : 'Resource request submitted successfully!');
      
      // Reset request form
      setReqResourceId('');
      setReqQuantity(1);
      setReqNotes('');
    } catch (error) {
      console.error('Request submission error:', error);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Edit/Details state for production updates
  const [editingProdIdx, setEditingProdIdx] = useState<number | null>(null);
  const [isActivityDetailsOpen, setIsActivityDetailsOpen] = useState(false);
  const [activityForDetails, setActivityForDetails] = useState<Activity | null>(null);

  // Remaining Quantity calculations for selected sub-activity in FieldPortal
  const currentActivity = activities.find(a => a.id === prodActId);
  const dbProgress = (progressUpdates || [])
    .filter(upd => upd.activityId === prodActId)
    .reduce((sum, upd) => sum + upd.completedQuantity, 0);
  const localSessionProgress = prodUpdates
    .filter(upd => upd.activityId === prodActId)
    .reduce((sum, upd) => sum + Number(upd.completedQuantity), 0);
  const activityProgress = dbProgress + localSessionProgress;
  const remainingQty = currentActivity ? Math.max(0, currentActivity.totalQuantity - activityProgress) : 0;
  const isActivityCompleted = currentActivity ? (activityProgress >= currentActivity.totalQuantity && currentActivity.totalQuantity > 0) : false;

  const calculateDaysRemaining = (finishDate?: string) => {
    if (!finishDate) return null;
    const finish = new Date(finishDate);
    const today = new Date();
    // Normalize to start of day for accurate day counting
    today.setHours(0, 0, 0, 0);
    finish.setHours(0, 0, 0, 0);
    const diffTime = finish.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = currentActivity ? calculateDaysRemaining(currentActivity.expectedFinishDate) : null;

  // Clamping prodCompletedQty if it exceeds remainingQty
  useEffect(() => {
    if (prodCompletedQty > remainingQty) {
      setProdCompletedQty(remainingQty);
    }
  }, [prodActId, remainingQty, prodCompletedQty]);

  // Calculate present workers count
  const presentWorkersCount = Object.values(workerAttendanceState).filter((a: any) => a.isPresent).length;

  // Clamping prodWorkersUsed if it exceeds presentWorkersCount
  useEffect(() => {
    if (prodWorkersUsed > presentWorkersCount) {
      setProdWorkersUsed(presentWorkersCount);
    }
  }, [presentWorkersCount, prodWorkersUsed]);

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
        ? `لا يمكن تجاوز الكمية المتبقية (${remainingQty} ${activityObj.unit}).` 
        : `Cannot exceed remaining quantity (${remainingQty} ${activityObj.unit}).`);
      return;
    }

    const fileList = uploadedFiles.map(f => f.content);

    const newUpdate = {
      workItemId: prodWiId,
      activityId: prodActId,
      time: prodTime,
      completedQuantity: qtyToAdd,
      numberOfWorkers: prodWorkersUsed,
      workerNames: prodWorkerNames,
      equipmentUsed: [],
      materialConsumptions: currentConsumptions,
      completionPercentage: Math.round(((activityProgress + qtyToAdd) / activityObj.totalQuantity) * 100),
      notes: prodNotes,
      photos: fileList,
      documents: []
    };

    setProdUpdates(prev => [...prev, newUpdate]);
    setProdNotes('');
    setProdWorkerNames([]);
    setCurrentConsumptions([]);
    setUploadedFiles([]);
    triggerToast(isRtl ? 'تمت إضافة تحديث الإنتاج بنجاح' : 'Production record added to summary');
  };

  const toggleWorkerInProduction = (name: string) => {
    setProdWorkerNames(prev => {
      const isSelected = prev.includes(name);
      const newNames = isSelected ? prev.filter(n => n !== name) : [...prev, name];
      
      // Auto-sync the count if it matches or if adding
      if (!isSelected && prodWorkersUsed < newNames.length) {
        setProdWorkersUsed(newNames.length);
      }
      return newNames;
    });
  };

  const addCustomWorker = () => {
    if (customWorkerName.trim()) {
      if (!prodWorkerNames.includes(customWorkerName.trim())) {
        setProdWorkerNames(prev => {
          const newNames = [...prev, customWorkerName.trim()];
          if (prodWorkersUsed < newNames.length) {
            setProdWorkersUsed(newNames.length);
          }
          return newNames;
        });
      }
      setCustomWorkerName('');
    }
  };

  const handleEditProductionRecord = (idx: number) => {
    const update = prodUpdates[idx];
    setEditingProdIdx(idx);
    setProdWiId(update.workItemId);
    setProdActId(update.activityId);
    setProdTime(update.time);
    setProdCompletedQty(update.completedQuantity);
    setProdWorkersUsed(update.numberOfWorkers);
    setProdWorkerNames(update.workerNames || []);
    setProdNotes(update.notes);
    // Note: for simplicity we don't reload photos into the upload area
    // as they are already stored in the update record.
    // If they want to change photos, they can delete and re-add or we could handle it better.
    // But typically editing text/quantity is enough.
  };

  const handleUpdateProductionRecord = () => {
    if (editingProdIdx === null || !prodActId) return;

    const activityObj = activities.find(a => a.id === prodActId);
    if (!activityObj) return;

    const qtyToAdd = Number(prodCompletedQty);
    // When editing, we need to adjust remainingQty calculation
    // because the current record is already counted in localSessionProgress
    const localOtherProgress = prodUpdates
      .filter((upd, i) => i !== editingProdIdx && upd.activityId === prodActId)
      .reduce((sum, upd) => sum + Number(upd.completedQuantity), 0);
    const adjActivityProgress = dbProgress + localOtherProgress;
    const adjRemainingQty = Math.max(0, activityObj.totalQuantity - adjActivityProgress);

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

    if (qtyToAdd > adjRemainingQty) {
      alert(isRtl 
        ? `لا يمكن تجاوز الكمية المتبقية (${adjRemainingQty} ${activityObj.unit}).` 
        : `Cannot exceed remaining quantity (${adjRemainingQty} ${activityObj.unit}).`);
      return;
    }

    const updatedUpdates = [...prodUpdates];
    updatedUpdates[editingProdIdx] = {
      ...updatedUpdates[editingProdIdx],
      workItemId: prodWiId,
      activityId: prodActId,
      time: prodTime,
      completedQuantity: qtyToAdd,
      numberOfWorkers: prodWorkersUsed,
      workerNames: prodWorkerNames,
      materialConsumptions: currentConsumptions,
      completionPercentage: Math.round(((adjActivityProgress + qtyToAdd) / activityObj.totalQuantity) * 100),
      notes: prodNotes,
    };

    setProdUpdates(updatedUpdates);
    setEditingProdIdx(null);
    setProdNotes('');
    setProdWorkerNames([]);
    setCurrentConsumptions([]);
    setUploadedFiles([]);
    triggerToast(isRtl ? 'تم تحديث التحديث بنجاح' : 'Production record updated');
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
    
    const consumedInSession = prodUpdates
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

  const handleOpenActivityDetails = (actId: string) => {
    const act = activities.find(a => a.id === actId);
    if (act) {
      setActivityForDetails(act);
      setIsActivityDetailsOpen(true);
    }
  };

  const handlePrintProductionDetailPDF = async (update: Omit<ProgressUpdate, 'id' | 'projectId'>) => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const act = activities.find(a => a.id === update.activityId);
      const projectName = selectedProject ? (isRtl ? selectedProject.nameAr : selectedProject.nameEn) : '---';

      const content = `
        <div style="font-family: 'Cairo', 'Inter', sans-serif; padding: 25px; direction: ${isRtl ? 'rtl' : 'ltr'}; color: #1e293b; background-color: white;">
          <div style="border-bottom: 2px solid #040957; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1 style="margin: 0; font-size: 16px; color: #040957;">${isRtl ? settings.companyNameAr : settings.companyNameEn}</h1>
              <p style="margin: 3px 0 0 0; font-size: 9px; color: #64748b;">${isRtl ? 'تفاصيل إنجاز النشاط الميداني' : 'Field Activity Production Detail'}</p>
            </div>
            <div style="text-align: ${isRtl ? 'left' : 'right'}; font-size: 9px; color: #94a3b8;">
              ${new Date().toLocaleString(isRtl ? 'ar-SA' : 'en-GB')}
            </div>
          </div>

          <div style="margin-bottom: 20px; background-color: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0;">
            <div style="margin-bottom: 10px;">
              <span style="font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block;">${isRtl ? 'المشروع' : 'Project'}</span>
              <span style="font-size: 11px; font-weight: bold; color: #1e293b;">${projectName}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <span style="font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block;">${isRtl ? 'النشاط الفعلي' : 'Target Activity'}</span>
              <span style="font-size: 11px; font-weight: bold; color: #040957;">${isRtl ? act?.nameAr : act?.nameEn}</span>
            </div>
            <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 15px;">
              <div>
                <span style="font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block;">${isRtl ? 'الكمية المنجزة' : 'Quantity Produced'}</span>
                <span style="font-size: 12px; font-weight: 800; color: #0284c7;">+${update.completedQuantity} ${act?.unit || ''}</span>
              </div>
              <div>
                <span style="font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block;">${isRtl ? 'وقت التسجيل' : 'Log Time'}</span>
                <span style="font-size: 11px; font-weight: bold; color: #1e293b;">${update.time}</span>
              </div>
            </div>
          </div>

          ${update.workerNames && update.workerNames.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h4 style="font-size: 11px; color: #040957; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
                👥 ${isRtl ? 'العمال المشاركون في هذا النشاط' : 'Workers Assigned to this Activity'}
              </h4>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${update.workerNames.map(name => `
                  <span style="font-size: 9px; background-color: #f8fafc; color: #334155; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0; font-weight: bold; display: inline-block;">
                    👤 ${name}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${update.materialConsumptions && update.materialConsumptions.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h4 style="font-size: 11px; color: #040957; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px;">
                🏗️ ${isRtl ? 'المواد المستهلكة في هذا النشاط' : 'Materials Consumed for this Activity'}
              </h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
                <thead>
                  <tr style="background-color: #f1f5f9; color: #475569;">
                    <th style="padding: 6px; border: 1px solid #e2e8f0; text-align: ${isRtl ? 'right' : 'left'};">${isRtl ? 'المادة' : 'Material'}</th>
                    <th style="padding: 6px; border: 1px solid #e2e8f0; text-align: center;">${isRtl ? 'الكمية' : 'Quantity'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${update.materialConsumptions.map(c => `
                    <tr>
                      <td style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold;">${isRtl ? c.materialNameAr : c.materialNameEn}</td>
                      <td style="padding: 6px; border: 1px solid #e2e8f0; text-align: center; color: #1d4ed8; font-weight: 800;">${c.quantityUsed} ${c.unit}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${update.notes ? `
            <div style="margin-bottom: 20px; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px;">
              <span style="font-size: 8px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 4px;">${isRtl ? 'ملاحظات وتوجيهات المشرف' : 'Supervisor Technical Notes'}</span>
              <p style="margin: 0; font-size: 10px; line-height: 1.5; color: #334155;">${update.notes}</p>
            </div>
          ` : ''}

          <div style="margin-top: 30px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
            <p style="font-size: 8px; color: #94a3b8;">${isRtl ? 'تم إصدار هذا التفصيل من بوابة المشرف الميدانية الرقمية - شركة الرشيد للمقاولات' : 'Generated via Rashed Al-Subaie Digital Field Supervisor Portal'}</p>
          </div>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `Production_Detail_${update.time.replace(/ /g, '_')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a5' as const, orientation: 'portrait' as const }
      };

      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(content).save();
      });
    } catch (error) {
      console.error('Production PDF Error:', error);
    }
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

      // Assemble material deliveries
      const deliveryList: MaterialDelivery[] = materialDeliveries.map((d, index) => ({
        ...d,
        id: `delv-${Date.now()}-${index}`
      }));

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
        materialDeliveries: deliveryList,
        safetyRecord: safetyRec,
        delayRecord: delayRec,
        issueReport: issueRec
      };

      await onAddPendingSubmission(submission);
      setSuccessSubmissionId(submission.id);
      setLastSubmission(submission);
      triggerToast(isRtl ? 'تم تقديم التقرير بنجاح!' : 'Field Report Submitted Successfully!');
    } catch (e) {
      console.error(e);
      alert(isRtl ? 'حدث خطأ أثناء تقديم التقرير' : 'An error occurred while submitting the report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!lastSubmission) return;
    try {
      setIsPrinting(true);
      const html2pdf = (await import('html2pdf.js')).default;
      
      let printFrame = document.getElementById('field-report-pdf-iframe') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'field-report-pdf-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '-9999px';
        printFrame.style.bottom = '0';
        printFrame.style.width = '1000px';
        printFrame.style.height = '1200px';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
      }

      const selectedProjectName = selectedProject 
        ? (isRtl ? selectedProject.nameAr : selectedProject.nameEn)
        : '-';

      // Build attendance table rows
      let attendanceRowsHtml = '';
      if (!lastSubmission.attendanceRecords || lastSubmission.attendanceRecords.length === 0) {
        attendanceRowsHtml = `<tr><td colspan="5" style="text-align: center; padding: 12px; color: #64748b; font-size: 11px;">${isRtl ? 'لا يوجد سجلات حضور مسجلة' : 'No attendance records registered'}</td></tr>`;
      } else {
        attendanceRowsHtml = lastSubmission.attendanceRecords.map((r, index) => {
          const statusLabel = isRtl ? (
            r.status === 'Present' ? 'حاضر' :
            r.status === 'Absent' ? 'غائب' :
            r.status === 'Late' ? 'متأخر' :
            r.status === 'Sick' ? 'مرضي' :
            r.status === 'AnnualLeave' ? 'إجازة سنوية' : 'إجازة قصيرة'
          ) : r.status;
          const prof = isRtl ? r.professionAr : r.professionEn;
          return `
            <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: #1e293b;">${r.workerName}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569;">${prof}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center;">
                <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 9px; 
                  background-color: ${r.isPresent ? '#ecfdf5' : '#fef2f2'}; 
                  color: ${r.isPresent ? '#047857' : '#b91c1c'};">
                  ${statusLabel}
                </span>
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center; font-weight: bold; color: #334155;">${r.isPresent ? `${r.shiftTime} hrs` : '-'}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b; font-style: italic;">${r.notes || '-'}</td>
            </tr>
          `;
        }).join('');
      }

      // Build production updates rows
      let productionRowsHtml = '';
      if (!lastSubmission.progressUpdates || lastSubmission.progressUpdates.length === 0) {
        productionRowsHtml = `<tr><td colspan="6" style="text-align: center; padding: 12px; color: #64748b; font-size: 11px;">${isRtl ? 'لا يوجد تحديثات كميات مسجلة' : 'No quantity updates registered'}</td></tr>`;
      } else {
        productionRowsHtml = lastSubmission.progressUpdates.map((p, index) => {
          const act = activities.find(a => a.id === p.activityId);
          const wi = act ? workItems.find(w => w.id === act.workItemId) : null;
          const actName = act ? (isRtl ? act.nameAr : act.nameEn) : p.activityId;
          const wiName = wi ? (isRtl ? wi.nameAr : wi.nameEn) : '';
          return `
            <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600; color: #1e293b;">${wiName}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #475569;">${actName}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center; font-weight: bold; color: #0f172a;">${p.time}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center; font-weight: 800; color: #0284c7;">+${p.completedQuantity} ${act?.unit || ''}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center; font-weight: bold; color: #475569;">
                ${p.numberOfWorkers}
                ${p.workerNames && p.workerNames.length > 0 ? `
                  <div style="font-size: 8px; color: #64748b; font-weight: normal; margin-top: 2px; line-height: 1.2;">
                    ${p.workerNames.join(', ')}
                  </div>
                ` : ''}
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">${p.notes || '-'}</td>
            </tr>
          `;
        }).join('');
      }

      const formattedSubmitTime = new Date(lastSubmission.timestamp).toLocaleString(isRtl ? 'ar-SA' : 'en-GB');

      // Safety box details
      let safetyHtml = '';
      if (lastSubmission.safetyRecord) {
        const sr = lastSubmission.safetyRecord;
        safetyHtml = `
          <div style="background-color: ${sr.safeStatus ? '#f0fdf4' : '#fffbeb'}; border: 1px solid ${sr.safeStatus ? '#bbf7d0' : '#fef08a'}; border-radius: 12px; padding: 15px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: ${sr.safeStatus ? '#15803d' : '#a16207'}; font-size: 13px;">
                ${sr.safeStatus ? (isRtl ? '✅ الموقع آمن وخالٍ من الحوادث' : '✅ Site Safe & Compliant') : (isRtl ? '⚠️ تم رصد مخالفات سلامة مهنية' : '⚠️ Safety Infractions Logged')}
              </strong>
              <span style="font-size: 11px; font-weight: bold; color: #475569;">
                ${isRtl ? 'عدد المخالفات:' : 'Violations count:'} <span style="color: #ef4444; font-weight: 800;">${sr.violationsCount}</span>
              </span>
            </div>
            <p style="margin: 0; font-size: 11px; color: #334155;">
              <strong>${isRtl ? 'ملاحظات تدقيق السلامة:' : 'Safety audit notes:'}</strong> ${sr.safetyNotes || (isRtl ? 'لا توجد ملاحظات إضافية.' : 'No additional safety logs.')}
            </p>
          </div>
        `;
      } else {
        safetyHtml = `<p style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 5px;">${isRtl ? 'لم يتم تضمين سجل سلامة مخصص في هذا التقرير.' : 'No dedicated safety log specified.'}</p>`;
      }

      // Delay box details
      let delayHtml = '';
      if (lastSubmission.delayRecord) {
        const dr = lastSubmission.delayRecord;
        const delayLabel = isRtl ? (
          dr.delayType === 'Weather' ? 'أحوال جوية سيئة' :
          dr.delayType === 'Materials' ? 'نقص مواد التوريد' :
          dr.delayType === 'Equipment' ? 'تعطل المعدات والآلات' :
          dr.delayType === 'Manpower' ? 'نقص الأيدي العاملة' :
          dr.delayType === 'Permits' ? 'تراخيص وموافقات جهات خارجية' : 'عوامل فنية وتصميمية أخرى'
        ) : dr.delayType;

        delayHtml = `
          <div style="background-color: #fffaf0; border: 1px solid #fed7aa; border-radius: 12px; padding: 15px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #c2410c; font-size: 13px;">
                🚨 ${isRtl ? 'سجل تأخير وإعاقة للموقع' : '🚨 Registered Operational Site Delay'}
              </strong>
              <span style="font-size: 11px; background-color: #ffedd5; color: #9a3412; padding: 2px 8px; border-radius: 6px; font-weight: bold;">
                ${delayLabel}
              </span>
            </div>
            <div style="font-size: 11px; color: #334155; space-y-1;">
              <p style="margin: 0 0 6px 0;"><strong>${isRtl ? 'توصيف الإعاقة الميدانية:' : 'Delay Description:'}</strong> ${dr.description}</p>
              <p style="margin: 0 0 6px 0;"><strong>${isRtl ? 'مستوى التأثير المتوقع:' : 'Impact Severity:'}</strong> <span style="color: #ea580c; font-weight: bold;">${dr.impactLevel}</span></p>
              <p style="margin: 0;"><strong>${isRtl ? 'خطة تلافي التأخير المعروضة:' : 'Proposed Recovery Plan:'}</strong> ${isRtl ? dr.resolutionPlanAr : dr.resolutionPlanEn}</p>
            </div>
          </div>
        `;
      } else {
        delayHtml = `<p style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 5px;">${isRtl ? 'لا توجد إعاقات أو تأخيرات معلنة في هذا التقرير.' : 'No active delays registered in this log.'}</p>`;
      }

      // Incident box details
      let incidentHtml = '';
      if (lastSubmission.issueReport) {
        const ir = lastSubmission.issueReport;
        incidentHtml = `
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 15px; margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #991b1b; font-size: 13px;">
                🔥 ${isRtl ? 'بلاغ حادث/مشكلة حرجة مسجل' : '🔥 Active Field Incident Report'}
              </strong>
              <span style="font-size: 10px; background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 6px; font-weight: 800;">
                ${ir.priority.toUpperCase()}
              </span>
            </div>
            <div style="font-size: 11px; color: #334155;">
              <p style="margin: 0 0 6px 0;"><strong>${isRtl ? 'عنوان البلاغ الميداني:' : 'Incident Title:'}</strong> ${isRtl ? ir.titleAr : ir.titleEn}</p>
              <p style="margin: 0;"><strong>${isRtl ? 'التوصيف الفني للمشكلة:' : 'Technical Description:'}</strong> ${ir.description}</p>
            </div>
          </div>
        `;
      } else {
        incidentHtml = `<p style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 5px;">${isRtl ? 'لم تسجل أي مشاكل فنية أو حوادث أمن صناعي.' : 'No incidents or critical site issues reported.'}</p>`;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cairo:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Cairo', 'Inter', sans-serif;
              direction: ${isRtl ? 'rtl' : 'ltr'};
              color: #1e293b;
              background-color: #ffffff;
              padding: 0;
              margin: 0;
            }
            .container {
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              box-sizing: border-box;
            }
            .header-banner {
              background-color: #040957;
              color: #ffffff;
              border-radius: 16px;
              padding: 24px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header-title-sec {
              flex: 1;
            }
            .header-title-sec h1 {
              font-size: 18px;
              font-weight: 800;
              margin: 0 0 6px 0;
              color: #fbbf24;
            }
            .header-title-sec p {
              font-size: 11px;
              margin: 0;
              color: #e2e8f0;
              font-weight: 500;
            }
            .badge-success {
              background-color: #10b981;
              color: white;
              font-size: 10px;
              font-weight: 800;
              padding: 6px 12px;
              border-radius: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .section-card {
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 18px;
              margin-bottom: 20px;
            }
            .section-card-title {
              font-size: 13px;
              font-weight: 800;
              color: #040957;
              border-bottom: 2px solid #040957;
              padding-bottom: 8px;
              margin-top: 0;
              margin-bottom: 14px;
              display: flex;
              justify-content: space-between;
            }
            .meta-grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 12px;
            }
            .meta-item {
              background-color: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 10px;
              padding: 8px 12px;
            }
            .meta-label {
              font-size: 9px;
              color: #64748b;
              font-weight: bold;
              display: block;
              margin-bottom: 3px;
              text-transform: uppercase;
            }
            .meta-value {
              font-size: 11px;
              color: #0f172a;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 5px;
              table-layout: fixed;
            }
            th {
              background-color: #f1f5f9;
              color: #040957;
              font-weight: bold;
              font-size: 10px;
              padding: 10px;
              text-align: ${isRtl ? 'right' : 'left'};
              border-bottom: 2px solid #cbd5e1;
              word-wrap: break-word;
              word-break: break-word;
              overflow-wrap: break-word;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 10px;
              color: #334155;
              word-wrap: break-word;
              word-break: break-word;
              overflow-wrap: break-word;
            }
            .sig-area {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
              gap: 20px;
            }
            .sig-box {
              flex: 1;
              border-top: 1px dashed #94a3b8;
              text-align: center;
              padding-top: 10px;
              font-size: 10px;
            }
            .sig-title {
              font-weight: bold;
              color: #040957;
              margin-bottom: 4px;
            }
            .sig-name {
              color: #475569;
            }
            .legal-badge {
              background-color: #f0fdfa;
              border: 1px solid #ccfbf1;
              color: #0f766e;
              border-radius: 12px;
              padding: 14px;
              font-size: 10px;
              line-height: 1.6;
              margin-top: 25px;
              text-align: center;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div id="pdf-content" class="container">
            <!-- Header Section -->
            <div class="header-banner">
              ${settings.companyLogoUrl ? `
                <div style="background-color: white; padding: 5px; border-radius: 12px; margin-${isRtl ? 'left' : 'right'}: 20px; display: flex; align-items: center; justify-content: center; height: 90px; width: 90px; flex-shrink: 0; box-shadow: inset 0 0 10px rgba(0,0,0,0.05);">
                  <img src="${settings.companyLogoUrl}" style="max-height: 80px; width: auto; object-fit: contain;" />
                </div>
              ` : `
                <div style="background-color: #f1f5f9; color: #040957; padding: 5px; border-radius: 12px; margin-${isRtl ? 'left' : 'right'}: 20px; display: flex; align-items: center; justify-content: center; height: 90px; width: 90px; flex-shrink: 0; font-size: 32px; font-weight: 900;">
                  ${settings.companyNameEn.charAt(0)}
                </div>
              `}
              <div class="header-title-sec">
                <h1>${isRtl ? settings.companyNameAr : settings.companyNameEn}</h1>
                <p>${isRtl ? 'إيصال تقديم التقرير الميداني الرقمي المعتمد' : 'Official Digital Field Daily Log Receipt'}</p>
                <p style="margin-top: 3px; font-size: 9px; color: #cbd5e1;">UUID: ${lastSubmission.id} | Timestamp: ${formattedSubmitTime}</p>
              </div>
              <div>
                <span class="badge-success">${isRtl ? 'تم الرفع والاعتماد الإلكتروني للمشرف' : 'SUBMITTED TO REVIEW'}</span>
              </div>
            </div>

            <!-- Metadata Section -->
            <div class="section-card">
              <h2 class="section-card-title">
                <span>📋 ${isRtl ? 'بيانات التقرير والمشرف المسؤول' : 'Report & Supervisor Metadata'}</span>
              </h2>
              <div class="meta-grid">
                <div class="meta-item">
                  <span class="meta-label">${isRtl ? 'اسم المشروع' : 'Project Name'}</span>
                  <span class="meta-value">${selectedProjectName}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${isRtl ? 'مشرف الموقع المسؤول' : 'Site Supervisor'}</span>
                  <span class="meta-value">${lastSubmission.supervisorName} (Badge: ${lastSubmission.badgeNumber})</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${isRtl ? 'تاريخ العمل الفعلي' : 'Target Work Date'}</span>
                  <span class="meta-value">${lastSubmission.date}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">${isRtl ? 'رمز التحقق والتسجيل الرقمي' : 'Digital Verification Handshake'}</span>
                  <span class="meta-value" style="font-family: monospace; color: #0284c7;">${lastSubmission.signatureData}</span>
                </div>
              </div>
            </div>

            <!-- Attendance Section -->
            <div class="section-card">
              <h2 class="section-card-title">
                <span>👥 ${isRtl ? 'سجل حضور القوى العاملة المعتمد' : 'Crew Force Attendance Ledger'}</span>
                <span style="font-size: 10px; color: #475569; font-weight: normal;">${lastSubmission.attendanceRecords.length} ${isRtl ? 'عامل ومسؤول فني' : 'Staff Members'}</span>
              </h2>
              <table>
                <thead>
                  <tr>
                    <th style="width: 28%;">${isRtl ? 'الاسم الثنائي/الكامل' : 'Worker Name'}</th>
                    <th style="width: 22%;">${isRtl ? 'الوظيفة/المهنة' : 'Profession'}</th>
                    <th style="width: 14%; text-align: center;">${isRtl ? 'الحالة' : 'Status'}</th>
                    <th style="width: 14%; text-align: center;">${isRtl ? 'ساعات العمل' : 'Shift Duration'}</th>
                    <th style="width: 22%;">${isRtl ? 'ملاحظات وتفاصيل' : 'Remarks'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${attendanceRowsHtml}
                </tbody>
              </table>
            </div>

            <!-- Production Updates Section -->
            <div class="section-card" style="page-break-before: auto;">
              <h2 class="section-card-title">
                <span>🎯 ${isRtl ? 'تحديثات الكميات والإنتاجية ثنائية الساعة' : 'Bi-Hourly Quantity & Output Updates'}</span>
                <span style="font-size: 10px; color: #475569; font-weight: normal;">${lastSubmission.progressUpdates.length} ${isRtl ? 'تحديث موقعي' : 'Updates Logged'}</span>
              </h2>
              <table>
                <thead>
                  <tr>
                    <th style="width: 20%;">${isRtl ? 'حزمة العمل' : 'Work Item'}</th>
                    <th style="width: 22%;">${isRtl ? 'النشاط الفرعي' : 'Sub-Activity'}</th>
                    <th style="width: 12%; text-align: center;">${isRtl ? 'الوقت' : 'Time'}</th>
                    <th style="width: 16%; text-align: center;">${isRtl ? 'الكمية المنفذة' : 'Completed Qty'}</th>
                    <th style="width: 12%; text-align: center;">${isRtl ? 'الأيدي العاملة' : 'Crew Size'}</th>
                    <th style="width: 18%;">${isRtl ? 'تفاصيل التنفيذ' : 'Notes/Execution'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${productionRowsHtml}
                </tbody>
              </table>
            </div>

            <!-- Safety & Delays Section -->
            <div class="section-card">
              <h2 class="section-card-title">
                <span>🛡️ ${isRtl ? 'السلامة والتدقيق والمشاكل الميدانية' : 'Safety, Compliance & Site Incidents'}</span>
              </h2>
              <div>
                <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #475569;">${isRtl ? '1. حالة السلامة المهنية ومعدات الحماية:' : '1. Occupational Health & Safety Compliance:'}</h4>
                ${safetyHtml}
              </div>
              <div style="margin-top: 18px;">
                <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #475569;">2. ${isRtl ? 'عوائق الموقع وإعاقات تمنع التنفيذ:' : '2. Operational Constraints & Project Delays:'}</h4>
                ${delayHtml}
              </div>
              <div style="margin-top: 18px;">
                <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #475569;">3. ${isRtl ? 'بلاغات الحوادث والمخاطر الحرجة:' : '3. Critical Field Incidents & Risk Notifications:'}</h4>
                ${incidentHtml}
              </div>
            </div>

            <!-- Legal Protection Badge -->
            <div class="legal-badge">
              🚨 ${isRtl ? 'تنويه قانوني وحماية للمشرف:' : 'Supervisor Digital Safe-Guard & Legal Disclaimer:'}<br/>
              ${isRtl ? 'يمثل هذا المستند الإلكتروني إثباتاً آمناً وغير قابل للتعديل لجميع التفاصيل والكميات المنجزة التي تم الإبلاغ عنها وإرسالها من الموقع بواسطة المشرف في الوقت المحدد. يهدف هذا المستند لحفظ حقوق الطاقم الفني وتوفير حماية كاملة للمشرف في حال وجود أي خلافات في الحصر لاحقاً.' : 'This secure electronic log contains cryptographic digital signatures of the Site Supervisor captured at checkout. It represents an unalterable official receipt of reported site metrics, providing full legal safeguard, compliance protection, and work history audit trail for the supervisor.'}
            </div>

            <!-- Signatures -->
            <div class="sig-area">
              <div class="sig-box">
                <div class="sig-title">${isRtl ? 'مشرف الموقع المعتمد (المرسِل)' : 'Field Supervisor (Sender)'}</div>
                <div style="height: 35px; margin: 5px 0; line-height: 35px; font-family: monospace; font-weight: bold; color: #0284c7; font-size: 11px; font-style: italic;">
                  ${lastSubmission.signatureData}
                </div>
                <div class="sig-name">${lastSubmission.supervisorName}</div>
              </div>
              <div class="sig-box">
                <div class="sig-title">${isRtl ? 'استشاري الإشراف والمطابقة' : 'Consultant Audit & Review'}</div>
                <div style="height: 35px;"></div>
                <div class="sig-name">____________________</div>
              </div>
              <div class="sig-box">
                <div class="sig-title">${isRtl ? 'اعتماد مدير قسم المشاريع' : 'Project Management Director'}</div>
                <div style="height: 35px;"></div>
                <div class="sig-name">____________________</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();
      }

      // Wait briefly for content rendering
      await new Promise(resolve => setTimeout(resolve, 800));

      const element = frameDoc.getElementById('pdf-content');
      const opt = {
        margin:       [10, 10, 10, 10] as [number, number, number, number],
        filename:     `OFFICIAL_FIELD_REPORT_${lastSubmission.id}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(element).save();
      });

    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert(isRtl ? 'حدث خطأ أثناء استخراج التقرير بصيغة PDF' : 'An error occurred while generating PDF');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans py-4 px-2">
      {/* HEADER BAR FOR PORTAL */}
      <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-blue-50 text-[#0080FF] border border-blue-100 font-extrabold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
            {isRtl ? 'بوابة الإشراف الميداني الرقمية' : 'Digital Field Supervisor Portal'}
          </span>
          <h1 className="text-xl font-black text-[#040957] mt-2 flex items-center gap-2">
            <span>📱</span>
            {isRtl ? settings.companyNameAr : settings.companyNameEn}
          </h1>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {isRtl ? 'منصة توثيق ومزامنة بنود العمل والمطالبات المباشرة' : 'Secure offline-ready field supervisor logging system'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Language Toggle */}
          <button 
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl text-xs font-bold transition text-slate-700 border border-slate-200 cursor-pointer"
            title={isRtl ? 'Switch to English' : 'تغيير للغة العربية'}
          >
            <Globe className="w-4 h-4 text-[#0080FF]" />
            <span>{isRtl ? 'English' : 'العربية'}</span>
          </button>

          <button 
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl text-xs font-bold transition text-[#0080FF] border border-slate-200 cursor-pointer"
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
          className="bg-white p-8 rounded-3xl border border-gray-150 text-center space-y-6 shadow-2xl"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#040957]">
              {isRtl ? 'تم رفع التقرير الميداني بنجاح!' : 'Field Report Submitted Successfully!'}
            </h2>
            <p className="text-xs text-gray-400 font-medium">
              {isRtl 
                ? 'تم إرسال التقرير بنجاح إلى قائمة الموافقات المعلقة لمهندس المشروع.' 
                : 'Your daily logs are transmitted securely to the PM review ledger.'}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl max-w-sm mx-auto text-right text-xs space-y-2.5 font-mono border border-gray-100">
            <div className="flex justify-between">
              <span className="text-gray-400">{isRtl ? 'كود التقرير:' : 'Report ID:'}</span>
              <span className="font-bold text-[#040957]">{successSubmissionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{isRtl ? 'المشرف المسؤول:' : 'Supervisor:'}</span>
              <span className="font-bold text-gray-800">{supName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{isRtl ? 'المشروع:' : 'Project:'}</span>
              <span className="font-bold text-gray-800 truncate max-w-[200px]">
                {selectedProject ? (isRtl ? selectedProject.nameAr : selectedProject.nameEn) : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{isRtl ? 'التاريخ الميداني:' : 'Work Date:'}</span>
              <span className="font-bold text-gray-800">{reportDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{isRtl ? 'حالة الاعتماد:' : 'Approval Status:'}</span>
              <span className="font-bold text-amber-500 animate-pulse bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                {isRtl ? 'قيد المراجعة والاعتماد' : 'PENDING APPROVAL'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={handlePrintPDF}
              disabled={isPrinting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
            >
              <Printer className="w-4 h-4 animate-pulse" />
              <span>
                {isPrinting 
                  ? (isRtl ? 'جاري تصدير وثيقة الحماية...' : 'Exporting Safe PDF...') 
                  : (isRtl ? 'حفظ التقرير وإثبات الإنجاز (PDF)' : 'Save Daily Report as PDF')}
              </span>
            </button>

            <button
              onClick={() => {
                setSuccessSubmissionId(null);
                setLastSubmission(null);
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
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* STEP INDICATOR TABS */}
          <div className="grid grid-cols-6 border-b border-gray-150 bg-slate-50/50 text-center">
            {[
              { id: 1, title: isRtl ? '١. المشرف' : '1. Check-In', icon: User },
              { id: 2, title: isRtl ? '٢. العمالة' : '2. Attendance', icon: Users },
              { id: 3, title: isRtl ? '٣. الإنتاج' : '3. Output', icon: Clock },
              { id: 4, title: isRtl ? '٤. السجل' : '4. Safety', icon: ShieldAlert },
              { id: 5, title: isRtl ? '٥. الطلبات' : '5. Requests', icon: ShoppingCart },
              { id: 6, title: isRtl ? '٦. المراجعة' : '6. Submit', icon: CheckCircle }
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
                className={`py-4 px-1 flex flex-col items-center gap-1.5 transition border-b-2 relative cursor-pointer ${currentStep === step.id ? 'bg-blue-50/40 text-[#0080FF] border-[#0080FF] font-extrabold' : 'border-transparent text-gray-400 hover:text-slate-600 hover:bg-slate-50/20'}`}
              >
                <step.icon className="w-4.5 h-4.5" />
                <span className="text-[10px] font-black hidden sm:inline">{step.title}</span>
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {/* STEP 1: SUPERVISOR & PROJECT SELECTION */}
            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-[#040957]">
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
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'رقم الشارة الوظيفية:' : 'Badge Number:'}</label>
                    <input 
                      type="text" 
                      value={supBadge}
                      onChange={(e) => setSupBadge(e.target.value)}
                      placeholder="e.g. BDG-9844"
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'رقم الهوية الوطنية/الإقامة:' : 'National / Residency ID:'}</label>
                    <input 
                      type="text" 
                      value={supNationalId}
                      onChange={(e) => setSupNationalId(e.target.value)}
                      placeholder="e.g. 1098471201"
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'المسمى الوظيفي:' : 'Job Title:'}</label>
                    <input 
                      type="text" 
                      value={supTitle}
                      onChange={(e) => setSupTitle(e.target.value)}
                      placeholder="e.g. Senior Site General Inspector"
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'المشروع المستهدف:' : 'Target Project Site:'}</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold"
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
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold"
                    />
                  </div>
                </div>

                {/* SIGNATURE SECTION */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <label className="text-xs font-bold text-gray-500 block">✍️ {isRtl ? 'توقيع المشرف الرقمي:' : 'Supervisor Authorized Signature:'}</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        {isRtl 
                          ? 'ارسم توقيعك على اللوحة المخصصة للموافقة على التقرير بشكل معتمد.' 
                          : 'Draw your ink signature below to validate reports prior to PM database entry.'}
                      </p>
                      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 relative">
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
                          className="absolute bottom-2 right-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 px-2.5 py-1 rounded text-[10px] font-bold shadow-xs"
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
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold h-28 text-center"
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
                  <h2 className="text-base font-black text-[#040957]">
                    📋 {isRtl ? 'كشف تحضير العمالة والموظفين' : 'Workforce Attendance Log'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isRtl ? 'حدد حضور وغياب موظفي الموقع لهذا اليوم وحدد أوقات عملهم.' : 'Tick حضور for present employees, or change status to Late, Sick, or Leave with custom notes.'}
                  </p>
                </div>

                <div className="border border-gray-150 rounded-2xl overflow-hidden bg-gray-50/50">
                  <table className="w-full text-right text-xs divide-y divide-gray-100">
                    <thead className="bg-gray-100/50 text-[10px] text-gray-400 font-bold uppercase">
                      <tr>
                        <th className="p-3 text-right">{isRtl ? 'الموظف / المهنة' : 'Employee / Role'}</th>
                        <th className="p-3 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                        <th className="p-3 text-right">{isRtl ? 'ساعات وتفاصيل العمل' : 'Times & Notes'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
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

                        const isAssigned = activities.some(a => a.workerIds.includes(w.id));

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
                          <tr key={w.id} className="hover:bg-gray-50/50">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="font-extrabold text-gray-800 text-xs">{w.fullName}</div>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter ${isAssigned ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {isAssigned ? (isRtl ? 'مخصص لعمل' : 'Assigned') : (isRtl ? 'متاح للعمل' : 'Available')}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-400">{isRtl ? w.professionAr : w.professionEn} | ID: {w.badgeNumber}</div>
                            </td>
                            <td className="p-3 text-center">
                              <select
                                value={state.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className={`text-[11px] font-bold p-1 px-2.5 rounded-lg border bg-white text-gray-700 ${state.isPresent ? 'border-emerald-200 text-emerald-600' : 'border-rose-200 text-rose-500'}`}
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
                                    className="border border-gray-150 bg-white rounded p-1 text-[10px] w-16 text-center font-bold text-gray-700"
                                    title="Start Time"
                                  />
                                  <span className="text-gray-300">-</span>
                                  <input 
                                    type="text" 
                                    value={state.endTime}
                                    onChange={(e) => setWorkerAttendanceState(prev => ({ ...prev, [w.id]: { ...state, endTime: e.target.value } }))}
                                    className="border border-gray-150 bg-white rounded p-1 text-[10px] w-16 text-center font-bold text-gray-700"
                                    title="End Time"
                                  />
                                  <input 
                                    type="text" 
                                    value={state.notes}
                                    onChange={(e) => setWorkerAttendanceState(prev => ({ ...prev, [w.id]: { ...state, notes: e.target.value } }))}
                                    placeholder={isRtl ? 'ملاحظات المشرف...' : 'Supervisor notes...'}
                                    className="border border-gray-150 bg-white rounded p-1 text-[10px] flex-1 min-w-[100px] text-gray-700"
                                  />
                                </div>
                              ) : (
                                <input 
                                  type="text" 
                                  value={state.notes}
                                  onChange={(e) => setWorkerAttendanceState(prev => ({ ...prev, [w.id]: { ...state, notes: e.target.value } }))}
                                  placeholder={isRtl ? 'سبب الغياب...' : 'Reason for absence...'}
                                  className="border border-gray-150 bg-white rounded p-1 text-[10px] w-full text-gray-700"
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
                  <h2 className="text-base font-black text-[#040957]">
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
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150 space-y-4">
                    <h3 className="text-xs font-black text-[#040957] uppercase tracking-wider">
                      {editingProdIdx !== null ? (
                        <span>✏️ {isRtl ? 'تعديل تحديث ميداني' : 'Edit Production Log'}</span>
                      ) : (
                        <span>➕ {isRtl ? 'إضافة تحديث ميداني جديد' : 'Add New Production Log'}</span>
                      )}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">{isRtl ? 'البند التنفيذي الرئيسي:' : 'Work Category:'}</label>
                        <select
                          value={prodWiId}
                          onChange={(e) => setProdWiId(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-850 font-bold"
                        >
                          {projectWorkItems.map(wi => (
                            <option key={wi.id} value={wi.id}>
                              {isRtl ? wi.nameAr : wi.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 flex justify-between items-center">
                          <span>{isRtl ? 'النشاط الميداني الفرعي:' : 'Sub-activity:'}</span>
                          <div className="flex items-center gap-3">
                            {prodActId && daysRemaining !== null && !isActivityCompleted && (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${daysRemaining < 0 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                📅 {daysRemaining < 0 
                                  ? (isRtl ? `متأخر ${Math.abs(daysRemaining)} يوم` : `${Math.abs(daysRemaining)}d Overdue`) 
                                  : (isRtl ? `${daysRemaining} يوم متبقي` : `${daysRemaining}d Remaining`)}
                              </span>
                            )}
                            {prodActId && (
                              <button 
                                onClick={() => handleOpenActivityDetails(prodActId)}
                                className="text-[10px] text-[#0080FF] font-bold hover:underline flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                {isRtl ? 'عرض المخطط والموارد' : 'View Plan & Resources'}
                              </button>
                            )}
                          </div>
                        </label>
                        <select
                          value={prodActId}
                          onChange={(e) => setProdActId(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-850 font-bold"
                        >
                          {itemActivities.map(act => {
                            const progress = getActivityProgress(act, progressUpdates);
                            const isDelayed = act.expectedFinishDate && new Date() > new Date(act.expectedFinishDate) && progress < 100;
                            return (
                              <option key={act.id} value={act.id}>
                                {isRtl ? act.nameAr : act.nameEn} ({progress}% {isRtl ? 'منجز' : 'Done'}) {isDelayed ? `⚠️ ${isRtl ? 'متأخر' : 'Delayed'}` : ''}
                              </option>
                            );
                          })}
                          {itemActivities.length === 0 && (
                            <option value="">{isRtl ? 'لا توجد أنشطة نشطة' : 'No activities linked'}</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 flex justify-between items-center">
                          <span>{isRtl ? 'الكمية المنجزة الفعلية:' : 'Completed Quantity:'}</span>
                          <span className="text-blue-500 font-mono text-[10px]">
                            ({isRtl ? 'المتبقي:' : 'Remaining:'} {remainingQty} {currentActivity?.unit})
                          </span>
                        </label>
                        <input 
                          type="number" 
                          value={prodCompletedQty}
                          max={remainingQty}
                          min={0}
                          disabled={isActivityCompleted}
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
                          className={`w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold ${isActivityCompleted ? 'opacity-50 cursor-not-allowed bg-gray-50 ' : ''}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 flex justify-between items-center">
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
                          disabled={isActivityCompleted}
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
                          className={`w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold ${isActivityCompleted ? 'opacity-50 cursor-not-allowed bg-gray-50 ' : ''}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500">{isRtl ? 'توقيت التسجيل الفعلي:' : 'Record Shift Time:'}</label>
                        <select
                          value={prodTime}
                          onChange={(e) => setProdTime(e.target.value)}
                          disabled={isActivityCompleted}
                          className={`w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold ${isActivityCompleted ? 'opacity-50 cursor-not-allowed bg-gray-50 ' : ''}`}
                        >
                          <option value="09:00 AM">09:00 AM</option>
                          <option value="11:00 AM">11:00 AM</option>
                          <option value="01:00 PM">01:00 PM</option>
                          <option value="03:00 PM">03:00 PM</option>
                          <option value="05:00 PM">05:00 PM</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 flex justify-between items-center">
                        <span>{isRtl ? 'تحديد العمال المباشرين للنشاط:' : 'Select Workers Assigned to this Activity:'}</span>
                        <span className="text-amber-600 font-mono text-[10px]">
                          ({isRtl ? 'المختارون:' : 'Selected:'} {prodWorkerNames.length})
                        </span>
                      </label>
                      
                      <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
                        {/* Workers marked as present in Step 2 */}
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                          {workers.filter(w => workerAttendanceState[w.id]?.isPresent).map(w => (
                            <button
                              key={w.id}
                              onClick={() => toggleWorkerInProduction(w.fullName)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition flex items-center gap-1.5 border ${ prodWorkerNames.includes(w.fullName) ? 'bg-[#040957] text-white border-[#040957]' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-blue-300' }`}
                            >
                              {prodWorkerNames.includes(w.fullName) ? <CheckCircle className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                              {w.fullName}
                            </button>
                          ))}
                          {workers.filter(w => workerAttendanceState[w.id]?.isPresent).length === 0 && (
                            <div className="w-full text-center py-4 text-[10px] text-gray-400 italic">
                              {isRtl ? 'يرجى تحضير العمال في الخطوة السابقة أولاً' : 'Please mark workers as present in Step 2 first'}
                            </div>
                          )}
                        </div>

                        {/* Custom Worker Addition */}
                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                          <div className="relative flex-1">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input 
                              type="text"
                              value={customWorkerName}
                              onChange={(e) => setCustomWorkerName(e.target.value)}
                              placeholder={isRtl ? 'إضافة اسم عامل ميداني غير مدرج بالقائمة...' : 'Add unlisted field worker name...'}
                              className="w-full border border-gray-200 rounded-xl py-2 pl-9 pr-3 text-[10px] bg-gray-50 focus:ring-2 focus:ring-[#0080FF] transition"
                            />
                          </div>
                          <button 
                            onClick={addCustomWorker}
                            disabled={!customWorkerName.trim()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition flex items-center gap-1.5 text-[10px] font-bold disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {isRtl ? 'إضافة' : 'Add'}
                          </button>
                        </div>

                        {/* Selected Custom Workers (not in main list) */}
                        {prodWorkerNames.filter(name => !workers.some(w => w.fullName === name)).length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {prodWorkerNames.filter(name => !workers.some(w => w.fullName === name)).map(name => (
                              <button
                                key={name}
                                onClick={() => toggleWorkerInProduction(name)}
                                className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-[#040957] text-white flex items-center gap-1.5 shadow-sm"
                              >
                                <CheckCircle className="w-3 h-3" />
                                {name} <span className="opacity-60 text-[8px] font-black">{isRtl ? 'إضافة يدوية' : 'Manual Entry'}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remaining Balance breakdown panel */}
                    <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black uppercase text-[#040957] tracking-wider flex items-center gap-1.5">
                          🎯 {isRtl ? 'حالة التوازن والمطابقة للنشاط' : 'Sub-Activity Balance Tracker'}
                        </span>
                        <span className="bg-blue-100 text-[#040957] text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                          {currentActivity?.unit}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
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
                            {isRtl ? 'المنجز الإجمالي' : 'Total Done'}
                          </span>
                        </div>

                        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-2.5 shadow-sm text-amber-900">
                          <span className="block text-[14px] font-black font-mono leading-none text-amber-700">
                            {remainingQty}
                          </span>
                          <span className="text-[8px] font-black text-amber-600 uppercase tracking-wider mt-1 block">
                            {isRtl ? 'الرصيد المتبقي الحالي' : 'Current Remaining'}
                          </span>
                        </div>

                        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-2.5 shadow-sm">
                          <span className="block text-[14px] font-black text-emerald-700 font-mono leading-none">
                            {Math.max(0, remainingQty - Number(prodCompletedQty))}
                          </span>
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-wider mt-1 block">
                            {isRtl ? 'المتبقي بعد التحديث' : 'Projected Remaining'}
                          </span>
                        </div>
                      </div>

                      {isActivityCompleted && (
                        <div className="bg-emerald-50 text-emerald-800 rounded-2xl p-4 mt-2 border-2 border-emerald-200 flex flex-col items-center justify-center text-center gap-2">
                          <CheckCircle className="w-8 h-8 text-emerald-500" />
                          <div>
                            <div className="text-sm font-black uppercase tracking-widest">
                              {isRtl ? 'تم إنجاز هذا النشاط بالكامل' : 'Activity Fully Completed'}
                            </div>
                            <div className="text-[11px] font-bold opacity-80">
                              {isRtl ? 'لا يوجد عمل متبقي لهذا البند. تم تحويل العمالة المخصصة إلى قائمة الانتظار.' : 'No work remains for this item. Assigned labor has been released to availability pool.'}
                            </div>
                          </div>
                        </div>
                      )}

                      {!isActivityCompleted && Number(prodCompletedQty) >= remainingQty && remainingQty > 0 && (
                        <div className="bg-amber-50 text-amber-800 rounded-lg p-2 mt-2 text-[10px] font-bold flex items-center gap-1 border border-amber-200">
                          ⚠️ {isRtl ? `تنبيه: لقد استهلكت كامل الرصيد المتبقي المتاح (${remainingQty} ${currentActivity?.unit})` : `Warning: You are recording the entire remaining scope (${remainingQty} ${currentActivity?.unit})`}
                        </div>
                      )}
                    </div>

                    {/* MATERIAL MANAGEMENT SECTION */}
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-[#040957] uppercase tracking-widest flex items-center gap-1.5">
                          🏗️ {isRtl ? 'إدارة المواد والمخزون الميداني' : 'On-Site Material & Inventory Management'}
                        </h4>
                      </div>

                      {/* Delivery from Warehouse */}
                      <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-800 uppercase">
                            {isRtl ? 'إضافة مواد من المستودع للموقع' : 'Add Materials from Warehouse (Delivery)'}
                          </span>
                          <Truck className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <select
                            value={tempDelId}
                            onChange={(e) => setTempDelId(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl p-2 text-[11px] font-bold bg-white"
                          >
                            <option value="">{isRtl ? 'اختر المادة...' : 'Select Material...'}</option>
                            {materials
                              .filter(m => m.projectId === selectedProjectId)
                              .map(m => (
                                <option key={m.id} value={m.id}>{isRtl ? m.nameAr : m.nameEn} ({m.unit})</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <input 
                              type="number"
                              value={tempDelQty}
                              max={materials.find(m => m.id === tempDelId)?.quantity || 0}
                              min={0}
                              onChange={(e) => {
                                const m = materials.find(mat => mat.id === tempDelId);
                                const available = m?.quantity || 0;
                                const val = Number(e.target.value);
                                if (val > available) setTempDelQty(available);
                                else if (val < 0) setTempDelQty(0);
                                else setTempDelQty(val);
                              }}
                              placeholder={isRtl ? 'الكمية الموردة' : 'Qty Delivered'}
                              className="w-full border border-gray-200 rounded-xl p-2 text-[11px] font-bold bg-white"
                            />
                            <button
                              onClick={() => {
                                if (tempDelId && tempDelQty > 0) {
                                  handleAddMaterialDelivery(tempDelId, tempDelQty);
                                  setTempDelId('');
                                  setTempDelQty(0);
                                }
                              }}
                              className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-2 px-4 rounded-xl text-[10px] transition shrink-0"
                            >
                              {isRtl ? 'تسجيل التوريد' : 'Record Delivery'}
                            </button>
                          </div>
                        </div>

                        {materialDeliveries.filter(d => d.activityId === prodActId).length > 0 && (
                          <div className="pt-2 flex flex-wrap gap-2">
                            {materialDeliveries.filter(d => d.activityId === prodActId).map((d, i) => (
                              <div key={i} className="bg-white px-2 py-1 rounded-lg border border-amber-200 text-[9px] font-bold flex items-center gap-1.5 shadow-sm">
                                🚚 {isRtl ? d.materialNameAr : d.materialNameEn}: {d.quantityDelivered} {d.unit}
                                <button 
                                  onClick={() => {
                                    const actualIdx = materialDeliveries.findIndex(md => md.timestamp === d.timestamp);
                                    if (actualIdx !== -1) {
                                      const newDels = [...materialDeliveries];
                                      newDels.splice(actualIdx, 1);
                                      setMaterialDeliveries(newDels);
                                    }
                                  }}
                                  className="hover:text-red-500 transition-colors ml-1 border-l pl-1 border-amber-100"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
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
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <select
                            value={tempMatId}
                            onChange={(e) => setTempMatId(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl p-2 text-[11px] font-bold bg-white"
                          >
                            <option value="">{isRtl ? 'اختر المادة للموقع...' : 'Select Material...'}</option>
                            {materials
                              .filter(m => m.projectId === selectedProjectId)
                              .map(m => {
                                const delivered = materialDeliveries
                                  .filter(d => d.activityId === prodActId && d.materialId === m.id)
                                  .reduce((sum, d) => sum + d.quantityDelivered, 0);
                                const consumed = prodUpdates
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
                            {(() => {
                              const selectedMat = materials.find(m => m.id === tempMatId);
                              const delivered = materialDeliveries
                                .filter(d => d.activityId === prodActId && d.materialId === tempMatId)
                                .reduce((sum, d) => sum + d.quantityDelivered, 0);
                              const consumed = prodUpdates
                                .filter(upd => upd.activityId === prodActId)
                                .flatMap(upd => upd.materialConsumptions || [])
                                .filter(c => c.materialId === tempMatId)
                                .reduce((sum, c) => sum + c.quantityUsed, 0);
                              const onSite = delivered - consumed;

                              return (
                                <input 
                                  type="number"
                                  value={tempMatQty}
                                  max={onSite}
                                  min={0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    if (val > onSite) setTempMatQty(onSite);
                                    else if (val < 0) setTempMatQty(0);
                                    else setTempMatQty(val);
                                  }}
                                  placeholder={isRtl ? 'الكمية المستخدمة' : 'Qty Used'}
                                  className="w-full border border-gray-200 rounded-xl p-2 text-[11px] font-bold bg-white"
                                />
                              );
                            })()}
                            <button
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

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500">{isRtl ? 'ملاحظات الإنجاز بالموقع:' : 'Execution Notes:'}</label>
                      <textarea
                        value={prodNotes}
                        onChange={(e) => setProdNotes(e.target.value)}
                        placeholder={isRtl ? 'صف بالتفصيل حالة الصب أو أعمال الحفريات المنتهية...' : 'Describe poured materials or completed boring depth...'}
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-semibold h-16"
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
                        className={`border-2 border-dashed rounded-2xl p-6 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer ${dragActive ? 'border-amber-400 bg-amber-500/10' : 'border-gray-250 hover:border-amber-400 bg-white '}`}
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
                            <span className="font-extrabold text-xs text-[#040957]">
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
                            <div key={i} className="bg-gray-100 p-2 rounded-xl text-[10px] font-bold text-gray-700 flex items-center gap-2 shadow-sm">
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

                    <div className="flex justify-end gap-2">
                      {editingProdIdx !== null && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProdIdx(null);
                            setProdNotes('');
                            setUploadedFiles([]);
                          }}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-5 py-2.5 rounded-xl text-xs transition"
                        >
                          {isRtl ? 'إلغاء التعديل' : 'Cancel Edit'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={editingProdIdx !== null ? handleUpdateProductionRecord : handleAddProductionRecord}
                        className={`${editingProdIdx !== null ? 'bg-amber-500 hover:bg-amber-600' : 'bg-amber-400 hover:bg-amber-500'} text-slate-900 font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md`}
                      >
                        {editingProdIdx !== null ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        <span>{editingProdIdx !== null ? (isRtl ? 'تحديث السجل' : 'Update Record') : (isRtl ? 'حفظ وإضافة التحديث للقائمة' : 'Add Update to Summary')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* CURRENT SUBMITTED LIST */}
                {prodUpdates.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-extrabold text-[#040957] uppercase tracking-wider">
                      📊 {isRtl ? 'قائمة تحديثات اليوم المدخلة للمراجعة:' : 'Today\'s production updates list:'}
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {prodUpdates.map((p, idx) => {
                        const act = activities.find(a => a.id === p.activityId);
                        const wi = workItems.find(w => w.id === p.workItemId);
                        return (
                          <div key={idx} className="bg-white p-3.5 rounded-2xl border border-gray-150 shadow-sm flex items-center justify-between gap-4 hover:border-amber-400 transition">
                            <div className="space-y-1 flex-1">
                              <div className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-black w-fit">
                                {p.time}
                              </div>
                              <h5 className="font-extrabold text-xs text-gray-800">
                                {act ? (isRtl ? act.nameAr : act.nameEn) : ''}
                              </h5>
                              <p className="text-[10px] text-gray-400 font-medium">
                                {wi ? (isRtl ? wi.nameAr : wi.nameEn) : ''} | {isRtl ? 'المنجز:' : 'Completed:'} <strong className="text-emerald-600">{p.completedQuantity} {act?.unit}</strong>
                              </p>
                              {p.workerNames && p.workerNames.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {p.workerNames.map((name, ni) => (
                                    <span key={ni} className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 font-bold flex items-center gap-1">
                                      <User className="w-2.5 h-2.5" />
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {p.notes && <p className="text-[10px] text-gray-500 italic">📝 {p.notes}</p>}
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
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handlePrintProductionDetailPDF(p)}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                                title={isRtl ? 'طباعة التفاصيل' : 'Print Details'}
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenActivityDetails(p.activityId)}
                                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditProductionRecord(idx)}
                                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl transition"
                                title="Edit Log"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveProductionRecord(idx)}
                                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                                title="Delete log"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
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
                  <h2 className="text-base font-black text-[#040957]">
                    🛡️ {isRtl ? 'السلامة، معوقات الجدول، والمشكلات الحرجة' : 'Safety, Timeline Delays & Site Incidents'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isRtl ? 'وثّق مدى الامتثال للسلامة، وسجل أي تأخير أو مشاكل تحتاج لتدخل المشرف.' : 'Report safety audits, supply shortages, or machinery failures immediately.'}
                  </p>
                </div>

                {/* SAFETY SECTION */}
                <div className="border border-gray-150 rounded-2xl p-5 space-y-4 bg-gray-50/30">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasSafetyRecord}
                        onChange={(e) => setHasSafetyRecord(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-xs font-black text-gray-850">{isRtl ? 'تفعيل تقرير السلامة للموقع اليوم' : 'Activate Daily Safety Report'}</span>
                    </label>
                  </div>

                  {hasSafetyRecord && (
                    <div className="space-y-4 pt-3 border-t border-gray-150 animate-fadeIn">
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
                            className="w-full border border-gray-200 rounded-xl p-2 text-xs focus:ring-2 focus:ring-[#0080FF] bg-white text-gray-800 font-bold"
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
                            className="w-full border border-gray-200 rounded-xl p-2 h-14 text-xs focus:ring-2 bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'الإجراءات التصحيحية الفورية:' : 'Corrective Actions:'}</label>
                          <textarea
                            value={safeActions}
                            onChange={(e) => setSafeActions(e.target.value)}
                            placeholder={isRtl ? 'مثال: تم طرد عامل لم يلتزم بالخوذة في النطاق الحرج...' : 'Immediate action details...'}
                            className="w-full border border-gray-200 rounded-xl p-2 h-14 text-xs focus:ring-2 bg-white text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* DELAYS SECTION */}
                <div className="border border-gray-150 rounded-2xl p-5 space-y-4 bg-gray-50/30">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasDelayRecord}
                        onChange={(e) => setHasDelayRecord(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-xs font-black text-gray-850">{isRtl ? 'تسجيل تأخير في سير العمل اليوم' : 'Log Site Work Delay'}</span>
                    </label>
                  </div>

                  {hasDelayRecord && (
                    <div className="space-y-4 pt-3 border-t border-gray-150 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'نوع التأخير الميداني:' : 'Delay Classification:'}</label>
                          <select
                            value={delayType}
                            onChange={(e) => setDelayType(e.target.value as any)}
                            className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 bg-white text-gray-850 font-bold"
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
                            className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 bg-white text-gray-850 font-bold"
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
                            className="w-full border border-gray-200 rounded-xl p-2 h-14 text-xs focus:ring-2 bg-white text-gray-800"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'السبب الفعلي بالتفصيل (En):' : 'Detailed Delay Cause (English):'}</label>
                          <textarea
                            value={delayReasonEn}
                            onChange={(e) => setDelayReasonEn(e.target.value)}
                            placeholder="e.g. Concrete ready mix truck delayed due to highway traffic..."
                            className="w-full border border-gray-200 rounded-xl p-2 h-14 text-xs focus:ring-2 bg-white text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CRITICAL ISSUES SECTION */}
                <div className="border border-gray-150 rounded-2xl p-5 space-y-4 bg-gray-50/30">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={hasIssueReport}
                        onChange={(e) => setHasIssueReport(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-xs font-black text-gray-850">{isRtl ? 'الإبلاغ عن حادث أو مشكلة طارئة وحرجة' : 'Dispatch Emergency Site Ticket'}</span>
                    </label>
                  </div>

                  {hasIssueReport && (
                    <div className="space-y-4 pt-3 border-t border-gray-150 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'عنوان البلاغ (عربي):' : 'Incident Title (Arabic):'}</label>
                          <input 
                            type="text" 
                            value={issueTitleAr}
                            onChange={(e) => setIssueTitleAr(e.target.value)}
                            placeholder="مثال: تسرب مياه عميق بنطاق الحفر المائل"
                            className="w-full border border-gray-200 rounded-xl p-2 h-10 text-xs focus:ring-2 bg-white text-gray-800 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'عنوان البلاغ (English):' : 'Incident Title (English):'}</label>
                          <input 
                            type="text" 
                            value={issueTitleEn}
                            onChange={(e) => setIssueTitleEn(e.target.value)}
                            placeholder="e.g. Ground water leakage at Pile segment"
                            className="w-full border border-gray-200 rounded-xl p-2 h-10 text-xs focus:ring-2 bg-white text-gray-800 font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500">{isRtl ? 'أولوية المشكلة:' : 'Ticket Priority:'}</label>
                          <select
                            value={issuePriority}
                            onChange={(e) => setIssuePriority(e.target.value as any)}
                            className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 bg-white text-gray-850 font-bold"
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
                            className="w-full border border-gray-200 rounded-xl p-2 h-14 text-xs focus:ring-2 bg-white text-gray-800"
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
                    <span>{isRtl ? 'التالي: طلب موارد ميدانية' : 'Next: Field Resource Requests'}</span>
                    <ChevronLeft className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: FIELD RESOURCE REQUESTS */}
            {currentStep === 5 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-[#040957]">
                    🛒 {isRtl ? 'طلب موارد ومعدات وعمالة إضافية' : 'Request Resources, Equipment & Manpower'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isRtl ? 'اطلب احتياجاتك الميدانية من مواد أو معدات أو عمالة إضافية للعمل.' : 'Request your field needs for materials, equipment, or extra manpower for site operations.'}
                  </p>
                </div>

                <div className="bg-gray-50/50 border border-gray-150 rounded-3xl p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">{isRtl ? 'نوع المورد المطلوب:' : 'Resource Category:'}</label>
                      <div className="flex bg-white p-1 rounded-xl border border-gray-200">
                        {[
                          { id: 'Material', label: isRtl ? 'مواد' : 'Material', icon: Package },
                          { id: 'Equipment', label: isRtl ? 'معدات' : 'Equipment', icon: Truck },
                          { id: 'Manpower', label: isRtl ? 'عمالة' : 'Manpower', icon: Users }
                        ].map(type => (
                          <button
                            key={type.id}
                            onClick={() => {
                              setReqType(type.id as any);
                              setReqResourceId('');
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[10px] font-black transition cursor-pointer ${reqType === type.id ? 'bg-blue-50 border border-blue-200 text-[#0080FF] shadow-xs' : 'text-gray-400 hover:bg-gray-50 border border-transparent'}`}
                          >
                            <type.icon className="w-3.5 h-3.5" />
                            <span>{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">
                        {reqType === 'Material' ? (isRtl ? 'اختر المادة:' : 'Select Material:') : 
                         reqType === 'Equipment' ? (isRtl ? 'اختر المعدة:' : 'Select Equipment:') : 
                         (isRtl ? 'أدخل المهنة المطلوبة:' : 'Requested Profession:')}
                      </label>
                      {reqType === 'Material' ? (
                        <select
                          value={reqResourceId}
                          onChange={(e) => setReqResourceId(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-bold bg-white focus:ring-2"
                        >
                          <option value="">{isRtl ? 'اختر مادة...' : 'Select Material...'}</option>
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{isRtl ? m.nameAr : m.nameEn} ({m.unit})</option>
                          ))}
                        </select>
                      ) : reqType === 'Equipment' ? (
                        <select
                          value={reqResourceId}
                          onChange={(e) => setReqResourceId(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-bold bg-white focus:ring-2"
                        >
                          <option value="">{isRtl ? 'اختر معدة...' : 'Select Equipment...'}</option>
                          {equipment.map(e => (
                            <option key={e.id} value={e.id}>{isRtl ? e.nameAr : e.nameEn}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text"
                          value={reqResourceId}
                          onChange={(e) => setReqResourceId(e.target.value)}
                          placeholder={isRtl ? 'مثال: نجار مسلح' : 'e.g. Concrete Carpenter'}
                          className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-bold bg-white focus:ring-2"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">{isRtl ? 'الكمية / العدد المطلوب:' : 'Requested Quantity:'}</label>
                      <input 
                        type="number"
                        value={reqQuantity}
                        onChange={(e) => setReqQuantity(Number(e.target.value))}
                        min={1}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-bold bg-white focus:ring-2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500">{isRtl ? 'أولوية الطلب:' : 'Request Priority:'}</label>
                      <select
                        value={reqPriority}
                        onChange={(e) => setReqPriority(e.target.value as any)}
                        className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-bold bg-white focus:ring-2"
                      >
                        <option value="Normal">{isRtl ? 'عادية' : 'Normal'}</option>
                        <option value="Urgent">{isRtl ? 'عاجلة' : 'Urgent'}</option>
                        <option value="Emergency">{isRtl ? 'حالة طوارئ' : 'Emergency'}</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500">{isRtl ? 'ملاحظات إضافية للمستودع/الإدارة:' : 'Additional Notes for Warehouse/Admin:'}</label>
                    <textarea 
                      value={reqNotes}
                      onChange={(e) => setReqNotes(e.target.value)}
                      placeholder={isRtl ? 'اشرح هنا سبب الاحتياج أو تفاصيل إضافية...' : 'Explain the reason or any extra specifications...'}
                      className="w-full border border-gray-200 rounded-xl p-3 text-xs bg-white h-20 focus:ring-2"
                    />
                  </div>

                  <button
                    onClick={handleSubmitFieldRequest}
                    disabled={isSubmittingRequest || !reqResourceId}
                    className="w-full bg-[#0080FF] hover:bg-blue-600 disabled:bg-gray-300 text-white font-black py-4 rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                  >
                    {isSubmittingRequest ? <Clock className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>{isRtl ? 'إرسال طلب الموارد رسمياً' : 'Submit Official Resource Request'}</span>
                  </button>

                  {/* Recent Requests List */}
                  {fieldRequests && fieldRequests.length > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                        {isRtl ? 'طلباتك الأخيرة' : 'Your Recent Requests'}
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {fieldRequests
                          .filter(r => r.supervisorId === (supBadge || '000'))
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map(req => (
                            <div key={req.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex justify-between items-center group">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${ req.type === 'Material' ? 'bg-blue-50 text-blue-600' : req.type === 'Equipment' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600' }`}>
                                  {req.type === 'Material' ? <Package className="w-3.5 h-3.5" /> : 
                                   req.type === 'Equipment' ? <Truck className="w-3.5 h-3.5" /> : 
                                   <Users className="w-3.5 h-3.5" />}
                                </div>
                                <div>
                                  <div className="text-[11px] font-black text-[#040957]">
                                    {isRtl ? req.resourceNameAr : req.resourceNameEn}
                                  </div>
                                  <div className="text-[9px] text-gray-400 font-bold">
                                    {req.quantity} {req.unit} • {new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                              <div className={`text-[9px] font-black px-2.5 py-1 rounded-full ${ req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : req.status === 'Fulfilled' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600' }`}>
                                {req.status === 'Pending' ? (isRtl ? 'قيد الانتظار' : 'Pending') : 
                                 req.status === 'Approved' ? (isRtl ? 'تم الاعتماد' : 'Approved') :
                                 req.status === 'Rejected' ? (isRtl ? 'مرفوض' : 'Rejected') :
                                 (isRtl ? 'تم التوريد' : 'Fulfilled')}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
                  >
                    <ChevronRight className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                    <span>{isRtl ? 'السابق: سجل السلامة' : 'Back: Safety Record'}</span>
                  </button>
                  <button
                    onClick={() => setCurrentStep(6)}
                    className="bg-[#040957] hover:bg-blue-800 text-white font-extrabold px-6 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
                  >
                    <span>{isRtl ? 'التالي: المراجعة النهائية' : 'Next: Final Review'}</span>
                    <ChevronLeft className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: REVIEW & TRANSMIT */}
            {currentStep === 6 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-[#040957]">
                    📝 {isRtl ? 'مراجعة وتوقيع التقرير اليومي الشامل' : 'Daily Report Consolidated Review'}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {isRtl ? 'راجع الأقسام المدخلة في التقرير قبل رفعها للمدير للمصادقة.' : 'Verify all logs, attendance ratios, and incident metrics before central database write.'}
                  </p>
                </div>

                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-150 space-y-4 text-xs font-sans">
                  
                  {/* Supervisor Header Review */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold">{isRtl ? 'اسم المشرف:' : 'Supervisor:'}</span>
                      <p className="font-extrabold text-gray-800 mt-0.5">{supName}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold">{isRtl ? 'المشروع:' : 'Project:'}</span>
                      <p className="font-extrabold text-[#040957] mt-0.5 truncate">{selectedProject ? (isRtl ? selectedProject.nameAr : selectedProject.nameEn) : ''}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold">{isRtl ? 'التاريخ الميداني:' : 'Log Date:'}</span>
                      <p className="font-extrabold text-gray-800 mt-0.5 font-mono">{reportDate}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase font-bold">{isRtl ? 'توقيع المصادقة:' : 'Authorized Signature:'}</span>
                      <p className="font-bold text-gray-500 mt-0.5 italic">{signatureText ? '✍️ Text stamp' : (isSignCanvasDrawn ? '🖋️ Drawn Signature' : '⚠️ Unsigned')}</p>
                    </div>
                  </div>

                  {/* Sections Review */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-extrabold text-[#040957] text-xs tracking-wider">{isRtl ? 'ملخص الأقسام الجاهزة للإرسال:' : 'Draft Sections Ready for Central Queue:'}</h4>
                    
                    {/* Attendance section summary */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border">
                      <div className="flex items-center gap-2">
                        <Users className="w-4.5 h-4.5 text-blue-500" />
                        <div>
                          <span className="font-extrabold text-gray-850 block text-xs">{isRtl ? 'كشف تحضير العمالة' : 'Workforce Attendance checklist'}</span>
                          <span className="text-[10px] text-gray-400">{isRtl ? 'يتم تحضير كافة عمال شفت الموقع المسجلين.' : 'Ready to push to database logs.'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold uppercase">
                        {isRtl ? 'جاهز' : 'READY'}
                      </span>
                    </div>

                    {/* Progress updates section summary */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4.5 h-4.5 text-amber-500" />
                        <div>
                          <span className="font-extrabold text-gray-850 block text-xs">{isRtl ? 'تحديثات الإنتاج والمنجز' : 'Production Output registers'}</span>
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
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4.5 h-4.5 text-emerald-500" />
                        <div>
                          <span className="font-extrabold text-gray-850 block text-xs">{isRtl ? 'سجل الامتثال والسلامة اليومية' : 'Daily Safety compliance log'}</span>
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
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white border">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
                        <div>
                          <span className="font-extrabold text-gray-850 block text-xs">{isRtl ? 'معوقات الجدول الحركي وبلاغات الطوارئ' : 'Timeline delays & Incident tickets'}</span>
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

                {/* Pre-submission Data Integrity and Audit reminder */}
                <div className="bg-[#040957]/5 border border-[#040957]/10 rounded-2xl p-4 text-xs space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛡️</span>
                    <h4 className="font-extrabold text-[#040957]">
                      {isRtl ? 'ميثاق الموثوقية وتدقيق المخرجات الإنشائية' : 'Site Output Integrity & Anti-Fraud Pledge'}
                    </h4>
                  </div>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    {isRtl 
                      ? 'قبل إرسال التقرير اليومي، يرجى التحقق من دقة كشوف الحضور والكميات المنجزة. يخضع هذا التقرير لتدقيق ذكي متقاطر تلقائياً لمقارنة القوى العاملة الحاضرة بالإنتاجية الفعلية ومحاضر الأعطال لمنع تضخيم الإنجازات وتسريع مراجعة المهندس.'
                      : 'Before transmitting your daily field log, please ensure workforce attendance rates match your reported progress. All submissions undergo automated multi-factor cross-verification comparing crew sizing with physics-based productivity limits to eliminate bloated achievements.'
                    }
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-gray-500 pt-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className="text-emerald-600">✓</span>
                      <span>{isRtl ? 'الحضور والتحضير يتوافق مع القوة الإنشائية' : 'Attendance matches progressive crew allocation'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span className="text-emerald-600">✓</span>
                      <span>{isRtl ? 'الكميات منجزة ومقاسة وفقاً لواقع الموقع' : 'Completed quantities physically measured'}</span>
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

      {/* ACTIVITY DETAILS MODAL */}
      {isActivityDetailsOpen && activityForDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#040957] to-blue-900 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <FileText className="w-6 h-6 text-amber-400" />
                </div>
                <div>
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
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
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
                  <div className="flex items-center gap-2 mb-1 text-blue-600">
                    <Calculator className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">{isRtl ? 'الكمية الإجمالية' : 'Total Qty'}</span>
                  </div>
                  <p className="text-lg font-black text-blue-900 font-mono">
                    {activityForDetails.totalQuantity} <span className="text-xs font-bold">{activityForDetails.unit}</span>
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1 text-amber-600">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">{isRtl ? 'البداية' : 'Start'}</span>
                  </div>
                  <p className="text-sm font-black text-amber-900 font-mono">
                    {activityForDetails.startDate}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-1 text-emerald-600">
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
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  {isRtl ? 'تخصيص الموارد المخططة' : 'Planned Resource Allocations'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Workers */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-50">
                      <UserCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-600">{isRtl ? 'العمالة المخصصة' : 'Allocated Workers'}</span>
                    </div>
                    <div className="space-y-2">
                      {activityForDetails.workerIds.length > 0 ? (
                        activityForDetails.workerIds.map(id => {
                          const w = workers.find(worker => worker.id === id);
                          return (
                            <div key={id} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-[11px] font-bold">
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
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-50">
                      <Wrench className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-slate-600">{isRtl ? 'المعدات والآليات' : 'Equipment & Machinery'}</span>
                    </div>
                    <div className="space-y-2">
                      {activityForDetails.equipmentAllocations && activityForDetails.equipmentAllocations.length > 0 ? (
                        activityForDetails.equipmentAllocations.map((eq, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-[11px] font-bold">
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
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-50">
                      <Package className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-slate-600">{isRtl ? 'المواد المخطط استهلاكها' : 'Planned Materials'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {activityForDetails.materialAllocations && activityForDetails.materialAllocations.length > 0 ? (
                        activityForDetails.materialAllocations.map((mat, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-[11px] font-bold">
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
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
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
  );
}
