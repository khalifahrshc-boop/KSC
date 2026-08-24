/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SaaSLicense,
  SaaSDevice,
  SaaSCustomer,
  SaaSSubscription
} from '../../types/saas';
import {
  Key,
  Smartphone,
  Search,
  Lock,
  Unlock,
  XCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Laptop
} from 'lucide-react';

interface SaaSLicensesDevicesTabProps {
  licenses: SaaSLicense[];
  devices: SaaSDevice[];
  customers: SaaSCustomer[];
  subscriptions: SaaSSubscription[];
  lang: 'ar' | 'en';
  onSaveDevice: (dev: SaaSDevice) => void;
  onSaveLicense: (lic: SaaSLicense) => void;
}

export default function SaaSLicensesDevicesTab({
  licenses,
  devices,
  customers,
  subscriptions,
  lang,
  onSaveDevice,
  onSaveLicense
}: SaaSLicensesDevicesTabProps) {
  const isRtl = lang === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'licenses' | 'devices'>('licenses');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLicenses = licenses.filter(lic => {
    const searchLower = searchTerm.toLowerCase();
    const cust = customers.find(c => c.id === lic.tenantId);
    return (
      lic.licenseKey.toLowerCase().includes(searchLower) ||
      lic.id.toLowerCase().includes(searchLower) ||
      (cust && (cust.companyNameEn.toLowerCase().includes(searchLower) || cust.companyNameAr.toLowerCase().includes(searchLower)))
    );
  });

  const filteredDevices = devices.filter(dev => {
    const searchLower = searchTerm.toLowerCase();
    return (
      dev.deviceId.toLowerCase().includes(searchLower) ||
      dev.deviceName.toLowerCase().includes(searchLower) ||
      dev.userName.toLowerCase().includes(searchLower)
    );
  });

  const handleToggleDeviceStatus = (dev: SaaSDevice, newStatus: 'ACTIVE' | 'BLOCKED' | 'DEACTIVATED') => {
    const updatedDev: SaaSDevice = {
      ...dev,
      status: newStatus
    };
    onSaveDevice(updatedDev);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('licenses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'licenses'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Key className="w-4 h-4" />
            {isRtl ? 'مفاتيح التراخيص (Licenses)' : 'License Keys'} ({licenses.length})
          </button>

          <button
            onClick={() => setActiveSubTab('devices')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'devices'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            {isRtl ? 'الأجهزة المربوطة والمحطات' : 'Connected Devices'} ({devices.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 rtl:right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'ابحث برقم مفتاح الترخيص أو الجهاز...' : 'Search license key or device name...'}
            className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Licenses View */}
      {activeSubTab === 'licenses' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                  <th className="p-4">{isRtl ? 'مفتاح الترخيص' : 'License Key'}</th>
                  <th className="p-4">{isRtl ? 'العميل' : 'Customer'}</th>
                  <th className="p-4">{isRtl ? 'الحالة' : 'Status'}</th>
                  <th className="p-4">{isRtl ? 'تاريخ التنشيط' : 'Activation Date'}</th>
                  <th className="p-4">{isRtl ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                  <th className="p-4 text-center">{isRtl ? 'سعة الأجهزة والمستخدمين' : 'Device & User Limits'}</th>
                  <th className="p-4 text-center">{isRtl ? 'إدارة الترخيص' : 'Manage License'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLicenses.map(lic => {
                  const cust = customers.find(c => c.id === lic.tenantId);
                  const handleLicenseStatusChange = (newStatus: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED') => {
                    onSaveLicense({
                      ...lic,
                      status: newStatus,
                      updatedAt: new Date().toISOString()
                    });
                  };
                  return (
                    <tr key={lic.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="p-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {lic.licenseKey}
                      </td>
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        {cust ? (isRtl ? cust.companyNameAr : cust.companyNameEn) : lic.tenantId}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          lic.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lic.status === 'SUSPENDED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {lic.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs">{lic.activationDate}</td>
                      <td className="p-4 font-mono text-xs">{lic.expiryDate}</td>
                      <td className="p-4 text-center">
                        <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                          Users: {lic.maxUsers === -1 ? '∞' : lic.maxUsers} | Devs: {lic.maxDevices === -1 ? '∞' : lic.maxDevices}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {lic.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleLicenseStatusChange('SUSPENDED')}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
                            >
                              {isRtl ? 'تعليق' : 'Suspend'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleLicenseStatusChange('ACTIVE')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold"
                            >
                              {isRtl ? 'تنشيط' : 'Activate'}
                            </button>
                          )}
                          {lic.status !== 'REVOKED' && (
                            <button
                              onClick={() => handleLicenseStatusChange('REVOKED')}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                            >
                              {isRtl ? 'إلغاء' : 'Revoke'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Devices View */}
      {activeSubTab === 'devices' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50">
                  <th className="p-4">{isRtl ? 'اسم وهاتف/جهاز الجهاز' : 'Device Info'}</th>
                  <th className="p-4">{isRtl ? 'نظام التشغيل والتطبيق' : 'OS & Version'}</th>
                  <th className="p-4">{isRtl ? 'المستخدم الحالي' : 'Active User'}</th>
                  <th className="p-4">{isRtl ? 'الحالة' : 'Status'}</th>
                  <th className="p-4">{isRtl ? 'آخر تواجد' : 'Last Active'}</th>
                  <th className="p-4 text-center">{isRtl ? 'إدارة الوصول' : 'Access Controls'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDevices.map(dev => (
                  <tr key={dev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{dev.deviceName}</span>
                      <span className="font-mono text-xs text-slate-400">{dev.deviceId}</span>
                    </td>
                    <td className="p-4 text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 block">{dev.os}</span>
                      <span className="text-slate-400">{dev.appVersion}</span>
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {dev.userName}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        dev.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : dev.status === 'BLOCKED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {dev.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">
                      {dev.lastSeen ? dev.lastSeen.split('T')[0] : 'N/A'}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {dev.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleToggleDeviceStatus(dev, 'BLOCKED')}
                            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3" />
                            {isRtl ? 'حظر الجهاز' : 'Block'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleDeviceStatus(dev, 'ACTIVE')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" />
                            {isRtl ? 'فك الحظر' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
