import React, { useState } from 'react';
import { dbApi } from '../lib/api';
import { Key, Shield, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import bgImage from '../assets/images/construction_login_bg_1785108867490.jpg';

interface MainLoginProps {
  lang: 'ar' | 'en';
  onLogin: (admin: { idNumber: string; name: string }) => void;
  settings: any;
}

export default function MainLogin({ lang, onLogin, settings }: MainLoginProps) {
  const isRtl = lang === 'ar';
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginId.trim() || !loginPassword.trim()) {
      setLoginError(isRtl ? 'الرجاء إدخال رقم الهوية وكلمة المرور' : 'Please enter both ID Number and Password');
      return;
    }

    setIsAuthenticating(true);
    try {
      const list = await dbApi.getAll<any>('admins');
      const found = list.find(a => a.idNumber === loginId.trim() && a.password === loginPassword.trim());

      if (found) {
        onLogin({ idNumber: found.idNumber, name: found.name });
      } else {
        setLoginError(isRtl ? 'رقم الهوية أو كلمة المرور غير صحيحة' : 'Incorrect ID Number or Password');
      }
    } catch (err) {
      console.error(err);
      setLoginError(isRtl ? 'حدث خطأ أثناء تسجيل الدخول' : 'An error occurred during login');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center p-4 relative ${isRtl ? 'rtl' : 'ltr'}`} 
      style={{ 
        fontFamily: isRtl ? 'Cairo, sans-serif' : 'Inter, sans-serif', 
        direction: isRtl ? 'rtl' : 'ltr',
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-[#040957]/70 backdrop-blur-[2px] z-0"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-md p-8 border border-white/20 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center mb-4">
            {settings?.companyLogoUrl && (settings.companyLogoUrl.startsWith('data:') || settings.companyLogoUrl.startsWith('http')) ? (
              <img src={settings.companyLogoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-xl" />
            ) : (
              <div className="w-16 h-16 bg-[#040957] rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-black text-[#040957] mb-2 tracking-tight">
            {isRtl ? 'تسجيل الدخول للنظام الأساسي' : 'Main System Login'}
          </h2>
          <p className="text-sm text-gray-500 font-medium">
            {isRtl ? 'الرجاء إدخال بيانات المسؤول الخاصة بك' : 'Please enter your administrator credentials'}
          </p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          {loginError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2">
              <span className="shrink-0 text-lg">⚠️</span>
              {loginError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              {isRtl ? 'رقم الهوية' : 'ID Number'}
            </label>
            <input
              type="text"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#040957] transition"
              placeholder={isRtl ? 'أدخل رقم الهوية...' : 'Enter ID number...'}
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
              {isRtl ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#040957] transition"
                placeholder={isRtl ? 'أدخل كلمة المرور...' : 'Enter password...'}
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'} p-1.5 text-gray-400 hover:text-[#040957] transition cursor-pointer`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isAuthenticating}
            className="w-full bg-[#040957] hover:bg-[#0d1680] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4 cursor-pointer"
          >
            {isAuthenticating ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Key className="w-4 h-4" />
                <span>{isRtl ? 'دخول للنظام' : 'Access System'}</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
