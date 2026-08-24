/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T, index: number) => React.ReactNode);
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface DocumentTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
}

export function DocumentTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records available',
  className = ''
}: DocumentTableProps<T>) {
  return (
    <div className={`overflow-x-auto border border-slate-300 ${className}`}>
      <table className="w-full border-collapse text-xs bg-white">
        <thead>
          <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`p-2 border-r border-slate-300 last:border-r-0 ${
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                } ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-4 text-center text-slate-500 italic">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr
                key={keyExtractor(item, rowIndex)}
                className={`pdf-avoid-break border-b border-slate-200 last:border-b-0 ${
                  rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
              >
                {columns.map((col, colIndex) => {
                  const content = typeof col.accessor === 'function'
                    ? col.accessor(item, rowIndex)
                    : (item[col.accessor] as React.ReactNode);

                  return (
                    <td
                      key={colIndex}
                      className={`p-2 border-r border-slate-200 last:border-r-0 align-top ${
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
