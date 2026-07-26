import React, { useState, useEffect } from 'react';
import { dbApi } from '../lib/api';
import { Shield, Key, Plus, Trash2, LogOut, Check, AlertCircle, Eye, EyeOff, Edit2 } from 'lucide-react';

interface Admin {
  id: string;
  idNumber: string;
  name: string;
  password?: string;
  createdAt?: string;
}

interface AdminPanelProps {
  lang: 'ar' | 'en';
  currentAdmin: { idNumber: string; name: string } | null;
  onAdminLogin: (admin: { idNumber: string; name: string }) => void;
  onAdminLogout: () => void;
  openConfirm?: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export default function AdminPanel({
  lang,
  currentAdmin,
  onAdminLogin,
  onAdminLogout,
  openConfirm
}: AdminPanelProps) {
  const isRtl = lang === 'ar';

  // Component States
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // New / Edit Admin Fields
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);

  const startEditing = (admin: Admin) => {
    setEditingAdminId(admin.id);
    setNewId(admin.idNumber);
    setNewName(admin.name);
    setNewPassword(admin.password || '');
    setAddError(null);
    setAddSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingAdminId(null);
    setNewId('');
    setNewName('');
    setNewPassword('');
    setAddError(null);
    setAddSuccess(null);
  };

  const [isLoading, setIsLoading] = useState(false);

  // Load admins from DB and seed default administrator if empty
  const fetchAndSeedAdmins = async () => {
    try {
      setIsLoading(true);
      const list = await dbApi.getAll<Admin>('admins');
      
      if (list.length === 0) {
        // Seed default admin
        const defaultAdmin: Admin = {
          id: 'admin-default',
          idNumber: '1001',
          name: isRtl ? 'أحمد خالد (مدير عام)' : 'Ahmed Khaled (Director)',
          password: 'password123',
          createdAt: new Date().toISOString()
        };
        await dbApi.save('admins', defaultAdmin);
        setAdmins([defaultAdmin]);
      } else {
        setAdmins(list);
      }
    } catch (error) {
      console.error('Failed to load admins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndSeedAdmins();
  }, [lang]);

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginId.trim() || !loginPassword.trim()) {
      setLoginError(
        isRtl 
          ? 'الرجاء إدخال رقم الهوية وكلمة المرور' 
          : 'Please enter both ID Number and Password'
      );
      return;
    }

    // Find admin matching credentials
    const found = admins.find(
      a => a.idNumber === loginId.trim() && a.password === loginPassword.trim()
    );

    if (found) {
      onAdminLogin({ idNumber: found.idNumber, name: found.name });
      setLoginId('');
      setLoginPassword('');
    } else {
      setLoginError(
        isRtl 
          ? 'رقم الهوية أو كلمة المرور المدخلة غير صحيحة' 
          : 'The ID Number or Password entered is incorrect'
      );
    }
  };

  // Handle Add / Edit Admin
  const handleAddAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    if (!newId.trim() || !newName.trim() || !newPassword.trim()) {
      setAddError(
        isRtl 
          ? 'يرجى تعبئة جميع الحقول المطلوبة' 
          : 'Please fill in all required fields'
      );
      return;
    }

    // Check if ID number already exists (excluding the one being edited)
    const duplicate = admins.some(a => a.idNumber === newId.trim() && a.id !== editingAdminId);
    if (duplicate) {
      setAddError(
        isRtl 
          ? 'رقم الهوية هذا مسجل بالفعل لمسؤول آخر' 
          : 'This ID Number is already registered for another admin'
      );
      return;
    }

    try {
      if (editingAdminId) {
        // Edit mode
        const existingAdmin = admins.find(a => a.id === editingAdminId);
        if (!existingAdmin) return;
        
        const updatedAdmin: Admin = {
          ...existingAdmin,
          idNumber: newId.trim(),
          name: newName.trim(),
          password: newPassword.trim(),
        };

        await dbApi.save('admins', updatedAdmin);
        setAdmins(prev => prev.map(a => a.id === editingAdminId ? updatedAdmin : a));
        
        setAddSuccess(
          isRtl 
            ? `تم تحديث بيانات المسؤول (${newName}) بنجاح!` 
            : `Administrator (${newName}) updated successfully!`
        );
        
        setTimeout(() => cancelEditing(), 1500); // Clear after a bit
      } else {
        // Add mode
        const adminData: Admin = {
          id: `admin-${Date.now()}`,
          idNumber: newId.trim(),
          name: newName.trim(),
          password: newPassword.trim(),
          createdAt: new Date().toISOString()
        };

        await dbApi.save('admins', adminData);
        setAdmins(prev => [...prev, adminData]);
        
        setAddSuccess(
          isRtl 
            ? `تم إضافة المسؤول (${newName}) بنجاح!` 
            : `Administrator (${newName}) added successfully!`
        );
        
        // Reset form fields
        setNewId('');
        setNewName('');
        setNewPassword('');
      }
    } catch (error) {
      console.error('Error saving admin:', error);
      setAddError(
        isRtl 
          ? 'فشل الاتصال بقاعدة البيانات لحفظ الحساب' 
          : 'Failed to connect to database to save the account'
      );
    }
  };

  // Handle Delete Admin
  const handleDeleteAdmin = async (id: string, adminName: string, idNumber: string) => {
    // Cannot delete themselves
    if (currentAdmin && currentAdmin.idNumber === idNumber) {
      if (openConfirm) {
        openConfirm(
          isRtl ? 'إجراء غير مسموح' : 'Action Not Allowed',
          isRtl 
            ? 'عذراً، لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول به' 
            : 'Sorry, you cannot delete your own account while logged in',
          () => {},
          false
        );
      } else {
        alert(
          isRtl 
            ? 'عذراً، لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول به' 
            : 'Sorry, you cannot delete your own account while logged in'
        );
      }
      return;
    }

    const confirmMsg = isRtl 
      ? `هل أنت متأكد من رغبتك في حذف المسؤول "${adminName}" نهائياً من النظام؟`
      : `Are you sure you want to permanently delete administrator "${adminName}"?`;

    const performDelete = async () => {
      try {
        await dbApi.delete('admins', id);
        setAdmins(prev => prev.filter(a => a.id !== id));
      } catch (error) {
        console.error('Failed to delete admin:', error);
      }
    };

    if (openConfirm) {
      openConfirm(
        isRtl ? 'حذف المسؤول نهائياً؟' : 'Permanently Delete Administrator?',
        confirmMsg,
        performDelete,
        true
      );
    }
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* 1. NOT LOGGED IN VIEW: Elegant Secure Login Card */}
      {!currentAdmin ? (
        <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-[#040957] px-6 py-8 text-center text-white relative">
            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              {isRtl ? 'نظام مشفّر' : 'AES MAPPED'}
            </div>
            
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-3 border border-white/20">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            
            <h2 className="text-xl font-bold font-sans">
              {isRtl ? 'تسجيل دخول المسؤول المعتمد' : 'Corporate Administrator Login'}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-[280px] mx-auto">
              {isRtl 
                ? 'الرجاء إدخال رقم الهوية وكلمة المرور الخاصة بالإدارة للوصول المباشر' 
                : 'Enter your system-issued ID number and password to gain full access'}
            </p>
          </div>

          {/* Form Area */}
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-5">
            {loginError && (
              <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Field: ID Number */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">
                {isRtl ? 'رقم هوية المسؤول المعتمد' : 'Administrator ID Number'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={isRtl ? 'مثال: 1001' : 'e.g., 1001'}
                  className="w-full pl-3 pr-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0080FF] bg-gray-50/50 text-xs font-bold"
                />
              </div>
            </div>

            {/* Field: Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">
                {isRtl ? 'كلمة المرور السرية' : 'Security Password'}
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0080FF] bg-gray-50/50 text-xs font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0080FF] hover:bg-[#0080FF]/95 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition active:scale-[0.98]"
            >
              {isLoading ? (isRtl ? 'جاري التحقق...' : 'VERIFYING...') : (isRtl ? 'متابعة الدخول الأمن' : 'Access System Gateway')}
            </button>

            {/* Default credentials note */}
            <div className="border-t border-dashed border-gray-150 pt-4 text-center">
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 inline-block font-bold">
                💡 {isRtl ? 'بيانات الدخول الافتراضية للتجربة:' : 'Sandbox Demo Credentials:'}{' '}
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200 ml-1">
                  ID: 1001
                </span>
                <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200 ml-1">
                  PW: password123
                </span>
              </span>
            </div>
          </form>
        </div>
      ) : (
        
        // 2. LOGGED IN VIEW: Admin Panel Dashboard
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left / Top Side: Welcome and Add Admin Form */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Session Welcome Card */}
            <div className="bg-gradient-to-br from-[#040957] to-[#0d1680] text-white p-6 rounded-2xl shadow-sm border border-slate-800 space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <button
                  onClick={onAdminLogout}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'تسجيل الخروج' : 'Log Out'}</span>
                </button>
              </div>

              <div>
                <p className="text-[10px] text-slate-300 font-extrabold uppercase tracking-widest">
                  {isRtl ? 'جلسة مسؤول معتمدة نشطة' : 'ACTIVE EXECUTIVE SESSION'}
                </p>
                <h3 className="text-lg font-black mt-1 font-sans">
                  {isRtl ? `مرحباً بالمسؤول: ${currentAdmin.name}` : `Welcome, Admin: ${currentAdmin.name}`}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 font-mono">
                  {isRtl ? `رقم هوية الدخول: ${currentAdmin.idNumber}` : `System ID: ${currentAdmin.idNumber}`}
                </p>
              </div>

              <div className="text-[10px] text-emerald-400 bg-white/5 p-2.5 rounded-xl border border-white/5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{isRtl ? 'لديك صلاحية إضافة وإجراء تعديلات على قائمة الإدارة' : 'You possess administrative rights to modify user/admin registers.'}</span>
              </div>
            </div>

            {/* Add/Edit Administrator Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black text-[#040957] font-sans flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                      {editingAdminId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                    {editingAdminId 
                      ? (isRtl ? 'تعديل بيانات المسؤول' : 'Edit Administrator')
                      : (isRtl ? 'إضافة مسؤول جديد للنظام' : 'Create System Administrator')}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {editingAdminId 
                      ? (isRtl ? 'قم بتحديث بيانات الدخول والصلاحية للمسؤول' : 'Update the credentials and authority for the administrator')
                      : (isRtl ? 'قم بإدخال بيانات المسؤول الجديد لمنحه حق الدخول والإشراف العام' : 'Provide ID number, name, and password credentials to grant administrative authority')}
                  </p>
                </div>
                {editingAdminId && (
                  <button 
                    onClick={cancelEditing} 
                    type="button" 
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold uppercase cursor-pointer transition"
                  >
                    {isRtl ? 'إلغاء التعديل' : 'Cancel'}
                  </button>
                )}
              </div>

              {addError && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-start gap-2 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{addError}</span>
                </div>
              )}

              {addSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2 text-emerald-800 text-xs font-semibold">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{addSuccess}</span>
                </div>
              )}

              <form onSubmit={handleAddAdminSubmit} className="space-y-4">
                
                {/* ID Number Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500 block">
                    {isRtl ? 'رقم هوية المسؤول الجديد (رقم فريد)' : 'Admin ID Number (Unique)'}
                  </label>
                  <input
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder={isRtl ? 'مثال: 1002' : 'e.g., 1002'}
                    className="w-full pl-3 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0080FF] bg-gray-50/50 text-xs font-bold"
                  />
                </div>

                {/* Name Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500 block">
                    {isRtl ? 'اسم المسؤول بالكامل' : 'Admin Full Name'}
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={isRtl ? 'مثال: محمد عبدالرحمن' : 'e.g., Mohammed Abdelrahman'}
                    className="w-full pl-3 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0080FF] bg-gray-50/50 text-xs font-bold"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-500 block">
                    {isRtl ? 'كلمة المرور الأمنية' : 'Security Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#0080FF] bg-gray-50/50 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#040957] hover:bg-[#0d1680] text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {editingAdminId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>
                    {editingAdminId 
                      ? (isRtl ? 'حفظ التعديلات' : 'Save Changes') 
                      : (isRtl ? 'إدراج مسؤول معتمد' : 'Add Executive Admin')}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Right / Bottom Side: Registered Administrators list */}
          <div className="lg:col-span-7">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
              <div>
                <h3 className="text-sm font-black text-[#040957] font-sans">
                  {isRtl ? 'قائمة المسؤولين المسجلين' : 'Authorized Administrators Ledger'}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {isRtl 
                    ? 'استعراض الحسابات التي تملك حق تعديل قاعدة البيانات التشغيلية والتنظيمية' 
                    : 'Overview of all administrative accounts with full privileges and credentials'}
                </p>
              </div>

              {/* Table ledger list */}
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-150">
                
                {admins.map((adm) => (
                  <div 
                    key={adm.id} 
                    className="p-4 flex justify-between items-center bg-white hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="space-y-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#040957] font-sans">
                          {adm.name}
                        </span>
                        <span className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                          {isRtl ? 'مسؤول معتمد' : 'EXEC ADMIN'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
                        <span className="font-mono font-bold">
                          {isRtl ? `الهوية: ` : `ID: `}
                          <span className="text-gray-600">{adm.idNumber}</span>
                        </span>
                        {adm.createdAt && (
                          <span>
                            {isRtl ? 'تاريخ الإدراج: ' : 'Registered: '}
                            {new Date(adm.createdAt).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Edit & Delete action */}
                    <div className="flex items-center gap-2">
                      {currentAdmin.idNumber === adm.idNumber ? (
                        <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {isRtl ? 'أنت الحالي' : 'Active Session'}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(adm)}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded-xl border border-blue-100 transition active:scale-95 cursor-pointer"
                            title={isRtl ? 'تعديل البيانات' : 'Edit details'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(adm.id, adm.name, adm.idNumber)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl border border-rose-100 transition active:scale-95 cursor-pointer"
                            title={isRtl ? 'حذف من النظام' : 'Remove access'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
