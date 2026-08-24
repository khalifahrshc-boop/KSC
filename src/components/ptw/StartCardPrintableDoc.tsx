/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StartCard, SystemSettings } from '../../types';
import { generateStartCardQRCode } from '../../utils/ptwCalculations';
import { QrCode } from 'lucide-react';

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
  const companyLogo = settings.companyLogoUrl;

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
      className="bg-white text-slate-900 w-full max-w-[210mm] mx-auto text-[10px] print:w-full"
      style={{ 
        fontFamily: "'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        lineHeight: 1.35,
        boxSizing: 'border-box'
      }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Outer Corporate Border */}
      <div className="border-[2px] border-slate-800 bg-white">
        
        {/* Document Header Table */}
        <table className="w-full border-collapse border-b-[2px] border-slate-800" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {/* Logo Section */}
              <td 
                className={`p-2 text-center align-middle border-slate-800 ${isRtl ? 'border-l-[2px]' : 'border-r-[2px]'}`}
                style={{ width: '25%', height: '76px' }}
              >
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" className="max-h-14 max-w-full object-contain mx-auto" crossOrigin="anonymous" />
                ) : (
                  <div className="text-center font-black text-sm text-slate-800">{companyName.substring(0, 2).toUpperCase()}</div>
                )}
              </td>
              
              {/* Title Section */}
              <td 
                className="p-2 text-center align-middle"
                style={{ width: '50%' }}
              >
                <div className="text-xs font-black uppercase tracking-wider mb-0.5 text-slate-800">
                  {companyName}
                </div>
                <div className="text-sm font-black underline underline-offset-2 decoration-2 text-slate-900">
                  {isRtl ? 'كارت بدء العمل والتشغيل (Start Card)' : 'OFFICIAL START CARD'}
                </div>
                <div className="inline-block text-[9px] font-bold mt-1 bg-slate-800 text-white px-2.5 py-0.5 uppercase tracking-widest rounded-sm">
                  {isRtl ? 'نموذج الفحص والتحقق الإلزامي قبل التنفيذ' : 'MANDATORY PRE-EXECUTION CLEARANCE'}
                </div>
              </td>
              
              {/* Doc Control Section */}
              <td 
                className={`p-0 align-top border-slate-800 ${isRtl ? 'border-r-[2px]' : 'border-l-[2px]'}`}
                style={{ width: '25%' }}
              >
                <table className="w-full border-collapse h-full" style={{ tableLayout: 'fixed' }}>
                  <tbody>
                    <tr className="border-b border-slate-800">
                      <td className={`bg-slate-100 font-bold p-1 text-center text-[8px] border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '35%' }}>Form ID</td>
                      <td className="p-1 text-center font-mono font-bold text-[8.5px]" style={{ width: '65%' }}>HSE-SC-05</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className={`bg-slate-100 font-bold p-1 text-center text-[8px] border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '35%' }}>Rev. No</td>
                      <td className="p-1 text-center font-mono font-bold text-[8.5px]" style={{ width: '65%' }}>0{startCard.revision || 1}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="p-1 text-center align-middle bg-slate-50">
                        {activeQrCode ? (
                          <img src={activeQrCode} alt="QR" className="w-10 h-10 object-contain mx-auto" crossOrigin="anonymous" />
                        ) : (
                          <QrCode className="w-8 h-8 text-gray-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Start Card Meta Details Table */}
        <table className="w-full border-collapse border-b-[2px] border-slate-800 text-[9.5px]" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '10%' }}>
                {isRtl ? 'رقم الكارت' : 'Card No'}
              </td>
              <td className={`p-1.5 font-mono font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {startCard.cardNumber}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '10%' }}>
                {isRtl ? 'مستوى الكارت' : 'Card Level'}
              </td>
              <td className={`p-1.5 font-bold uppercase border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {startCard.level}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '10%' }}>
                {isRtl ? 'حالة الاعتماد' : 'Status'}
              </td>
              <td className={`p-1.5 font-bold uppercase border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                <span className={startCard.status === 'Approved' ? 'text-emerald-700 font-black' : ''}>
                  {startCard.status}
                </span>
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '10%' }}>
                {isRtl ? 'تاريخ التحرير' : 'Date Created'}
              </td>
              <td className="p-1.5 font-mono font-bold" style={{ width: '15%' }}>
                {startCard.createdAt.substring(0, 10)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 1: Project Identification */}
        <div className="bg-slate-800 text-white font-bold px-2 py-1 text-[10.5px] uppercase border-b border-slate-800">
          1. {isRtl ? 'بيانات المشروع والجهات المتعاقدة' : 'PROJECT & CONTRACTUAL IDENTIFICATION'}
        </div>
        <table className="w-full border-collapse border-b-[2px] border-slate-800 text-[9.5px]" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'اسم المشروع' : 'Project Name'}
              </td>
              <td className={`p-1.5 font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '35%' }}>
                {isRtl ? startCard.projectNameAr : startCard.projectNameEn}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'رقم المشروع' : 'Project Number'}
              </td>
              <td className="p-1.5 font-mono font-bold" style={{ width: '35%' }}>
                {startCard.projectNumber || 'PRJ-2026-001'}
              </td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'المالك / العميل' : 'Client'}
              </td>
              <td className={`p-1.5 font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '35%' }}>
                {isRtl ? startCard.clientAr : startCard.clientEn}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'المقاول الرئيسي' : 'Main Contractor'}
              </td>
              <td className="p-1.5 font-bold" style={{ width: '35%' }}>
                {isRtl ? (startCard.mainContractorAr || companyName) : (startCard.mainContractorEn || companyName)}
              </td>
            </tr>
            <tr>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'الموقع الجغرافي' : 'Location'}
              </td>
              <td colSpan={3} className="p-1.5 font-medium">
                {isRtl ? startCard.projectLocationAr : startCard.projectLocationEn}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 2: Scope of Work & Details */}
        <div className="bg-slate-800 text-white font-bold px-2 py-1 text-[10.5px] uppercase border-b border-slate-800">
          2. {isRtl ? 'توصيف نطاق العمل والموقع الدقيق والجدول الزمني' : 'SCOPE OF WORK & DETAILED LOCATION'}
        </div>
        <table className="w-full border-collapse border-b-[2px] border-slate-800 text-[9.5px]" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '13%' }}>
                {isRtl ? 'المنطقة' : 'Zone / Area'}
              </td>
              <td className={`p-1.5 font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '20%' }}>
                {startCard.workAreaZone || 'Main Site Sector'}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '13%' }}>
                {isRtl ? 'المبنى / المنشأ' : 'Structure'}
              </td>
              <td className={`p-1.5 font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '20%' }}>
                {startCard.buildingStructure || 'Structure 1'} {startCard.floorLevel ? `(${startCard.floorLevel})` : ''}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '13%' }}>
                {isRtl ? 'الوردية' : 'Work Shift'}
              </td>
              <td className="p-1.5 font-bold" style={{ width: '21%' }}>
                {startCard.workShift}
              </td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '13%' }}>
                {isRtl ? 'تاريخ البدء المخطط' : 'Planned Start'}
              </td>
              <td className={`p-1.5 font-mono font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '20%' }}>
                {startCard.plannedStartDate}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '13%' }}>
                {isRtl ? 'تاريخ الانتهاء' : 'Planned Finish'}
              </td>
              <td className={`p-1.5 font-mono font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '20%' }}>
                {startCard.plannedFinishDate}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '13%' }}>
                {isRtl ? 'المدة التقديرية' : 'Expected Duration'}
              </td>
              <td className="p-1.5 font-bold" style={{ width: '21%' }}>
                {startCard.expectedDurationDays} {isRtl ? 'أيام' : 'Days'}
              </td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '13%' }}>
                {isRtl ? 'نطاق العمل المعتمد' : 'Scope of Work'}
              </td>
              <td colSpan={5} className="p-1.5 font-medium leading-relaxed">
                {isRtl ? (startCard.scopeOfWorkAr || startCard.workDescriptionAr) : (startCard.scopeOfWorkEn || startCard.workDescriptionEn)}
              </td>
            </tr>
            <tr>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '13%' }}>
                {isRtl ? 'المشرف المسؤول' : 'Supervisor'}
              </td>
              <td className={`p-1.5 font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '20%' }}>
                {startCard.workCrewLead || startCard.supervisorForeman || 'Site Supervisor'}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '13%' }}>
                {isRtl ? 'عدد القوى العاملة' : 'No. of Workers'}
              </td>
              <td className={`p-1.5 font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '20%' }}>
                {startCard.numberOfWorkers} {isRtl ? 'عمال' : 'Workers'}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '13%' }}>
                {isRtl ? 'المعدات الرئيسية' : 'Key Equipment'}
              </td>
              <td className="p-1.5 font-bold" style={{ width: '21%' }}>
                {startCard.requiredEquipmentDetails || 'N/A'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 3: Readiness Checklist */}
        <div className="bg-slate-800 text-white font-bold px-2 py-1 text-[10.5px] uppercase border-b border-slate-800">
          3. {isRtl ? 'قائمة التحقق والفحص الإلزامي قبل بدء العمل (Readiness Checklist)' : 'MANDATORY PRE-START READINESS CHECKLIST GATES'}
        </div>
        <table className="w-full border-collapse border-b-[2px] border-slate-800 text-[9px]" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-slate-100 text-[8.5px] uppercase border-b border-slate-800">
            <tr>
              <th className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '4%' }}>#</th>
              <th className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '14%' }}>{isRtl ? 'التصنيف' : 'Category'}</th>
              <th className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '46%' }}>{isRtl ? 'بند الفحص والتحقق' : 'Inspection Requirement'}</th>
              <th className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '10%' }}>{isRtl ? 'النتيجة' : 'Status'}</th>
              <th className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '16%' }}>{isRtl ? 'المفحوص بواسطة' : 'Verified By'}</th>
              <th className="p-1 text-center font-bold" style={{ width: '10%' }}>{isRtl ? 'إلزامي' : 'Mandatory'}</th>
            </tr>
          </thead>
          <tbody>
            {startCard.checklist.map((item, index) => (
              <tr key={item.id} className="border-b border-slate-800 last:border-b-0 pdf-avoid-break">
                <td className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`}>{index + 1}</td>
                <td className={`p-1 font-bold border-slate-800 text-center ${isRtl ? 'border-l' : 'border-r'}`}>{item.category}</td>
                <td className={`p-1 font-medium border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`}>
                  <span className="font-bold">{isRtl ? item.titleAr : item.titleEn}</span>
                  {item.notes && <span className="text-[8px] text-gray-600 block italic mt-0.5">💬 {item.notes}</span>}
                </td>
                <td className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`}>
                  <span className={`px-1.5 py-0.5 rounded font-black ${
                    item.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' :
                    item.status === 'Fail' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className={`p-1 text-center font-bold text-[8.5px] border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`}>
                   {item.checkedBy ? (
                     <>
                       <div>{item.checkedBy}</div>
                       <div className="font-mono font-normal text-[7.5px] text-gray-500">{item.checkedAt?.substring(0, 10)}</div>
                     </>
                   ) : '--'}
                </td>
                <td className="p-1 text-center font-bold">
                  {item.isMandatory ? (
                    <span className="text-rose-700 font-black">{isRtl ? 'نعم' : 'YES'}</span>
                  ) : (
                    <span className="text-gray-500">{isRtl ? 'لا' : 'NO'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Section 4: Attachments */}
        <div className="bg-slate-800 text-white font-bold px-2 py-1 text-[10.5px] uppercase border-b border-slate-800">
          4. {isRtl ? 'الوثائق والمخططات الفنية المرفقة' : 'MANDATORY ATTACHMENTS'}
        </div>
        <div className="border-b-[2px] border-slate-800 p-1.5 bg-slate-50/50">
          {startCard.attachments && startCard.attachments.length > 0 ? (
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  {startCard.attachments.slice(0, 4).map((att) => (
                    <td key={att.id} className="p-1 border border-slate-800 bg-white text-[8.5px]">
                      <span className="font-bold underline">{att.title}</span> 
                      <span className="block text-gray-500">({att.documentType}) - <strong className="font-mono text-slate-800">{att.status}</strong></span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="p-1 text-center font-bold text-gray-500 uppercase text-[9px]">
              {isRtl ? 'تم التحقق من كافة الوثائق الهندسية والمخططات المعتمدة بمكتب إدارة المشروع' : 'All hardcopy approved drawings and documents verified on site office'}
            </div>
          )}
        </div>

        {/* Section 5: Formal Approvals & Digital Signatures */}
        <div className="bg-slate-800 text-white font-bold px-2 py-1 text-[10.5px] uppercase border-b border-slate-800">
          5. {isRtl ? 'سلسلة الاعتمادات والتوقيعات الرقمية الرسمية' : 'FORMAL APPROVAL CHAIN & DIGITAL SIGNATURES'}
        </div>
        <table className="w-full border-collapse bg-slate-50/60" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {startCard.approvals.map((app, index) => {
                const cellWidth = `${100 / Math.max(1, startCard.approvals.length)}%`;
                const isLast = index === startCard.approvals.length - 1;

                return (
                  <td 
                    key={app.id} 
                    className={`p-2 align-top ${!isLast ? (isRtl ? 'border-l border-slate-800' : 'border-r border-slate-800') : ''}`}
                    style={{ width: cellWidth }}
                  >
                    <div className="text-center mb-2">
                      <span className="block font-black text-[9.5px] uppercase underline text-slate-900">{isRtl ? app.roleNameAr : app.roleNameEn}</span>
                      <span className="block font-semibold text-[8.5px] text-slate-600 mt-0.5">{app.assignedUserName || app.approverName || (isRtl ? 'المعتمد الرسمي' : 'Authorized Signatory')}</span>
                    </div>
                    <div className="border border-dashed border-slate-400 bg-white rounded p-1.5 text-center min-h-[46px] flex flex-col items-center justify-center">
                      {app.status === 'Approved' ? (
                        <>
                          <span className="font-mono text-emerald-700 font-black italic text-[10.5px] tracking-widest">{app.signatureData || 'DIGITALLY_SIGNED'}</span>
                          <span className="text-[7.5px] text-slate-500 font-mono mt-0.5">{app.decisionDate} {app.decisionTime}</span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-bold text-[8px] uppercase">{isRtl ? 'بانتظار الاعتماد' : 'PENDING APPROVAL'}</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Footer Text */}
      <table className="w-full mt-1 text-[8px] font-bold text-gray-600 uppercase" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td className="text-left rtl:text-right" style={{ width: '70%' }}>
              🔒 {isRtl ? 'هذا النموذج وثيقة تشغيلية رسمية ملزمة بموقع العمل ومسجلة بالنظام الإلكتروني' : 'This form is a legally binding site execution document logged in the official system'}
            </td>
            <td className="text-right rtl:text-left font-mono" style={{ width: '30%' }}>
              {isRtl ? 'النسخة المعتمدة الأصلية' : 'CERTIFIED ORIGINAL'} | REF: {startCard.cardNumber}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default StartCardPrintableDoc;
