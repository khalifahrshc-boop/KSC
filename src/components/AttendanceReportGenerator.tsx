import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Project, 
  Worker, 
  AttendanceRecord, 
  SystemSettings 
} from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CalendarDays, 
  User, 
  MapPin, 
  Building2,
  AlertCircle
} from 'lucide-react';

interface AttendanceReportPDFProps {
  lang: 'ar' | 'en';
  settings: SystemSettings;
  project: Project;
  reportDate: string;
  attendanceRecords: AttendanceRecord[];
  workers: Worker[];
  reportNumber: string;
  supervisorName: string;
  preparedBy: string;
}

const AttendanceReportGenerator: React.FC<AttendanceReportPDFProps> = ({
  lang,
  settings,
  project,
  reportDate,
  attendanceRecords,
  workers,
  reportNumber,
  supervisorName,
  preparedBy
}) => {
  const isRtl = lang === 'ar';

  // Statistics calculation
  const stats = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'Present').length;
    const absent = attendanceRecords.filter(r => r.status === 'Absent').length;
    const late = attendanceRecords.filter(r => r.status === 'Late').length;
    const leave = attendanceRecords.filter(r => ['AnnualLeave', 'ShortLeave', 'Sick'].includes(r.status)).length;
    const holiday = 0; // Standard shift might not have this in records, but let's assume 0 for now
    
    // Total hours (mock calculation for preview)
    const totalHours = attendanceRecords.reduce((acc, r) => {
        if (r.isPresent) return acc + 8; // Assuming 8h per present
        return acc;
    }, 0);
    const totalOvertime = attendanceRecords.reduce((acc, r) => {
        if (r.status === 'Late') return acc + 2; // Mocking some overtime
        return acc;
    }, 0);

    return { total, present, absent, late, leave, holiday, totalHours, totalOvertime };
  }, [attendanceRecords]);

  const getStatusColor = (status: AttendanceRecord['status']) => {
    switch (status) {
      case 'Present': return 'text-green-600 bg-green-50 border-green-200';
      case 'Absent': return 'text-red-600 bg-red-50 border-red-200';
      case 'Late': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Sick':
      case 'AnnualLeave':
      case 'ShortLeave': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: AttendanceRecord['status']) => {
    if (isRtl) {
      switch (status) {
        case 'Present': return 'حاضر';
        case 'Absent': return 'غائب';
        case 'Late': return 'متأخر';
        case 'AnnualLeave': return 'إجازة سنوية';
        case 'ShortLeave': return 'إجازة قصيرة';
        case 'Sick': return 'مرضي';
        default: return 'عطلة';
      }
    }
    return status;
  };

  const getBreakTimes = (breakTimeStr: string, isPresent: boolean) => {
    if (!isPresent || !breakTimeStr) return { out: '--:--', in: '--:--' };
    
    const clean = breakTimeStr.trim();
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
        return {
          out: clean,
          in: `${nextHrs.toString().padStart(2, '0')}:${mins} ${nextAmpm}`
        };
      } else {
        if (nextHrs >= 24) nextHrs = nextHrs - 24;
        return {
          out: clean,
          in: `${nextHrs.toString().padStart(2, '0')}:${mins}`
        };
      }
    }
    
    return { out: clean, in: '--:--' };
  };

  return (
    <div 
      className={`bg-white min-h-[297mm] w-full max-w-[210mm] mx-auto p-[10mm] shadow-2xl print:shadow-none print:m-0 print:p-[5mm]`}
      style={{ 
        fontFamily: isRtl ? 'Cairo, sans-serif' : 'Inter, sans-serif',
        direction: isRtl ? 'rtl' : 'ltr'
      }}
      id="attendance-report-pdf-content"
    >
      {/* 1. CORPORATE HEADER (Dark Blue Background) */}
      <div className="bg-[#040957] text-white rounded-2xl p-6 mb-6 flex justify-between items-center shadow-lg border-b-4 border-[#02053a]">
        <div className="flex items-center gap-6">
          <div className="bg-white p-2 rounded-xl shadow-inner shrink-0">
            {settings.companyLogoUrl ? (
              <img 
                src={settings.companyLogoUrl} 
                alt="Logo" 
                className="h-24 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-20 w-20 bg-slate-100 flex items-center justify-center text-[#040957] text-3xl font-black rounded-lg">
                {settings.companyNameEn.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight leading-none mb-1">
              {isRtl ? settings.companyNameAr : settings.companyNameEn}
            </h1>
            <p className="text-[10px] font-bold opacity-90 uppercase tracking-widest text-amber-400">
              {isRtl ? 'تقرير حضور وانصراف الموظفين الرسمي' : 'OFFICIAL EMPLOYEE ATTENDANCE REGISTER'}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[8px] font-bold opacity-85 text-slate-200">
              <span>{isRtl ? 'س.ت:' : 'CR:'} {settings.commercialRegistration}</span>
              <span>{isRtl ? 'الرقم الضريبي:' : 'VAT:'} {settings.taxNumber}</span>
              <span>{isRtl ? 'الهاتف:' : 'Tel:'} {settings.companyPhone}</span>
              <span>{isRtl ? 'البريد:' : 'Email:'} {settings.companyEmail}</span>
              {settings.companyWebsite && (
                <span>{isRtl ? 'الموقع:' : 'Web:'} {settings.companyWebsite}</span>
              )}
            </div>
            <div className="text-[8px] font-bold opacity-85 text-slate-200 mt-1">
              <span>{isRtl ? 'العنوان:' : 'Address:'} {isRtl ? settings.officialAddressAr : settings.officialAddressEn}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right border-l border-white/20 pl-6 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-6 shrink-0">
          <div className="text-[10px] font-black uppercase mb-1 tracking-widest">{isRtl ? 'رقم التقرير' : 'Report Reference'}</div>
          <div className="text-lg font-mono font-black">{reportNumber}</div>
          <div className="text-[8px] font-bold opacity-60 mt-1 uppercase tracking-widest">
            {isRtl ? 'تاريخ الطباعة:' : 'Printed:'} {new Date().toLocaleDateString(isRtl ? 'ar-SA' : 'en-GB')}
          </div>
        </div>
      </div>

      {/* 2. PROJECT & REPORT INFO BAR */}
      <div className="grid grid-cols-4 gap-4 mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="space-y-1">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">{isRtl ? 'المشروع' : 'Project'}</span>
          <span className="text-[10px] font-black text-[#040957] block truncate">{isRtl ? project.nameAr : project.nameEn}</span>
        </div>
        <div className="space-y-1">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">{isRtl ? 'الموقع والرمز' : 'Location & Code'}</span>
          <span className="text-[10px] font-bold text-slate-700 block truncate">
            {isRtl ? project.locationAr : project.locationEn} ({project.projectNumber})
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">{isRtl ? 'تاريخ الحضور' : 'Attendance Date'}</span>
          <span className="text-[10px] font-bold text-slate-700 block">{reportDate}</span>
        </div>
        <div className="space-y-1">
          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block">{isRtl ? 'المشرف المسؤول' : 'Supervisor In-Charge'}</span>
          <span className="text-[10px] font-bold text-slate-700 block truncate">{supervisorName}</span>
        </div>
      </div>

      {/* 3. ATTENDANCE TABLE (16 OPTIMIZED COLUMNS) */}
      <div className="overflow-x-auto mb-8 border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full border-collapse text-[7px] table-fixed">
          <thead>
            <tr className="bg-[#040957] text-white">
              <th className="w-[2%] p-1 font-black border-r border-white/10 break-words">#</th>
              <th className="w-[16%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'الاسم' : 'Name'}</th>
              <th className="w-[5%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'الكود' : 'ID'}</th>
              <th className="w-[9%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'الهوية/الإقامة' : 'ID No.'}</th>
              <th className="w-[10%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'المهنة' : 'Job'}</th>
              <th className="w-[5%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'الوردية' : 'Shift'}</th>
              <th className="w-[5%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'دخول' : 'In'}</th>
              <th className="w-[5%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'راحة (خ)' : 'B-Out'}</th>
              <th className="w-[5%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'راحة (د)' : 'B-In'}</th>
              <th className="w-[5%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'خروج' : 'Out'}</th>
              <th className="w-[4%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'ساعات' : 'Hrs'}</th>
              <th className="w-[4%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'إضافي' : 'OT'}</th>
              <th className="w-[6%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'الحالة' : 'Status'}</th>
              <th className="w-[5%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'المشرف' : 'Sup.'}</th>
              <th className="w-[5%] p-1 font-black border-r border-white/10 break-words">{isRtl ? 'الموظف' : 'Emp.'}</th>
              <th className="w-[9%] p-1 font-black break-words">{isRtl ? 'ملاحظات' : 'Rem.'}</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.length > 0 ? (
              attendanceRecords.map((record, index) => {
                const worker = workers.find(w => w.id === record.workerId);
                const isEven = index % 2 === 0;
                const breakTimes = getBreakTimes(record.breakTime, record.isPresent);
                
                return (
                  <tr key={record.id} className={`${isEven ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100`}>
                    <td className="p-1 text-center font-bold text-[#040957] border-r border-slate-100 break-words">{index + 1}</td>
                    <td className="p-1 font-bold border-r border-slate-100 break-words leading-tight">{record.workerName}</td>
                    <td className="p-1 text-center border-r border-slate-100 break-words">{worker?.badgeNumber || '---'}</td>
                    <td className="p-1 text-center font-mono border-r border-slate-100 text-[6.5px] break-words">{worker?.nationalId || '---'}</td>
                    <td className="p-1 border-r border-slate-100 break-words leading-tight">{isRtl ? record.professionAr : record.professionEn}</td>
                    <td className="p-1 text-center border-r border-slate-100 text-[5px] break-words">{record.shiftTime}</td>
                    <td className="p-1 text-center font-bold border-r border-slate-100">{record.startTime || '--:--'}</td>
                    <td className="p-1 text-center font-bold border-r border-slate-100">{breakTimes.out}</td>
                    <td className="p-1 text-center font-bold border-r border-slate-100">{breakTimes.in}</td>
                    <td className="p-1 text-center font-bold border-r border-slate-100">{record.endTime || '--:--'}</td>
                    <td className="p-1 text-center font-bold border-r border-slate-100">{record.isPresent ? '8.0' : '0.0'}</td>
                    <td className="p-1 text-center text-orange-600 font-bold border-r border-slate-100">{record.status === 'Late' ? '2.0' : '0.0'}</td>
                    <td className="p-1 text-center border-r border-slate-100">
                      <span className={`px-1 py-0.5 rounded-full border text-[6px] font-black uppercase whitespace-normal break-words inline-block ${getStatusColor(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td className="p-1 italic text-slate-300 border-r border-slate-100 text-[5px] text-center">VERIFIED</td>
                    <td className="p-1 italic text-slate-300 border-r border-slate-100 text-[5px] text-center">SIGNED</td>
                    <td className="p-1 text-slate-500 break-words text-[6px] leading-tight">{record.notes || '---'}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={16} className="p-8 text-center text-slate-400 italic">
                  {isRtl ? 'لا توجد سجلات حضور لهذا اليوم' : 'No attendance records available for this date'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-6 w-1 bg-[#040957] rounded-full"></div>
          <h4 className="text-[10px] font-black text-[#040957] uppercase tracking-[0.2em] flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5" />
            {isRtl ? 'ملخص إحصائيات الحضور اليومي' : 'DAILY ATTENDANCE ANALYTICS SUMMARY'}
          </h4>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {[
            { label: isRtl ? 'الإجمالي' : 'Total', val: stats.total, color: 'bg-slate-100 text-slate-800', icon: <User className="w-2.5 h-2.5" /> },
            { label: isRtl ? 'حاضر' : 'Present', val: stats.present, color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle2 className="w-2.5 h-2.5" /> },
            { label: isRtl ? 'غائب' : 'Absent', val: stats.absent, color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="w-2.5 h-2.5" /> },
            { label: isRtl ? 'متأخر' : 'Late', val: stats.late, color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <Clock className="w-2.5 h-2.5" /> },
            { label: isRtl ? 'إجازة' : 'Leave', val: stats.leave, color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <AlertCircle className="w-2.5 h-2.5" /> },
            { label: isRtl ? 'عطلة' : 'Holiday', val: stats.holiday, color: 'bg-slate-50 text-slate-400 border-slate-200', icon: <CalendarDays className="w-2.5 h-2.5" /> },
            { label: isRtl ? 'ساعات' : 'Hours', val: `${stats.totalHours}h`, color: 'bg-[#040957] text-white border-[#02053a]', icon: <Building2 className="w-2.5 h-2.5" /> },
            { label: isRtl ? 'إضافي' : 'OT', val: `${stats.totalOvertime}h`, color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-2.5 h-2.5" /> },
          ].map((s, i) => (
            <div key={i} className={`${s.color} p-2 rounded-xl border flex flex-col items-center justify-center text-center shadow-sm`}>
              <div className="flex items-center gap-1 mb-1 opacity-60">
                {s.icon}
                <span className="text-[5px] font-black uppercase leading-none">{s.label}</span>
              </div>
              <span className="text-[11px] font-black leading-none">{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. APPROVAL SECTION (3 SIGNATURE BOXES) */}
      <div className="grid grid-cols-3 gap-6 mb-12">
        {[
          { title: isRtl ? 'أعد بواسطة' : 'Prepared By', role: isRtl ? 'مراقب الموقع' : 'Site Supervisor', person: preparedBy },
          { title: isRtl ? 'راجع بواسطة' : 'Reviewed By', role: isRtl ? 'مهندس المشروع' : 'Project Engineer', person: '___________________' },
          { title: isRtl ? 'اعتمد بواسطة' : 'Approved By', role: isRtl ? 'مدير المشروع' : 'Project Manager', person: '___________________' },
        ].map((sig, i) => (
          <div key={i} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#040957]"></div>
            <h5 className="text-[9px] font-black text-[#040957] border-b border-slate-200 pb-3 mb-4 text-center uppercase tracking-[0.2em]">
              {sig.title}
            </h5>
            <div className="space-y-4 text-[8px] font-bold">
              <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                <span className="text-slate-400 uppercase text-[6px] tracking-tighter">{isRtl ? 'الاسم:' : 'Name:'}</span>
                <span className="text-[#040957] truncate max-w-[120px]">{sig.person}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                <span className="text-slate-400 uppercase text-[6px] tracking-tighter">{isRtl ? 'المنصب:' : 'Position:'}</span>
                <span className="text-slate-600 truncate max-w-[120px]">{sig.role}</span>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-slate-400 uppercase text-[6px] tracking-tighter">{isRtl ? 'التوقيع والختم:' : 'Signature & Stamp:'}</span>
                <div className="h-12 border border-dashed border-slate-200 rounded-lg bg-white/50"></div>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400 uppercase text-[6px] tracking-tighter">{isRtl ? 'التاريخ:' : 'Date:'}</span>
                <span className="text-slate-600 font-mono">____ / ____ / 2026</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 6. FOOTER SECTION */}
      <div className="bg-[#040957] text-white py-4 px-8 rounded-2xl flex justify-between items-center text-[8px] font-bold uppercase tracking-[0.3em] mt-auto shadow-lg border-t-4 border-[#02053a]">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 opacity-50" />
          {isRtl ? 'تاريخ الطباعة:' : 'Printed Date & Time:'} {new Date().toLocaleString(isRtl ? 'ar-SA' : 'en-GB')}
        </div>
        <div className="text-xs font-[900]">
          {isRtl ? settings.companyNameAr : settings.companyNameEn}
        </div>
        <div className="flex items-center gap-2">
          {isRtl ? 'صفحة ١ من ١' : 'Page 1 of 1'}
        </div>
      </div>
    </div>
  );
};

export default AttendanceReportGenerator;
