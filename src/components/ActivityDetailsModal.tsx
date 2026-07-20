/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, Worker, WarehouseMaterial, EquipmentItem } from '../types';
import { 
  X, UserCheck, Package, Wrench, Printer, Clock, AlertTriangle, Calendar 
} from 'lucide-react';

interface ActivityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  workers: Worker[];
  materials: WarehouseMaterial[];
  equipment: EquipmentItem[];
  activities: Activity[];
  isPrinting: boolean;
  onPrint: () => void;
  lang: 'ar' | 'en';
}

export default function ActivityDetailsModal({
  isOpen,
  onClose,
  activity,
  workers,
  materials,
  equipment,
  activities,
  isPrinting,
  onPrint,
  lang
}: ActivityDetailsModalProps) {
  const isRtl = lang === 'ar';

  if (!isOpen || !activity) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-100 animate-scaleIn max-h-[90vh] overflow-y-auto">
        <div className="bg-[#040957] text-white p-4 rounded-t-2xl flex justify-between items-center">
          <h3 className="font-extrabold text-xs uppercase tracking-wide">{isRtl ? 'تفاصيل ومعلومات النشاط' : 'Activity Details'}</h3>
          <button onClick={onClose} className="text-white bg-white/10 hover:bg-white/20 p-1 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 text-right md:text-right">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase block">{isRtl ? 'الاسم (عربي)' : 'Name (Arabic)'}</label>
              <p className="font-extrabold text-sm text-[#040957]">{activity.nameAr}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase block">{isRtl ? 'الاسم (إنجليزي)' : 'Name (English)'}</label>
              <p className="font-extrabold text-sm text-[#040957]">{activity.nameEn}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase block">{isRtl ? 'الكمية الكلية' : 'Total Quantity'}</label>
              <p className="font-mono font-extrabold text-sm text-[#040957]">{activity.totalQuantity} {activity.unit}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase block">{isRtl ? 'التبعية والارتباط' : 'Dependency'}</label>
              <p className="font-bold text-sm text-slate-600">
                {activity.dependsOnActivityId 
                  ? (activities.find(a => a.id === activity.dependsOnActivityId)?.nameAr || activity.dependsOnActivityId)
                  : (isRtl ? 'لا يوجد تبعية مباشرة' : 'None')}
              </p>
            </div>
            {activity.workZone && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase block">{isRtl ? 'نطاق العمل (المنطقة)' : 'Work Zone'}</label>
                <p className="font-bold text-sm text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block">{activity.workZone}</p>
              </div>
            )}
            {activity.role && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase block">{isRtl ? 'الدور / المسؤولية بالموقع' : 'Role / Purpose'}</label>
                <p className="font-bold text-sm text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block">{activity.role}</p>
              </div>
            )}
            {activity.location && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase block">{isRtl ? 'الموقع التفصيلي الدقيق' : 'Pinpoint Location'}</label>
                <p className="font-bold text-sm text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 block">{activity.location}</p>
              </div>
            )}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase block">{isRtl ? 'تصنيف الأهمية والمشروع' : 'Project Criticality Class'}</label>
              <div>
                {activity.isCritical ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    {isRtl ? 'نشاط حرج ومفصلي (تأخيره يؤثر مباشرة على تاريخ تسليم المشروع بالكامل)' : 'Critical Path (Any delays will postpone full project delivery)'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {isRtl ? 'نشاط قياسي عادي' : 'Standard Routine Activity'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase block">{isRtl ? 'الوصف الفني والتنفيذي' : 'Description'}</label>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {isRtl ? (activity.descriptionAr || 'لا يوجد وصف فني مدخل') : (activity.descriptionEn || 'No technical description available')}
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            {/* Workers Section */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-[#040957] text-xs flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#0080FF]" />
                {isRtl ? 'العمال المخصصون للعمل الميداني' : 'Allocated Workforce'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activity.workerIds && activity.workerIds.length > 0 ? (
                  workers.filter(w => activity.workerIds.includes(w.id)).map(w => (
                    <div key={w.id} className="flex items-center justify-between p-2 rounded-xl bg-blue-50/50 border border-blue-100">
                      <span className="text-xs font-bold text-blue-900">{w.fullName}</span>
                      <span className="text-[10px] text-blue-600 font-mono font-bold">{isRtl ? w.professionAr : w.professionEn}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-400 italic">{isRtl ? 'لم يتم تخصيص عمال بعد' : 'No workers allocated'}</p>
                )}
              </div>
            </div>

            {/* Materials Section */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-[#040957] text-xs flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0080FF]" />
                {isRtl ? 'المواد المخصصة من المستودع' : 'Allocated Materials'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activity.materialAllocations && activity.materialAllocations.length > 0 ? (
                  activity.materialAllocations.map(alloc => {
                    const m = materials.find(mat => mat.id === alloc.id);
                    return (
                      <div key={alloc.id} className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/50 border border-emerald-100">
                        <span className="text-xs font-bold text-emerald-900">{isRtl ? m?.nameAr : m?.nameEn}</span>
                        <span className="text-[10px] text-emerald-600 font-mono font-black">{alloc.quantity} {m?.unit}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-slate-400 italic">{isRtl ? 'لم يتم ربط مواد مستودع بالنشاط' : 'No materials allocated'}</p>
                )}
              </div>
            </div>

            {/* Equipment Section */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-[#040957] text-xs flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#0080FF]" />
                {isRtl ? 'الآليات والمعدات المحجوزة' : 'Allocated Heavy Equipment'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activity.equipmentAllocations && activity.equipmentAllocations.length > 0 ? (
                  activity.equipmentAllocations.map(alloc => {
                    const e = equipment.find(eq => eq.id === alloc.id);
                    return (
                      <div key={alloc.id} className="flex items-center justify-between p-2 rounded-xl bg-amber-50/50 border border-amber-100">
                        <span className="text-xs font-bold text-amber-900">{isRtl ? e?.nameAr : e?.nameEn}</span>
                        <span className="text-[10px] text-amber-600 font-mono font-black">{alloc.quantity} {isRtl ? 'وحدة' : 'Units'}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] text-slate-400 italic">{isRtl ? 'لم يتم حجز آليات ومعدات' : 'No equipment allocated'}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button 
              onClick={onClose} 
              className="bg-slate-100 text-slate-600 py-2.5 px-6 rounded-xl text-xs font-extrabold transition hover:bg-slate-200"
            >
              {isRtl ? 'إغلاق' : 'Close'}
            </button>
            <button 
              onClick={onPrint} 
              disabled={isPrinting}
              className="bg-[#040957] text-white py-2.5 px-6 rounded-xl text-xs font-black transition shadow-md hover:bg-[#0080FF] flex items-center gap-2"
            >
              {isPrinting ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>{isRtl ? 'طباعة التقرير التفصيلي' : 'Print Detailed Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
