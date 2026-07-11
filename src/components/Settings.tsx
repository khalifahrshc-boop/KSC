/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SystemSettings, UserRole } from '../types';
import { 
  Building2, 
  Mail, 
  MapPin, 
  Phone, 
  FileCheck, 
  Save, 
  Image, 
  Heart, 
  UserCheck, 
  Camera, 
  CheckCircle,
  FileText,
  Trash2,
  RefreshCw,
  Upload,
  Globe
} from 'lucide-react';

import { resizeImage } from '../utils/image';

interface SettingsProps {
  lang: 'ar' | 'en';
  t: any;
  settings: SystemSettings;
  userRole: UserRole;
  onUpdateSettings: (updated: SystemSettings) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export default function Settings({
  lang,
  t,
  settings,
  userRole,
  onUpdateSettings,
  openConfirm
}: SettingsProps) {
  const isRtl = lang === 'ar';
  const isReadOnly = userRole !== 'Super Admin'; // Only Super Admin can modify system identity settings!

  const [formNameAr, setFormNameAr] = useState(settings.companyNameAr);
  const [formNameEn, setFormNameEn] = useState(settings.companyNameEn);
  const [formPhone, setFormPhone] = useState(settings.companyPhone);
  const [formEmail, setFormEmail] = useState(settings.companyEmail);
  const [formAddrAr, setFormAddrAr] = useState(settings.officialAddressAr);
  const [formAddrEn, setFormAddrEn] = useState(settings.officialAddressEn);
  const [formCR, setFormCR] = useState(settings.commercialRegistration || '');
  const [formTax, setFormTax] = useState(settings.taxNumber || '');
  const [formWebsite, setFormWebsite] = useState(settings.companyWebsite || '');
  const [formMgrAr, setFormMgrAr] = useState(settings.managerNameAr);
  const [formMgrEn, setFormMgrEn] = useState(settings.managerNameEn);
  const [formSig, setFormSig] = useState(settings.managerSignature);
  const [formLogo, setFormLogo] = useState(settings.companyLogoUrl);
  const [formStamp, setFormStamp] = useState(settings.officialStampUrl);
  const [formTemplate, setFormTemplate] = useState<SystemSettings['reportTemplateType']>(settings.reportTemplateType);

  // Sync state with props when settings load from Firestore
  React.useEffect(() => {
    setFormNameAr(settings.companyNameAr);
    setFormNameEn(settings.companyNameEn);
    setFormPhone(settings.companyPhone);
    setFormEmail(settings.companyEmail);
    setFormAddrAr(settings.officialAddressAr);
    setFormAddrEn(settings.officialAddressEn);
    setFormCR(settings.commercialRegistration || '');
    setFormTax(settings.taxNumber || '');
    setFormWebsite(settings.companyWebsite || '');
    setFormMgrAr(settings.managerNameAr);
    setFormMgrEn(settings.managerNameEn);
    setFormSig(settings.managerSignature);
    setFormLogo(settings.companyLogoUrl);
    setFormStamp(settings.officialStampUrl);
    setFormTemplate(settings.reportTemplateType);
  }, [settings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const resized = await resizeImage(reader.result);
          setFormLogo(resized);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const resized = await resizeImage(reader.result);
          setFormStamp(resized);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [toastDone, setToastDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    let finalLogo = formLogo;
    let finalStamp = formStamp;

    // Force resize existing images if they are base64 strings to ensure we are under 1MB
    if (formLogo && formLogo.startsWith('data:image')) {
      finalLogo = await resizeImage(formLogo);
    }
    if (formStamp && formStamp.startsWith('data:image')) {
      finalStamp = await resizeImage(formStamp);
    }

    onUpdateSettings({
      companyNameAr: formNameAr,
      companyNameEn: formNameEn,
      companyLogoUrl: finalLogo,
      officialStampUrl: finalStamp,
      companyPhone: formPhone,
      companyEmail: formEmail,
      officialAddressAr: formAddrAr,
      officialAddressEn: formAddrEn,
      commercialRegistration: formCR,
      taxNumber: formTax,
      companyWebsite: formWebsite,
      managerNameAr: formMgrAr,
      managerNameEn: formMgrEn,
      managerSignature: formSig,
      reportTemplateType: formTemplate
    });

    setToastDone(true);
    setTimeout(() => setToastDone(false), 3000);
  };

  const swapBrandingStyles = (logoEmoji: string, stampEmoji: string) => {
    setFormLogo(logoEmoji);
    setFormStamp(stampEmoji);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6 max-w-4xl mx-auto">
      
      {/* Toast Alert */}
      {toastDone && (
        <div className={`fixed bottom-5 ${isRtl ? 'left-5' : 'right-5'} z-50 bg-[#040957] text-white p-3.5 rounded-xl shadow-2xl flex items-center gap-2 border border-blue-400`}>
          <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
          <span className="text-xs font-bold font-sans">{t.settingsSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-150 pb-4 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-black text-[#040957] font-sans flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0080FF]" />
            {t.companySettingsTitle}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {isRtl ? 'إدارة الهوية المرئية، التوقيع الموجه لمدير العمليات، والختم الرسمي للأوراق الإنشائية' : 'Configure official corporate letterheads, VP signatures, stamps, and logos'}
          </p>
        </div>
        
        {/* Permission Badge */}
        <span className={`text-[9px] px-2.5 py-1 rounded-full font-black ${isReadOnly ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-[#0080FF]'}`}>
          {isReadOnly ? (isRtl ? 'قراءة فقط' : 'Viewer Protection') : (isRtl ? 'صلاحية كاملة لمشعل' : 'Super Admin Mode')}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Basic Brand Logos presets section */}
        <div className="bg-[#F1F1F1]/50 p-4 rounded-xl border border-gray-100 space-y-3">
          <label className="block text-xs font-bold text-[#040957]">{isRtl ? 'قوالب الهوية والختم الافتراضي' : 'Preset Brand Seals'}</label>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => swapBrandingStyles('🏗️', '💮')}
              className="bg-white hover:bg-gray-100 border border-gray-200 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition text-gray-700"
            >
              <span>🏛️ Classic Block stamp (💮)</span>
            </button>
            <button 
              type="button" 
              onClick={() => swapBrandingStyles('🏢', '🔱')}
              className="bg-white hover:bg-gray-100 border border-gray-200 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition text-gray-700"
            >
              <span>🏙️ Neom Skyline badge (🔱)</span>
            </button>
          </div>
        </div>

        {/* Company Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">{t.companyNameAr} *</label>
            <input 
              type="text" 
              value={formNameAr}
              onChange={(e) => setFormNameAr(e.target.value)}
              disabled={isReadOnly}
              required
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs bg-gray-50 focus:bg-white transition"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">{t.companyNameEn} *</label>
            <input 
              type="text" 
              value={formNameEn}
              onChange={(e) => setFormNameEn(e.target.value)}
              disabled={isReadOnly}
              required
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs bg-gray-50 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-gray-100 pb-6">
          {/* Company Logo section */}
          <div className="space-y-2.5">
            <label className="block text-xs font-black text-[#040957]">
              {isRtl ? 'شعار الشركة المعتمد' : 'Company Logo / Emblem'}
            </label>
            
            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-150">
              {/* Preview Unit */}
              <div className="flex items-center justify-center shrink-0">
                {formLogo && (formLogo.startsWith('data:') || formLogo.startsWith('http')) ? (
                  <img src={formLogo} alt="Logo Preview" className="w-14 h-auto max-h-14 object-contain rounded-lg shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-14 h-14 bg-[#040957] text-white flex items-center justify-center rounded-xl text-3xl font-bold shadow-md overflow-hidden relative">
                    <span className="text-2xl">{formLogo || '🏢'}</span>
                  </div>
                )}
              </div>

              {/* Upload & Text Configuration */}
              <div className="flex-1 space-y-1">
                <div className="flex gap-2">
                  <label className={`cursor-pointer ${isReadOnly ? 'opacity-50 pointer-events-none' : ''} bg-white hover:bg-gray-100 text-[#040957] border border-gray-200 text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-2xs`}>
                    <Upload className="w-3.5 h-3.5 text-[#0080FF]" />
                    <span>{isRtl ? 'رفع صورة الشعار' : 'Upload Image'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      disabled={isReadOnly}
                      onChange={handleLogoUpload}
                      className="hidden" 
                    />
                  </label>
                  {!isReadOnly && formLogo && (
                    <button 
                      type="button" 
                      onClick={() => setFormLogo('')}
                      className="bg-red-50 text-red-500 py-1.5 px-3 rounded-xl text-xs font-bold hover:bg-red-100 transition"
                      title={isRtl ? 'حذف الشعار' : 'Delete Logo'}
                    >
                      {isRtl ? 'حذف' : 'Clear'}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  {isRtl ? 'صيغ الصور: PNG, JPG ومقاس مربع مفضل.' : 'Allowed options: png, jpeg, webp or emoji tags.'}
                </p>
              </div>
            </div>

            {/* Backup text input / Emoji selector */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500">
                {isRtl ? 'أو أدخل رمز تعبيري (Emoji) أو رابط مباشر:' : 'Or enter inline emoji / manual image link URL:'}
              </label>
              <input 
                type="text" 
                value={formLogo}
                onChange={(e) => setFormLogo(e.target.value)}
                disabled={isReadOnly}
                placeholder="e.g. 🏗️ or https://example.com/logo.png"
                className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono bg-white focus:bg-white transition"
              />
            </div>
          </div>

          {/* Official Stamp section */}
          <div className="space-y-2.5">
            <label className="block text-xs font-black text-[#040957]">
              {isRtl ? 'الختم الرسمي المعتمد للمطبوعات' : 'Official Stamps / Corporate Seal'}
            </label>

            <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-150">
              {/* Preview Unit */}
              <div className="w-14 h-14 bg-white border border-gray-200 text-[#040957] flex items-center justify-center rounded-full text-3xl font-bold shadow-xs shrink-0 overflow-hidden relative">
                {formStamp && (formStamp.startsWith('data:') || formStamp.startsWith('http')) ? (
                  <img src={formStamp} alt="Stamp Preview" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-2xl">{formStamp || '💮'}</span>
                )}
              </div>

              {/* Upload & Text Configuration */}
              <div className="flex-1 space-y-1">
                <div className="flex gap-2">
                  <label className={`cursor-pointer ${isReadOnly ? 'opacity-50 pointer-events-none' : ''} bg-white hover:bg-gray-100 text-[#040957] border border-gray-200 text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-2xs`}>
                    <Upload className="w-3.5 h-3.5 text-[#0080FF]" />
                    <span>{isRtl ? 'رفع صورة الختم' : 'Upload Stamp'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      disabled={isReadOnly}
                      onChange={handleStampUpload}
                      className="hidden" 
                    />
                  </label>
                  {!isReadOnly && formStamp && (
                    <button 
                      type="button" 
                      onClick={() => setFormStamp('')}
                      className="bg-red-50 text-red-500 py-1.5 px-3 rounded-xl text-xs font-bold hover:bg-red-100 transition"
                      title={isRtl ? 'حذف الختم' : 'Delete Stamp'}
                    >
                      {isRtl ? 'حذف' : 'Clear'}
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  {isRtl ? 'ينصح بخلفية شفافة دائرية.' : 'Circular png with transparent background is best.'}
                </p>
              </div>
            </div>

            {/* Backup text input */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-500">
                {isRtl ? 'أو أدخل رمز تعبيري (Emoji) أو رابط مباشر لختم:' : 'Or enter inline emoji / manual stamp link URL:'}
              </label>
              <input 
                type="text" 
                value={formStamp}
                onChange={(e) => setFormStamp(e.target.value)}
                disabled={isReadOnly}
                placeholder="e.g. 💮 or https://example.com/stamp.png"
                className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono bg-white focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Comm contact details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <span>{isRtl ? 'هاتف التواصل الرسمي' : 'Official Telephone'}</span>
            </label>
            <input 
              type="text" 
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span>{isRtl ? 'بريد المراسلات' : 'Official Communications Email'}</span>
            </label>
            <input 
              type="email" 
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono"
            />
          </div>
        </div>

        {/* Physical Office Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>{isRtl ? 'العنوان الوطني المقر (عربي)' : 'Registered Address (Ar)'}</span>
            </label>
            <textarea 
              value={formAddrAr}
              onChange={(e) => setFormAddrAr(e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl p-2 text-xs h-16"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>{isRtl ? 'العنوان الوطني المقر (إنجليزي)' : 'Registered Address (En)'}</span>
            </label>
            <textarea 
              value={formAddrEn}
              onChange={(e) => setFormAddrEn(e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl p-2 text-xs h-16"
            />
          </div>
        </div>

        {/* Commercial Registration & Tax Number & Website */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-gray-400" />
              <span>{isRtl ? 'رقم السجل التجاري' : 'Commercial Registration No.'}</span>
            </label>
            <input 
              type="text" 
              value={formCR}
              onChange={(e) => setFormCR(e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono"
              placeholder={isRtl ? 'رقم السجل التجاري' : 'CR Number'}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-gray-400" />
              <span>{isRtl ? 'الرقم الضريبي (VAT)' : 'Tax Number (VAT)'}</span>
            </label>
            <input 
              type="text" 
              value={formTax}
              onChange={(e) => setFormTax(e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono"
              placeholder={isRtl ? 'الرقم الضريبي' : 'Tax Number'}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <span>{isRtl ? 'الموقع الإلكتروني' : 'Company Website'}</span>
            </label>
            <input 
              type="text" 
              value={formWebsite}
              onChange={(e) => setFormWebsite(e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono"
              placeholder="www.company.com"
            />
          </div>
        </div>

        {/* Manager/VP details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">{isRtl ? 'مدير العمليات المفوض (Ar)' : 'Appointed VP Operations (Ar)'}</label>
            <input 
              type="text" 
              value={formMgrAr}
              onChange={(e) => setFormMgrAr(e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">{isRtl ? 'مدير العمليات المفوض (En)' : 'Appointed VP Operations (En)'}</label>
            <input 
              type="text" 
              value={formMgrEn}
              onChange={(e) => setFormMgrEn(e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">{isRtl ? 'رمز التوقيع الرسمي' : 'VP System Authorizer Token'}</label>
            <input 
              type="text" 
              value={formSig}
              onChange={(e) => setFormSig(e.target.value)}
              disabled={isReadOnly}
              className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-mono font-bold"
            />
          </div>
        </div>

        {/* Report Theme Template selector */}
        <div className="space-y-1.5 border-t border-gray-100 pt-4">
          <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
            <FileText className="w-4 h-4 text-gray-400" />
            <span>{t.reportTemplate}</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Standard', 'Executive', 'Minimalist'].map((theme) => {
              const active = formTemplate === theme;
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => { if (!isReadOnly) setFormTemplate(theme as any); }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition ${active ? 'bg-[#040957] border-[#040957] text-white shadow-xs' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                  {theme} Style
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer save */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-150">
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => {
                openConfirm(
                  isRtl ? 'استعادة الافتراضي' : 'Reset Defaults',
                  isRtl ? 'هل تريد استعادة الإعدادات الافتراضية للهوية؟' : 'Are you sure you want to revert to system default branding?',
                  () => {
                    setFormNameAr('مؤسسة المسار المتكامل للمقاولات');
                    setFormNameEn('Integral Path Contracting Ent.');
                    setFormLogo('🏗️');
                    setFormStamp('💮');
                  },
                  false
                );
              }}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isRtl ? 'استعادة الافتراضي' : 'Reset Defaults'}</span>
            </button>
          )}

          {isReadOnly ? (
            <span className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2 font-bold leading-tight flex items-center gap-1.5">
              ⚠️ {isRtl ? 'تعديل الهوية والختم محمي وموقوف لباقي طاقم الإشراف.' : 'Modifying official branding is locked for roles below Super Admin.'}
            </span>
          ) : (
            <button
              type="submit"
              className="bg-[#040957] text-white hover:bg-[#0080FF] font-black font-sans py-2.5 px-6 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{t.saveSettings}</span>
            </button>
          )}
        </div>

      </form>
    </div>
  );
}
