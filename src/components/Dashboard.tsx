/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Layers, 
  Workflow, 
  TrendingUp, 
  Clock, 
  Target,
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  Search, 
  Bell, 
  Check, 
  RefreshCw, 
  Flame, 
  Zap, 
  ShieldCheck,
  TrendingDown,
  Activity as ActivityIcon,
  User as UserIcon,
  Trash2,
  Maximize2,
  X,
  Printer,
  ChevronDown,
  ChevronUp,
  Building2,
  Globe,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { runWithOklchSanitizer } from '../utils/pdfSanitizer';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  Project, 
  WorkItem, 
  Activity, 
  Worker,
  ProgressUpdate,
  SystemNotification, 
  UserRole, 
  User 
} from '../types';
import { 
  getProjectProgress, 
  getProjectPlannedProgress,
  getProjectProgressAtDate,
  getProjectPlannedProgressAtDate,
  getWorkItemProgress,
  getActivityProgress
} from '../utils/progressCalculations';

interface DashboardProps {
  lang: 'ar' | 'en';
  t: any;
  projects: Project[];
  workItems: WorkItem[];
  activities: Activity[];
  workers: Worker[];
  progressUpdates: ProgressUpdate[];
  notifications: SystemNotification[];
  onMarkNotificationRead: (id: string) => void;
  onClearAllNotifications: () => void;
  currentUser: User;
  onNavigate?: (mod: string) => void;
  onDeleteProgressUpdate?: (id: string) => void;
  settings?: any;
}

export default function Dashboard({ 
  lang, 
  t, 
  projects, 
  workItems, 
  activities, 
  workers,
  progressUpdates = [],
  notifications, 
  onMarkNotificationRead, 
  onClearAllNotifications,
  currentUser,
  onNavigate,
  onDeleteProgressUpdate,
  settings
}: DashboardProps) {
  const isRtl = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'Ahead' | 'On Track' | 'Delayed'>('all');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [isFeedExpanded, setIsFeedExpanded] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  // Compute stats
  const totalProjCount = projects.length;
  const totalWiCount = workItems.length;
  const totalActCount = activities.length;

  const aheadCount = projects.filter(p => p.status === 'Ahead').length;
  const onTrackCount = projects.filter(p => p.status === 'On Track').length;
  const delayedCount = projects.filter(p => p.status === 'Delayed').length;

  const targetProjectsForStats = filterProjectId === 'all' 
    ? projects 
    : projects.filter(p => p.id === filterProjectId);

  // Let's compute average progress based on actual project metrics
  const totalPlannedProgressAverage = targetProjectsForStats.length > 0
    ? Math.round(targetProjectsForStats.reduce((acc, p) => acc + getProjectPlannedProgress(p), 0) / targetProjectsForStats.length)
    : 0;
  
  const projectProgressValues = targetProjectsForStats.map(p => getProjectProgress(p, workItems, activities, progressUpdates));
  const totalActualProgressAverage = targetProjectsForStats.length > 0
    ? projectProgressValues.reduce((acc, val) => acc + val, 0) / targetProjectsForStats.length
    : 0;

  const roundedActualProgress = Math.round(totalActualProgressAverage);
  const progressVariance = roundedActualProgress - totalPlannedProgressAverage;

  // Real Daily Production Calculation
  const realNow = new Date();
  const sysNow = realNow.getFullYear() === 2026 ? realNow : new Date('2026-06-25');
  
  const totalDailyTarget = activities.reduce((acc, act) => {
    // Find the work item and project for this activity
    const wi = workItems.find(w => w.id === act.workItemId);
    if (!wi) return acc;
    const proj = projects.find(p => p.id === wi.projectId);
    if (!proj) return acc;
    
    // Apply Project Filter
    if (filterProjectId !== 'all' && proj.id !== filterProjectId) return acc;
    
    // Check if project is currently active
    const start = new Date(proj.startDate);
    const end = new Date(proj.endDate);
    if (sysNow < start || sysNow > end) return acc;

    // Use the explicitly planned daily production for the activity if available
    // Otherwise fallback to sum of linked workers' daily productivity.
    if (act.plannedDailyProduction && act.plannedDailyProduction > 0) {
      return acc + act.plannedDailyProduction;
    }
    const activeWorkers = workers.filter(w => act.workerIds.includes(w.id));
    const sumProductivity = activeWorkers.reduce((wAcc, curr) => wAcc + (curr.dailyProductivity || 0), 0);
    
    if (sumProductivity > 0) {
      return acc + sumProductivity;
    }
    
    const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return acc + (act.totalQuantity / durationDays);
  }, 0);

  const todayUpdates = progressUpdates.filter(u => {
    const d = new Date(u.timestamp);
    if (d.toDateString() !== sysNow.toDateString()) return false;
    
    // Apply Project Filter
    if (filterProjectId !== 'all') {
      const activity = activities.find(a => a.id === u.activityId);
      const wi = workItems.find(w => w.id === activity?.workItemId);
      if (wi?.projectId !== filterProjectId) return false;
    }
    
    return true;
  });
  
  const totalActualToday = todayUpdates.reduce((acc, u) => acc + u.completedQuantity, 0);
  
  const selectedProjectName = filterProjectId === 'all' 
    ? (isRtl ? 'جميع المشاريع النشطة' : 'All Active Projects')
    : (projects.find(p => p.id === filterProjectId)?.nameAr || '-');

  const selectedProjectNameEn = filterProjectId === 'all'
    ? 'All Active Projects'
    : (projects.find(p => p.id === filterProjectId)?.nameEn || '-');
  
  // Lock body scroll when feed is expanded
  React.useEffect(() => {
    if (isFeedExpanded) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('feed-expanded-active');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('feed-expanded-active');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('feed-expanded-active');
    };
  }, [isFeedExpanded]);
  
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Accordion state for organizing key details
  const [isCompanyAccordionOpen, setIsCompanyAccordionOpen] = useState(true);
  const [isMetricsAccordionOpen, setIsMetricsAccordionOpen] = useState(true);
  const [isConfigAccordionOpen, setIsConfigAccordionOpen] = useState(true);
  const [isSignaturesAccordionOpen, setIsSignaturesAccordionOpen] = useState(true);
  const [isDateAccordionOpen, setIsDateAccordionOpen] = useState(true);

  // States for Date filtering / Grouping of Live Production Feed
  const [selectedFeedDateFilter, setSelectedFeedDateFilter] = useState<'all' | 'today' | 'yesterday' | 'custom'>('all');
  const [customFeedDate, setCustomFeedDate] = useState<string>(() => {
    const rNow = new Date();
    const sNow = rNow.getFullYear() === 2026 ? rNow : new Date('2026-06-25');
    return sNow.toISOString().split('T')[0];
  });

  // Custom metadata states to make the report fully custom and professional
  const [customReportTitleEn, setCustomReportTitleEn] = useState('Live Field Production Feed Report');
  const [customReportTitleAr, setCustomReportTitleAr] = useState('تقرير بث الإنجاز الميداني المباشر');
  const [customRemarksEn, setCustomRemarksEn] = useState('All 2-hour field operations are systematically logged, validated, and verified by the site construction supervision team. Slurry mix compaction and material flow meet the required specifications.');
  const [customRemarksAr, setCustomRemarksAr] = useState('تم تسجيل كافة العمليات الميدانية على مدار ٢ ساعة بشكل منهجي وتدقيقها واعتمادها من قبل فريق الإشراف الهندسي بالموقع. نسب الدمك وتدفق المواد مطابقة تماماً للمواصفات الفنية المعتمدة.');
  const [reportSerialNum, setReportSerialNum] = useState(`REP-PROD-${new Date().getFullYear()}-047`);
  const [selectedReportDate, setSelectedReportDate] = useState(new Date().toISOString().split('T')[0]);
  
  const handlePrintFeed = async () => {
    try {
      setIsPrinting(true);
      const html2pdf = (await import('html2pdf.js')).default;
      
      let printFrame = document.getElementById('production-pdf-iframe') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'production-pdf-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '-9999px';
        printFrame.style.bottom = '0';
        printFrame.style.width = '1000px';
        printFrame.style.height = '1200px';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
      }

      const selectedProjectName = filterProjectId === 'all' 
        ? (isRtl ? 'جميع المشاريع النشطة' : 'All Active Projects')
        : (projects.find(p => p.id === filterProjectId)?.nameAr || '-');

      const selectedProjectNameEn = filterProjectId === 'all'
        ? 'All Active Projects'
        : (projects.find(p => p.id === filterProjectId)?.nameEn || '-');

      let productionRowsHtml = '';
      if (filteredProductionFeed.length === 0) {
        productionRowsHtml = `<tr><td colspan="7" style="text-align: center; padding: 25px; color: #64748b; font-style: italic; font-weight: 500;">${isRtl ? 'لا يوجد بيانات مسجلة في هذه الفترة' : 'No operational feed updates registered in this interval'}</td></tr>`;
      } else {
        // Group filteredProductionFeed by date
        const printGroups: Record<string, typeof filteredProductionFeed> = {};
        filteredProductionFeed.forEach(item => {
          const dateKey = item.timestamp ? item.timestamp.split('T')[0] : 'unknown';
          if (!printGroups[dateKey]) {
            printGroups[dateKey] = [];
          }
          printGroups[dateKey].push(item);
        });
        
        const sortedPrintDateKeys = Object.keys(printGroups).sort((a, b) => b.localeCompare(a));
        
        productionRowsHtml = sortedPrintDateKeys.map(dateKey => {
          const groupItems = printGroups[dateKey];
          const formattedDate = () => {
            try {
              const dateObj = new Date(dateKey);
              if (dateKey === todayStr) {
                return isRtl ? `اليوم - ${dateKey}` : `Today - ${dateKey}`;
              } else if (dateKey === yesterdayStr) {
                return isRtl ? `الأمس - ${dateKey}` : `Yesterday - ${dateKey}`;
              }
              return dateObj.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });
            } catch {
              return dateKey;
            }
          };

          const headerRow = `
            <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;">
              <td colspan="7" style="padding: 5px 8px; font-weight: 800; color: #040957; font-size: 9px; text-align: ${isRtl ? 'right' : 'left'};">
                <span style="font-weight: 900; margin-right: 5px;">📅 ${formattedDate()}</span>
                <span style="background-color: #dbeafe; color: #1e40af; font-size: 7.5px; padding: 1px 4px; border-radius: 9999px; margin: 0 4px; font-weight: 900;">
                  ${groupItems.length} ${isRtl ? 'تحديثات' : 'updates'}
                </span>
                <span style="background-color: #d1fae5; color: #065f46; font-size: 7.5px; padding: 1px 4px; border-radius: 9999px; margin: 0 4px; font-weight: 900;">
                  ${isRtl ? 'الإنتاج:' : 'Qty:'} +${groupItems.reduce((sum, item) => sum + item.completedQuantity, 0)}
                </span>
              </td>
            </tr>
          `;

          const itemRows = groupItems.map((upd, i) => `
            <tr style="background-color: #ffffff; border-bottom: 1px solid #e2e8f0;">
              <td class="num-font" style="text-align: center; color: #64748b; font-weight: 600;">${i + 1}</td>
              <td style="text-align: ${isRtl ? 'right' : 'left'}; font-weight: 700; color: #0f172a;">${upd.activityName}</td>
              <td class="num-font" style="text-align: center; font-weight: 600; color: #475569;">${upd.time}</td>
              <td class="num-font" style="text-align: center; font-weight: 700; color: #0f172a;">+${upd.completedQuantity} ${upd.unit}</td>
              <td class="num-font" style="text-align: center; font-weight: 700; color: #2563eb;">${upd.shiftAchievement !== null ? upd.shiftAchievement + '%' : '-'}</td>
              <td class="num-font" style="text-align: center; font-weight: 700; color: #10b981;">${upd.completionPercentage}%</td>
              <td style="text-align: ${isRtl ? 'right' : 'left'}; font-weight: 600; color: #475569;">${upd.reporterName || (isRtl ? 'مشرف ميداني' : 'Field Supervisor')}</td>
            </tr>
          `).join('');

          return headerRow + itemRows;
        }).join('');
      }

      const crNum = settings?.commercialRegistration || '-';
      const vatNum = settings?.taxNumber || '-';
      const phoneNum = settings?.companyPhone || '-';
      const emailAdd = settings?.companyEmail || '-';
      const websiteUrl = settings?.companyWebsite || 'www.rshc.com.sa';
      const companyAddress = isRtl ? settings?.officialAddressAr : settings?.officialAddressEn;

      // Report Stats
      const totalIntervals = filteredProductionFeed.length;
      const totalQtyProduced = filteredProductionFeed.reduce((sum, item) => sum + item.completedQuantity, 0);
      const avgIntervalProgress = filteredProductionFeed.length > 0 
        ? Math.round(filteredProductionFeed.reduce((sum, item) => sum + (item.shiftAchievement || 0), 0) / filteredProductionFeed.length) 
        : 0;

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="${isRtl ? 'rtl' : 'ltr'}">
        <head>
            <meta charset="utf-8">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Kufi+Arabic:wght@400;500;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; }
                body { 
                    font-family: ${isRtl ? "'Noto Kufi Arabic', 'Inter'" : "'Inter'"}, 'Segoe UI', sans-serif; 
                    margin: 0; 
                    padding: 0; 
                    background: white; 
                    color: #0f172a; 
                    width: 100%; 
                    font-size: 8.5px;
                    line-height: 1.4;
                }
                
                .pdf-container {
                    padding: 0;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                }

                .header-layout-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 15px;
                    table-layout: fixed;
                }

                .logo-box { 
                    width: 90px; 
                    height: 90px; 
                    display: inline-flex; 
                    align-items: center; 
                    justify-content: center; 
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 5px;
                    vertical-align: middle;
                }

                .company-name { 
                    font-size: 11px; 
                    font-weight: 800; 
                    color: #040957; 
                    margin-bottom: 1.5px;
                    letter-spacing: -0.3px;
                }

                .company-details { 
                    color: #475569; 
                    font-size: 7.5px; 
                    font-weight: 500;
                    margin-bottom: 1px;
                    line-height: 1.25;
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }

                .document-title-box { 
                    text-align: ${isRtl ? 'left' : 'right'}; 
                    display: block;
                }

                .doc-badge {
                    background: #040957;
                    color: white;
                    padding: 2px 6px;
                    font-weight: 800;
                    font-size: 7.5px;
                    border-radius: 3px;
                    margin-bottom: 3px;
                    text-transform: uppercase;
                    display: inline-block;
                }

                .serial-text {
                    font-family: 'JetBrains Mono', monospace;
                    font-weight: 700;
                    color: #475569;
                    font-size: 8px;
                }

                .meta-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 15px; 
                    background-color: #f8fafc; 
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    table-layout: fixed;
                }
                
                .meta-table td { 
                    padding: 6px 10px; 
                    border: 1px solid #e2e8f0; 
                    vertical-align: top;
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }

                .meta-label { 
                    color: #64748b; 
                    font-size: 7.5px; 
                    font-weight: 700; 
                    text-transform: uppercase; 
                    display: block; 
                    margin-bottom: 1px; 
                }

                .meta-val { 
                    font-size: 9px; 
                    font-weight: 700; 
                    color: #040957; 
                }

                .stats-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 15px;
                    table-layout: fixed;
                }

                .stat-card-cell {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 8px;
                    text-align: center;
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }

                .stat-num {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 14px;
                    font-weight: 800;
                    color: #0080FF;
                    margin-bottom: 1px;
                }

                .stat-label {
                    color: #64748b;
                    font-size: 7.5px;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .section-heading-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 8px;
                    table-layout: fixed;
                }

                .section-heading-cell {
                    background-color: #040957; 
                    color: #ffffff; 
                    padding: 4px 8px; 
                    font-weight: 800; 
                    font-size: 8.5px; 
                    border-radius: 3px; 
                    text-transform: uppercase; 
                    letter-spacing: 0.5px;
                    text-align: ${isRtl ? 'right' : 'left'};
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }

                .main-table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 15px; 
                    font-size: 8.5px; 
                    table-layout: fixed;
                }

                .main-table th { 
                    background-color: #040957; 
                    color: #ffffff; 
                    font-weight: 700; 
                    text-align: center; 
                    padding: 6px 4px; 
                    border: 1px solid #040957;
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }

                .main-table td { 
                    border: 1px solid #e2e8f0; 
                    padding: 5px 4px; 
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }
                
                .num-font { 
                    font-family: 'JetBrains Mono', monospace; 
                    font-variant-numeric: tabular-nums; 
                    letter-spacing: -0.2px;
                }

                .remarks-box {
                    background: #fafafa;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 6px 10px;
                    margin-bottom: 15px;
                }

                .remarks-text {
                    font-size: 8.5px;
                    color: #334155;
                    font-weight: 500;
                    line-height: 1.4;
                    text-align: justify;
                }
                
                .signatures-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 25px;
                    table-layout: fixed;
                }

                .sig-cell {
                    text-align: center;
                    padding: 6px;
                    vertical-align: top;
                    word-wrap: break-word;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }

                .sig-line { 
                    border-top: 1.5px solid #040957; 
                    padding-top: 5px; 
                    color: #040957; 
                    font-size: 8.5px; 
                    font-weight: 700;
                }

                .sig-title {
                    color: #64748b;
                    font-size: 7.5px;
                    font-weight: 600;
                    margin-top: 1px;
                    text-transform: uppercase;
                }
            </style>
        </head>
        <body>
          <div id="pdf-content" class="pdf-container">
            <!-- Header Section -->
            <table class="header-layout-table">
                <tr>
                    <td style="width: 65%; text-align: ${isRtl ? 'right' : 'left'}; vertical-align: middle;">
                        <table style="border-collapse: collapse; display: inline-table; table-layout: fixed; width: 100%;">
                            <tr>
                                <td style="padding: 0; padding-${isRtl ? 'left' : 'right'}: 10px; vertical-align: middle; width: 100px;">
                                    <div class="logo-box">
                                        ${settings?.companyLogoUrl ? `<img src="${settings.companyLogoUrl}" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />` : `<svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2"><path d="M3 21h18"></path><path d="M5 21V7l8-4v18"></path><path d="M19 21V11l-6-3"></path></svg>`}
                                    </div>
                                </td>
                                <td style="padding: 0; vertical-align: middle; text-align: ${isRtl ? 'right' : 'left'};">
                                    <div class="company-name">${((isRtl ? settings?.companyNameAr : settings?.companyNameEn) || (isRtl ? 'شركة الرشيد للمقاولات' : 'Rashed Al-Subaie Contracting Co.'))}</div>
                                    <div class="company-details" style="font-weight: 700; color: #0f172a;">${companyAddress || ''}</div>
                                    <div class="company-details">${isRtl ? 'هاتف: ' : 'Tel: '}${phoneNum} | ${isRtl ? 'البريد الالكتروني: ' : 'Email: '}${emailAdd}</div>
                                    <div class="company-details">${isRtl ? 'سجل تجاري رقم: ' : 'CR No: '}${crNum} | ${isRtl ? 'الرقم الضريبي: ' : 'VAT No: '}${vatNum}</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td style="width: 35%; text-align: ${isRtl ? 'left' : 'right'}; vertical-align: middle;">
                        <div class="document-title-box" style="text-align: ${isRtl ? 'left' : 'right'};">
                            <div class="doc-badge">${isRtl ? 'وثيقة رسمية' : 'Official Document'}</div>
                            <h2 style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; color: #0f172a;">${isRtl ? customReportTitleAr : customReportTitleEn}</h2>
                            <div class="serial-text">${isRtl ? 'الرقم المرجعي: ' : 'Ref No: '} ${reportSerialNum}</div>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- Metadata Section -->
            <table class="meta-table">
                <tr>
                    <td style="width: 35%;">
                        <span class="meta-label">${isRtl ? 'المشروع المستهدف' : 'Target Project'}</span>
                        <span class="meta-val">${isRtl ? selectedProjectName : selectedProjectNameEn}</span>
                    </td>
                    <td style="width: 25%;">
                        <span class="meta-label">${isRtl ? 'تاريخ التقرير' : 'Report Date'}</span>
                        <span class="meta-val num-font" dir="ltr">${selectedReportDate}</span>
                    </td>
                    <td style="width: 20%;">
                        <span class="meta-label">${isRtl ? 'وقت الاستخراج' : 'Extraction Time'}</span>
                        <span class="meta-val num-font" dir="ltr">${new Date().toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td style="width: 20%;">
                        <span class="meta-label">${isRtl ? 'حالة التوزيع' : 'Distribution'}</span>
                        <span class="meta-val" style="color: #2563eb;">${isRtl ? 'مدير المشروع والشركاء' : 'PM & Stakeholders'}</span>
                    </td>
                </tr>
            </table>

            <!-- Performance Metrics Grid -->
            <table class="section-heading-table">
                <tr>
                    <td class="section-heading-cell">
                        ${isRtl ? 'مؤشرات الأداء التشغيلية للفترة' : 'Operational Performance Indicators'}
                    </td>
                </tr>
            </table>
            
            <table class="stats-table">
                <tr>
                    <td class="stat-card-cell" style="padding-right: 8px;">
                        <div class="stat-num">${totalIntervals}</div>
                        <div class="stat-label">${isRtl ? 'إجمالي فترات التحديث' : 'Total Interval Logs'}</div>
                    </td>
                    <td class="stat-card-cell" style="padding: 10px 8px;">
                        <div class="stat-num">+${totalQtyProduced}</div>
                        <div class="stat-label">${isRtl ? 'الكمية الإجمالية المنجزة' : 'Total Quantity Produced'}</div>
                    </td>
                    <td class="stat-card-cell" style="padding-left: 8px;">
                        <div class="stat-num">${avgIntervalProgress}%</div>
                        <div class="stat-label">${isRtl ? 'متوسط كفاءة الإنجاز للفترة' : 'Average Interval Achievement'}</div>
                    </td>
                </tr>
            </table>

            <!-- Detailed Interval Logs Table -->
            <table class="section-heading-table">
                <tr>
                    <td class="section-heading-cell">
                        ${isRtl ? 'سجل تفاصيل فترات الإنتاج (كل ساعتين)' : 'Detailed 2-Hour Production Interval Logs'}
                    </td>
                </tr>
            </table>

            <table class="main-table">
                <thead>
                    <tr>
                        <th style="width: 6%; text-align: center;">${isRtl ? 'م' : 'SN'}</th>
                        <th style="width: 32%; text-align: ${isRtl ? 'right' : 'left'};">${isRtl ? 'النشاط / البند' : 'Activity Description'}</th>
                        <th style="width: 12%; text-align: center;">${isRtl ? 'الوقت' : 'Time'}</th>
                        <th style="width: 14%; text-align: center;">${isRtl ? 'الكمية المنفذة' : 'Qty Produced'}</th>
                        <th style="width: 12%; text-align: center;">${isRtl ? 'إنجاز الفترة' : 'Interval %'}</th>
                        <th style="width: 12%; text-align: center;">${isRtl ? 'الإنجاز التراكمي' : 'Cumulative %'}</th>
                        <th style="width: 12%; text-align: ${isRtl ? 'right' : 'left'};">${isRtl ? 'المشرف المسؤول' : 'Supervisor'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${productionRowsHtml}
                </tbody>
            </table>

            <!-- Executive Remarks / Notes -->
            <table class="section-heading-table">
                <tr>
                    <td class="section-heading-cell">
                        ${isRtl ? 'الملاحظات والتدقيق الفني الميداني' : 'Field Technical Remarks & Notes'}
                    </td>
                </tr>
            </table>

            <div class="remarks-box">
                <div class="remarks-text">
                    ${isRtl ? customRemarksAr : customRemarksEn}
                </div>
            </div>

            <!-- Official Signatures -->
            <table class="signatures-table">
                <tr>
                    <td class="sig-cell">
                        <div style="height: 35px;"></div>
                        <div class="sig-line">${isRtl ? 'المهندس المشرف بالموقع' : 'Site Supervising Engineer'}</div>
                        <div class="sig-title">${isRtl ? 'مستخرج التقرير الميداني' : 'Field Reporter'}</div>
                    </td>
                    <td class="sig-cell">
                        <div style="height: 35px;"></div>
                        <div class="sig-line">${isRtl ? 'ممثل استشاري الإشراف' : 'Consultant Representative'}</div>
                        <div class="sig-title">${isRtl ? 'التدقيق والاعتماد الفني' : 'Technical Review & Verification'}</div>
                    </td>
                    <td class="sig-cell">
                        <div style="height: 35px;"></div>
                        <div class="sig-line">${isRtl ? settings?.managerNameAr || 'م. فهد العتيبي' : settings?.managerNameEn || 'Eng. Fahad Al-Otaibi'}</div>
                        <div class="sig-title">${isRtl ? 'اعتماد مدير إدارة المشاريع' : 'Project Manager Approval'}</div>
                    </td>
                </tr>
            </table>
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

      // Wait for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 1500));

      const element = frameDoc.getElementById('pdf-content');
      const opt = {
        margin:       [12, 10, 12, 10] as [number, number, number, number],
        filename:     `${isRtl ? 'تقرير_إنتاج_البث_المباشر' : 'Live_Production_Feed_Report'}_${selectedReportDate}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(element).save();
      });
      
    } catch (err) {
      console.error("PDF Generation failed:", err);
      alert(isRtl ? 'فشل في استخراج التقرير بصيغة PDF' : 'Failed to export PDF');
    } finally {
      setIsPrinting(false);
    }
  };
  
  // Group updates by activity to calculate current remaining quantity for each feed item contextually
  const productionFeed = useMemo(() => {
    const activityProgressMap: Record<string, number> = {};
    
    return [...progressUpdates]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .filter(upd => {
        if (filterProjectId === 'all') return true;
        const activity = activities.find(a => a.id === upd.activityId);
        const workItem = workItems.find(wi => wi.id === activity?.workItemId);
        return workItem?.projectId === filterProjectId;
      })
      .map(upd => {
        const activity = activities.find(a => a.id === upd.activityId);
        activityProgressMap[upd.activityId] = (activityProgressMap[upd.activityId] || 0) + upd.completedQuantity;
        
        return {
          ...upd,
          activityName: isRtl ? activity?.nameAr : activity?.nameEn,
          unit: activity?.unit,
          remaining: Math.max(0, (activity?.totalQuantity || 0) - activityProgressMap[upd.activityId]),
          shiftAchievement: activity?.plannedDailyProduction 
            ? Math.round((upd.completedQuantity / (activity.plannedDailyProduction / 4)) * 100)
            : null
        };
      })
      .reverse()
      .slice(0, isFeedExpanded ? 50 : 10);
  }, [progressUpdates, activities, workItems, isRtl, isFeedExpanded, filterProjectId]);

  // Date calculations based on simulation day
  const todayStr = useMemo(() => {
    return sysNow.toISOString().split('T')[0];
  }, [sysNow]);

  const yesterdayStr = useMemo(() => {
    const d = new Date(sysNow);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, [sysNow]);

  // Dynamically filter productionFeed based on selected date filter
  const filteredProductionFeed = useMemo(() => {
    return productionFeed.filter(upd => {
      if (!upd.timestamp) return true;
      const itemDateStr = upd.timestamp.split('T')[0];
      
      if (selectedFeedDateFilter === 'today') {
        return itemDateStr === todayStr;
      } else if (selectedFeedDateFilter === 'yesterday') {
        return itemDateStr === yesterdayStr;
      } else if (selectedFeedDateFilter === 'custom') {
        return itemDateStr === customFeedDate;
      }
      return true; // 'all'
    });
  }, [productionFeed, selectedFeedDateFilter, todayStr, yesterdayStr, customFeedDate]);

  // Group filtered updates by date for clean section layout
  const groupedFeedByDate = useMemo(() => {
    const groups: Record<string, typeof filteredProductionFeed> = {};
    filteredProductionFeed.forEach(item => {
      const dateKey = item.timestamp ? item.timestamp.split('T')[0] : 'unknown';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    return groups;
  }, [filteredProductionFeed]);

  // Sorted date keys in descending order (latest day first)
  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedFeedByDate).sort((a, b) => b.localeCompare(a));
  }, [groupedFeedByDate]);
  
  // Cumulative target calculation
  const dailyWorkingHours = 10; // Standard shift hours
  let maxHour = 7; // Shift starts at 7 AM
  todayUpdates.forEach(u => {
    const d = new Date(u.timestamp);
    if (d.getHours() > maxHour) {
      maxHour = d.getHours();
    }
  });
  
  // Calculate hours elapsed in increments (optional, or exact)
  const hoursElapsed = Math.max(0, Math.min(dailyWorkingHours, maxHour - 7));
  
  // Target to date = Daily target × (Hours elapsed ÷ Daily working hours)
  const cumulativeTargetToDate = totalDailyTarget * (hoursElapsed / dailyWorkingHours);
  
  // 1. Daily Production Index (DPI) - Performance against linear target to date
  const dailyProdPercentage = cumulativeTargetToDate > 0 
    ? Math.round((totalActualToday / cumulativeTargetToDate) * 100) 
    : 0;
  
  // 2. Productivity Index (PI) - Total efficiency vs full day target
  const productivityIndex = totalDailyTarget > 0 
    ? Math.round((totalActualToday / totalDailyTarget) * 100) 
    : 0;

  // 3. Forecast End of Day (FEOD) - Expected output by shift end
  const forecastEndOfDay = hoursElapsed > 0 
    ? Math.round((totalActualToday / hoursElapsed) * dailyWorkingHours) 
    : 0;

  // 4. Schedule Performance Index (SPI) - Actual progress / Planned progress
  const spiValue = totalPlannedProgressAverage > 0 
    ? (totalActualProgressAverage / totalPlannedProgressAverage).toFixed(2) 
    : "1.00";
  
  const finalDailyProd = cumulativeTargetToDate > 0 
    ? `${totalActualToday}/${Math.round(cumulativeTargetToDate)}`
    : "0/0";

  const dailyProdSub = cumulativeTargetToDate > 0
    ? (isRtl ? `نسبة الإنجاز: ${dailyProdPercentage}%` : `Achievement: ${dailyProdPercentage}%`)
    : (isRtl ? 'لا يوجد هدف محدد' : 'No Target');

  // Sub-labels for KPI cards to make them more dynamic
  const projectsSub = isRtl
    ? `${delayedCount} متأخر، ${aheadCount} متقدم`
    : `${delayedCount} Delayed, ${aheadCount} Ahead`;

  const completedWiCount = workItems.filter(wi => {
    const progress = getWorkItemProgress(wi, activities, progressUpdates);
    return progress === 100;
  }).length;
  
  const workItemsSub = isRtl
    ? `${completedWiCount} مكتمل من ${totalWiCount}`
    : `${completedWiCount} completed of ${totalWiCount}`;

  const activeActivitiesCount = activities.filter(act => {
    const progress = getActivityProgress(act, progressUpdates);
    return progress > 0 && progress < 100;
  }).length;

  const activitiesSub = isRtl
    ? `${activeActivitiesCount} بنود تحت التنفيذ`
    : `${activeActivitiesCount} items in progress`;

  // Generate historical data for the chart based on the current state
  // This calculates real historical progress points by filtering updates by month
  const chartData = useMemo(() => {
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    // We'll show the last 6 months up to "now"
    const realNow = new Date();
    const now = realNow.getFullYear() === 2026 ? realNow : new Date('2026-06-25');
    const data = [];
    
    // Use target projects for dynamic chart
    const targetProjects = filterProjectId === 'all' 
      ? projects 
      : projects.filter(p => p.id === filterProjectId);
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIdx = d.getMonth();
      const monthLabel = isRtl ? monthNamesAr[monthIdx] : monthNamesEn[monthIdx];
      
      // End of this specific month (or "now" if it's the current month)
      const endOfMonth = i === 0 ? now : new Date(d.getFullYear(), d.getMonth() + 1, 0);
      
      // Calculate total progress across target projects at this date
      const actualSum = targetProjects.reduce((acc, p) => 
        acc + getProjectProgressAtDate(p, workItems, activities, progressUpdates, endOfMonth), 0);
      const plannedSum = targetProjects.reduce((acc, p) => 
        acc + getProjectPlannedProgressAtDate(p, endOfMonth), 0);
        
      const avgActual = targetProjects.length > 0 ? Math.round(actualSum / targetProjects.length) : 0;
      const avgPlanned = targetProjects.length > 0 ? Math.round(plannedSum / targetProjects.length) : 0;
      
      data.push({
        name: monthLabel,
        planned: avgPlanned,
        actual: avgActual,
        variance: avgActual - avgPlanned
      });
    }
    
    return data;
  }, [projects, workItems, activities, progressUpdates, isRtl]);

  // Filter projects for the dashboard card views
  const filteredProjects = projects.filter(p => {
    const matchSearch = (p.nameAr + p.nameEn + p.projectNumber + p.clientAr + p.clientEn)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchFilter = activeFilter === 'all' || p.status === activeFilter;
    return matchSearch && matchFilter;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#040957] text-white p-3 rounded-xl border border-blue-500/30 shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-bold opacity-60 uppercase mb-1">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-[11px]">{isRtl ? 'المخطط:' : 'Planned:'}</span>
              <span className="text-[11px] font-bold text-gray-300">{payload[0].value}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[11px]">{isRtl ? 'الفعلي:' : 'Actual:'}</span>
              <span className="text-[11px] font-bold text-blue-400">{payload[1].value}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="dashboard-module-root" className="relative min-h-screen dashboard-root-container">
      <div className={`space-y-6 ${isFeedExpanded ? 'print:hidden' : ''}`}>
      {/* Welcome Banner & Global Scope Filter */}
      <div className="space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#040957] to-[#0080FF] text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10">
            <span className="text-xs bg-[#0080FF]/30 text-blue-200 px-3 py-1 rounded-full font-semibold uppercase tracking-wider">
              {t.welcomeBack} - {currentUser.name}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2 font-sans">
              {isRtl ? 'بوابة الرقابة التنفيذية الشاملة' : 'Executive Operations Command Portal'}
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-xl">
              {isRtl 
                ? 'تتبع المشاريع الكبرى، تقدم الخرسانة والحديد، جدولة العمال والآليات الميدانية، ومؤشرات السلامة على مدار ٢٤ ساعة.' 
                : 'Monitor megaprojects, concrete pours, steelwork, workforce dispatch, and environmental safety indicators 24/7.'}
            </p>
          </div>
          
          <div className="flex flex-col gap-3 relative z-10">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ActivityIcon className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="text-xs text-blue-200">{isRtl ? 'الحالة الميدانية' : 'Field Operations Sync'}</div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  {isRtl ? 'نشط متصل' : 'Active Live'}
                </div>
              </div>
            </div>

            {/* Global Project Filter */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/10">
              <div className="text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1 px-1">{isRtl ? 'نطاق العرض' : 'Operational Scope'}</div>
              <select 
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
                className="w-full bg-transparent border-none text-white font-bold text-xs outline-none cursor-pointer"
              >
                <option value="all" className="text-gray-900">{isRtl ? 'كافة المشاريع' : 'All Enterprise Projects'}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="text-gray-900">{isRtl ? p.nameAr : p.nameEn}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Grid of Main KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t.totalProjects, val: totalProjCount, sub: projectsSub, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t.totalWorkItems, val: totalWiCount, sub: workItemsSub, icon: Layers, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: t.totalActivities, val: totalActCount, sub: activitiesSub, icon: Workflow, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: t.dailyProd, val: finalDailyProd, sub: dailyProdSub, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', trend: true },
        ].map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-all duration-300 group cursor-default"
          >
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{kpi.label}</p>
              <h3 className="text-3xl font-black text-[#040957] font-sans group-hover:scale-105 transition-transform origin-left">{kpi.val}</h3>
              <p className={`text-[10px] font-bold ${kpi.trend ? 'text-emerald-600' : 'text-gray-400'}`}>
                {kpi.sub}
              </p>
            </div>
            <div className={`p-3 ${kpi.bg} ${kpi.color} rounded-xl group-hover:rotate-12 transition-transform`}>
              <kpi.icon className="w-8 h-8" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* New Executive Indices Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isRtl ? 'مؤشر الإنتاج اليومي' : 'Daily Production Index', val: `${dailyProdPercentage}%`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: isRtl ? 'مؤشر الإنتاجية (PI)' : 'Productivity Index (PI)', val: `${productivityIndex}%`, icon: ActivityIcon, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: isRtl ? 'توقعات نهاية اليوم' : 'Forecast End of Day', val: forecastEndOfDay, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: isRtl ? 'مؤشر أداء الجدول (SPI)' : 'Schedule Index (SPI)', val: spiValue, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map((idx, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + (i * 0.05) }}
            className="bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3"
          >
            <div className={`p-2 rounded-lg ${idx.bg} ${idx.color}`}>
              <idx.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{idx.label}</p>
              <p className="text-base font-black text-[#040957] font-mono leading-none">{idx.val}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Interactive Charts & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Progress Vector Chart & Smart Performance (Left 2 Col) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-[#040957] font-sans">
                {t.plannedVsActual} ({isRtl ? 'التحليل الزمني للتقدم' : 'Dynamic Timeline Variances'})
              </h2>
              <p className="text-xs text-gray-400">
                {isRtl ? 'تحليلات الأداء الزمني المستندة إلى البيانات الميدانية' : 'Physical execution metrics vs master schedule'}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[10px] font-black uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-gray-200 rounded-full inline-block border border-gray-300"></span>
                <span className="text-gray-400">{t.plannedProgress}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-[#0080FF] rounded-full inline-block shadow-sm"></span>
                <span className="text-[#0080FF]">{t.actualProgress}</span>
              </span>
            </div>
          </div>

          {/* Recharts Implementation */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0080FF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0080FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F1F1" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="planned" 
                  stroke="#94A3B8" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  fill="transparent" 
                  activeDot={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#0080FF" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorActual)"
                  dot={{ r: 4, fill: '#040957', stroke: '#0080FF', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#0080FF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Metric details summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-gray-100">
            <div className="text-center space-y-1">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{isRtl ? 'صحة الجدولة' : 'Schedule Health'}</span>
              <div className="text-lg font-black text-emerald-600 flex items-center justify-center gap-1 font-sans">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span>{totalPlannedProgressAverage > 0 ? Math.min(100, Math.round((totalActualProgressAverage / totalPlannedProgressAverage) * 100)) : 100}%</span>
              </div>
            </div>
            <div className="text-center space-y-1 border-y sm:border-y-0 sm:border-x border-gray-200 py-2 sm:py-0">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.scheduleVariance}</span>
              <div className="text-lg font-black text-[#040957] font-sans flex items-center justify-center gap-1">
                {progressVariance >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                <span>{progressVariance}% {isRtl ? (progressVariance >= 0 ? 'متقدم' : 'متأخر') : (progressVariance >= 0 ? 'Ahead' : 'Delay')}</span>
              </div>
            </div>
            <div className="text-center space-y-1">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{isRtl ? 'الهدر بالموارد' : 'Resource Waste'}</span>
              <div className="text-lg font-black text-[#040957] font-sans">0%</div>
            </div>
          </div>
        </div>

        {/* Live Alerts & Notification Queue (Right 1 Col) */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="w-5 h-5 text-[#040957]" />
                  {notifications.some(n => !n.isRead) && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
                  )}
                </div>
                <h2 className="text-base font-bold text-[#040957] font-sans">{t.notifications}</h2>
              </div>
              {notifications.length > 0 && (
                <button 
                  onClick={onClearAllNotifications}
                  className="text-xs text-[#0080FF] hover:underline font-bold"
                >
                  {t.clearAll}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[200px] space-y-3 pr-1 scrollbar-hide">
              <AnimatePresence mode="popLayout">
                {notifications.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6 text-gray-400 space-y-2"
                  >
                    <CheckCircle className="w-10 h-10 text-gray-200 mx-auto" />
                    <p className="text-xs font-bold">{t.noNotifications}</p>
                  </motion.div>
                ) : (
                  notifications.map(n => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      key={n.id} 
                      className={`p-3 rounded-xl border transition-all text-xs flex gap-2.5 relative group ${n.isRead ? 'bg-gray-50/50 border-gray-100' : 'bg-red-50/30 border-red-100/50 hover:bg-red-50/50 shadow-sm shadow-red-900/5'}`}
                    >
                      <div className="mt-0.5">
                        {n.type === 'inventory' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        ) : n.type === 'delay' ? (
                          <Clock className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <Bell className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="font-black text-gray-800 flex justify-between items-center">
                          <span>{isRtl ? n.titleAr : n.titleEn}</span>
                          {!n.isRead && (
                            <button 
                              onClick={() => onMarkNotificationRead(n.id)}
                              className="opacity-0 group-hover:opacity-100 hover:text-emerald-600 transition"
                              title={t.markRead}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-gray-500 leading-relaxed text-[11px] font-medium">{isRtl ? n.messageAr : n.messageEn}</p>
                        <div className="text-[10px] text-gray-400 font-bold font-mono">
                          {new Date(n.timestamp).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* New 2-Hour Interval Feed Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center border-b border-gray-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-sm font-black text-[#040957] font-sans">{isRtl ? 'بث الإنجاز الميداني المباشر' : 'Live Production Feed'}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsDeleteMode(!isDeleteMode)}
                  className={`px-2 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${isDeleteMode ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'hover:bg-gray-100 text-gray-400'}`}
                  title={isRtl ? 'إدارة التحديثات' : 'Manage Updates'}
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleteMode && <span className="text-[9px] font-black uppercase">{isRtl ? 'إلغاء الحذف' : 'Exit Delete Mode'}</span>}
                </button>
                <button 
                  onClick={() => setIsFeedExpanded(true)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                  title={isRtl ? 'تكبير الشاشة' : 'Full Screen'}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black animate-pulse uppercase">2H INTERVAL</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-3 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
              {productionFeed.map((upd) => (
                <div key={upd.id} className={`bg-gray-50/50 border p-4 rounded-xl space-y-3 hover:bg-white hover:border-blue-200 hover:shadow-md transition-all group relative ${isDeleteMode ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                  {/* Delete Box Action */}
                  <AnimatePresence>
                    {isDeleteMode && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute top-1 right-1 z-30"
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا التحديث؟' : 'Are you sure you want to delete this update?')) {
                              onDeleteProgressUpdate?.(upd.id);
                            }
                          }}
                          className="bg-red-600 text-white p-2 rounded-xl shadow-lg hover:bg-red-700 transition-all active:scale-90 flex items-center justify-center border-2 border-white cursor-pointer"
                          title={isRtl ? 'حذف نهائي' : 'Delete Permanently'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Original hover-only delete (kept for convenience when not in mode) */}
                  {!isDeleteMode && (
                    <button 
                      onClick={() => {
                        if (window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا التحديث؟' : 'Are you sure you want to delete this update?')) {
                          onDeleteProgressUpdate?.(upd.id);
                        }
                      }}
                      className="absolute top-2 left-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                      title={isRtl ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-blue-600 truncate max-w-[150px] uppercase leading-tight">{upd.activityName}</span>
                    <span className="text-[9px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-100 shadow-sm">{upd.time}</span>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-[11px] shadow-lg shadow-blue-200">
                        +{upd.completedQuantity}
                      </div>
                      <div className="text-[9px]">
                        <div className="text-gray-400 uppercase font-black tracking-tighter leading-none">{isRtl ? 'تم إنجازها' : 'Produced'}</div>
                        <div className="font-black text-[#040957] mt-0.5">{upd.unit}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-emerald-600">
                        {isRtl ? 'الإنجاز الكلي: ' : 'Total: '} {upd.completionPercentage}%
                      </div>
                      {upd.shiftAchievement !== null && (
                        <div className="text-[9px] font-bold text-blue-500 mt-0.5">
                          {isRtl ? 'إنجاز الفترة: ' : 'Interval: '} {upd.shiftAchievement}%
                        </div>
                      )}
                      <div className="text-[9px] font-bold text-gray-300 mt-0.5">{isRtl ? 'المتبقي:' : 'Rem:'} {upd.remaining} {upd.unit}</div>
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1.5">
                        <div 
                          className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                          style={{ width: `${upd.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100 text-[10px] text-gray-500 font-bold">
                    <div className="p-1 bg-white rounded shadow-sm">
                      <UserIcon className="w-3 h-3 text-blue-400" />
                    </div>
                    <span className="truncate">{upd.reporterName || (isRtl ? 'مشرف ميداني' : 'Field Supervisor')}</span>
                  </div>
                </div>
              ))}
              {productionFeed.length === 0 && (
                <div className="h-40 flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-30">
                  <ActivityIcon className="w-12 h-12 text-gray-300" />
                  <p className="text-xs font-bold text-gray-400 italic">
                    {isRtl ? 'بانتظار تحديثات الفترة القادمة...' : 'Waiting for next interval update...'}
                  </p>
                </div>
              )}
            </div>

            <button 
              onClick={() => onNavigate?.('operations')}
              className="w-full py-3 bg-[#040957] hover:bg-blue-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
            >
              <ActivityIcon className="w-3.5 h-3.5" />
              {isRtl ? 'رفع تحديث جديد' : 'Submit Interval Update'}
            </button>
          </div>
        </div>
      </div>

      {/* Projects Status Overview Matrix */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#040957] font-sans">{t.projectStatus}</h2>
            <p className="text-xs text-gray-400">{isRtl ? 'تحليل حالة التنفيذ للمشاريع المسجلة' : 'Individual KPI performance metrics for active sites'}</p>
          </div>
          {/* Status Buttons filters */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
            <button 
              onClick={() => setActiveFilter('all')} 
              className={`px-3 py-1.5 rounded-lg transition ${activeFilter === 'all' ? 'bg-[#040957] text-white shadow-md' : 'text-gray-500 hover:text-[#040957]'}`}
            >
              {t.filterAll}
            </button>
            <button 
              onClick={() => setActiveFilter('Ahead')} 
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeFilter === 'Ahead' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:text-emerald-600'}`}
            >
              {activeFilter !== 'Ahead' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
              {t.ahead} ({aheadCount})
            </button>
            <button 
              onClick={() => setActiveFilter('On Track')} 
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeFilter === 'On Track' ? 'bg-[#0080FF] text-white shadow-md' : 'text-gray-500 hover:text-[#0080FF]'}`}
            >
              {activeFilter !== 'On Track' && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
              {t.onTrack} ({onTrackCount})
            </button>
            <button 
              onClick={() => setActiveFilter('Delayed')} 
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeFilter === 'Delayed' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:text-red-600'}`}
            >
              {activeFilter !== 'Delayed' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
              {t.delayed} ({delayedCount})
            </button>
          </div>
        </div>

        {/* List Grid of Projects metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map(p => {
              const progress = getProjectProgress(p, workItems, activities, progressUpdates);
              const plannedProgress = getProjectPlannedProgress(p);
              
              let barColor = 'bg-[#0080FF]';
              let bgLight = 'bg-blue-50/50';
              let textColor = 'text-[#0140FF]';
              let statusText = t.onTrack;
              let dotColor = 'bg-blue-500';

              if (p.status === 'Ahead') {
                barColor = 'bg-emerald-500';
                bgLight = 'bg-emerald-50/50';
                textColor = 'text-emerald-700';
                statusText = t.ahead;
                dotColor = 'bg-emerald-500';
              } else if (p.status === 'Delayed') {
                barColor = 'bg-red-500';
                bgLight = 'bg-red-50/50';
                textColor = 'text-red-700';
                statusText = t.delayed;
                dotColor = 'bg-red-500';
              }

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={p.id} 
                  className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 space-y-4 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="font-mono text-[9px] text-gray-400 font-black tracking-widest bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{p.projectNumber}</span>
                      <h3 className="font-black text-[#040957] text-sm font-sans line-clamp-1 group-hover:text-[#0080FF] transition-colors">{isRtl ? p.nameAr : p.nameEn}</h3>
                      <p className="text-[10px] text-gray-500 font-bold line-clamp-1 opacity-60">{isRtl ? p.clientAr : p.clientEn}</p>
                    </div>
                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider flex items-center gap-1.5 ${bgLight} ${textColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} inline-block animate-pulse`}></span>
                      {statusText}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-gray-400">
                        <span>{t.actualProgress}</span>
                        <span className="text-[#040957]">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-2 rounded-full ${barColor} relative`}
                        >
                          <div className="absolute top-0 right-0 w-1 h-full bg-white/20"></div>
                        </motion.div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-gray-50 rounded-lg text-[9px] font-bold">
                      <div className="flex items-center gap-1 text-gray-400 uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        <span>{t.plannedProgress}:</span>
                      </div>
                      <span className="text-gray-600">{plannedProgress}%</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 text-[10px] border-t border-gray-50">
                    <div>
                      <span className="block text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">{isRtl ? 'الموقع الجغرافي' : 'Site Geo'}</span>
                      <span className="text-[#040957] font-bold line-clamp-1">{isRtl ? p.locationAr : p.locationEn}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-0.5">{isRtl ? 'موعد التسليم' : 'Delivery'}</span>
                      <span className="text-[#040957] font-black font-mono">{p.endDate}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => onNavigate && onNavigate('reports')}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#040957] text-white hover:bg-[#0080FF] shadow-lg shadow-blue-900/10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isRtl ? 'عرض التقارير والاعتماد' : 'Review Command Hub'}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filteredProjects.length === 0 && (
            <div className="col-span-3 text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-xs font-black uppercase tracking-widest">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
              {isRtl ? 'لا توجد نتائج مطابقة للفلترة حالياً' : 'No operational matches found'}
            </div>
          )}
        </div>
      </div>
    </div>

      <AnimatePresence>
        {isFeedExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-gray-100 flex flex-col overflow-y-auto feed-expanded-container font-sans print:bg-white print:p-0 print:block"
          >
            {/* Interactive Sticky Top Bar */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-[1100] print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#040957] text-white rounded-xl shadow-md">
                  <ActivityIcon className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-[#040957]">{isRtl ? 'صانع ومحرر تقارير الإنجاز الميداني المباشر' : 'Live Field Production Report Builder'}</h1>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                    {isRtl ? 'تحرير البيانات الفنية، تفعيل شروط الترخيص، وتصدير التقارير الرسمية' : 'Configure metadata, customize brand elements, and export official PDFs'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {/* Print Day Selector */}
                <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold shadow-sm">
                  <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="text-gray-500 whitespace-nowrap text-[10px] uppercase tracking-wider font-extrabold">
                    {isRtl ? 'يوم الطباعة المستهدف:' : 'Print Target Day:'}
                  </span>
                  <select
                    value={selectedFeedDateFilter}
                    onChange={(e) => {
                      const val = e.target.value as 'all' | 'today' | 'yesterday' | 'custom';
                      setSelectedFeedDateFilter(val);
                      if (val === 'today') {
                        setSelectedReportDate(todayStr);
                      } else if (val === 'yesterday') {
                        setSelectedReportDate(yesterdayStr);
                      } else if (val === 'custom') {
                        setSelectedReportDate(customFeedDate);
                      }
                    }}
                    className="bg-transparent border-0 font-black text-[#040957] outline-none cursor-pointer focus:ring-0 p-0 pr-6 text-[11px] uppercase"
                  >
                    <option value="all">🌐 {isRtl ? 'جميع التواريخ' : 'All Dates'}</option>
                    <option value="today">📅 {isRtl ? 'اليوم فقط' : 'Today Only'}</option>
                    <option value="yesterday">⏱️ {isRtl ? 'أمس فقط' : 'Yesterday Only'}</option>
                    <option value="custom">✏️ {isRtl ? 'تاريخ محدد...' : 'Custom Date...'}</option>
                  </select>

                  {selectedFeedDateFilter === 'custom' && (
                    <input
                      type="date"
                      value={customFeedDate}
                      onChange={(e) => {
                        const dateVal = e.target.value;
                        setCustomFeedDate(dateVal);
                        setSelectedReportDate(dateVal);
                      }}
                      className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </div>

                <button 
                  onClick={handlePrintFeed}
                  disabled={isPrinting}
                  className={`py-2.5 px-5 rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 font-extrabold text-xs group shrink-0 ${isPrinting ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 text-white'}`}
                >
                  {isPrinting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Printer className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                  )}
                  <span>
                    {isPrinting 
                      ? (isRtl ? 'جاري تصدير التقرير...' : 'Exporting PDF...') 
                      : (isRtl ? 'تحميل بصيغة PDF' : 'Download Official PDF')}
                  </span>
                </button>

                <button 
                  onClick={() => setIsFeedExpanded(false)}
                  className="p-2.5 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all border border-gray-200 active:scale-95 shrink-0"
                  title={isRtl ? 'إغلاق المحرر' : 'Close Editor'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Split Screen Report Workspace */}
            <div className="max-w-7xl mx-auto w-full p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start print:p-0 print:block">
              
              {/* Left Column: Interactive Dropdown Accordions (Print Hidden) */}
              <div className="lg:col-span-5 space-y-4 print:hidden">
                <div className="bg-[#040957] text-white p-4 rounded-2xl shadow-md">
                  <h3 className="text-sm font-extrabold uppercase tracking-widest">{isRtl ? 'لوحة التحكم والخصائص' : 'Intelligence Control Hub'}</h3>
                  <p className="text-[10px] text-blue-200 font-bold mt-1">
                    {isRtl ? 'افتح القوائم المنسدلة أدناه لتعديل وتنظيم تفاصيل وثيقة التقرير' : 'Open the dropdown accordions below to customize core report settings'}
                  </p>
                </div>

                {/* ACCORDION 1: Company Profile & Official Credentials */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setIsCompanyAccordionOpen(!isCompanyAccordionOpen)}
                    className="w-full px-5 py-4 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <span className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                        {isRtl ? '١. بيانات الشركة والشعار المعتمد' : '1. Company Profile & Credentials'}
                      </span>
                    </div>
                    {isCompanyAccordionOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>

                  {isCompanyAccordionOpen && (
                    <div className="p-5 border-t border-gray-100 bg-white space-y-4">
                      <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        {settings?.companyLogoUrl ? (
                          <img src={settings.companyLogoUrl} alt="Company Logo" className="h-12 w-auto object-contain max-w-[80px]" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center text-white text-xl">🏢</div>
                        )}
                        <div>
                          <h4 className="text-xs font-extrabold text-[#040957]">{isRtl ? settings?.companyNameAr || 'شركة الرشيد للمقاولات' : settings?.companyNameEn || 'Rashed Al-Subaie Contracting Co.'}</h4>
                          <span className="text-[9px] text-gray-400 font-bold">{isRtl ? 'الهوية الرسمية واللوجو مفعلين للطباعة' : 'Corporate identity & logo loaded for print'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'السجل التجاري' : 'CR Number'}</label>
                          <input 
                            type="text" 
                            disabled
                            value={settings?.commercialRegistration || '-'} 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono font-bold text-gray-600 cursor-not-allowed" 
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'الرقم الضريبي' : 'VAT Number'}</label>
                          <input 
                            type="text" 
                            disabled
                            value={settings?.taxNumber || '-'} 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono font-bold text-gray-600 cursor-not-allowed" 
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'العنوان الجغرافي للمقر الرئيسي' : 'Registered Headquarters Address'}</label>
                          <input 
                            type="text" 
                            disabled
                            value={(isRtl ? settings?.officialAddressAr : settings?.officialAddressEn) || '-'} 
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold text-gray-600 cursor-not-allowed text-[10px]" 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 2: Live Operational Performance Indicators */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setIsMetricsAccordionOpen(!isMetricsAccordionOpen)}
                    className="w-full px-5 py-4 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      <span className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                        {isRtl ? '٢. إحصائيات الإنجاز وحالة الفترة' : '2. Key Performance Indicators'}
                      </span>
                    </div>
                    {isMetricsAccordionOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>

                  {isMetricsAccordionOpen && (
                    <div className="p-5 border-t border-gray-100 bg-white space-y-3">
                      <p className="text-[10px] text-gray-400 font-bold mb-2 leading-relaxed">
                        {isRtl ? 'تم احتساب هذه المؤشرات آلياً وتحديثها ديناميكياً استناداً للبيانات الحالية بالفترة الزمنية النشطة:' : 'These values are automatically compiled and dynamically updated based on the currently filtered production interval updates:'}
                      </p>
                      
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-[10px] text-gray-500 font-bold">{isRtl ? 'إجمالي فترات التحديث' : 'Total Interval Records'}</span>
                          <span className="text-xs font-black text-slate-800 font-mono bg-white px-2.5 py-1 rounded-lg border border-gray-200">{filteredProductionFeed.length}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-[10px] text-gray-500 font-bold">{isRtl ? 'الكمية الإجمالية المنجزة' : 'Total Output Quantity'}</span>
                          <span className="text-xs font-black text-blue-600 font-mono bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                            +{filteredProductionFeed.reduce((sum, item) => sum + item.completedQuantity, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-[10px] text-gray-500 font-bold">{isRtl ? 'متوسط كفاءة الإنجاز للفترة' : 'Average Interval Efficiency'}</span>
                          <span className="text-xs font-black text-emerald-600 font-mono bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                            {filteredProductionFeed.length > 0 ? Math.round(filteredProductionFeed.reduce((sum, item) => sum + (item.shiftAchievement || 0), 0) / filteredProductionFeed.length) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 3: Document Meta Configuration & Override */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setIsConfigAccordionOpen(!isConfigAccordionOpen)}
                    className="w-full px-5 py-4 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-amber-600" />
                      <span className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                        {isRtl ? '٣. تخصيص عناوين ونصوص التقرير' : '3. Customize Titles & Metadata'}
                      </span>
                    </div>
                    {isConfigAccordionOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>

                  {isConfigAccordionOpen && (
                    <div className="p-5 border-t border-gray-100 bg-white space-y-4 text-[11px]">
                      {/* Active Project Filter */}
                      <div>
                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'تصفية المشروع المستهدف:' : 'Active Project Target'}</label>
                        <select 
                          value={filterProjectId}
                          onChange={(e) => setFilterProjectId(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 text-[#040957] font-extrabold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        >
                          <option value="all">{isRtl ? 'جميع المشاريع النشطة' : 'All Active Projects'}</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'تاريخ التقرير المعتمد' : 'Official Report Date'}</label>
                          <input 
                            type="date" 
                            value={selectedReportDate} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedReportDate(val);
                              setSelectedFeedDateFilter('custom');
                              setCustomFeedDate(val);
                            }} 
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold text-gray-700 focus:ring-1 focus:ring-blue-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'الرقم المرجعي للمستند' : 'Report Serial Reference'}</label>
                          <input 
                            type="text" 
                            value={reportSerialNum} 
                            onChange={(e) => setReportSerialNum(e.target.value)} 
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 font-mono font-bold text-gray-700 focus:ring-1 focus:ring-blue-500" 
                          />
                        </div>
                      </div>

                      {/* Title Configurations */}
                      <div className="space-y-3 pt-2 border-t border-gray-100">
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'عنوان التقرير الفني (بالعربية)' : 'Report Title (Arabic)'}</label>
                          <input 
                            type="text" 
                            value={customReportTitleAr} 
                            onChange={(e) => setCustomReportTitleAr(e.target.value)} 
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold text-gray-800 text-xs focus:ring-1 focus:ring-blue-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'عنوان التقرير الفني (بالإنجليزية)' : 'Report Title (English)'}</label>
                          <input 
                            type="text" 
                            value={customReportTitleEn} 
                            onChange={(e) => setCustomReportTitleEn(e.target.value)} 
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold text-gray-800 text-xs focus:ring-1 focus:ring-blue-500" 
                          />
                        </div>
                      </div>

                      {/* Remarks Inputs */}
                      <div className="space-y-3 pt-2 border-t border-gray-100">
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'الملاحظات الفنية للتدقيق الميداني (بالعربية)' : 'Field Technical Remarks (Arabic)'}</label>
                          <textarea 
                            rows={3}
                            value={customRemarksAr} 
                            onChange={(e) => setCustomRemarksAr(e.target.value)} 
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold text-gray-700 text-[10px] focus:ring-1 focus:ring-blue-500 leading-relaxed" 
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'الملاحظات الفنية للتدقيق الميداني (بالإنجليزية)' : 'Field Technical Remarks (English)'}</label>
                          <textarea 
                            rows={3}
                            value={customRemarksEn} 
                            onChange={(e) => setCustomRemarksEn(e.target.value)} 
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold text-gray-700 text-[10px] focus:ring-1 focus:ring-blue-500 leading-relaxed" 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 3.5: Date Distinction & Filtering */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setIsDateAccordionOpen(!isDateAccordionOpen)}
                    type="button"
                    className="w-full px-5 py-4 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-5 h-5 text-purple-600 animate-pulse" />
                      <span className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                        {isRtl ? '٣.٥. فرز وتحديد التواريخ الميدانية' : '3.5. Date Filtering & Distinction'}
                      </span>
                    </div>
                    {isDateAccordionOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>

                  {isDateAccordionOpen && (
                    <div className="p-5 border-t border-gray-100 bg-white space-y-4 text-[11px]">
                      <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                        {isRtl ? 'اختر كيف تود تصفية واستعراض التحديثات الميدانية المسجلة داخل وثيقة التقرير المعتمد:' : 'Choose how you would like to isolate or group field progress updates inside the official document preview:'}
                      </p>

                      <div className="space-y-2">
                        {/* Segmented control buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedFeedDateFilter('all')}
                            type="button"
                            className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${selectedFeedDateFilter === 'all' ? 'bg-[#040957] text-white border-[#040957] shadow-md' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'}`}
                          >
                            <span>🌐 {isRtl ? 'جميع التواريخ' : 'All Dates'}</span>
                          </button>
                          <button
                            onClick={() => setSelectedFeedDateFilter('today')}
                            type="button"
                            className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${selectedFeedDateFilter === 'today' ? 'bg-[#040957] text-white border-[#040957] shadow-md' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'}`}
                          >
                            <span>📅 {isRtl ? 'اليوم فقط' : 'Today Only'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSelectedFeedDateFilter('yesterday')}
                            type="button"
                            className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${selectedFeedDateFilter === 'yesterday' ? 'bg-[#040957] text-white border-[#040957] shadow-md' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'}`}
                          >
                            <span>⏱️ {isRtl ? 'أمس فقط' : 'Yesterday Only'}</span>
                          </button>
                          <button
                            onClick={() => setSelectedFeedDateFilter('custom')}
                            type="button"
                            className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5 ${selectedFeedDateFilter === 'custom' ? 'bg-[#040957] text-white border-[#040957] shadow-md' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'}`}
                          >
                            <span>✏️ {isRtl ? 'تاريخ محدد' : 'Custom Date'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Display Info or Custom Date Picker */}
                      {selectedFeedDateFilter === 'all' && (
                        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/60 text-[10px] text-blue-800 font-bold leading-relaxed">
                          📌 {isRtl 
                            ? 'يتم الآن تجميع وعرض كافة التحديثات مصنفة بشكل تلقائي حسب اليوم والتاريخ مع تلوين فواصل المجموعات واحتساب مجاميعها بشكل منفصل.' 
                            : 'All logs are currently consolidated and organized in clean sequential date sections with dynamic daily total summary counts.'}
                        </div>
                      )}

                      {selectedFeedDateFilter === 'today' && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[10px] text-emerald-800 font-bold flex items-center justify-between">
                          <span>📅 {isRtl ? `تاريخ اليوم المعتمد:` : `Active Today Date:`}</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 font-black">{todayStr}</span>
                        </div>
                      )}

                      {selectedFeedDateFilter === 'yesterday' && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-800 font-bold flex items-center justify-between">
                          <span>📅 {isRtl ? `تاريخ الأمس:` : `Yesterday Date:`}</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border-amber-200 font-black">{yesterdayStr}</span>
                        </div>
                      )}

                      {selectedFeedDateFilter === 'custom' && (
                        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                          <label className="block text-[9px] font-black text-gray-400 uppercase">{isRtl ? 'اختر اليوم المستهدف:' : 'Select Target Calendar Date'}</label>
                          <input 
                            type="date"
                            value={customFeedDate}
                            onChange={(e) => setCustomFeedDate(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg p-2 font-bold font-mono text-gray-700 focus:ring-1 focus:ring-blue-500 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ACCORDION 4: Signatories & Verification */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setIsSignaturesAccordionOpen(!isSignaturesAccordionOpen)}
                    className="w-full px-5 py-4 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <span className="font-extrabold text-xs uppercase tracking-wider text-gray-700">
                        {isRtl ? '٤. أسماء واختصاصات التوقيع المعتمد' : '4. Verification & Signatories'}
                      </span>
                    </div>
                    {isSignaturesAccordionOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>

                  {isSignaturesAccordionOpen && (
                    <div className="p-5 border-t border-gray-100 bg-white space-y-4 text-[11px]">
                      <div>
                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'اسم المهندس المعتمد للتقرير الميداني' : 'Site Supervising Engineer (Reporter)'}</label>
                        <input 
                          type="text" 
                          disabled
                          value={isRtl ? 'مشرف ميداني معتمد' : 'Authorized Field Supervisor'} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold text-gray-500 cursor-not-allowed" 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'اسم ممثل استشاري الإشراف الفني' : 'Consultant Representative (Verifier)'}</label>
                        <input 
                          type="text" 
                          disabled
                          value={isRtl ? 'الجهة الفنية الاستشارية المشرفة' : 'Consultant Supervision Body'} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold text-gray-500 cursor-not-allowed" 
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">{isRtl ? 'اسم مدير المشروع (الاعتماد النهائي)' : 'Authorized Project Manager'}</label>
                        <input 
                          type="text" 
                          disabled
                          value={((isRtl ? settings?.managerNameAr : settings?.managerNameEn) || (isRtl ? 'المهندس المشرف العام' : 'Executive Project Manager'))} 
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-bold text-gray-600 cursor-not-allowed" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Dynamic A4 Sheet Preview Panel */}
              <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-gray-200 shadow-xl relative min-h-[980px] font-sans print:p-0 print:border-none print:shadow-none print:bg-white print:block">
                
                {/* Visual Accent top margin */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-[#040957] rounded-t-3xl print:hidden"></div>
                
                {/* Live Badge for Interactive on-screen preview */}
                <div className="absolute -top-3 right-6 bg-amber-500 text-white font-extrabold text-[9px] px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1 border border-amber-400 animate-pulse print:hidden">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'معاينة المستند المباشرة (A4)' : 'Live A4 Document Preview'}</span>
                </div>

                {/* Report Content Container (Matches handlePrintFeed exactly!) */}
                <div className="mt-4 print:mt-0 text-slate-900" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
                  
                  {/* Corporate Header Block */}
                  <div className="border-b-4 border-[#040957] pb-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center">
                        {settings?.companyLogoUrl ? (
                          <img src={settings.companyLogoUrl} alt="Logo" className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="text-2xl">🏢</div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h2 className="text-base font-extrabold text-[#040957] tracking-tight">
                          {((isRtl ? settings?.companyNameAr : settings?.companyNameEn) || (isRtl ? 'شركة الرشيد للمقاولات' : 'Rashed Al-Subaie Contracting Co.'))}
                        </h2>
                        <p className="text-[10px] text-gray-500 font-bold leading-none">
                          {isRtl ? settings?.officialAddressAr : settings?.officialAddressEn}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold leading-none mt-1">
                          {isRtl ? 'سجل تجاري: ' : 'CR: '}{settings?.commercialRegistration || '-'} | {isRtl ? 'الرقم الضريبي: ' : 'VAT: '}{settings?.taxNumber || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="text-left rtl:text-right sm:text-right space-y-1 sm:border-l sm:rtl:border-l-0 sm:rtl:border-r border-gray-100 sm:pl-4 sm:rtl:pl-0 sm:rtl:pr-4">
                      <span className="inline-block bg-[#040957] text-white font-extrabold text-[8px] px-2 py-0.5 rounded uppercase tracking-wider">
                        {isRtl ? 'تقرير فني رسمي' : 'Official Tech Report'}
                      </span>
                      <h3 className="text-sm font-black text-slate-800 line-clamp-1 mt-0.5">
                        {isRtl ? customReportTitleAr : customReportTitleEn}
                      </h3>
                      <p className="text-[9px] text-gray-400 font-mono font-bold leading-none">
                        {isRtl ? 'رقم المستند: ' : 'Doc ID: '}<span className="text-slate-700 font-bold">{reportSerialNum}</span>
                      </p>
                    </div>
                  </div>

                  {/* Metadata Info Card Grid */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-0.5">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">{isRtl ? 'المشروع المعتمد للفترة' : 'Target Site Project'}</span>
                      <span className="text-slate-800 font-extrabold line-clamp-1">{isRtl ? selectedProjectName : selectedProjectNameEn}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">{isRtl ? 'تاريخ استخراج التقرير' : 'Report Log Date'}</span>
                      <span className="text-slate-800 font-extrabold font-mono">{selectedReportDate}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">{isRtl ? 'وقت التحديث المستمر' : 'Sync Extraction Time'}</span>
                      <span className="text-slate-800 font-extrabold font-mono">
                        {new Date().toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider">{isRtl ? 'مستوى الحماية الأمنية' : 'Security Clearance'}</span>
                      <span className="text-emerald-600 font-extrabold">{isRtl ? 'مسؤول وموثوق' : 'Verified & Safe'}</span>
                    </div>
                  </div>

                  {/* Operational Summary Indicator blocks */}
                  <div className="mb-6">
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 border-b border-gray-100 pb-1">
                      {isRtl ? 'مؤشرات الأداء التشغيلية للفترة' : 'Operational Performance Summary'}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3">
                        <span className="block text-[18px] font-extrabold text-slate-800 font-mono leading-none">{filteredProductionFeed.length}</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider mt-1 block">{isRtl ? 'سجلات التحديثات' : 'Interval Updates'}</span>
                      </div>
                      <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3">
                        <span className="block text-[18px] font-extrabold text-blue-600 font-mono leading-none">
                          +{filteredProductionFeed.reduce((sum, item) => sum + item.completedQuantity, 0)}
                        </span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider mt-1 block">{isRtl ? 'الكمية الإجمالية للفترة' : 'Total Output Qty'}</span>
                      </div>
                      <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-3">
                        <span className="block text-[18px] font-extrabold text-emerald-600 font-mono leading-none">
                          {filteredProductionFeed.length > 0 ? Math.round(filteredProductionFeed.reduce((sum, item) => sum + (item.shiftAchievement || 0), 0) / filteredProductionFeed.length) : 0}%
                        </span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider mt-1 block">{isRtl ? 'متوسط كفاءة الإنجاز' : 'Avg Interval Achievement'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Interval Logs Table */}
                  <div className="mb-6">
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2.5 border-b border-gray-100 pb-1">
                      {isRtl ? 'تفاصيل فترات الإنجاز الميداني (كل ساعتين)' : 'Detailed 2-Hour Achievement logs'}
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] text-slate-700 border-collapse">
                        <thead>
                          <tr className="bg-[#040957] text-white uppercase text-[9px] tracking-wider font-extrabold">
                            <th className="py-2.5 px-3 rounded-l-lg rtl:rounded-l-none rtl:rounded-r-lg text-center" style={{ width: '6%' }}>{isRtl ? 'م' : 'SN'}</th>
                            <th className="py-2.5 px-3 text-left rtl:text-right" style={{ width: '36%' }}>{isRtl ? 'بند النشاط الميداني' : 'Activity Description'}</th>
                            <th className="py-2.5 px-3 text-center" style={{ width: '12%' }}>{isRtl ? 'الوقت' : 'Time'}</th>
                            <th className="py-2.5 px-3 text-center" style={{ width: '14%' }}>{isRtl ? 'الكمية المنفذة' : 'Qty'}</th>
                            <th className="py-2.5 px-3 text-center" style={{ width: '12%' }}>{isRtl ? 'إنجاز الفترة' : 'Interval'}</th>
                            <th className="py-2.5 px-3 text-center" style={{ width: '12%' }}>{isRtl ? 'الإجمالي التراكمي' : 'Total %'}</th>
                            <th className="py-2.5 px-3 text-left rtl:text-right" style={{ width: '16%' }}>{isRtl ? 'المشرف' : 'Supervisor'}</th>
                            <th className="py-2.5 px-3 rounded-r-lg rtl:rounded-r-none rtl:rounded-l-lg text-center print:hidden" style={{ width: '8%' }}>{isRtl ? 'إدارة' : 'Manage'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredProductionFeed.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="text-center py-8 text-gray-400 italic">
                                {isRtl ? 'لا يوجد تحديثات مسجلة لهذه الفترات' : 'No operational intervals recorded for the current filter'}
                              </td>
                            </tr>
                          ) : (
                            sortedDateKeys.map((dateKey) => {
                              const groupItems = groupedFeedByDate[dateKey];
                              const formattedDate = () => {
                                try {
                                  const dateObj = new Date(dateKey);
                                  if (dateKey === todayStr) {
                                    return isRtl ? `اليوم - ${dateKey}` : `Today - ${dateKey}`;
                                  } else if (dateKey === yesterdayStr) {
                                    return isRtl ? `الأمس - ${dateKey}` : `Yesterday - ${dateKey}`;
                                  }
                                  return dateObj.toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  });
                                } catch {
                                  return dateKey;
                                }
                              };

                              return (
                                <React.Fragment key={dateKey}>
                                  {/* Date Group Separation Header Row */}
                                  <tr className="bg-slate-50 font-bold border-y border-slate-200">
                                    <td colSpan={8} className="py-2 px-3 text-left rtl:text-right text-[#040957] text-[10px] uppercase font-black tracking-wider">
                                      <div className="flex items-center gap-2">
                                        <span className="text-blue-700">📅 {formattedDate()}</span>
                                        <span className="bg-blue-100 text-blue-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                          {groupItems.length} {isRtl ? 'تحديثات' : 'updates'}
                                        </span>
                                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                          {isRtl ? 'الإنتاج:' : 'Qty:'} +{groupItems.reduce((sum, item) => sum + item.completedQuantity, 0)}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                  {groupItems.map((upd, index) => (
                                    <tr key={upd.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="py-3 px-3 text-center font-mono font-bold text-gray-400">{index + 1}</td>
                                      <td className="py-3 px-3 text-left rtl:text-right font-extrabold text-[#040957]">{upd.activityName}</td>
                                      <td className="py-3 px-3 text-center font-mono text-gray-500 font-bold">{upd.time}</td>
                                      <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-800">+{upd.completedQuantity} {upd.unit}</td>
                                      <td className="py-3 px-3 text-center font-mono font-extrabold text-blue-600">{upd.shiftAchievement !== null ? `${upd.shiftAchievement}%` : '-'}</td>
                                      <td className="py-3 px-3 text-center font-mono font-extrabold text-emerald-600">{upd.completionPercentage}%</td>
                                      <td className="py-3 px-3 text-left rtl:text-right text-gray-500 font-bold">{upd.reporterName || (isRtl ? 'مشرف ميداني' : 'Field Supervisor')}</td>
                                      <td className="py-3 px-3 text-center print:hidden">
                                        <button 
                                          onClick={() => {
                                            if (window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا التحديث؟' : 'Are you sure you want to delete this update?')) {
                                              onDeleteProgressUpdate?.(upd.id);
                                            }
                                          }}
                                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                          title={isRtl ? 'حذف' : 'Delete'}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Technical Remarks Box */}
                  <div className="mb-8">
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 border-b border-gray-100 pb-1">
                      {isRtl ? 'الملاحظات والتدقيق الفني للموقع' : 'Field Technical Remarks & Notes'}
                    </div>
                    <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 text-[10px] sm:text-xs text-gray-600 font-medium leading-relaxed">
                      {isRtl ? customRemarksAr : customRemarksEn}
                    </div>
                  </div>

                  {/* Signatures/Approvals Block */}
                  <div>
                    <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-6 border-b border-gray-100 pb-1">
                      {isRtl ? 'تراخيص التوقيع الفني والاعتماد الميداني' : 'Regulatory Sign-offs & Authorizations'}
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div className="space-y-1.5">
                        <div className="h-10 flex items-end justify-center">
                          <span className="font-mono text-[10px] text-slate-300 italic">SYSTEM_VERIFIED</span>
                        </div>
                        <div className="border-t border-slate-300 pt-2">
                          <span className="block text-[11px] font-extrabold text-slate-800 leading-none">
                            {isRtl ? 'المهندس الميداني بالموقع' : 'Site Supervising Engineer'}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 block">{isRtl ? 'معد التقرير' : 'Reporter'}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="h-10 flex items-end justify-center">
                          <span className="font-mono text-[10px] text-slate-300 italic">REVIEWED_OK</span>
                        </div>
                        <div className="border-t border-slate-300 pt-2">
                          <span className="block text-[11px] font-extrabold text-slate-800 leading-none">
                            {isRtl ? 'استشاري الإشراف الفني' : 'Consultant Representative'}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 block">{isRtl ? 'مدقق فني' : 'Technical Reviewer'}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="h-10 flex items-end justify-center">
                          <span className="font-mono text-xs text-blue-600 font-bold italic">
                            {((isRtl ? settings?.managerNameAr : settings?.managerNameEn) || 'Fahad Al-Otaibi')}
                          </span>
                        </div>
                        <div className="border-t border-slate-300 pt-2">
                          <span className="block text-[11px] font-extrabold text-slate-800 leading-none">
                            {((isRtl ? settings?.managerNameAr : settings?.managerNameEn) || (isRtl ? 'مدير المشروع الفني' : 'Technical Project Manager'))}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5 block">{isRtl ? 'الاعتماد المعتمد' : 'PM Approval'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
