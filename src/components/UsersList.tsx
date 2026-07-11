/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Edit, 
  CheckCircle, 
  Search, 
  Unlock, 
  Mail, 
  Award,
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import { User, UserRole } from '../types';

interface UsersListProps {
  lang: 'ar' | 'en';
  t: any;
  users: User[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (id: string, updated: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
  onSwitchUser: (user: User) => void;
  openConfirm: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export default function UsersList({
  lang,
  t,
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchUser,
  openConfirm
}: UsersListProps) {
  const isRtl = lang === 'ar';

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBadgeNumber, setFormBadgeNumber] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('Viewer');

  const rolesList: UserRole[] = ['Super Admin', 'Project Manager', 'Site Supervisor', 'Warehouse Manager', 'Viewer'];

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Project Manager':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Site Supervisor':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Warehouse Manager':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleTranslation = (role: UserRole) => {
    if (!isRtl) return role;
    switch (role) {
      case 'Super Admin': return 'مدير النظام الخارق (Super Admin)';
      case 'Project Manager': return 'مدير المشاريع (Project Manager)';
      case 'Site Supervisor': return 'مراقب الموقع الميداني (Site Supervisor)';
      case 'Warehouse Manager': return 'أمين المستودع (Warehouse Manager)';
      case 'Viewer': return 'مستعرض فقط (Viewer)';
    }
  };

  const getRoleDescription = (role: UserRole) => {
    if (isRtl) {
      switch (role) {
        case 'Super Admin': return 'صلاحيات كاملة وغير مقيدة لتعديل المشاريع والأنشطة والمستودعات وتعديل إعدادات الهوية والترويسة والختم الرسمي للمؤسسة.';
        case 'Project Manager': return 'صلاحية كاملة لإضافة وحذف وتعديل المشاريع وبنود العمل والأنشطة والآليات، لكن دون القدرة على تعديل إعدادات هوية المؤسسة.';
        case 'Site Supervisor': return 'صلاحية رصد تحديثات الإنتاج اليومية من الميدان، متابعة التقدم وإضافة الأنشطة المخصصة بالتنفيذ.';
        case 'Warehouse Manager': return 'صلاحية حصرية لإدارة المواد والمستودع، وتسجيل الكميات التحت تصرف، وعمال تشغيل المعدات.';
        case 'Viewer': return 'عرض ورصد التقارير والبيانات الإحصائية فقط دون أي صلاحية للتعديل أو الإضافة أو الحذف على النظام.';
      }
    } else {
      switch (role) {
        case 'Super Admin': return 'Full administrative control. Can configure projects, work items, operational materials, and customize branding.';
        case 'Project Manager': return 'Complete project orchestration. Create or update projects and work schedules. Cannot adjust core identity stamp.';
        case 'Site Supervisor': return 'Field inspector rights. Report daily output figures, execute workflow updates and supervise work locations.';
        case 'Warehouse Manager': return 'Logistics lead. Authoritative permission over material inventory, equipment manifests, and operational stock.';
        case 'Viewer': return 'Restricted read-only capabilities. View live analytics panels and download printed reports.';
      }
    }
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormBadgeNumber(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormRole('Viewer');
    setEditingUser(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormBadgeNumber(user.badgeNumber);
    setFormRole(user.role);
    setIsAddOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;

    if (editingUser) {
      onUpdateUser(editingUser.id, {
        name: formName,
        email: formEmail,
        badgeNumber: formBadgeNumber,
        role: formRole
      });
    } else {
      const newUser: User = {
        id: `usr-${Date.now()}`,
        name: formName,
        email: formEmail,
        badgeNumber: formBadgeNumber,
        role: formRole
      };
      onAddUser(newUser);
    }
    setIsAddOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (id === currentUser.id) {
      alert(isRtl ? 'لا يمكنك حذف نفسك بينما أنت مسجل الدخول للحساب حالياً!' : 'You cannot erase your active credential card!');
      return;
    }
    openConfirm(
      isRtl ? 'حذف المستخدم نهائياً؟' : 'Permanently Delete User?',
      isRtl 
        ? `هل أنت متأكد من سحب صلاحية وصول الموظف "${name}" وإزالته بالكامل من قواعد البيانات الأمنية للمؤسسة؟` 
        : `Are you sure you want to revoke credentials and completely delete "${name}" from the system records?`,
      () => {
        onDeleteUser(id);
      }
    );
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header Badge Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0080FF] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#040957] font-sans">
                {isRtl ? 'إدارة المستخدمين والأذونات' : 'Users & Access Permissions'}
              </h2>
              <p className="text-xs text-gray-400 font-bold leading-normal">
                {isRtl ? 'إعداد وصياغة الهويات وتخصيص صلاحيات العمل المشتركة بالمشروع' : 'Configure team credentials, staff access levels, and role-based actions'}
              </p>
            </div>
          </div>
        </div>

        {currentUser.role === 'Super Admin' && (
          <button
            onClick={handleOpenAdd}
            className="bg-[#0080FF] hover:bg-[#040957] text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isRtl ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Registry List Module (2cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
            
            {/* Filter Search */}
            <div className="p-4 border-b border-gray-150 flex gap-2">
              <div className="relative flex-1">
                <Search className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'} w-4 h-4 text-gray-400`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isRtl ? 'ابحث باسم الموظف، البريد الإلكتروني، أو الصلاحية...' : 'Search by name, email, badge, or permission level...'}
                  className={`w-full ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none transition`}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-150 text-gray-500 font-bold">
                  <tr>
                    <th className="p-3.5 text-right font-bold">{isRtl ? 'الموظف / الرقم الوظيفي' : 'Employee / Badge ID'}</th>
                    <th className="p-3.5 text-right font-bold">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</th>
                    <th className="p-3.5 text-right font-bold">{isRtl ? 'مستوى الصلاحية' : 'Permission Level'}</th>
                    <th className="p-3.5 text-center font-bold">{isRtl ? 'خيارات' : 'Credentials'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-400 font-bold">
                        {isRtl ? 'لا يوجد مستخدمون مطابقون لمعايير البحث.' : 'No matched personnel found in registry.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
                      const isActive = user.id === currentUser.id;
                      return (
                        <tr 
                          key={user.id} 
                          className={`hover:bg-gray-50/50 transition-colors ${isActive ? 'bg-blue-50/20' : ''}`}
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-extrabold text-[#040957] text-[11px] shrink-0">
                                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-black text-[#040957] flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                  {isActive && (
                                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-250 shrink-0">
                                      {isRtl ? 'أنت' : 'You'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono font-bold mt-0.5">{user.badgeNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1 text-gray-500 font-semibold font-mono">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <span>{user.email}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-block border text-[10px] px-2 py-0.5 rounded-md font-bold ${getRoleBadgeColor(user.role)}`}>
                              {getRoleTranslation(user.role)}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              
                              {/* Credentials sandbox switcher */}
                              <button
                                onClick={() => {
                                  onSwitchUser(user);
                                }}
                                className={`p-1.5 font-bold rounded-lg text-[10px] transition flex items-center gap-1 ${
                                  isActive 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-[#040957] hover:text-[#0080FF]'
                                }`}
                                title={isRtl ? 'تسجيل دخول اختباري بهذه الهوية' : 'Instantly switch/log-in as this user'}
                              >
                                {isActive ? (
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5 text-gray-500" />
                                )}
                                <span className="hidden sm:inline font-bold">
                                  {isActive ? (isRtl ? 'نشط حالياً' : 'Active') : (isRtl ? 'محاكاة الدخول' : 'Assume Identity')}
                                </span>
                              </button>

                              {/* Edit & Delete (Only Super Admin can edit other users) */}
                              {currentUser.role === 'Super Admin' && (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(user)}
                                    className="text-gray-400 hover:text-[#0080FF] p-1.5 rounded-lg hover:bg-gray-150 transition"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    disabled={isActive}
                                    onClick={() => handleDelete(user.id, user.name)}
                                    className={`p-1.5 rounded-lg transition ${
                                      isActive 
                                        ? 'text-gray-300 cursor-not-allowed opacity-30' 
                                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                    }`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Roles & Permissions Explanation Matrix (1col) */}
        <div className="space-y-4">
          <div className="bg-[#040957] rounded-3xl p-6 text-white space-y-4 shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-12 translate-y-12">
              <Shield className="w-64 h-64" />
            </div>
            
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0080FF]" />
              <h3 className="text-sm font-black tracking-wide uppercase">
                {isRtl ? 'مصفوفة التحكم بالصلاحيات (RBAC)' : 'Access Control Matrix'}
              </h3>
            </div>
            
            <p className="text-[11px] text-blue-200 leading-relaxed font-sans">
              {isRtl 
                ? 'يعتمد النظام منهجية صارمة للتحكم في الصلاحيات المبنية على الأدوار. يتم تقييد واجهات العمل لضمان سلامة وحوكمة البيانات الميدانية والهوية للمؤسسة.'
                : 'The platform enforces strict role-based parameters. Functional access limits are synchronized based on the credentials below to guarantee strict audit compliance.'}
            </p>
          </div>

          <div className="space-y-3">
            {rolesList.map((role) => (
              <div 
                key={role}
                className={`bg-white p-4 rounded-2xl border border-gray-250 space-y-2 hover:shadow-xs transition ${
                  currentUser.role === role ? 'ring-2 ring-[#0080FF] bg-blue-50/5' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                      role === 'Super Admin' ? 'bg-red-500' :
                      role === 'Project Manager' ? 'bg-blue-500' :
                      role === 'Site Supervisor' ? 'bg-emerald-500' :
                      role === 'Warehouse Manager' ? 'bg-amber-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-xs font-black text-[#040957]">{getRoleTranslation(role)}</span>
                  </div>
                  {currentUser.role === role && (
                    <span className="text-[9px] bg-[#0080FF]/10 text-[#0080FF] font-black px-2 py-0.5 rounded-full uppercase">
                      {isRtl ? 'حسابك النشط' : 'Current'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 leading-normal pl-4 font-sans font-medium">
                  {getRoleDescription(role)}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Slide-over or Popup Edit/Add Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <div className="p-5 border-b border-gray-150 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0080FF] flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-[#040957] font-sans">
                    {editingUser 
                      ? (isRtl ? 'تعديل بيانات المستخدم الحالي' : 'Adjust Member Account')
                      : (isRtl ? 'إدراج مستخدم جديد للمنظومة' : 'Create New Personnel Credential')
                    }
                  </h3>
                </div>
                <button 
                  onClick={() => setIsAddOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                
                {/* Employee Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">
                    {isRtl ? 'اسم الموظف الكامل' : 'Employee Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={isRtl ? 'مثال: فيصل بن محمد العتيبي' : 'e.g. Faisal Al-Otaibi'}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none transition leading-tight font-sans"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">
                    {isRtl ? 'البريد الإلكتروني' : 'Official Corporate Email'}
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="name@sudairicorp.com"
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-0 transition leading-tight font-mono"
                  />
                </div>

                {/* Badge ID Card & Role */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 font-sans">
                      {isRtl ? 'الرقم الوظيفي / الكود' : 'Badge Number'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formBadgeNumber}
                      onChange={(e) => setFormBadgeNumber(e.target.value)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none transition font-semibold font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 font-sans">
                      {isRtl ? 'مستوى الصلاحية' : 'Access Role'}
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none transition font-bold"
                    >
                      {rolesList.map((r) => (
                        <option key={r} value={r}>
                          {isRtl ? getRoleTranslation(r) : r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Note about constraints */}
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex gap-2">
                  <Info className="w-4 h-4 text-[#0080FF] shrink-0" />
                  <p className="text-[10px] text-gray-500 leading-normal font-sans">
                    {isRtl 
                      ? 'يمكنك التغيير أو محاكاة الدخول والتبديل السريع بين هذه الحسابات من خلال الضغط على زر "محاكاة الدخول" في جدول المستخدمين الرئيسي لتطبيق صلاحيات الدور فعلياً.'
                      : 'You can test role-specific visual interfaces and action constraints by using the "Assume Identity" switch on any listed employee accounts.'}
                  </p>
                </div>

                {/* Footer Controls */}
                <div className="flex gap-2.5 pt-2 border-t border-gray-150 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-95"
                  >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="bg-[#0080FF] hover:bg-[#040957] text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-md active:scale-95"
                  >
                    {isRtl ? 'حفظ البيانات' : 'Commit Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
