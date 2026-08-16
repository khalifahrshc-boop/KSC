import React, { useState, useMemo } from 'react';
import { Project, Worker, AttendanceRecord, SystemSettings } from '../types';
import { Printer, Calendar, Users, Download, Building2, Search } from 'lucide-react';

interface MonthlyAttendanceReportProps {
  projects: Project[];
  workers: Worker[];
  attendanceRecords: AttendanceRecord[];
  settings: SystemSettings;
  lang: 'ar' | 'en';
}

export default function MonthlyAttendanceReport({
  projects,
  workers,
  attendanceRecords,
  settings,
  lang
}: MonthlyAttendanceReportProps) {
  const isRtl = lang === 'ar';
  
  const currentDate = new Date();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));
  const [responsiblePerson, setResponsiblePerson] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Get days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
  }, [selectedMonth, selectedYear]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Filter records for the selected month and project
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter(r => {
      if (selectedProjectId && r.projectId !== selectedProjectId) return false;
      const rDate = new Date(r.date);
      if (rDate.getFullYear() !== parseInt(selectedYear)) return false;
      if (rDate.getMonth() + 1 !== parseInt(selectedMonth)) return false;
      return true;
    });
  }, [attendanceRecords, selectedProjectId, selectedMonth, selectedYear]);

  // Get workers who have records in this month or are active
  const relevantWorkers = useMemo(() => {
    const workerIdsWithRecords = new Set(filteredRecords.map(r => r.workerId));
    let filtered = workers.filter(w => workerIdsWithRecords.has(w.id));
    
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(w => 
        w.fullName.toLowerCase().includes(lowerTerm) || 
        w.badgeNumber.toLowerCase().includes(lowerTerm) ||
        w.professionAr.toLowerCase().includes(lowerTerm)
      );
    }
    return filtered;
  }, [workers, filteredRecords, searchTerm]);

  // Build a matrix: matrix[workerId][day] = hours
  const attendanceMatrix = useMemo(() => {
    const matrix: Record<string, Record<number, { isPresent: boolean, hours: number }>> = {};
    
    relevantWorkers.forEach(w => {
      matrix[w.id] = {};
      daysArray.forEach(d => {
        matrix[w.id][d] = { isPresent: false, hours: 0 };
      });
    });

    filteredRecords.forEach(r => {
      const d = new Date(r.date).getDate();
      if (matrix[r.workerId] && matrix[r.workerId][d]) {
        // Assume 8 hours for present, 0 for absent, 2 for late, etc.
        let hours = 0;
        if (r.isPresent) {
           hours = r.status === 'Late' ? 4 : 8; // Simplified example, can be adjusted
        }
        matrix[r.workerId][d] = {
          isPresent: r.isPresent,
          hours: hours
        };
      }
    });

    return matrix;
  }, [relevantWorkers, filteredRecords, daysArray]);

  const handlePrint = async () => {
    const element = document.getElementById('attendance-print-area');
    if (!element) return;
    
    setIsExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const { runWithOklchSanitizer } = await import('../utils/pdfSanitizer');
      
      const opt = {
        margin:       0.2,
        filename:     `Attendance_Report_${selectedProject?.nameEn || 'Project'}_${selectedYear}_${selectedMonth}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' as const }
      };
      
      await runWithOklchSanitizer(async () => {
        await html2pdf().set(opt).from(element).save();
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const monthNamesEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthNamesAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const monthName = isRtl ? monthNamesAr[parseInt(selectedMonth) - 1] : monthNamesEn[parseInt(selectedMonth) - 1];
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      
      {/* Controls (Hidden in Print) */}
      <div className="print:hidden bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#040957] flex items-center gap-2">
              <Calendar className="w-6 h-6 text-[#0080FF]" />
              {isRtl ? 'كشوفات الحضور الشهرية' : 'Monthly Attendance Reports'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isRtl ? 'استخراج وطباعة كشف الحضور الشهري للعمالة' : 'Generate and print monthly workforce attendance sheets'}
            </p>
          </div>
          <button
            onClick={handlePrint}
            disabled={!selectedProjectId || relevantWorkers.length === 0 || isExporting}
            className="bg-[#040957] hover:bg-[#0a1280] disabled:bg-slate-300 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
          >
            <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
            {isExporting 
              ? (isRtl ? 'جاري التصدير...' : 'Exporting...') 
              : (isRtl ? 'تنزيل الكشف PDF' : 'Download PDF')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{isRtl ? 'المشروع' : 'Project'}</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#0080FF] outline-none"
            >
              <option value="">{isRtl ? 'اختر المشروع...' : 'Select Project...'}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{isRtl ? p.nameAr : p.nameEn}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{isRtl ? 'الشهر' : 'Month'}</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#0080FF] outline-none"
            >
              {monthNamesEn.map((m, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>
                  {isRtl ? monthNamesAr[i] : m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{isRtl ? 'السنة' : 'Year'}</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#0080FF] outline-none"
            >
              {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">{isRtl ? 'اسم المسؤول في الكشف' : 'Responsible Person'}</label>
            <input
              type="text"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              placeholder={isRtl ? 'مثال: م. أحمد محمد' : 'e.g. Eng. Ahmed'}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#0080FF] outline-none"
            />
          </div>
        </div>

        <div className="relative">
          <Search className={`w-4 h-4 absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'البحث عن موظف (الاسم، الرقم، المهنة)...' : 'Search worker...'}
            className={`w-full border border-slate-200 rounded-lg p-2.5 ${isRtl ? 'pr-9' : 'pl-9'} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>
      </div>

      {/* Printable Area */}
      {selectedProjectId && (
        <div id="attendance-print-area" className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-[#040957] pb-6 mb-6">
            <div className="flex items-center gap-4">
              {settings.companyLogoUrl ? (
                <img src={settings.companyLogoUrl} alt="Logo" className="h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-[#040957] rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black text-[#040957]">
                  {isRtl ? settings.companyNameAr : settings.companyNameEn}
                </h1>
                <p className="text-sm text-slate-500 font-bold">
                  {isRtl ? 'سجل الحضور والإنصراف الشهري' : 'Monthly Attendance & Timesheet'}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  <span className="text-slate-500 font-bold">{isRtl ? 'المشروع:' : 'Project:'}</span>
                  <span className="font-black text-[#040957]">{selectedProject ? (isRtl ? selectedProject.nameAr : selectedProject.nameEn) : '---'}</span>
                  
                  <span className="text-slate-500 font-bold">{isRtl ? 'الشهر/السنة:' : 'Month/Year:'}</span>
                  <span className="font-black text-[#040957]">{monthName} {selectedYear}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {relevantWorkers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-[#040957] text-white">
                    <th className="border border-slate-400 p-2 text-center w-8">#</th>
                    <th className="border border-slate-400 p-2 text-start min-w-[150px]">{isRtl ? 'الاسم' : 'Name'}</th>
                    <th className="border border-slate-400 p-2 text-center min-w-[80px]">{isRtl ? 'المهنة' : 'Profession'}</th>
                    {daysArray.map(d => (
                      <th key={d} className="border border-slate-400 p-1 text-center w-6">{d}</th>
                    ))}
                    <th className="border border-slate-400 p-2 text-center min-w-[50px]">{isRtl ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantWorkers.map((worker, idx) => {
                    let totalHours = 0;
                    return (
                      <tr key={worker.id} className="hover:bg-slate-50">
                        <td className="border border-slate-300 py-3 px-2 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-300 py-3 px-2">
                          <div className="font-bold text-[#040957] break-words leading-relaxed pb-1">{worker.fullName}</div>
                          <div className="text-[9px] text-slate-500 font-mono">{worker.badgeNumber}</div>
                        </td>
                        <td className="border border-slate-300 py-3 px-2 text-center text-slate-700 leading-relaxed">
                          {isRtl ? worker.professionAr : worker.professionEn}
                        </td>
                        {daysArray.map(d => {
                          const record = attendanceMatrix[worker.id]?.[d];
                          const hrs = record?.hours || 0;
                          totalHours += hrs;
                          return (
                            <td key={d} className={`border border-slate-300 p-1 text-center font-bold ${hrs > 0 ? 'text-[#0080FF] bg-blue-50/30' : 'text-slate-300'}`}>
                              {hrs > 0 ? hrs : '-'}
                            </td>
                          );
                        })}
                        <td className="border border-slate-300 p-2 text-center font-black text-emerald-600 bg-emerald-50/30">
                          {totalHours}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-12 bg-slate-50 rounded-xl border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold">
                {isRtl ? 'لا يوجد عمالة مسجلة أو لم يتم تسجيل حضور في هذا الشهر للمشروع المحدد.' : 'No workforce registered or no attendance recorded for this month and project.'}
              </p>
            </div>
          )}

          {/* Footer / Signatures */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center space-y-8">
              <p className="text-xs font-bold text-slate-500">{isRtl ? 'المسؤول المباشر' : 'Direct Manager'}</p>
              <div className="border-b-2 border-slate-300 px-4 pb-2">
                <span className="font-black text-sm text-[#040957]">{responsiblePerson || '_________________'}</span>
              </div>
            </div>
            <div className="text-center space-y-8">
              <p className="text-xs font-bold text-slate-500">{isRtl ? 'مهندس المشروع' : 'Project Engineer'}</p>
              <div className="border-b-2 border-slate-300 px-4 pb-2">
                <span className="text-transparent">_________________</span>
              </div>
            </div>
            <div className="text-center space-y-8">
              <p className="text-xs font-bold text-slate-500">{isRtl ? 'مدير المشروع' : 'Project Manager'}</p>
              <div className="border-b-2 border-slate-300 px-4 pb-2">
                <span className="text-transparent">_________________</span>
              </div>
            </div>
            <div className="text-center space-y-8">
              <p className="text-xs font-bold text-slate-500">{isRtl ? 'الختم الرسمي' : 'Official Stamp'}</p>
              <div className="h-20 flex items-end justify-center">
                {settings.officialStampUrl ? (
                  <img src={settings.officialStampUrl} alt="Stamp" className="h-16 object-contain opacity-50 mix-blend-multiply" />
                ) : (
                  <span className="text-slate-200 text-xs italic">Stamp Here</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
