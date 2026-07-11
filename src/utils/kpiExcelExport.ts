/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedKpiReport, SavedReport } from '../types';

interface SystemSettings {
  companyNameAr: string;
  companyNameEn: string;
  managerNameEn: string;
  managerNameAr: string;
  managerSignature: string;
  [key: string]: any;
}

/**
 * Normalizes both SavedKpiReport and SavedReport of type 'kpi' into a unified structure
 */
function normalizeKpiReport(report: SavedKpiReport | SavedReport): {
  reportNumber: string;
  reportDate: string;
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
  createdByName: string;
  timestamp: string;
} {
  // If it's a SavedReport (general archive)
  if ('reportType' in report && report.reportType === 'kpi') {
    return {
      reportNumber: report.reportNumber,
      reportDate: report.reportDate,
      projectNameEn: report.projectNameEn || 'Enterprise Wide',
      projectNameAr: report.projectNameAr || 'كافة المشاريع والعمليات',
      targetQuantity: report.data.targetQuantity ?? 0,
      actualQuantity: report.data.actualQuantity ?? 0,
      attendanceRate: report.data.attendanceRate ?? 0,
      presentWorkers: report.data.presentWorkers ?? 0,
      absentWorkers: report.data.absentWorkers ?? 0,
      efficiency: report.data.efficiency ?? '100%',
      safetyScore: report.data.safetyScore ?? 100,
      openIssuesCount: report.data.openIssuesCount ?? 0,
      capacityUtilization: report.data.capacityUtilization ?? 100,
      supervisorNotes: report.supervisorNotes ?? '',
      createdByName: report.createdByName || 'Supervisor',
      timestamp: report.timestamp
    };
  }

  // If it's a SavedKpiReport (from dashboard)
  const kpiReport = report as SavedKpiReport;
  return {
    reportNumber: kpiReport.reportNumber,
    reportDate: kpiReport.reportDate,
    projectNameEn: kpiReport.projectNameEn || 'Enterprise Wide',
    projectNameAr: kpiReport.projectNameAr || 'كافة المشاريع والعمليات',
    targetQuantity: kpiReport.targetQuantity ?? 0,
    actualQuantity: kpiReport.actualQuantity ?? 0,
    attendanceRate: kpiReport.attendanceRate ?? 0,
    presentWorkers: kpiReport.presentWorkers ?? 0,
    absentWorkers: kpiReport.absentWorkers ?? 0,
    efficiency: kpiReport.efficiency ?? '100%',
    safetyScore: kpiReport.safetyScore ?? 100,
    openIssuesCount: kpiReport.openIssuesCount ?? 0,
    capacityUtilization: kpiReport.capacityUtilization ?? 100,
    supervisorNotes: kpiReport.supervisorNotes ?? '',
    createdByName: kpiReport.createdByName || 'Supervisor',
    timestamp: kpiReport.timestamp
  };
}

/**
 * Generates and downloads a beautifully styled Excel CSV for KPI Performance Reports
 */
export function exportKpiToExcel(
  rawReport: SavedKpiReport | SavedReport,
  isRtl: boolean,
  settings: SystemSettings
) {
  const data = normalizeKpiReport(rawReport);

  const compEn = settings?.companyNameEn || "AL-NUKHBA FOR CONTRACTING & CIVIL ENGINEERING";
  const compAr = settings?.companyNameAr || "شركة النخبة للمقاولات والهندسة المدنية";

  const percentAchieved = data.targetQuantity > 0 
    ? Math.round((data.actualQuantity / data.targetQuantity) * 100) 
    : 100;

  let csvContent = "";

  // 1. Double line border to enclose the Corporate Identity Header
  csvContent += `==========================================================================================\n`;
  csvContent += `"${compEn}","","","${compAr}"\n`;
  csvContent += `"EXECUTIVE KEY PERFORMANCE INDICATOR (KPI) REPORT","","","${isRtl ? 'التقرير التنفيذي الشامل لمؤشرات الأداء الميداني' : 'EXECUTIVE FIELD METRICS REPORT'}"\n`;
  csvContent += `"OFFICIAL CIVIL & SITE PERFORMANCE ARCHIVAL REGISTER","","","${isRtl ? 'السجل الرسمي المعتمد لتقييم الأداء والإنتاجية' : 'OFFICIAL PERFORMANCE REGISTRY'}"\n`;
  csvContent += `==========================================================================================\n\n`;

  // 2. Report metadata section - organized, spaced, and beautiful
  csvContent += `"${isRtl ? '--- بيانات التقرير والتوثيق المرجعي ---' : '--- DOCUMENT METADATA & CONTROL STATION ---'}"\n`;
  csvContent += `"${isRtl ? 'رقم التقرير المرجعي:' : 'Report Reference ID:'}","${data.reportNumber}","","${isRtl ? 'حالة التوثيق:' : 'Validation Status:'}","${isRtl ? 'معتمد رسميًا' : 'OFFICIALLY APPROVED'}"\n`;
  csvContent += `"${isRtl ? 'المشروع المستهدف:' : 'Target Megaproject:'}","${data.projectNameEn} | ${data.projectNameAr}"\n`;
  csvContent += `"${isRtl ? 'تاريخ القياس الميداني:' : 'Date of Assessment:'}","${data.reportDate}","","${isRtl ? 'المشرف المسؤول:' : 'Prepared By Officer:'}","${data.createdByName}"\n`;
  csvContent += `"${isRtl ? 'وقت الأرشفة السحابية:' : 'Archived Cloud Timestamp:'}","${new Date(data.timestamp).toLocaleString(isRtl ? 'ar-SA' : 'en-US')}"\n`;
  csvContent += `------------------------------------------------------------------------------------------\n\n`;

  // 3. High level performance summary grid with targets
  csvContent += `"${isRtl ? '--- أولاً: مؤشرات الأداء والقياسات الأساسية (الكميات والنسب) ---' : '--- SECTION I: CORE PERFORMANCE INDICATORS (PRODUCTION & EFFICIENCY) ---'}"\n`;
  
  // Headers for table
  const tableHeader = isRtl
    ? '"مؤشر القياس الأداء","الكمية المسجلة / المعدل الحالي","المستهدف المخطط","نسبة الإنجاز الفعلي","توصيف وملاحظات النتيجة"\n'
    : '"KPI Dimension Metric Description","Recorded Value / Index","Benchmark Target","Achievement Rate","Status Analysis Comment"\n';
  
  csvContent += tableHeader;

  // Row 1: Daily Production Output
  const prodStatus = percentAchieved >= 100 
    ? (isRtl ? 'مستهدف مكتمل' : 'TARGET FULLY ACHIEVED') 
    : percentAchieved >= 80 
      ? (isRtl ? 'أداء مستقر ومقبول' : 'STABLE & ACCEPTABLE PERFORMANCE') 
      : (isRtl ? 'خلف الخطة - يتطلب زيادة موارد' : 'BEHIND SCHEDULE - CORRECTION NEEDED');

  csvContent += `"${isRtl ? 'الإنتاجية اليومية المنجزة (التربة والخرسانة)' : 'Daily Production Output (Earthworks / Concrete)'}","${data.actualQuantity} m³","${data.targetQuantity} m³","${percentAchieved}%","${prodStatus}"\n`;

  // Row 2: Labor Productivity Efficiency
  const effStatus = parseFloat(data.efficiency) > 1.2 
    ? (isRtl ? 'إنتاجية ممتازة لكل عامل' : 'EXCELLENT OUTPUT PER WORKER') 
    : (isRtl ? 'معدل إنتاجية طبيعي' : 'OPTIMAL WORKER PRODUCTIVITY RATE');
  csvContent += `"${isRtl ? 'معدل كفاءة القوى البشرية (وحدة/مان-ساعة)' : 'Overall Labor Productivity Efficiency (Output/Man-Hour)'}","${data.efficiency}","1.00 Base Value","N/A","${effStatus}"\n`;

  // Row 3: Safety Compliance Score
  const safetyStatus = data.safetyScore >= 90 
    ? (isRtl ? 'ملتزم بالكامل بمعايير السلامة' : 'FULLY COMPLIANT WITH HSE CODES') 
    : (isRtl ? 'تنبيه: وجود مخالفات أمن وسلامة' : 'ALERT: INSUFFICIENT HSE STANDARDS');
  csvContent += `"${isRtl ? 'مؤشر سلامة الصحة والبيئة والموقع (HSE)' : 'Safety Performance Score / Health Index'}","${data.safetyScore}%","100% Goal","N/A","${safetyStatus}"\n`;

  // Row 4: Capacity Utilization
  const capStatus = data.capacityUtilization >= 90 
    ? (isRtl ? 'استغلال أمثل للطاقة الاستيعابية للعمال' : 'OPTIMAL ALLOCATION & HIGH ATTENDANCE') 
    : (isRtl ? 'معدل استغلال منخفض للقوى البشرية' : 'SUBOPTIMAL ALLOCATION / HIGH ABSENCE');
  csvContent += `"${isRtl ? 'معدل استغلال الطاقة الاستيعابية والكوادر المتاحة' : 'Workforce Capacity Utilization Percentage'}","${data.capacityUtilization}%","90% Target","N/A","${capStatus}"\n`;

  // Row 5: Open Safety Issues
  const issueStatus = data.openIssuesCount === 0 
    ? (isRtl ? 'موقع آمن وخالي من المعوقات' : 'ZERO COMPLIANCE BLOCKS') 
    : (isRtl ? `تنبيه: يوجد عدد ${data.openIssuesCount} قضايا عالقة` : `REMEDIAL ACTION REQUIRED - ${data.openIssuesCount} BLOCKS`);
  csvContent += `"${isRtl ? 'الملاحظات الفنية والمخالفات العالقة' : 'Active Remedial Safety & Technical Issues'}","${data.openIssuesCount} Issues","0 Goals","N/A","${issueStatus}"\n`;

  csvContent += `------------------------------------------------------------------------------------------\n\n`;

  // 4. Secondary Workforce Metrics Section
  csvContent += `"${isRtl ? '--- ثانياً: ملخص حالة القوى البشرية والتحضير ---' : '--- SECTION II: WORKFORCE & DISPATCH STATS SUMMARY ---'}"\n`;
  csvContent += `"${isRtl ? 'معدل الحضور اليومي:' : 'Daily Attendance Rate:'}","${data.attendanceRate}%"\n`;
  csvContent += `"${isRtl ? 'عدد الكوادر المتواجدة بالموقع:' : 'Present Roster Personnel Count:'}","${data.presentWorkers} Workers"\n`;
  csvContent += `"${isRtl ? 'عدد الغائبين والمجازين:' : 'Absent/On-Leave Personnel Count:'}","${data.absentWorkers} Workers"\n`;
  csvContent += `------------------------------------------------------------------------------------------\n\n`;

  // 5. Official Directives / Remarks
  csvContent += `"${isRtl ? '--- ثالثاً: توجيهات المشرف الفنية وملاحظات الموقع ---' : '--- SECTION III: OFFICIAL WRITTEN DIRECTIVES & SITE REMARKS ---'}"\n`;
  csvContent += `"${isRtl ? 'ملاحظات المشرف المسجلة:' : 'Supervisor Notes & Comments:'}"\n`;
  csvContent += `"${data.supervisorNotes ? data.supervisorNotes.replace(/"/g, '""') : (isRtl ? 'لا توجد ملاحظات إضافية اليوم.' : 'No additional supervisor remarks registered for this date.')}"\n`;
  csvContent += `------------------------------------------------------------------------------------------\n\n`;

  // 6. Signature blocks
  csvContent += `"${isRtl ? '--- رابعاً: اعتماد التقرير والتوقيعات الرسمية ---' : '--- SECTION IV: SIGNATURE BLOCKS & VERIFICATION STAMPS ---'}"\n`;
  csvContent += `"${isRtl ? 'معد التقرير (المشرف):' : 'Prepared By Officer (Supervisor):'}","${data.createdByName}","","${isRtl ? 'الجهة المعتمدة:' : 'Approving Manager Name:'}","${settings?.managerNameEn || 'Project Director'} / ${settings?.managerNameAr || 'مدير قطاع المشاريع'}"\n`;
  csvContent += `"${isRtl ? 'التوقيع الكودي للمشرف:' : 'Supervisor System Signature:'}","${data.createdByName?.toUpperCase() || 'SUPERVISOR'}-SIG-2026","","${isRtl ? 'التوقيع المعتمد لمدير المشاريع:' : 'Project Manager Authorized Signature:'}","${settings?.managerSignature || 'APPROVED_AL_NUKHBA_PM'}"\n`;
  csvContent += `==========================================================================================\n`;

  // 7. Download trigger
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  const formattedDate = data.reportDate.replace(/-/g, '');
  link.setAttribute('download', `KPI_Report_${data.reportNumber}_${formattedDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
