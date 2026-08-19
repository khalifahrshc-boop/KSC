/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WorkPermit, SystemSettings } from '../../types';
import { generatePTWQRCode } from '../../utils/ptwCalculations';
import { 
  Flame, 
  Building, 
  Box, 
  Shovel, 
  Anchor, 
  Zap, 
  Moon, 
  Car, 
  FileText,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  QrCode
} from 'lucide-react';

interface PermitPrintableDocProps {
  permit: WorkPermit;
  settings: SystemSettings;
  lang: 'ar' | 'en';
  qrCodeUrl?: string;
}

export const PermitPrintableDoc: React.FC<PermitPrintableDocProps> = ({
  permit,
  settings,
  lang,
  qrCodeUrl: externalQrCodeUrl
}) => {
  const isRtl = lang === 'ar';
  const companyName = isRtl ? (settings.companyNameAr || 'شركة المقاولات الوطنية') : (settings.companyNameEn || 'National Contracting Company');
  const companyLogo = settings.companyLogo;

  const [internalQrCodeUrl, setInternalQrCodeUrl] = useState<string>(externalQrCodeUrl || '');

  useEffect(() => {
    if (externalQrCodeUrl) {
      setInternalQrCodeUrl(externalQrCodeUrl);
    } else {
      let isMounted = true;
      generatePTWQRCode(permit, isRtl ? settings.companyNameAr : settings.companyNameEn).then(url => {
        if (isMounted && url) {
          setInternalQrCodeUrl(url);
        }
      });
      return () => { isMounted = false; };
    }
  }, [externalQrCodeUrl, permit, settings, isRtl]);

  const activeQrCode = externalQrCodeUrl || internalQrCodeUrl;

  const getPermitTypeIcon = (code: string) => {
    switch (code) {
      case 'HWP': return <Flame className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'WAH': return <Building className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'CSE': return <Box className="w-4 h-4 text-purple-600 shrink-0" />;
      case 'EXC': return <Shovel className="w-4 h-4 text-amber-700 shrink-0" />;
      case 'LIFT': return <Anchor className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'ELEC': return <Zap className="w-4 h-4 text-yellow-600 shrink-0" />;
      case 'NIGHT': return <Moon className="w-4 h-4 text-indigo-600 shrink-0" />;
      case 'TRAF': return <Car className="w-4 h-4 text-teal-600 shrink-0" />;
      default: return <FileText className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  const getRiskColorClass = (risk: string) => {
    switch (risk) {
      case 'Critical': return 'bg-rose-700 text-white';
      case 'High': return 'bg-rose-100 text-rose-800 border border-rose-300';
      case 'Medium': return 'bg-amber-100 text-amber-800 border border-amber-300';
      default: return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    }
  };

  return (
    <div 
      id={`permit-print-${permit.id}`}
      className="bg-white text-slate-900 p-6 sm:p-7 w-full max-w-[210mm] mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-2 text-xs"
      style={{ 
        fontFamily: "'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        lineHeight: 1.5,
        boxSizing: 'border-box'
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="pdf-avoid-break border-b-2 border-slate-900 pb-3 mb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" className="h-11 w-auto max-w-[120px] object-contain" crossOrigin="anonymous" />
            ) : (
              <div className="w-10 h-10 rounded bg-[#040957] text-white flex items-center justify-center font-bold text-base shrink-0">
                {companyName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-sm font-black text-[#040957] uppercase tracking-wide leading-tight break-words">
                {companyName}
              </h1>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {isRtl ? 'الإدارة العامة للسلامة والصحة المهنية والبيئة (HSE)' : 'HSE Department - Permit to Work Directorate'}
              </p>
            </div>
          </div>

          <div className="text-center px-3 py-1.5 bg-rose-50 border-2 border-rose-600 rounded shrink-0">
            <h2 className="text-xs font-black text-rose-900 tracking-wider uppercase flex items-center justify-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>{isRtl ? 'تصريح عمل رسمي معتمد (PTW)' : 'OFFICIAL PERMIT TO WORK (PTW)'}</span>
            </h2>
            <p className="text-[9px] font-bold text-rose-800 mt-0.5">
              {isRtl ? 'تصريح ساري المفعول - يمنع بدء العمل دونه' : 'ACTIVE SITE AUTHORIZATION - NO PERMIT = NO WORK'}
            </p>
          </div>

          {activeQrCode ? (
            <div className="flex flex-col items-center shrink-0">
              <img 
                src={activeQrCode} 
                alt="PTW Live QR Verification Token" 
                className="w-16 h-16 object-contain border border-slate-300 p-0.5 rounded bg-white shadow-xs" 
                crossOrigin="anonymous"
                width={64}
                height={64}
              />
              <span className="text-[7.5px] font-mono font-bold text-slate-600 mt-0.5 tracking-tight">VERIFIED QR</span>
            </div>
          ) : (
            <div className="w-16 h-16 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-[8px] text-slate-400 text-center shrink-0 bg-slate-50">
              <QrCode className="w-4 h-4 mb-0.5 text-slate-400" />
              <span>QR AUTH</span>
            </div>
          )}
        </div>

        {/* PTW Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 print:grid-cols-4 gap-2 mt-2.5 pt-2.5 border-t border-slate-200 text-[10.5px]">
          <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
            <span className="text-slate-500 block text-[8.5px] font-bold">{isRtl ? 'رقم التصريح المرجعي:' : 'PTW Permit Number:'}</span>
            <span className="font-mono font-black text-rose-900 text-[11.5px] break-all">{permit.permitNumber}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
            <span className="text-slate-500 block text-[8.5px] font-bold">{isRtl ? 'نوع التصريح:' : 'Permit Type:'}</span>
            <span className="font-bold flex items-center gap-1 text-slate-800 break-words">
              {getPermitTypeIcon(permit.permitTypeId)}
              <span className="leading-tight">{isRtl ? permit.permitTypeNameAr : permit.permitTypeNameEn}</span>
            </span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
            <span className="text-slate-500 block text-[8.5px] font-bold">{isRtl ? 'مستوى الخطورة:' : 'Risk Level:'}</span>
            <span className={`px-2 py-0.5 rounded font-black text-[9.5px] inline-block ${getRiskColorClass(permit.riskLevel)}`}>
              {permit.riskLevel.toUpperCase()}
            </span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
            <span className="text-slate-500 block text-[8.5px] font-bold">{isRtl ? 'حالة التصريح:' : 'Permit Status:'}</span>
            <span className={`font-black text-[10.5px] ${
              permit.status === 'Active' || permit.status === 'Approved' ? 'text-emerald-700' :
              permit.status === 'Suspended' ? 'text-rose-700' :
              permit.status === 'Submitted' ? 'text-amber-700' : 'text-slate-700'
            }`}>
              {permit.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Validity Window Banner */}
      <div className="pdf-avoid-break mb-3 bg-amber-50/90 border border-amber-400 p-2 rounded text-[10.5px] grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-2 items-center">
        <div>
          <span className="text-amber-800 block text-[8.5px] font-bold uppercase">{isRtl ? 'ساري المفعول من:' : 'VALID FROM:'}</span>
          <span className="font-mono font-black text-slate-900 text-xs">
            {permit.validFromDate} @ {permit.validFromTime}
          </span>
        </div>
        <div>
          <span className="text-amber-800 block text-[8.5px] font-bold uppercase">{isRtl ? 'ينتهي المفعول في:' : 'VALID UNTIL:'}</span>
          <span className="font-mono font-black text-rose-700 text-xs">
            {permit.validUntilDate} @ {permit.validUntilTime}
          </span>
        </div>
        <div className="text-start sm:text-end print:text-end">
          <span className="text-amber-800 block text-[8.5px] font-bold uppercase">{isRtl ? 'الوردية والقوى العاملة:' : 'SHIFT & WORKERS:'}</span>
          <span className="font-bold text-slate-900">
            {permit.shift} ({permit.numberOfWorkers} {isRtl ? 'عمال' : 'Workers'})
          </span>
        </div>
      </div>

      {/* Scope & Location Details */}
      <div className="pdf-avoid-break mb-3">
        <h3 className="bg-[#040957] text-white px-2.5 py-1 text-[10.5px] font-bold rounded-t flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 shrink-0" />
            <span>{isRtl ? '1. تفاصيل النشاط الميداني والموقع والموارد المخصصة' : '1. LINKED ACTIVITY, LOCATION & ALLOCATED RESOURCES'}</span>
          </div>
          {(permit.activityNameAr || permit.activityNameEn) && (
            <span className="text-[8.5px] bg-blue-900/80 text-blue-100 px-2 py-0.5 rounded font-mono break-words max-w-[280px]">
              {isRtl ? (permit.activityNameAr || permit.activityNameEn) : (permit.activityNameEn || permit.activityNameAr)}
            </span>
          )}
        </h3>
        <div className="border border-slate-300 border-t-0 p-2.5 rounded-b space-y-2 text-[10px]">
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-2">
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'المشروع العام:' : 'Project Location:'}</span>
              <span className="font-bold text-slate-800 break-words">{permit.workLocation}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'المنطقة المحددة بدقة:' : 'Designated Exact Area:'}</span>
              <span className="font-bold text-blue-900 break-words">{permit.exactWorkArea}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'المشرف المسؤول:' : 'Site Supervisor:'}</span>
              <span className="font-bold text-slate-900 break-words">{permit.supervisorName || 'Site Engineer'}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'توصيف الأعمال المصرح بها:' : 'Authorized Scope of Work:'}</span>
            <p className="text-slate-800 leading-relaxed font-medium bg-slate-50 p-2 rounded border border-slate-200 mt-0.5 whitespace-normal break-words">
              {isRtl ? permit.descriptionOfWorkAr : permit.descriptionOfWorkEn}
            </p>
          </div>

          {/* Allocated Labor & Equipment Badges */}
          {((permit.assignedWorkerNames && permit.assignedWorkerNames.length > 0) || (permit.assignedEquipmentNames && permit.assignedEquipmentNames.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[9.5px]">
              <div className="bg-blue-50/60 p-1.5 rounded border border-blue-100">
                <span className="text-blue-900 font-bold block mb-0.5 text-[8.5px]">
                  {isRtl ? `فريق العمالة المصرح لهم (${permit.assignedWorkerNames?.length || permit.numberOfWorkers}):` : `Assigned Labor Crew (${permit.assignedWorkerNames?.length || permit.numberOfWorkers}):`}
                </span>
                <span className="text-slate-700 font-medium whitespace-normal break-words leading-relaxed">
                  {permit.assignedWorkerNames && permit.assignedWorkerNames.length > 0 
                    ? permit.assignedWorkerNames.join(' • ') 
                    : `${permit.numberOfWorkers} workers authorized`}
                </span>
              </div>
              <div className="bg-amber-50/60 p-1.5 rounded border border-amber-100">
                <span className="text-amber-900 font-bold block mb-0.5 text-[8.5px]">
                  {isRtl ? `المعدات والآليات المصرح بها (${permit.assignedEquipmentNames?.length || 0}):` : `Authorized Machinery & Equipment (${permit.assignedEquipmentNames?.length || 0}):`}
                </span>
                <span className="text-slate-700 font-medium whitespace-normal break-words leading-relaxed">
                  {permit.assignedEquipmentNames && permit.assignedEquipmentNames.length > 0 
                    ? permit.assignedEquipmentNames.join(' • ') 
                    : (isRtl ? 'لا توجد معدات ثقيلة محددة' : 'No heavy machinery allocated')}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-[9.5px]">
            <div className="flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <div className="break-words">
                <span className="text-slate-500 font-semibold">{isRtl ? 'طوارئ الموقع:' : 'Emergency Contact:'} </span>
                <span className="font-bold text-rose-800">{permit.emergencyContactName || 'Site HSE Command'} ({permit.emergencyContactPhone || '+966-555-911-000'})</span>
              </div>
            </div>
            <div>
              <span className="text-slate-500 font-semibold">{isRtl ? 'نقطة التجمع في الطوارئ:' : 'Emergency Assembly Point:'} </span>
              <span className="font-bold text-slate-800 break-words">{permit.assemblyPoint || 'Assembly Point Zone A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hazard Identification & Risk Assessment Matrix */}
      <div className="pdf-avoid-break mb-3">
        <h3 className="bg-slate-800 text-white px-2.5 py-1 text-[10.5px] font-bold rounded-t flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{isRtl ? '2. مصفوفة المخاطر وضوابط التحكم الإلزامية (Hazard Matrix)' : '2. HAZARD IDENTIFICATION & MANDATORY CONTROL MEASURES'}</span>
          </div>
          <span className="text-[8.5px] font-normal opacity-80">{isRtl ? 'تقييم المخاطر الميداني' : 'JSA / Risk Assessment'}</span>
        </h3>
        <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <th className="p-1.5 border-r border-slate-300 text-center w-6">#</th>
              <th className="p-1.5 border-r border-slate-300 text-start w-[28%]">{isRtl ? 'الخطر المحتمل' : 'Identified Hazard'}</th>
              <th className="p-1.5 border-r border-slate-300 text-center w-16">{isRtl ? 'المستوى' : 'Risk'}</th>
              <th className="p-1.5 border-r border-slate-300 text-start">{isRtl ? 'إجراء التحكم والوقاية الإلزامي' : 'Mandatory Control Measure'}</th>
              <th className="p-1.5 text-start w-24">{isRtl ? 'المسؤول' : 'Responsible'}</th>
            </tr>
          </thead>
          <tbody>
            {permit.hazards.map((hz, idx) => (
              <tr key={hz.id} className={`pdf-avoid-break ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="p-1.5 border border-slate-200 text-center font-mono align-top">{idx + 1}</td>
                <td className="p-1.5 border border-slate-200 font-bold text-slate-800 align-top whitespace-normal break-words">
                  {isRtl ? hz.hazardAr : hz.hazardEn}
                </td>
                <td className="p-1.5 border border-slate-200 text-center align-top">
                  <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold inline-block ${getRiskColorClass(hz.riskLevel)}`}>
                    {hz.riskLevel}
                  </span>
                </td>
                <td className="p-1.5 border border-slate-200 font-medium text-slate-700 align-top whitespace-normal break-words leading-relaxed">
                  {isRtl ? hz.controlMeasureAr : hz.controlMeasureEn}
                </td>
                <td className="p-1.5 border border-slate-200 text-slate-600 font-semibold text-[9px] align-top whitespace-normal break-words">
                  {hz.responsiblePerson}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Safety Controls Checklist & PPE Verification */}
      <div className="pdf-avoid-break grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2.5 mb-3">
        {/* Safety Controls */}
        <div>
          <h3 className="bg-slate-800 text-white px-2 py-1 text-[10px] font-bold rounded-t flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{isRtl ? '3. التحقق من اشتراطات السلامة' : '3. HSE SAFETY CONTROLS'}</span>
          </h3>
          <div className="border border-slate-300 border-t-0 p-2 rounded-b space-y-1 text-[9px]">
            {permit.safetyControls.map(ctrl => (
              <div key={ctrl.id} className="pdf-avoid-break flex items-start gap-1.5 p-1 bg-slate-50 rounded border border-slate-200">
                <span className="mt-0.5">
                  {ctrl.isImplemented ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 border border-slate-400 rounded-sm shrink-0" />
                  )}
                </span>
                <div className="flex-1 whitespace-normal break-words">
                  <span className="font-medium text-slate-800 block leading-tight">
                    {isRtl ? ctrl.controlAr : ctrl.controlEn}
                  </span>
                  {ctrl.verifiedBy && (
                    <span className="text-[7.5px] text-slate-500 font-mono">Verified: {ctrl.verifiedBy}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PPE Checklist */}
        <div>
          <h3 className="bg-slate-800 text-white px-2 py-1 text-[10px] font-bold rounded-t flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{isRtl ? '4. مهمات الوقاية الشخصية (PPE)' : '4. MANDATORY PPE CHECKLIST'}</span>
          </h3>
          <div className="border border-slate-300 border-t-0 p-2 rounded-b space-y-1 text-[9px]">
            {permit.ppeChecklist.map(ppe => (
              <div key={ppe.id} className="pdf-avoid-break flex items-center justify-between p-1 bg-slate-50 rounded border border-slate-200 gap-1.5">
                <div className="flex items-center gap-1.5 flex-1 whitespace-normal break-words">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${ppe.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="font-medium text-slate-800 leading-tight">
                    {isRtl ? ppe.ppeAr : ppe.ppeEn}
                  </span>
                </div>
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                  ppe.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {ppe.isAvailable ? (isRtl ? 'متوفر' : 'Available') : (isRtl ? 'غير متوفر' : 'Missing')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Approvals & Digital Signatures */}
      <div className="pdf-avoid-break mb-2">
        <h3 className="bg-[#040957] text-white px-2.5 py-1 text-[10.5px] font-bold rounded-t flex items-center justify-between">
          <span>{isRtl ? '5. اعتمادات وتوقيعات إصدار التصريح الرسمية' : '5. FORMAL PTW ISSUANCE & APPROVAL SIGNATURES'}</span>
          <span className="text-[8.5px] opacity-80">{isRtl ? 'ساري المفعول للفترة المحددة أعلاه فقط' : 'VALID ONLY FOR STATED PERIOD'}</span>
        </h3>
        <div className="border border-slate-300 border-t-0 p-2 rounded-b">
          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-2 text-[9.5px]">
            {permit.approvals.map((app) => (
              <div key={app.id} className="pdf-avoid-break p-2 bg-slate-50 border border-slate-200 rounded flex flex-col justify-between min-h-[90px]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-mono text-slate-400">ROLE #{app.order}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                      app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                      app.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 block leading-tight text-[10px] whitespace-normal break-words">
                    {isRtl ? app.roleNameAr : app.roleNameEn}
                  </span>
                  <span className="text-[8.5px] text-slate-600 block mt-0.5 font-medium whitespace-normal break-words">
                    {app.assignedUserName || app.approverName || 'Designated Approver'}
                  </span>
                </div>

                <div className="mt-2 pt-1 border-t border-dashed border-slate-300">
                  {app.status === 'Approved' ? (
                    <div>
                      <div className="font-mono text-[9.5px] text-emerald-800 font-bold italic tracking-wide break-words">
                        ✍ {app.signatureData || app.approverName}
                      </div>
                      <span className="text-[7.5px] text-slate-400 block font-mono">
                        {app.decisionDate} {app.decisionTime}
                      </span>
                    </div>
                  ) : (
                    <div className="h-6 border border-dashed border-slate-300 rounded flex items-center justify-center text-[8px] text-slate-400">
                      {isRtl ? 'بانتظار الاعتماد الميداني' : 'Pending Authorization'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pdf-avoid-break pt-2 text-[8px] text-slate-500 flex items-center justify-between border-t border-slate-200">
        <div>
          <span>{isRtl ? 'يجب الاحتفاظ بنسخة ورقية من هذا التصريح بموقع العمل طوال فترة التنفيذ وتقديمها لمفتشي السلامة.' : 'A hardcopy of this permit must be displayed at work area during operation.'}</span>
        </div>
        <div className="font-mono text-slate-400">
          PTW REF: {permit.permitNumber} | RISK: {permit.riskLevel}
        </div>
      </div>
    </div>
  );
};
