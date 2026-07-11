/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { runWithOklchSanitizer } from '../utils/pdfSanitizer';
import { dbApi } from '../lib/api';
import { 
  Project, 
  WorkItem, 
  Activity, 
  SystemSettings, 
  UserRole,
  ProgressUpdate,
  Worker,
  EquipmentItem,
  WarehouseMaterial,
  AttendanceRecord
} from '../types';
import { getProjectProgress, getProjectPlannedProgress } from '../utils/progressCalculations';
import AttendanceReportGenerator from './AttendanceReportGenerator';
import { 
  Printer, 
  Download, 
  Archive, 
  Building2, 
  SlidersHorizontal,
  Bookmark,
  TrendingDown,
  Sun,
  CloudSun,
  User,
  Settings,
  Plus,
  Trash2,
  FileText,
  AlertTriangle,
  Activity as ActivityIcon,
  CheckCircle2,
  Users,
  Compass,
  CornerDownRight,
  Gauge,
  Workflow,
  HelpCircle,
  CalendarCheck,
  ShieldCheck,
  Zap,
  Hammer,
  Package,
  Eye,
  Clock,
  CalendarDays,
  Search,
  Save,
  ExternalLink,
  ClipboardList,
  FileSpreadsheet
} from 'lucide-react';
import { exportKpiToExcel } from '../utils/kpiExcelExport';

interface ReportsPanelProps {
  lang: 'ar' | 'en';
  t: any;
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  workers: Worker[];
  equipment: EquipmentItem[];
  materials: WarehouseMaterial[];
  progressUpdates: ProgressUpdate[];
  attendanceRecords: AttendanceRecord[];
  settings: SystemSettings;
  userRole: UserRole;
  preselectedReport?: { 
    category: 'daily' | 'equipment' | 'labor' | 'inventory'; 
    id: string | string[];
    action?: 'print' | 'pdf';
  } | null;
  onClearPreselected?: () => void;
  onReturn?: (module: string) => void;
}

export default function ReportsPanel({
  lang,
  t,
  projects,
  workItems,
  activities,
  workers,
  equipment,
  materials,
  progressUpdates = [],
  attendanceRecords = [],
  settings,
  userRole,
  preselectedReport,
  onClearPreselected,
  onReturn
}: ReportsPanelProps) {
  const isRtl = lang === 'ar';
  
  // Core Selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [reportBatchOption, setReportBatchOption] = useState<'shiftA' | 'shiftB'>('shiftA');
  const [isArchivedDone, setIsArchivedDone] = useState(false);

  // Active section view
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'inputs' | 'archive'>('dashboard');
  const [selectedReportCategory, setSelectedReportCategory] = useState<'daily' | 'equipment' | 'labor' | 'inventory' | 'attendance_sheet'>('daily');
  const [selectedItemId, setSelectedItemId] = useState<string | string[]>('');
  const [reportOptions, setReportOptions] = useState({
    includeLogo: true,
    includeHeader: true,
    includeStats: true,
    includeSignatures: true,
    includeRemarks: true,
  });

  // Comprehensive saved reports state
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [archiveFilterType, setArchiveFilterType] = useState<string>('all');
  const [selectedArchivedReport, setSelectedArchivedReport] = useState<any | null>(null);

  // New report creation form states (within the archive tab)
  const [newReportType, setNewReportType] = useState<'attendance' | 'kpi' | 'progress' | 'automated'>('kpi');
  const [newReportProjId, setNewReportProjId] = useState<string>('all');
  const [newReportDate, setNewReportDate] = useState<string>('2026-07-01');
  const [newReportNotes, setNewReportNotes] = useState<string>('');
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [bulkPrintingType, setBulkPrintingType] = useState<string | null>(null);

  // Load saved reports
  useEffect(() => {
    const loadSavedReports = async () => {
      try {
        const reports = await dbApi.getAll('savedReports');
        setSavedReports(reports || []);
      } catch (e) {
        console.error("Failed to load saved reports:", e);
      }
    };
    loadSavedReports();
  }, []);

  // Accordion list control
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Handle preselected report navigation with auto-action support
  React.useEffect(() => {
    if (preselectedReport) {
      setSelectedReportCategory(preselectedReport.category);
      setSelectedItemId(preselectedReport.id);
      setActiveTab('form'); // Switch to preview directly
      
      // If there is an auto-action, trigger it
      if (preselectedReport.action) {
        const triggerAction = async () => {
          // Small delay to ensure state and DOM are ready
          await new Promise(r => setTimeout(r, 2500));
          
          try {
            if (preselectedReport.action === 'pdf' || preselectedReport.action === 'print') {
              // For background actions, we prefer PDF as it's more reliable without switching views
              await handleDownloadPDF();
            }
          } catch (err) {
            console.error("Auto-action failed:", err);
          } finally {
            // Wait a bit after action to ensure cleanup is safe
            await new Promise(r => setTimeout(r, 500));
            onClearPreselected?.();
            // After action, return to previous module if requested
            if (onReturn) {
              onReturn('inventory'); // Defaulting to inventory as it's the primary source
            }
          }
        };
        triggerAction();
      } else {
        onClearPreselected?.();
      }
    }
  }, [preselectedReport, onClearPreselected, onReturn]);

  // Compute selected project metadata
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || projects[0];
  }, [projects, selectedProjectId]);

  const projectActualProgress = useMemo(() => {
    return currentProject ? getProjectProgress(currentProject, workItems, activities, progressUpdates) : 0;
  }, [currentProject, workItems, activities, progressUpdates]);

  const plannedProgress = useMemo(() => {
    return currentProject ? getProjectPlannedProgress(currentProject) : 0;
  }, [currentProject]);

  const progressDiff = useMemo(() => {
    return projectActualProgress - plannedProgress;
  }, [projectActualProgress, plannedProgress]);

  const isAhead = useMemo(() => {
    return progressDiff >= 0;
  }, [progressDiff]);

  const selectedItemIdsArray = useMemo(() => {
    return Array.isArray(selectedItemId) ? selectedItemId : (selectedItemId ? [selectedItemId] : []);
  }, [selectedItemId]);

  const selectedItems = useMemo(() => {
    if (selectedReportCategory === 'equipment') {
      return equipment.filter(e => selectedItemIdsArray.includes(e.id));
    } else if (selectedReportCategory === 'labor') {
      return workers.filter(w => selectedItemIdsArray.includes(w.id));
    } else if (selectedReportCategory === 'inventory') {
      return materials.filter(m => selectedItemIdsArray.includes(m.id));
    } else if (selectedReportCategory === 'attendance_sheet') {
      return workers;
    }
    return [];
  }, [selectedReportCategory, selectedItemIdsArray, equipment, workers, materials]);

  const selectedItem = selectedItems.length > 0 ? selectedItems[0] : null;

  const projectWorkItems = useMemo(() => {
    return workItems.filter(wi => wi.projectId === selectedProjectId);
  }, [workItems, selectedProjectId]);

  const roundNum = (n: number) => Math.round(n);

  // Auto-calculated official report series number
  const [reportNumber, setReportNumber] = useState(`REP-2026-${currentProject?.projectNumber.slice(-3) || '001'}-${reportBatchOption === 'shiftA' ? 'S12-A' : 'S12-B'}`);
  const [reportDate, setReportDate] = useState('2026-06-29');
  const [reportTime, setReportTime] = useState(reportBatchOption === 'shiftA' ? '06:00 AM - 06:00 PM' : '06:00 PM - 06:00 AM');

  // Update defaults when project or shift changes
  React.useEffect(() => {
    const projNum = currentProject?.projectNumber.slice(-3) || '001';
    const suffix = reportBatchOption === 'shiftA' ? 'S12-A' : 'S12-B';
    setReportNumber(`REP-2026-${projNum}-${suffix}`);
    setReportTime(reportBatchOption === 'shiftA' ? '06:00 AM - 06:00 PM' : '06:00 PM - 06:00 AM');
  }, [currentProject, reportBatchOption]);

  // Site Attendance (Workers and Equipment)
  const [presentWorkerIds, setPresentWorkerIds] = useState<string[]>([]);
  const [presentEquipmentIds, setPresentEquipmentIds] = useState<string[]>([]);

  // Automatically initialize attendance from today's activities when currentProject changes
  useEffect(() => {
    if (!currentProject) return;
    const projectWorkItems = workItems.filter(wi => wi.projectId === currentProject.id);
    const relatedActivities = activities.filter(act => projectWorkItems.some(wi => wi.id === act.workItemId));
    
    const wIds = new Set<string>();
    const eIds = new Set<string>();
    
    relatedActivities.forEach(act => {
      if (act.workerIds) act.workerIds.forEach(id => wIds.add(id));
      if (act.equipmentIds) act.equipmentIds.forEach(id => eIds.add(id));
    });
    
    setPresentWorkerIds(Array.from(wIds));
    setPresentEquipmentIds(Array.from(eIds));
  }, [currentProject, workItems, activities]);

  const [activeShiftDay, setActiveShiftDay] = useState<'S' | 'M' | 'T' | 'W' | 'T2' | 'F' | 'S2'>('M');

  // Remarks
  const [remarksEn, setRemarksEn] = useState("Paving started at 7:15 am. First sublot tested showed asphalt content 0.2% above the upper specification limit. Compaction running at about 98% of MAMD. Asphalt layer poured and compacted smoothly across target lanes. Sub Sign Company on project today to remove and reinstall temporary traffic warning signs to guide freeway traffic routes smoothly. All target signs staked and verified by Supervisor Al-Harbi.");
  const [remarksAr, setRemarksAr] = useState("باشرت فرق العمل الفنية أعمال الأسفلت والرصف في تمام الساعة 7:15 صباحاً. أظهر أول فحص عيني ومخبري لعينات الأسفلت جودة ونسبة تماسك متميزة تفوق الحد الأدنى للمواصفات القياسية بـ 0.2٪. عمليات الدمك بالموقع العام مستمرة وبانتظام بنسبة 98٪ مع مطابقة التماسك للمخططات المعتمدة. قامت شركة المقاول الفرعي للعلامات المرورية بالموقع لتركيب وإعادة محاذاة اللوحات والعلامات الإرشادية لضمان سلامة سالكي الطريق السريع.");

  // ----------------- INDUSTRIAL REPLICA STATE CONTROLS -----------------
  const [weather, setWeather] = useState<'clear' | 'fair' | 'cloudy' | 'shower' | 'rain' | 'snow'>('fair');
  const [tempRange, setTempRange] = useState<'to32' | '32to50' | '50to70' | '70to83' | 'over83'>('70to83');
  const [wind, setWind] = useState<'still' | 'low' | 'med' | 'high'>('low');
  const [humidity, setHumidity] = useState<'dry' | 'low' | 'med' | 'high'>('low');

  const [contractNo, setContractNo] = useState('12000');
  const [federalAidNo, setFederalAidNo] = useState('STP-S0000(4)');
  const [highwayName, setHighwayName] = useState(isRtl ? 'طريق الهجرة السريع - القطاع الثالث' : 'MAIN HIGHWAY - THIRD SECTION');

  // Unified report table rows
  const [reportRows, setReportRows] = useState<Array<{
    location: string;
    andOr: string;
    description: string;
    itemNo: string;
    thisDate: string;
    total: string;
  }>>([]);

  const [preparedByName, setPreparedByName] = useState('Yousef Al-Harbi');
  const [supervisorName, setSupervisorName] = useState('Yousef Al-Harbi');
  const [certNo, setCertNo] = useState('49999');
  const [consultantName, setConsultantName] = useState(isRtl ? 'المكتب الاستشاري السعودي الهندسي' : 'SAUDI CONSULTING ENGINEERS');
  const [clientName, setClientName] = useState(isRtl ? 'الهيئة العامة للطرق' : 'GENERAL AUTHORITY FOR ROADS');
  const [consultantRepName, setConsultantRepName] = useState(isRtl ? 'المهندس فيصل السبيعي' : 'Eng. Faisal Al-Subaie');
  const [clientRepName, setClientRepName] = useState(isRtl ? 'المهندس بندر العتيبي' : 'Eng. Bandar Al-Otaibi');
  
  // Added for more field editing
  const [authorityNameAr, setAuthorityNameAr] = useState(isRtl ? 'الهيئة العامة للطرق' : 'GENERAL AUTHORITY FOR ROADS');
  const [authorityNameEn, setAuthorityNameEn] = useState(isRtl ? 'GENERAL AUTHORITY FOR ROADS' : 'GENERAL AUTHORITY FOR ROADS');
  const [addressAr, setAddressAr] = useState(settings.officialAddressAr);
  const [addressEn, setAddressEn] = useState(settings.officialAddressEn);

  // Manual rows
  const [manualRows, setManualRows] = useState<Array<{
    location: string;
    andOr: string;
    description: string;
    itemNo: string;
    thisDate: string;
    total: string;
  }>>([
    {
      location: "36+580 - 37+580",
      andOr: isRtl ? "مؤشرات رصف مرنة مؤقتة" : "Temp. Flexible Pavement Markers",
      description: isRtl ? "تنزيل وضبط علامات الرصف الفليكس" : "Asphalt roadway alignment markers",
      itemNo: "60",
      thisDate: "1,969 ea.",
      total: "1,969 ea."
    }
  ]);

  // Initial population of report rows
  React.useEffect(() => {
    const list: Array<{
      location: string;
      andOr: string;
      description: string;
      itemNo: string;
      thisDate: string;
      total: string;
    }> = [];

    projectWorkItems.forEach(wi => {
      const nested = activities.filter(act => act.workItemId === wi.id);
      nested.forEach(act => {
        const completed = roundNum(act.totalQuantity * 0.25);
        list.push({
          location: isRtl ? currentProject?.locationAr : currentProject?.locationEn,
          andOr: isRtl ? wi.nameAr : wi.nameEn,
          description: isRtl ? act.nameAr : act.nameEn,
          itemNo: wi.itemNumber || "10",
          thisDate: `+${completed} ${act.unit}`,
          total: `${act.totalQuantity} ${act.unit}`
        });
      });
    });

    setReportRows(list);
  }, [projectWorkItems, activities, isRtl, currentProject]);

  const handleUpdateRow = (index: number, field: string, value: string) => {
    const updated = [...reportRows];
    updated[index] = { ...updated[index], [field]: value };
    setReportRows(updated);
  };

  const [newRow, setNewRow] = useState({
    location: "KM 36+000",
    andOr: "",
    description: "",
    itemNo: "100",
    thisDate: "100%",
    total: "100%"
  });

  const handleAddManualRow = () => {
    if (!newRow.andOr || !newRow.description) {
      alert(isRtl ? 'الرجاء كتابة البند والتوصيف لإضافة السطر!' : 'Please fill description and scope fields to append manual row!');
      return;
    }
    setReportRows([...reportRows, { ...newRow }]);
    setNewRow({
      location: "KM 38+500",
      andOr: "",
      description: "",
      itemNo: (parseInt(newRow.itemNo) + 10).toString(),
      thisDate: "100%",
      total: "100%"
    });
  };

  const handleRemoveManualRow = (index: number) => {
    setReportRows(reportRows.filter((_, i) => i !== index));
  };

  // Convert current dynamic activities
  const dynamicActivitiesRows = useMemo(() => {
    const list: Array<{
      location: string;
      andOr: string;
      description: string;
      itemNo: string;
      thisDate: string;
      total: string;
    }> = [];

    projectWorkItems.forEach(wi => {
      const nested = activities.filter(act => act.workItemId === wi.id);
      nested.forEach(act => {
        const completed = roundNum(act.totalQuantity * 0.25);
        list.push({
          location: isRtl ? currentProject?.locationAr : currentProject?.locationEn,
          andOr: isRtl ? wi.nameAr : wi.nameEn,
          description: isRtl ? act.nameAr : act.nameEn,
          itemNo: wi.itemNumber || "10",
          thisDate: `+${completed} ${act.unit}`,
          total: `${act.totalQuantity} ${act.unit}`
        });
      });
    });

    return list;
  }, [projectWorkItems, activities, isRtl, currentProject]);

  const allTableRows = reportRows;

  // Calculations for Decision Hub & Executive Metrics
  const calculatedMetrics = useMemo(() => {
    const totalPersonnelCount = presentWorkerIds.length;
    const totalMachinesCount = presentEquipmentIds.length;
    const primeMachines = presentEquipmentIds.length > 0 ? Math.floor(presentEquipmentIds.length / 2) : 0; // Simple dummy for prime machines

    // Risk scoring based on weather criteria
    let riskScore: 'low' | 'med' | 'high' | 'critical' = 'low';
    let riskValueEn = "OPTIMIZED OPERATIONS";
    let riskValueAr = "عمليات ميدانية محسنة وممتازة";

    if (weather === 'rain' || weather === 'snow' || tempRange === 'to32') {
      riskScore = 'critical';
      riskValueEn = "CRITICAL SITE HALT REQUIRED";
      riskValueAr = "تنبيه حرج للسلامة: إيقاف الأعمال الإنشائية مطلوب فوراً";
    } else if (weather === 'shower' || wind === 'high' || tempRange === 'over83') {
      riskScore = 'high';
      riskValueEn = "SAFETY & COMPACTION RISKS INVOLVED";
      riskValueAr = "مستوى خطورة مرتفع: مراقبة الجودة والسلامة ضرورية";
    } else if (weather === 'cloudy' || wind === 'med' || tempRange === '32to50') {
      riskScore = 'med';
      riskValueEn = "MODERATE METEO IMPACT ALERT";
      riskValueAr = "تأثير جوي متوسط: يتطلب تنسيق إضافي وحذر";
    }

    return {
      totalPersonnelCount,
      totalMachinesCount,
      primeMachines,
      riskScore,
      riskValueEn,
      riskValueAr,
      totalItemsChecked: allTableRows.length
    };
  }, [presentWorkerIds, presentEquipmentIds, weather, tempRange, wind, allTableRows]);



  // Export CSV
  const handleExportExcel = () => {
    if (selectedReportCategory === 'attendance_sheet') {
      const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];
      const recordsToPrint = attendanceRecords.filter(r => r.projectId === selectedProjectId && r.date === reportDate);

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

      // Document Header
      csvContent += `"${compEn} | ${compAr}"\n`;
      csvContent += `"${isRtl ? 'كشف تحضير الموظفين والعمالة اليومية المعتمد' : 'OFFICIAL DAILY EMPLOYEE ATTENDANCE SHEET & TIME LOG'}"\n`;
      csvContent += `"\n`; // Empty line

      // Metadata Section
      csvContent += `"${isRtl ? 'رقم الكشف المرجعي:' : 'Roster Reference No:'}","${`ATT-${reportDate.replace(/-/g, '')}-${currentProject?.projectNumber || '00'}`}"\n`;
      csvContent += `"${isRtl ? 'المشروع الميداني:' : 'Field Project Name:'}","${isRtl ? currentProject?.nameAr : currentProject?.nameEn}"\n`;
      csvContent += `"${isRtl ? 'الموقع الجغرافي:' : 'Project Location:'}","${isRtl ? currentProject?.locationAr : currentProject?.locationEn}"\n`;
      csvContent += `"${isRtl ? 'تاريخ التحضير المعتمد:' : 'Roster Approved Date:'}","${reportDate}"\n`;
      csvContent += `"${isRtl ? 'المشرف المسؤول:' : 'Responsible Supervisor:'}","${preparedByName || 'Project Supervisor'}"\n`;
      csvContent += `"\n`; // Empty line

      // Summary Analytics
      csvContent += `"${isRtl ? 'ملخص إحصائيات الحضور والعمل اليومي' : 'DAILY ATTENDANCE ANALYTICS SUMMARY'}"\n`;
      csvContent += `"${isRtl ? 'إجمالي الموظفين والعمالة:' : 'Total Roster Workforce:'}","${total}"\n`;
      csvContent += `"${isRtl ? 'عدد الحضور الفعلي:' : 'Present Personnel:'}","${present}"\n`;
      csvContent += `"${isRtl ? 'عدد الغياب والمنقطعين:' : 'Absent Personnel:'}","${absent}"\n`;
      csvContent += `"${isRtl ? 'عدد المتأخرين عن العمل:' : 'Late Personnel:'}","${late}"\n`;
      csvContent += `"${isRtl ? 'حالات الإجازات المرضية والاعتيادية:' : 'On Leave/Sick:'}","${leave}"\n`;
      csvContent += `"${isRtl ? 'إجمالي ساعات العمل المنجزة:' : 'Total Production Hours:'}","${hours} h"\n`;
      csvContent += `"${isRtl ? 'إجمالي ساعات العمل الإضافي:' : 'Total Overtime Hours:'}","${overtime} h"\n`;
      csvContent += `"\n`; // Empty line

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
      link.setAttribute('download', `Attendance_Roster_${reportDate}_${currentProject?.projectNumber || '00'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const header = isRtl
      ? 'الموقع,بند رئيسي,النشاط والتوصيف,رقم البند,إنجاز اليوم,الإجمالي التراكمي\n'
      : 'Location,Work Classification,Description of Work,Item No.,Qty This Date,Cumulative Total\n';

    let csvContent = header;
    allTableRows.forEach(row => {
      csvContent += `"${row.location}","${row.andOr}","${row.description}","${row.itemNo}","${row.thisDate}","${row.total}"\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportNumber}_Site_Report_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleArchive = async () => {
    try {
      const reportData = {
        projectId: selectedProjectId,
        reportNumber,
        reportDate,
        reportBatchOption,
        weather,
        tempRange,
        wind,
        humidity,
        contractNo,
        highwayName,
        clientName,
        consultantName,
        consultantRepName,
        clientRepName,
        presentWorkerIds,
        presentEquipmentIds,
        remarksEn,
        remarksAr,
        preparedBy: preparedByName,
        certNo,
        manualRows,
        timestamp: new Date().toISOString()
      };
      
      await dbApi.save('siteReports', reportData);
      setIsArchivedDone(true);
      setTimeout(() => setIsArchivedDone(false), 3000);
    } catch (error) {
      console.error("Archive failed:", error);
      alert(isRtl ? "فشل حفظ التقرير في السحابة" : "Cloud archiving failed");
    }
  };

  const handleCreateAndSaveReport = async () => {
    setIsCreatingReport(true);
    try {
      const targetProj = projects.find(p => p.id === newReportProjId);
      const projNameEn = newReportProjId === 'all' ? 'Enterprise Wide' : (targetProj?.nameEn || '');
      const projNameAr = newReportProjId === 'all' ? 'كافة المشاريع والعمليات' : (targetProj?.nameAr || '');

      const serial = Math.floor(100 + Math.random() * 900);
      const shortType = newReportType.substring(0, 3).toUpperCase();
      const reportNumber = `REP-2026-${shortType}-${serial}`;

      let reportDataPayload: any = {};

      // Filter work items and activities for target project
      const projWorkItems = workItems.filter(wi => newReportProjId === 'all' || wi.projectId === newReportProjId);
      const projActivities = activities.filter(act => projWorkItems.some(wi => wi.id === act.workItemId));
      const projActivityIds = projActivities.map(a => a.id);
      const dateUpdates = progressUpdates.filter(u => {
        const updDate = u.timestamp.split('T')[0];
        return projActivityIds.includes(u.activityId) && (updDate === newReportDate);
      });

      if (newReportType === 'attendance') {
        const totalMatchingWorkers = workers.length || 1;
        // Present workers from the project's selected activities
        const presentWorkerIdsSet = new Set<string>();
        projActivities.forEach(act => {
          if (act.workerIds) {
            act.workerIds.forEach(id => presentWorkerIdsSet.add(id));
          }
        });
        const presentCount = presentWorkerIdsSet.size;
        const absentCount = Math.max(0, totalMatchingWorkers - presentCount);
        const attRate = Math.round((presentCount / totalMatchingWorkers) * 100);

        reportDataPayload = {
          attendanceRate: attRate,
          presentWorkers: presentCount,
          absentWorkers: absentCount,
          workersDetails: workers.map(w => ({
            workerId: w.id,
            name: w.fullName,
            status: presentWorkerIdsSet.has(w.id) ? 'present' : 'absent',
            role: w.professionAr || w.professionEn
          }))
        };
      } else if (newReportType === 'kpi') {
        const totalTarget = projActivities.reduce((acc, act) => acc + (act.plannedDailyProduction || 15), 0) || 100;
        const totalActual = dateUpdates.reduce((acc, u) => acc + (u.completedQuantity || 0), 0);
        const efficiency = totalTarget > 0 ? `${Math.round((totalActual / totalTarget) * 100)}%` : '100%';
        const openIssues = dateUpdates.filter(u => {
          const notesText = (u.notes || '').toLowerCase();
          return notesText.includes('issue') || notesText.includes('delay') || notesText.includes('مشكلة') || notesText.includes('تأخير') || notesText.includes('عطل');
        }).length;
        const safetyScore = Math.max(70, 100 - (openIssues * 10));
        const capacityUtilization = workers.length > 0 ? Math.round((presentWorkerIds.length / workers.length) * 100) : 100;

        reportDataPayload = {
          targetQuantity: totalTarget,
          actualQuantity: totalActual,
          efficiency,
          safetyScore,
          openIssuesCount: openIssues,
          capacityUtilization
        };
      } else if (newReportType === 'progress') {
        const totalTarget = projActivities.reduce((acc, act) => acc + (act.totalQuantity || 100), 0) || 100;
        const completedSum = dateUpdates.reduce((acc, u) => acc + (u.completedQuantity || 0), 0);
        
        // Cumulative actual progress on these activities
        const totalActualAllTime = progressUpdates
          .filter(u => projActivityIds.includes(u.activityId))
          .reduce((acc, u) => acc + (u.completedQuantity || 0), 0);
        const progressPercentage = Math.min(100, Math.round((totalActualAllTime / totalTarget) * 100));

        const updatesSummary = projActivities.map(act => {
          const actUpdates = dateUpdates.filter(upd => upd.activityId === act.id);
          const valSum = actUpdates.reduce((sum, upd) => sum + upd.completedQuantity, 0);
          return {
            itemEn: act.nameEn,
            itemAr: act.nameAr,
            val: valSum,
            unitEn: act.unit,
            unitAr: act.unit === 'm³' ? 'متر مكعب' : act.unit === 'm' ? 'متر طولي' : 'وحدة'
          };
        }).filter(item => item.val > 0);

        reportDataPayload = {
          completedQuantity: completedSum,
          progressPercentage,
          progressUpdatesCount: dateUpdates.length,
          updatesSummary
        };
      } else if (newReportType === 'automated') {
        const criticalAlerts = dateUpdates.filter(u => u.completedQuantity === 0).length;
        const systemLogs = dateUpdates.map(upd => ({
          action: 'PROGRESS_UPDATE_VERIFIED',
          userName: upd.reporterName || 'Automated Clerk',
          timestamp: upd.timestamp.replace('T', ' ').substring(0, 16)
        }));

        if (systemLogs.length === 0) {
          systemLogs.push({
            action: 'HEARTBEAT_HEALTH_OK',
            userName: 'System Automated',
            timestamp: `${newReportDate} 12:00`
          });
        }

        reportDataPayload = {
          criticalAlertsCount: criticalAlerts,
          logsCount: dateUpdates.length || 1,
          delayCount: criticalAlerts,
          healthStatus: criticalAlerts > 0 ? 'Good' : 'Excellent',
          healthStatusAr: criticalAlerts > 0 ? 'جيد' : 'ممتاز',
          systemLogs
        };
      }

      const completeReport = {
        id: `rep-${Date.now()}`,
        reportType: newReportType,
        reportNumber,
        reportDate: newReportDate,
        projectId: newReportProjId,
        projectNameEn: projNameEn,
        projectNameAr: projNameAr,
        createdByName: 'Supervisor / المشرف',
        timestamp: new Date().toISOString(),
        supervisorNotes: newReportNotes || (isRtl ? 'تم الحفظ والتدقيق بنجاح.' : 'Saved and verified successfully.'),
        data: reportDataPayload
      };

      const saved = await dbApi.save('savedReports', completeReport);
      setSavedReports(prev => [saved, ...prev]);

      setNewReportNotes('');
      setShowCreateForm(false);
      alert(isRtl ? "تمت أرشفة التقرير بنجاح!" : "Report archived successfully!");
    } catch (e) {
      console.error("Failed to save report:", e);
      alert(isRtl ? "فشل أرشفة التقرير" : "Failed to archive report");
    } finally {
      setIsCreatingReport(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (confirm(isRtl ? 'هل أنت متأكد من رغبتك في حذف هذا التقرير المؤرشف نهائياً؟' : 'Are you sure you want to permanently delete this archived report?')) {
      try {
        await dbApi.delete('savedReports', id);
        setSavedReports(prev => prev.filter(r => r.id !== id));
      } catch (e) {
        console.error("Failed to delete report:", e);
      }
    }
  };

  const handlePrintAllReports = () => {
    setBulkPrintingType(archiveFilterType);
    document.body.classList.add('printing-archive-active');
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error("Bulk printing error:", err);
      } finally {
        setBulkPrintingType(null);
        document.body.classList.remove('printing-archive-active');
      }
    }, 600);
  };

  // Printing Layout - simplified to use standard window.print()
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    
    // Ensure we are on the form tab to render the content
    const originalTab = activeTab;
    if (activeTab !== 'form') {
      setActiveTab('form');
      // Wait for tab switch and render
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const element = document.getElementById('high-fidelity-printable-form');
    if (!element) {
      console.error("Printable element not found");
      setIsDownloadingPDF(false);
      if (originalTab !== 'form') {
        setActiveTab(originalTab);
      }
      return;
    }

    try {
      // Dynamic import
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin:       [10, 5, 10, 5] as [number, number, number, number],
        filename:     `${reportNumber || 'Official_Report'}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
          logging: false,
          scrollY: 0,
          windowWidth: 1200
        },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(element).save();
      });
    } catch (err) {
      console.error("PDF Download error:", err);
      alert(isRtl ? "حدث خطأ أثناء تحميل ملف PDF" : "An error occurred while downloading the PDF");
    } finally {
      setIsDownloadingPDF(false);
      if (originalTab !== 'form') {
        setActiveTab(originalTab);
      }
    }
  };

  const handlePrintReport = async () => {
    setIsPrinting(true);
    document.body.classList.add('printing-report-active');
    
    // Ensure we are on the form tab to render the content
    const originalTab = activeTab;
    if (activeTab !== 'form') {
      setActiveTab('form');
      // Wait for tab switch and render
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const originalTitle = document.title;
    document.title = reportNumber || 'FieldReport';

    return new Promise<void>((resolve) => {
      const finalizePrint = () => {
        try {
          window.print();
          document.title = originalTitle;
          setIsPrinting(false);
          if (originalTab !== 'form') {
            setActiveTab(originalTab);
          }
          document.body.classList.remove('printing-report-active');
          resolve();
        } catch (err) {
          console.error("Print error:", err);
          document.title = originalTitle;
          setIsPrinting(false);
          document.body.classList.remove('printing-report-active');
          resolve();
        }
      };

      setTimeout(finalizePrint, 800);
    });
  };

  const weatherKeys: Array<{ key: typeof weather; labelEn: string; labelAr: string }> = [
    { key: 'clear', labelEn: 'CLEAR', labelAr: 'صافٍ' },
    { key: 'fair', labelEn: 'FAIR', labelAr: 'مقبول' },
    { key: 'cloudy', labelEn: 'CLOUDY', labelAr: 'غائم' },
    { key: 'shower', labelEn: 'SHOWER', labelAr: 'زخات مطر' },
    { key: 'rain', labelEn: 'RAIN', labelAr: 'مطر غزير' },
    { key: 'snow', labelEn: 'SNOW', labelAr: 'ثلج' }
  ];
            



            

            



            

            

            





  const tempRangeKeys: Array<{ key: typeof tempRange; labelEn: string; labelAr: string }> = [
    { key: 'to32', labelEn: 'TO 32°F', labelAr: 'تحت الصفر' },
    { key: '32to50', labelEn: '32-50°F', labelAr: '٠ - ١٠ مئوية' },
    { key: '50to70', labelEn: '50-70°F', labelAr: '١٠ - ٢١ مئوية' },
    { key: '70to83', labelEn: '70-83°F', labelAr: '٢١ - ٢٨ مئوية' },
    { key: 'over83', labelEn: 'OVER 83°F', labelAr: 'فوق ٢٨ مئوية' }
  ];

  const windKeys: Array<{ key: typeof wind; labelEn: string; labelAr: string }> = [
    { key: 'still', labelEn: 'STILL', labelAr: 'ساكنة' },
    { key: 'low', labelEn: 'LOW', labelAr: 'خفيفة' },
    { key: 'med', labelEn: 'MED', labelAr: 'متوسطة' },
    { key: 'high', labelEn: 'HIGH', labelAr: 'رياح قوية' }
  ];

  const humidityKeys: Array<{ key: typeof humidity; labelEn: string; labelAr: string }> = [
    { key: 'dry', labelEn: 'DRY', labelAr: 'جاف جداً' },
    { key: 'low', labelEn: 'LOW', labelAr: 'رطوبة خفيفة' },
    { key: 'med', labelEn: 'MED', labelAr: 'متوسطة' },
    { key: 'high', labelEn: 'HIGH', labelAr: 'رطوبة عالية' }
  ];

  return (
    <div id="reports-module-root" className="space-y-6">
      
      {/* 🔴 HEADER BAR CONTROLS */}
      <div id="reports-header-card" className="bg-[#040957] text-white p-6 rounded-2xl border border-blue-950 shadow-lg relative overflow-hidden">
        {/* Abstract futuristic grid design line */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-blue-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 relative">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl shrink-0 ring-4 ring-white/5">
              <Building2 className="w-7 h-7 text-[#0080FF]" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <span>{isRtl ? 'بوابة التقارير وتحليلات القرار الميداني' : 'Field Operations Decisional Reporting & Intelligence'}</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono font-black border border-emerald-500/30">
                  {isRtl ? 'رسمي وممتاز' : 'Premium Certified'}
                </span>
              </h3>
              <p className="text-xs text-blue-200 mt-1 max-w-xl">
                {isRtl 
                  ? 'منصة مهندسي رصف البنية التحتية لإعداد ومصادقة التقارير الرسمية وإجراء عمليات المحاكاة للطقس والخطورة فورياً لدعم اتخاذ القرار.'
                  : 'Empowers infrastructure engineers with digital twin simulations, weather hazard assessments, and instant regulatory A4 printing.'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-end">
            <button
              id="btn-export-csv"
              onClick={handleExportExcel}
              className="bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 text-white font-sans font-bold py-2.5 px-4 text-xs rounded-xl flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isRtl ? 'جدول CSV' : 'CSV'}</span>
            </button>
            <button
              id="btn-download-pdf"
              disabled={isDownloadingPDF}
              onClick={handleDownloadPDF}
              className={`${isDownloadingPDF ? 'bg-emerald-600/50' : 'bg-emerald-600 hover:bg-emerald-700'} active:scale-95 text-white py-2.5 px-5 rounded-xl text-xs font-black transition flex items-center gap-2 border border-emerald-500/20 cursor-pointer shadow-lg shadow-emerald-900/20`}
            >
              <Download className={`w-4 h-4 ${isDownloadingPDF ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingPDF ? (isRtl ? 'جاري التحميل...' : 'Downloading...') : (isRtl ? 'تحميل PDF مباشر' : 'Download PDF')}</span>
            </button>
            <button
              id="btn-print-report"
              type="button"
              disabled={isPrinting}
              onClick={handlePrintReport}
              className={`${isPrinting ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#0080FF] hover:bg-blue-600'} hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 text-white py-2.5 px-6 rounded-xl text-xs font-black transition flex items-center gap-2 border border-blue-400/25 cursor-pointer`}
            >
              <Printer className={`w-4.5 h-4.5 ${isPrinting ? 'animate-pulse' : ''}`} />
              <span>{isPrinting ? (isRtl ? 'جاري التحضير...' : 'Preparing...') : (isRtl ? 'طباعة التوجيه المعتمد A4' : 'Print Official Form')}</span>
            </button>
            <button
              id="btn-archive-report"
              onClick={handleArchive}
              className="bg-white/5 hover:bg-white/10 py-2.5 px-4 rounded-xl text-xs font-semibold text-gray-300 transition flex items-center gap-2 border border-white/5 cursor-pointer"
            >
              <Archive className="w-4 h-4 text-cyan-400" />
              {isArchivedDone ? (
                <span className="text-emerald-400 font-extrabold">{isRtl ? 'تمت الأرشفة!' : 'Archived!'}</span>
              ) : (
                <span>{isRtl ? 'أرشفة السيل' : 'Archive'}</span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Selector bar inside header */}
        <div className="flex gap-2 border-t border-white/10 mt-5 pt-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-1.5 px-4 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === 'dashboard' ? 'bg-[#0080FF] text-white' : 'hover:bg-white/5 text-gray-300'}`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>{isRtl ? 'لوحة القيادة وكشف المخاطر (دعم اتخاذ القرار)' : 'Site Intelligence (Decision Hub)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('form')}
            className={`py-1.5 px-4 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === 'form' ? 'bg-[#0080FF] text-white' : 'hover:bg-white/5 text-gray-300'}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isRtl ? 'الورقة التنظيمية الحكومية (A4)' : 'Official Printed Sheet (A4)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('inputs')}
            className={`py-1.5 px-4 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === 'inputs' ? 'bg-[#0080FF] text-white' : 'hover:bg-white/5 text-gray-300'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isRtl ? 'مدخلات الورش مصفوفة العمالة والطقس' : 'Field Customizers'}</span>
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`py-1.5 px-4 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${activeTab === 'archive' ? 'bg-[#0080FF] text-white' : 'hover:bg-white/5 text-gray-300'}`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{isRtl ? 'أرشيف التقارير الشامل' : 'Universal Reports Hub'}</span>
          </button>
        </div>
      </div>

      {/* 🔴 TAB 1: SITE INTELLIGENCE & DECIDION HUB */}
      {activeTab === 'dashboard' && (
        <div id="reports-twin-intelligence" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Analytics Strip */}
          <div className="lg:col-span-2 space-y-6">

            {/* Specialized Reports Hub */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Archive className="w-5 h-5 text-[#0080FF]" />
                <h4 className="font-extrabold text-sm text-[#040957]">
                  {isRtl ? 'بوابة التقارير التخصصية (المعدات، العمالة، المستودع)' : 'Specialized Reports Portal (Equipment, Labor, Inventory)'}
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-100 pb-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 block">
                    {isRtl ? '١. نوع التقرير' : '1. Report Category'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'daily', labelEn: 'Daily', labelAr: 'اليومي', icon: FileText },
                      { id: 'equipment', labelEn: 'Equip.', labelAr: 'المعدات', icon: Hammer },
                      { id: 'labor', labelEn: 'Labor', labelAr: 'العمالة', icon: Users },
                      { id: 'inventory', labelEn: 'Stock', labelAr: 'المستودع', icon: Package },
                      { id: 'attendance_sheet', labelEn: 'Attendance PDF', labelAr: 'كشف الحضور PDF', icon: ClipboardList },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedReportCategory(cat.id as any);
                          setSelectedItemId('');
                        }}
                        className={`py-2 px-3 rounded-xl border text-[10px] font-black transition-all flex items-center gap-2 ${
                          selectedReportCategory === cat.id 
                            ? 'bg-[#040957] text-white border-[#040957]' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#0080FF]'
                        }`}
                      >
                        <cat.icon className="w-3.5 h-3.5" />
                        <span>{isRtl ? cat.labelAr : cat.labelEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 block">
                    {isRtl ? '٢. تحديد العنصر' : '2. Item Selection'}
                  </label>
                  {selectedReportCategory === 'daily' || selectedReportCategory === 'attendance_sheet' ? (
                    <div className="p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center">
                      <p className="text-[10px] text-gray-400 italic">
                        {selectedReportCategory === 'daily' 
                          ? (isRtl ? 'التقرير اليومي يشمل كافة البنود' : 'Includes all daily field data')
                          : (isRtl ? 'كشف الحضور يشمل كافة العمالة' : 'Includes all personnel attendance')}
                      </p>
                    </div>
                  ) : (
                    <select
                      value={typeof selectedItemId === 'string' ? selectedItemId : ''}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-[#0080FF] focus:border-transparent"
                    >
                      <option value="">{isRtl ? '--- اختر ---' : '--- Select ---'}</option>
                      {selectedReportCategory === 'equipment' && equipment.map(item => (
                        <option key={item.id} value={item.id}>{isRtl ? item.nameAr : item.nameEn} ({item.code})</option>
                      ))}
                      {selectedReportCategory === 'labor' && workers.map(item => (
                        <option key={item.id} value={item.id}>{item.fullName}</option>
                      ))}
                      {selectedReportCategory === 'inventory' && materials.map(item => (
                        <option key={item.id} value={item.id}>{isRtl ? item.nameAr : item.nameEn}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 block">
                    {isRtl ? '٣. خيارات الطباعة (تحديد ما يظهر)' : '3. Visual Print Options'}
                  </label>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
                    {[
                      { id: 'includeLogo', labelAr: 'شعار الشركة', labelEn: 'Logo' },
                      { id: 'includeHeader', labelAr: 'الترويسة', labelEn: 'Header' },
                      { id: 'includeStats', labelAr: 'الإحصائيات', labelEn: 'Stats' },
                      { id: 'includeSignatures', labelAr: 'التواقيع', labelEn: 'Signs' },
                      { id: 'includeRemarks', labelAr: 'الملاحظات', labelEn: 'Remarks' },
                    ].map(opt => (
                      <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer group">
                        <input 
                          type="checkbox"
                          checked={(reportOptions as any)[opt.id]}
                          onChange={() => setReportOptions(prev => ({ ...prev, [opt.id]: !(prev as any)[opt.id] }))}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-[#0080FF] focus:ring-[#0080FF]"
                        />
                        <span className="text-[10px] font-bold text-gray-600 group-hover:text-[#0080FF] transition-colors whitespace-nowrap">
                          {isRtl ? opt.labelAr : opt.labelEn}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {(selectedReportCategory === 'attendance_sheet' || (selectedItemId && selectedItems.length > 0)) && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0080FF]" />
                    <span className="text-[10px] font-black text-[#040957]">
                      {isRtl ? 'تم تحديد العنصر للمخرجات النهائية' : 'Component ready for official output'}
                    </span>
                  </div>
                  <button 
                    onClick={() => setActiveTab('form')}
                    className="text-[10px] font-black text-[#0080FF] hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {isRtl ? 'معاينة القالب المطبوع' : 'Review Printed Template'}
                  </button>
                </motion.div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handlePrintReport}
                  disabled={isPrinting}
                  className="bg-[#040957] hover:bg-slate-800 text-white py-2 px-4 rounded-xl text-[10px] font-black transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {isRtl ? 'طباعة مباشرة (A4)' : 'Print Direct (A4)'}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPDF}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl text-[10px] font-black transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isRtl ? 'تصدير PDF احترافي' : 'Export Professional PDF'}
                </button>
              </div>
            </div>
            
            {/* KPI Cards Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-[#040957] rounded-xl shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-extrabold block uppercase tracking-wider">{isRtl ? 'إجمالي الأفراد بالموقع اليوم' : 'Total Personnel Count'}</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-[#040957]">{calculatedMetrics.totalPersonnelCount}</span>
                    <span className="text-xs text-gray-500 font-medium">{isRtl ? 'أفراد وقادة الوردية' : 'site members'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
                  <Hammer className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-extrabold block uppercase tracking-wider">{isRtl ? 'الآلات والمعدات الثقيلة الفعالة' : 'Heavy Deployed Machinery'}</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-gray-800">{calculatedMetrics.totalMachinesCount}</span>
                    <span className="text-xs text-gray-500 font-medium">{isRtl ? 'وحدات فعالة' : 'active units'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                  <ActivityIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-extrabold block uppercase tracking-wider">{isRtl ? 'البنود المنجزة والمدخلة' : 'Work-Items Count'}</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-emerald-600">{calculatedMetrics.totalItemsChecked}</span>
                    <span className="text-xs text-gray-500 font-bold">{isRtl ? 'أشرطة وبنود' : 'records logged'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Risk Advisor & Structural Safety Simulation Module */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h4 className="font-extrabold text-sm text-[#040957]">
                    {isRtl ? 'محاكاة الطقس ومستشار الرصف الذكي (تحليل اتخاذ القرار)' : 'Environmental twin Simulation & Asphalt Heat Advisor'}
                  </h4>
                </div>
                <div className={`text-xs px-3 py-1 rounded-full font-black ${
                  calculatedMetrics.riskScore === 'critical' ? 'bg-red-50 text-red-600 border border-red-200' :
                  calculatedMetrics.riskScore === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-200' :
                  calculatedMetrics.riskScore === 'med' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                  'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>
                  {isRtl ? calculatedMetrics.riskValueAr : calculatedMetrics.riskValueEn}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-xl border border-gray-100">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">{isRtl ? 'الطقس المحدد' : 'Weather Parameter'}</span>
                  <p className="text-xs font-black text-gray-800 uppercase">{weather}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">{isRtl ? 'الحرارة الميدانية' : 'Thermal Scale'}</span>
                  <p className="text-xs font-black text-gray-800 uppercase">{tempRangeKeys.find(t=>t.key===tempRange)?.labelEn || tempRange}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">{isRtl ? 'محصلة سرعة الرياح' : 'Aerodynamic Force'}</span>
                  <p className="text-xs font-black text-gray-800 uppercase">{wind}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">{isRtl ? 'الرطوبة النسبية' : 'Moisture Ratio'}</span>
                  <p className="text-xs font-black text-gray-800 uppercase">{humidity}</p>
                </div>
              </div>



              {/* Real-time calculated Decision Action Box */}
              <div className="bg-[#040957]/5 p-4 rounded-xl border border-[#040957]/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h5 className="text-xs font-black text-[#040957]">
                    {isRtl ? 'رأي مهندس الموقع الاستشاري (القرار المقترح):' : 'Suggested Operational Decision Action (Standard Core Guidance):'}
                  </h5>
                  <p className="text-xs text-blue-900 font-bold leading-normal">
                    {calculatedMetrics.riskScore === 'critical' ? (
                      isRtl ? "⚠️ إيقاف فوري للصب طبقات الأساس، تأجيل التمديدات، وإخلاء الحفر العميقة." : "⚠️ High emergency risk detected. Recommend shifting effort to indoor maintenance, machinery tuneup, or aggregate stockpiles."
                    ) : calculatedMetrics.riskScore === 'high' ? (
                      isRtl ? "⚠️ خفض سرعة العمل المفتوح، مضاعفة تغطية المواد بموقع الصب، وتشغيل مصافي الرياح." : "⚠️ High weather-impact risk. Reduce open spans speeds, deploy auxiliary protective sheets over aggregates, secure light assets."
                    ) : calculatedMetrics.riskScore === 'med' ? (
                      isRtl ? "⚠️ استمر بحذر مع مراقبة درجات الحرارة والرياح دورياً كل ساعة." : "⚠️ Moderate impact. Continue scheduled operations with active real-time monitoring of thermal & moisture loads."
                    ) : (
                      isRtl ? "✅ كافة المؤشرات خضراء ومناسبة لمعدلات الإنتاج والصب الطويل." : "✅ Perfect green ambient window. Highly optimized for long asphalt casts, continuous structural concrete pouring, and high-altitude rigging."
                    )}
                  </p>
                </div>
                <div className="shrink-0">
                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${
                    calculatedMetrics.riskScore === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                    calculatedMetrics.riskScore === 'high' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                    calculatedMetrics.riskScore === 'med' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}>
                    {calculatedMetrics.riskScore.toUpperCase()}
                  </span>
                </div>
              </div>

                {/* Visual bar progress */}
                {(() => {
                  const plannedProgress = currentProject?.plannedProgress || 0;
                  const projectActualProgress = calculatedMetrics.actualProgressPercent;
                  const progressDiff = Number((projectActualProgress - plannedProgress).toFixed(1));
                  const isAhead = progressDiff >= 0;

                  return (
                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-gray-100">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-gray-500">{isRtl ? 'المشروع المستهدف حالياً' : 'Target Selected Project'}</span>
                        <span className="font-black text-[#040957]">{isRtl ? currentProject?.nameAr : currentProject?.nameEn}</span>
                      </div>

                      <div className="space-y-1 pt-1.5">
                        <div className="flex justify-between text-xs font-bold text-gray-600">
                          <span>{isRtl ? 'نسبة الإنجاز المخطط (المنهجي)' : 'Standard Planned Progress'}</span>
                          <span className="font-mono">{plannedProgress}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${plannedProgress}%` }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-gray-700">
                          <span>{isRtl ? 'نسبة الإنجاز الفعلي المحقق (ميداني)' : 'Actual Field Progress Run'}</span>
                          <span className="font-mono text-emerald-600 font-black">{projectActualProgress}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${projectActualProgress}%` }} />
                        </div>
                      </div>

                      <div className={`text-[10px] font-extrabold flex justify-between items-center p-2 rounded-lg border mt-2 ${
                        isAhead 
                          ? 'text-emerald-600 bg-emerald-50/50 border-emerald-100' 
                          : 'text-red-600 bg-red-50/50 border-red-100'
                      }`}>
                        <span>
                          {isAhead 
                            ? `📈 ${isRtl ? `المشروع متقدم بمعدل ${progressDiff}٪ عن المخطط الزمني` : `Site operations running +${progressDiff}% Ahead of targeted schedule.`}` 
                            : `⚠️ ${isRtl ? `المشروع متأخر بمعدل ${Math.abs(progressDiff)}٪ عن المخطط الزمني` : `Site operations running ${progressDiff}% Behind targeted schedule.`}`
                          }
                        </span>
                        <span className={`text-white font-mono px-1.5 py-0.5 rounded text-[8px] ${isAhead ? 'bg-emerald-500' : 'bg-red-500'}`}>
                          {isAhead ? 'Ahead' : 'Delayed'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Equipment Distribution chart simulator */}
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-gray-150 mt-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">{isRtl ? 'توزيع الآلات الثقيلة بالوردية الحالية' : 'Machinery Deployed / Standby Load'}</span>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="border border-gray-150 p-2.5 rounded-xl bg-white">
                      <span className="block text-[8px] text-gray-400 font-extrabold uppercase">{isRtl ? 'المعدات النشطة بالكامل' : 'Prime Active Assets'}</span>
                      <span className="text-xl font-black text-[#040957] block mt-1">{calculatedMetrics.primeMachines}</span>
                      <span className="text-[7.5px] text-emerald-600 font-bold block bg-emerald-50 py-0.5 px-1.5 rounded-full mt-1.5">Direct Work On-Lane</span>
                    </div>

                    <div className="border border-gray-150 p-2.5 rounded-xl bg-white">
                      <span className="block text-[8px] text-gray-400 font-extrabold uppercase">{isRtl ? 'معدات الدعم والمقاول الفرعي' : 'Sub Deployed Assets'}</span>
                      <span className="text-xl font-black text-gray-700 block mt-1">{calculatedMetrics.totalMachinesCount - calculatedMetrics.primeMachines}</span>
                      <span className="text-[7.5px] text-blue-600 font-bold block bg-blue-50 py-0.5 px-1.5 rounded-full mt-1.5">Support & Surveying</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic text-center">
                    {isRtl ? 'يتم تتبع توافر الآلات تلقائياً من مصفوفة الأعداد بالموقع بالصفحة التالية.' : 'Aggregrated machine assets counts is compiled automatically from input matrix sheets.'}
                  </p>
                </div>

              </div>

              {/* Quick Config Sidebar Panel */}
              <div className="space-y-6">
                
                {/* Quick Informational Checklist */}
                <div className="bg-gradient-to-br from-[#040957] to-slate-900 text-white p-5 rounded-2xl border border-blue-950 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#0080FF]" />
                    <h4 className="font-extrabold text-sm">{isRtl ? 'مراجعة الموثوقية والمطابقة' : 'Fidelity & Audit Standards'}</h4>
                  </div>

                  <p className="text-xs text-blue-100 leading-relaxed">
                    {isRtl 
                      ? 'هذا التقرير مهيأ خصيصاً ليطابق النماذج الصلبة لوزارات النقل والوزارات الخدمية. يتم تتبع كافة التعديلات وعكسها بالختم والأعداد والملاحظات.'
                      : 'Meets rigorous statutory standards for highway & structural field documentation. Reflects dynamic audits on stamping.'}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">{isRtl ? 'رقم وثيقة الاعتماد' : 'Ledger Stamp Code'}</span>
                      <span className="font-mono text-emerald-400 font-black">{certNo}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">{isRtl ? 'معد وموقع التقرير' : 'Lead Engineering Clerk'}</span>
                      <span className="font-black truncate max-w-[120px]">{preparedByName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">{isRtl ? 'تاريخ التقرير الفعلي' : 'Certified Date'}</span>
                      <span className="font-mono text-cyan-400 font-black">{reportDate}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleArchive();
                        setActiveTab('form');
                        setTimeout(() => handlePrintReport(), 350);
                      }}
                      className="w-full bg-[#0080FF] hover:bg-blue-600 text-white font-extrabold p-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{isRtl ? 'تأكيد وحفظ وطباعة الآن' : 'Validate & Save & Print Now'}</span>
                    </button>
                  </div>
                </div>

                {/* Weather Quick Simulation knobs */}
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                    <CloudSun className="w-4 h-4 text-[#0080FF]" />
                    <span>{isRtl ? 'لوحة تحكم محاكاة الطقس السريعة' : 'Quick Weather Preset Twins'}</span>
                  </div>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-black">{isRtl ? 'محدد الطقس العام' : 'WEATHER STATE:'}</span>
                      <div className="grid grid-cols-3 gap-1 text-[9px] font-bold">
                        {weatherKeys.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setWeather(item.key)}
                            className={`p-1.5 border text-center rounded transition uppercase cursor-pointer ${weather === item.key ? 'bg-[#040957] border-[#040957] text-white font-black' : 'hover:bg-gray-50 border-gray-200 text-gray-500'}`}
                          >
                            {isRtl ? item.labelAr : item.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-black">{isRtl ? 'درجة حرارة المسار الإنشائي' : 'TEMPERATURE SCALE:'}</span>
                      <div className="grid grid-cols-2 gap-1 text-[9px] font-bold">
                        {tempRangeKeys.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setTempRange(item.key)}
                            className={`p-1.5 border text-center rounded transition uppercase cursor-pointer ${tempRange === item.key ? 'bg-[#040957] border-[#040957] text-white font-black' : 'hover:bg-gray-50 border-gray-200 text-gray-500'}`}
                          >
                            {isRtl ? item.labelAr : item.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-black">{isRtl ? 'رياح الموقع الإجمالية' : 'WIND SPEEDS:'}</span>
                      <div className="grid grid-cols-4 gap-1 text-[9px] font-bold">
                        {windKeys.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setWind(item.key)}
                            className={`p-1.5 border text-center rounded transition uppercase cursor-pointer ${wind === item.key ? 'bg-[#040957] border-[#040957] text-white font-black' : 'hover:bg-gray-50 border-gray-200 text-gray-500'}`}
                          >
                            {isRtl ? item.labelAr : item.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-black">{isRtl ? 'مستوى الرطوبة' : 'HUMIDITY LEVEL:'}</span>
                      <div className="grid grid-cols-4 gap-1 text-[9px] font-bold">
                        {humidityKeys.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setHumidity(item.key)}
                            className={`p-1.5 border text-center rounded transition uppercase cursor-pointer ${humidity === item.key ? 'bg-[#040957] border-[#040957] text-white font-black' : 'hover:bg-gray-50 border-gray-200 text-gray-500'}`}
                          >
                            {isRtl ? item.labelAr : item.labelEn}
                          </button>
                        ))}
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 TAB 2: OFFICIAL PRINTED SHEET (A4) */}
      <div className={`${activeTab === 'form' ? 'block' : 'hidden'} print:block print-parent`}>
        <div id="reports-form-tab" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-150 shadow-xs">
            <div className="space-y-1">
              <h3 className="font-extrabold text-xs text-[#040957] uppercase tracking-wider">
                {isRtl ? 'الورقة التنظيمية الحكومية (A4)' : 'OFFICIAL PRINTED SHEET (A4)'}
              </h3>
              <p className="text-[10px] text-gray-500 font-bold">
                {isRtl ? 'المستوى المرجعي الحكومي للتقرير اليومي المدمج' : 'Industrial General-Purpose Site-Accredited Daily Sheet'}
              </p>
            </div>
            <span className="inline-block bg-[#0080FF] text-white text-[9px] py-1 px-3 rounded-full uppercase tracking-wider font-mono font-black">
              A4 PORTRAIT SPECIFICATIONS
            </span>
          </div>

          <div className="bg-slate-100 p-3 sm:p-6 overflow-x-auto printable-report-area print:bg-white print:p-0 print:overflow-visible">
            
            <div 
              id="high-fidelity-printable-form"
              className={selectedReportCategory === 'attendance_sheet' 
                ? "mx-auto bg-white select-all text-slate-900" 
                : "modern-report-container mx-auto bg-white select-all text-slate-900"}
              style={{
                width: '100%',
                maxWidth: '810px',
                fontFamily: "'Inter', 'Noto Kufi Arabic', system-ui, sans-serif",
                fontSize: '11px'
              }}
            >
              {/* Inject CSS styles directly for screen parity and standalone printing reliability */}
              <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap');
                .modern-report-container {
                  width: 100%;
                  max-width: 800px;
                  margin: 0 auto;
                  background: #ffffff !important;
                  color: #0f172a !important;
                  border: 2px solid #040957 !important;
                  border-radius: 8px !important;
                  padding: 30px !important;
                  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05) !important;
                  line-height: 1.5 !important;
                  position: relative;
                }
                .modern-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 15px;
                  border: 1px solid #e2e8f0;
                  border-radius: 8px;
                  overflow: hidden;
                  table-layout: fixed;
                }
                .modern-table th {
                  background: #040957 !important;
                  color: #ffffff !important;
                  font-size: 9px !important;
                  font-weight: 800 !important;
                  padding: 10px !important;
                  text-align: left !important;
                  text-transform: uppercase !important;
                }
                .modern-table td {
                  padding: 10px !important;
                  font-size: 9.5px !important;
                  border: 1px solid #e2e8f0 !important;
                  color: #334155 !important;
                  word-wrap: break-word;
                  overflow-wrap: break-word;
                }
                .num-font {
                  font-family: 'JetBrains Mono', monospace !important;
                  font-variant-numeric: tabular-nums;
                }
                .signature-cursive {
                  font-family: 'Brush Script MT', cursive !important;
                  font-size: 16px !important;
                  color: #1d4ed8 !important;
                  height: 30px;
                }
                .signature-line {
                  border-bottom: 1px solid #cbd5e1;
                  margin: 5px 0;
                }
                .signature-label {
                  font-size: 8px !important;
                  font-weight: 900 !important;
                  color: #64748b !important;
                  text-transform: uppercase !important;
                }
                [dir="rtl"] .modern-table th { text-align: right !important; }

                @media print {
                  body.printing-report-active { visibility: hidden !important; background: white !important; }
                  body.printing-report-active #reports-module-root, body.printing-report-active #reports-header-card, body.printing-report-active .tab-buttons, body.printing-report-active .inputs-area, body.printing-report-active #reports-input-managers, body.printing-report-active #reports-twin-intelligence { display: none !important; }
                  body.printing-report-active .print-parent, body.printing-report-active .printable-report-area { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; margin: 0 !important; }
                  body.printing-report-active #high-fidelity-printable-form { visibility: visible !important; border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
                }
              ` }} />
              
              {selectedReportCategory === 'attendance_sheet' ? (
                <AttendanceReportGenerator 
                  lang={lang}
                  settings={settings}
                  project={currentProject}
                  reportDate={reportDate}
                  attendanceRecords={attendanceRecords.filter(r => r.projectId === selectedProjectId && r.date === reportDate)}
                  workers={workers}
                  reportNumber={reportNumber.replace('REP', 'ATT')}
                  supervisorName={supervisorName || preparedByName}
                  preparedBy={preparedByName}
                />
              ) : (
                <div className="p-4 sm:p-10 space-y-6" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
                  {/* 1. CORPORATE HEADER */}
              {reportOptions.includeHeader && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #040957', paddingBottom: '15px', marginBottom: '20px' }} dir={isRtl ? 'rtl' : 'ltr'}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {reportOptions.includeLogo && (
                      settings.companyLogoUrl && (settings.companyLogoUrl.startsWith('data:') || settings.companyLogoUrl.startsWith('http')) ? (
                        <img src={settings.companyLogoUrl} alt="Logo" style={{ width: '65px', height: '65px', objectFit: 'contain' }} referrerPolicy="no-referrer" />
                      ) : (
                        <div style={{ width: '65px', height: '65px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '32px' }}>
                          {settings.companyLogoUrl || '🏢'}
                        </div>
                      )
                    )}
                    <div>
                      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#040957', letterSpacing: '-0.5px' }}>{isRtl ? settings.companyNameAr : settings.companyNameEn}</h2>
                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                        <div>{isRtl ? addressAr : addressEn}</div>
                        <div>{settings.companyPhone} | {settings.companyEmail}</div>
                        {settings.companyWebsite && <div>{settings.companyWebsite}</div>}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '1px' }}>
                          {settings.commercialRegistration && <span>{isRtl ? 'س.ت:' : 'C.R:'} {settings.commercialRegistration}</span>}
                          {settings.taxNumber && <span>{isRtl ? 'الرقم الضريبي:' : 'VAT:'} {settings.taxNumber}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#040957', textTransform: 'uppercase' }}>
                      {selectedReportCategory === 'daily' ? (isRtl ? 'تقرير الإنجاز اليومي' : 'Daily Progress Report') :
                       selectedReportCategory === 'equipment' ? (isRtl ? 'تقرير بيانات المعدة' : 'Equipment Details Report') :
                       selectedReportCategory === 'labor' ? (isRtl ? 'تقرير بيانات الموظف' : 'Personnel Details Report') :
                       (isRtl ? 'تقرير مراقبة المخزون' : 'Inventory Control Report')}
                    </h1>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>{isRtl ? authorityNameAr : authorityNameEn}</div>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#0080FF', marginTop: '2px' }}>REF: {selectedReportCategory === 'daily' ? reportNumber : `SR-${selectedReportCategory.toUpperCase()}-${Array.isArray(selectedItemId) ? 'BATCH' : selectedItemId.slice(-4)}`}</div>
                  </div>
                </div>
              )}

              {/* 2. REPORT CONTENT BASED ON CATEGORY */}
              {selectedReportCategory === 'daily' ? (
                <>
                  {/* PROJECT & CONTRACT DATA */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }} dir={isRtl ? 'rtl' : 'ltr'}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                      <div style={{ fontSize: '8px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>{isRtl ? 'تفاصيل المشروع والتعاقد' : 'Project & Contract Details'}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: isRtl ? '1fr 100px' : '100px 1fr', gap: '4px', fontSize: '10px' }}>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{isRtl ? 'اسم المشروع:' : 'Project:'}</span>
                        <span style={{ fontWeight: 800 }}>{isRtl ? currentProject?.nameAr : currentProject?.nameEn}</span>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{isRtl ? 'رقم العقد:' : 'Contract No:'}</span>
                        <span style={{ fontWeight: 800 }}>{contractNo || 'N/A'}</span>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{isRtl ? 'المسار/الطريق:' : 'Route/Section:'}</span>
                        <span style={{ fontWeight: 800 }}>{highwayName || 'N/A'}</span>
                      </div>
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
                      <div style={{ fontSize: '8px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px' }}>{isRtl ? 'الأطراف المعتمدة والتواريخ' : 'Official Parties & Schedule'}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: isRtl ? '1fr 100px' : '100px 1fr', gap: '4px', fontSize: '10px' }}>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{isRtl ? 'الجهة المالكة:' : 'Client:'}</span>
                        <span style={{ fontWeight: 800 }}>{clientName || 'N/A'}</span>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{isRtl ? 'الاستشاري:' : 'Consultant:'}</span>
                        <span style={{ fontWeight: 800 }}>{consultantName || 'N/A'}</span>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{isRtl ? 'تاريخ التقرير:' : 'Date:'}</span>
                        <span style={{ fontWeight: 800, color: '#1d4ed8' }}>{reportDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* ENVIRONMENTAL SUMMARY */}
                  {reportOptions.includeStats && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }} dir={isRtl ? 'rtl' : 'ltr'}>
                      {[
                        { label: isRtl ? 'الطقس' : 'Weather', value: isRtl ? (weatherKeys.find(w => w.key === weather)?.labelAr || 'صافٍ') : (weatherKeys.find(w => w.key === weather)?.labelEn || 'Sunny') },
                        { label: isRtl ? 'الحرارة' : 'Temp', value: isRtl ? (tempRangeKeys.find(t => t.key === tempRange)?.labelAr || 'معتدل') : (tempRangeKeys.find(t => t.key === tempRange)?.labelEn || 'Mild') },
                        { label: isRtl ? 'العمالة' : 'Personnel', value: `${calculatedMetrics.totalPersonnelCount} ${isRtl ? 'فرد' : 'Staff'}` },
                        { label: isRtl ? 'المعدات' : 'Equipment', value: `${calculatedMetrics.totalMachinesCount} ${isRtl ? 'آلية' : 'Units'}` }
                      ].map((item, idx) => (
                        <div key={idx} style={{ textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                          <div style={{ fontSize: '7px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</div>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#040957', marginTop: '2px' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ACTIVITY LOG TABLE */}
                  <div style={{ marginBottom: '20px' }} dir={isRtl ? 'rtl' : 'ltr'}>
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th style={{ width: '15%' }}>{isRtl ? 'الموقع' : 'STATION'}</th>
                          <th style={{ width: '18%' }}>{isRtl ? 'النشاط' : 'ACTIVITY'}</th>
                          <th>{isRtl ? 'بيان الأعمال المنفذة بالتفصيل' : 'WORK DESCRIPTION'}</th>
                          <th style={{ width: '10%', textAlign: 'center' }}>{isRtl ? 'البند' : 'ITEM'}</th>
                          <th style={{ width: '12%', textAlign: 'center' }}>{isRtl ? 'الكمية' : 'QTY'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allTableRows.map((row, index) => (
                          <tr key={index}>
                            <td style={{ fontWeight: 800, fontSize: '9px' }}>{row.location}</td>
                            <td style={{ fontWeight: 700, fontSize: '8px', color: '#040957' }}>{row.andOr}</td>
                            <td style={{ fontSize: '9.5px' }}>{row.description}</td>
                            <td style={{ textAlign: 'center', fontSize: '9px' }} className="num-font">{row.itemNo}</td>
                            <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '10px', color: '#0080FF' }} className="num-font">{row.thisDate}</td>
                          </tr>
                        ))}
                        {allTableRows.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontStyle: 'italic' }}>
                              {isRtl ? 'لا توجد أعمال مسجلة.' : 'No field activities logged.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* PERSONNEL & EQUIPMENT SUMMARY */}
                  <div style={{ marginBottom: '20px' }} dir={isRtl ? 'rtl' : 'ltr'}>
                    <div style={{ fontSize: '10px', fontWeight: 900, color: '#040957', textTransform: 'uppercase', marginBottom: '8px' }}>
                      {isRtl ? 'حصر الأيدي العاملة والمعدات الفعلي' : 'Actual Site Personnel & Equipment Summary'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      
                      {/* Workers Table */}
                      <table className="modern-table">
                        <thead>
                          <tr>
                            <th style={{ width: '70%' }}>{isRtl ? 'المهنة / التصنيف' : 'ROLE / CLASSIFICATION'}</th>
                            <th style={{ width: '30%', textAlign: 'center' }}>{isRtl ? 'العدد' : 'COUNT'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(
                            presentWorkerIds
                              .map(id => workers.find(w => w.id === id))
                              .filter(Boolean)
                              .reduce((acc, w) => {
                                const role = isRtl ? w!.professionAr : w!.professionEn;
                                acc[role] = (acc[role] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                          ).map(([role, count], idx) => (
                            <tr key={idx}>
                              <td style={{ fontSize: '9px', fontWeight: 700 }}>{role}</td>
                              <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '10px', color: '#0080FF' }} className="num-font">{count}</td>
                            </tr>
                          ))}
                          {presentWorkerIds.length === 0 && (
                            <tr>
                              <td colSpan={2} style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                                {isRtl ? 'لم يتم تحديد عمالة.' : 'No personnel selected.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Equipment Table */}
                      <table className="modern-table">
                        <thead>
                          <tr>
                            <th style={{ width: '70%' }}>{isRtl ? 'المعدة / الآلية' : 'EQUIPMENT TYPE'}</th>
                            <th style={{ width: '30%', textAlign: 'center' }}>{isRtl ? 'العدد' : 'COUNT'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(
                            presentEquipmentIds
                              .map(id => equipment.find(e => e.id === id))
                              .filter(Boolean)
                              .reduce((acc, eq) => {
                                const name = isRtl ? eq!.nameAr : eq!.nameEn;
                                acc[name] = (acc[name] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                          ).map(([name, count], idx) => (
                            <tr key={idx}>
                              <td style={{ fontSize: '9px', fontWeight: 700 }}>{name}</td>
                              <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '10px', color: '#0080FF' }} className="num-font">{count}</td>
                            </tr>
                          ))}
                          {presentEquipmentIds.length === 0 && (
                            <tr>
                              <td colSpan={2} style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontStyle: 'italic', fontSize: '9px' }}>
                                {isRtl ? 'لم يتم تحديد معدات.' : 'No equipment selected.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                    </div>
                  </div>

                  {/* REMARKS */}
                  {reportOptions.includeRemarks && (
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px', marginBottom: '30px' }} dir={isRtl ? 'rtl' : 'ltr'}>
                      <div style={{ fontSize: '8px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                        {isRtl ? 'ملاحظات وتوجيهات المشرف' : 'Superintendent Remarks & Instructions'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#1e293b', lineHeight: '1.6' }}>
                        {remarksAr && <div style={{ fontWeight: 700 }}>{remarksAr}</div>}
                        {remarksEn && <div style={{ fontStyle: 'italic', marginTop: '4px' }}>{remarksEn}</div>}
                        {!remarksAr && !remarksEn && <div style={{ color: '#94a3b8' }}>{isRtl ? 'لا توجد ملاحظات.' : 'No additional remarks.'}</div>}
                      </div>
                    </div>
                  )}
                </>
              ) : selectedReportCategory === 'equipment' && selectedItems.length > 0 ? (
                <div dir={isRtl ? 'rtl' : 'ltr'} style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 900, color: '#040957', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {isRtl ? 'قائمة المعدات المحددة للتقرير:' : 'Selected Equipment List for Report:'}
                  </div>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>{isRtl ? 'الكود' : 'CODE'}</th>
                        <th>{isRtl ? 'اسم المعدة' : 'NAME'}</th>
                        <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                        <th>{isRtl ? 'الموقع' : 'LOCATION'}</th>
                        <th style={{ textAlign: 'center' }}>{isRtl ? 'الكمية' : 'TOTAL'}</th>
                        <th style={{ textAlign: 'center' }}>{isRtl ? 'المحجوز' : 'RESERVED'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((selectedItem, itemIdx) => (
                        <tr key={selectedItem.id}>
                          <td style={{ fontWeight: 800 }} className="num-font">{(selectedItem as any).code}</td>
                          <td>{isRtl ? selectedItem.nameAr : (selectedItem as any).nameEn}</td>
                          <td style={{ fontWeight: 800, color: (selectedItem as any).status === 'Excellent' ? 'green' : 'red' }}>{(selectedItem as any).status}</td>
                          <td>{isRtl ? (selectedItem as any).locationAr : (selectedItem as any).locationEn}</td>
                          <td style={{ textAlign: 'center', fontWeight: 800 }} className="num-font">{(selectedItem as any).totalQuantity}</td>
                          <td style={{ textAlign: 'center', fontWeight: 800 }} className="num-font">{(selectedItem as any).reservedQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selectedReportCategory === 'labor' && selectedItems.length > 0 ? (
                <div dir={isRtl ? 'rtl' : 'ltr'} style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 900, color: '#040957', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {isRtl ? 'قائمة الموظفين والعمالة:' : 'Personnel & Labor List:'}
                  </div>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>{isRtl ? 'الرقم الوطني' : 'NATIONAL ID'}</th>
                        <th>{isRtl ? 'الاسم الكامل' : 'FULL NAME'}</th>
                        <th>{isRtl ? 'رقم الشارة' : 'BADGE NO'}</th>
                        <th>{isRtl ? 'المهنة' : 'PROFESSION'}</th>
                        <th>{isRtl ? 'الإنتاجية' : 'PRODUCTIVITY'}</th>
                        <th>{isRtl ? 'الحالة' : 'STATUS'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((selectedItem, itemIdx) => (
                        <tr key={selectedItem.id}>
                          <td style={{ fontWeight: 800 }} className="num-font">{(selectedItem as any).nationalId}</td>
                          <td style={{ fontWeight: 800, color: '#040957' }}>{(selectedItem as any).fullName}</td>
                          <td>{(selectedItem as any).badgeNumber}</td>
                          <td>{isRtl ? (selectedItem as any).professionAr : (selectedItem as any).professionEn}</td>
                          <td style={{ fontSize: '9px' }}>{(selectedItem as any).dailyProductivity} {isRtl ? 'وحدة/يوم' : 'units/day'}</td>
                          <td style={{ fontWeight: 800, color: (selectedItem as any).status === 'Active' ? 'green' : 'orange' }}>{(selectedItem as any).status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : selectedReportCategory === 'inventory' && selectedItems.length > 0 ? (
                <div dir={isRtl ? 'rtl' : 'ltr'} style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 900, color: '#040957', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {isRtl ? 'قائمة المواد والمخزون:' : 'Materials & Inventory List:'}
                  </div>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>{isRtl ? 'الكود' : 'CODE'}</th>
                        <th>{isRtl ? 'اسم المادة' : 'NAME'}</th>
                        <th>{isRtl ? 'الوحدة' : 'UNIT'}</th>
                        <th style={{ textAlign: 'center' }}>{isRtl ? 'المتوفر' : 'AVAILABLE'}</th>
                        <th style={{ textAlign: 'center' }}>{isRtl ? 'المحجوز' : 'RESERVED'}</th>
                        <th style={{ textAlign: 'center' }}>{isRtl ? 'الحد الأدنى' : 'MINIMUM'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItems.map((selectedItem, itemIdx) => (
                        <tr key={selectedItem.id}>
                          <td style={{ fontWeight: 800 }} className="num-font">{(selectedItem as any).code}</td>
                          <td style={{ fontWeight: 800, color: '#040957' }}>{isRtl ? (selectedItem as any).nameAr : (selectedItem as any).nameEn}</td>
                          <td>{(selectedItem as any).unit}</td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: (selectedItem as any).quantity < (selectedItem as any).minThreshold ? 'red' : 'green' }} className="num-font">{(selectedItem as any).quantity}</td>
                          <td style={{ textAlign: 'center', fontWeight: 800 }} className="num-font">{(selectedItem as any).reservedStock}</td>
                          <td style={{ textAlign: 'center', fontWeight: 800 }} className="num-font">{(selectedItem as any).minThreshold}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  {isRtl ? 'الرجاء اختيار عنصر من لوحة القيادة لعرض التقرير' : 'Please select an item from the dashboard to view report'}
                </div>
              )}

              {/* 6. SIGNATURES & STAMP */}
              {reportOptions.includeSignatures && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginTop: '40px', borderTop: '2px solid #040957', paddingTop: '20px' }} dir={isRtl ? 'rtl' : 'ltr'}>
                    <div style={{ textAlign: 'center' }}>
                      <div className="signature-cursive">{preparedByName}</div>
                      <div className="signature-line"></div>
                      <div className="signature-label">{isRtl ? 'إعداد المقاول' : 'Contractor (Prepared)'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="signature-cursive">{consultantRepName}</div>
                      <div className="signature-line"></div>
                      <div className="signature-label">{isRtl ? 'مراجعة الاستشاري' : 'Consultant (Reviewed)'}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div className="signature-cursive">{clientRepName}</div>
                      <div className="signature-line"></div>
                      <div className="signature-label">{isRtl ? 'اعتماد المالك' : 'Client (Approved)'}</div>
                    </div>
                  </div>

                  {/* STAMP OVERLAY */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-60px', marginRight: '40px', pointerEvents: 'none', opacity: 0.85 }}>
                    {settings.officialStampUrl && (settings.officialStampUrl.startsWith('data:') || settings.officialStampUrl.startsWith('http')) ? (
                      <img src={settings.officialStampUrl} alt="Stamp" style={{ width: '100px', height: '100px', objectFit: 'contain', transform: 'rotate(-15deg)' }} referrerPolicy="no-referrer" />
                    ) : (
                      <div style={{ width: '100px', height: '100px', border: '3px double #ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: '12px', fontWeight: 900, transform: 'rotate(-15deg)', textTransform: 'uppercase', textAlign: 'center', padding: '10px' }}>
                        {settings.officialStampUrl || (isRtl ? 'ختم رسمي' : 'OFFICIAL STAMP')}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* FOOTER */}
              <div style={{ textAlign: 'center', marginTop: '40px', fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {isRtl 
                  ? 'هذا المستند تم إنشاؤه آلياً وهو معتمد للأغراض التوثيقية والتعاقدية' 
                  : 'Generated via Centralized Digital Progress Management System - Official Certified Record'}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* 🔴 TAB 3: CUSTOMIZERS & MATRIX INPUTS */}
      {activeTab === 'inputs' && (
        <div id="reports-input-managers" className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="bg-[#040957]/5 p-4 border-b border-gray-150 flex items-center justify-between">
            <h4 className="font-extrabold text-xs text-[#040957] uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0080FF]" />
              <span>{isRtl ? 'بوابة ملء وتحديث الأيدي العاملة والمعدات وتفاصيل التقرير' : 'Regulatory Input Panel & Personnel Allocations'}</span>
            </h4>
            <span className="text-[10px] text-gray-400 font-bold">Live Synced</span>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Project & Contract Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'اسم الهيئة/الجهة المالكة' : 'Authority / Client Name'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={authorityNameAr} onChange={(e)=>setAuthorityNameAr(e.target.value)} className="w-full border border-gray-200 p-2 rounded-xl text-[10px] font-bold" placeholder="Ar" />
                  <input type="text" value={authorityNameEn} onChange={(e)=>setAuthorityNameEn(e.target.value)} className="w-full border border-gray-200 p-2 rounded-xl text-[10px] font-bold" placeholder="En" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'عنوان المراسلات' : 'Official Address'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={addressAr} onChange={(e)=>setAddressAr(e.target.value)} className="w-full border border-gray-200 p-2 rounded-xl text-[10px] font-bold" placeholder="العنوان العربي" />
                  <input type="text" value={addressEn} onChange={(e)=>setAddressEn(e.target.value)} className="w-full border border-gray-200 p-2 rounded-xl text-[10px] font-bold" placeholder="English Address" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'رقم المرجع (Ref)' : 'Reference No.'}</label>
                <input
                  type="text"
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                  className="w-full border border-gray-200 py-2.5 px-3 rounded-xl text-xs bg-white font-mono font-bold text-[#040957] focus:ring-2 focus:ring-[#0080FF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'تاريخ التقرير' : 'Report Date'}</label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full border border-gray-200 py-2.5 px-3 rounded-xl text-xs bg-white font-bold text-gray-700 focus:ring-2 focus:ring-[#0080FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'المشروع المستهدف' : 'Target Project'}</label>
                <select
                  id="input-project-select-main"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full border border-gray-200 py-2.5 px-3 rounded-xl text-xs bg-white font-extrabold text-gray-800 focus:ring-2 focus:ring-[#0080FF] focus:outline-none"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {isRtl ? p.nameAr : p.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'الفترة الزمنية' : 'Time Period'}</label>
                <input
                  type="text"
                  value={reportTime}
                  onChange={(e) => setReportTime(e.target.value)}
                  className="w-full border border-gray-200 py-2.5 px-3 rounded-xl text-xs bg-white font-bold text-gray-700 focus:ring-2 focus:ring-[#0080FF]"
                  placeholder="06:00 AM - 06:00 PM"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'رقم العقد الإنشائي' : 'Contract No.'}</label>
                <input
                  id="input-contract-no-main"
                  type="text"
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                  className="w-full border border-gray-200 py-2.5 px-3 rounded-xl text-xs bg-white font-mono focus:ring-2 focus:ring-[#0080FF]"
                  placeholder="CONTRACT-XXX"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'المسار أو الطريق السريع' : 'Highway / Section'}</label>
                <input
                  id="input-highway-name-main"
                  type="text"
                  value={highwayName}
                  onChange={(e) => setHighwayName(e.target.value)}
                  className="w-full border border-gray-200 py-2.5 px-3 rounded-xl text-xs bg-white font-bold text-gray-700 focus:ring-2 focus:ring-[#0080FF]"
                  placeholder="Main Route / Section A"
                />
              </div>
            </div>

            {/* Official Parties & Authority Sign-off Metadata */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <span className="text-[10px] font-black uppercase text-[#040957] tracking-wider block">{isRtl ? 'بيانات الاعتمادات والممثلين الرسميين' : 'OFFICIAL PROJECT STAKEHOLDERS'}</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">{isRtl ? 'مالك المشروع (العميل)' : 'Project Client'}</label>
                  <input
                    id="input-client-name-stakeholder"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full border border-gray-200 py-2 px-3 rounded-xl text-xs bg-white font-extrabold text-gray-800 focus:ring-2 focus:ring-[#040957]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">{isRtl ? 'المكتب الاستشاري' : 'Consultant'}</label>
                  <input
                    id="input-consultant-name-stakeholder"
                    type="text"
                    value={consultantName}
                    onChange={(e) => setConsultantName(e.target.value)}
                    className="w-full border border-gray-200 py-2 px-3 rounded-xl text-xs bg-white font-extrabold text-gray-800 focus:ring-2 focus:ring-[#040957]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">{isRtl ? 'مهندس المقاول' : 'Contractor Eng'}</label>
                  <input
                    id="input-prepared-by-stakeholder"
                    type="text"
                    value={preparedByName}
                    onChange={(e) => setPreparedByName(e.target.value)}
                    className="w-full border border-gray-200 py-2 px-3 rounded-xl text-xs bg-white font-extrabold text-gray-800 focus:ring-2 focus:ring-[#040957]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">{isRtl ? 'ممثل الاستشاري' : 'Consultant Rep'}</label>
                  <input
                    id="input-consultant-rep-stakeholder"
                    type="text"
                    value={consultantRepName}
                    onChange={(e) => setConsultantRepName(e.target.value)}
                    className="w-full border border-gray-200 py-2 px-3 rounded-xl text-xs bg-white font-extrabold text-gray-800 focus:ring-2 focus:ring-[#040957]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">{isRtl ? 'مدير المشروع (المالك)' : 'Client Manager'}</label>
                  <input
                    id="input-client-rep-stakeholder"
                    type="text"
                    value={clientRepName}
                    onChange={(e) => setClientRepName(e.target.value)}
                    className="w-full border border-gray-200 py-2 px-3 rounded-xl text-xs bg-white font-extrabold text-gray-800 focus:ring-2 focus:ring-[#040957]"
                  />
                </div>
              </div>
            </div>

            {/* Weather Settings Grid */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'الظروف الجوية في الموقع العملي:' : 'Weather Condition Knobs:'}</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest">{isRtl ? 'الطقس الفعلي' : 'Weather'}</span>
                  <select id="select-weather-state" value={weather} onChange={(e) => setWeather(e.target.value as any)} className="w-full border border-gray-200 py-1.5 px-2 bg-white rounded-lg text-xs font-bold text-gray-700">
                    {weatherKeys.map(w => (
                      <option key={w.key} value={w.key}>{isRtl ? w.labelAr : w.labelEn}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest">{isRtl ? 'درجات الحرارة' : 'Temperature'}</span>
                  <select id="select-temp-range" value={tempRange} onChange={(e) => setTempRange(e.target.value as any)} className="w-full border border-gray-200 py-1.5 px-2 bg-white rounded-lg text-xs font-bold text-gray-700">
                    {tempRangeKeys.map(t => (
                      <option key={t.key} value={t.key}>{isRtl ? t.labelAr : t.labelEn}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest">{isRtl ? 'سرعة الرياح' : 'Wind Force'}</span>
                  <select id="select-wind-force" value={wind} onChange={(e) => setWind(e.target.value as any)} className="w-full border border-gray-200 py-1.5 px-2 bg-white rounded-lg text-xs font-bold text-gray-700">
                    {windKeys.map(w => (
                      <option key={w.key} value={w.key}>{isRtl ? w.labelAr : w.labelEn}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest">{isRtl ? 'مستوى الرطوبة' : 'Humidity'}</span>
                  <select id="select-humidity-level" value={humidity} onChange={(e) => setHumidity(e.target.value as any)} className="w-full border border-gray-200 py-1.5 px-2 bg-white rounded-lg text-xs font-bold text-gray-700">
                    {humidityKeys.map(h => (
                      <option key={h.key} value={h.key}>{isRtl ? h.labelAr : h.labelEn}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Site Attendance (Workers & Equipment) */}
            <div className="bg-white p-5 rounded-xl border border-gray-150 space-y-4">
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'اختيار الأيدي العاملة والمعدات (قوائم منسدلة):' : 'Site Attendance (Dropdowns):'}</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Workers Dropdown */}
                <div className="border border-gray-150 p-3 rounded-xl bg-slate-50/50 space-y-3 flex flex-col">
                  <span className="block font-black text-[10px] text-gray-400 uppercase tracking-widest">
                    {isRtl ? 'الأيدي العاملة (تحديد متعدد)' : 'Personnel (Multi-Select)'}
                  </span>
                  <select 
                    multiple 
                    className="w-full border rounded p-2 text-xs h-64 font-medium text-[#040957] bg-white outline-none focus:ring-2 focus:ring-[#040957]/20" 
                    value={presentWorkerIds} 
                    onChange={e => setPresentWorkerIds(Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value))}
                  >
                    {workers.map(w => (
                      <option key={w.id} value={w.id} className="py-1 px-1 border-b border-gray-50 last:border-0">
                        {w.fullName} ({isRtl ? w.professionAr : w.professionEn})
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-gray-400 font-medium italic">
                    {isRtl ? '* اضغط Ctrl (أو Cmd) لتحديد أكثر من شخص.' : '* Hold Ctrl (or Cmd) to select multiple.'}
                  </p>
                </div>

                {/* Equipment Dropdown */}
                <div className="border border-gray-150 p-3 rounded-xl bg-slate-50/50 space-y-3 flex flex-col">
                  <span className="block font-black text-[10px] text-gray-400 uppercase tracking-widest">
                    {isRtl ? 'المعدات والآليات (تحديد متعدد)' : 'Equipment (Multi-Select)'}
                  </span>
                  <select 
                    multiple 
                    className="w-full border rounded p-2 text-xs h-64 font-medium text-[#040957] bg-white outline-none focus:ring-2 focus:ring-[#040957]/20" 
                    value={presentEquipmentIds} 
                    onChange={e => setPresentEquipmentIds(Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value))}
                  >
                    {equipment.map(eq => (
                      <option key={eq.id} value={eq.id} className="py-1 px-1 border-b border-gray-50 last:border-0">
                        {isRtl ? eq.nameAr : eq.nameEn} - {eq.code}
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-gray-400 font-medium italic">
                    {isRtl ? '* اضغط Ctrl (أو Cmd) لتحديد أكثر من معدة.' : '* Hold Ctrl (or Cmd) to select multiple.'}
                  </p>
                </div>

              </div>
            </div>

            {/* Activities Table Editor */}
            <div className="bg-white p-5 rounded-xl border border-gray-150 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'تعديل جدول الأعمال الميدانية (مفتوح بالكامل):' : 'Full Activities Table Editor:'}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const list: Array<{
                        location: string;
                        andOr: string;
                        description: string;
                        itemNo: string;
                        thisDate: string;
                        total: string;
                      }> = [];

                      projectWorkItems.forEach(wi => {
                        const nested = activities.filter(act => act.workItemId === wi.id);
                        nested.forEach(act => {
                          const completed = roundNum(act.totalQuantity * 0.25);
                          list.push({
                            location: isRtl ? currentProject?.locationAr : currentProject?.locationEn,
                            andOr: isRtl ? wi.nameAr : wi.nameEn,
                            description: isRtl ? act.nameAr : act.nameEn,
                            itemNo: wi.itemNumber || "10",
                            thisDate: `+${completed} ${act.unit}`,
                            total: `${act.totalQuantity} ${act.unit}`
                          });
                        });
                      });
                      setReportRows(list);
                    }}
                    className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition"
                  >
                    {isRtl ? 'استيراد البيانات الحالية من النظام' : 'Import Current System Data'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const projNum = currentProject?.projectNumber.slice(-3) || '001';
                      const suffix = reportBatchOption === 'shiftA' ? 'S12-A' : 'S12-B';
                      setReportNumber(`REP-2026-${projNum}-${suffix}`);
                    }}
                    className="text-[10px] font-bold text-gray-400 hover:text-gray-600 hover:underline"
                  >
                    {isRtl ? 'إعادة تعيين رقم المرجع' : 'Reset Ref ID'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      <th className="p-2 border-b border-gray-100">{isRtl ? 'الموقع' : 'Location'}</th>
                      <th className="p-2 border-b border-gray-100">{isRtl ? 'النشاط' : 'Activity'}</th>
                      <th className="p-2 border-b border-gray-100">{isRtl ? 'التوصيف' : 'Description'}</th>
                      <th className="p-2 border-b border-gray-100 w-16">{isRtl ? 'البند' : 'Item'}</th>
                      <th className="p-2 border-b border-gray-100 w-20">{isRtl ? 'اليوم' : 'Today'}</th>
                      <th className="p-2 border-b border-gray-100 w-20">{isRtl ? 'الإجمالي' : 'Total'}</th>
                      <th className="p-2 border-b border-gray-100 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {reportRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-1 border-b border-gray-50"><input type="text" value={row.location} onChange={(e) => handleUpdateRow(idx, 'location', e.target.value)} className="w-full p-1 border-none bg-transparent focus:ring-1 focus:ring-blue-200 rounded" /></td>
                        <td className="p-1 border-b border-gray-50"><input type="text" value={row.andOr} onChange={(e) => handleUpdateRow(idx, 'andOr', e.target.value)} className="w-full p-1 border-none bg-transparent focus:ring-1 focus:ring-blue-200 rounded font-bold" /></td>
                        <td className="p-1 border-b border-gray-50"><input type="text" value={row.description} onChange={(e) => handleUpdateRow(idx, 'description', e.target.value)} className="w-full p-1 border-none bg-transparent focus:ring-1 focus:ring-blue-200 rounded" /></td>
                        <td className="p-1 border-b border-gray-50"><input type="text" value={row.itemNo} onChange={(e) => handleUpdateRow(idx, 'itemNo', e.target.value)} className="w-full p-1 border-none bg-transparent focus:ring-1 focus:ring-blue-200 rounded text-center" /></td>
                        <td className="p-1 border-b border-gray-50"><input type="text" value={row.thisDate} onChange={(e) => handleUpdateRow(idx, 'thisDate', e.target.value)} className="w-full p-1 border-none bg-transparent focus:ring-1 focus:ring-blue-200 rounded text-center font-bold text-blue-600" /></td>
                        <td className="p-1 border-b border-gray-50"><input type="text" value={row.total} onChange={(e) => handleUpdateRow(idx, 'total', e.target.value)} className="w-full p-1 border-none bg-transparent focus:ring-1 focus:ring-blue-200 rounded text-center" /></td>
                        <td className="p-1 border-b border-gray-50 text-center">
                          <button onClick={() => handleRemoveManualRow(idx)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                    {/* Add New Row inline */}
                    <tr className="bg-blue-50/30">
                      <td className="p-1"><input type="text" value={newRow.location} onChange={(e) => setNewRow({...newRow, location: e.target.value})} className="w-full p-1 border-none bg-transparent text-[10px]" placeholder="Loc" /></td>
                      <td className="p-1"><input type="text" value={newRow.andOr} onChange={(e) => setNewRow({...newRow, andOr: e.target.value})} className="w-full p-1 border-none bg-transparent font-bold text-[10px]" placeholder="Activity" /></td>
                      <td className="p-1"><input type="text" value={newRow.description} onChange={(e) => setNewRow({...newRow, description: e.target.value})} className="w-full p-1 border-none bg-transparent text-[10px]" placeholder="Desc" /></td>
                      <td className="p-1"><input type="text" value={newRow.itemNo} onChange={(e) => setNewRow({...newRow, itemNo: e.target.value})} className="w-full p-1 border-none bg-transparent text-center text-[10px]" placeholder="10" /></td>
                      <td className="p-1"><input type="text" value={newRow.thisDate} onChange={(e) => setNewRow({...newRow, thisDate: e.target.value})} className="w-full p-1 border-none bg-transparent text-center font-bold text-[10px]" placeholder="+10" /></td>
                      <td className="p-1"><input type="text" value={newRow.total} onChange={(e) => setNewRow({...newRow, total: e.target.value})} className="w-full p-1 border-none bg-transparent text-center text-[10px]" placeholder="100" /></td>
                      <td className="p-1 text-center">
                        <button onClick={handleAddManualRow} className="bg-blue-600 text-white p-1 rounded-full"><Plus className="w-3 h-3" /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remarks Narrative Box inside customizer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'الملاحظات المعتمدة (باللغة العربية)' : 'Certified Remarks (Arabic)'}</label>
                <textarea
                  id="textarea-remarks-ar"
                  rows={4}
                  value={remarksAr}
                  onChange={(e) => setRemarksAr(e.target.value)}
                  className="w-full border border-gray-200 p-2.5 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#0080FF] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block">{isRtl ? 'الملاحظات المعتمدة (باللغة الإنجليزية)' : 'Certified Remarks (English)'}</label>
                <textarea
                  id="textarea-remarks-en"
                  rows={4}
                  value={remarksEn}
                  onChange={(e) => setRemarksEn(e.target.value)}
                  className="w-full border border-gray-200 p-2.5 rounded-xl text-xs bg-white font-sans text-gray-700 focus:ring-2 focus:ring-[#0080FF] focus:outline-none"
                />
              </div>
            </div>

            {/* Field signatory credentials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="space-y-1">
                <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">{isRtl ? 'المهندس معد وموقع التقرير' : 'Lead Field Inspector / Prepared By:'}</span>
                <input
                  id="input-prepared-by"
                  type="text"
                  value={preparedByName}
                  onChange={(e) => setPreparedByName(e.target.value)}
                  className="w-full border border-gray-200 py-2.5 px-3 bg-white rounded-xl text-xs text-gray-800 font-bold focus:ring-2 focus:ring-[#0080FF]"
                />
              </div>

              <div className="space-y-1">
                <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">{isRtl ? 'رقم ترشيح البطاقة المهنية' : 'Badge Registration / Cert No.'}</span>
                <input
                  id="input-cert-no"
                  type="text"
                  value={certNo}
                  onChange={(e) => setCertNo(e.target.value)}
                  className="w-full border border-gray-200 py-2.5 px-3 bg-white rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#0080FF]"
                />
              </div>

              <div className="space-y-1">
                <span className="block text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">{isRtl ? 'المصادقة بموجب الختم المعرف بالنظام' : 'Official Stamps Approvals:'}</span>
                <div className="bg-[#040957]/5 p-2 rounded-xl text-[10px] leading-relaxed text-blue-900 border border-[#040957]/10 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-bold block">{isRtl ? settings.managerNameAr : settings.managerNameEn}</span>
                    <span className="text-[9px] text-[#0080FF] block font-mono">Sign: {settings.managerSignature}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick action helper button */}
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('form');
                  setTimeout(() => {
                    const el = document.getElementById('high-fidelity-printable-form');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }, 200);
                }}
                className="bg-[#040957] hover:bg-[#0080FF] text-white text-xs font-extrabold py-2.5 px-6 rounded-xl transition cursor-pointer"
              >
                {isRtl ? 'معاينة التقرير ومطابقته' : 'Go to Printed A4 Sheet'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🔴 TAB 4: COMPREHENSIVE REPORTS ARCHIVE */}
      {activeTab === 'archive' && (
        <div className="space-y-6">
          {/* Top Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs text-center space-y-1">
              <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">
                {isRtl ? 'إجمالي التقارير' : 'Total Reports'}
              </span>
              <span className="text-2xl font-black text-[#040957]">
                {savedReports.length}
              </span>
            </div>
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-center space-y-1">
              <span className="text-[10px] text-blue-600 font-bold block uppercase tracking-wider">
                {isRtl ? 'تقارير الحضور' : 'Attendance'}
              </span>
              <span className="text-2xl font-black text-blue-700">
                {savedReports.filter(r => r.reportType === 'attendance').length}
              </span>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-center space-y-1">
              <span className="text-[10px] text-emerald-600 font-bold block uppercase tracking-wider">
                {isRtl ? 'تقارير KPI' : 'KPI Reports'}
              </span>
              <span className="text-2xl font-black text-emerald-700">
                {savedReports.filter(r => r.reportType === 'kpi').length}
              </span>
            </div>
            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 text-center space-y-1">
              <span className="text-[10px] text-purple-600 font-bold block uppercase tracking-wider">
                {isRtl ? 'تقارير التحديث' : 'Progress'}
              </span>
              <span className="text-2xl font-black text-purple-700">
                {savedReports.filter(r => r.reportType === 'progress').length}
              </span>
            </div>
            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 text-center space-y-1">
              <span className="text-[10px] text-amber-600 font-bold block uppercase tracking-wider">
                {isRtl ? 'التقارير المؤتمتة' : 'Automated'}
              </span>
              <span className="text-2xl font-black text-amber-700">
                {savedReports.filter(r => r.reportType === 'automated').length}
              </span>
            </div>
          </div>

          {/* Action and Filter Controls */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-black text-[#040957] flex items-center gap-2">
                  <Archive className="w-5 h-5 text-emerald-600" />
                  {isRtl ? 'إدارة وتصنيف التقارير المؤرشفة' : 'Manage & Filter Archived Reports'}
                </h3>
                <p className="text-xs text-gray-400">
                  {isRtl ? 'استعراض وأرشفة كافة أنواع التقارير الموثقة للمشروع' : 'Review and query all official archived project summaries.'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  {isRtl ? 'أرشفة تقرير جديد' : 'Archive New Report'}
                </button>
                <button
                  onClick={handlePrintAllReports}
                  disabled={savedReports.length === 0}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  {isRtl ? 'طباعة التقارير المصفاة' : 'Print Filtered Batch'}
                </button>
              </div>
            </div>

            {/* Quick Create Report Form Block */}
            {showCreateForm && (
              <div 
                className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-4 text-xs font-bold text-gray-800 transition-all duration-300"
              >
                <h4 className="text-xs uppercase tracking-widest text-[#0080FF] border-b border-gray-200 pb-2">
                  ✨ {isRtl ? 'إنشاء وتوثيق تقرير جديد بالأرشيف' : 'NEW OFFICIAL ARCHIVE RECORD'}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-gray-500 block">{isRtl ? 'تصنيف التقرير:' : 'Report Category:'}</label>
                    <select
                      value={newReportType}
                      onChange={(e) => setNewReportType(e.target.value as any)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-[#0080FF] focus:border-transparent"
                    >
                      <option value="attendance">{isRtl ? 'تقرير الحضور والعمالة' : 'Attendance & Labor'}</option>
                      <option value="kpi">{isRtl ? 'تقرير مؤشرات الأداء (KPI)' : 'Performance KPI Summary'}</option>
                      <option value="progress">{isRtl ? 'تقرير التحديث والإنتاجية' : 'Daily Output Progress'}</option>
                      <option value="automated">{isRtl ? 'التقرير المؤتمت الشامل (تحليل النظام)' : 'Automated System Health'}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 block">{isRtl ? 'نطاق المشروع:' : 'Project Context:'}</label>
                    <select
                      value={newReportProjId}
                      onChange={(e) => setNewReportProjId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-[#0080FF] focus:border-transparent"
                    >
                      <option value="all">{isRtl ? 'كافة المشاريع والعمليات' : 'Enterprise Wide'}</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 block">{isRtl ? 'تاريخ التقرير:' : 'Report Date:'}</label>
                    <input
                      type="date"
                      value={newReportDate}
                      onChange={(e) => setNewReportDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-[#0080FF] focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-500 block">{isRtl ? 'ملاحظات المشرف:' : 'Supervisor Notes:'}</label>
                    <input
                      type="text"
                      value={newReportNotes}
                      onChange={(e) => setNewReportNotes(e.target.value)}
                      placeholder={isRtl ? 'أدخل أي توجيهات أو ملاحظات إضافية...' : 'Type operational or safety remarks...'}
                      className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Live Data Preview Inside Creator Form */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 block uppercase tracking-wider">
                      {isRtl ? '📊 معاينة ذكية للبيانات التي سيتم أرشفتها:' : 'Smart data to be archived based on live feed:'}
                    </span>
                    <span className="text-[11px] text-gray-700 font-medium">
                      {newReportType === 'attendance' && (isRtl ? 'سيتم جلب نسبة الحضور، عدد العمال المتواجدين والغائبين، وقائمة بأسماء المشرفين.' : 'Will snapshot attendance percentage, presence logs, and workforce roster.')}
                      {newReportType === 'kpi' && (isRtl ? 'سيتم جلب مستهدف اليوم، الكمية المنجزة، معدل الكفاءة، ودرجة السلامة.' : 'Will snapshot targets, actual output, productivity indices, and safety ratings.')}
                      {newReportType === 'progress' && (isRtl ? 'سيتم جلب الكميات المنجزة اليومية للموقع وتلخيص تحديثات البنود.' : 'Will snapshot actual quantities recorded in daily field updates.')}
                      {newReportType === 'automated' && (isRtl ? 'تقرير ذكي مؤتمت يلخص الإنذارات النشطة، معوقات سير العمل، وسجلات النظام.' : 'Automated diagnostic report summarizing active blocks, weather alerts, and system health.')}
                    </span>
                  </div>
                  <button
                    onClick={handleCreateAndSaveReport}
                    disabled={isCreatingReport}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isCreatingReport ? (isRtl ? 'جاري الأرشفة...' : 'Archiving...') : (isRtl ? 'تأكيد الحفظ والأرشفة' : 'Confirm Archive')}
                  </button>
                </div>
              </div>
            )}

            {/* Filter and Search Bar Row */}
            <div className="flex flex-col md:flex-row gap-3 pt-2">
              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-1.5 flex-1">
                {[
                  { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                  { id: 'attendance', labelAr: 'الحضور والغياب', labelEn: 'Attendance' },
                  { id: 'kpi', labelAr: 'مؤشرات الأداء KPI', labelEn: 'KPI Reports' },
                  { id: 'progress', labelAr: 'التحديث والإنجاز', labelEn: 'Progress Updates' },
                  { id: 'automated', labelAr: 'التقارير المؤتمتة', labelEn: 'Automated' }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setArchiveFilterType(filter.id)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition cursor-pointer ${
                      archiveFilterType === filter.id 
                        ? 'bg-[#040957] text-white' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isRtl ? filter.labelAr : filter.labelEn}
                  </button>
                ))}
              </div>

              {/* Text Search input */}
              <div className="relative w-full md:w-80">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={savedSearchQuery}
                  onChange={(e) => setSavedSearchQuery(e.target.value)}
                  placeholder={isRtl ? 'بحث بالرقم أو التاريخ أو الملاحظات...' : 'Search report #, date, or notes...'}
                  className="w-full pl-9 pr-4 py-2 text-xs font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Archived Reports Render Grid */}
          {(() => {
            const filteredReports = savedReports.filter(report => {
              const matchesType = archiveFilterType === 'all' || report.reportType === archiveFilterType;
              const normalizedQuery = savedSearchQuery.toLowerCase();
              const matchesQuery = 
                report.reportNumber.toLowerCase().includes(normalizedQuery) ||
                report.reportDate.toLowerCase().includes(normalizedQuery) ||
                (report.supervisorNotes && report.supervisorNotes.toLowerCase().includes(normalizedQuery)) ||
                report.projectNameEn.toLowerCase().includes(normalizedQuery) ||
                report.projectNameAr.toLowerCase().includes(normalizedQuery);
              return matchesType && matchesQuery;
            });

            if (filteredReports.length === 0) {
              return (
                <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                  <p className="text-sm italic">
                    {savedSearchQuery ? (isRtl ? '⚠️ لم يتم العثور على أي تقارير مؤرشفة تطابق استفسارك.' : 'No archived reports matched your query.') : (isRtl ? '📁 لا توجد تقارير أداء محفوظة في هذا التصنيف بعد.' : 'No saved report records have been documented in this category yet.')}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredReports.map(report => {
                  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                  let typeLabel = isRtl ? 'الحضور والعمالة' : 'Attendance';
                  
                  if (report.reportType === 'kpi') {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    typeLabel = isRtl ? 'مؤشرات الأداء KPI' : 'KPI Report';
                  } else if (report.reportType === 'progress') {
                    badgeColor = 'bg-purple-50 text-purple-700 border-purple-100';
                    typeLabel = isRtl ? 'تحديث الإنجاز' : 'Progress';
                  } else if (report.reportType === 'automated') {
                    badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
                    typeLabel = isRtl ? 'تقرير مؤتمت' : 'Automated';
                  }

                  return (
                    <div 
                      key={report.id}
                      className="bg-white border border-gray-200 hover:border-emerald-300 rounded-2xl p-4 transition-all shadow-xs flex flex-col justify-between hover:shadow-md group relative"
                    >
                      <div className="space-y-3">
                        {/* Card Header row */}
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-[9px] font-black border px-2 py-0.5 rounded-lg ${badgeColor}`}>
                            {typeLabel}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {report.reportDate}
                          </span>
                        </div>

                        {/* Title & context */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-mono font-black text-gray-400">
                            #{report.reportNumber}
                          </span>
                          <h4 className="text-xs font-black text-[#040957] truncate">
                            {isRtl ? report.projectNameAr : report.projectNameEn}
                          </h4>
                        </div>

                        {/* Summary Data specific row */}
                        <div className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-100/50 font-mono">
                          {report.reportType === 'attendance' && (
                            <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'معدل الحضور' : 'Rate'}</span>
                                <span className="font-extrabold text-blue-700">{report.data.attendanceRate}%</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'المتواجدين' : 'Present'}</span>
                                <span className="font-extrabold text-emerald-600">{report.data.presentWorkers}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'الغائبين' : 'Absent'}</span>
                                <span className="font-extrabold text-red-500">{report.data.absentWorkers}</span>
                              </div>
                            </div>
                          )}

                          {report.reportType === 'kpi' && (
                            <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'الإنتاجية' : 'Output'}</span>
                                <span className="font-extrabold text-blue-700">{report.data.actualQuantity} / {report.data.targetQuantity}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'الكفاءة' : 'Efficiency'}</span>
                                <span className="font-extrabold text-purple-600">{report.data.efficiency}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'السلامة' : 'Safety'}</span>
                                <span className="font-extrabold text-emerald-600">{report.data.safetyScore}%</span>
                              </div>
                            </div>
                          )}

                          {report.reportType === 'progress' && (
                            <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'الكمية المنجزة' : 'Qty Done'}</span>
                                <span className="font-extrabold text-purple-700">{report.data.completedQuantity}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'التقدم الكلي' : 'Total Prog.'}</span>
                                <span className="font-extrabold text-blue-600">{report.data.progressPercentage}%</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'البنود المحدثة' : 'Items'}</span>
                                <span className="font-extrabold text-gray-700">{report.data.progressUpdatesCount}</span>
                              </div>
                            </div>
                          )}

                          {report.reportType === 'automated' && (
                            <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'إنذارات نشطة' : 'Alerts'}</span>
                                <span className={`font-extrabold ${report.data.criticalAlertsCount && report.data.criticalAlertsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{report.data.criticalAlertsCount || 0}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'حالة العمل' : 'Work Health'}</span>
                                <span className={`font-extrabold font-sans ${report.data.healthStatus === 'Critical' ? 'text-red-600' : 'text-emerald-600'}`}>{isRtl ? report.data.healthStatusAr : report.data.healthStatus}</span>
                              </div>
                              <div>
                                <span className="text-gray-400 block font-bold font-sans">{isRtl ? 'سجلات معالجة' : 'Logs Trace'}</span>
                                <span className="font-extrabold text-purple-600">{report.data.logsCount || 0}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {report.supervisorNotes && (
                          <p className="text-[10px] text-gray-500 italic bg-gray-50/50 p-2 rounded-lg border border-gray-100 line-clamp-2 leading-relaxed">
                            &ldquo;{report.supervisorNotes}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Footer controls row */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <span className="text-[9px] text-gray-400 font-bold">
                          👤 {report.createdByName || 'Supervisor'}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setSelectedArchivedReport(report)}
                            className="text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg transition text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            {isRtl ? 'عرض التفاصيل' : 'Details'}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedArchivedReport(report);
                              document.body.classList.add('printing-archive-active');
                              setTimeout(() => {
                                try {
                                  window.print();
                                } catch (e) {
                                  console.error(e);
                                } finally {
                                  document.body.classList.remove('printing-archive-active');
                                }
                              }, 300);
                            }}
                            className="text-emerald-700 hover:text-white hover:bg-emerald-600 bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg transition cursor-pointer"
                            title={isRtl ? 'طباعة التقرير' : 'Print Report'}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {report.reportType === 'kpi' && (
                            <button
                              onClick={() => exportKpiToExcel(report, isRtl, settings)}
                              className="text-emerald-700 hover:text-white hover:bg-emerald-600 bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg transition cursor-pointer"
                              title={isRtl ? 'تحميل ملف Excel' : 'Export to Excel'}
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="text-red-500 hover:text-white hover:bg-red-600 bg-red-50 border border-red-100 p-1.5 rounded-lg transition cursor-pointer"
                            title={isRtl ? 'حذف من الأرشيف' : 'Delete Record'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* 🔴 DETAIL MODAL FOR ARCHIVED REPORT */}
      {selectedArchivedReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden overflow-y-auto">
          <div className="bg-white text-gray-800 rounded-2xl w-full max-w-2xl border border-gray-200 overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="bg-[#040957] text-white p-5 flex justify-between items-center border-b border-white/10">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
                  {selectedArchivedReport.reportType.toUpperCase()} ARCHIVED REPORT
                </span>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  <span>#{selectedArchivedReport.reportNumber}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedArchivedReport(null)}
                className="text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-xs font-bold">
              {/* Context Block */}
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] text-gray-400 block">{isRtl ? 'المشروع السياقي' : 'Project Context'}</span>
                  <span className="text-gray-800 font-extrabold text-sm">{isRtl ? selectedArchivedReport.projectNameAr : selectedArchivedReport.projectNameEn}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">{isRtl ? 'تاريخ وموعد التوثيق' : 'Documented Date'}</span>
                  <span className="text-gray-800 font-extrabold text-sm">{selectedArchivedReport.reportDate}</span>
                </div>
              </div>

              {/* Data payload block specific layout */}
              <div className="space-y-4">
                <h4 className="text-[10px] uppercase tracking-wider text-blue-700 border-b border-gray-100 pb-1.5">
                  📊 {isRtl ? 'القياسات والبيانات المسجلة بالتقرير' : 'RECORDED MEASUREMENTS & DATA'}
                </h4>

                {selectedArchivedReport.reportType === 'attendance' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-center">
                        <span className="text-gray-400 block text-[9px]">{isRtl ? 'معدل الحضور اليومي' : 'Attendance Rate'}</span>
                        <span className="text-lg font-black text-blue-800">{selectedArchivedReport.data.attendanceRate}%</span>
                      </div>
                      <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-center">
                        <span className="text-gray-400 block text-[9px]">{isRtl ? 'إجمالي المتواجدين' : 'Present Staff'}</span>
                        <span className="text-lg font-black text-emerald-800">{selectedArchivedReport.data.presentWorkers}</span>
                      </div>
                      <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 text-center">
                        <span className="text-gray-400 block text-[9px]">{isRtl ? 'إجمالي الغائبين' : 'Absent Staff'}</span>
                        <span className="text-lg font-black text-red-800">{selectedArchivedReport.data.absentWorkers}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] text-gray-400 block">{isRtl ? 'قائمة تفصيلية للعمالة والمشرفين:' : 'Detailed Workforce Logs:'}</span>
                      <div className="border border-gray-100 rounded-xl overflow-hidden text-[10px]">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 text-gray-500 font-bold">
                            <tr>
                              <th className="p-2 text-right">{isRtl ? 'الاسم' : 'Name'}</th>
                              <th className="p-2 text-center">{isRtl ? 'التصنيف المهني' : 'Role'}</th>
                              <th className="p-2 text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {(selectedArchivedReport.data.workersDetails || []).map((w: any, idx: number) => (
                              <tr key={idx}>
                                <td className="p-2 text-right font-bold text-gray-700">{w.name}</td>
                                <td className="p-2 text-center text-gray-500">{w.role || '-'}</td>
                                <td className="p-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${w.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                    {w.status === 'present' ? (isRtl ? 'حاضر' : 'Present') : (isRtl ? 'غائب' : 'Absent')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {selectedArchivedReport.reportType === 'kpi' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[9px]">{isRtl ? 'الإنتاجية المنجزة' : 'Actual Qty'}</span>
                      <span className="text-sm font-black text-gray-800">{selectedArchivedReport.data.actualQuantity} m³</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[9px]">{isRtl ? 'مستهدف اليوم' : 'Target Qty'}</span>
                      <span className="text-sm font-black text-gray-800">{selectedArchivedReport.data.targetQuantity} m³</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[9px]">{isRtl ? 'معدل الكفاءة التشغيلية' : 'Efficiency Rating'}</span>
                      <span className="text-sm font-black text-purple-700">{selectedArchivedReport.data.efficiency}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[9px]">{isRtl ? 'درجة السلامة والصحة' : 'Safety Score'}</span>
                      <span className="text-sm font-black text-emerald-600">{selectedArchivedReport.data.safetyScore}%</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[9px]">{isRtl ? 'الملاحظات المفتوحة' : 'Open Safety Issues'}</span>
                      <span className="text-sm font-black text-red-500">{selectedArchivedReport.data.openIssuesCount}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <span className="text-gray-400 block text-[9px]">{isRtl ? 'استغلال الطاقة الاستيعابية' : 'Capacity Utilization'}</span>
                      <span className="text-sm font-black text-blue-700">{selectedArchivedReport.data.capacityUtilization}%</span>
                    </div>
                  </div>
                )}

                {selectedArchivedReport.reportType === 'progress' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                        <span className="text-gray-400 block text-[9px]">{isRtl ? 'إجمالي الكميات المنفذة' : 'Total Executed Output'}</span>
                        <span className="text-base font-black text-purple-800">{selectedArchivedReport.data.completedQuantity} m³</span>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <span className="text-gray-400 block text-[9px]">{isRtl ? 'النسبة الإجمالية المحدثة' : 'Cumulative Progress'}</span>
                        <span className="text-base font-black text-blue-800">{selectedArchivedReport.data.progressPercentage}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] text-gray-400 block">{isRtl ? 'ملخص بنود الأعمال المنجزة:' : 'Itemized Outputs Summary:'}</span>
                      <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50 space-y-2 text-[10px]">
                        {(selectedArchivedReport.data.updatesSummary || []).map((u: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-gray-100">
                            <div>
                              <span className="font-extrabold text-gray-800 block">{isRtl ? u.itemAr : u.itemEn}</span>
                              <span className="text-[8px] text-gray-400 block">Work Class Classification item</span>
                            </div>
                            <span className="font-extrabold text-purple-700 font-mono text-sm">
                              {u.val} {isRtl ? u.unitAr : u.unitEn}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedArchivedReport.reportType === 'automated' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                        <span className="text-gray-400 block text-[9px]">{isRtl ? 'الإنذارات الحرجة' : 'Critical Alarms'}</span>
                        <span className="text-lg font-black text-red-700">{selectedArchivedReport.data.criticalAlertsCount}</span>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <span className="text-gray-400 block text-[9px]">{isRtl ? 'مؤشر سلامة النظام' : 'System Diagnostic'}</span>
                        <span className="text-sm font-black text-emerald-800 block mt-1">{isRtl ? selectedArchivedReport.data.healthStatusAr : selectedArchivedReport.data.healthStatus}</span>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                        <span className="text-gray-400 block text-[9px]">{isRtl ? 'إجمالي السجلات المدققة' : 'Audited Event Logs'}</span>
                        <span className="text-lg font-black text-purple-800">{selectedArchivedReport.data.logsCount}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] text-gray-400 block">{isRtl ? 'تفصيل سجل الأحداث المؤتمت والإنذارات (أمن وسلامة):' : 'Automated Diagnostic Event Log (Safety):'}</span>
                      <div className="bg-gray-900 text-green-400 p-3 rounded-xl font-mono text-[9px] space-y-1.5 border border-gray-800 max-h-40 overflow-y-auto">
                        <p className="text-gray-400">// BEGIN SYSTEM SYSTEMATIC AUDIT LOGS TRACE // animate_online: true</p>
                        {(selectedArchivedReport.data.systemLogs || []).map((l: any, idx: number) => (
                          <div key={idx} className="flex justify-between border-b border-white/5 pb-1">
                            <span>&gt; {l.action} (Operator: {l.userName})</span>
                            <span className="text-gray-500">{l.timestamp}</span>
                          </div>
                        ))}
                        <p className="text-emerald-500">// ALL PROCESS CORES ARE GREEN. AUTOMATION SEQUENCE DOCUMENTED SUCCESSFULLY.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Remarks Box */}
              <div className="bg-[#040957]/5 p-4 rounded-xl border border-[#040957]/10 space-y-1">
                <span className="text-[10px] text-[#0080FF] block uppercase tracking-wider">{isRtl ? 'التوجيهات والتقرير المكتوب من المشرف' : 'Official Written Directives / Notes'}</span>
                <p className="text-xs text-gray-700 italic leading-relaxed font-sans font-medium">
                  &ldquo;{selectedArchivedReport.supervisorNotes}&rdquo;
                </p>
              </div>

              {/* Signatures stamp */}
              <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-[10px] text-gray-500 font-bold">
                <div>
                  <span>Prepared By: </span>
                  <span className="text-gray-800 font-extrabold">{selectedArchivedReport.createdByName || 'Supervisor'}</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl text-emerald-800">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="block">{settings.managerNameEn} / {settings.managerNameAr}</span>
                    <span className="block text-[8px] text-gray-400 font-mono">Approved Sign: {settings.managerSignature}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-end gap-2">
              {selectedArchivedReport.reportType === 'kpi' && (
                <button
                  onClick={() => exportKpiToExcel(selectedArchivedReport, isRtl, settings)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {isRtl ? 'تحميل ملف Excel' : 'Export to Excel'}
                </button>
              )}
              <button
                onClick={() => {
                  document.body.classList.add('printing-archive-active');
                  setTimeout(() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.error(e);
                    } finally {
                      document.body.classList.remove('printing-archive-active');
                    }
                  }, 150);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {isRtl ? 'طباعة هذا التقرير' : 'Print This Report'}
              </button>
              <button
                onClick={() => setSelectedArchivedReport(null)}
                className="bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 HIGH FIDELITY PRINT-ONLY RENDER FOR INDIVIDUAL ARCHIVED REPORT */}
      {selectedArchivedReport && (
        <div className="hidden print:block printable-archived-report-view font-sans text-[#0f172a] bg-white p-12 space-y-8 w-full max-w-4xl mx-auto print:p-0">
          {/* Header */}
          <div className="flex justify-between items-center border-b-4 border-[#040957] pb-4">
            <div className="space-y-1">
              <h1 className="text-xl font-black uppercase tracking-wider text-[#040957]">{selectedArchivedReport.reportType.toUpperCase()} ARCHIVED PERFORMANCE REPORT</h1>
              <p className="text-xs text-gray-500 font-medium">Official Civil & Engineering Field Document | ID: #{selectedArchivedReport.reportNumber}</p>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-sm block text-[#040957]">DATE: {selectedArchivedReport.reportDate}</span>
              <span className="text-[10px] text-gray-400 font-bold tracking-wider block">SYSTEM GENERATED ARCHIVAL</span>
            </div>
          </div>

          {/* Context Details */}
          <table className="w-full text-xs font-bold border-collapse border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <tbody>
              <tr>
                <td className="border border-slate-200 p-2.5 bg-slate-50 text-slate-500 w-1/4 uppercase tracking-wider text-[10px]">PROJECT CONTEXT</td>
                <td className="border border-slate-200 p-2.5 text-[#040957]">{selectedArchivedReport.projectNameEn} / {selectedArchivedReport.projectNameAr}</td>
                <td className="border border-slate-200 p-2.5 bg-slate-50 text-slate-500 w-1/4 uppercase tracking-wider text-[10px]">REPORT NUMBER</td>
                <td className="border border-slate-200 p-2.5 font-mono text-emerald-600 font-extrabold">{selectedArchivedReport.reportNumber}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2.5 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">PREPARED BY</td>
                <td className="border border-slate-200 p-2.5 text-slate-700">{selectedArchivedReport.createdByName || 'Supervisor / المشرف'}</td>
                <td className="border border-slate-200 p-2.5 bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">SYSTEM TIMESTAMP</td>
                <td className="border border-slate-200 p-2.5 font-mono text-[10px] text-slate-500">{selectedArchivedReport.timestamp}</td>
              </tr>
            </tbody>
          </table>

          {/* Data Payload specific details table */}
          <div className="space-y-3">
            <h2 className="text-xs font-black border-b-2 border-[#040957] pb-1.5 text-[#040957] uppercase tracking-widest">I. DATA SPECIFICATION & MEASUREMENTS</h2>
            
            {selectedArchivedReport.reportType === 'attendance' && (
              <div className="space-y-4">
                <table className="w-full text-xs text-center border-collapse border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-[#040957] text-white">
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">ATTENDANCE RATE (%)</th>
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">PRESENT PERSONNEL</th>
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">ABSENT PERSONNEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-extrabold text-sm">
                      <td className="border border-slate-200 p-3 text-blue-600">{selectedArchivedReport.data.attendanceRate}%</td>
                      <td className="border border-slate-200 p-3 text-emerald-600">{selectedArchivedReport.data.presentWorkers}</td>
                      <td className="border border-slate-200 p-3 text-rose-500">{selectedArchivedReport.data.absentWorkers}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="w-full text-xs border-collapse border border-slate-200 text-left [dir='rtl']:text-right rounded-xl overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-[#040957] text-white">
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">Staff / Supervisor Name</th>
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">Occupational Role</th>
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">Daily Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedArchivedReport.data.workersDetails || []).map((w: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="border border-slate-200 p-2.5 font-bold text-[#040957]">{w.name}</td>
                        <td className="border border-slate-200 p-2.5 text-slate-500 font-medium">{w.role || '-'}</td>
                        <td className="border border-slate-200 p-2.5 font-extrabold">
                          <span className={w.status === 'present' ? "text-emerald-600" : "text-rose-500"}>
                            {w.status === 'present' ? 'PRESENT (حاضر)' : 'ABSENT (غائب)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedArchivedReport.reportType === 'kpi' && (
              <table className="w-full text-xs border-collapse border border-slate-200 text-left [dir='rtl']:text-right rounded-xl overflow-hidden shadow-sm">
                <thead>
                  <tr className="bg-[#040957] text-white">
                    <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">Metric Dimension</th>
                    <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">Recorded Quantity / Index</th>
                    <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">Benchmark Target</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-slate-200 p-2.5 font-semibold text-slate-600">Daily Production Output (Earthwork / Structural Concrete)</td>
                    <td className="border border-slate-200 p-2.5 font-extrabold text-[#0080FF] num-font">{selectedArchivedReport.data.actualQuantity} m³</td>
                    <td className="border border-slate-200 p-2.5 text-slate-500 num-font">{selectedArchivedReport.data.targetQuantity} m³</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-2.5 font-semibold text-slate-600">Overall Labor Productivity Efficiency</td>
                    <td className="border border-slate-200 p-2.5 font-extrabold text-[#040957] num-font">{selectedArchivedReport.data.efficiency}</td>
                    <td className="border border-slate-200 p-2.5 text-slate-500">100% Base Value</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-slate-200 p-2.5 font-semibold text-slate-600">Safety Performance Score / Health Index</td>
                    <td className="border border-slate-200 p-2.5 font-extrabold text-emerald-600 num-font">{selectedArchivedReport.data.safetyScore}%</td>
                    <td className="border border-slate-200 p-2.5 text-slate-500">100% Goal</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 p-2.5 font-semibold text-slate-600">Capacity Utilization Efficiency</td>
                    <td className="border border-slate-200 p-2.5 font-extrabold text-[#040957] num-font">{selectedArchivedReport.data.capacityUtilization}%</td>
                    <td className="border border-slate-200 p-2.5 text-slate-500">90% Target</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-slate-200 p-2.5 font-semibold text-slate-600">Active Remedial Safety Tasks</td>
                    <td className="border border-slate-200 p-2.5 font-extrabold text-rose-500 num-font">{selectedArchivedReport.data.openIssuesCount} Issues</td>
                    <td className="border border-slate-200 p-2.5 text-slate-500">0 Goals</td>
                  </tr>
                </tbody>
              </table>
            )}

            {selectedArchivedReport.reportType === 'progress' && (
              <div className="space-y-4">
                <table className="w-full text-xs text-center border-collapse border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-[#040957] text-white">
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">TOTAL DAILY COMPLETED QTY</th>
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">CUMULATIVE TOTAL PROGRESS %</th>
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">UPDATED CONTRACTUAL ITEMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-extrabold text-sm">
                      <td className="border border-slate-200 p-3 text-[#0080FF] num-font">{selectedArchivedReport.data.completedQuantity} m³</td>
                      <td className="border border-slate-200 p-3 text-emerald-600 num-font">{selectedArchivedReport.data.progressPercentage}%</td>
                      <td className="border border-slate-200 p-3 text-[#040957] num-font">{selectedArchivedReport.data.progressUpdatesCount} Items</td>
                    </tr>
                  </tbody>
                </table>

                <table className="w-full text-xs border-collapse border border-slate-200 text-left [dir='rtl']:text-right rounded-xl overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-[#040957] text-white">
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">Item Classification Description</th>
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">Recorded Progress</th>
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">Dimensional Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedArchivedReport.data.updatesSummary || []).map((u: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="border border-slate-200 p-2.5 font-bold text-slate-700">{u.itemEn} | {u.itemAr}</td>
                        <td className="border border-slate-200 p-2.5 font-extrabold text-[#0080FF] num-font">{u.val}</td>
                        <td className="border border-slate-200 p-2.5 text-slate-400 font-medium">{u.unitEn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedArchivedReport.reportType === 'automated' && (
              <div className="space-y-4">
                <table className="w-full text-xs text-center border-collapse border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-[#040957] text-white">
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">CRITICAL SYSTEM ALARMS</th>
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">SYSTEM DIAGNOSTIC HEALTH</th>
                      <th className="border border-slate-200/20 p-2.5 uppercase tracking-wider text-[9px]">AUDITED LOG RECORDS COUNTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-extrabold text-sm">
                      <td className="border border-slate-200 p-3 text-rose-500">{selectedArchivedReport.data.criticalAlertsCount} Alarms</td>
                      <td className="border border-slate-200 p-3 text-emerald-600">{selectedArchivedReport.data.healthStatus}</td>
                      <td className="border border-slate-200 p-3 text-[#040957]">{selectedArchivedReport.data.logsCount} logs</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 font-mono text-[9px] text-slate-600 space-y-1">
                  <p className="font-bold text-[#040957]">// OFFICIAL SYSTEM CORES LOGS TRACE OUT // STATUS: RECORDED</p>
                  {(selectedArchivedReport.data.systemLogs || []).map((l: any, idx: number) => (
                    <p key={idx} className="border-b border-slate-100 pb-0.5">&gt; {l.action} (User: {l.userName}) | Time: {l.timestamp}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Supervisor Directives / Notes */}
          <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-extrabold block text-[#040957] uppercase tracking-wider">II. SUPERVISOR WRITTEN DIRECTIVES & OPERATIONAL COMMENTS</span>
            <p className="text-xs italic text-slate-600 leading-relaxed font-medium">
              &ldquo;{selectedArchivedReport.supervisorNotes}&rdquo;
            </p>
          </div>

          {/* Signatures stamp */}
          <div className="pt-8 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-xs font-bold text-slate-700">
            <div className="space-y-4">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">Inspector / Prepared By Sign-Off:</span>
              <div className="border-b border-slate-300 w-48 h-8"></div>
              <span className="text-[#040957]">{selectedArchivedReport.createdByName || 'Supervisor'}</span>
            </div>
            <div className="space-y-2 text-right">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">Project Consultant & Official Stamp:</span>
              <p className="text-xs text-slate-800">{settings.managerNameEn} / {settings.managerNameAr}</p>
              <p className="text-[10px] text-emerald-600 font-mono">Digitally Approved: {settings.managerSignature}</p>
            </div>
          </div>
        </div>
      )}

      {/* 🔴 HIGH FIDELITY PRINT-ONLY BATCH LIST FOR ALL MATCHING ARCHIVED REPORTS */}
      {bulkPrintingType && (
        <div className="hidden print:block printable-archived-report-view font-sans text-black bg-white p-12 space-y-8 w-full max-w-4xl mx-auto print:p-0">
          <div className="flex justify-between items-center border-b-2 border-black pb-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider">{isRtl ? 'تقرير الأرشيف الشامل لكافة مؤشرات الأداء والعمليات' : 'COMPREHENSIVE BATCH ARCHIVED REPORT'}</h1>
              <p className="text-xs text-gray-500">Documented Project Performance Archive Records List | Type: {bulkPrintingType.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-xs block">DATE PRINTED: 2026-07-01</span>
              <span className="text-[10px] text-gray-400 block">BATCH EXPORT SEQUENCE</span>
            </div>
          </div>

          <table className="w-full text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">Report #</th>
                <th className="border border-black p-2 text-center">Date</th>
                <th className="border border-black p-2 text-center">Type</th>
                <th className="border border-black p-2 text-left">Project Title</th>
                <th className="border border-black p-2 text-left">Supervisor Remarks / Summary Metrics</th>
              </tr>
            </thead>
            <tbody>
              {savedReports
                .filter(r => bulkPrintingType === 'all' || r.reportType === bulkPrintingType)
                .map((report, idx) => {
                  let infoStr = '';
                  if (report.reportType === 'attendance') {
                    infoStr = `Rate: ${report.data.attendanceRate}% | Present: ${report.data.presentWorkers} | Absent: ${report.data.absentWorkers}`;
                  } else if (report.reportType === 'kpi') {
                    infoStr = `Output: ${report.data.actualQuantity}/${report.data.targetQuantity} | Efficiency: ${report.data.efficiency} | Safety: ${report.data.safetyScore}%`;
                  } else if (report.reportType === 'progress') {
                    infoStr = `Qty: ${report.data.completedQuantity} | Prog: ${report.data.progressPercentage}% | Updates: ${report.data.progressUpdatesCount}`;
                  } else if (report.reportType === 'automated') {
                    infoStr = `Alarms: ${report.data.criticalAlertsCount} | Health: ${report.data.healthStatus} | Logs: ${report.data.logsCount}`;
                  }

                  return (
                    <tr key={idx}>
                      <td className="border border-black p-2 text-center font-mono">{report.reportNumber}</td>
                      <td className="border border-black p-2 text-center font-mono">{report.reportDate}</td>
                      <td className="border border-black p-2 text-center uppercase text-[10px] font-extrabold">{report.reportType}</td>
                      <td className="border border-black p-2">{report.projectNameEn}</td>
                      <td className="border border-black p-2">
                        <span className="block font-bold text-[10px] text-gray-600">{infoStr}</span>
                        <span className="italic text-[10px] block mt-0.5">&ldquo;{report.supervisorNotes}&rdquo;</span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          <div className="pt-8 border-t-2 border-black flex justify-between text-xs font-bold">
            <div>
              <span>Generated & Certified By:</span>
              <p className="mt-2">Supervisor / المشرف</p>
            </div>
            <div className="text-right">
              <span>Official Verification Stamp:</span>
              <p className="mt-2">{settings.managerNameEn} / Approved</p>
              <p className="text-[10px] text-gray-400 font-mono">{settings.managerSignature}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
