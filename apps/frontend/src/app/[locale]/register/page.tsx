'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { Link, useRouter } from '@/i18n/routing';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { CheckCircle2, Mail, RefreshCw } from 'lucide-react';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const params = useParams();
  const locale = (params?.locale as string) || 'uz';
  const router = useRouter();
  
  const { register, user } = useAuth();
  
  // Auto redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.hasProfile) {
        router.push('/dashboard');
      } else {
        router.push('/profile');
      }
    }
  }, [user, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isPendingVerification, setIsPendingVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await register(email, password);
      if (res && !res.isEmailVerified) {
        setIsPendingVerification(true);
        toast.success(
          locale === 'ru'
            ? 'Письмо для подтверждения отправлено!'
            : locale === 'en'
            ? 'Verification email sent!'
            : 'Tasdiqlash xati yuborildi!'
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('error_register'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await api.post('/auth/resend-verification', { email, locale });
      toast.success(
        locale === 'ru'
          ? 'Новое письмо отправлено!'
          : locale === 'en'
          ? 'New verification email sent!'
          : 'Yangi tasdiqlash xati yuborildi!'
      );
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          (locale === 'ru'
            ? 'Не удалось отправить письмо'
            : locale === 'en'
            ? 'Failed to send email'
            : 'Xatni yuborib bo‘lmadi')
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-transparent">
      <div className="w-full max-w-sm page-enter">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CaloFit</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t('register')}</p>
        </div>

        {/* Verification Pending View */}
        {isPendingVerification ? (
          <div className="glass rounded-2xl p-6 shadow-xl space-y-6 dark:bg-slate-900/50 dark:border-slate-800 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 dark:bg-emerald-950/30 text-green-500">
              <Mail size={24} className="animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {locale === 'ru' ? 'Подтвердите email' : locale === 'en' ? 'Verify your email' : 'Emailni tasdiqlang'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                {locale === 'ru'
                  ? `Мы отправили ссылку на ${email}. Пожалуйста, перейдите по ней для активации вашего аккаунта.`
                  : locale === 'en'
                  ? `We have sent a link to ${email}. Please check your inbox and click it to activate your account.`
                  : `Biz ${email} pochtasiga faollashtirish havolasini yubordik. Ro'yxatdan o'tishni yakunlash uchun havolani bosing.`}
              </p>
            </div>

            <div className="pt-2 border-t border-gray-150/50 dark:border-slate-850 space-y-3">
              <button
                onClick={handleResend}
                disabled={isResending}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-green-500 hover:bg-green-600 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
                {locale === 'ru' ? 'Отправить повторно' : locale === 'en' ? 'Resend Link' : 'Qayta yuborish'}
              </button>
              
              <Link
                href="/login"
                className="block text-xs font-bold text-gray-500 dark:text-slate-400 hover:underline"
              >
                {locale === 'ru' ? 'Вернуться к входу' : locale === 'en' ? 'Back to Login' : 'Kirishga qaytish'}
              </Link>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 shadow-xl space-y-5 dark:bg-slate-900/50 dark:border-slate-800">
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                {t('email')}
              </label>
              <input
                id="register-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                {t('password')}
              </label>
              <input
                id="register-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">Kamida 8 belgi, katta harf va raqam</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
            >
              {isLoading ? t('signing_up') : t('register')}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-slate-400">
              {t('already_have_account')}{' '}
              <Link href="/login" className="text-green-600 dark:text-emerald-400 font-medium hover:underline">
                {t('login')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
