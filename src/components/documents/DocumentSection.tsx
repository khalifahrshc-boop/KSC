/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface DocumentSectionProps {
  title: string;
  number?: string | number;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const DocumentSection: React.FC<DocumentSectionProps> = ({
  title,
  number,
  children,
  action,
  className = ''
}) => {
  return (
    <div className={`pdf-avoid-break mb-6 ${className}`}>
      <div className="flex items-center justify-between border-b border-blue-600 pb-1.5 mb-3">
        <div className="flex items-baseline gap-2">
          {number !== undefined && (
            <span className="font-mono text-slate-500 font-bold text-xs">{String(number).padStart(2, '0')}</span>
          )}
          <span className="uppercase font-bold text-slate-900 tracking-widest text-xs">{title}</span>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};
