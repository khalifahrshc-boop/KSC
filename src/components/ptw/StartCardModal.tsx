/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  StartCard, 
  Project, 
  WorkItem, 
  Activity, 
  SystemSettings, 
  UserRole,
  StartCardChecklistItem,
  DocumentAttachment,
  ApprovalStep,
  PermitAuditLog
} from '../../types';
import { 
  DEFAULT_START_CARD_CHECKLIST, 
  generateQRCode,
  generateStartCardQRCode 
} from '../../utils/ptwCalculations';
import { StartCardPrintableDoc } from './StartCardPrintableDoc';
import { runWithOklchSanitizer } from '../../utils/pdfSanitizer';
import { 
  X, 
  Save, 
  Printer, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  Building2, 
  FileText, 
  Users, 
  Paperclip, 
  Plus, 
  Trash2, 
  QrCode, 
  History, 
  Eye, 
  PenTool, 
  Calendar, 
  Clock, 
  Send
} from 'lucide-react';

interface StartCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  startCard?: StartCard | null;
  initialActivityId?: string;
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  settings: SystemSettings;
  userRoles: UserRole[];
  currentUserName?: string;
  onSave: (card: StartCard) => Promise<void>;
  onLogAudit: (log: Omit<PermitAuditLog, 'id' | 'timestamp'>) => Promise<void>;
  lang: 'ar' | 'en';
}

export const StartCardModal: React.FC<StartCardModalProps> = ({
  isOpen,
  onClose,
  startCard,
  initialActivityId,
  projects,
  workItems,
  activities,
  settings,
  userRoles,
  currentUserName = 'Site Engineer',
  onSave,
  onLogAudit,
  lang
}) => {
  const isRtl = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'info' | 'checklist' | 'attachments' | 'approvals' | 'preview' | 'qr'>('info');

  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [cardLevel, setCardLevel] = useState<'Group' | 'Activity'>('Activity');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [revision, setRevision] = useState<number>(1);
  const [status, setStatus] = useState<StartCard['status']>('Draft');

  // Work Details
  const [workDescriptionEn, setWorkDescriptionEn] = useState('');
  const [workDescriptionAr, setWorkDescriptionAr] = useState('');
  const [scopeOfWorkEn, setScopeOfWorkEn] = useState('');
  const [scopeOfWorkAr, setScopeOfWorkAr] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [plannedFinishDate, setPlannedFinishDate] = useState(new Date().toISOString().substring(0, 10));
  const [expectedDurationDays, setExpectedDurationDays] = useState(1);
  const [workShift, setWorkShift] = useState<StartCard['workShift']>('Morning');
  const [workAreaZone, setWorkAreaZone] = useState('');
  const [buildingStructure, setBuildingStructure] = useState('');
  const [floorLevel, setFloorLevel] = useState('');
  const [gridReference, setGridReference] = useState('');
  const [workCrewLead, setWorkCrewLead] = useState('');
  const [numberOfWorkers, setNumberOfWorkers] = useState(6);
  const [requiredEquipmentDetails, setRequiredEquipmentDetails] = useState('');
  const [requiredToolsDetails, setRequiredToolsDetails] = useState('');
  const [requiredMaterialsDetails, setRequiredMaterialsDetails] = useState('');

  // Key Roles
  const [projectManager, setProjectManager] = useState('');
  const [constructionManager, setConstructionManager] = useState('');
  const [siteEngineer, setSiteEngineer] = useState('');
  const [supervisorForeman, setSupervisorForeman] = useState('');
  const [hseOfficer, setHseOfficer] = useState('');
  const [qaqcEngineer, setQaqcEngineer] = useState('');

  // Checklist
  const [checklist, setChecklist] = useState<StartCardChecklistItem[]>(DEFAULT_START_CARD_CHECKLIST);

  // Attachments
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [newAttTitle, setNewAttTitle] = useState('');
  const [newAttType, setNewAttType] = useState<DocumentAttachment['documentType']>('Approved Drawing');
  const [newAttFileName, setNewAttFileName] = useState('');

  // Approvals
  const [approvals, setApprovals] = useState<ApprovalStep[]>([]);
  const [currentApprovalIndex, setCurrentApprovalIndex] = useState(0);

  // Signature in approval dialog
  const [signatureText, setSignatureText] = useState(currentUserName);
  const [approvalComment, setApprovalComment] = useState('');

  // QR Code
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Filtered lists
  const availableWorkItems = workItems.filter(wi => wi.projectId === selectedProjectId);
  const availableActivities = activities.filter(act => act.workItemId === selectedWorkItemId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Initialize or reset form on open
  useEffect(() => {
    if (!isOpen) return;

    if (startCard) {
      // Editing existing start card
      setSelectedProjectId(startCard.projectId);
      setSelectedWorkItemId(startCard.workItemId);
      setSelectedActivityId(startCard.activityId || '');
      setCardLevel(startCard.level);
      setCardNumber(startCard.cardNumber);
      setRevision(startCard.revision);
      setStatus(startCard.status);
      setWorkDescriptionEn(startCard.workDescriptionEn);
      setWorkDescriptionAr(startCard.workDescriptionAr);
      setScopeOfWorkEn(startCard.scopeOfWorkEn || '');
      setScopeOfWorkAr(startCard.scopeOfWorkAr || '');
      setPlannedStartDate(startCard.plannedStartDate);
      setPlannedFinishDate(startCard.plannedFinishDate);
      setExpectedDurationDays(startCard.expectedDurationDays);
      setWorkShift(startCard.workShift);
      setWorkAreaZone(startCard.workAreaZone || '');
      setBuildingStructure(startCard.buildingStructure || '');
      setFloorLevel(startCard.floorLevel || '');
      setGridReference(startCard.gridReference || '');
      setWorkCrewLead(startCard.workCrewLead || '');
      setNumberOfWorkers(startCard.numberOfWorkers);
      setRequiredEquipmentDetails(startCard.requiredEquipmentDetails || '');
      setRequiredToolsDetails(startCard.requiredToolsDetails || '');
      setRequiredMaterialsDetails(startCard.requiredMaterialsDetails || '');
      setProjectManager(startCard.projectManager || '');
      setConstructionManager(startCard.constructionManager || '');
      setSiteEngineer(startCard.siteEngineer || '');
      setSupervisorForeman(startCard.supervisorForeman || '');
      setHseOfficer(startCard.hseOfficer || '');
      setQaqcEngineer(startCard.qaqcEngineer || '');
      setChecklist(startCard.checklist && startCard.checklist.length > 0 ? startCard.checklist : DEFAULT_START_CARD_CHECKLIST);
      setAttachments(startCard.attachments || []);
      setApprovals(startCard.approvals || []);
      setCurrentApprovalIndex(startCard.currentApprovalIndex || 0);
      
      generateQRCode(`START_CARD:${startCard.cardNumber}:${startCard.id}:${startCard.status}`).then(url => {
        setQrCodeDataUrl(url);
      });
    } else {
      // New Start Card
      let targetAct = initialActivityId ? activities.find(a => a.id === initialActivityId) : null;
      let targetWi = targetAct ? workItems.find(w => w.id === targetAct?.workItemId) : null;
      let targetProj = targetWi ? projects.find(p => p.id === targetWi?.projectId) : projects[0];

      const projId = targetProj?.id || projects[0]?.id || '';
      const defaultWi = targetWi || workItems.find(wi => wi.projectId === projId);
      const wiId = defaultWi?.id || '';
      const defaultAct = targetAct || activities.find(act => act.workItemId === wiId);

      const generatedNum = `SC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setSelectedProjectId(projId);
      setSelectedWorkItemId(wiId);
      setSelectedActivityId(defaultAct?.id || '');
      setCardLevel('Activity');
      setCardNumber(generatedNum);
      setRevision(1);
      setStatus('Draft');

      setWorkDescriptionEn(defaultAct?.nameEn || 'Standard Site Activity Execution');
      setWorkDescriptionAr(defaultAct?.nameAr || 'تنفيذ نشاط ميداني معتمد');
      setScopeOfWorkEn('Mobilize crew, verify safety barriers, ensure approved drawings on site, execute according to standard method statement.');
      setScopeOfWorkAr('تجهيز العمالة، التحقق من الحواجز واللوحات، التأكد من توافر المخططات المعتمدة، والتنفيذ وفق المنهجية المعتمدة.');
      
      const todayStr = new Date().toISOString().substring(0, 10);
      setPlannedStartDate(defaultAct?.startDate || todayStr);
      setPlannedFinishDate(defaultAct?.endDate || todayStr);
      setExpectedDurationDays(5);
      setWorkShift('Morning');
      setWorkAreaZone('Zone 1');
      setBuildingStructure('Main Facility');
      setFloorLevel('Ground Level');
      setWorkCrewLead(currentUserName);
      setNumberOfWorkers(8);
      setRequiredEquipmentDetails('Heavy Equipment, Safety Tools, Generator');
      setRequiredMaterialsDetails('Approved site materials per specification');
      setProjectManager('Eng. Project Manager');
      setConstructionManager('Eng. Construction Manager');
      setSiteEngineer(currentUserName);
      setSupervisorForeman('Site Foreman');
      setHseOfficer('HSE Safety Officer');
      setQaqcEngineer('QA/QC Engineer');

      setChecklist(DEFAULT_START_CARD_CHECKLIST.map(c => ({ ...c, status: 'Pending' })));
      setAttachments([]);

      // Setup standard 5-step approval chain
      const initialApprovals: ApprovalStep[] = [
        { id: 'step-1', order: 1, roleNameEn: 'Site Engineer', roleNameAr: 'مهندس الموقع', assignedUserName: currentUserName, status: 'Pending' },
        { id: 'step-2', order: 2, roleNameEn: 'QA/QC Engineer', roleNameAr: 'مهندس ضبط الجودة (QA/QC)', assignedUserName: 'QA/QC Lead', status: 'Pending' },
        { id: 'step-3', order: 3, roleNameEn: 'HSE Officer', roleNameAr: 'مسؤول السلامة والصحة المهنية (HSE)', assignedUserName: 'HSE Officer', status: 'Pending' },
        { id: 'step-4', order: 4, roleNameEn: 'Construction Manager', roleNameAr: 'مدير التنفيذ الإنشائي', assignedUserName: 'Construction Manager', status: 'Pending' },
        { id: 'step-5', order: 5, roleNameEn: 'Project Manager', roleNameAr: 'مدير المشروع', assignedUserName: 'Project Manager', status: 'Pending' }
      ];
      setApprovals(initialApprovals);
      setCurrentApprovalIndex(0);

      generateQRCode(`START_CARD:${generatedNum}:NEW:DRAFT`).then(url => {
        setQrCodeDataUrl(url);
      });
    }
  }, [isOpen, startCard, projects, workItems, activities, currentUserName]);

  // Automatically update QR Code when key Start Card parameters change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    generateStartCardQRCode({
      id: startCard?.id || 'new',
      cardNumber,
      revision,
      status,
      workAreaZone,
      floorLevel,
      plannedStartDate,
      plannedFinishDate,
      workCrewLead,
      supervisorForeman,
      numberOfWorkers
    }, isRtl ? selectedProject?.nameAr : selectedProject?.nameEn).then(url => {
      if (isMounted && url) {
        setQrCodeDataUrl(url);
      }
    });

    return () => { isMounted = false; };
  }, [
    isOpen,
    startCard?.id,
    cardNumber,
    revision,
    status,
    workAreaZone,
    floorLevel,
    plannedStartDate,
    plannedFinishDate,
    workCrewLead,
    supervisorForeman,
    numberOfWorkers,
    selectedProject,
    isRtl
  ]);

  // When project changes, update default metadata
  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    const relatedWis = workItems.filter(wi => wi.projectId === projId);
    const firstWi = relatedWis[0];
    if (firstWi) {
      setSelectedWorkItemId(firstWi.id);
      const relatedActs = activities.filter(act => act.workItemId === firstWi.id);
      if (relatedActs[0]) {
        setSelectedActivityId(relatedActs[0].id);
        setWorkDescriptionEn(relatedActs[0].nameEn);
        setWorkDescriptionAr(relatedActs[0].nameAr);
      } else {
        setSelectedActivityId('');
      }
    } else {
      setSelectedWorkItemId('');
      setSelectedActivityId('');
    }
  };

  const handleWorkItemChange = (wiId: string) => {
    setSelectedWorkItemId(wiId);
    const relatedActs = activities.filter(act => act.workItemId === wiId);
    if (relatedActs[0]) {
      setSelectedActivityId(relatedActs[0].id);
      setWorkDescriptionEn(relatedActs[0].nameEn);
      setWorkDescriptionAr(relatedActs[0].nameAr);
    } else {
      setSelectedActivityId('');
    }
  };

  const handleActivityChange = (actId: string) => {
    setSelectedActivityId(actId);
    const targetAct = activities.find(a => a.id === actId);
    if (targetAct) {
      setWorkDescriptionEn(targetAct.nameEn);
      setWorkDescriptionAr(targetAct.nameAr);
      if (targetAct.startDate) setPlannedStartDate(targetAct.startDate);
      if (targetAct.endDate) setPlannedFinishDate(targetAct.endDate);
    }
  };

  // Checklist Item Status update
  const handleChecklistStatusChange = (id: string, newStatus: StartCardChecklistItem['status']) => {
    setChecklist(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: newStatus,
          checkedBy: newStatus !== 'Pending' ? currentUserName : undefined,
          checkedAt: newStatus !== 'Pending' ? new Date().toISOString().substring(0, 16).replace('T', ' ') : undefined
        };
      }
      return item;
    }));
  };

  const handleChecklistNotesChange = (id: string, notes: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, notes } : item));
  };

  // Add Attachment
  const handleAddAttachment = () => {
    if (!newAttTitle.trim()) return;
    const newAtt: DocumentAttachment = {
      id: `att-${Date.now()}`,
      title: newAttTitle,
      documentType: newAttType,
      fileName: newAttFileName || `${newAttTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      fileSize: '1.8 MB',
      uploadedBy: currentUserName,
      uploadedAt: new Date().toISOString().substring(0, 16).replace('T', ' '),
      status: 'Approved'
    };
    setAttachments(prev => [...prev, newAtt]);
    setNewAttTitle('');
    setNewAttFileName('');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Process Approval Step
  const handleApproveCurrentStep = async (decision: 'Approved' | 'Rejected' | 'Revision Requested') => {
    const updatedApprovals = [...approvals];
    const step = updatedApprovals[currentApprovalIndex];
    if (!step) return;

    const now = new Date();
    const dateStr = now.toISOString().substring(0, 10);
    const timeStr = now.toTimeString().substring(0, 5);

    step.status = decision;
    step.decisionDate = dateStr;
    step.decisionTime = timeStr;
    step.decisionComments = approvalComment || (decision === 'Approved' ? 'Verified and approved on site.' : 'Action required.');
    step.signatureType = 'Typed';
    step.signatureData = signatureText || currentUserName;
    step.approverName = currentUserName;

    let nextIndex = currentApprovalIndex;
    let nextStatus = status;

    if (decision === 'Approved') {
      if (currentApprovalIndex + 1 < updatedApprovals.length) {
        nextIndex = currentApprovalIndex + 1;
        nextStatus = 'Submitted';
      } else {
        // All steps approved!
        nextStatus = 'Approved';
      }
    } else if (decision === 'Rejected') {
      nextStatus = 'Rejected';
    } else {
      nextStatus = 'Draft';
    }

    setApprovals(updatedApprovals);
    setCurrentApprovalIndex(nextIndex);
    setStatus(nextStatus);
    setApprovalComment('');

    await onLogAudit({
      recordType: 'StartCard',
      recordId: startCard?.id || cardNumber,
      recordNumber: cardNumber,
      projectId: selectedProjectId,
      userId: 'current-user',
      userName: currentUserName,
      userRoles,
      action: decision === 'Approved' ? (nextStatus === 'Approved' ? 'Approved' : 'Edited') : 'Rejected',
      previousStatus: status,
      newStatus: nextStatus,
      comments: `Step ${step.order} (${step.roleNameEn}) ${decision}: ${step.decisionComments}`
    });
  };

  // Submit Start Card for Approval Chain
  const handleSubmitCard = async () => {
    // Check if any mandatory item is failed
    const failedItems = checklist.filter(c => c.isMandatory && c.status === 'Fail');
    if (failedItems.length > 0) {
      alert(isRtl ? `لا يمكن تقديم الكارت للاعتماد لوجود ${failedItems.length} بنود فحص إلزامية مرفوضة!` : `Cannot submit: ${failedItems.length} mandatory checklist items failed!`);
      return;
    }

    setStatus('Submitted');
    await onLogAudit({
      recordType: 'StartCard',
      recordId: startCard?.id || cardNumber,
      recordNumber: cardNumber,
      projectId: selectedProjectId,
      userId: 'current-user',
      userName: currentUserName,
      userRoles,
      action: 'Submitted',
      previousStatus: status,
      newStatus: 'Submitted',
      comments: 'Submitted Start Card for multi-level management approvals'
    });
  };

  // Save changes
  const handleSaveStartCard = async () => {
    setIsSaving(true);
    try {
      const proj = selectedProject;
      const targetAct = activities.find(a => a.id === selectedActivityId);

      const payload: StartCard = {
        id: startCard?.id || `sc-${Date.now()}`,
        cardNumber,
        revision,
        level: cardLevel,
        projectId: selectedProjectId,
        workItemId: selectedWorkItemId,
        activityId: cardLevel === 'Activity' ? selectedActivityId : undefined,
        targetActivityIds: cardLevel === 'Group' 
          ? availableActivities.map(a => a.id) 
          : (selectedActivityId ? [selectedActivityId] : []),

        projectNameEn: proj?.nameEn || 'Site Project',
        projectNameAr: proj?.nameAr || 'المشروع الإنشائي',
        projectNumber: proj?.projectNumber || 'PRJ-2026',
        clientEn: proj?.clientEn || 'Client Organization',
        clientAr: proj?.clientAr || 'الجهة المالكة',
        consultantEn: 'Engineering Consultant',
        consultantAr: 'المكتب الاستشاري العام',
        mainContractorEn: settings.companyNameEn || 'Main Contractor',
        mainContractorAr: settings.companyNameAr || 'المقاول الرئيسي',
        projectLocationEn: proj?.locationEn || 'Site Location',
        projectLocationAr: proj?.locationAr || 'موقع المشروع',
        workAreaZone,
        buildingStructure,
        floorLevel,
        gridReference,
        workPackageCode: `WP-${cardNumber.slice(-4)}`,

        workDescriptionEn,
        workDescriptionAr,
        scopeOfWorkEn,
        scopeOfWorkAr,
        plannedStartDate,
        plannedFinishDate,
        expectedDurationDays: Number(expectedDurationDays) || 1,
        workShift,
        workLocationDetails: `${workAreaZone} - ${buildingStructure}`,
        workCrewLead,
        numberOfWorkers: Number(numberOfWorkers) || 1,
        requiredEquipmentDetails,
        requiredToolsDetails,
        requiredMaterialsDetails,

        projectManager,
        constructionManager,
        siteEngineer,
        supervisorForeman,
        hseOfficer,
        qaqcEngineer,

        checklist,
        attachments,
        approvals,
        currentApprovalIndex,

        status,
        createdAt: startCard?.createdAt || new Date().toISOString(),
        createdBy: startCard?.createdBy || currentUserName,
        updatedAt: new Date().toISOString(),
        approvedAt: status === 'Approved' ? (startCard?.approvedAt || new Date().toISOString()) : undefined,
        approvedBy: status === 'Approved' ? (startCard?.approvedBy || currentUserName) : undefined,
        qrCodeUrl: qrCodeDataUrl
      };

      await onSave(payload);

      await onLogAudit({
        recordType: 'StartCard',
        recordId: payload.id,
        recordNumber: payload.cardNumber,
        projectId: payload.projectId,
        userId: 'current-user',
        userName: currentUserName,
        userRoles,
        action: startCard ? 'Edited' : 'Created',
        newStatus: payload.status,
        comments: `Start Card ${payload.cardNumber} saved successfully.`
      });

      onClose();
    } catch (err) {
      console.error('Error saving Start Card:', err);
      alert(isRtl ? 'حدث خطأ أثناء حفظ كارت بدء العمل' : 'Error saving Start Card');
    } finally {
      setIsSaving(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      const element = document.getElementById(`start-card-print-${startCard?.id || 'new'}`);
      if (!element) {
        alert(isRtl ? 'يرجى التبديل لتبويب المعاينة قبل التحميل' : 'Please open the Preview tab first');
        return;
      }
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: [6, 4, 6, 4] as [number, number, number, number],
        filename: `${cardNumber || 'StartCard'}_Rev${revision}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 794,
          logging: false
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          avoid: ['.pdf-avoid-break', 'tr', 'table'] 
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(element).save();
      });
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white text-slate-900 flex items-center justify-between border-b border-slate-200/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center border border-blue-200">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                  {startCard ? (isRtl ? `تعديل كارت بدء العمل: ${cardNumber}` : `Edit Start Card: ${cardNumber}`) : (isRtl ? 'إصدار كارت بدء عمل جديد (Start Card)' : 'Issue New Start Card')}
                </h2>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                  status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                  status === 'Submitted' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                  status === 'Rejected' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                  'bg-blue-50 text-blue-800 border-blue-300'
                }`}>
                  {status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {isRtl ? 'حوكمة الجاهزية الفنية والسلامة والموارد قبل السماح ببدء التنفيذ' : 'Mandatory pre-execution technical, safety & resource authorization gate'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'info' 
                ? 'border-[#040957] dark:border-blue-500 text-[#040957] dark:text-blue-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{isRtl ? '1. بيانات المشروع والعمل' : '1. Project & Scope'}</span>
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'checklist' 
                ? 'border-[#040957] dark:border-blue-500 text-[#040957] dark:text-blue-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isRtl ? '2. بنود الفحص والجاهزية' : '2. Readiness Checklist'}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
              {checklist.filter(c => c.status === 'Pass').length}/{checklist.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('attachments')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'attachments' 
                ? 'border-[#040957] dark:border-blue-500 text-[#040957] dark:text-blue-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>{isRtl ? '3. المخططات والمرفقات' : '3. Attachments'}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-200 dark:bg-slate-800 font-mono">
              {attachments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'approvals' 
                ? 'border-[#040957] dark:border-blue-500 text-[#040957] dark:text-blue-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>{isRtl ? '4. سلسلة الاعتمادات' : '4. Approvals'}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono">
              {approvals.filter(a => a.status === 'Approved').length}/{approvals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'preview' 
                ? 'border-[#040957] dark:border-blue-500 text-[#040957] dark:text-blue-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{isRtl ? '5. معاينة وطباعة الوثيقة (A4)' : '5. Document Preview (A4)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'qr' 
                ? 'border-[#040957] dark:border-blue-500 text-[#040957] dark:text-blue-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{isRtl ? 'الرمز والمطابقة (QR)' : 'QR & Token'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm">
          {/* Tab 1: Project & Work Scope */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Top Selector Grid */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'المشروع المستهدف *' : 'Target Project *'}
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {isRtl ? p.nameAr : p.nameEn} ({p.projectNumber || 'PRJ'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'حزمة العمل / المجموعة *' : 'Work Package / Group *'}
                  </label>
                  <select
                    value={selectedWorkItemId}
                    onChange={(e) => handleWorkItemChange(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {availableWorkItems.map(wi => (
                      <option key={wi.id} value={wi.id}>
                        {isRtl ? wi.nameAr : wi.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'مستوى تطبيق الكارت *' : 'Application Level *'}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setCardLevel('Activity')}
                      className={`flex-1 py-1.5 px-3 rounded text-xs font-bold transition-colors ${
                        cardLevel === 'Activity' 
                          ? 'bg-[#040957] text-white shadow-sm' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isRtl ? 'نشاط محدد' : 'Single Activity'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardLevel('Group')}
                      className={`flex-1 py-1.5 px-3 rounded text-xs font-bold transition-colors ${
                        cardLevel === 'Group' 
                          ? 'bg-[#040957] text-white shadow-sm' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isRtl ? 'حزمة كاملة' : 'Entire Package'}
                    </button>
                  </div>
                </div>

                {cardLevel === 'Activity' && (
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isRtl ? 'النشاط الميداني المحدد *' : 'Designated Activity *'}
                    </label>
                    <select
                      value={selectedActivityId}
                      onChange={(e) => handleActivityChange(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {availableActivities.map(act => (
                        <option key={act.id} value={act.id}>
                          {isRtl ? act.nameAr : act.nameEn} ({act.totalQuantity} {act.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Work Scope Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'توصيف العمل (عربي) *' : 'Work Description (Arabic) *'}
                  </label>
                  <input
                    type="text"
                    value={workDescriptionAr}
                    onChange={(e) => setWorkDescriptionAr(e.target.value)}
                    placeholder="توصيف النشاط أو البند المراد تنفيذه..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'توصيف العمل (إنجليزي) *' : 'Work Description (English) *'}
                  </label>
                  <input
                    type="text"
                    value={workDescriptionEn}
                    onChange={(e) => setWorkDescriptionEn(e.target.value)}
                    placeholder="Activity scope and execution description..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'تفاصيل نطاق الأعمال والمنهجية الميدانية (Scope of Work):' : 'Detailed Scope of Work & Methodology:'}
                  </label>
                  <textarea
                    rows={2}
                    value={isRtl ? scopeOfWorkAr : scopeOfWorkEn}
                    onChange={(e) => isRtl ? setScopeOfWorkAr(e.target.value) : setScopeOfWorkEn(e.target.value)}
                    placeholder="خطوات التنفيذ، اشتراطات الربط، والضوابط الميدانية..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Location & Scheduling Info */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'المنطقة / الزون:' : 'Zone / Sector:'}
                  </label>
                  <input
                    type="text"
                    value={workAreaZone}
                    onChange={(e) => setWorkAreaZone(e.target.value)}
                    placeholder="Zone 4A"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'المنشأ / المبنى:' : 'Structure / Building:'}
                  </label>
                  <input
                    type="text"
                    value={buildingStructure}
                    onChange={(e) => setBuildingStructure(e.target.value)}
                    placeholder="Pier F-24"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'المنسوب / الطابق:' : 'Level / Elevation:'}
                  </label>
                  <input
                    type="text"
                    value={floorLevel}
                    onChange={(e) => setFloorLevel(e.target.value)}
                    placeholder="-4.5m Depth"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'الوردية:' : 'Shift:'}
                  </label>
                  <select
                    value={workShift}
                    onChange={(e) => setWorkShift(e.target.value as any)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Morning">{isRtl ? 'صباحية' : 'Morning'}</option>
                    <option value="Evening">{isRtl ? 'مسائية' : 'Evening'}</option>
                    <option value="Night">{isRtl ? 'ليلية' : 'Night'}</option>
                    <option value="24-Hour Rotating">{isRtl ? '24 ساعة متناوبة' : '24-Hour Rotating'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'تاريخ البدء المخطط:' : 'Planned Start:'}
                  </label>
                  <input
                    type="date"
                    value={plannedStartDate}
                    onChange={(e) => setPlannedStartDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'تاريخ الانتهاء المخطط:' : 'Planned Finish:'}
                  </label>
                  <input
                    type="date"
                    value={plannedFinishDate}
                    onChange={(e) => setPlannedFinishDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'المدة بالأيام:' : 'Duration (Days):'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={expectedDurationDays}
                    onChange={(e) => setExpectedDurationDays(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'عدد القوى العاملة:' : 'No. of Workers:'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={numberOfWorkers}
                    onChange={(e) => setNumberOfWorkers(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Resource Requirements & Key Roles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'المعدات والآليات المطلوبة:' : 'Required Equipment:'}
                  </label>
                  <input
                    type="text"
                    value={requiredEquipmentDetails}
                    onChange={(e) => setRequiredEquipmentDetails(e.target.value)}
                    placeholder="Excavator, Crane, Trucks..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'الأدوات والعدد الميدانية:' : 'Tools & Equipment:'}
                  </label>
                  <input
                    type="text"
                    value={requiredToolsDetails}
                    onChange={(e) => setRequiredToolsDetails(e.target.value)}
                    placeholder="Hand tools, levels, vibrators..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'المشرف الميداني / قائد الطاقم:' : 'Site Supervisor / Lead:'}
                  </label>
                  <input
                    type="text"
                    value={workCrewLead}
                    onChange={(e) => setWorkCrewLead(e.target.value)}
                    placeholder="Eng. Name"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Readiness Checklist */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-semibold text-blue-900 dark:text-blue-200">
                    {isRtl ? 'قائمة الفحص والتحقق الإلزامي من جاهزية الموقع قبل بدء الأعمال' : 'Mandatory readiness inspection gates. All mandatory gates must pass.'}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-bold">
                  <button
                    type="button"
                    onClick={() => setChecklist(prev => prev.map(c => ({ ...c, status: 'Pass', checkedBy: currentUserName, checkedAt: new Date().toISOString().substring(0, 16) })))}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] transition-colors"
                  >
                    {isRtl ? 'تحديد الكل (اجتياز Pass)' : 'Pass All'}
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                      <th className="p-2.5 text-center w-10">#</th>
                      <th className="p-2.5 text-start w-28">{isRtl ? 'التصنيف' : 'Category'}</th>
                      <th className="p-2.5 text-start">{isRtl ? 'بند الجاهزية والتحقق' : 'Inspection Gate'}</th>
                      <th className="p-2.5 text-center w-48">{isRtl ? 'النتيجة' : 'Status'}</th>
                      <th className="p-2.5 text-start w-48">{isRtl ? 'ملاحظات / المدقق' : 'Notes & Checker'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {checklist.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-600 dark:text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-[10.5px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {isRtl ? item.titleAr : item.titleEn}
                          </div>
                          {item.isMandatory && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                              * {isRtl ? 'بند إلزامي للتصريح' : 'Mandatory Gate'}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => handleChecklistStatusChange(item.id, 'Pass')}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                                item.status === 'Pass' 
                                  ? 'bg-emerald-600 text-white shadow' 
                                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pass</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChecklistStatusChange(item.id, 'Fail')}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                                item.status === 'Fail' 
                                  ? 'bg-rose-600 text-white shadow' 
                                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Fail</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChecklistStatusChange(item.id, 'NA')}
                              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                                item.status === 'NA' 
                                  ? 'bg-slate-600 text-white shadow' 
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                              }`}
                            >
                              N/A
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) => handleChecklistNotesChange(item.id, e.target.value)}
                            placeholder={item.checkedBy ? `Checked by ${item.checkedBy}` : (isRtl ? 'ملاحظات التحقق...' : 'Add notes...')}
                            className="w-full text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Attachments */}
          {activeTab === 'attachments' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-end gap-3">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'عنوان الوثيقة أو المخطط المعتمد *' : 'Document Title *'}
                  </label>
                  <input
                    type="text"
                    value={newAttTitle}
                    onChange={(e) => setNewAttTitle(e.target.value)}
                    placeholder="e.g. Approved Shop Drawing Rev 3, Method Statement..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="w-full md:w-56">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'نوع الوثيقة:' : 'Document Type:'}
                  </label>
                  <select
                    value={newAttType}
                    onChange={(e) => setNewAttType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="Approved Drawing">{isRtl ? 'مخطط تنفيذي معتمد' : 'Approved Drawing'}</option>
                    <option value="Method Statement">{isRtl ? 'منهجية العمل الفنية' : 'Method Statement'}</option>
                    <option value="JSA">{isRtl ? 'تحليل سلامة العمل (JSA)' : 'JSA / Risk Assessment'}</option>
                    <option value="ITP">{isRtl ? 'خطة فحص الجودة (ITP)' : 'ITP / Inspection Plan'}</option>
                    <option value="Survey Report">{isRtl ? 'تقرير مساحي ونقاط ربط' : 'Survey Report'}</option>
                    <option value="Lifting Plan">{isRtl ? 'خطة ودراسة الرفع' : 'Lifting Plan'}</option>
                    <option value="Other">{isRtl ? 'أخرى' : 'Other'}</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="w-full md:w-auto px-4 py-2 bg-[#040957] hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRtl ? 'إضافة مرفق' : 'Add Attachment'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attachments.map(att => (
                  <div key={att.id} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs">{att.title}</span>
                        <span className="text-[11px] text-slate-500">{att.documentType} • {att.fileName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        {att.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Approvals Workflow */}
          {activeTab === 'approvals' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                  {isRtl ? 'سلسلة الاعتمادات والموافقات الرسمية' : 'Formal Approval Chain & Governance'}
                </h3>
                <div className="space-y-3">
                  {approvals.map((app, idx) => (
                    <div 
                      key={app.id}
                      className={`p-3.5 rounded-lg border transition-all ${
                        app.status === 'Approved' 
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                          : app.status === 'Rejected'
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                          : idx === currentApprovalIndex
                          ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                            app.status === 'Approved' ? 'bg-emerald-600 text-white' :
                            app.status === 'Rejected' ? 'bg-rose-600 text-white' :
                            'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {app.order}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                              {isRtl ? app.roleNameAr : app.roleNameEn}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {app.assignedUserName || app.approverName || 'Designated Signatory'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' :
                            app.status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          }`}>
                            {app.status}
                          </span>
                          {app.decisionDate && (
                            <span className="text-xs font-mono text-slate-400">
                              {app.decisionDate} {app.decisionTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {app.decisionComments && (
                        <div className="mt-2 text-xs bg-white dark:bg-slate-900/60 p-2 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          <span className="font-semibold text-slate-500">{isRtl ? 'الملاحظات:' : 'Comments:'} </span>
                          {app.decisionComments}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Box for Current Step */}
              {status !== 'Approved' && status !== 'Rejected' && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900 space-y-3">
                  <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-blue-600" />
                    <span>{isRtl ? `توقيع واعتماد الخطوة الحالية: (${approvals[currentApprovalIndex]?.roleNameAr || 'الاعتماد'})` : `Sign Step #${currentApprovalIndex + 1}: ${approvals[currentApprovalIndex]?.roleNameEn || ''}`}</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {isRtl ? 'اسم الموقع / المعتمِد:' : 'Signatory Name:'}
                      </label>
                      <input
                        type="text"
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {isRtl ? 'ملاحظات الاعتماد:' : 'Decision Notes:'}
                      </label>
                      <input
                        type="text"
                        value={approvalComment}
                        onChange={(e) => setApprovalComment(e.target.value)}
                        placeholder="Verified on site per specifications..."
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleApproveCurrentStep('Approved')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isRtl ? 'اعتماد الخطوة وتمريرها' : 'Approve & Pass Step'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveCurrentStep('Revision Requested')}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>{isRtl ? 'طلب تعديل ومراجعة' : 'Request Revision'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveCurrentStep('Rejected')}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{isRtl ? 'رفض الكارت' : 'Reject Card'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Document Preview & Printing */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isRtl ? 'معاينة النموذج الرسمي المعتمد للطباعة وحفظ PDF' : 'Official A4 Document Print Preview'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isRtl ? 'طباعة' : 'Print'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDownloadingPdf}
                    onClick={handleDownloadPDF}
                    className="px-3.5 py-1.5 bg-[#040957] hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloadingPdf ? (isRtl ? 'جاري التحميل...' : 'Downloading...') : (isRtl ? 'تحميل PDF' : 'Download PDF')}</span>
                  </button>
                </div>
              </div>

              {/* Printable Layout Container */}
              <div 
                className="overflow-x-auto overflow-y-auto bg-slate-200/90 dark:bg-slate-950 p-2 sm:p-4 rounded-xl flex justify-center touch-pan-x touch-pan-y"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <StartCardPrintableDoc
                  startCard={{
                    id: startCard?.id || 'new',
                    cardNumber,
                    revision,
                    level: cardLevel,
                    projectId: selectedProjectId,
                    workItemId: selectedWorkItemId,
                    activityId: selectedActivityId,
                    projectNameEn: selectedProject?.nameEn || 'Site Project',
                    projectNameAr: selectedProject?.nameAr || 'المشروع الإنشائي',
                    projectNumber: selectedProject?.projectNumber || 'PRJ-2026',
                    clientEn: selectedProject?.clientEn || 'Client',
                    clientAr: selectedProject?.clientAr || 'المالك',
                    projectLocationEn: selectedProject?.locationEn || 'Location',
                    projectLocationAr: selectedProject?.locationAr || 'الموقع',
                    workAreaZone,
                    buildingStructure,
                    floorLevel,
                    gridReference,
                    workPackageCode: `WP-${cardNumber.slice(-4)}`,
                    workDescriptionEn,
                    workDescriptionAr,
                    scopeOfWorkEn,
                    scopeOfWorkAr,
                    plannedStartDate,
                    plannedFinishDate,
                    expectedDurationDays,
                    workShift,
                    workCrewLead,
                    numberOfWorkers,
                    requiredEquipmentDetails,
                    requiredToolsDetails,
                    requiredMaterialsDetails,
                    checklist,
                    attachments,
                    approvals,
                    currentApprovalIndex,
                    status,
                    createdAt: startCard?.createdAt || new Date().toISOString(),
                    createdBy: startCard?.createdBy || currentUserName
                  }}
                  settings={settings}
                  lang={lang}
                  qrCodeUrl={qrCodeDataUrl}
                />
              </div>
            </div>
          )}

          {/* Tab 6: QR Code & Mobile Verification */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="p-4 bg-white rounded-2xl shadow-lg border-2 border-blue-900 inline-block">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-52 h-52 object-contain" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-slate-400">Loading QR...</div>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {cardNumber}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {isRtl ? 'امسح الرمز بكاميرا الجوال أو جهاز التفتيش الميداني للتحقق من صلاحية كارت بدء العمل وحالة الاعتمادات.' : 'Scan QR code with mobile camera on site to immediately verify live authorization and approval status.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status === 'Draft' && (
              <button
                type="button"
                onClick={handleSubmitCard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{isRtl ? 'تقديم للاعتماد' : 'Submit for Approvals'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveStartCard}
              className="px-5 py-2 bg-[#040957] hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ الكارت' : 'Save Start Card')}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StartCardModal;
