/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface DocumentFooterProps {
  companyName: string;
  projectName: string;
  documentNumber: string;
  revision: string;
  lang?: 'ar' | 'en';
}

export const DocumentFooter: React.FC<DocumentFooterProps> = ({
  companyName,
  projectName,
  documentNumber,
  revision,
  lang = 'en'
}) => {
  const isRtl = lang === 'ar';

  return (
    <div className="pdf-avoid-break pt-4 mt-6 border-t border-slate-300 text-[9px] text-slate-500 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-800">{companyName}</span>
        <span>•</span>
        <span>{projectName}</span>
      </div>
      <div className="font-mono text-slate-600 font-bold tracking-widest uppercase">
        DOC: {documentNumber} | REV {revision}
      </div>
      <div className="font-mono text-slate-400 font-bold">
        {/* Page numbering is handled dynamically by UniversalPdfEngine or browser print engine */}
      </div>
    </div>
  );
};
