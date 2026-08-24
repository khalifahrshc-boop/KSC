/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface DocumentHeaderProps {
  companyName: string;
  companyLogo?: string;
  projectName: string;
  documentTitle: string;
  documentNumber: string;
  revision: string;
  date: string;
  status: string;
  qrCodeUrl?: string;
  lang?: 'ar' | 'en';
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  companyName,
  companyLogo,
  projectName,
  documentTitle,
  documentNumber,
  revision,
  date,
  status,
  qrCodeUrl,
  lang = 'en'
}) => {
  const isRtl = lang === 'ar';

  return (
    <div className="pdf-avoid-break border-b-2 border-slate-800 pb-4 mb-5">
      <div className="flex items-start justify-between">
        
        {/* Left: Logo & Company */}
        <div className="flex items-center gap-4">
          {companyLogo ? (
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              className="h-12 w-auto max-w-[140px] object-contain" 
              crossOrigin="anonymous" 
            />
          ) : (
            <div className="w-12 h-12 border border-slate-300 bg-slate-50 text-slate-800 flex items-center justify-center font-bold text-lg font-serif tracking-widest shrink-0">
              {companyName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col justify-center">
            <h1 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
              {companyName}
            </h1>
            <p className="text-[11px] text-slate-600 uppercase font-medium mt-0.5">
              {projectName}
            </p>
          </div>
        </div>

        {/* Center/Right: Document Title & Metadata */}
        <div className="flex gap-6 items-start">
          <div className="text-right pt-1">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-widest mb-2">
              {documentTitle}
            </h2>
            <table className={`text-[9px] font-mono border-collapse ${isRtl ? 'ml-auto text-right' : 'mr-auto text-left'} ml-auto`}>
              <tbody>
                <tr>
                  <td className="text-slate-500 font-bold py-0.5 pr-3">{isRtl ? 'رقم الوثيقة:' : 'Document No:'}</td>
                  <td className="font-bold text-slate-900 py-0.5">{documentNumber}</td>
                </tr>
                <tr>
                  <td className="text-slate-500 font-bold py-0.5 pr-3">{isRtl ? 'المراجعة:' : 'Revision:'}</td>
                  <td className="font-bold text-slate-900 py-0.5">{revision}</td>
                </tr>
                <tr>
                  <td className="text-slate-500 font-bold py-0.5 pr-3">{isRtl ? 'التاريخ:' : 'Date:'}</td>
                  <td className="font-bold text-slate-900 py-0.5">{date}</td>
                </tr>
                <tr>
                  <td className="text-slate-500 font-bold py-0.5 pr-3">{isRtl ? 'الحالة:' : 'Status:'}</td>
                  <td className="font-bold text-slate-900 py-0.5 uppercase">{status}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* QR Code */}
          {qrCodeUrl && (
            <div className="flex flex-col items-center shrink-0 border border-slate-200 p-1.5 bg-white">
              <img 
                src={qrCodeUrl} 
                alt="Document QR" 
                className="w-14 h-14 object-contain" 
                crossOrigin="anonymous"
                width={56}
                height={56}
              />
              <span className="text-[6px] font-mono font-bold text-slate-400 mt-1 tracking-widest uppercase">VERIFIED</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
