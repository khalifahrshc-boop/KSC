/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SaaSAuditLog } from '../../types/saas';
import { Shield, Search, Clock, UserCheck, AlertCircle } from 'lucide-react';

interface SaaSAuditLogsTabProps {
  auditLogs: SaaSAuditLog[];
  lang: 'ar' | 'en';
}

export default function SaaSAuditLogsTab({ auditLogs, lang }: SaaSAuditLogsTabProps) {
  const isRtl = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.actorName.toLowerCase().includes(searchLower) ||
      (log.reason && log.reason.toLowerCase().includes(searchLower)) ||
      log.entityId.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            {isRtl ? 'سجل التدقيق الشامل غير القابل للتعديل' : 'Immutable SaaS Audit Log Trail'}
          </h3>
          <p className="text-xs text-slate-500">
            {isRtl ? 'جميع العمليات وتغييرات الاشتراك والمدفوعات مسجلة وموثقة بالتاريخ والمسؤول.' : 'Complete audit history of administrative changes, subscription state transitions, and billing events.'}
          </p>
        </div>

        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 rtl:right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'ابحث عن الإجراء، المسؤول، أو المعرف...' : 'Search action, actor, or entity ID...'}
            className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right rtl:text-right text-slate-700 dark:text-slate-300">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                <th className="p-4">{isRtl ? 'التاريخ والوقت' : 'Timestamp'}</th>
                <th className="p-4">{isRtl ? 'نوع الإجراء' : 'Action Type'}</th>
                <th className="p-4">{isRtl ? 'المسؤول' : 'Actor / Admin'}</th>
                <th className="p-4">{isRtl ? 'الكيان والمُعرّف' : 'Entity & ID'}</th>
                <th className="p-4">{isRtl ? 'السبب والبيانات' : 'Reason / Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    {isRtl ? 'لا توجد سجلات تدقيق طابقة للبحث' : 'No audit records match filters.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {log.timestamp.replace('T', ' ').split('.')[0]}
                    </td>

                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 rounded-full text-xs font-bold">
                        {log.action}
                      </span>
                    </td>

                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                      {log.actorName}
                    </td>

                    <td className="p-4 font-mono text-xs">
                      <span className="text-slate-400 block">{log.entityType}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{log.entityId}</span>
                    </td>

                    <td className="p-4 text-xs text-slate-600 dark:text-slate-300 max-w-md">
                      {log.reason || 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
