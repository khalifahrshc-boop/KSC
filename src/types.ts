/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Super Admin' | 'Project Manager' | 'Site Supervisor' | 'Warehouse Manager' | 'Viewer';

export interface User {
  id: string;
  name: string;
  roles: UserRole[];
  email: string;
  badgeNumber: string;
}

export interface Project {
  id: string;
  projectNumber: string;
  nameEn: string;
  nameAr: string;
  clientEn: string;
  clientAr: string;
  locationEn: string;
  locationAr: string;
  startDate: string;
  endDate: string;
  projectManager: string;
  status: 'Ahead' | 'On Track' | 'Delayed';
  budget?: number;
  morningMeetingPlan?: string;
  isCompleted?: boolean;
  completionDate?: string;
}

export interface WorkItem {
  id: string;
  projectId: string;
  itemNumber: string;
  nameEn: string;
  nameAr: string;
  workType: 'Primary' | 'Secondary';
  responsiblePerson: string;
}

export interface Activity {
  id: string;
  workItemId: string;
  nameEn: string;
  nameAr: string;
  totalQuantity: number;
  unit: string;
  descriptionEn: string;
  descriptionAr: string;
  materialIds: string[];
  equipmentIds: string[];
  workerIds: string[];
  supervisorId?: string;
  materialAllocations?: { id: string; quantity: number }[];
  equipmentAllocations?: { id: string; quantity: number }[];
  dependsOnActivityId?: string;
  isCritical?: boolean;
  workZone?: string;   // New pinpoint work zone field (e.g. Zone A)
  role?: string;       // New pinpoint role / purpose field (e.g. Concrete placement)
  location?: string;   // New pinpoint layout location field (e.g. Sector 4, Ground Floor)
  // Smart planning fields calculated on run
  plannedDailyProduction?: number;
  expectedDurationDays?: number;
  expectedFinishDate?: string;
  // Start Card & PTW execution tracking
  actualStartDate?: string;
  actualStartTime?: string;
  startedBy?: string;
  isWorkStarted?: boolean;
  isSuspended?: boolean;
  suspendedReason?: string;
  suspendedBy?: string;
  suspendedAt?: string;
  overrideUsed?: boolean;
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: string;
}

export type StartCardStatus = 
  | 'Planned' 
  | 'Draft' 
  | 'Submitted' 
  | 'Approved' 
  | 'Rejected' 
  | 'Expired' 
  | 'Cancelled';

export type PTWStatus = 
  | 'Draft' 
  | 'Submitted' 
  | 'Approved' 
  | 'Active' 
  | 'Expiring Soon' 
  | 'Expired' 
  | 'Suspended' 
  | 'Closed' 
  | 'Rejected' 
  | 'Cancelled';

export type WorkAuthorizationStatus = 
  | 'Planned'
  | 'Ready for Start Card'
  | 'Start Card Draft'
  | 'Start Card Submitted'
  | 'Start Card Approved'
  | 'PTW Required'
  | 'PTW Draft'
  | 'PTW Submitted'
  | 'PTW Approved'
  | 'Authorized to Start'
  | 'Work Started'
  | 'Suspended'
  | 'Closed';

export type ActivityAuthorizationStatus = WorkAuthorizationStatus;

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface PermitTypeConfig {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  icon?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  defaultRiskLevel: RiskLevel;
  defaultValidityHours: number;
  mandatoryControls: string[]; // Control IDs or Keys
  requiredPPE: string[]; // PPE IDs or Keys
  isSystem?: boolean;
}

export interface StartCardChecklistItem {
  id: string;
  titleEn: string;
  titleAr: string;
  category: 'Drawings' | 'Methods' | 'Resources' | 'Site' | 'Safety' | 'Quality' | 'Prerequisites' | 'Custom';
  status: 'Pass' | 'Fail' | 'NA' | 'Pending';
  notes?: string;
  isMandatory: boolean;
  checkedBy?: string;
  checkedAt?: string;
}

export interface PTWHazardItem {
  id: string;
  hazardEn: string;
  hazardAr: string;
  category?: string;
  riskLevel: RiskLevel;
  controlMeasureEn: string;
  controlMeasureAr: string;
  responsiblePerson: string;
  status: 'Controlled' | 'Action Required' | 'Not Applicable';
}

export interface PTWSafetyControlItem {
  id: string;
  controlEn: string;
  controlAr: string;
  isMandatory: boolean;
  isImplemented: boolean;
  verifiedBy?: string;
  notes?: string;
}

export interface PTWPPEItem {
  id: string;
  ppeEn: string;
  ppeAr: string;
  isRequired: boolean;
  isAvailable: boolean;
}

export interface DocumentAttachment {
  id: string;
  title: string;
  documentType: 
    | 'Approved Drawing' 
    | 'Method Statement' 
    | 'Risk Assessment' 
    | 'JSA' 
    | 'ITP' 
    | 'Inspection Request' 
    | 'Survey Report' 
    | 'Equipment Inspection' 
    | 'Scaffold Inspection' 
    | 'Lifting Plan' 
    | 'Emergency Plan' 
    | 'Photo' 
    | 'Other';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  notes?: string;
}

export interface ApprovalStep {
  id: string;
  order: number;
  roleNameEn: string;
  roleNameAr: string;
  assignedUserId?: string;
  assignedUserName?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Revision Requested';
  decisionDate?: string;
  decisionTime?: string;
  decisionComments?: string;
  signatureType?: 'Typed' | 'Drawn' | 'Uploaded';
  signatureData?: string;
  approverName?: string;
  approverRole?: string;
  approverBadge?: string;
  deviceInfo?: string;
}

export interface PTWExtension {
  id: string;
  previousExpiry: string; // ISO string
  newExpiry: string; // ISO string
  reason: string;
  requestedBy: string;
  approvedBy: string;
  timestamp: string;
  comments?: string;
  status: 'Approved' | 'Pending' | 'Rejected';
}

export interface PTWSuspension {
  id: string;
  reason: string;
  reasonCategory: 'Permit expired' | 'Safety violation' | 'Weather' | 'Emergency' | 'Missing document' | 'Unsafe work condition' | 'Client instruction' | 'Consultant instruction' | 'HSE instruction' | 'Other';
  suspendedBy: string;
  suspendedAt: string;
  comments?: string;
  resumedAt?: string;
  resumedBy?: string;
  resumeApproval?: string;
  resumeComments?: string;
}

export interface PTWClosure {
  id: string;
  closedBy: string;
  closedAt: string;
  comments?: string;
  checks: {
    workCompleted: boolean;
    areaInspected: boolean;
    toolsRemoved: boolean;
    equipmentRemoved: boolean;
    wasteRemoved: boolean;
    barricadesRemoved: boolean;
    areaSafe: boolean;
    temporaryControlsRemoved: boolean;
    handoverCompleted: boolean;
  };
}

export interface StartCard {
  id: string;
  cardNumber: string; // e.g. SC-2026-0001
  revision: number;
  level: 'Group' | 'Activity'; // WorkItem level or single Activity level
  projectId: string;
  workItemId: string; // Activity Group
  activityId?: string; // Optional if group level
  targetActivityIds?: string[]; // If group level, which activities are covered

  // Project Info
  projectNameEn: string;
  projectNameAr: string;
  projectNumber: string;
  clientEn: string;
  clientAr: string;
  consultantEn?: string;
  consultantAr?: string;
  mainContractorEn?: string;
  mainContractorAr?: string;
  subcontractorEn?: string;
  subcontractorAr?: string;
  projectLocationEn: string;
  projectLocationAr: string;
  workAreaZone?: string;
  buildingStructure?: string;
  floorLevel?: string;
  gridReference?: string;
  workPackageCode?: string;

  // Work Info
  workDescriptionEn: string;
  workDescriptionAr: string;
  scopeOfWorkEn?: string;
  scopeOfWorkAr?: string;
  plannedStartDate: string;
  plannedFinishDate: string;
  expectedDurationDays: number;
  workShift: 'Morning' | 'Evening' | 'Night' | '24-Hour Rotating';
  workLocationDetails?: string;
  workCrewLead?: string;
  numberOfWorkers: number;
  requiredEquipmentDetails?: string;
  requiredToolsDetails?: string;
  requiredMaterialsDetails?: string;

  // Key Responsible Personnel
  projectManager?: string;
  constructionManager?: string;
  siteEngineer?: string;
  supervisorForeman?: string;
  hseOfficer?: string;
  qaqcEngineer?: string;
  surveyor?: string;
  permitReceiver?: string;
  permitIssuer?: string;

  // Checklists & Attachments
  checklist: StartCardChecklistItem[];
  attachments: DocumentAttachment[];

  // Approvals workflow
  approvals: ApprovalStep[];
  currentApprovalIndex: number;

  // Status & Timestamps
  status: StartCardStatus;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
  qrCodeUrl?: string;
  notes?: string;
}

export interface WorkPermit {
  id: string;
  permitNumber: string; // e.g. PTW-2026-000125
  startCardId?: string;
  projectId: string;
  workItemId: string;
  activityId: string; // Mandatory existing activity link
  activityNameEn?: string;
  activityNameAr?: string;
  
  // General Info
  permitTypeId: string; // Ref to PermitTypeConfig
  permitTypeNameEn: string;
  permitTypeNameAr: string;
  riskLevel: RiskLevel;
  workLocation: string;
  exactWorkArea: string;
  descriptionOfWorkEn: string;
  descriptionOfWorkAr: string;
  shift: 'Morning' | 'Evening' | 'Night' | 'Full Day';
  numberOfWorkers: number;

  // Linked Labor & Equipment Resources from Activity
  assignedWorkerIds?: string[];
  assignedWorkerNames?: string[];
  assignedEquipmentIds?: string[];
  assignedEquipmentNames?: string[];
  supervisorName?: string;

  // Validity Windows
  validFromDate: string; // YYYY-MM-DD
  validFromTime: string; // HH:mm
  validUntilDate: string; // YYYY-MM-DD
  validUntilTime: string; // HH:mm
  actualStartDate?: string;
  actualStartTime?: string;
  actualEndDate?: string;
  actualEndTime?: string;

  // Hazards Matrix
  hazards: PTWHazardItem[];

  // Safety Controls & PPE
  safetyControls: PTWSafetyControlItem[];
  ppeChecklist: PTWPPEItem[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  assemblyPoint?: string;

  // Attachments
  attachments: DocumentAttachment[];

  // Approvals & Signatures
  approvals: ApprovalStep[];
  currentApprovalIndex: number;

  // Extensions & Lifecycle
  extensions: PTWExtension[];
  suspensions: PTWSuspension[];
  closure?: PTWClosure;

  // Status
  status: PTWStatus;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
  qrCodeUrl?: string;
  notes?: string;
}

export interface PermitAuditLog {
  id: string;
  recordType: 'StartCard' | 'WorkPermit' | 'Authorization' | 'WorkExecution';
  recordId: string;
  recordNumber: string;
  projectId: string;
  userId: string;
  userName: string;
  userRoles: UserRole[];
  action: 
    | 'Created' 
    | 'Edited' 
    | 'Saved'
    | 'Submitted' 
    | 'Approved' 
    | 'Rejected' 
    | 'Revision Requested' 
    | 'Extended' 
    | 'Suspended' 
    | 'Resumed' 
    | 'Closed' 
    | 'Cancelled' 
    | 'Authorized' 
    | 'Override Authorized'
    | 'Override Applied'
    | 'Work Started';
  previousStatus?: string;
  newStatus?: string;
  comments?: string;
  deviceInfo?: string;
  timestamp: string; // ISO string
}

export interface AuthorizationEvaluation {
  activityId: string;
  activityNameEn: string;
  activityNameAr: string;
  workItemId: string;
  workItemNameEn: string;
  workItemNameAr: string;
  projectId: string;
  isAuthorized: boolean;
  status: WorkAuthorizationStatus;
  startCard: StartCard | null;
  activePermit: WorkPermit | null;
  startCardStatus: StartCardStatus | 'None';
  permitStatus: PTWStatus | 'None';
  missingRequirements: {
    en: string;
    ar: string;
    category: 'StartCard' | 'PTW' | 'Checklist' | 'Documents' | 'Safety' | 'Suspension';
  }[];
  isOverridden: boolean;
  overrideDetails?: {
    reason: string;
    by: string;
    at: string;
  };
}

export interface WarehouseMaterial {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  unit: string;
  quantity: number;
  reservedStock: number;
  minThreshold: number;
  projectId?: string;  // Project-specific warehouse association. If undefined/empty, is general/central
}

export interface EquipmentItem {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  totalQuantity: number;
  reservedQuantity: number;
  status: 'Excellent' | 'Under Maintenance' | 'Available';
  locationEn: string;
  locationAr: string;
}

export interface Worker {
  id: string;
  fullName: string;
  nationalId: string;
  badgeNumber: string;
  professionEn: string;
  professionAr: string;
  dailyProductivity: number; // e.g. units/day
  hoursPerDay: number;
  status: 'Active' | 'On Leave' | 'Suspended';
  salary: number;
  allowMultiActivity?: boolean;
}

export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy?: number; // in meters
  altitude?: number | null;
  timestamp?: number;
  capturedAt?: string;
  address?: string;
  isVerified?: boolean;
}

export interface SupervisorCheckIn {
  id: string;
  projectId: string;
  supervisorName: string;
  nationalId: string;
  badgeNumber: string;
  jobTitle: string;
  shiftType?: string; // e.g. "Morning Shift" / "Evening Shift" / "Night Shift" / "Custom Shift"
  shiftStartTime?: string; // e.g. "07:30 AM"
  shiftEndTime?: string; // e.g. "04:30 PM"
  shiftNotes?: string;
  signatureData: string; // Base64 or plain string representation
  gpsLocation?: GpsLocation;
  timestamp: string;
}

export interface AttendanceRecord {
  id: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  workerId: string;
  workerName: string;
  professionAr: string;
  professionEn: string;
  isPresent: boolean;
  status: 'Present' | 'Absent' | 'Late' | 'Sick' | 'AnnualLeave' | 'ShortLeave';
  startTime: string; // e.g., "08:00 AM" or "" if absent
  breakTime: string; // e.g., "12:00 PM"
  endTime: string; // e.g., "05:00 PM"
  shiftTime: string; // e.g., "8 Hours" or "Morning"
  supervisorName: string;
  notes?: string;
  gpsLocation?: GpsLocation;
  timestamp: string;
}

export interface MaterialConsumption {
  materialId: string;
  materialNameEn: string;
  materialNameAr: string;
  quantityUsed: number;
  unit: string;
}

export interface MaterialDelivery {
  id: string;
  materialId: string;
  materialNameEn: string;
  materialNameAr: string;
  quantityDelivered: number;
  unit: string;
  timestamp: string;
  activityId: string;
}

export interface ProgressUpdate {
  id: string;
  projectId: string;
  workItemId: string;
  activityId: string;
  reporterName?: string; // New field to track who submitted
  time: string; // e.g. "10:00 AM" or full ISO
  completedQuantity: number;
  numberOfWorkers: number;
  workerNames?: string[];
  equipmentUsed: string[];
  materialConsumptions?: MaterialConsumption[]; // Added tracking for materials
  completionPercentage: number;
  notes: string;
  photos: string[];
  documents: string[];
  gpsLocation?: GpsLocation;
  timestamp: string;
}

export interface SafetyRecord {
  id: string;
  projectId: string;
  isSafe: boolean;
  violationsCount: number;
  notes: string;
  correctiveActions: string;
  timestamp: string;
}

export interface DelayRecord {
  id: string;
  projectId: string;
  workItemId?: string;
  activityId?: string;
  reasonEn: string;
  reasonAr: string;
  delayType: 'Material Shortage' | 'Equipment Breakdown' | 'Weather' | 'Labor Absenteeism' | 'Design Clarification' | 'Other';
  impactLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  resolutionPlanEn: string;
  resolutionPlanAr: string;
  timestamp: string;
}

export interface IssueReport {
  id: string;
  projectId: string;
  titleEn: string;
  titleAr: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  photos: string[];
  isApproved: boolean;
  timestamp: string;
}

export interface SystemSettings {
  id?: string;
  companyNameEn: string;
  companyNameAr: string;
  companyLogoUrl: string;
  officialStampUrl: string;
  companyPhone: string;
  companyEmail: string;
  officialAddressEn: string;
  officialAddressAr: string;
  commercialRegistration: string;
  taxNumber: string;
  companyWebsite?: string;
  managerNameEn: string;
  managerNameAr: string;
  managerSignature: string;
  reportTemplateType: 'Standard' | 'Executive' | 'Minimalist';
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRoles: UserRole[];
  action: string;
  timestamp: string;
  details: string;
}

export interface SystemNotification {
  id: string;
  titleEn: string;
  titleAr: string;
  messageEn: string;
  messageAr: string;
  type: 'delay' | 'inventory' | 'schedule' | 'progress' | 'info';
  timestamp: string;
  isRead: boolean;
}

export interface SavedKpiReport {
  id: string;
  reportNumber: string;
  reportDate: string;
  projectId: string;
  projectNameEn: string;
  projectNameAr: string;
  targetQuantity: number;
  actualQuantity: number;
  attendanceRate: number;
  presentWorkers: number;
  absentWorkers: number;
  efficiency: string;
  safetyScore: number;
  openIssuesCount: number;
  capacityUtilization: number;
  supervisorNotes: string;
  createdByName?: string;
  timestamp: string;
}

export interface SavedReport {
  id: string;
  reportType: 'attendance' | 'kpi' | 'progress' | 'automated';
  reportNumber: string;
  reportDate: string;
  projectId: string;
  projectNameEn: string;
  projectNameAr: string;
  createdByName?: string;
  timestamp: string;
  supervisorNotes?: string;
  data: {
    attendanceRate?: number;
    presentWorkers?: number;
    absentWorkers?: number;
    workersDetails?: Array<{ workerId: string; name: string; status: 'present' | 'absent'; role?: string }>;
    
    targetQuantity?: number;
    actualQuantity?: number;
    efficiency?: string;
    safetyScore?: number;
    openIssuesCount?: number;
    capacityUtilization?: number;

    completedQuantity?: number;
    progressPercentage?: number;
    progressUpdatesCount?: number;
    updatesSummary?: Array<{ itemEn: string; itemAr: string; val: number; unitEn: string; unitAr: string }>;

    criticalAlertsCount?: number;
    logsCount?: number;
    delayCount?: number;
    healthStatus?: 'Excellent' | 'Stable' | 'Critical';
    healthStatusAr?: 'ممتاز' | 'مستقر' | 'حرج';
    systemLogs?: Array<{ action: string; userName: string; timestamp: string }>;
  };
}

export interface FieldWorkSubmission {
  id: string;
  projectId: string;
  date: string;
  supervisorName: string;
  badgeNumber: string;
  nationalId?: string;
  jobTitle?: string;
  signatureData?: string;
  gpsLocation?: GpsLocation;
  timestamp: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  
  // Sections of field work
  checkIn?: SupervisorCheckIn;
  attendanceRecords?: AttendanceRecord[];
  progressUpdates?: ProgressUpdate[];
  materialDeliveries?: MaterialDelivery[];
  safetyRecord?: SafetyRecord;
  delayRecord?: DelayRecord;
  issueReport?: IssueReport;
}

export interface FieldRequest {
  id: string;
  projectId: string;
  activityId?: string;
  supervisorId: string;
  supervisorName: string;
  type: 'Material' | 'Equipment' | 'Manpower';
  resourceId: string; // Material ID, Equipment ID, or Profession string
  resourceNameEn: string;
  resourceNameAr: string;
  quantity: number;
  unit: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Fulfilled';
  priority: 'Normal' | 'Urgent' | 'Emergency';
  notes?: string;
  timestamp: string;
}

export interface QuickNote {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string; // ISO String
  date: string; // YYYY-MM-DD
}

export interface MorningMeetingPlan {
  id: string;
  projectId: string;
  titleAr: string;
  titleEn: string;
  date: string; // YYYY-MM-DD
  content: string;
  isArchived: boolean;
  createdAt: string; // ISO String or similar
}




