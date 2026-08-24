/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface DocumentLayoutProps {
  children: React.ReactNode;
  lang?: 'ar' | 'en';
  className?: string;
  id?: string;
}

export const DocumentLayout: React.FC<DocumentLayoutProps> = ({
  children,
  lang = 'en',
  className = '',
  id
}) => {
  const isRtl = lang === 'ar';

  return (
    <div
      id={id}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`bg-white text-slate-900 mx-auto w-full max-w-[210mm] min-h-[297mm] p-6 sm:p-10 box-border border border-slate-200 shadow-xl print:shadow-none print:border-none print:p-6 text-xs relative ${className}`}
      style={{
        fontFamily: "'Inter', 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        lineHeight: 1.5,
        letterSpacing: '-0.01em'
      }}
    >
      {children}
    </div>
  );
};
