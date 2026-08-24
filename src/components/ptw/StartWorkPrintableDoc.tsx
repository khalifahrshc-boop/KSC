/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StartWorkRecord, SystemSettings } from '../../types';
import { generateStartWorkQRCode } from '../../utils/ptwCalculations';
import { QrCode, CheckSquare, Square } from 'lucide-react';

interface StartWorkPrintableDocProps {
  startWork: StartWorkRecord;
  settings: SystemSettings;
  lang: 'ar' | 'en';
  qrCodeUrl?: string;
}

export const StartWorkPrintableDoc: React.FC<StartWorkPrintableDocProps> = ({
  startWork,
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
      generateStartWorkQRCode(startWork, isRtl ? startWork.projectNameAr : startWork.projectNameEn).then(url => {
        if (isMounted && url) {
          setInternalQrCodeUrl(url);
        }
      });
      return () => { isMounted = false; };
    }
  }, [externalQrCodeUrl, startWork, isRtl]);

  const activeQrCode = externalQrCodeUrl || internalQrCodeUrl;

  return (
    <div 
      id={`start-work-print-${startWork.id}`}
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
                  {isRtl ? 'تصريح ومحضر بدء الأعمال' : 'START WORK AUTHORIZATION'}
                </div>
                <div className="inline-block text-[9px] font-bold mt-1 bg-slate-800 text-white px-2.5 py-0.5 uppercase tracking-widest rounded-sm">
                  {isRtl ? 'شهادة التوثيق والجاهزية للبدء الميداني' : 'OFFICIAL SITE EXECUTION CLEARANCE'}
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
                      <td className="p-1 text-center font-mono font-bold text-[8.5px]" style={{ width: '65%' }}>HSE-SWA-02</td>
                    </tr>
                    <tr className="border-b border-slate-800">
                      <td className={`bg-slate-100 font-bold p-1 text-center text-[8px] border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '35%' }}>Rev. No</td>
                      <td className="p-1 text-center font-mono font-bold text-[8.5px]" style={{ width: '65%' }}>0{startWork.revision || 1}</td>
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

        {/* Form Meta Details Table */}
        <table className="w-full border-collapse border-b-[2px] border-slate-800 text-[9.5px]" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '12%' }}>
                {isRtl ? 'رقم المحضر' : 'Ref No'}
              </td>
              <td className={`p-1.5 font-mono font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '18%' }}>
                {startWork.startWorkNumber}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '12%' }}>
                {isRtl ? 'حالة الاعتماد' : 'Status'}
              </td>
              <td className={`p-1.5 font-bold uppercase border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '18%' }}>
                {startWork.status}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'القرار النهائي' : 'Final Decision'}
              </td>
              <td className="p-1.5 font-black uppercase text-center" style={{ width: '25%' }}>
                <span className={`px-2 py-0.5 rounded font-black inline-block ${
                  startWork.isReadyToStart ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}>
                  {startWork.isReadyToStart ? (isRtl ? 'جاهز للبدء ومصرح له (APPROVED)' : 'APPROVED TO EXECUTE') : (isRtl ? 'غير مصرح للبدء (HOLD)' : 'PENDING / HOLD')}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 1: Project Info */}
        <div className="bg-slate-800 text-white font-bold px-2 py-1 text-[10.5px] uppercase border-b border-slate-800">
          1. {isRtl ? 'بيانات المشروع والجهة المنفذة' : 'PROJECT & EXECUTION ENTITY INFO'}
        </div>
        <table className="w-full border-collapse border-b-[2px] border-slate-800 text-[9.5px]" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr className="border-b border-slate-800">
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'اسم المشروع' : 'Project Name'}
              </td>
              <td className={`p-1.5 font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '35%' }}>
                {isRtl ? startWork.projectNameAr : startWork.projectNameEn}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'موقع المشروع / المنطقة' : 'Location / Area'}
              </td>
              <td className="p-1.5 font-bold" style={{ width: '35%' }}>
                {isRtl ? startWork.areaLocationAr : startWork.areaLocationEn}
              </td>
            </tr>
            <tr className="border-b border-slate-800">
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'المقاول الرئيسي/الفرعي' : 'Contractor/Sub'}
              </td>
              <td className={`p-1.5 font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '35%' }}>
                {isRtl ? startWork.contractorAr : startWork.contractorEn}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'المشرف المسؤول' : 'Supervisor'}
              </td>
              <td className="p-1.5 font-bold" style={{ width: '35%' }}>
                {startWork.supervisorName || 'Site Supervisor'}
              </td>
            </tr>
            <tr>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'وقت وتاريخ البدء' : 'Planned Start'}
              </td>
              <td className={`p-1.5 font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '35%' }}>
                {startWork.plannedStartDate} {startWork.plannedStartTime}
              </td>
              <td className={`bg-slate-100 font-bold p-1.5 border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '15%' }}>
                {isRtl ? 'حجم القوى العاملة' : 'Workforce'}
              </td>
              <td className="p-1.5 font-bold" style={{ width: '35%' }}>
                {startWork.workforceCount} {isRtl ? 'عمال' : 'Workers'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 2: Instructions and Equipment */}
        <div className="bg-slate-800 text-white font-bold px-2 py-1 text-[10.5px] uppercase border-b border-slate-800">
          2. {isRtl ? 'تفاصيل المعدات والتعليمات الفنية' : 'EQUIPMENT & TECHNICAL INSTRUCTIONS'}
        </div>
        <table className="w-full border-collapse border-b-[2px] border-slate-800 text-[9.5px]" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td 
                className={`p-2 align-top border-slate-800 ${isRtl ? 'border-l-[2px]' : 'border-r-[2px]'}`}
                style={{ width: '50%' }}
              >
                <div className="font-bold text-[9px] uppercase text-slate-800 mb-1 border-b border-slate-300 pb-0.5">
                  🚜 {isRtl ? 'المعدات المعتمدة (Equipment)' : 'Equipment'}
                </div>
                <div className="text-[9px] font-medium leading-relaxed">
                  {startWork.equipmentDetails || (isRtl ? 'لا توجد معدات ثقيلة محددة للنشاط' : 'No heavy equipment specified')}
                </div>
              </td>
              <td 
                className="p-2 align-top bg-slate-50/50"
                style={{ width: '50%' }}
              >
                <div className="font-bold text-[9px] uppercase text-rose-800 mb-1 border-b border-rose-200 pb-0.5">
                  ⚠️ {isRtl ? 'التعليمات الخاصة (Special Instructions)' : 'Special Instructions'}
                </div>
                <div className="text-[9px] font-medium text-rose-900 leading-relaxed">
                  {startWork.specialInstructions || (isRtl ? 'لا توجد تعليمات خاصة. يرجى اتباع إجراءات السلامة العامة المعتمدة.' : 'No special instructions. Follow standard HSE guidelines.')}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 3: Readiness Pre-conditions */}
        <div className="bg-slate-800 text-white font-bold px-2 py-1 text-[10.5px] uppercase border-b border-slate-800 flex justify-between">
          <span>3. {isRtl ? 'قائمة الشروط المسبقة وبنود الجاهزية الإلزامية (Pre-conditions Checklist)' : 'MANDATORY PRE-CONDITIONS & READINESS CHECKLIST'}</span>
          <span className="font-normal text-[9px]">{isRtl ? 'إلزامي تحقيق كافة البنود' : 'All items must be strictly verified'}</span>
        </div>
        <table className="w-full border-collapse border-b-[2px] border-slate-800 text-[9px]" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-slate-100 text-[8.5px] uppercase border-b border-slate-800">
            <tr>
              <th className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '4%' }}>#</th>
              <th className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '20%' }}>{isRtl ? 'التصنيف (Category)' : 'Category'}</th>
              <th className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`} style={{ width: '61%' }}>{isRtl ? 'بند الجاهزية والشروط المسبقة' : 'Pre-condition Requirement'}</th>
              <th className="p-1 text-center font-bold" style={{ width: '15%' }}>{isRtl ? 'مستوفى (Met?)' : 'Met?'}</th>
            </tr>
          </thead>
          <tbody>
            {startWork.preconditions.map((item, index) => (
              <tr key={item.id} className="border-b border-slate-800 last:border-b-0 pdf-avoid-break">
                <td className={`p-1 text-center font-bold border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`}>{index + 1}</td>
                <td className={`p-1 font-bold border-slate-800 text-center ${isRtl ? 'border-l' : 'border-r'}`}>{item.category}</td>
                <td className={`p-1 font-medium border-slate-800 ${isRtl ? 'border-l' : 'border-r'}`}>
                  {isRtl ? item.titleAr : item.titleEn}
                </td>
                <td className="p-1 text-center font-bold">
                  {item.isMet ? (
                    <div className="flex items-center justify-center gap-1 text-emerald-700">
                      <CheckSquare className="w-3.5 h-3.5" /> <span>{isRtl ? 'نعم (Yes)' : 'YES'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 text-rose-700">
                      <Square className="w-3.5 h-3.5" /> <span>{isRtl ? 'لا (No)' : 'NO'}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Section 4: Signatures */}
        <div className="bg-slate-800 text-white font-bold px-2 py-1 text-[10.5px] uppercase border-b border-slate-800">
          4. {isRtl ? 'الاعتمادات والتوقيعات الرقمية (Authorizations & Signatures)' : 'AUTHORIZATION & DIGITAL SIGNATURES'}
        </div>
        <table className="w-full border-collapse bg-slate-50/60" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {startWork.approvals.map((app, index) => {
                const cellWidth = `${100 / Math.max(1, startWork.approvals.length)}%`;
                const isLast = index === startWork.approvals.length - 1;

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
              🔒 {isRtl ? 'هذا النموذج ملزم قانونياً بموقع العمل ومسجل بالنظام الإلكتروني' : 'This form is a legally binding site document logged in the official system'}
            </td>
            <td className="text-right rtl:text-left font-mono" style={{ width: '30%' }}>
              {isRtl ? 'النسخة الأصلية (Original Copy)' : 'ORIGINAL COPY'} | REF: {startWork.startWorkNumber}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default StartWorkPrintableDoc;
