/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StartCard, SystemSettings } from '../../types';
import { generateStartCardQRCode } from '../../utils/ptwCalculations';
import { ShieldCheck, CheckCircle2, XCircle, AlertCircle, FileCheck2, Building2, QrCode } from 'lucide-react';

interface StartCardPrintableDocProps {
  startCard: StartCard;
  settings: SystemSettings;
  lang: 'ar' | 'en';
  qrCodeUrl?: string;
}

export const StartCardPrintableDoc: React.FC<StartCardPrintableDocProps> = ({
  startCard,
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
      generateStartCardQRCode(startCard, isRtl ? startCard.projectNameAr : startCard.projectNameEn).then(url => {
        if (isMounted && url) {
          setInternalQrCodeUrl(url);
        }
      });
      return () => { isMounted = false; };
    }
  }, [externalQrCodeUrl, startCard, isRtl]);

  const activeQrCode = externalQrCodeUrl || internalQrCodeUrl;

  return (
    <div 
      id={`start-card-print-${startCard.id}`}
      className="bg-white text-slate-900 p-6 sm:p-7 w-full max-w-[210mm] mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-2 text-xs"
      style={{ 
        fontFamily: "'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        lineHeight: 1.5,
        boxSizing: 'border-box'
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Document Header with Logos & Reference Codes */}
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
                {isRtl ? 'نظام الحوكمة الميدانية وضبط جاهزية بدء الأعمال' : 'HSE & Site Execution Governance System'}
              </p>
            </div>
          </div>

          <div className="text-center px-3 py-1.5 bg-slate-100 border border-slate-300 rounded shrink-0">
            <h2 className="text-xs font-black text-slate-900 tracking-wider uppercase">
              {isRtl ? 'كارت بدء العمل المعتمد (START CARD)' : 'OFFICIAL START CARD (START WORK)'}
            </h2>
            <p className="text-[9px] font-bold text-emerald-700 mt-0.5">
              {isRtl ? 'نموذج الفحص والتحقق الإلزامي قبل التنفيذ' : 'MANDATORY PRE-EXECUTION READINESS CLEARANCE'}
            </p>
          </div>

          {activeQrCode ? (
            <div className="flex flex-col items-center shrink-0">
              <img 
                src={activeQrCode} 
                alt="Start Card Live QR Token" 
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

        {/* Metadata Strip */}
        <div className="grid grid-cols-4 gap-2 mt-2.5 pt-2.5 border-t border-slate-200 text-[10.5px]">
          <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
            <span className="text-slate-500 block text-[8.5px] font-bold">{isRtl ? 'رقم الكارت المرجعي:' : 'Card Reference No:'}</span>
            <span className="font-mono font-black text-blue-900 text-[11.5px] break-all">{startCard.cardNumber}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
            <span className="text-slate-500 block text-[8.5px] font-bold">{isRtl ? 'رقم الإصدار (Revision):' : 'Revision:'}</span>
            <span className="font-bold">REV-{startCard.revision}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
            <span className="text-slate-500 block text-[8.5px] font-bold">{isRtl ? 'حالة الاعتماد:' : 'Approval Status:'}</span>
            <span className={`font-black text-[10.5px] ${
              startCard.status === 'Approved' ? 'text-emerald-700' :
              startCard.status === 'Submitted' ? 'text-amber-700' : 'text-slate-700'
            }`}>
              {startCard.status.toUpperCase()}
            </span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
            <span className="text-slate-500 block text-[8.5px] font-bold">{isRtl ? 'تاريخ التحرير:' : 'Date Created:'}</span>
            <span className="font-mono">{startCard.createdAt.substring(0, 10)}</span>
          </div>
        </div>
      </div>

      {/* Project & Contractual Information */}
      <div className="pdf-avoid-break mb-3">
        <h3 className="bg-[#040957] text-white px-2.5 py-1 text-[10.5px] font-bold rounded-t flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span>{isRtl ? '1. بيانات المشروع والجهات المتعاقدة' : '1. PROJECT & CONTRACTUAL IDENTIFICATION'}</span>
        </h3>
        <div className="border border-slate-300 border-t-0 p-2.5 rounded-b grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'اسم المشروع:' : 'Project Name:'}</span>
            <span className="font-bold text-slate-800 break-words">{isRtl ? startCard.projectNameAr : startCard.projectNameEn}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'رقم المشروع:' : 'Project Number:'}</span>
            <span className="font-mono font-bold text-slate-800 break-words">{startCard.projectNumber || 'PRJ-2026-001'}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'المالك / العميل:' : 'Client:'}</span>
            <span className="font-bold text-slate-800 break-words">{isRtl ? startCard.clientAr : startCard.clientEn}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'المكتب الاستشاري:' : 'Consultant:'}</span>
            <span className="font-semibold text-slate-700 break-words">{isRtl ? (startCard.consultantAr || 'المكتب الاستشاري العام') : (startCard.consultantEn || 'Lead Engineering Consultant')}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'المقاول الرئيسي:' : 'Main Contractor:'}</span>
            <span className="font-semibold text-slate-700 break-words">{isRtl ? (startCard.mainContractorAr || companyName) : (startCard.mainContractorEn || companyName)}</span>
          </div>
          <div>
            <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'الموقع الجغرافي:' : 'Location:'}</span>
            <span className="font-semibold text-slate-700 break-words">{isRtl ? startCard.projectLocationAr : startCard.projectLocationEn}</span>
          </div>
        </div>
      </div>

      {/* Work Package & Activity Details */}
      <div className="pdf-avoid-break mb-3">
        <h3 className="bg-slate-800 text-white px-2.5 py-1 text-[10.5px] font-bold rounded-t flex items-center gap-1.5">
          <FileCheck2 className="w-3.5 h-3.5 shrink-0" />
          <span>{isRtl ? '2. توصيف نطاق العمل والموقع الدقيق' : '2. SCOPE OF WORK & DETAILED LOCATION'}</span>
        </h3>
        <div className="border border-slate-300 border-t-0 p-2.5 rounded-b space-y-2 text-[10px]">
          <div className="grid grid-cols-4 gap-2">
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'مستوى الكارت:' : 'Card Level:'}</span>
              <span className="font-bold text-blue-900 break-words">{startCard.level === 'Group' ? (isRtl ? 'حزمة عمل كاملة (Group)' : 'Work Package (Group)') : (isRtl ? 'نشاط محدد (Single Activity)' : 'Single Activity')}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'المنطقة / الزون:' : 'Zone / Area:'}</span>
              <span className="font-bold break-words">{startCard.workAreaZone || 'Main Site Sector'}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'المنشأ / المبنى:' : 'Structure / Floor:'}</span>
              <span className="font-bold break-words">{startCard.buildingStructure || 'Structure 1'} {startCard.floorLevel ? `(${startCard.floorLevel})` : ''}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'الوردية / الشفت:' : 'Work Shift:'}</span>
              <span className="font-bold text-amber-900 break-words">{startCard.workShift}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'تاريخ البدء المخطط:' : 'Planned Start:'}</span>
              <span className="font-mono font-bold">{startCard.plannedStartDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'تاريخ الانتهاء المخطط:' : 'Planned Finish:'}</span>
              <span className="font-mono font-bold">{startCard.plannedFinishDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'المدة التقديرية:' : 'Expected Duration:'}</span>
              <span className="font-bold">{startCard.expectedDurationDays} {isRtl ? 'أيام' : 'Days'}</span>
            </div>
          </div>

          <div className="pt-1 border-t border-slate-200">
            <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'التوصيف الفني ونطاق العمل المعتمد:' : 'Scope of Work & Technical Description:'}</span>
            <p className="text-slate-800 leading-relaxed font-medium bg-slate-50 p-2 rounded border border-slate-200 mt-0.5 whitespace-normal break-words">
              {isRtl ? (startCard.scopeOfWorkAr || startCard.workDescriptionAr) : (startCard.scopeOfWorkEn || startCard.workDescriptionEn)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'قائد الطاقم / المشرف:' : 'Crew Leader / Sup:'}</span>
              <span className="font-bold break-words">{startCard.workCrewLead || startCard.supervisorForeman || 'Site Supervisor'}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'عدد القوى العاملة:' : 'No. of Workers:'}</span>
              <span className="font-bold">{startCard.numberOfWorkers} {isRtl ? 'عمال وفنيين' : 'Personnel'}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-semibold text-[8.5px]">{isRtl ? 'المعدات والآليات الرئيسية:' : 'Key Equipment & Machinery:'}</span>
              <span className="font-medium text-slate-700 block whitespace-normal break-words leading-relaxed">
                {startCard.requiredEquipmentDetails || (isRtl ? 'معدات الحفر، شاحنات النقل، عدد يدوية' : 'Excavator, Heavy Trucks, Hand Tools')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Checklists Table */}
      <div className="pdf-avoid-break mb-3">
        <h3 className="bg-slate-800 text-white px-2.5 py-1 text-[10.5px] font-bold rounded-t flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{isRtl ? '3. قائمة التحقق والفحص الإلزامي قبل بدء العمل (Readiness Checklist)' : '3. MANDATORY PRE-START READINESS CHECKLIST GATES'}</span>
          </div>
          <span className="text-[8.5px] font-normal opacity-80">
            {isRtl ? 'جميع البنود الإلزامية يجب أن تجتاز الفحص بنجاح' : 'ALL MANDATORY GATES MUST PASS'}
          </span>
        </h3>
        <table className="w-full border-collapse border border-slate-300 text-[9.5px]">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
              <th className="p-1.5 border-r border-slate-300 text-center w-6">#</th>
              <th className="p-1.5 border-r border-slate-300 text-center w-20">{isRtl ? 'التصنيف' : 'Category'}</th>
              <th className="p-1.5 border-r border-slate-300 text-start">{isRtl ? 'بند الفحص والجاهزية' : 'Inspection Gate / Requirement'}</th>
              <th className="p-1.5 border-r border-slate-300 text-center w-16">{isRtl ? 'النتيجة' : 'Status'}</th>
              <th className="p-1.5 border-r border-slate-300 text-start w-28">{isRtl ? 'المفحوص بواسطة' : 'Verified By'}</th>
              <th className="p-1.5 text-center w-14">{isRtl ? 'إلزامي' : 'Mandatory'}</th>
            </tr>
          </thead>
          <tbody>
            {startCard.checklist.map((item, index) => (
              <tr key={item.id} className={`pdf-avoid-break ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <td className="p-1.5 border border-slate-200 text-center font-mono align-top">{index + 1}</td>
                <td className="p-1.5 border border-slate-200 text-center font-semibold text-slate-600 align-top whitespace-normal break-words">{item.category}</td>
                <td className="p-1.5 border border-slate-200 font-medium text-slate-800 align-top whitespace-normal break-words leading-relaxed">
                  {isRtl ? item.titleAr : item.titleEn}
                  {item.notes && <span className="text-[8.5px] text-slate-500 block italic mt-0.5 whitespace-normal break-words">Notes: {item.notes}</span>}
                </td>
                <td className="p-1.5 border border-slate-200 text-center align-top">
                  <span className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded text-[8.5px] ${
                    item.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' :
                    item.status === 'Fail' ? 'bg-rose-100 text-rose-800' :
                    item.status === 'NA' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {item.status === 'Pass' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                    {item.status === 'Fail' && <XCircle className="w-3 h-3 text-rose-600 shrink-0" />}
                    {item.status === 'Pending' && <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />}
                    <span>{item.status}</span>
                  </span>
                </td>
                <td className="p-1.5 border border-slate-200 text-slate-600 align-top whitespace-normal break-words">
                  {item.checkedBy ? (
                    <div>
                      <span className="font-semibold text-slate-800 block text-[9px] break-words">{item.checkedBy}</span>
                      <span className="text-[7.5px] font-mono text-slate-500">{item.checkedAt?.substring(0, 10)}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">--</span>
                  )}
                </td>
                <td className="p-1.5 border border-slate-200 text-center font-bold text-rose-700 align-top">
                  {item.isMandatory ? (isRtl ? 'نعم' : 'YES') : (isRtl ? 'اختياري' : 'OPT')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mandatory Attachments List */}
      <div className="pdf-avoid-break mb-3">
        <h3 className="bg-slate-800 text-white px-2.5 py-1 text-[10.5px] font-bold rounded-t">
          {isRtl ? '4. الوثائق والمخططات الفنية المرفقة' : '4. MANDATORY ATTACHMENTS & APPROVED DOCUMENTS'}
        </h3>
        <div className="border border-slate-300 border-t-0 p-2 rounded-b">
          {startCard.attachments && startCard.attachments.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 text-[9.5px]">
              {startCard.attachments.map(att => (
                <div key={att.id} className="pdf-avoid-break p-1.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between gap-2">
                  <div className="whitespace-normal break-words flex-1">
                    <span className="font-bold text-slate-800 block leading-tight">{att.title}</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 block">{att.documentType} • {att.fileName} ({att.fileSize || 'Attached'})</span>
                  </div>
                  <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                    {att.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-[9.5px] italic p-1">
              {isRtl ? 'تم التحقق من الوثائق الأصلية بمكتب الموقع وسجل الاعتمادات.' : 'Hardcopy approved shop drawings & method statements verified on site.'}
            </p>
          )}
        </div>
      </div>

      {/* Multi-Level Approval Signatures Chain */}
      <div className="pdf-avoid-break mb-2">
        <h3 className="bg-[#040957] text-white px-2.5 py-1 text-[10.5px] font-bold rounded-t flex items-center justify-between">
          <span>{isRtl ? '5. سلسلة الاعتمادات والتوقيعات الرقمية الرسمية' : '5. FORMAL APPROVAL CHAIN & DIGITAL SIGNATURES'}</span>
          <span className="text-[8.5px] opacity-80">{isRtl ? 'ملزم قانونياً ومطابق للمواصفات' : 'LEGALLY BINDING CLEARANCE'}</span>
        </h3>
        <div className="border border-slate-300 border-t-0 p-2 rounded-b">
          <div className="grid grid-cols-5 gap-1.5 text-[9px]">
            {startCard.approvals.map((app) => (
              <div key={app.id} className="pdf-avoid-break p-1.5 bg-slate-50 border border-slate-200 rounded flex flex-col justify-between min-h-[90px]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[7.5px] font-mono text-slate-400">STEP #{app.order}</span>
                    <span className={`text-[7.5px] font-bold px-1 py-0.2 rounded ${
                      app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                      app.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 block leading-tight text-[9px] whitespace-normal break-words">
                    {isRtl ? app.roleNameAr : app.roleNameEn}
                  </span>
                  <span className="text-[8px] text-slate-600 block mt-0.5 font-medium whitespace-normal break-words">
                    {app.assignedUserName || app.approverName || 'Designated Role'}
                  </span>
                </div>

                <div className="mt-2 pt-1 border-t border-dashed border-slate-300">
                  {app.status === 'Approved' ? (
                    <div>
                      <div className="font-mono text-[8.5px] text-emerald-800 font-bold italic tracking-wide break-words">
                        ✍ {app.signatureData || app.approverName}
                      </div>
                      <span className="text-[7px] text-slate-400 block font-mono">
                        {app.decisionDate} {app.decisionTime}
                      </span>
                    </div>
                  ) : (
                    <div className="h-6 border border-dashed border-slate-300 rounded flex items-center justify-center text-[7.5px] text-slate-400">
                      {isRtl ? 'بانتظار التوقيع' : 'Pending Sign'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Official Footnote & Legal Warranty */}
      <div className="pdf-avoid-break pt-2 text-[8px] text-slate-500 flex items-center justify-between border-t border-slate-200">
        <div>
          <span>{isRtl ? 'تم إصدار هذا الكارت إلكترونياً ويخضع للتحقق الميداني الفوري عبر رمز الاستجابة السريعة (QR Code).' : 'System-generated work authorization document. Field verification via live QR scanning.'}</span>
        </div>
        <div className="font-mono text-slate-400">
          DOC REF: {startCard.cardNumber} | REV-{startCard.revision}
        </div>
      </div>
    </div>
  );
};
