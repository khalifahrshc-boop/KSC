/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Super Admin' | 'Project Manager' | 'Site Supervisor' | 'Warehouse Manager' | 'Viewer';

export interface User {
  id: string;
  name: string;
  role: UserRole;
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
  materialAllocations?: { id: string; quantity: number }[];
  equipmentAllocations?: { id: string; quantity: number }[];
  dependsOnActivityId?: string;
  // Smart planning fields calculated on run
  plannedDailyProduction?: number;
  expectedDurationDays?: number;
  expectedFinishDate?: string;
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
}

export interface SupervisorCheckIn {
  id: string;
  projectId: string;
  supervisorName: string;
  nationalId: string;
  badgeNumber: string;
  jobTitle: string;
  signatureData: string; // Base64 or plain string representation
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
  timestamp: string;
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
  equipmentUsed: string[];
  completionPercentage: number;
  notes: string;
  photos: string[];
  documents: string[];
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
  userRole: UserRole;
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
  timestamp: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  
  // Sections of field work
  checkIn?: SupervisorCheckIn;
  attendanceRecords?: AttendanceRecord[];
  progressUpdates?: ProgressUpdate[];
  safetyRecord?: SafetyRecord;
  delayRecord?: DelayRecord;
  issueReport?: IssueReport;
}


