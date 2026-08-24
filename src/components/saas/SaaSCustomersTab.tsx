/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SaaSCustomer,
  SaaSSubscription,
  SaaSInvoice,
  SaaSPayment,
  SaaSLicense,
  SaaSDevice
} from '../../types/saas';
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  FileText,
  CreditCard,
  X,
  CheckCircle2,
  AlertCircle,
  Key,
  Smartphone,
  ChevronRight,
  Edit2
} from 'lucide-react';

interface SaaSCustomersTabProps {
  customers: SaaSCustomer[];
  subscriptions: SaaSSubscription[];
  invoices: SaaSInvoice[];
  payments: SaaSPayment[];
  licenses: SaaSLicense[];
  devices: SaaSDevice[];
  lang: 'ar' | 'en';
  onSaveCustomer: (cust: SaaSCustomer) => void;
}

export default function SaaSCustomersTab({
  customers,
  subscriptions,
  invoices,
  payments,
  licenses,
  devices,
  lang,
  onSaveCustomer
}: SaaSCustomersTabProps) {
  const isRtl = lang === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCust, setSelectedCust] = useState<SaaSCustomer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [companyNameAr, setCompanyNameAr] = useState('');
  const [companyNameEn, setCompanyNameEn] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [commercialRegistration, setCommercialRegistration] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [addressAr, setAddressAr] = useState('');
  const [addressEn, setAddressEn] = useState('');

  const filteredCustomers = customers.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    return (
      c.companyNameEn.toLowerCase().includes(searchLower) ||
      c.companyNameAr.toLowerCase().includes(searchLower) ||
      c.vatNumber.toLowerCase().includes(searchLower) ||
      c.commercialRegistration.toLowerCase().includes(searchLower) ||
      c.email.toLowerCase().includes(searchLower)
    );
  });

  const handleSaveCustomer = () => {
    if (!companyNameAr || !companyNameEn || !email) {
      alert('Please fill in required fields');
      return;
    }

    const newCust: SaaSCustomer = {
      id: selectedCust ? selectedCust.id : `cust_${Date.now()}`,
      companyNameAr,
      companyNameEn,
      contactPerson,
      mobile,
      email,
      commercialRegistration,
      vatNumber,
      addressAr,
      addressEn,
      country: 'Saudi Arabia',
      status: 'ACTIVE',
      createdAt: selectedCust ? selectedCust.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveCustomer(newCust);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedCust(null);
    setCompanyNameAr('');
    setCompanyNameEn('');
    setContactPerson('');
    setMobile('');
    setEmail('');
    setCommercialRegistration('');
    setVatNumber('');
    setAddressAr('');
    setAddressEn('');
  };

  const handleEditClick = (cust: SaaSCustomer) => {
    setSelectedCust(cust);
    setCompanyNameAr(cust.companyNameAr);
    setCompanyNameEn(cust.companyNameEn);
    setContactPerson(cust.contactPerson);
    setMobile(cust.mobile);
    setEmail(cust.email);
    setCommercialRegistration(cust.commercialRegistration);
    setVatNumber(cust.vatNumber);
    setAddressAr(cust.addressAr);
    setAddressEn(cust.addressEn);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar & Action Button */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 rtl:right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'ابحث عن اسم الشركة، الرقم الضريبي، أو السجل التجاري...' : 'Search company name, VAT number, CR number...'}
            className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          {isRtl ? 'إضافة شركة / عميل جديد' : 'Add New Customer'}
        </button>
      </div>

      {/* Customer Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(cust => {
          const custSubs = subscriptions.filter(s => s.tenantId === cust.id);
          const activeSub = custSubs.find(s => s.status === 'ACTIVE');
          const custInvoices = invoices.filter(i => i.tenantId === cust.id);
          const totalPaid = payments
            .filter(p => p.tenantId === cust.id && p.status === 'PAID')
            .reduce((s, p) => s + p.totalAmount, 0);

          return (
            <div
              key={cust.id}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-sky-500 transition-all space-y-4 relative"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    {isRtl ? cust.companyNameAr : cust.companyNameEn}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{cust.companyNameEn}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  cust.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'
                }`}>
                  {cust.status}
                </span>
              </div>

              {/* Tax & CR Metadata */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <p className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'الرقم الضريبي VAT:' : 'VAT No:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cust.vatNumber || 'N/A'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'السجل التجاري CR:' : 'CR No:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cust.commercialRegistration || 'N/A'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">{isRtl ? 'مسؤول الاتصال:' : 'Contact:'}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{cust.contactPerson}</span>
                </p>
              </div>

              {/* Subscription & Financial Summary */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block">{isRtl ? 'الاشتراك الحالي' : 'Active Subscription'}</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400">
                    {activeSub ? activeSub.planId : (isRtl ? 'لا يوجد اشتراك' : 'No Active Sub')}
                  </span>
                </div>

                <div className="text-right rtl:text-left">
                  <span className="text-slate-400 block">{isRtl ? 'إجمالي المحصل' : 'Total Revenue'}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {totalPaid.toLocaleString()} SAR
                  </span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => handleEditClick(cust)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {isRtl ? 'تعديل' : 'Edit'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedCust ? (isRtl ? 'تعديل بيانات الشركة' : 'Edit Customer Profile') : (isRtl ? 'تسجيل شركة عميل جديدة' : 'Add New Customer Profile')}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'اسم الشركة (بالعربي)' : 'Company Name (Arabic)'} *
                </label>
                <input
                  type="text"
                  value={companyNameAr}
                  onChange={e => setCompanyNameAr(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'اسم الشركة (بالإنجليزي)' : 'Company Name (English)'} *
                </label>
                <input
                  type="text"
                  value={companyNameEn}
                  onChange={e => setCompanyNameEn(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'اسم مسؤول التواصل' : 'Contact Person'}
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'البريد الإلكتروني' : 'Email Address'} *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'رقم الهاتف / الجوال' : 'Mobile / Phone'}
                </label>
                <input
                  type="text"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'رقم السجل التجاري CR' : 'Commercial Registration (CR)'}
                </label>
                <input
                  type="text"
                  value={commercialRegistration}
                  onChange={e => setCommercialRegistration(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'الرقم الضريبي VAT' : 'VAT Registration Number'}
                </label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={e => setVatNumber(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {isRtl ? 'العنوان الرئيسي' : 'Registered Address'}
                </label>
                <input
                  type="text"
                  value={addressAr}
                  onChange={e => setAddressAr(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveCustomer}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl"
              >
                {isRtl ? 'حفظ البيانات' : 'Save Customer Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
