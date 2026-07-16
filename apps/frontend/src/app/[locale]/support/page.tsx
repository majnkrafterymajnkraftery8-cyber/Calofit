'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/routing';
import { MessageSquare, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function SupportPage() {
  const t = useTranslations('support');
  const params = useParams();
  const locale = (params?.locale as string) || 'uz';
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error(
        locale === 'ru' 
          ? 'Пожалуйста, введите сообщение' 
          : locale === 'en' 
          ? 'Please enter a message' 
          : 'Iltimos, xabarni kiriting'
      );
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/feedback', { message, email });
      toast.success(t('success'));
      setIsSent(true);
    } catch {
      toast.error(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent pb-12 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md page-enter space-y-4">
        {/* Back navigation */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={16} />
          {locale === 'ru' ? 'Вернуться в дашборд' : locale === 'en' ? 'Back to Dashboard' : 'Dashboardga qaytish'}
        </button>

        {/* Form Card */}
        <div className="glass rounded-2xl p-6 shadow-xl relative overflow-hidden dark:bg-slate-900/50 dark:border-slate-800">
          {/* Header decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          {isSent ? (
            <div className="text-center py-8 space-y-4 page-enter">
              <div className="w-16 h-16 bg-green-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-emerald-400">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('success')}</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mx-auto">
                {locale === 'ru' 
                  ? 'Администратор получил ваше сообщение и скоро рассмотрит его.' 
                  : locale === 'en' 
                  ? 'The administrator received your message and will review it soon.' 
                  : "Admin xabaringizni oldi va tez orada ko'rib chiqadi."}
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg transition-all"
              >
                {locale === 'ru' ? 'В дашборд' : locale === 'en' ? 'Go to Dashboard' : 'Dashboardga o\'tish'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-50 dark:bg-emerald-950/30 rounded-lg text-green-600 dark:text-emerald-400">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('title')}</h1>
                  <p className="text-xs text-gray-500 dark:text-slate-400 leading-tight">{t('desc')}</p>
                </div>
              </div>

              {/* Message field */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5" htmlFor="msg-field">
                  {t('message_label')}
                </label>
                <textarea
                  id="msg-field"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('message_placeholder')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 outline-none transition-all resize-none"
                />
              </div>

              {/* Email field */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1.5" htmlFor="email-field">
                  {t('email_label')}
                </label>
                <input
                  id="email-field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email_placeholder')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 outline-none transition-all"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  t('sending')
                ) : (
                  <>
                    <Send size={16} />
                    {t('send')}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
