/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface InfoItem {
  label: string;
  value: string | React.ReactNode;
}

interface DocumentInfoTableProps {
  items: InfoItem[];
  columns?: 2 | 3 | 4;
  lang?: 'ar' | 'en';
}

export const DocumentInfoTable: React.FC<DocumentInfoTableProps> = ({
  items,
  columns = 2,
  lang = 'en'
}) => {
  const isRtl = lang === 'ar';
  const gridColsClass = columns === 3 ? 'grid-cols-3' : columns === 4 ? 'grid-cols-4' : 'grid-cols-2';

  return (
    <div className="pdf-avoid-break mb-6 border border-slate-300">
      <div className={`grid ${gridColsClass} divide-x divide-y divide-slate-300 text-xs`}>
        {items.map((item, idx) => (
          <div key={idx} className="p-2.5 bg-white flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
              {item.label}
            </span>
            <span className="font-bold text-slate-900 text-xs">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
