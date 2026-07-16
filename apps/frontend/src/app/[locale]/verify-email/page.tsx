'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { api } from '@/lib/api';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) || 'uz';
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage(
        locale === 'ru'
          ? 'Отсутствует проверочный токен.'
          : locale === 'en'
          ? 'Verification token is missing.'
          : 'Tasdiqlash tokeni topilmadi.'
      );
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(
          err.response?.data?.message ||
            (locale === 'ru'
              ? 'Ошибка активации аккаунта. Возможно, ссылка устарела.'
              : locale === 'en'
              ? 'Failed to verify email. The link may have expired.'
              : 'Pochtani tasdiqlashda xatolik yuz berdi.')
        );
      }
    };

    verify();
  }, [searchParams, router, locale]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-transparent">
      <div className="w-full max-w-sm glass rounded-3xl p-8 shadow-2xl dark:bg-slate-900/50 dark:border-slate-800 text-center space-y-6 page-enter">
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 size={48} className="text-emerald-500 animate-spin" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {locale === 'ru' ? 'Активация аккаунта...' : locale === 'en' ? 'Verifying email...' : 'Hisob faollashtirilmoqda...'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {locale === 'ru' ? 'Это займет несколько секунд' : locale === 'en' ? 'This will take a few seconds' : 'Bu bir necha soniya vaqt oladi'}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle2 size={54} className="text-emerald-500 animate-bounce" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {locale === 'ru' ? 'Успешно подтверждено!' : locale === 'en' ? 'Verified successfully!' : 'Muvaffaqiyatli tasdiqlandi!'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              {locale === 'ru'
                ? 'Ваша почта подтверждена. Перенаправление на страницу входа...'
                : locale === 'en'
                ? 'Your email is verified. Redirecting to login page...'
                : 'Pochtangiz tasdiqlandi. Kirish sahifasiga yo‘naltirilmoqda...'}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-4">
            <XCircle size={54} className="text-red-500 animate-pulse" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {locale === 'ru' ? 'Ошибка активации' : locale === 'en' ? 'Verification failed' : 'Faollashtirishda xatolik'}
            </h2>
            <p className="text-xs text-red-500 bg-red-50/50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-950/30 p-3 rounded-xl leading-relaxed font-semibold">
              {errorMessage}
            </p>
            <button
              onClick={() => router.push('/login')}
              className="mt-2 w-full py-2.5 rounded-xl font-bold text-xs text-gray-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:text-emerald-500 dark:hover:text-white active:scale-95 transition-all"
            >
              {locale === 'ru' ? 'Вернуться к входу' : locale === 'en' ? 'Back to Login' : 'Kirishga qaytish'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
