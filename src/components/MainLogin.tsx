import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { dbApi } from '../lib/api';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { Key, Shield, Eye, EyeOff, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
// @ts-ignore
import bgImage from '../assets/images/construction_login_bg_1785108867490.jpg';

interface MainLoginProps {
  lang: 'ar' | 'en';
  onLogin: (admin: { idNumber: string; name: string }) => void;
  settings: any;
  onOpenRegister?: () => void;
  onOpenLanding?: () => void;
  initialMode?: 'login' | 'forgot_password';
}

export default function MainLogin({
  lang,
  onLogin,
  settings,
  onOpenRegister,
  onOpenLanding,
  initialMode = 'login'
}: MainLoginProps) {
  const isRtl = lang === 'ar';
  const [viewMode, setViewMode] = useState<'login' | 'forgot_password'>(initialMode);
  const [loginId, setLoginId] = useState('Kalifah13579@hotmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const linkUserProfileAndProceed = async (fbUser: any, inputIdOrEmail: string) => {
    let userDoc: any = null;
    try {
      userDoc = await dbApi.getById('users', fbUser.uid);
    } catch (e) {
      console.warn("User doc lookup note:", e);
    }

    if (userDoc && userDoc.status && userDoc.status !== 'ACTIVE') {
      setLoginError(isRtl ? 'هذا الحساب غير نشط أو معلق. يرجى التواصل مع الإدارة.' : 'This account is inactive or suspended. Please contact administration.');
      await auth.signOut();
      return;
    }

    const resolvedName = userDoc?.name || fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'User');

    onLogin({
      idNumber: userDoc?.badgeNumber || fbUser.uid,
      name: resolvedName
    });
  };

  const handleGoogleSignIn = async () => {
    setLoginError(null);
    setErrorDetails(null);
    setIsAuthenticating(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await linkUserProfileAndProceed(result.user, result.user.email || '');
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setLoginError(isRtl ? 'تم إغلاق نافذة تسجيل الدخول' : 'Sign-in popup was closed');
      } else {
        setLoginError(err.message || 'Google Sign-in failed');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setErrorDetails(null);

    const inputId = loginId.trim();
    const inputPassword = loginPassword.trim();

    if (!inputId || !inputPassword) {
      setLoginError(isRtl ? 'الرجاء إدخال البريد الإلكتروني أو رقم الهوية وكلمة المرور' : 'Please enter Email / ID Number and Password');
      return;
    }

    setIsAuthenticating(true);
    try {
      const emailToUse = inputId.includes('@') ? inputId : `${inputId}@sudairicorp.com`;

      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, inputPassword);
      await linkUserProfileAndProceed(userCredential.user, emailToUse);
    } catch (err: any) {
      console.warn('Firebase Auth note:', err?.code || err);
      if (err.code === 'auth/operation-not-allowed') {
        setLoginError(
          isRtl 
            ? 'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل حالياً في مشروع Firebase.'
            : 'Email/Password authentication provider is currently disabled in Firebase.'
        );
        setErrorDetails(
          isRtl
            ? 'لتفعيل تسجيل الدخول بالبريد وكلمة المرور:\n1. افتح Firebase Console > Authentication > Sign-in method\n2. انقر على Email/Password ثم فعّل الخيار الأول (Enable) واضغط حفظ (Save).\n\nأو يمكنك تسجيل الدخول فوراً عبر زر Google المتاح أدناه.'
            : 'To enable Email/Password:\n1. Open Firebase Console > Authentication > Sign-in method\n2. Click "Email/Password", toggle "Enable" to ON, and click "Save".\n\nAlternatively, you can sign in directly using Google below.'
        );
      } else if (
        err.code === 'auth/invalid-credential' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-login-credentials'
      ) {
        setLoginError(isRtl ? 'البريد الإلكتروني / رقم الهوية أو كلمة المرور غير صحيحة' : 'Incorrect Email/ID Number or Password');
      } else if (err.code === 'auth/too-many-requests') {
        setLoginError(isRtl ? 'تم حظر الحساب مؤقتاً لكثرة المحاولات، يرجى المحاولة لاحقاً' : 'Too many attempts. Please try again later.');
      } else if (err.code === 'auth/network-request-failed') {
        setLoginError(isRtl ? 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت' : 'Network error. Please check your connection.');
      } else {
        setLoginError(isRtl ? 'حدث خطأ أثناء تسجيل الدخول' : (err.message || 'An error occurred during login'));
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resetEmail.trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      setResetStatus('error');
      setResetMessage(isRtl ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address');
      return;
    }

    setResetStatus('loading');
    setResetMessage(null);

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetStatus('success');
      setResetMessage(
        isRtl
          ? 'إذا كان هذا البريد مسجلاً في النظام، ستتلقى رابطاً لإعادة تعيين كلمة المرور في غضون دقائق. يرجى التحقق من صندوق الوارد والبريد غير المرغوب فيه (Spam).'
          : 'If this email is registered in our system, a password reset link will arrive in your inbox shortly. Please check your Inbox and Spam folder.'
      );
    } catch (err: any) {
      console.warn('Password reset notice:', err);
      // Security best practice: do not leak whether email exists
      setResetStatus('success');
      setResetMessage(
        isRtl
          ? 'إذا كان هذا البريد مسجلاً في النظام، ستتلقى رابطاً لإعادة تعيين كلمة المرور في غضون دقائق. يرجى التحقق من صندوق الوارد والبريد غير المرغوب فيه (Spam).'
          : 'If this email is registered in our system, a password reset link will arrive in your inbox shortly. Please check your Inbox and Spam folder.'
      );
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
      <div className="absolute inset-0 bg-[#040957]/75 backdrop-blur-[2px] z-0"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-md p-8 border border-white/20 relative z-10"
      >
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center mb-4 cursor-pointer" onClick={onOpenLanding}>
            {settings?.companyLogoUrl && (settings.companyLogoUrl.startsWith('data:') || settings.companyLogoUrl.startsWith('http')) ? (
              <img src={settings.companyLogoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-xl shadow" />
            ) : (
              <div className="w-16 h-16 bg-[#040957] rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-black text-[#040957] mb-1.5 tracking-tight">
            {viewMode === 'login' 
              ? (isRtl ? 'تسجيل الدخول للنظام الأساسي' : 'System Login')
              : (isRtl ? 'استعادة كلمة المرور' : 'Password Recovery')}
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            {viewMode === 'login'
              ? (isRtl ? 'بوابة إدارة المشاريع والعمليات السحابية' : 'Cloud Projects & SaaS Operations Portal')
              : (isRtl ? 'أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور بأمان' : 'Enter your email to safely reset your password')}
          </p>
        </div>

        {viewMode === 'login' ? (
          <>
            {/* Google One-Click Sign In */}
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-xl border border-gray-300 shadow-sm transition active:scale-[0.98] cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-xs">{isRtl ? 'تسجيل الدخول عبر Google' : 'Sign in with Google'}</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-400 font-medium">
                    {isRtl ? 'أو عبر البريد / رقم الهوية' : 'Or via Email / ID'}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-xs font-semibold border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="shrink-0 text-base">⚠️</span>
                    <span>{loginError}</span>
                  </div>
                  {errorDetails && (
                    <pre className="mt-2 text-[11px] bg-red-100/70 p-2.5 rounded-lg text-red-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {errorDetails}
                    </pre>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {isRtl ? 'البريد الإلكتروني أو رقم الهوية' : 'Email or ID Number'}
                </label>
                <input
                  type="text"
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#040957] transition"
                  placeholder={isRtl ? 'Kalifah13579@hotmail.com' : 'Enter email or ID...'}
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {isRtl ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('forgot_password');
                      setResetEmail(loginId.includes('@') ? loginId : '');
                      setResetStatus('idle');
                      setResetMessage(null);
                    }}
                    className="text-xs text-sky-700 hover:text-sky-900 font-bold transition cursor-pointer"
                  >
                    {isRtl ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#040957] transition"
                    placeholder={isRtl ? '••••••••' : 'Enter password...'}
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
                className="w-full bg-[#040957] hover:bg-[#0d1680] text-white py-3 rounded-xl font-black text-sm uppercase tracking-wider shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2 cursor-pointer"
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

            {/* Public Registration Link */}
            {onOpenRegister && (
              <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-xs text-gray-500 mb-2">
                  {isRtl ? 'ليس لدى منشأتك اشتراك بعد؟' : "Don't have an enterprise account yet?"}
                </p>
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-[0.98] cursor-pointer"
                >
                  {isRtl ? 'تسجيل منشأة جديدة وبدء تجربة مجانية' : 'Register New Organization & Start Free Trial'}
                </button>
              </div>
            )}
          </>
        ) : (
          /* FORGOT PASSWORD FORM */
          <div className="space-y-4">
            {resetStatus === 'success' ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{isRtl ? 'تم إرسال الطلب بنجاح' : 'Reset Link Sent'}</span>
                </div>
                <p className="leading-relaxed">{resetMessage}</p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setResetStatus('idle');
                      setResetMessage(null);
                    }}
                    className="w-full bg-[#040957] hover:bg-[#0d1680] text-white py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    {isRtl ? 'العودة لتسجيل الدخول' : 'Return to Login'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {resetStatus === 'error' && (
                  <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-semibold border border-red-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{resetMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {isRtl ? 'البريد الإلكتروني المسجل' : 'Registered Email'}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#040957] transition"
                      placeholder={isRtl ? 'example@company.com' : 'example@company.com'}
                      dir="ltr"
                      required
                    />
                    <Mail className={`w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-3' : 'right-3'}`} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetStatus === 'loading'}
                  className="w-full bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer"
                >
                  {resetStatus === 'loading' ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{isRtl ? 'إرسال رابط إعادة التعيين' : 'Send Password Reset Link'}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setResetStatus('idle');
                    setResetMessage(null);
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  {isRtl ? 'إلغاء والعودة للدخول' : 'Cancel & Return to Login'}
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
