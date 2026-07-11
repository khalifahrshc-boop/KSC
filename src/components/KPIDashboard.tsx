import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Activity, Project, WorkItem, Worker, ProgressUpdate, WarehouseMaterial, EquipmentItem, SafetyRecord, DelayRecord, IssueReport, AttendanceRecord, SavedKpiReport, User, SystemSettings } from '../types';
import { 
  getProjectProgress, 
  getProjectPlannedProgress, 
  getActivityProgress,
  getWorkItemProgress,
  getProjectStatusDetails
} from '../utils/progressCalculations';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Activity as ActivityIcon, 
  Layers, 
  ShieldAlert, 
  Package, 
  Wrench, 
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  Calendar,
  Printer,
  FileText,
  Clock,
  ShieldCheck,
  Zap,
  Info,
  MapPin,
  ChevronRight,
  Fingerprint,
  Trash2,
  Save,
  Search,
  FileCheck,
  CalendarDays,
  ExternalLink,
  FileSpreadsheet
} from 'lucide-react';
import { motion } from 'motion/react';
import { runWithOklchSanitizer } from '../utils/pdfSanitizer';
import { exportKpiToExcel } from '../utils/kpiExcelExport';

interface KPIDashboardProps {
  lang: 'ar' | 'en';
  t: any;
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  workers: Worker[];
  attendanceRecords?: AttendanceRecord[];
  progressUpdates: ProgressUpdate[];
  materials: WarehouseMaterial[];
  equipment: EquipmentItem[];
  safetyRecords?: SafetyRecord[];
  delays?: DelayRecord[];
  issues?: IssueReport[];
  onDeleteProgressUpdate?: (id: string) => void;
  savedKpiReports?: SavedKpiReport[];
  onSaveKpiReport?: (report: Omit<SavedKpiReport, 'id'>) => Promise<void>;
  onDeleteKpiReport?: (id: string) => Promise<void>;
  currentUser?: User;
  settings?: SystemSettings;
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

export default function KPIDashboard({
  lang,
  t,
  projects,
  workItems,
  activities,
  workers,
  attendanceRecords = [],
  progressUpdates,
  materials,
  equipment,
  safetyRecords = [],
  delays = [],
  issues = [],
  onDeleteProgressUpdate,
  savedKpiReports = [],
  onSaveKpiReport,
  onDeleteKpiReport,
  currentUser,
  settings
}: KPIDashboardProps) {
  const isRtl = lang === 'ar';

  // Dropdown menu states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null); // 'project' | 'sections' | 'theme' | 'validation' | 'lang'
  
  const CustomKpiTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#040957] text-white p-3 rounded-xl border border-blue-500/30 shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-bold opacity-60 uppercase mb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-[11px]">{isRtl ? 'حجم الإنتاج الكلي:' : 'Total Output Volume:'}</span>
              <span className="text-[11px] font-bold text-amber-400">{payload[0].value}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };
  
  // Custom theme colors for modern design and PDF output
  const [reportTheme, setReportTheme] = useState<'navy' | 'emerald' | 'slate' | 'gold'>('navy');

  // Report section visibility toggles
  const [reportSections, setReportSections] = useState({
    operational: true,
    strategic: true,
    risk: true,
    portfolio: true,
    attendance: true,
    audit: true,
    remarks: true,
    signatures: true,
  });

  // Stamp and signatures validation modes
  const [validationMode, setValidationMode] = useState<'all' | 'sig' | 'none'>('all');

  // Report Language configuration
  const [reportLang, setReportLang] = useState<'ar' | 'en' | 'both'>('both');

  // State to filter metrics by a single project (or "all" for general enterprise metrics)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // State to toggle between Dashboard view and Official Report view
  const [isReportMode, setIsReportMode] = useState(false);

  // Saved KPI Report States
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [reportDateInput, setReportDateInput] = useState('2026-07-01');
  const [notesInput, setNotesInput] = useState('');
  const [reportNumberInput, setReportNumberInput] = useState('');
  
  // Search & view modal for saved reports
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [selectedSavedReport, setSelectedSavedReport] = useState<SavedKpiReport | null>(null);

  const handleOpenSaveModal = () => {
    setReportDateInput('2026-07-01'); // System active date
    const randomSerial = Math.floor(100 + Math.random() * 900);
    setReportNumberInput(`KPI-20260701-${randomSerial}`);
    setNotesInput(isRtl ? 'جميع مؤشرات الأداء تسير حسب الخطة المعتمدة.' : 'All performance indices are running in accordance with the approved baseline.');
    setIsSaveModalOpen(true);
  };

  const handleConfirmSaveReport = async () => {
    if (!onSaveKpiReport) return;
    try {
      const reportData: Omit<SavedKpiReport, 'id'> = {
        reportNumber: reportNumberInput,
        reportDate: reportDateInput,
        projectId: selectedProjectId,
        projectNameEn: selectedProjectId === 'all' ? 'Enterprise Wide' : (activeProject?.nameEn || ''),
        projectNameAr: selectedProjectId === 'all' ? 'كافة المشاريع والعمليات' : (activeProject?.nameAr || ''),
        targetQuantity: totalDailyTarget,
        actualQuantity: totalActualToday,
        attendanceRate: attendanceStats.rate,
        presentWorkers: attendanceStats.present,
        absentWorkers: attendanceStats.absent,
        efficiency: productivityAnalysis.efficiency,
        safetyScore: safetyStats.score,
        openIssuesCount: safetyStats.openIssues,
        capacityUtilization: productivityAnalysis.capacityUtilization,
        supervisorNotes: notesInput,
        createdByName: currentUser?.name || 'Supervisor',
        timestamp: new Date().toISOString()
      };
      await onSaveKpiReport(reportData);
      setIsSaveModalOpen(false);
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const filteredSavedReports = useMemo(() => {
    if (!savedSearchQuery.trim()) return savedKpiReports;
    const query = savedSearchQuery.toLowerCase().trim();
    return savedKpiReports.filter(report => {
      const numMatch = report.reportNumber.toLowerCase().includes(query);
      const dateMatch = report.reportDate.includes(query);
      const projectMatch = report.projectNameEn.toLowerCase().includes(query) || report.projectNameAr.includes(query);
      return numMatch || dateMatch || projectMatch;
    });
  }, [savedKpiReports, savedSearchQuery]);

  // 1. Filtered data lists based on selected project
  const filteredWorkItems = useMemo(() => {
    if (selectedProjectId === 'all') return workItems;
    return workItems.filter(wi => wi.projectId === selectedProjectId);
  }, [workItems, selectedProjectId]);

  const filteredWorkItemIds = useMemo(() => {
    return new Set(filteredWorkItems.map(wi => wi.id));
  }, [filteredWorkItems]);

  const filteredActivities = useMemo(() => {
    if (selectedProjectId === 'all') return activities;
    return activities.filter(act => filteredWorkItemIds.has(act.workItemId));
  }, [activities, filteredWorkItemIds, selectedProjectId]);

  const filteredActivityIds = useMemo(() => {
    return new Set(filteredActivities.map(act => act.id));
  }, [filteredActivities]);

  const filteredUpdates = useMemo(() => {
    if (selectedProjectId === 'all') return progressUpdates;
    return progressUpdates.filter(upd => filteredActivityIds.has(upd.activityId));
  }, [progressUpdates, filteredActivityIds, selectedProjectId]);

  const filteredAttendance = useMemo(() => {
    if (selectedProjectId === 'all') return attendanceRecords;
    return attendanceRecords.filter(r => r.projectId === selectedProjectId);
  }, [attendanceRecords, selectedProjectId]);

  const attendanceStats = useMemo(() => {
    const total = filteredAttendance.length;
    if (total === 0) return { present: 0, absent: 0, rate: 0, total: 0 };
    const present = filteredAttendance.filter(r => r.isPresent).length;
    const absent = total - present;
    const rate = Math.round((present / total) * 100);
    return { present, absent, rate, total };
  }, [filteredAttendance]);

  // 2. Daily Output Stats & Target Calculations for today (Dynamic to actual user inputs!)
  const sysNow = useMemo(() => {
    const realNow = new Date();
    return realNow.getFullYear() === 2026 ? realNow : new Date('2026-06-25');
  }, []);

  const totalDailyTarget = useMemo(() => {
    return filteredActivities.reduce((acc, act) => {
      const wi = workItems.find(w => w.id === act.workItemId);
      if (!wi) return acc;
      const proj = projects.find(p => p.id === wi.projectId);
      if (!proj) return acc;
      
      // Check if project is active today
      const start = new Date(proj.startDate);
      const end = new Date(proj.endDate);
      if (sysNow < start || sysNow > end) return acc;

      // Sum of worker's daily productivity assigned to this activity
      const activeWorkers = workers.filter(w => act.workerIds.includes(w.id));
      const sumProductivity = activeWorkers.reduce((wAcc, curr) => wAcc + (curr.dailyProductivity || 0), 0);
      
      // Fallback to average planned or 10 if no workers registered yet
      return acc + (sumProductivity || act.plannedDailyProduction || 15);
    }, 0);
  }, [filteredActivities, workItems, projects, workers, sysNow]);

  const todayUpdates = useMemo(() => {
    return filteredUpdates.filter(u => {
      const d = new Date(u.timestamp);
      return d.toDateString() === sysNow.toDateString();
    });
  }, [filteredUpdates, sysNow]);

  const totalActualToday = useMemo(() => {
    return todayUpdates.reduce((acc, u) => acc + (u.completedQuantity || 0), 0);
  }, [todayUpdates]);

  const dailyProductivityPercentage = useMemo(() => {
    if (totalDailyTarget === 0) return 0;
    return Math.round((totalActualToday / totalDailyTarget) * 100);
  }, [totalActualToday, totalDailyTarget]);

  // 3. Project performance grid (Planned vs Actual)
  const projectMetricsData = useMemo(() => {
    const targetProjects = selectedProjectId === 'all' 
      ? projects 
      : projects.filter(p => p.id === selectedProjectId);

    return targetProjects.map(p => {
      const details = getProjectStatusDetails(p, workItems, activities, progressUpdates, attendanceRecords, materials);
      const actual = details.progress;
      const planned = details.planned;
      
      const projectActivities = activities.filter(a => 
        workItems.some(wi => wi.id === a.workItemId && wi.projectId === p.id)
      );
      
      const pWorkersCount = new Set(projectActivities.flatMap(a => a.workerIds)).size;
      const pEquipmentCount = new Set(projectActivities.flatMap(a => a.equipmentIds)).size;
      const pViolations = safetyRecords.filter(r => r.projectId === p.id).reduce((sum, r) => sum + r.violationsCount, 0);

      return {
        id: p.id,
        name: isRtl ? p.nameAr.split('-')[0].trim() : p.nameEn.split('-')[0].trim(),
        Actual: actual,
        Planned: planned,
        status: details.status,
        reasons: details.reasons,
        workers: pWorkersCount,
        machinery: pEquipmentCount,
        safety: pViolations
      };
    });
  }, [projects, workItems, activities, progressUpdates, workers, equipment, safetyRecords, attendanceRecords, materials, selectedProjectId, isRtl]);

  // 4. Activity breakdown status
  const activityStatusData = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    filteredActivities.forEach(act => {
      const prog = getActivityProgress(act, progressUpdates);
      if (prog === 100) completed++;
      else if (prog > 0) inProgress++;
      else notStarted++;
    });

    return [
      { name: isRtl ? 'مكتمل' : 'Completed', value: completed, color: '#10b981' },
      { name: isRtl ? 'قيد التنفيذ' : 'In Progress', value: inProgress, color: '#0080FF' },
      { name: isRtl ? 'لم يبدأ' : 'Not Started', value: notStarted, color: '#94a3b8' }
    ];
  }, [filteredActivities, progressUpdates, isRtl]);

  // 5. Materials levels vs thresholds
  const materialSafetyMetrics = useMemo(() => {
    // If a project is selected, let's filter materials that are linked to the selected project's activities
    const linkedMaterialIds = new Set(filteredActivities.flatMap(act => act.materialIds));
    const targetMaterials = selectedProjectId === 'all'
      ? materials
      : materials.filter(m => linkedMaterialIds.has(m.id));

    return targetMaterials.map(m => ({
      name: isRtl ? m.nameAr : m.nameEn,
      Current: m.quantity,
      Required: m.minThreshold
    })).slice(0, 6); // Top 6 for clean visual
  }, [materials, filteredActivities, selectedProjectId, isRtl]);

  const lowStockMaterialsCount = useMemo(() => {
    return materials.filter(m => m.quantity < m.minThreshold).length;
  }, [materials]);

  // 6. Workforce Performance (Trend) over last 7 days
  const workforceTrendData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sysNow);
      d.setDate(sysNow.getDate() - (6 - i));
      return d;
    });

    const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return days.map(d => {
      const dateStr = d.toISOString().split('T')[0];
      const dayUpdates = filteredUpdates.filter(u => u.timestamp.startsWith(dateStr));
      const totalVolume = dayUpdates.reduce((sum, u) => sum + (u.completedQuantity || 0), 0);
      const dayName = isRtl ? dayNamesAr[d.getDay()] : dayNamesEn[d.getDay()];
      
      return {
        date: `${dayName} (${d.getDate()}/${d.getMonth() + 1})`,
        Volume: totalVolume
      };
    });
  }, [filteredUpdates, sysNow, isRtl]);

  // 7. Equipment Fleet Status
  const equipmentFleetStatus = useMemo(() => {
    let excellent = 0;
    let available = 0;
    let maintenance = 0;

    equipment.forEach(eq => {
      if (eq.status === 'Excellent') excellent++;
      else if (eq.status === 'Available') available++;
      else if (eq.status === 'Under Maintenance') maintenance++;
    });

    return [
      { name: isRtl ? 'ممتاز' : 'Excellent', value: excellent, color: '#10b981' },
      { name: isRtl ? 'متاح' : 'Available', value: available, color: '#0ea5e9' },
      { name: isRtl ? 'صيانة كبرى' : 'Maintenance', value: maintenance, color: '#ef4444' }
    ];
  }, [equipment, isRtl]);

  // 8. Advanced Executive Metrics (SPI, Efficiency)
  const advancedMetrics = useMemo(() => {
    const totalActual = projects.reduce((acc, p) => acc + getProjectProgress(p, workItems, activities, progressUpdates), 0);
    const totalPlanned = projects.reduce((acc, p) => acc + getProjectPlannedProgress(p), 0);
    
    // SPI (Schedule Performance Index) = Actual / Planned
    const spi = totalPlanned > 0 ? (totalActual / totalPlanned).toFixed(2) : '1.00';
    
    // Workforce Efficiency (Output per Worker assigned today)
    const activeWorkersCount = workers.filter(w => w.status === 'Active').length;
    const efficiency = activeWorkersCount > 0 ? (totalActualToday / activeWorkersCount).toFixed(1) : '0';

    return {
      spi: parseFloat(spi),
      efficiency: parseFloat(efficiency),
      isBehind: parseFloat(spi) < 0.95,
      isAhead: parseFloat(spi) > 1.05
    };
  }, [projects, workItems, activities, progressUpdates, workers, totalActualToday]);

  // 9. Resource Distribution Metrics
  const resourceDistribution = useMemo(() => {
    return projects.map(p => {
      const projectActivities = activities.filter(a => 
        workItems.some(wi => wi.id === a.workItemId && wi.projectId === p.id)
      );
      const pWorkersCount = new Set(projectActivities.flatMap(a => a.workerIds)).size;
      const pEquipmentCount = new Set(projectActivities.flatMap(a => a.equipmentIds)).size;
      
      return {
        name: isRtl ? p.nameAr : p.nameEn,
        workers: pWorkersCount,
        machinery: pEquipmentCount,
        intensity: pWorkersCount + (pEquipmentCount * 2) // Weighted score
      };
    }).sort((a, b) => b.intensity - a.intensity);
  }, [projects, activities, workItems, isRtl]);

    // 10. Safety & Compliance Stats
    const safetyStats = useMemo(() => {
      const filteredSafety = selectedProjectId === 'all' ? safetyRecords : safetyRecords.filter(r => r.projectId === selectedProjectId);
      const issues_count = issues.filter(i => (selectedProjectId === 'all' || i.projectId === selectedProjectId) && !i.isApproved).length;
      
      const totalViolations = filteredSafety.reduce((sum, r) => sum + r.violationsCount, 0);
      const unsafeRecords = filteredSafety.filter(r => !r.isSafe).length;
      
      return {
        incidents: unsafeRecords,
        inspections: filteredSafety.length,
        score: filteredSafety.length > 0 ? Math.max(0, 100 - (totalViolations * 10)) : 100,
        openIssues: issues_count,
        ltiRate: (unsafeRecords / (workers.length || 1) * 1000).toFixed(2)
      };
    }, [safetyRecords, issues, selectedProjectId, workers]);

    // 11. Productivity & Capacity Analysis
    const productivityAnalysis = useMemo(() => {
      const totalUnitsToday = totalActualToday;
      const totalManHours = workers.filter(w => w.status === 'Active').length * 8;
      const unitsPerManHour = totalManHours > 0 ? (totalUnitsToday / totalManHours).toFixed(2) : '0';
      
      return {
        manHours: totalManHours,
        efficiency: unitsPerManHour,
        capacityUtilization: Math.round((totalActualToday / (totalDailyTarget || 1)) * 100)
      };
    }, [totalActualToday, totalDailyTarget, workers]);

  // 12. Detailed Progress Audit Log for Report
  const detailedProgressLog = useMemo(() => {
    // Sort updates by timestamp to calculate cumulative progress correctly
    const sortedUpdates = [...filteredUpdates].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const activityProgressMap: Record<string, number> = {};

    return sortedUpdates.map(upd => {
      const activity = activities.find(a => a.id === upd.activityId);
      const totalQty = activity?.totalQuantity || 0;
      
      // Track progress for this activity
      activityProgressMap[upd.activityId] = (activityProgressMap[upd.activityId] || 0) + upd.completedQuantity;
      
      const currentProgress = activityProgressMap[upd.activityId];
      const remaining = Math.max(0, totalQty - currentProgress);

      return {
        ...upd,
        activityName: isRtl ? activity?.nameAr : activity?.nameEn,
        unit: activity?.unit,
        remaining,
        totalQty
      };
    }).reverse(); // Show latest first in the log
  }, [filteredUpdates, activities, isRtl]);

  const handlePrint = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      let printFrame = document.getElementById('kpi-report-pdf-iframe') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'kpi-report-pdf-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '-9999px';
        printFrame.style.bottom = '0';
        printFrame.style.width = '1000px';
        printFrame.style.height = '1200px';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
      }

      // We'll capture the .modern-report-container content
      const reportElement = document.querySelector('.modern-report-container');
      if (!reportElement) {
        alert(isRtl ? 'لم يتم العثور على محتوى التقرير' : 'Report content not found');
        return;
      }

      // We'll wrap it in a proper HTML doc with styles
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="${isRtl ? 'rtl' : 'ltr'}">
        <head>
            <meta charset="utf-8">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; }
                body { 
                  font-family: 'Inter', sans-serif; 
                  margin: 0; 
                  padding: 20px; 
                  background: white; 
                  color: #111827;
                }
                .num-font, font-mono { 
                  font-family: 'JetBrains Mono', monospace !important; 
                  font-variant-numeric: tabular-nums;
                }
                table { 
                  width: 100% !important; 
                  table-layout: fixed !important; 
                  border-collapse: collapse !important; 
                }
                th, td { 
                  word-wrap: break-word !important; 
                  overflow-wrap: break-word !important;
                }
                .print-hidden, .print\\:hidden { display: none !important; }
                .modern-report-container { width: 100% !important; max-width: 100% !important; padding: 0 !important; }
                
                /* Ensure all tables in the report fill width */
                .modern-report-container table { width: 100% !important; }
                
                /* Force numbers to use mono font in common table cells */
                td.num-font, td[class*="font-mono"], .num-font, .font-mono {
                  font-family: 'JetBrains Mono', monospace !important;
                }
            </style>
        </head>
        <body>
          <div id="pdf-capture-root">
            ${reportElement.innerHTML}
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

      // Wait for fonts and charts to settle
      await new Promise(resolve => setTimeout(resolve, 2000));

      const captureElement = frameDoc.getElementById('pdf-capture-root');
      const opt = {
        margin:       [10, 10, 10, 10] as [number, number, number, number],
        filename:     `KPI_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(captureElement).save();
      });
      
    } catch (err) {
      console.error("KPI PDF Generation failed:", err);
      alert(isRtl ? 'فشل في استخراج التقرير بصيغة PDF' : 'Failed to export PDF report');
    }
  };

  // Generate Automated Recommendations based on real-time data
  const recommendations = useMemo(() => {
    const recs = [];
    
    // Check materials
    if (lowStockMaterialsCount > 0) {
      recs.push({
        priority: 'High',
        msgAr: `يوجد عدد (${lowStockMaterialsCount}) مواد تحت حد الأمان. يوصى ببدء إجراءات الشراء فوراً لتجنب توقف العمل.`,
        msgEn: `There are (${lowStockMaterialsCount}) materials below safety threshold. Urgent procurement is recommended.`
      });
    }

    // Check equipment
    const maintenanceCount = equipment.filter(eq => eq.status === 'Under Maintenance').length;
    if (maintenanceCount > equipment.length * 0.2) {
      recs.push({
        priority: 'Medium',
        msgAr: `أكثر من 20% من الأسطول قيد الصيانة. يوصى بمراجعة خطط الصيانة الوقائية أو استئجار معدات بديلة.`,
        msgEn: `Over 20% of the fleet is under maintenance. Review preventive maintenance or consider rental units.`
      });
    }

    // Check progress
    projects.forEach(p => {
      if (p.status === 'Delayed') {
        recs.push({
          priority: 'High',
          msgAr: `مشروع (${p.nameAr}) متأخر عن الجدول الزمني. يوصى بزيادة الورديات أو إعادة تخصيص الموارد.`,
          msgEn: `Project (${p.nameEn}) is delayed. Recommended to increase shifts or reallocate resources.`
        });
      }
    });

    if (recs.length === 0) {
      recs.push({
        priority: 'Low',
        msgAr: 'جميع العمليات مستقرة وتعمل بكفاءة عالية ضمن الحدود المخطط لها.',
        msgEn: 'All operations are stable and highly efficient within planned thresholds.'
      });
    }

    return recs;
  }, [lowStockMaterialsCount, equipment, projects]);

  const themeStyles = {
    navy: {
      primary: '#0B3D91',
      primaryHover: '#082a63',
      secondary: '#0080FF',
      textPrimary: 'text-[#0B3D91]',
      borderPrimary: 'border-[#0B3D91]',
      bgPrimary: 'bg-[#0B3D91]',
      bgLight: 'bg-blue-50/40',
      borderLight: 'border-blue-100',
    },
    emerald: {
      primary: '#047857',
      primaryHover: '#065f46',
      secondary: '#10B981',
      textPrimary: 'text-[#047857]',
      borderPrimary: 'border-[#047857]',
      bgPrimary: 'bg-[#047857]',
      bgLight: 'bg-emerald-50/40',
      borderLight: 'border-emerald-100',
    },
    slate: {
      primary: '#334155',
      primaryHover: '#1e293b',
      secondary: '#64748b',
      textPrimary: 'text-[#334155]',
      borderPrimary: 'border-[#334155]',
      bgPrimary: 'bg-[#334155]',
      bgLight: 'bg-slate-50/40',
      borderLight: 'border-slate-200',
    },
    gold: {
      primary: '#78350F',
      primaryHover: '#451a03',
      secondary: '#D97706',
      textPrimary: 'text-[#78350F]',
      borderPrimary: 'border-[#78350F]',
      bgPrimary: 'bg-[#78350F]',
      bgLight: 'bg-amber-50/40',
      borderLight: 'border-amber-100',
    }
  };

  const currentTheme = themeStyles[reportTheme] || themeStyles.navy;
  const defaultSettingsFallback: SystemSettings = {
    companyNameEn: "Riyadh Specialized Housing Co.",
    companyNameAr: "شركة الرياض المتخصصة للإسكان",
    companyLogoUrl: "",
    officialStampUrl: "",
    companyPhone: "+966 11 456 7890",
    companyEmail: "info@rshc.com.sa",
    officialAddressEn: "Olaya District, Riyadh, KSA",
    officialAddressAr: "حي العليا، الرياض، المملكة العربية السعودية",
    commercialRegistration: "1010987654",
    taxNumber: "300098765400003",
    companyWebsite: "www.rshc.com.sa",
    managerNameEn: "Eng. Fahad Al-Otaibi",
    managerNameAr: "م. فهد العتيبي",
    managerSignature: "",
    reportTemplateType: "Executive"
  };

  const activeSettings = settings || defaultSettingsFallback;
  const showAr = reportLang === 'ar' || reportLang === 'both';
  const showEn = reportLang === 'en' || reportLang === 'both';

  return (
    <div id="kpi-dashboard-root" className="space-y-6">
      {/* 1. OFFICIAL REPORT TEMPLATE (Visible in Report Mode or Print) */}
      {(isReportMode || typeof window !== 'undefined') && (
        <div className={`modern-report-container print-block ${isReportMode ? 'block bg-gray-50 p-4 md:p-8 rounded-3xl border border-gray-200 shadow-sm' : 'hidden'} print:block print:p-8 bg-white text-black font-sans min-h-screen`}>
          {/* CONTROL STATION BAR WITH THE DROPDOWN MENU SYSTEM (Hidden in Print) */}
          {isReportMode && (
            <div className="mb-8 print:hidden bg-slate-900 text-white p-5 rounded-2xl shadow-xl border border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/30">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm tracking-tight">{isRtl ? 'لوحة تحكم وتخصيص التقرير التنفيذي' : 'Executive Report Customization Station'}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{isRtl ? 'قم بتعديل وتصفية المكونات آلياً قبل التصدير' : 'Configure layout, filters, & themes in real-time'}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <button 
                    onClick={() => setIsReportMode(false)}
                    className="bg-white/10 hover:bg-white/20 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/5"
                  >
                    {isRtl ? 'العودة للوحة البيانات' : 'Back to Dashboard'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      const tempReport: SavedKpiReport = {
                        id: 'temp',
                        reportNumber: `KPI-LIVE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
                        reportDate: new Date().toISOString().slice(0, 10),
                        projectId: selectedProjectId,
                        projectNameEn: selectedProjectId === 'all' ? 'Enterprise Wide' : (activeProject?.nameEn || ''),
                        projectNameAr: selectedProjectId === 'all' ? 'كافة المشاريع والعمليات' : (activeProject?.nameAr || ''),
                        targetQuantity: totalDailyTarget,
                        actualQuantity: totalActualToday,
                        attendanceRate: attendanceStats.rate,
                        presentWorkers: attendanceStats.present,
                        absentWorkers: attendanceStats.absent,
                        efficiency: productivityAnalysis.efficiency,
                        safetyScore: safetyStats.score,
                        openIssuesCount: safetyStats.openIssues,
                        capacityUtilization: productivityAnalysis.capacityUtilization,
                        supervisorNotes: notesInput || (isRtl ? 'جميع مؤشرات الأداء تسير حسب الخطة المعتمدة.' : 'All performance indices are running in accordance with the approved baseline.'),
                        createdByName: currentUser?.name || 'Supervisor',
                        timestamp: new Date().toISOString()
                      };
                      exportKpiToExcel(tempReport, isRtl, settings);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {isRtl ? 'تصدير كـ Excel' : 'Export Live Excel'}
                  </button>
                  <button 
                    type="button"
                    onClick={handlePrint}
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg transition-all flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    {isRtl ? 'تصدير وحفظ كـ (PDF)' : 'Confirm Print & Save PDF'}
                  </button>
                </div>
              </div>

              {/* THE DROPDOWN MENU SYSTEM */}
              <div className="mt-4 pt-4 flex flex-wrap gap-3 items-center text-xs">
                {/* Dropdown 1: Project Scope */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setActiveDropdown(prev => prev === 'project' ? null : 'project')}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isRtl ? 'المشروع:' : 'Project:'} </span>
                    <span className="text-blue-400 font-extrabold truncate max-w-[120px]">
                      {selectedProjectId === 'all' 
                        ? (isRtl ? 'كافة المشاريع' : 'All Projects') 
                        : (isRtl ? activeProject?.nameAr : activeProject?.nameEn)}
                    </span>
                  </button>
                  {activeDropdown === 'project' && (
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 text-slate-800">
                      <button
                        type="button"
                        onClick={() => { setSelectedProjectId('all'); setActiveDropdown(null); }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between text-xs font-bold ${selectedProjectId === 'all' ? 'text-blue-900 bg-blue-50/50' : 'text-gray-750'}`}
                      >
                        <span>{isRtl ? 'كافة المشاريع والعمليات' : 'Enterprise Wide (All)'}</span>
                        {selectedProjectId === 'all' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </button>
                      <div className="h-px bg-gray-100 my-1"></div>
                      {projects.map((proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => { setSelectedProjectId(proj.id); setActiveDropdown(null); }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between text-xs font-bold ${selectedProjectId === proj.id ? 'text-blue-900 bg-blue-50/50' : 'text-gray-750'}`}
                        >
                          <span className="truncate max-w-[200px]">{isRtl ? proj.nameAr : proj.nameEn}</span>
                          {selectedProjectId === proj.id && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropdown 2: Sections Filter */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setActiveDropdown(prev => prev === 'sections' ? null : 'sections')}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
                  >
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isRtl ? 'الأقسام المعروضة' : 'Report Sections'}</span>
                    <span className="bg-purple-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full ml-1">
                      {Object.values(reportSections).filter(Boolean).length}
                    </span>
                  </button>
                  {activeDropdown === 'sections' && (
                    <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-50 text-slate-800 space-y-1">
                      <div className="text-[10px] font-black text-gray-400 uppercase pb-2 px-1 border-b border-gray-50">
                        {isRtl ? 'تخصيص مكونات التقرير' : 'Toggle Visible Sections'}
                      </div>
                      {[
                        { key: 'operational', label: isRtl ? 'ملخص العمليات والمؤشرات' : 'Operational Summary' },
                        { key: 'strategic', label: isRtl ? 'التوصيات الاستراتيجية' : 'Strategic Recommendations' },
                        { key: 'risk', label: isRtl ? 'تحليل المخاطر وسلاسل الإمداد' : 'Risk & Supply Chain' },
                        { key: 'portfolio', label: isRtl ? 'تحليل محفظة المشاريع' : 'Project Portfolio Analysis' },
                        { key: 'attendance', label: isRtl ? 'سجل حضور الموظفين' : 'Daily Attendance Log' },
                        { key: 'audit', label: isRtl ? 'سجل تدقيق الإنجاز (كل ساعتين)' : 'Field Production Audit' },
                        { key: 'remarks', label: isRtl ? 'ملاحظات وتوجيهات الإدارة' : 'Executive Directives' },
                        { key: 'signatures', label: isRtl ? 'التواقيع والاعتمادات الرسمية' : 'Signatures & Stamp Block' }
                      ].map((sec) => (
                        <label 
                          key={sec.key} 
                          className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg cursor-pointer text-xs font-bold text-gray-700 transition-all"
                        >
                          <input 
                            type="checkbox"
                            checked={reportSections[sec.key as keyof typeof reportSections]}
                            onChange={() => setReportSections(prev => ({ ...prev, [sec.key]: !prev[sec.key as keyof typeof reportSections] }))}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          />
                          <span>{sec.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropdown 3: Theme Selector */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setActiveDropdown(prev => prev === 'theme' ? null : 'theme')}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isRtl ? 'تنسيق الهوية:' : 'Branding Theme:'}</span>
                    <span className="uppercase font-black text-amber-400 ml-1">
                      {reportTheme === 'navy' ? (isRtl ? 'كحلي' : 'Navy') : reportTheme === 'emerald' ? (isRtl ? 'أخضر' : 'Emerald') : reportTheme === 'slate' ? (isRtl ? 'رمادي' : 'Slate') : (isRtl ? 'ذهبي' : 'Gold')}
                    </span>
                  </button>
                  {activeDropdown === 'theme' && (
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 z-50 text-slate-800">
                      {[
                        { id: 'navy', label: isRtl ? 'الأزرق الملكي الرسمي' : 'Executive Navy', color: 'bg-[#0B3D91]' },
                        { id: 'emerald', label: isRtl ? 'الأخضر الإنشائي' : 'Emerald Green', color: 'bg-[#047857]' },
                        { id: 'slate', label: isRtl ? 'الرمادي التقني' : 'Steel Slate', color: 'bg-[#334155]' },
                        { id: 'gold', label: isRtl ? 'الذهبي الفاخر' : 'Premium Gold', color: 'bg-[#78350F]' }
                      ].map((themeOpt) => (
                        <button
                          key={themeOpt.id}
                          type="button"
                          onClick={() => { setReportTheme(themeOpt.id as any); setActiveDropdown(null); }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2.5 text-xs font-bold ${reportTheme === themeOpt.id ? 'text-blue-900 bg-blue-50/50' : 'text-gray-700'}`}
                        >
                          <span className={`w-3 h-3 rounded-full ${themeOpt.color}`}></span>
                          <span>{themeOpt.label}</span>
                          {reportTheme === themeOpt.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropdown 4: Validation Stamps */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setActiveDropdown(prev => prev === 'validation' ? null : 'validation')}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isRtl ? 'الختم والتوقيع:' : 'Stamps & Signatures:'}</span>
                    <span className="font-black text-emerald-400 ml-1">
                      {validationMode === 'all' ? (isRtl ? 'الكل' : 'All') : validationMode === 'sig' ? (isRtl ? 'تواقيع فقط' : 'Signatures Only') : (isRtl ? 'بدون' : 'Draft')}
                    </span>
                  </button>
                  {activeDropdown === 'validation' && (
                    <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 z-50 text-slate-800">
                      {[
                        { id: 'all', label: isRtl ? 'إدراج الختم الرسمي والتواقيع' : 'Include Official Stamp & Signatures' },
                        { id: 'sig', label: isRtl ? 'تواقيع الإدارة فقط (بدون الختم)' : 'Signatures Only (No Seal)' },
                        { id: 'none', label: isRtl ? 'بدون مصادقة (نسخة مسودة)' : 'No Validation (Draft Mark)' }
                      ].map((vMode) => (
                        <button
                          key={vMode.id}
                          type="button"
                          onClick={() => { setValidationMode(vMode.id as any); setActiveDropdown(null); }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between text-xs font-bold ${validationMode === vMode.id ? 'text-blue-900 bg-blue-50/50' : 'text-gray-700'}`}
                        >
                          <span>{vMode.label}</span>
                          {validationMode === vMode.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropdown 5: Language Mode */}
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setActiveDropdown(prev => prev === 'lang' ? null : 'lang')}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
                    <span>{isRtl ? 'لغة التقرير:' : 'Language:'}</span>
                    <span className="uppercase font-black text-teal-400 ml-1">
                      {reportLang === 'ar' ? (isRtl ? 'عربي' : 'Arabic') : reportLang === 'en' ? (isRtl ? 'إنجليزي' : 'English') : (isRtl ? 'ثنائي اللغة' : 'Dual (AR/EN)')}
                    </span>
                  </button>
                  {activeDropdown === 'lang' && (
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 z-50 text-slate-800">
                      {[
                        { id: 'both', label: isRtl ? 'ثنائي اللغة (عربي/إنجليزي)' : 'Dual Language (AR/EN)' },
                        { id: 'ar', label: isRtl ? 'اللغة العربية فقط' : 'Arabic Only' },
                        { id: 'en', label: isRtl ? 'اللغة الإنجليزية فقط' : 'English Only' }
                      ].map((lOpt) => (
                        <button
                          key={lOpt.id}
                          type="button"
                          onClick={() => { setReportLang(lOpt.id as any); setActiveDropdown(null); }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between text-xs font-bold ${reportLang === lOpt.id ? 'text-blue-900 bg-blue-50/50' : 'text-gray-700'}`}
                        >
                          <span>{lOpt.label}</span>
                          {reportLang === lOpt.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="max-w-4xl mx-auto bg-white p-2 md:p-10 shadow-sm print:shadow-none">
            {/* CORPORATE HEADER */}
            <div className="flex justify-between items-start pb-6 mb-8 border-b-2 border-gray-200">
              {/* Left Side: ALSALMAN Logo */}
              <div className="flex items-center gap-4">
                <svg viewBox="0 0 100 80" className="h-16 w-auto shrink-0 animate-fade-in" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left vertical-ish thick angled stem */}
                  <path d="M15 10 L30 10 L20 70 L5 70 Z" fill="#9E1B1B" />
                  {/* Top right arm */}
                  <path d="M25 42 L65 10 L85 10 L38 48 Z" fill="#9E1B1B" />
                  {/* Bottom right arm */}
                  <path d="M32 40 L72 70 L92 70 L45 35 Z" fill="#9E1B1B" />
                </svg>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-black text-[#0B1936] uppercase tracking-tight leading-none">ALSALMAN</h1>
                  <p className="text-sm font-semibold text-slate-500 tracking-wide mt-0.5 leading-none">Trading company</p>
                  <p className="text-[9px] font-medium text-slate-400 mt-1 leading-none">شركة خليفة السلمان التجارية</p>
                </div>
              </div>
              
              {/* Right Side: Document Reference & Date */}
              <div className="text-right">
                <h2 className="text-3xl font-black text-[#9E1B1B] uppercase tracking-tight leading-none mb-1">KPIs report</h2>
                <div className="text-sm font-semibold text-slate-500">Rfr: {reportNumberInput || "20981-A68"}</div>
                <div className="text-sm font-semibold text-slate-500">
                  Date: {(() => {
                    const d = sysNow;
                    const day = String(d.getDate()).padStart(2, '0');
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const year = d.getFullYear();
                    return `${day}/${month}/${year}`;
                  })()}
                </div>
              </div>
            </div>


            {/* 2. DYNAMIC PROJECT METADATA DETAILS BLOCK */}
            <div className="p-6 rounded-xl mb-8 bg-[#F4F5F7]">
              <h4 className="text-xs font-extrabold uppercase tracking-wider mb-4 text-[#9E1B1B]">
                {isRtl ? 'بيانات ومعلومات المشروع وفترة الأساس' : 'PROJECT REFERENCE & BAESLINE DATE'}
              </h4>
              <div className="grid grid-cols-2 gap-y-4 gap-x-12 text-left">
                <div>
                  <span className="block text-[9px] text-gray-500 font-extrabold uppercase tracking-wider mb-0.5">
                    {isRtl ? 'تصفية النطاق' : 'SCOP FILTER'}
                  </span>
                  <span className="font-black text-gray-850 text-sm">
                    {activeProject ? (isRtl ? activeProject.nameAr : activeProject.nameEn) : (isRtl ? "كامل المحفظة" : "N/A")}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-gray-500 font-extrabold uppercase tracking-wider mb-0.5">
                    {isRtl ? 'المشروع المدمج' : 'AGGREGATED PROJECT'}
                  </span>
                  <span className="font-black text-gray-850 text-sm">
                    {activeProject ? activeProject.projectNumber : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-gray-500 font-extrabold uppercase tracking-wider mb-0.5">
                    {isRtl ? 'نطاق العمالة النشطة' : 'ACTIVATE MANPOWER SCOPE'}
                  </span>
                  <span className="font-black text-gray-850 text-sm">
                    {workers.length > 0 ? `${workers.filter(w => w.status === 'Active').length} Personnel` : "5 Personnel"}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-gray-500 font-extrabold uppercase tracking-wider mb-0.5">
                    {isRtl ? 'حالة جاهزية الأسطول' : 'OVERALL FLEET STATUS'}
                  </span>
                  <span className="font-black text-gray-850 text-sm">
                    {equipment.length > 0 ? `${Math.round((equipment.filter(eq => eq.status !== 'Under Maintenance').length / (equipment.length || 1)) * 100)}% Readiness` : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. SECTION: OPERATIONAL SUMMARY */}
            {reportSections.operational && (
              <div className="mb-8">
                <h3 className="text-xs font-extrabold uppercase pb-1.5 mb-4 border-b border-[#9E1B1B] text-[#9E1B1B]">
                  {isRtl ? 'ملخص العمليات والتشغيل الميداني' : 'OPERATIONAL SUMMARY'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0 text-left">
                  {/* Left Column (4 items) */}
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-xs text-gray-700">
                      <span className="font-semibold text-gray-500">{isRtl ? 'سياق التقرير' : 'Report context'}</span>
                      <span className="font-extrabold">
                        {selectedProjectId === 'all' ? (isRtl ? 'كافة المشاريع والعمليات' : 'Enterprise Wide') : (isRtl ? activeProject?.nameAr : activeProject?.nameEn) || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-xs text-gray-700">
                      <span className="font-semibold text-gray-500">{isRtl ? 'مؤشر كفاءة الجدول (SPI)' : 'Schedule Perf.index (SPI)'}</span>
                      <span className="font-extrabold">{advancedMetrics.spi || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-xs text-gray-700">
                      <span className="font-semibold text-gray-500">{isRtl ? 'مؤشر سلامة وصحة الموقع' : 'HSE health index'}</span>
                      <span className="font-extrabold">{safetyStats.score ? `${safetyStats.score}%` : "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-xs text-gray-700">
                      <span className="font-semibold text-gray-500">{isRtl ? 'مخرجات الأعمال السابقة' : 'Output pre work'}</span>
                      <span className="font-extrabold">N/A</span>
                    </div>
                  </div>

                  {/* Right Column (6 items) */}
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-xs text-gray-700">
                      <span className="font-semibold text-gray-500">{isRtl ? 'جاهزية المعدات' : 'Fleet Readiness'}</span>
                      <span className="font-extrabold">
                        {equipment.length > 0 ? `${Math.round((equipment.filter(eq => eq.status !== 'Under Maintenance').length / (equipment.length || 1)) * 100)}%` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-xs text-gray-700">
                      <span className="font-semibold text-gray-500">{isRtl ? 'مؤشر أمن المخزون والقطع' : 'Stock Security index'}</span>
                      <span className="font-extrabold">
                        {materials.length > 0 ? `${Math.round(((materials.length - lowStockMaterialsCount) / (materials.length || 1)) * 100)}%` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-xs text-gray-700">
                      <span className="font-semibold text-gray-500">{isRtl ? 'إجمالي ساعات العمل/يوم' : 'Total manpower -hr/Day'}</span>
                      <span className="font-extrabold">{productivityAnalysis.manHours ? `${productivityAnalysis.manHours} hr/Day` : "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-xs text-gray-700">
                      <span className="font-semibold text-gray-500">{isRtl ? 'مؤشر كفاءة العمل الميداني' : 'Labor Efficiency index'}</span>
                      <span className="font-extrabold">{productivityAnalysis.efficiency ? `${productivityAnalysis.efficiency} pts` : "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-xs text-gray-700">
                      <span className="font-semibold text-gray-500">{isRtl ? 'انحراف التكلفة المالي (CV)' : 'CV(cost variance)'}</span>
                      <span className="font-extrabold text-emerald-600 font-mono">+12.4%</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 text-xs text-gray-700">
                      <span className="font-semibold text-gray-500">{isRtl ? 'معدل الحوادث (LTIFR)' : 'Incident rate (LTIFR)'}</span>
                      <span className="font-extrabold">{safetyStats.ltiRate || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3.5 SECTION: STRATEGIC DECISION & RECOMMENDATIONS */}
            {reportSections.strategic && (
              <div className="mb-8 text-left">
                <h3 className="text-xs font-extrabold uppercase pb-1.5 mb-4 border-b border-[#9E1B1B] text-[#9E1B1B]">
                  {isRtl ? 'القرارات والتوصيات الاستراتيجية المعتمدة' : 'STRATEGIC DECISION & RECOMMENDATIONS'}
                </h3>
                <div className="space-y-2 text-xs font-bold text-gray-700">
                  {recommendations.length > 0 ? (
                    recommendations.map((rec, idx) => (
                      <p key={idx} className="leading-relaxed">
                        • {isRtl ? rec.msgAr : rec.msgEn}
                      </p>
                    ))
                  ) : (
                    <>
                      <p>• N/A</p>
                      <p>• N/A</p>
                    </>
                  )}
                  {notesInput && (
                    <div className="mt-3 border-t border-dashed border-gray-200 pt-3 text-gray-600">
                      <p className="font-black text-[#9E1B1B] uppercase text-[9px] mb-1">{isRtl ? 'توجيهات الإشراف الإضافية:' : 'Supervisor Directives:'}</p>
                      <p className="italic font-semibold">{notesInput}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. SECTION: RISK & SUPPLY CHAIN ANALYSIS */}
            {reportSections.risk && (
              <div className="mb-8 text-left">
                <h3 className="text-xs font-extrabold uppercase pb-1.5 mb-4 border-b border-[#9E1B1B] text-[#9E1B1B]">
                  {isRtl ? 'تحليل مخاطر سلاسل التوريد والجاهزية' : 'RISK & SUPPLY CHAIN ANALYSIS'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-[#F4F5F7] rounded-lg">
                    <div className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
                      {isRtl ? 'كثافة العمالة والموظفين' : 'LABOR CAPACITY'}
                    </div>
                    <div className="text-lg font-black text-[#9E1B1B]">
                      {workers.filter(w => w.status === 'Active').length || 5} {isRtl ? 'موظف نشط' : 'Personnel'}
                    </div>
                  </div>
                  <div className="p-5 bg-[#F4F5F7] rounded-lg">
                    <div className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
                      {isRtl ? 'عجز التوريدات والمواد' : 'SUPPLY DEFICITS'}
                    </div>
                    <div className="text-lg font-black text-[#9E1B1B]">
                      {lowStockMaterialsCount || 3} {isRtl ? 'مواد حرجة' : 'Items'}
                    </div>
                  </div>
                  <div className="p-5 bg-[#F4F5F7] rounded-lg">
                    <div className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
                      {isRtl ? 'مؤشر تدقيق السلامة الموقعية' : 'SAFETY AUDITS INDEX'}
                    </div>
                    <div className="text-lg font-black text-[#9E1B1B]">
                      {safetyStats.score || 100}%
                    </div>
                  </div>
                  <div className="p-5 bg-[#F4F5F7] rounded-lg">
                    <div className="text-[9px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
                      {isRtl ? 'معدل استغلال القدرات المتاحة' : 'CAPACITY UTILISATION'}
                    </div>
                    <div className="text-lg font-black text-[#9E1B1B]">
                      {productivityAnalysis.capacityUtilization || 0}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SECTION: PROJECT PORTFOLIO PERFORMANCE ANALYSIS */}
            {reportSections.portfolio && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 text-right rtl:text-right ltr:text-left">
                  
                  {/* Resource Allocation List */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase border-b pb-1.5 flex items-center gap-1.5" style={{ color: currentTheme.primary, borderColor: currentTheme.primary + '30' }}>
                      <Users className="w-4 h-4" />
                      {isRtl ? 'توزيع الموارد البشرية والمعدات' : 'Resource Allocation Analysis'}
                    </h3>
                    <div className="space-y-2">
                      {resourceDistribution.slice(0, 4).map((rd, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                          <span className="font-bold text-gray-700">{rd.name}</span>
                          <div className="flex gap-4">
                            <span className="flex items-center gap-1 font-mono text-[11px]"><Users className="w-3.5 h-3.5 text-blue-500" /> {rd.workers}</span>
                            <span className="flex items-center gap-1 font-mono text-[11px]"><Wrench className="w-3.5 h-3.5 text-amber-500" /> {rd.machinery}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Delays list */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase border-b pb-1.5 flex items-center gap-1.5" style={{ color: currentTheme.primary, borderColor: currentTheme.primary + '30' }}>
                      <AlertTriangle className="w-4 h-4" />
                      {isRtl ? 'أبرز معوقات العمل النشطة' : 'Critical Active Delays'}
                    </h3>
                    <div className="space-y-2">
                      {delays.slice(0, 3).map((delay, idx) => (
                        <div key={idx} className="text-[10px] p-2.5 border border-rose-100 bg-rose-50/20 rounded-lg">
                          <div className="flex justify-between mb-1 items-center">
                            <span className="font-black text-rose-600 uppercase text-[9px] tracking-wide">{delay.delayType}</span>
                            <span className="font-extrabold px-1.5 py-0.5 rounded text-[8px] bg-rose-50 text-rose-700 border border-rose-100">{delay.impactLevel} {isRtl ? 'تأثير' : 'Impact'}</span>
                          </div>
                          <p className="text-gray-600 font-semibold">{isRtl ? delay.reasonAr : delay.reasonEn}</p>
                        </div>
                      ))}
                      {delays.length === 0 && (
                        <div className="text-xs text-gray-400 italic py-6 text-center border border-dashed border-gray-150 rounded-lg">{isRtl ? 'لا توجد معوقات تشغيلية حرجة مسجلة حالياً' : 'No critical operational delays registered.'}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detailed Portfolio Table */}
                <div className="space-y-4 mb-10 text-right rtl:text-right ltr:text-left">
                  <h3 className="text-xs font-black uppercase border-b pb-1.5 flex items-center gap-1.5" style={{ color: currentTheme.primary, borderColor: currentTheme.primary + '30' }}>
                    <TrendingUp className="w-4 h-4" />
                    {isRtl ? 'تحليل أداء محفظة المشاريع التفصيلي' : 'Project Portfolio Performance'}
                  </h3>
                  <div className="overflow-x-auto border border-gray-150 rounded-xl">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 text-[9px] uppercase font-black text-gray-500 border-b border-gray-150">
                          <th className="p-3 text-right">{isRtl ? 'اسم وموقع المشروع العقاري' : 'Project Title & Location'}</th>
                          <th className="p-3 text-center">{isRtl ? 'المخطط له %' : 'Planned %'}</th>
                          <th className="p-3 text-center">{isRtl ? 'الفعلي المنجز %' : 'Actual %'}</th>
                          <th className="p-3 text-center">{isRtl ? 'الانحراف الزمني' : 'Schedule Variance'}</th>
                          <th className="p-3 text-center">{isRtl ? 'القوى البشرية' : 'Labor Count'}</th>
                          <th className="p-3 text-center">{isRtl ? 'أسطول المعدات' : 'Fleet Status'}</th>
                          <th className="p-3 text-center">{isRtl ? 'أحداث السلامة' : 'HSE Alerts'}</th>
                          <th className="p-3 text-left">{isRtl ? 'الحالة التشغيلية' : 'Control Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {projectMetricsData.map((p, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/20">
                            <td className="p-3 text-right">
                              <div className="font-black text-gray-850">{p.name}</div>
                              {p.reasons.length > 0 && (
                                <div className="text-[8px] text-rose-500 font-bold mt-1">
                                  {p.reasons.map((r, i) => (
                                    <div key={i} className="flex items-center gap-1">
                                      <span className="w-1 h-1 bg-rose-500 rounded-full"></span>
                                      {r}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-gray-400 font-mono">{p.Planned}%</td>
                            <td className="p-3 text-center font-black font-mono text-gray-800">{p.Actual}%</td>
                            <td className={`p-3 text-center font-black font-mono ${p.Actual - p.Planned < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {p.Actual - p.Planned > 0 ? `+${p.Actual - p.Planned}` : p.Actual - p.Planned}%
                            </td>
                            <td className="p-3 text-center font-bold text-blue-600 font-mono">{p.workers}</td>
                            <td className="p-3 text-center font-bold text-amber-500 font-mono">{p.machinery}</td>
                            <td className={`p-3 text-center font-bold font-mono ${p.safety > 0 ? 'text-rose-600' : 'text-gray-400'}`}>{p.safety}</td>
                            <td className="p-3 text-left">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                p.status === 'Active' || p.status === 'On Track' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                                p.status === 'Delayed' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-gray-50 text-gray-650'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-5 mt-2 text-[8px] font-extrabold text-gray-400 uppercase">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      {isRtl ? 'أداء ضمن الحدود المسموح بها' : 'Stable / Optimal Progress'}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      {isRtl ? 'حالة تأخر حرجة تتطلب معالجة' : 'Critical Delayed / Needs Re-baselining'}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 6. SECTION: DAILY PERSONNEL WORKFORCE ATTENDANCE REGULAR */}
            {reportSections.attendance && (
              <div className="space-y-4 mb-10 text-right rtl:text-right ltr:text-left">
                <h3 className="text-xs font-black uppercase border-b pb-1.5 flex items-center gap-1.5" style={{ color: currentTheme.primary, borderColor: currentTheme.primary + '30' }}>
                  <Users className="w-4 h-4" />
                  {isRtl ? 'كشف حضور وتحضير الموظفين والعمالة اليومية الميدانية' : 'Daily Personnel & Field Workforce Attendance Register'}
                </h3>
                <div className="overflow-x-auto border border-gray-150 rounded-xl">
                  <table className="w-full text-[10px] text-right">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase font-black border-b border-gray-150">
                        <th className="p-2.5 text-right">{isRtl ? 'تاريخ الحضور' : 'Date'}</th>
                        <th className="p-2.5 text-right">{isRtl ? 'اسم الموظف الميداني' : 'Employee / Worker Name'}</th>
                        <th className="p-2.5 text-right">{isRtl ? 'المهنة والوظيفة' : 'Profession'}</th>
                        <th className="p-2.5 text-center">{isRtl ? 'الحالة اليومية' : 'Status'}</th>
                        <th className="p-2.5 text-center">{isRtl ? 'مواعيد العمل (البداية والنهاية)' : 'Working Hours'}</th>
                        <th className="p-2.5 text-center">{isRtl ? 'مدة الاستراحة' : 'Break Duration'}</th>
                        <th className="p-2.5 text-center">{isRtl ? 'نوع المناوبة (الشفت)' : 'Shift Schedule'}</th>
                        <th className="p-2.5 text-right">{isRtl ? 'ملاحظات المشرف' : 'HSE/Supervisor Notes'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-400 italic font-bold">
                            {isRtl ? 'لا توجد سجلات حضور مسجلة حالياً لهذا المشروع أو الفئة.' : 'No compliance attendance logs registered for this project yet.'}
                          </td>
                        </tr>
                      ) : (
                        filteredAttendance.map(rec => (
                          <tr key={rec.id} className="hover:bg-gray-50/20">
                            <td className="p-2.5 font-mono text-gray-500 text-[9px]">{rec.date}</td>
                            <td className="p-2.5 font-black text-slate-800">{rec.workerName}</td>
                            <td className="p-2.5 text-gray-600 font-bold">{isRtl ? rec.professionAr : rec.professionEn}</td>
                            <td className="p-2.5 text-center">
                              {(() => {
                                const status = rec.status || (rec.isPresent ? 'Present' : 'Absent');
                                let label = '';
                                let colorClasses = '';
                                if (status === 'Present') {
                                  label = isRtl ? 'حضور تام' : 'Present';
                                  colorClasses = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                                } else if (status === 'Absent') {
                                  label = isRtl ? 'غياب غير عذر' : 'Absent';
                                  colorClasses = 'bg-rose-50 text-rose-700 border border-rose-100';
                                } else if (status === 'Late') {
                                  label = isRtl ? 'متأخر' : 'Late';
                                  colorClasses = 'bg-amber-50 text-amber-700 border border-amber-100';
                                } else if (status === 'Sick') {
                                  label = isRtl ? 'إجازة مرضية' : 'Sick';
                                  colorClasses = 'bg-purple-50 text-purple-700 border border-purple-100';
                                } else if (status === 'AnnualLeave') {
                                  label = isRtl ? 'إجازة سنوية' : 'Annual Leave';
                                  colorClasses = 'bg-blue-50 text-blue-700 border border-blue-100';
                                } else {
                                  label = rec.isPresent ? (isRtl ? 'حاضر' : 'Present') : (isRtl ? 'غائب' : 'Absent');
                                  colorClasses = rec.isPresent ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
                                }
                                return (
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${colorClasses}`}>
                                    {label}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-2.5 text-center font-bold text-gray-700">
                              {rec.isPresent ? (
                                <div className="space-y-0.5">
                                  <div className="font-mono text-[9px]">{rec.startTime} - {rec.endTime}</div>
                                  {(() => {
                                    const hours = calculateActualHours(rec.startTime, rec.endTime);
                                    return hours !== null ? (
                                      <div className="text-[8px] text-emerald-600 font-extrabold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 inline-block">
                                        {isRtl ? `${hours} ساعات فعلية` : `${hours} hrs net`}
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-gray-500">
                              {rec.isPresent ? rec.breakTime : '-'}
                            </td>
                            <td className="p-2.5 text-center font-black text-blue-800" style={{ color: currentTheme.primary }}>
                              {rec.isPresent ? (
                                (() => {
                                  const hours = calculateActualHours(rec.startTime, rec.endTime);
                                  if (hours !== null) {
                                    return isRtl ? `مناوبة ${hours} س` : `${hours} hrs Shift`;
                                  }
                                  return rec.shiftTime;
                                })()
                              ) : '-'}
                            </td>
                            <td className="p-2.5 text-right text-gray-500 italic max-w-xs truncate font-medium">
                              {rec.notes || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. SECTION: FIELD PRODUCTION AUDIT LOG (2HR INTERVALS) */}
            {reportSections.audit && (
              <div className="space-y-4 mb-10 text-right rtl:text-right ltr:text-left">
                <h3 className="text-xs font-black uppercase border-b pb-1.5 flex items-center gap-1.5" style={{ color: currentTheme.primary, borderColor: currentTheme.primary + '30' }}>
                  <FileText className="w-4 h-4" />
                  {isRtl ? 'سجل تدقيق الإنجاز الميداني المرحلي (كل ساعتين)' : 'Field Production Audit Log (2-Hour Progress Intervals)'}
                </h3>
                <div className="overflow-x-auto border border-gray-150 rounded-xl">
                  <table className="w-full text-[10px] text-right">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase font-black border-b border-gray-150">
                        <th className="p-2.5 text-right">{isRtl ? 'وقت التدوين' : 'Timestamp'}</th>
                        <th className="p-2.5 text-right">{isRtl ? 'النشاط المنفذ' : 'Activity Executed'}</th>
                        <th className="p-2.5 text-right">{isRtl ? 'مسؤول التقرير الميداني' : 'Reported By'}</th>
                        <th className="p-2.5 text-center">{isRtl ? 'الكمية المضافة' : 'Quantity Appended'}</th>
                        <th className="p-2.5 text-center">{isRtl ? 'الكمية المتبقية' : 'Remaining To Deliver'}</th>
                        <th className="p-2.5 text-left">{isRtl ? 'نسبة الإنجاز %' : 'Achievement %'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {detailedProgressLog.slice(0, 15).map((log, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/10">
                          <td className="p-2.5 font-mono text-gray-500 text-[9px]">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <br />
                            <span className="text-[8px] text-gray-300">{new Date(log.timestamp).toLocaleDateString()}</span>
                          </td>
                          <td className="p-2.5 font-black text-slate-800">{log.activityName}</td>
                          <td className="p-2.5 italic text-gray-500 font-medium">
                            {log.reporterName || (isRtl ? 'مشرف ميداني معتمد' : 'Field Supervisor')}
                          </td>
                          <td className="p-2.5 text-center font-black text-emerald-600">
                            +{log.completedQuantity} <span className="text-[8px] font-bold text-gray-400">{log.unit}</span>
                          </td>
                          <td className="p-2.5 text-center font-black text-amber-600">
                            {log.remaining} <span className="text-[8px] font-bold text-gray-400">{log.unit}</span>
                          </td>
                          <td className="p-2.5 text-left font-bold text-gray-800">
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{log.completionPercentage}%</span>
                              <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${log.completionPercentage}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {detailedProgressLog.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-gray-450 italic font-bold">
                            {isRtl 
                              ? 'لا توجد سجلات تدقيق حتى الآن. يرجى تدوين إنجاز في نظام العمليات الميدانية للربط التلقائي.' 
                              : 'No real-time progress updates recorded yet. Submit operational units to populate logs.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 8. SECTION: EXECUTIVE OUTLOOK & TOP PMO DIRECTIVES */}
            {reportSections.remarks && (
              <div className="text-right rtl:text-right ltr:text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100/40 text-xs leading-relaxed">
                    <p className="font-bold text-blue-900 mb-2">{isRtl ? 'الرؤية والتحليل التشغيلي للمحفظة:' : 'PMO Strategic Analysis:'}</p>
                    <p className="text-gray-700 font-semibold">
                      {isRtl 
                        ? 'بناءً على مؤشرات الأداء الحالية، تظهر المحفظة استقراراً وثباتاً ممتازاً في سلاسل الإمداد وتأمين مواد البناء مع وجود بعض التأخيرات الطفيفة على المسار الحرج لبعض البنود. يوصى برفع كفاءة القوى العاملة لتعويض الانحراف الزمني.'
                        : 'Based on current baseline KPIs, the overall portfolio registers high supply chain security and material availability. Minor critical path variances exist at select milestones; PMO recommends targeted labor re-allocations.'}
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100/40 text-xs leading-relaxed">
                    <p className="font-bold text-emerald-900 mb-2">{isRtl ? 'توقعات تقدم الأعمال القادم:' : 'Schedule Variance Forecast:'}</p>
                    <p className="text-gray-700 font-semibold">
                      {isRtl 
                        ? 'من المتوقع الحفاظ على مستوى الإنتاجية الحالي بمعدل لا يقل عن ' + dailyProductivityPercentage + '% خلال الدورة التشغيلية القادمة، مع توقع زيادة في جاهزية أسطول المعدات بنسبة تتجاوز 4.5% مقارنة بالإحصائية السابقة.'
                        : 'Projections show a steady baseline progress index of ' + dailyProductivityPercentage + '% through the upcoming operational cycles. Fleet availability is expected to optimize by an additional 4.5%.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-10">
                  <h3 className="text-xs font-black uppercase border-b pb-1.5 flex items-center gap-1.5" style={{ color: currentTheme.primary, borderColor: currentTheme.primary + '30' }}>
                    <Info className="w-4 h-4" />
                    {isRtl ? 'ملاحظات وتوجيهات الإدارة العليا المعتمَدة' : 'Executive Remarks & Directives'}
                  </h3>
                  <div className="min-h-[90px] border border-gray-200 rounded-xl p-4 bg-gray-50/30 text-xs text-gray-500 italic font-semibold leading-relaxed">
                    {notesInput || (isRtl 
                      ? '... يرجى تدوين الملاحظات الاستراتيجية ليتم إدراجها آلياً وتثبيتها بالتقرير النهائي للمدير التنفيذي.' 
                      : '... No additional notes submitted. Strategic remarks can be written prior to generation.')}
                  </div>
                </div>
              </div>
            )}

            {/* 9. SECTION: EXECUTIVE AUTHORIZATION, SIGNATURES & STAMP BLOCK */}
            {reportSections.signatures && (
              <div className="mt-14 pt-8 border-t border-gray-150">
                <div className="grid grid-cols-3 gap-8 text-center">
                  
                  {/* Section 1: Project Management (And Official Corporate Stamp) */}
                  <div className="space-y-4">
                    <div className="h-20 flex items-center justify-center relative border-b border-gray-200 mx-auto w-44">
                      {validationMode === 'all' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {activeSettings.officialStampUrl ? (
                            <img 
                              src={activeSettings.officialStampUrl} 
                              alt="Official Stamp" 
                              className="h-20 w-auto object-contain mix-blend-multiply opacity-85"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full border-4 border-dashed opacity-30 flex items-center justify-center font-black text-[8px] animate-pulse" style={{ borderColor: currentTheme.primary, color: currentTheme.primary }}>
                              {isRtl ? 'الختم الرسمي' : 'OFFICIAL SEAL'}
                            </div>
                          )}
                        </div>
                      )}
                      <ShieldCheck className="w-10 h-10 text-gray-100" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-950">{isRtl ? 'إدارة المشاريع والمراقبة' : 'Project Management & Controls'}</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{isRtl ? 'الختم والمصادقة الرسمية' : 'Stamp & Verification'}</div>
                    </div>
                  </div>

                  {/* Section 2: Quality & Safety Assurance */}
                  <div className="space-y-4">
                    <div className="h-20 flex items-center justify-center relative border-b border-gray-200 mx-auto w-44">
                      <div className="absolute inset-0 flex items-center justify-center opacity-10">
                        <Fingerprint className="w-12 h-12 text-gray-900" />
                      </div>
                      <ShieldCheck className="w-8 h-8 text-emerald-500 opacity-60" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-950">{isRtl ? 'الجودة والصحة والسلامة (HSE)' : 'Quality & Safety Controls'}</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{isRtl ? 'تدقيق الجودة والسلامة' : 'HSE Audit Clear'}</div>
                    </div>
                  </div>

                  {/* Section 3: Executive Director final approval */}
                  <div className="space-y-4">
                    <div className="h-20 flex items-center justify-center relative border-b border-gray-200 mx-auto w-44">
                      {((validationMode === 'all' || validationMode === 'sig') && activeSettings.managerSignature) ? (
                        <img 
                          src={activeSettings.managerSignature} 
                          alt="Manager Signature" 
                          className="h-16 w-auto object-contain mix-blend-multiply"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        validationMode !== 'none' && (
                          <div className="font-serif text-lg italic font-black select-none text-blue-900/40" style={{ color: currentTheme.primary + '60' }}>
                            {isRtl ? activeSettings.managerNameAr : activeSettings.managerNameEn}
                          </div>
                        )
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-black text-gray-950">
                        {isRtl ? activeSettings.managerNameAr : activeSettings.managerNameEn}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        {isRtl ? 'المدير التنفيذي للشركة' : 'Executive Director'}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 10. SYSTEM RUN DETAILS / SECURE COMPLIANCE BAR */}
            <div className="mt-12 pt-4 text-center border-t border-gray-100 flex justify-between items-center text-[8px] font-bold text-gray-400 uppercase tracking-widest">
              <span>
                {isRtl ? 'تم إنشاؤه آلياً بموجب الاعتماد الرقمي للمشاريع' : 'Automated Generation - PMO Digital Certification Unit'}
              </span>
              <span className="font-mono text-gray-300">
                Ref: {Math.random().toString(36).substring(7).toUpperCase()} | {sysNow.toISOString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Screen Header and Project Filter Controls (Hidden in Report Mode) */}
      {!isReportMode && (
        <div className="space-y-6 print:hidden">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0080FF] flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {isRtl ? 'لوحة قياس الأداء المتقدمة والتحكم العقاري' : 'Enterprise Analytics and Performance Control Hub'}
              </span>
              <h2 className="text-2xl font-black text-[#040957] font-sans flex items-center gap-2">
                <BarChart3 className="w-7 h-7 text-[#0080FF]" />
                {isRtl ? 'مؤشرات الأداء التفاعلية (KPI)' : 'Interactive KPI Dashboard'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 flex-1 md:flex-none">
                <label className="text-xs font-black text-gray-500 whitespace-nowrap">
                  {isRtl ? 'تصفية المشروع:' : 'Project Context:'}
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full md:w-64 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-[#040957] bg-gray-50/50 focus:ring-2 focus:ring-[#0080FF] focus:border-transparent transition-all"
                >
                  <option value="all">{isRtl ? 'جميع المشاريع النشطة' : 'All Active Megaprojects'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {isRtl ? p.nameAr : p.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setIsReportMode(true)}
                className="flex items-center gap-2 bg-[#040957] hover:bg-[#0080FF] text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
              >
                <Printer className="w-4 h-4" />
                {isRtl ? 'إنشاء تقرير للطباعة' : 'Generate KPI Report'}
              </button>

              <button
                onClick={handleOpenSaveModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
              >
                <Save className="w-4 h-4" />
                {isRtl ? 'حفظ التقرير اليومي' : 'Save Daily Report'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isRtl ? 'الإنتاجية اليومية الفعلية' : 'TODAY PRODUCTION'}</span>
                  <h4 className="text-2xl font-black text-[#040957] font-sans">
                    {totalActualToday} <span className="text-xs font-bold text-gray-400">/ {totalDailyTarget}</span>
                  </h4>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-500">
                  <span>{isRtl ? 'نسبة الإنجاز اليومية' : 'Daily Output %'}</span>
                  <span className="text-[#040957]">{dailyProductivityPercentage}%</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, dailyProductivityPercentage)}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isRtl ? 'القوى البشرية النشطة' : 'ACTIVE WORKFORCE'}</span>
                  <h4 className="text-2xl font-black text-[#040957] font-sans">
                    {workers.filter(w => w.status === 'Active').length} <span className="text-xs font-bold text-gray-400">/ {workers.length}</span>
                  </h4>
                </div>
                <div className="p-2.5 bg-teal-50 rounded-xl text-teal-500">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-500">
                  <span>{isRtl ? 'معدل الحضور والتشغيل' : 'Deployment Rate'}</span>
                  <span className="text-[#040957]">
                    {workers.length > 0 ? Math.round((workers.filter(w => w.status === 'Active').length / workers.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-teal-500 h-1.5 rounded-full" 
                    style={{ width: `${workers.length > 0 ? (workers.filter(w => w.status === 'Active').length / workers.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isRtl ? 'كفاءة أسطول المعدات' : 'MACHINERY AVAILABILITY'}</span>
                  <h4 className="text-2xl font-black text-[#040957] font-sans">
                    {equipment.filter(eq => eq.status !== 'Under Maintenance').length} <span className="text-xs font-bold text-gray-400">/ {equipment.length}</span>
                  </h4>
                </div>
                <div className="p-2.5 bg-sky-50 rounded-xl text-sky-500">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-500">
                  <span>{isRtl ? 'نسبة الجاهزية التشغيلية' : 'Fleet Health Rate'}</span>
                  <span className="text-[#040957]">
                    {equipment.length > 0 ? Math.round((equipment.filter(eq => eq.status !== 'Under Maintenance').length / equipment.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-sky-500 h-1.5 rounded-full" 
                    style={{ width: `${equipment.length > 0 ? (equipment.filter(eq => eq.status !== 'Under Maintenance').length / equipment.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isRtl ? 'سلامة خطوط الإمداد والمواد' : 'SUPPLY STOCK SECURITY'}</span>
                  <h4 className="text-2xl font-black text-[#040957] font-sans">
                    {materials.length - lowStockMaterialsCount} <span className="text-xs font-bold text-gray-400">/ {materials.length}</span>
                  </h4>
                </div>
                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-500">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-bold text-gray-500">
                  <span>{isRtl ? 'أصناف آمنة ومستقرة' : 'Safe Stock Items %'}</span>
                  <span className="text-[#040957]">
                    {materials.length > 0 ? Math.round(((materials.length - lowStockMaterialsCount) / materials.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-1.5 rounded-full" 
                    style={{ width: `${materials.length > 0 ? ((materials.length - lowStockMaterialsCount) / materials.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-[#040957] text-sm">
                    {isRtl ? 'أداء الجدول الزمني للمشاريع (مخطط vs فعلي)' : 'Project Schedule Variance (Planned vs Actual)'}
                  </h3>
                </div>
              </div>
              <div className="h-72 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectMetricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', direction: isRtl ? 'rtl' : 'ltr' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', pt: 10 }} />
                    <Bar dataKey="Planned" name={isRtl ? 'التقدم المخطط له %' : 'Planned %'} fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="Actual" name={isRtl ? 'التقدم الفعلي الحقيقي %' : 'Actual %'} fill="#0080FF" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4">
                <ActivityIcon className="w-5 h-5 text-emerald-500 animate-pulse" />
                <h3 className="font-bold text-[#040957] text-sm">
                  {isRtl ? 'حالة الأنشطة والمهام الميدانية' : 'Field Activities Completion Status'}
                </h3>
              </div>
              <div className="h-72 w-full flex-1 relative flex flex-col justify-center items-center">
                <div className="w-full h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activityStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {activityStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-[#040957]">{filteredActivities.length}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase">
                      {isRtl ? 'إجمالي الأنشطة' : 'Total Activities'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center gap-6 pb-2">
                  {activityStatusData.map(stat => (
                    <div key={stat.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }}></span>
                      <span className="text-[10px] font-bold text-gray-600">
                        {stat.name} ({stat.value})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-[#040957] text-sm">
                  {isRtl ? 'مؤشر حجم الإنتاج والعمل الفعلي (آخر 7 أيام)' : 'Physical Production Output Trend (Last 7 Days)'}
                </h3>
              </div>
              <div className="h-72 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={workforceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOutputVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomKpiTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="Volume" 
                      name={isRtl ? 'الكمية المنجزة' : 'Quantity Handled'} 
                      stroke="#f59e0b" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorOutputVolume)" 
                      dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-5 h-5 text-sky-500 animate-spin-slow" />
                <h3 className="font-bold text-[#040957] text-sm">
                  {isRtl ? 'حالة جاهزية أسطول الآليات الكبرى والمعدات' : 'Machinery Fleet Readiness Profile'}
                </h3>
              </div>
              <div className="h-72 w-full flex-1 relative flex flex-col justify-center">
                <div className="w-full h-56 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={equipmentFleetStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {equipmentFleetStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-[#040957]">{equipment.length}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase">
                      {isRtl ? 'إجمالي المعدات' : 'Total Machinery'}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-center gap-6 pb-2">
                  {equipmentFleetStatus.map(stat => (
                    <div key={stat.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }}></span>
                      <span className="text-[10px] font-bold text-gray-600">
                        {stat.name} ({stat.value})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold text-[#040957] text-sm">
                    {isRtl ? 'رصيد المواد الحالي مقابل حد الأمان والتحذير' : 'Material Inventory Stock vs Safety Threshold'}
                  </h3>
                </div>
                {lowStockMaterialsCount > 0 && (
                  <span className="bg-red-50 text-red-600 font-bold px-2.5 py-1 rounded-full text-[10px] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {lowStockMaterialsCount} {isRtl ? 'مواد منخفضة المستودع' : 'materials low in stock'}
                  </span>
                )}
              </div>
              <div className="h-72 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={materialSafetyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                    <Bar dataKey="Current" name={isRtl ? 'الرصيد المتاح حالياً' : 'Current Stock'} fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="Required" name={isRtl ? 'الحد الأدنى للأمان' : 'Safety Minimum'} fill="#f87171" radius={[4, 4, 0, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Daily Employee Attendance Summary Section (Dashboard Mode) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-500" />
                <div>
                  <h3 className="font-bold text-[#040957] text-sm">
                    {isRtl ? 'حالة حضور وتحضير الموظفين اليومية' : 'Daily Workforce Attendance & Roster Status'}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {isRtl ? 'إحصاءات الحضور الميداني ومواعيد الورديات اليومية للعمالة' : 'Real-time field attendance rate, shift times, and compliance logs'}
                  </p>
                </div>
              </div>

              {/* Attendance Mini Stats Grid */}
              <div className="flex gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 py-1 px-3 rounded-full">
                  <span>●</span>
                  <span>{isRtl ? 'حاضر:' : 'Present:'} {attendanceStats.present}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 py-1 px-3 rounded-full">
                  <span>●</span>
                  <span>{isRtl ? 'غائب:' : 'Absent:'} {attendanceStats.absent}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50 text-[#040957] py-1 px-3 rounded-full">
                  <span>⚡</span>
                  <span>{isRtl ? 'نسبة الحضور:' : 'Attendance Rate:'} {attendanceStats.rate}%</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-150 bg-gray-50/25 max-h-72 overflow-y-auto">
              <table className="w-full text-[11px] text-right">
                <thead className="bg-gray-100/70 text-[10px] text-gray-400 font-bold uppercase sticky top-0">
                  <tr>
                    <th className="p-2.5 text-right">{isRtl ? 'التاريخ' : 'Date'}</th>
                    <th className="p-2.5 text-right">{isRtl ? 'الموظف / العامل' : 'Employee / Worker'}</th>
                    <th className="p-2.5 text-right">{isRtl ? 'المهنة' : 'Profession'}</th>
                    <th className="p-2.5 text-center">{isRtl ? 'حالة الحضور' : 'Attendance'}</th>
                    <th className="p-2.5 text-center">{isRtl ? 'ساعات العمل' : 'Work Schedule'}</th>
                    <th className="p-2.5 text-center">{isRtl ? 'الوردية / الشفت' : 'Shift Type'}</th>
                    <th className="p-2.5 text-right">{isRtl ? 'ملاحظات وتوجيهات المشرف' : 'Supervisor Notes'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 bg-white">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-gray-400 italic font-medium">
                        {isRtl ? '⚠️ لا توجد سجلات حضور مسجلة حالياً للمشروع المحدد.' : 'No daily employee roster records found for the selected project.'}
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map(rec => (
                      <tr key={rec.id} className="hover:bg-gray-50/50 transition">
                        <td className="p-2.5 font-mono text-[10px] text-gray-500">{rec.date}</td>
                        <td className="p-2.5">
                          <div className="font-bold text-[#040957]">{rec.workerName}</div>
                          <div className="text-[9px] text-gray-400">👤 {rec.supervisorName}</div>
                        </td>
                        <td className="p-2.5 text-gray-600">{isRtl ? rec.professionAr : rec.professionEn}</td>
                        <td className="p-2.5 text-center">
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
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${colorClasses}`}>
                                {label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-2.5 text-center text-gray-700 font-semibold">
                          {rec.isPresent ? (
                            <div>
                              <span>⏱️ {rec.startTime} - {rec.endTime}</span>
                              <span className="block text-[9px] text-gray-400">☕ {rec.breakTime}</span>
                              {(() => {
                                const hours = calculateActualHours(rec.startTime, rec.endTime);
                                return hours !== null ? (
                                  <div className="text-[9px] text-emerald-600 font-bold mt-0.5 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 inline-block">
                                    {isRtl ? `${hours} ساعة` : `${hours} hrs`}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="p-2.5 text-center font-bold text-blue-700">
                          {rec.isPresent ? (
                            (() => {
                              const hours = calculateActualHours(rec.startTime, rec.endTime);
                              if (hours !== null) {
                                return isRtl ? `فعلي - ${hours} ساعة` : `Actual - ${hours} hrs`;
                              }
                              return rec.shiftTime;
                            })()
                          ) : '-'}
                        </td>
                        <td className="p-2.5 text-right text-gray-500 italic max-w-xs truncate">
                          {rec.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          {activeProject && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#040957] text-white p-6 rounded-2xl shadow-md border border-blue-900/40 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-wider text-blue-300 font-extrabold">
                    {isRtl ? 'معلومات سياق الكفاءة الميداني' : 'Project Specific Efficiency Report'}
                  </span>
                  <h3 className="text-lg font-black font-sans">
                    {isRtl ? activeProject.nameAr : activeProject.nameEn}
                  </h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  activeProject.status === 'Ahead' ? 'bg-emerald-500/20 text-emerald-300' :
                  activeProject.status === 'On Track' ? 'bg-blue-500/20 text-blue-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {isRtl ? activeProject.status === 'Ahead' ? 'متقدم' : activeProject.status === 'On Track' ? 'على المسار' : 'متأخر' : activeProject.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-blue-200 font-bold block">{isRtl ? 'التقدم المخطط' : 'Planned Progress'}</span>
                  <span className="text-xl font-black">{getProjectPlannedProgress(activeProject)}%</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-blue-200 font-bold block">{isRtl ? 'التقدم الحقيقي' : 'Actual Progress'}</span>
                  <span className="text-xl font-black">{getProjectProgress(activeProject, workItems, activities, progressUpdates)}%</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-blue-200 font-bold block">{isRtl ? 'البنود والنشاطات' : 'Activities Context'}</span>
                  <span className="text-xl font-black">{filteredActivities.length} {isRtl ? 'نشاط' : 'elements'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-blue-200 font-bold block">{isRtl ? 'التقارير اليومية المسجلة' : 'Reports Registered'}</span>
                  <span className="text-xl font-black">{filteredUpdates.length} {isRtl ? 'تحديث' : 'logs'}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Saved KPI Reports Archive Section */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6 mt-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-[#040957] font-sans flex items-center gap-2">
                  <CalendarDays className="w-5.5 h-5.5 text-emerald-600" />
                  {isRtl ? 'سجل تقارير KPI اليومية المحفوظة' : 'Saved Daily KPI Reports Archive'}
                </h3>
                <p className="text-xs text-gray-400">
                  {isRtl ? 'استرجع واستعرض تقارير الأداء اليومية الموثقة للمشروع والبحث برقم التقرير أو التاريخ' : 'Refer back to documented performance summaries. Search by report ID or date.'}
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={savedSearchQuery}
                  onChange={(e) => setSavedSearchQuery(e.target.value)}
                  placeholder={isRtl ? 'بحث برقم التقرير أو التاريخ (مثال: 2026-07-01)...' : 'Search by report ID or date (e.g. 2026-07-01)...'}
                  className="w-full pl-9 pr-4 py-2 text-xs font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 transition-all outline-none"
                />
              </div>
            </div>

            {/* Reports List */}
            {filteredSavedReports.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-100">
                <p className="text-sm italic">
                  {savedSearchQuery ? (isRtl ? '⚠️ لم يتم العثور على أي تقارير تطابق البحث.' : 'No reports matched your search query.') : (isRtl ? '📁 لا توجد تقارير أداء محفوظة حتى الآن.' : 'No daily KPI reports have been saved yet.')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSavedReports.map(report => (
                  <div 
                    key={report.id}
                    className="border border-gray-100 hover:border-emerald-200 bg-gray-50/30 hover:bg-emerald-50/5 rounded-2xl p-4 transition-all shadow-sm flex flex-col justify-between hover:shadow-md relative group"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                          #{report.reportNumber}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {report.reportDate}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-black text-gray-500">
                          {isRtl ? 'المشروع:' : 'Project:'}
                        </div>
                        <div className="text-sm font-bold text-[#040957] truncate">
                          {isRtl ? report.projectNameAr : report.projectNameEn}
                        </div>
                      </div>

                      {/* Stat summary grid */}
                      <div className="grid grid-cols-3 gap-2 bg-white/80 p-2.5 rounded-xl border border-gray-100 text-center text-gray-800">
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold">{isRtl ? 'الإنتاج' : 'Output'}</span>
                          <span className="text-xs font-black text-blue-700">{report.actualQuantity} / {report.targetQuantity}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold">{isRtl ? 'الحضور' : 'Attendance'}</span>
                          <span className="text-xs font-black text-emerald-600">{report.attendanceRate}%</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-400 block font-bold">{isRtl ? 'الكفاءة' : 'Efficiency'}</span>
                          <span className="text-xs font-black text-purple-600">{report.efficiency}</span>
                        </div>
                      </div>

                      {report.supervisorNotes && (
                        <p className="text-[11px] text-gray-500 italic line-clamp-2 bg-gray-100/40 p-2 rounded-lg border border-gray-100/60">
                          &ldquo;{report.supervisorNotes}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <span className="text-[9px] text-gray-400 font-semibold">
                        👤 {report.createdByName || (isRtl ? 'المشرف' : 'Supervisor')}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => exportKpiToExcel(report, isRtl, settings)}
                          className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-bold text-xs bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded-lg transition cursor-pointer"
                          title={isRtl ? 'تحميل ملف Excel' : 'Export to Excel'}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedSavedReport(report)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {isRtl ? 'عرض' : 'Details'}
                        </button>
                        {onDeleteKpiReport && (
                          <button
                            onClick={() => onDeleteKpiReport(report.id)}
                            className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition"
                            title={isRtl ? 'حذف التقرير' : 'Delete Report'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* 1. SAVE KPI REPORT DIALOG MODAL */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 w-full max-w-lg space-y-4 text-gray-900"
          >
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-[#040957] font-sans">
                  {isRtl ? 'حفظ تقرير الأداء اليومي آلياً' : 'Save Daily Performance Summary'}
                </h3>
                <p className="text-xs text-gray-400">
                  {isRtl ? 'توثيق وأرشفة مؤشرات الأداء الحالية في قاعدة البيانات المستمرة' : 'Archive current live metrics into the persistent historical database.'}
                </p>
              </div>
              <button 
                onClick={() => setIsSaveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-500 block">{isRtl ? 'رقم التقرير (تلقائي):' : 'Report ID (Auto):'}</label>
                  <input
                    type="text"
                    value={reportNumberInput}
                    disabled
                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-50 font-mono text-gray-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-gray-500 block">{isRtl ? 'تاريخ التقرير:' : 'Report Date:'}</label>
                  <input
                    type="date"
                    value={reportDateInput}
                    onChange={(e) => setReportDateInput(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 block">{isRtl ? 'المشروع الحالي:' : 'Current Project Context:'}</label>
                <div className="w-full border border-gray-200 bg-gray-50 rounded-xl p-2.5 font-bold text-gray-700">
                  {selectedProjectId === 'all' ? (isRtl ? 'جميع المشاريع والعمليات' : 'Enterprise Wide') : (isRtl ? activeProject?.nameAr : activeProject?.nameEn)}
                </div>
              </div>

              {/* Statistical review inside the save dialog */}
              <div className="bg-emerald-50/30 p-3 rounded-2xl border border-emerald-100/50 space-y-2">
                <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider block">
                  📊 {isRtl ? 'معاينة الأرقام التي سيتم حفظها:' : 'ARCHIVED METRICS PREVIEW:'}
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-gray-600">
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="block text-[9px] text-gray-400">{isRtl ? 'المستهدف اليومي' : 'Daily Target'}</span>
                    <span className="font-bold text-gray-700">{totalDailyTarget}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="block text-[9px] text-gray-400">{isRtl ? 'الإنتاج الحقيقي' : 'Actual Prod'}</span>
                    <span className="font-bold text-blue-700">{totalActualToday}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-emerald-100">
                    <span className="block text-[9px] text-gray-400">{isRtl ? 'معدل الحضور' : 'Attendance'}</span>
                    <span className="font-bold text-emerald-600">{attendanceStats.rate}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-500 block">{isRtl ? 'ملاحظات وتوجيهات المشرف:' : 'Supervisor Notes & Comments:'}</label>
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  rows={3}
                  placeholder={isRtl ? 'اكتب هنا أي ملاحظات فنية أو إدارية تخص إنتاجية اليوم...' : 'Write any technical or operational details about today\'s productivity logs...'}
                  className="w-full border border-gray-200 rounded-xl p-2.5 font-sans focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmSaveReport}
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                {isRtl ? 'تأكيد الحفظ والأرشفة' : 'Confirm Save & Archive'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* 2. VIEW SAVED KPI REPORT DETAILS MODAL */}
      {selectedSavedReport && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 w-full max-w-xl space-y-5 text-gray-900"
          >
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono border border-emerald-100 inline-block">
                  #{selectedSavedReport.reportNumber}
                </span>
                <h3 className="text-lg font-black text-[#040957] font-sans">
                  {isRtl ? 'تفاصيل التقرير المؤرشف' : 'Archived KPI Report Summary'}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedSavedReport(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-800">
              <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-400 block text-[10px] uppercase tracking-wider">{isRtl ? 'المشروع' : 'Project Context'}</span>
                <span className="text-[#040957] text-sm font-black">{isRtl ? selectedSavedReport.projectNameAr : selectedSavedReport.projectNameEn}</span>
              </div>
              <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-400 block text-[10px] uppercase tracking-wider">{isRtl ? 'تاريخ التقرير' : 'Report Date'}</span>
                <span className="text-gray-700 text-sm font-black flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {selectedSavedReport.reportDate}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#0080FF]">{isRtl ? 'مؤشرات الأداء المسجلة' : 'Documented KPI Metrics'}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100/50">
                  <span className="text-[10px] text-gray-400 font-bold block">{isRtl ? 'الإنتاجية الكلية' : 'Output'}</span>
                  <span className="text-base font-black text-blue-700">{selectedSavedReport.actualQuantity} / {selectedSavedReport.targetQuantity}</span>
                </div>
                <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50">
                  <span className="text-[10px] text-gray-400 font-bold block">{isRtl ? 'حضور الموظفين' : 'Staff Presence'}</span>
                  <span className="text-base font-black text-emerald-700">{selectedSavedReport.attendanceRate}%</span>
                  <span className="text-[9px] block text-emerald-600 mt-0.5">({selectedSavedReport.presentWorkers} / {selectedSavedReport.presentWorkers + selectedSavedReport.absentWorkers})</span>
                </div>
                <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100/50">
                  <span className="text-[10px] text-gray-400 font-bold block">{isRtl ? 'كفاءة مان-ساعة' : 'Man-hour Eff.'}</span>
                  <span className="text-base font-black text-purple-700">{selectedSavedReport.efficiency}</span>
                </div>
                <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50">
                  <span className="text-[10px] text-gray-400 font-bold block">{isRtl ? 'السلامة والمخالفات' : 'HSE Safety Score'}</span>
                  <span className="text-base font-black text-amber-700">{selectedSavedReport.safetyScore}/100</span>
                  {selectedSavedReport.openIssuesCount > 0 && (
                    <span className="text-[9px] text-red-600 font-bold block mt-0.5">⚠️ {selectedSavedReport.openIssuesCount} {isRtl ? 'قضايا مفتوحة' : 'open issues'}</span>
                  )}
                </div>
              </div>
            </div>

            {selectedSavedReport.supervisorNotes && (
              <div className="space-y-1.5 bg-[#040957]/5 p-4 rounded-2xl border border-gray-100">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-500">{isRtl ? 'ملاحظات المشرف المسجلة:' : 'Supervisor Saved Notes:'}</h5>
                <p className="text-xs text-gray-700 leading-relaxed font-medium italic">
                  &ldquo;{selectedSavedReport.supervisorNotes}&rdquo;
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-gray-100 text-[10px] text-gray-400 font-bold">
              <span>
                💾 {isRtl ? 'محفوظ بواسطة:' : 'Archived by:'} {selectedSavedReport.createdByName || 'Supervisor'}
              </span>
              <span>
                ⏰ {new Date(selectedSavedReport.timestamp).toLocaleString(isRtl ? 'ar-SA' : 'en-US')}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => exportKpiToExcel(selectedSavedReport, isRtl, settings)}
                className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {isRtl ? 'تحميل ملف Excel' : 'Export to Excel'}
              </button>
              <button
                onClick={() => setSelectedSavedReport(null)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#040957] hover:bg-[#0080FF] text-white transition shadow-sm"
              >
                {isRtl ? 'إغلاق المعاينة' : 'Close Details'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
