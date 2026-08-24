/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SaaSEnforcementCheck, SaaSSubscription } from '../../types/saas';
import { AlertTriangle, ShieldAlert, Lock, ArrowUpRight, X } from 'lucide-react';

interface SaaSBannerAndGuardProps {
  enforcement: SaaSEnforcementCheck;
  subscription: SaaSSubscription | null;
  lang: 'ar' | 'en';
  blockedModalInfo: {
    isOpen: boolean;
    titleEn: string;
    titleAr: string;
    messageEn: string;
    messageAr: string;
    errorCode?: string;
  } | null;
  onCloseBlockedModal: () => void;
  onOpenSaaSControlCenter?: () => void;
}

export default function SaaSBannerAndGuard({
  enforcement,
  subscription,
  lang,
  blockedModalInfo,
  onCloseBlockedModal,
  onOpenSaaSControlCenter
}: SaaSBannerAndGuardProps) {
  const isRtl = lang === 'ar';

  // Do not render top banner if subscription is active and no warnings
  const showBanner =
    enforcement.status === 'PAST_DUE' ||
    enforcement.status === 'EXPIRED' ||
    enforcement.status === 'SUSPENDED' ||
    enforcement.isReadOnly;

  return (
    <>
      {/* TOP NOTIFICATION BANNER */}
      {showBanner && (
        <div className={`w-full py-2.5 px-4 flex items-center justify-between text-xs font-bold shadow-md ${
          enforcement.status === 'SUSPENDED'
            ? 'bg-purple-950 text-purple-100 border-b border-purple-800'
            : enforcement.status === 'EXPIRED'
            ? 'bg-rose-950 text-rose-100 border-b border-rose-800'
            : 'bg-amber-950 text-amber-100 border-b border-amber-800'
        }`}>
          <div className="flex items-center gap-2 max-w-4xl">
            {enforcement.status === 'SUSPENDED' ? (
              <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
            ) : enforcement.status === 'EXPIRED' ? (
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}

            <span>
              {isRtl ? enforcement.messageAr : enforcement.messageEn}
            </span>
          </div>

          {onOpenSaaSControlCenter && (
            <button
              onClick={onOpenSaaSControlCenter}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 shrink-0"
            >
              <span>{isRtl ? 'إدارة الاشتراك' : 'Subscription Center'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          )}
        </div>
      )}

      {/* BLOCKED ACTION LIMIT MODAL */}
      {blockedModalInfo && blockedModalInfo.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isRtl ? blockedModalInfo.titleAr : blockedModalInfo.titleEn}
                </h3>
              </div>
              <button onClick={onCloseBlockedModal}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 space-y-2">
              <p>{isRtl ? blockedModalInfo.messageAr : blockedModalInfo.messageEn}</p>
              {blockedModalInfo.errorCode && (
                <span className="inline-block px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 rounded">
                  Error Code: {blockedModalInfo.errorCode}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={onCloseBlockedModal}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
              >
                {isRtl ? 'إغلاق' : 'Close'}
              </button>
              {onOpenSaaSControlCenter && (
                <button
                  onClick={() => {
                    onCloseBlockedModal();
                    onOpenSaaSControlCenter();
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  {isRtl ? 'ترقية الاشتراك' : 'Upgrade Plan'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
