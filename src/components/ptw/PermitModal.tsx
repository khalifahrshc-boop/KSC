/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  WorkPermit, 
  StartCard, 
  Project, 
  WorkItem, 
  Activity, 
  SystemSettings, 
  UserRole,
  PermitTypeConfig,
  PTWHazardItem,
  PTWSafetyControlItem,
  PTWPPEItem,
  DocumentAttachment,
  ApprovalStep,
  PTWExtension,
  PTWSuspension,
  PTWClosure,
  PermitAuditLog,
  RiskLevel,
  Worker,
  EquipmentItem,
  WarehouseMaterial
} from '../../types';
import { 
  DEFAULT_PERMIT_TYPES, 
  DEFAULT_HAZARDS, 
  DEFAULT_SAFETY_CONTROLS, 
  DEFAULT_PPE_ITEMS,
  generateQRCode,
  generatePTWQRCode 
} from '../../utils/ptwCalculations';
import { PermitPrintableDoc } from './PermitPrintableDoc';
import { runWithOklchSanitizer } from '../../utils/pdfSanitizer';
import { 
  X, 
  Save, 
  Printer, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShieldAlert, 
  ShieldCheck, 
  Building, 
  Flame, 
  FileText, 
  Paperclip, 
  Plus, 
  Trash2, 
  QrCode, 
  PenTool, 
  Eye, 
  Calendar, 
  Clock, 
  Send,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  CheckSquare,
  Box,
  Shovel,
  Anchor,
  Zap,
  Moon,
  Car,
  HardHat,
  Truck,
  UserCheck,
  Search,
  AlertOctagon,
  Layers,
  MapPin
} from 'lucide-react';

interface PermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  permit?: WorkPermit | null;
  initialActivityId?: string;
  initialStartCardId?: string;
  startCards: StartCard[];
  permitTypes?: PermitTypeConfig[];
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  workers?: Worker[];
  equipment?: EquipmentItem[];
  materials?: WarehouseMaterial[];
  settings: SystemSettings;
  userRoles: UserRole[];
  currentUserName?: string;
  onSave: (permit: WorkPermit) => Promise<void>;
  onLogAudit: (log: Omit<PermitAuditLog, 'id' | 'timestamp'>) => Promise<void>;
  lang: 'ar' | 'en';
}

export const PermitModal: React.FC<PermitModalProps> = ({
  isOpen,
  onClose,
  permit,
  initialActivityId,
  initialStartCardId,
  startCards,
  permitTypes = DEFAULT_PERMIT_TYPES,
  projects,
  workItems,
  activities,
  workers = [],
  equipment = [],
  materials = [],
  settings,
  userRoles,
  currentUserName = 'HSE Officer',
  onSave,
  onLogAudit,
  lang
}) => {
  const isRtl = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'info' | 'hazards' | 'controls' | 'approvals' | 'lifecycle' | 'preview' | 'qr'>('info');

  // Core identifiers
  const [permitNumber, setPermitNumber] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedWorkItemId, setSelectedWorkItemId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [selectedStartCardId, setSelectedStartCardId] = useState('');
  const [selectedPermitTypeId, setSelectedPermitTypeId] = useState('pt-gen');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Low');
  const [status, setStatus] = useState<WorkPermit['status']>('Draft');

  // Linked Labor & Equipment from Activity
  const [assignedWorkerIds, setAssignedWorkerIds] = useState<string[]>([]);
  const [assignedEquipmentIds, setAssignedEquipmentIds] = useState<string[]>([]);
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [activityValidationError, setActivityValidationError] = useState<string | null>(null);

  // Work Scope & Area
  const [workLocation, setWorkLocation] = useState('');
  const [exactWorkArea, setExactWorkArea] = useState('');
  const [descriptionOfWorkEn, setDescriptionOfWorkEn] = useState('');
  const [descriptionOfWorkAr, setDescriptionOfWorkAr] = useState('');
  const [shift, setShift] = useState<WorkPermit['shift']>('Morning');
  const [numberOfWorkers, setNumberOfWorkers] = useState(6);

  // Validity Windows
  const [validFromDate, setValidFromDate] = useState(new Date().toISOString().substring(0, 10));
  const [validFromTime, setValidFromTime] = useState('07:00');
  const [validUntilDate, setValidUntilDate] = useState(new Date().toISOString().substring(0, 10));
  const [validUntilTime, setValidUntilTime] = useState('17:00');

  // Safety & Emergency Contacts
  const [emergencyContactName, setEmergencyContactName] = useState('HSE Command Unit');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('+966-555-911-000');
  const [assemblyPoint, setAssemblyPoint] = useState('Assembly Point Zone A');

  // Hazards & Controls
  const [hazards, setHazards] = useState<PTWHazardItem[]>(DEFAULT_HAZARDS.slice(0, 3));
  const [safetyControls, setSafetyControls] = useState<PTWSafetyControlItem[]>(DEFAULT_SAFETY_CONTROLS);
  const [ppeChecklist, setPpeChecklist] = useState<PTWPPEItem[]>(DEFAULT_PPE_ITEMS);
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);

  // Approvals Chain
  const [approvals, setApprovals] = useState<ApprovalStep[]>([]);
  const [currentApprovalIndex, setCurrentApprovalIndex] = useState(0);
  const [signatureText, setSignatureText] = useState(currentUserName);
  const [approvalComment, setApprovalComment] = useState('');

  // Extensions & Lifecycle
  const [extensions, setExtensions] = useState<PTWExtension[]>([]);
  const [suspensions, setSuspensions] = useState<PTWSuspension[]>([]);
  const [closure, setClosure] = useState<PTWClosure | undefined>(undefined);

  // Lifecycle action modals state
  const [extensionHours, setExtensionHours] = useState(4);
  const [extensionReason, setExtensionReason] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspensionCategory, setSuspensionCategory] = useState<PTWSuspension['reasonCategory']>('Weather');

  // QR Code
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Filtered relations
  const availableWorkItems = workItems.filter(wi => !selectedProjectId || wi.projectId === selectedProjectId);
  const availableActivities = activities.filter(act => {
    if (selectedWorkItemId) return act.workItemId === selectedWorkItemId;
    if (selectedProjectId) {
      const parentWis = workItems.filter(w => w.projectId === selectedProjectId).map(w => w.id);
      return parentWis.includes(act.workItemId);
    }
    return true;
  });
  const availableStartCards = startCards.filter(sc => !selectedProjectId || sc.projectId === selectedProjectId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedActivity = activities.find(a => a.id === selectedActivityId);
  const selectedWorkItem = workItems.find(w => w.id === selectedWorkItemId);

  // Auto-sync function when an activity is selected
  const handleSelectActivity = (actId: string, forceReset = false) => {
    setSelectedActivityId(actId);
    setActivityValidationError(null);

    const targetAct = activities.find(a => a.id === actId);
    if (!targetAct) return;

    // Sync parent WorkItem and Project
    const parentWi = workItems.find(w => w.id === targetAct.workItemId);
    if (parentWi) {
      setSelectedWorkItemId(parentWi.id);
      if (parentWi.projectId) {
        setSelectedProjectId(parentWi.projectId);
      }
    }

    // Auto-link Workers
    const actWorkerIds = targetAct.workerIds || [];
    setAssignedWorkerIds(actWorkerIds);
    setNumberOfWorkers(actWorkerIds.length > 0 ? actWorkerIds.length : (targetAct.workerIds?.length || 4));

    // Auto-link Equipment
    const actEquipIds = targetAct.equipmentIds || (targetAct.equipmentAllocations?.map(e => e.id) || []);
    setAssignedEquipmentIds(actEquipIds);

    // Auto-link Supervisor
    let sup = '';
    if (targetAct.supervisorId) {
      const foundWorker = workers.find(w => w.id === targetAct.supervisorId);
      sup = foundWorker ? foundWorker.fullName : targetAct.supervisorId;
    }
    if (!sup && parentWi) {
      sup = parentWi.responsiblePerson || '';
    }
    setSupervisorName(sup || currentUserName);

    // Auto-fill Description
    if (forceReset || !descriptionOfWorkAr) {
      setDescriptionOfWorkAr(targetAct.nameAr || targetAct.descriptionAr || 'تنفيذ نشاط ميداني معتمد');
    }
    if (forceReset || !descriptionOfWorkEn) {
      setDescriptionOfWorkEn(targetAct.nameEn || targetAct.descriptionEn || 'Execution of approved site activity');
    }

    // Auto-fill Location
    const locParts = [
      targetAct.workZone ? (isRtl ? `منطقة: ${targetAct.workZone}` : `Zone: ${targetAct.workZone}`) : '',
      targetAct.location ? targetAct.location : '',
      targetAct.role ? targetAct.role : ''
    ].filter(Boolean);
    if (locParts.length > 0) {
      setExactWorkArea(locParts.join(' - '));
    } else {
      setExactWorkArea(isRtl ? `موقع النشاط: ${targetAct.nameAr}` : `Activity Site: ${targetAct.nameEn}`);
    }

    // Auto-fill Project Name / Location
    const targetProj = parentWi ? projects.find(p => p.id === parentWi.projectId) : null;
    if (targetProj) {
      setWorkLocation(isRtl ? targetProj.nameAr : targetProj.nameEn);
    }

    // Auto-sync Dates
    const todayStr = new Date().toISOString().substring(0, 10);
    if (targetAct.startDate) {
      setValidFromDate(targetAct.startDate);
    }
    if (targetAct.endDate || targetAct.expectedFinishDate) {
      setValidUntilDate(targetAct.endDate || targetAct.expectedFinishDate || todayStr);
    }

    // Auto-match Start Card if exists
    const matchingSc = startCards.find(sc => 
      sc.activityId === actId || 
      (sc.targetActivityIds && sc.targetActivityIds.includes(actId)) ||
      sc.workItemId === targetAct.workItemId
    );
    if (matchingSc) {
      setSelectedStartCardId(matchingSc.id);
    }
  };

  // Initialize
  useEffect(() => {
    if (!isOpen) return;

    if (permit) {
      setPermitNumber(permit.permitNumber);
      setSelectedProjectId(permit.projectId);
      setSelectedWorkItemId(permit.workItemId);
      setSelectedActivityId(permit.activityId || '');
      setSelectedStartCardId(permit.startCardId || '');
      setSelectedPermitTypeId(permit.permitTypeId);
      setRiskLevel(permit.riskLevel);
      setStatus(permit.status);
      setWorkLocation(permit.workLocation);
      setExactWorkArea(permit.exactWorkArea);
      setDescriptionOfWorkEn(permit.descriptionOfWorkEn);
      setDescriptionOfWorkAr(permit.descriptionOfWorkAr);
      setShift(permit.shift);
      setNumberOfWorkers(permit.numberOfWorkers);
      setAssignedWorkerIds(permit.assignedWorkerIds || []);
      setAssignedEquipmentIds(permit.assignedEquipmentIds || []);
      setSupervisorName(permit.supervisorName || '');

      setValidFromDate(permit.validFromDate);
      setValidFromTime(permit.validFromTime);
      setValidUntilDate(permit.validUntilDate);
      setValidUntilTime(permit.validUntilTime);
      setEmergencyContactName(permit.emergencyContactName || 'HSE Command Unit');
      setEmergencyContactPhone(permit.emergencyContactPhone || '+966-555-911-000');
      setAssemblyPoint(permit.assemblyPoint || 'Assembly Point Zone A');
      setHazards(permit.hazards && permit.hazards.length > 0 ? permit.hazards : DEFAULT_HAZARDS.slice(0, 3));
      setSafetyControls(permit.safetyControls && permit.safetyControls.length > 0 ? permit.safetyControls : DEFAULT_SAFETY_CONTROLS);
      setPpeChecklist(permit.ppeChecklist && permit.ppeChecklist.length > 0 ? permit.ppeChecklist : DEFAULT_PPE_ITEMS);
      setAttachments(permit.attachments || []);
      setApprovals(permit.approvals || []);
      setCurrentApprovalIndex(permit.currentApprovalIndex || 0);
      setExtensions(permit.extensions || []);
      setSuspensions(permit.suspensions || []);
      setClosure(permit.closure);

      generateQRCode(`PTW:${permit.permitNumber}:${permit.id}:${permit.status}`).then(url => {
        setQrCodeDataUrl(url);
      });
    } else {
      let targetAct = initialActivityId ? activities.find(a => a.id === initialActivityId) : null;
      if (!targetAct && activities.length > 0) {
        targetAct = activities[0];
      }
      let targetWi = targetAct ? workItems.find(w => w.id === targetAct?.workItemId) : (workItems[0] || null);
      let targetProj = targetWi ? projects.find(p => p.id === targetWi?.projectId) : (projects[0] || null);

      const projId = targetProj?.id || projects[0]?.id || '';
      const wiId = targetWi?.id || '';
      const actId = targetAct?.id || '';

      const generatedNum = `PTW-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      setPermitNumber(generatedNum);
      setSelectedProjectId(projId);
      setSelectedWorkItemId(wiId);
      setSelectedActivityId(actId);
      setSelectedPermitTypeId('pt-gen');
      setRiskLevel('Low');
      setStatus('Draft');

      const todayStr = new Date().toISOString().substring(0, 10);
      setValidFromDate(targetAct?.startDate || todayStr);
      setValidFromTime('07:00');
      setValidUntilDate(targetAct?.endDate || targetAct?.expectedFinishDate || todayStr);
      setValidUntilTime('17:00');

      setWorkLocation(targetProj ? (isRtl ? targetProj.nameAr : targetProj.nameEn) : 'Main Project Site');
      setShift('Morning');

      if (targetAct) {
        handleSelectActivity(targetAct.id, true);
      } else {
        setExactWorkArea('Zone 1 - Main Structural Foundation');
        setDescriptionOfWorkEn('General site construction and activity execution');
        setDescriptionOfWorkAr('تنفيذ الأعمال الإنشائية والنشاط الميداني');
        setNumberOfWorkers(8);
        setAssignedWorkerIds([]);
        setAssignedEquipmentIds([]);
        setSupervisorName(currentUserName);
      }

      let defaultSc = initialStartCardId 
        ? startCards.find(sc => sc.id === initialStartCardId)
        : (targetAct ? startCards.find(sc => sc.activityId === targetAct?.id) : startCards.find(sc => sc.projectId === projId));
      setSelectedStartCardId(defaultSc?.id || '');

      setHazards(DEFAULT_HAZARDS.slice(0, 3));
      setSafetyControls(DEFAULT_SAFETY_CONTROLS);
      setPpeChecklist(DEFAULT_PPE_ITEMS);
      setAttachments([]);

      const initialApprovals: ApprovalStep[] = [
        { id: 'app-1', order: 1, roleNameEn: 'Permit Receiver (Site Sup.)', roleNameAr: 'مستلم التصريح (المشرف الميداني)', assignedUserName: currentUserName, status: 'Pending' },
        { id: 'app-2', order: 2, roleNameEn: 'Permit Issuer (HSE Officer)', roleNameAr: 'مُصدر التصريح (مسؤول السلامة)', assignedUserName: 'HSE Lead', status: 'Pending' },
        { id: 'app-3', order: 3, roleNameEn: 'Authorized Project Approver', roleNameAr: 'الاعتماد النهائي للموقع (مدير المشروع)', assignedUserName: 'Project Manager', status: 'Pending' }
      ];
      setApprovals(initialApprovals);
      setCurrentApprovalIndex(0);

      generateQRCode(`PTW:${generatedNum}:NEW:DRAFT`).then(url => {
        setQrCodeDataUrl(url);
      });
    }
  }, [isOpen, permit, projects, workItems, activities, startCards, currentUserName, initialActivityId, initialStartCardId]);

  // Automatically update QR Code when key permit parameters change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const currentPermitType = permitTypes?.find(pt => pt.id === selectedPermitTypeId);
    
    generatePTWQRCode({
      id: permit?.id || 'new',
      permitNumber,
      status,
      permitTypeNameEn: currentPermitType?.nameEn,
      permitTypeNameAr: currentPermitType?.nameAr,
      riskLevel,
      workLocation,
      exactWorkArea,
      validFromDate,
      validFromTime,
      validUntilDate,
      validUntilTime,
      supervisorName,
      numberOfWorkers,
      emergencyContactPhone
    }, isRtl ? selectedProject?.nameAr : selectedProject?.nameEn).then(url => {
      if (isMounted && url) {
        setQrCodeDataUrl(url);
      }
    });

    return () => { isMounted = false; };
  }, [
    isOpen,
    permit?.id,
    permitNumber,
    status,
    selectedPermitTypeId,
    riskLevel,
    workLocation,
    exactWorkArea,
    validFromDate,
    validFromTime,
    validUntilDate,
    validUntilTime,
    supervisorName,
    numberOfWorkers,
    emergencyContactPhone,
    selectedProject,
    isRtl,
    permitTypes
  ]);

  // Permit type changed
  const handlePermitTypeChange = (typeId: string) => {
    setSelectedPermitTypeId(typeId);
    const pType = permitTypes.find(pt => pt.id === typeId);
    if (pType) {
      setRiskLevel(pType.defaultRiskLevel);
      // Adjust validity
      const now = new Date();
      const expiry = new Date(now.getTime() + pType.defaultValidityHours * 60 * 60 * 1000);
      setValidUntilDate(expiry.toISOString().substring(0, 10));
      setValidUntilTime(expiry.toTimeString().substring(0, 5));
    }
  };

  // Toggle Worker in Assigned List
  const handleToggleWorker = (workerId: string) => {
    setAssignedWorkerIds(prev => {
      const exists = prev.includes(workerId);
      const next = exists ? prev.filter(id => id !== workerId) : [...prev, workerId];
      setNumberOfWorkers(Math.max(1, next.length));
      return next;
    });
  };

  // Toggle Equipment in Assigned List
  const handleToggleEquipment = (eqId: string) => {
    setAssignedEquipmentIds(prev => {
      const exists = prev.includes(eqId);
      return exists ? prev.filter(id => id !== eqId) : [...prev, eqId];
    });
  };

  // Toggle Safety Control
  const handleToggleControl = (id: string) => {
    setSafetyControls(prev => prev.map(ctrl => {
      if (ctrl.id === id) {
        const nextState = !ctrl.isImplemented;
        return {
          ...ctrl,
          isImplemented: nextState,
          verifiedBy: nextState ? currentUserName : undefined
        };
      }
      return ctrl;
    }));
  };

  // Toggle PPE Availability
  const handleTogglePPE = (id: string) => {
    setPpeChecklist(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, isAvailable: !p.isAvailable };
      }
      return p;
    }));
  };

  // Process Approval Step
  const handleApproveStep = async (decision: 'Approved' | 'Rejected' | 'Revision Requested') => {
    const updatedApprovals = [...approvals];
    const step = updatedApprovals[currentApprovalIndex];
    if (!step) return;

    const now = new Date();
    const dateStr = now.toISOString().substring(0, 10);
    const timeStr = now.toTimeString().substring(0, 5);

    step.status = decision;
    step.decisionDate = dateStr;
    step.decisionTime = timeStr;
    step.decisionComments = approvalComment || (decision === 'Approved' ? 'Site verified and authorized.' : 'Action required.');
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
        nextStatus = 'Active'; // Fully authorized!
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
      recordType: 'WorkPermit',
      recordId: permit?.id || permitNumber,
      recordNumber: permitNumber,
      projectId: selectedProjectId,
      userId: 'current-user',
      userName: currentUserName,
      userRoles,
      action: decision === 'Approved' ? (nextStatus === 'Active' ? 'Approved' : 'Edited') : 'Rejected',
      previousStatus: status,
      newStatus: nextStatus,
      comments: `PTW Step ${step.order} (${step.roleNameEn}) ${decision}: ${step.decisionComments}`
    });
  };

  // Extend Permit
  const handleApplyExtension = async () => {
    if (!extensionReason.trim()) {
      alert(isRtl ? 'يرجى كتابة سبب التمديد' : 'Please provide reason for extension');
      return;
    }
    const currentExpiry = new Date(`${validUntilDate}T${validUntilTime}:00`);
    const newExpiry = new Date(currentExpiry.getTime() + extensionHours * 60 * 60 * 1000);

    const newExt: PTWExtension = {
      id: `ext-${Date.now()}`,
      previousExpiry: `${validUntilDate} ${validUntilTime}`,
      newExpiry: `${newExpiry.toISOString().substring(0, 10)} ${newExpiry.toTimeString().substring(0, 5)}`,
      reason: extensionReason,
      requestedBy: currentUserName,
      approvedBy: 'HSE Manager',
      timestamp: new Date().toISOString(),
      status: 'Approved'
    };

    setValidUntilDate(newExpiry.toISOString().substring(0, 10));
    setValidUntilTime(newExpiry.toTimeString().substring(0, 5));
    setExtensions(prev => [...prev, newExt]);
    setExtensionReason('');

    await onLogAudit({
      recordType: 'WorkPermit',
      recordId: permit?.id || permitNumber,
      recordNumber: permitNumber,
      projectId: selectedProjectId,
      userId: 'current-user',
      userName: currentUserName,
      userRoles,
      action: 'Extended',
      previousStatus: status,
      newStatus: status,
      comments: `Extended by ${extensionHours} hours until ${newExt.newExpiry}. Reason: ${extensionReason}`
    });
  };

  // Suspend Permit
  const handleSuspendPermit = async () => {
    if (!suspensionReason.trim()) {
      alert(isRtl ? 'يرجى كتابة سبب الإيقاف المؤقت' : 'Please provide suspension reason');
      return;
    }
    const newSusp: PTWSuspension = {
      id: `susp-${Date.now()}`,
      reason: suspensionReason,
      reasonCategory: suspensionCategory,
      suspendedBy: currentUserName,
      suspendedAt: new Date().toISOString()
    };

    setSuspensions(prev => [...prev, newSusp]);
    setStatus('Suspended');
    setSuspensionReason('');

    await onLogAudit({
      recordType: 'WorkPermit',
      recordId: permit?.id || permitNumber,
      recordNumber: permitNumber,
      projectId: selectedProjectId,
      userId: 'current-user',
      userName: currentUserName,
      userRoles,
      action: 'Suspended',
      previousStatus: status,
      newStatus: 'Suspended',
      comments: `Suspended due to ${suspensionCategory}: ${suspensionReason}`
    });
  };

  // Resume Suspended Permit
  const handleResumePermit = async () => {
    setStatus('Active');
    setSuspensions(prev => prev.map((s, i) => i === prev.length - 1 ? {
      ...s,
      resumedAt: new Date().toISOString(),
      resumedBy: currentUserName,
      resumeApproval: 'Approved by HSE'
    } : s));

    await onLogAudit({
      recordType: 'WorkPermit',
      recordId: permit?.id || permitNumber,
      recordNumber: permitNumber,
      projectId: selectedProjectId,
      userId: 'current-user',
      userName: currentUserName,
      userRoles,
      action: 'Resumed',
      previousStatus: 'Suspended',
      newStatus: 'Active',
      comments: 'Work authorization resumed after safety checks clearance.'
    });
  };

  // Close Permit
  const handleClosePermit = async () => {
    const finalClosure: PTWClosure = {
      id: `cls-${Date.now()}`,
      closedBy: currentUserName,
      closedAt: new Date().toISOString(),
      comments: 'Work completed, tools cleared, area left safe and clean.',
      checks: {
        workCompleted: true,
        areaInspected: true,
        toolsRemoved: true,
        equipmentRemoved: true,
        wasteRemoved: true,
        barricadesRemoved: true,
        areaSafe: true,
        temporaryControlsRemoved: true,
        handoverCompleted: true
      }
    };

    setClosure(finalClosure);
    setStatus('Closed');

    await onLogAudit({
      recordType: 'WorkPermit',
      recordId: permit?.id || permitNumber,
      recordNumber: permitNumber,
      projectId: selectedProjectId,
      userId: 'current-user',
      userName: currentUserName,
      userRoles,
      action: 'Closed',
      previousStatus: status,
      newStatus: 'Closed',
      comments: 'Permit officially closed. Area inspected and handed over.'
    });
  };

  // Save Permit
  const handleSavePermit = async () => {
    if (!selectedActivityId) {
      setActivityValidationError(isRtl ? 'يجب اختيار نشاط (Activity) قائم لإصدار تصريح العمل والربط التلقائي.' : 'You must select an existing Activity to issue a Permit to Work.');
      setActiveTab('info');
      return;
    }

    setIsSaving(true);
    try {
      const pType = permitTypes.find(pt => pt.id === selectedPermitTypeId) || DEFAULT_PERMIT_TYPES[0];
      const linkedAct = activities.find(a => a.id === selectedActivityId);

      const workerNames = assignedWorkerIds.map(wId => {
        const found = workers.find(w => w.id === wId);
        return found ? found.fullName : wId;
      });

      const equipNames = assignedEquipmentIds.map(eqId => {
        const found = equipment.find(e => e.id === eqId);
        return found ? (isRtl ? (found.nameAr || found.name) : (found.nameEn || found.name)) : eqId;
      });

      const payload: WorkPermit = {
        id: permit?.id || `ptw-${Date.now()}`,
        permitNumber,
        startCardId: selectedStartCardId,
        projectId: selectedProjectId,
        workItemId: selectedWorkItemId,
        activityId: selectedActivityId,
        activityNameEn: linkedAct?.nameEn || '',
        activityNameAr: linkedAct?.nameAr || '',

        assignedWorkerIds,
        assignedWorkerNames: workerNames,
        assignedEquipmentIds,
        assignedEquipmentNames: equipNames,
        supervisorName: supervisorName || currentUserName,

        permitTypeId: selectedPermitTypeId,
        permitTypeNameEn: pType.nameEn,
        permitTypeNameAr: pType.nameAr,
        riskLevel,
        workLocation,
        exactWorkArea,
        descriptionOfWorkEn,
        descriptionOfWorkAr,
        shift,
        numberOfWorkers: Number(numberOfWorkers) || (assignedWorkerIds.length > 0 ? assignedWorkerIds.length : 1),

        validFromDate,
        validFromTime,
        validUntilDate,
        validUntilTime,
        actualStartDate: status === 'Active' ? (permit?.actualStartDate || validFromDate) : undefined,
        actualStartTime: status === 'Active' ? (permit?.actualStartTime || validFromTime) : undefined,

        hazards,
        safetyControls,
        ppeChecklist,
        emergencyContactName,
        emergencyContactPhone,
        assemblyPoint,
        attachments,

        approvals,
        currentApprovalIndex,

        extensions,
        suspensions,
        closure,

        status,
        createdAt: permit?.createdAt || new Date().toISOString(),
        createdBy: permit?.createdBy || currentUserName,
        updatedAt: new Date().toISOString(),
        approvedAt: (status === 'Active' || status === 'Approved') ? (permit?.approvedAt || new Date().toISOString()) : undefined,
        approvedBy: (status === 'Active' || status === 'Approved') ? (permit?.approvedBy || currentUserName) : undefined,
        qrCodeUrl: qrCodeDataUrl
      };

      await onSave(payload);

      await onLogAudit({
        recordType: 'WorkPermit',
        recordId: payload.id,
        recordNumber: payload.permitNumber,
        projectId: payload.projectId,
        userId: 'current-user',
        userName: currentUserName,
        userRoles,
        action: permit ? 'Edited' : 'Created',
        newStatus: payload.status,
        comments: `Permit ${payload.permitNumber} saved with Activity: ${linkedAct?.nameAr || linkedAct?.nameEn || 'Linked'}.`
      });

      onClose();
    } catch (err) {
      console.error('Error saving PTW:', err);
      alert(isRtl ? 'حدث خطأ أثناء حفظ تصريح العمل' : 'Error saving Permit to Work');
    } finally {
      setIsSaving(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      const element = document.getElementById(`permit-print-${permit?.id || 'new'}`);
      if (!element) {
        alert(isRtl ? 'يرجى التبديل لتبويب المعاينة قبل التحميل' : 'Please open the Preview tab first');
        return;
      }
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: [6, 4, 6, 4] as [number, number, number, number],
        filename: `${permitNumber || 'PTW'}.pdf`,
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
        <div className="px-6 py-4 bg-gradient-to-r from-rose-50/80 via-orange-50/40 to-white text-slate-900 flex items-center justify-between border-b border-slate-200/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-200">
              <ShieldAlert className="w-5 h-5 text-rose-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight text-slate-900">
                  {permit ? (isRtl ? `تصريح العمل المعتمد: ${permitNumber}` : `Work Permit: ${permitNumber}`) : (isRtl ? 'إصدار تصريح عمل رسمي (Permit to Work)' : 'Issue Permit to Work (PTW)')}
                </h2>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                  status === 'Active' || status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                  status === 'Suspended' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                  status === 'Submitted' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                  'bg-blue-50 text-blue-800 border-blue-300'
                }`}>
                  {status.toUpperCase()}
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-rose-100 text-rose-800 border border-rose-200">
                  {riskLevel} RISK
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                {isRtl ? 'ضوابط السلامة والمخاطر والتفويض الرسمي المسبق لتنفيذ النشاط' : 'Mandatory safety controls, risk mitigation & official work authorization'}
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
                ? 'border-rose-600 text-rose-700 dark:text-rose-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>{isRtl ? '1. بيانات التصريح والصلاحية' : '1. Scope & Validity'}</span>
          </button>

          <button
            onClick={() => setActiveTab('hazards')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'hazards' 
                ? 'border-rose-600 text-rose-700 dark:text-rose-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{isRtl ? '2. مصفوفة المخاطر' : '2. Hazard Matrix'}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-mono">
              {hazards.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('controls')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'controls' 
                ? 'border-rose-600 text-rose-700 dark:text-rose-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isRtl ? '3. ضوابط السلامة ومهمات الوقاية' : '3. Controls & PPE'}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono">
              {safetyControls.filter(c => c.isImplemented).length}/{safetyControls.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approvals')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'approvals' 
                ? 'border-rose-600 text-rose-700 dark:text-rose-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>{isRtl ? '4. التوقيعات والاعتماد' : '4. Approvals'}</span>
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono">
              {approvals.filter(a => a.status === 'Approved').length}/{approvals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('lifecycle')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'lifecycle' 
                ? 'border-rose-600 text-rose-700 dark:text-rose-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PauseCircle className="w-4 h-4" />
            <span>{isRtl ? '5. التمديد والإيقاف والإغلاق' : '5. Lifecycle & Closure'}</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'preview' 
                ? 'border-rose-600 text-rose-700 dark:text-rose-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{isRtl ? '6. معاينة وثيقة التصريح (A4)' : '6. Document Preview (A4)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'qr' 
                ? 'border-rose-600 text-rose-700 dark:text-rose-400' 
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{isRtl ? 'الرمز (QR)' : 'QR Token'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 text-sm">
          {/* Tab 1: Scope & Validity */}
          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Type & Risk Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {isRtl ? 'اختر نوع تصريح العمل (Permit Type) *' : 'Select Permit Type *'}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {permitTypes.map(pt => {
                    const isSelected = selectedPermitTypeId === pt.id;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => handlePermitTypeChange(pt.id)}
                        className={`p-3 rounded-lg border text-start transition-all flex items-start gap-2.5 ${
                          isSelected 
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className={`p-2 rounded-md ${isSelected ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                          {pt.code === 'HWP' ? <Flame className="w-4 h-4" /> :
                           pt.code === 'WAH' ? <Building className="w-4 h-4" /> :
                           pt.code === 'CSE' ? <Box className="w-4 h-4" /> :
                           pt.code === 'EXC' ? <Shovel className="w-4 h-4" /> :
                           pt.code === 'LIFT' ? <Anchor className="w-4 h-4" /> :
                           pt.code === 'ELEC' ? <Zap className="w-4 h-4" /> :
                           pt.code === 'NIGHT' ? <Moon className="w-4 h-4" /> :
                           pt.code === 'TRAF' ? <Car className="w-4 h-4" /> :
                           <FileText className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                            {isRtl ? pt.nameAr : pt.nameEn}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {pt.code} • {pt.defaultValidityHours}h Max • {pt.defaultRiskLevel} Risk
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Activity Mandatory Selection & Linking Box */}
              <div className={`p-4 rounded-xl border transition-all ${
                activityValidationError 
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 ring-2 ring-rose-400/30' 
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {isRtl ? 'النشاط الميداني المرتبط (Activity Requirement) *' : 'Linked Field Activity (Mandatory) *'}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100">
                    {isRtl ? 'ربط تلقائي للعمالة والمعدات' : 'Auto-Syncs Labor & Machinery'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isRtl ? '1. المشروع:' : '1. Project:'}
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => {
                        const newPId = e.target.value;
                        setSelectedProjectId(newPId);
                        const pWis = workItems.filter(w => w.projectId === newPId);
                        const firstWi = pWis[0];
                        setSelectedWorkItemId(firstWi?.id || '');
                        const pActs = activities.filter(a => firstWi ? a.workItemId === firstWi.id : false);
                        if (pActs[0]) {
                          handleSelectActivity(pActs[0].id);
                        } else {
                          setSelectedActivityId('');
                        }
                      }}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isRtl ? '2. حزمة العمل (Work Item):' : '2. Work Item:'}
                    </label>
                    <select
                      value={selectedWorkItemId}
                      onChange={(e) => {
                        const newWiId = e.target.value;
                        setSelectedWorkItemId(newWiId);
                        const pActs = activities.filter(a => a.workItemId === newWiId);
                        if (pActs[0]) {
                          handleSelectActivity(pActs[0].id);
                        } else {
                          setSelectedActivityId('');
                        }
                      }}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none"
                    >
                      {availableWorkItems.map(wi => (
                        <option key={wi.id} value={wi.id}>{isRtl ? wi.nameAr : wi.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center justify-between">
                      <span>{isRtl ? '3. النشاط الميداني المعتمد *' : '3. Selected Activity *'}</span>
                      {selectedActivity && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                          {selectedActivity.status}
                        </span>
                      )}
                    </label>
                    <select
                      value={selectedActivityId}
                      onChange={(e) => handleSelectActivity(e.target.value)}
                      className={`w-full text-xs font-bold px-3 py-2 rounded-lg border outline-none ${
                        !selectedActivityId 
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950 text-rose-700' 
                          : 'border-emerald-500 dark:border-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <option value="">{isRtl ? '-- اختر النشاط المطلوب لربط الموارد --' : '-- Select Activity to link resources --'}</option>
                      {availableActivities.map(act => (
                        <option key={act.id} value={act.id}>
                          {isRtl ? act.nameAr : act.nameEn} ({act.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {activityValidationError && (
                  <div className="mt-2 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{activityValidationError}</span>
                  </div>
                )}

                {/* Linked Start Card Selector */}
                <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {isRtl ? 'كارت بدء العمل المرتبط (Start Card):' : 'Linked Start Card:'}
                    </span>
                  </div>
                  <select
                    value={selectedStartCardId}
                    onChange={(e) => setSelectedStartCardId(e.target.value)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none w-full md:w-auto"
                  >
                    <option value="">{isRtl ? '-- بدون كارت مرتبط --' : '-- No Linked Start Card --'}</option>
                    {availableStartCards.map(sc => (
                      <option key={sc.id} value={sc.id}>
                        {sc.cardNumber} ({sc.status}) - {isRtl ? sc.workDescriptionAr : sc.workDescriptionEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Auto-Linked Labor & Equipment Resource Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Labor / Workers Resource Box */}
                <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HardHat className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">
                        {isRtl ? 'العمالة المخصصة للنشاط (Labor Crew)' : 'Assigned Activity Labor'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100">
                      {assignedWorkerIds.length} {isRtl ? 'عمال' : 'Workers'}
                    </span>
                  </div>

                  {assignedWorkerIds.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center italic">
                      {isRtl ? 'لم يتم تخصيص عمالة محددة لهذا النشاط في خطة العمل.' : 'No specific workers assigned to this activity.'}
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {assignedWorkerIds.map(wId => {
                        const workerObj = workers.find(w => w.id === wId);
                        return (
                          <div 
                            key={wId}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {workerObj ? workerObj.fullName : wId}
                              </span>
                              {workerObj?.trade && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                  {workerObj.trade}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleWorker(wId)}
                              className="text-[11px] text-rose-500 hover:underline"
                            >
                              {isRtl ? 'استبعاد' : 'Remove'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add worker dropdown if more workers available */}
                  {workers.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-900/50 flex items-center gap-2">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleToggleWorker(e.target.value);
                        }}
                        className="w-full text-xs px-2 py-1 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-800"
                      >
                        <option value="">{isRtl ? '+ إضافة عامل إضافي للتصريح...' : '+ Add worker to permit...'}</option>
                        {workers.filter(w => !assignedWorkerIds.includes(w.id)).map(w => (
                          <option key={w.id} value={w.id}>
                            {w.fullName} ({w.trade || w.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Equipment / Machinery Resource Box */}
                <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                        {isRtl ? 'المعدات والآليات المخصصة (Equipment & Machinery)' : 'Assigned Machinery & Equipment'}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
                      {assignedEquipmentIds.length} {isRtl ? 'معدات' : 'Units'}
                    </span>
                  </div>

                  {assignedEquipmentIds.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 text-center italic">
                      {isRtl ? 'لا توجد معدات ثقيلة مرتبطة بهذا النشاط تلقائياً.' : 'No heavy machinery linked to this activity.'}
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {assignedEquipmentIds.map(eqId => {
                        const eqObj = equipment.find(e => e.id === eqId);
                        return (
                          <div 
                            key={eqId}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-900 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Truck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {eqObj ? (isRtl ? (eqObj.nameAr || eqObj.name) : (eqObj.nameEn || eqObj.name)) : eqId}
                              </span>
                              {eqObj?.code && (
                                <span className="text-[10px] font-mono text-amber-700 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">
                                  {eqObj.code}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleEquipment(eqId)}
                              className="text-[11px] text-rose-500 hover:underline"
                            >
                              {isRtl ? 'استبعاد' : 'Remove'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add equipment dropdown if more equipment available */}
                  {equipment.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900/50 flex items-center gap-2">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) handleToggleEquipment(e.target.value);
                        }}
                        className="w-full text-xs px-2 py-1 rounded border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-800"
                      >
                        <option value="">{isRtl ? '+ إضافة معدة أو آلية للتصريح...' : '+ Add equipment to permit...'}</option>
                        {equipment.filter(e => !assignedEquipmentIds.includes(e.id)).map(e => (
                          <option key={e.id} value={e.id}>
                            {isRtl ? (e.nameAr || e.name) : (e.nameEn || e.name)} ({e.code || e.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Validity Window */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-300 dark:border-amber-800/60 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                    {isRtl ? 'ساري من تاريخ:' : 'Valid From Date:'}
                  </label>
                  <input
                    type="date"
                    value={validFromDate}
                    onChange={(e) => setValidFromDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                    {isRtl ? 'وقت البدء:' : 'Valid From Time:'}
                  </label>
                  <input
                    type="time"
                    value={validFromTime}
                    onChange={(e) => setValidFromTime(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                    {isRtl ? 'ينتهي في تاريخ:' : 'Valid Until Date:'}
                  </label>
                  <input
                    type="date"
                    value={validUntilDate}
                    onChange={(e) => setValidUntilDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                    {isRtl ? 'وقت الانتهاء:' : 'Valid Until Time:'}
                  </label>
                  <input
                    type="time"
                    value={validUntilTime}
                    onChange={(e) => setValidUntilTime(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Exact Location & Scope */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'المشرف الميداني المسؤول:' : 'Site Supervisor:'}
                  </label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="Eng. Supervisor Name"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'موقع العمل المحدد بدقة *' : 'Exact Work Area *'}
                  </label>
                  <input
                    type="text"
                    value={exactWorkArea}
                    onChange={(e) => setExactWorkArea(e.target.value)}
                    placeholder="Pier F-24 Excavation Trench Footprint..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'الوردية والقوة البشرية:' : 'Shift & Workforce:'}
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={shift}
                      onChange={(e) => setShift(e.target.value as any)}
                      className="w-1/2 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="Morning">{isRtl ? 'صباحي' : 'Morning'}</option>
                      <option value="Evening">{isRtl ? 'مسائي' : 'Evening'}</option>
                      <option value="Night">{isRtl ? 'ليلي' : 'Night'}</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={numberOfWorkers}
                      onChange={(e) => setNumberOfWorkers(Number(e.target.value))}
                      className="w-1/2 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                      placeholder="Workers count"
                    />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isRtl ? 'توصيف العمل المصرح به (Scope of Work):' : 'Authorized Description of Work:'}
                  </label>
                  <textarea
                    rows={2}
                    value={isRtl ? descriptionOfWorkAr : descriptionOfWorkEn}
                    onChange={(e) => isRtl ? setDescriptionOfWorkAr(e.target.value) : setDescriptionOfWorkEn(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'جهة الاتصال بالطوارئ:' : 'Emergency Contact Name:'}
                  </label>
                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'رقم طوارئ الموقع:' : 'Emergency Contact Phone:'}
                  </label>
                  <input
                    type="text"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'نقطة التجمع في الطوارئ:' : 'Emergency Assembly Point:'}
                  </label>
                  <input
                    type="text"
                    value={assemblyPoint}
                    onChange={(e) => setAssemblyPoint(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Hazard Matrix */}
          {activeTab === 'hazards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isRtl ? 'مصفوفة تقييم المخاطر وإجراءات الوقاية المعتمدة' : 'Identified Hazards & Risk Control Measures'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newHz: PTWHazardItem = {
                      id: `hz-${Date.now()}`,
                      hazardEn: 'New Site Hazard',
                      hazardAr: 'خطر ميداني جديد',
                      riskLevel: 'Medium',
                      controlMeasureEn: 'Implement mandatory barricading & PPE',
                      controlMeasureAr: 'تطبيق الحواجز ومهمات الوقاية الإلزامية',
                      responsiblePerson: currentUserName,
                      status: 'Controlled'
                    };
                    setHazards(prev => [...prev, newHz]);
                  }}
                  className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'إضافة خطر' : 'Add Hazard'}</span>
                </button>
              </div>

              <div className="space-y-3">
                {hazards.map((hz, idx) => (
                  <div key={hz.id} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 flex items-center justify-center font-bold text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={isRtl ? hz.hazardAr : hz.hazardEn}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHazards(prev => prev.map(h => h.id === hz.id ? {
                              ...h,
                              hazardAr: isRtl ? val : h.hazardAr,
                              hazardEn: isRtl ? h.hazardEn : val
                            } : h));
                          }}
                          placeholder={isRtl ? 'وصف الخطر المحتمل...' : 'Identified Hazard Description...'}
                          className="text-xs font-bold px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex-1 min-w-0"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <select
                          value={hz.riskLevel}
                          onChange={(e) => {
                            const lvl = e.target.value as RiskLevel;
                            setHazards(prev => prev.map(h => h.id === hz.id ? { ...h, riskLevel: lvl } : h));
                          }}
                          className="text-xs font-bold px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        >
                          <option value="Low">Low Risk</option>
                          <option value="Medium">Medium Risk</option>
                          <option value="High">High Risk</option>
                          <option value="Critical">Critical Risk</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setHazards(prev => prev.filter(h => h.id !== hz.id))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                          {isRtl ? 'إجراء التحكم والوقاية الإلزامي:' : 'Mandatory Control Measure:'}
                        </label>
                        <input
                          type="text"
                          value={isRtl ? hz.controlMeasureAr : hz.controlMeasureEn}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHazards(prev => prev.map(h => h.id === hz.id ? {
                              ...h,
                              controlMeasureAr: isRtl ? val : h.controlMeasureAr,
                              controlMeasureEn: isRtl ? h.controlMeasureEn : val
                            } : h));
                          }}
                          className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                          {isRtl ? 'المسؤول الميداني:' : 'Responsible Person:'}
                        </label>
                        <input
                          type="text"
                          value={hz.responsiblePerson}
                          onChange={(e) => {
                            const val = e.target.value;
                            setHazards(prev => prev.map(h => h.id === hz.id ? { ...h, responsiblePerson: val } : h));
                          }}
                          className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Controls & PPE */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Safety Controls */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{isRtl ? 'اشتراطات وضوابط السلامة الميدانية (Site Safety Controls)' : 'Mandatory Site Safety Controls'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSafetyControls(prev => prev.map(c => ({ ...c, isImplemented: true, verifiedBy: currentUserName })))}
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {isRtl ? 'تفعيل الكل' : 'Verify All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {safetyControls.map(ctrl => (
                    <button
                      key={ctrl.id}
                      type="button"
                      onClick={() => handleToggleControl(ctrl.id)}
                      className={`p-3 rounded-lg border text-start transition-all flex items-start gap-2.5 ${
                        ctrl.isImplemented 
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-800' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="mt-0.5">
                        {ctrl.isImplemented ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 border border-slate-400 rounded-sm shrink-0" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 block">
                          {isRtl ? ctrl.controlAr : ctrl.controlEn}
                        </span>
                        {ctrl.verifiedBy && (
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5 font-mono">
                            Verified by: {ctrl.verifiedBy}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PPE Items */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>{isRtl ? 'مهمات الوقاية الشخصية الإلزامية (PPE Checklist)' : 'Required Personal Protective Equipment'}</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {ppeChecklist.map(ppe => (
                    <button
                      key={ppe.id}
                      type="button"
                      onClick={() => handleTogglePPE(ppe.id)}
                      className={`p-2.5 rounded-lg border text-start transition-all flex items-center justify-between ${
                        ppe.isAvailable 
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-800' 
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {isRtl ? ppe.ppeAr : ppe.ppeEn}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ppe.isAvailable ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {ppe.isAvailable ? (isRtl ? 'متوفر' : 'Available') : (isRtl ? 'غير متوفر' : 'Missing')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Approvals */}
          {activeTab === 'approvals' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  {isRtl ? 'سلسلة إصدار واعتماد تصريح العمل' : 'Permit Issuance & Clearance Chain'}
                </h3>
                {approvals.map((app, idx) => (
                  <div 
                    key={app.id}
                    className={`p-3.5 rounded-lg border transition-all ${
                      app.status === 'Approved' 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                        : idx === currentApprovalIndex
                        ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          app.status === 'Approved' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                        }`}>
                          {app.order}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                            {isRtl ? app.roleNameAr : app.roleNameEn}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {app.assignedUserName || app.approverName || 'Designated Authority'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {app.status}
                        </span>
                        {app.decisionDate && (
                          <span className="text-xs font-mono text-slate-400">{app.decisionDate} {app.decisionTime}</span>
                        )}
                      </div>
                    </div>

                    {app.decisionComments && (
                      <div className="mt-2 text-xs bg-white dark:bg-slate-900/60 p-2 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {app.decisionComments}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Box */}
              {status !== 'Active' && status !== 'Closed' && status !== 'Rejected' && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900 space-y-3">
                  <h4 className="text-xs font-bold text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-rose-600" />
                    <span>{isRtl ? `توقيع واعتماد: (${approvals[currentApprovalIndex]?.roleNameAr || 'الاعتماد'})` : `Sign Step #${currentApprovalIndex + 1}: ${approvals[currentApprovalIndex]?.roleNameEn || ''}`}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {isRtl ? 'اسم المعتمِد:' : 'Signatory Name:'}
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
                        {isRtl ? 'ملاحظات الاعتماد:' : 'Comments:'}
                      </label>
                      <input
                        type="text"
                        value={approvalComment}
                        onChange={(e) => setApprovalComment(e.target.value)}
                        placeholder="Site precautions verified..."
                        className="w-full text-xs px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleApproveStep('Approved')}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors min-h-[40px]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isRtl ? 'اعتماد وإصدار التصريح' : 'Authorize & Grant Permit'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveStep('Rejected')}
                      className="w-full sm:w-auto px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors min-h-[40px]"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{isRtl ? 'رفض التصريح' : 'Reject Permit'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Lifecycle & Closure */}
          {activeTab === 'lifecycle' && (
            <div className="space-y-6">
              {/* Extension Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{isRtl ? 'تمديد صلاحية التصريح (Permit Extension)' : 'Permit Validity Extension'}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {isRtl ? 'ساعات التمديد:' : 'Extension Duration:'}
                    </label>
                    <select
                      value={extensionHours}
                      onChange={(e) => setExtensionHours(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value={2}>+2 Hours</option>
                      <option value={4}>+4 Hours</option>
                      <option value={8}>+8 Hours</option>
                      <option value={12}>+12 Hours</option>
                      <option value={24}>+24 Hours (Next Day)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {isRtl ? 'سبب التمديد:' : 'Extension Justification:'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={extensionReason}
                        onChange={(e) => setExtensionReason(e.target.value)}
                        placeholder="Additional concrete curing / continuous shift required..."
                        className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleApplyExtension}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                      >
                        {isRtl ? 'تطبيق التمديد' : 'Extend'}
                      </button>
                    </div>
                  </div>
                </div>

                {extensions.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {extensions.map(ext => (
                      <div key={ext.id} className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">Extended to: {ext.newExpiry}</span>
                          <span className="text-[11px] text-slate-500 block">Reason: {ext.reason} • By: {ext.requestedBy}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">APPROVED</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Suspension & Resume Section */}
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900/60 space-y-3">
                <h3 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
                  <PauseCircle className="w-4 h-4 text-rose-600" />
                  <span>{isRtl ? 'إيقاف التصريح مؤقتاً (Permit Suspension)' : 'Temporary Suspension'}</span>
                </h3>
                {status === 'Suspended' ? (
                  <div className="p-3 bg-rose-100 dark:bg-rose-900/40 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-bold text-rose-900 dark:text-rose-100 block text-xs">
                        {isRtl ? 'التصريح موقوف حالياً عن العمل!' : 'PERMIT IS CURRENTLY SUSPENDED!'}
                      </span>
                      <span className="text-[11px] text-rose-700 dark:text-rose-300">
                        {suspensions[suspensions.length - 1]?.reason}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResumePermit}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>{isRtl ? 'استئناف العمل' : 'Resume Work'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {isRtl ? 'سبب الإيقاف:' : 'Suspension Category:'}
                      </label>
                      <select
                        value={suspensionCategory}
                        onChange={(e) => setSuspensionCategory(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                      >
                        <option value="Weather">{isRtl ? 'عوامل جوية وطقس' : 'Weather Conditions'}</option>
                        <option value="Safety violation">{isRtl ? 'مخالفة سلامة' : 'Safety Violation'}</option>
                        <option value="Emergency">{isRtl ? 'طوارئ بالموقع' : 'Site Emergency'}</option>
                        <option value="Unsafe work condition">{isRtl ? 'ظروف عمل غير آمنة' : 'Unsafe Conditions'}</option>
                        <option value="Consultant instruction">{isRtl ? 'توجيه الاستشاري' : 'Consultant Hold'}</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {isRtl ? 'تفاصيل الإيقاف:' : 'Details:'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={suspensionReason}
                          onChange={(e) => setSuspensionReason(e.target.value)}
                          placeholder="High wind > 35km/h, scaffold check needed..."
                          className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        <button
                          type="button"
                          onClick={handleSuspendPermit}
                          className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                        >
                          {isRtl ? 'إيقاف مؤقت' : 'Suspend'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Closure Section */}
              <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-300 dark:border-slate-700 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <span>{isRtl ? 'إغلاق التصريح وإنهاء الأعمال (Permit Closure & Handover)' : 'Permit Closure & Site Handover'}</span>
                </h3>
                {status === 'Closed' ? (
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg text-xs text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold block">{isRtl ? 'تم إغلاق التصريح رسمياً وتأكيد خلو الموقع.' : 'Permit officially closed.'}</span>
                    <span className="text-[11px] opacity-80">Closed by: {closure?.closedBy} at {closure?.closedAt?.substring(0, 16)}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {isRtl ? 'يتم إغلاق التصريح بعد اكتمال النشاط، فحص الموقع، إزالة المخلفات والعدد، وتسليم المنطقة آمنة.' : 'Close permit after activity completion, area clean-up, and safety handover.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleClosePermit}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shrink-0"
                    >
                      {isRtl ? 'إغلاق التصريح وتسليم الموقع' : 'Close Permit & Handover'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 6: Document Preview & PDF */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isRtl ? 'معاينة النموذج الرسمي لتصريح العمل للطباعة وحفظ PDF' : 'Official A4 Work Permit Print Preview'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors min-h-[38px] sm:min-h-0"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isRtl ? 'طباعة' : 'Print'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDownloadingPdf}
                    onClick={handleDownloadPDF}
                    className="flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm min-h-[38px] sm:min-h-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloadingPdf ? (isRtl ? 'جاري التحميل...' : 'Downloading...') : (isRtl ? 'تحميل PDF' : 'Download PDF')}</span>
                  </button>
                </div>
              </div>

              {/* Printable Layout */}
              <div 
                className="overflow-x-auto overflow-y-auto bg-slate-200/90 dark:bg-slate-950 p-2 sm:p-4 rounded-xl flex justify-center touch-pan-x touch-pan-y"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <PermitPrintableDoc
                  permit={{
                    id: permit?.id || 'new',
                    permitNumber,
                    startCardId: selectedStartCardId,
                    projectId: selectedProjectId,
                    workItemId: selectedWorkItemId,
                    activityId: selectedActivityId,
                    activityNameEn: activities.find(a => a.id === selectedActivityId)?.nameEn || '',
                    activityNameAr: activities.find(a => a.id === selectedActivityId)?.nameAr || '',
                    assignedWorkerIds,
                    assignedWorkerNames: assignedWorkerIds.map(wId => workers.find(w => w.id === wId)?.fullName || wId),
                    assignedEquipmentIds,
                    assignedEquipmentNames: assignedEquipmentIds.map(eqId => {
                      const f = equipment.find(e => e.id === eqId);
                      return f ? (isRtl ? (f.nameAr || f.name) : (f.nameEn || f.name)) : eqId;
                    }),
                    supervisorName,
                    permitTypeId: selectedPermitTypeId,
                    permitTypeNameEn: permitTypes.find(pt => pt.id === selectedPermitTypeId)?.nameEn || 'General Permit',
                    permitTypeNameAr: permitTypes.find(pt => pt.id === selectedPermitTypeId)?.nameAr || 'تصريح عام',
                    riskLevel,
                    workLocation,
                    exactWorkArea,
                    descriptionOfWorkEn,
                    descriptionOfWorkAr,
                    shift,
                    numberOfWorkers,
                    validFromDate,
                    validFromTime,
                    validUntilDate,
                    validUntilTime,
                    hazards,
                    safetyControls,
                    ppeChecklist,
                    emergencyContactName,
                    emergencyContactPhone,
                    assemblyPoint,
                    attachments,
                    approvals,
                    currentApprovalIndex,
                    extensions,
                    suspensions,
                    closure,
                    status,
                    createdAt: permit?.createdAt || new Date().toISOString(),
                    createdBy: permit?.createdBy || currentUserName
                  }}
                  settings={settings}
                  lang={lang}
                  qrCodeUrl={qrCodeDataUrl}
                />
              </div>
            </div>
          )}

          {/* Tab 7: QR Code */}
          {activeTab === 'qr' && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="p-4 bg-white rounded-2xl shadow-lg border-2 border-rose-900 inline-block">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-52 h-52 object-contain" />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-slate-400">Loading QR...</div>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {permitNumber}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {isRtl ? 'امسح رمز الاستجابة السريعة للتحقق من سريان مفعول التصريح واكتمال اشتراطات السلامة.' : 'Scan live QR code with mobile camera to verify permit validity and active approvals.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            {status === 'Draft' && (
              <button
                type="button"
                onClick={() => setStatus('Submitted')}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{isRtl ? 'تقديم لإصدار التصريح' : 'Submit for Issuance'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSavePermit}
              className="px-5 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ التصريح' : 'Save Permit')}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PermitModal;
