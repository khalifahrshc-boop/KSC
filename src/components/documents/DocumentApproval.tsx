/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ApprovalStep } from '../../types';

interface DocumentApprovalProps {
  approvals: ApprovalStep[];
  lang?: 'ar' | 'en';
}

export const DocumentApproval: React.FC<DocumentApprovalProps> = ({
  approvals,
  lang = 'en'
}) => {
  const isRtl = lang === 'ar';

  return (
    <div className="pdf-avoid-break mb-6">
      <div className="flex items-center justify-between border-b border-blue-600 pb-1.5 mb-3">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">{isRtl ? 'الاعتمادات والتوقيعات' : 'DOCUMENT APPROVAL & AUTHORIZATION'}</span>
        <span className="text-[9.5px] text-slate-500 font-mono">AUDIT TRAIL VERIFIED</span>
      </div>
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 text-xs border-t border-l border-slate-300">
          {approvals.map((app) => (
            <div key={app.id} className="pdf-avoid-break p-3 bg-white border-r border-b border-slate-300 flex flex-col justify-between min-h-[120px]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8.5px] font-mono text-slate-500 font-bold">STEP #{app.order}</span>
                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 border uppercase ${
                    app.status === 'Approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                    app.status === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    {app.status}
                  </span>
                </div>
                <span className="font-bold text-slate-900 block leading-tight text-xs uppercase">
                  {isRtl ? app.roleNameAr : app.roleNameEn}
                </span>
                <span className="text-[10px] text-slate-600 block mt-1 font-medium">
                  {app.assignedUserName || app.approverName || (isRtl ? 'بانتظار المعين' : 'Pending Assignee')}
                </span>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200">
                {app.status === 'Approved' ? (
                  <div>
                    <div className="font-serif text-[12px] text-slate-800 font-bold italic tracking-wide truncate">
                      {app.signatureData || app.approverName || 'Authorized'}
                    </div>
                    <span className="text-[8px] text-slate-400 block font-mono mt-0.5">
                      {app.decisionDate} {app.decisionTime}
                    </span>
                  </div>
                ) : (
                  <div className="h-8 flex items-end text-[9px] text-slate-300 italic">
                    {isRtl ? 'التوقيع' : 'Signature'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
