'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';

const STEPS = ['personal', 'size', 'goal'] as const;

export default function ProfilePage() {
  const t = useTranslations('profile');
  const params = useParams();
  const locale = (params?.locale as string) || 'uz';
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [dobYear, setDobYear] = useState<string>('');
  const [dobMonth, setDobMonth] = useState<string>('');
  const [dobDay, setDobDay] = useState<string>('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 110 }, (_, i) => currentYear - i);

  const getMonthsList = (lang: string) => {
    if (lang === 'ru') {
      return [
        { value: '1', label: 'Январь' },
        { value: '2', label: 'Февраль' },
        { value: '3', label: 'Март' },
        { value: '4', label: 'Апрель' },
        { value: '5', label: 'Май' },
        { value: '6', label: 'Июнь' },
        { value: '7', label: 'Июль' },
        { value: '8', label: 'Август' },
        { value: '9', label: 'Сентябрь' },
        { value: '10', label: 'Октябрь' },
        { value: '11', label: 'Ноябрь' },
        { value: '12', label: 'Декабрь' },
      ];
    }
    if (lang === 'en') {
      return [
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
      ];
    }
    return [
      { value: '1', label: 'Yanvar' },
      { value: '2', label: 'Fevral' },
      { value: '3', label: 'Mart' },
      { value: '4', label: 'Aprel' },
      { value: '5', label: 'May' },
      { value: '6', label: 'Iyun' },
      { value: '7', label: 'Iyul' },
      { value: '8', label: 'Avgust' },
      { value: '9', label: 'Sentyabr' },
      { value: '10', label: 'Oktyabr' },
      { value: '11', label: 'Noyabr' },
      { value: '12', label: 'Dekabr' },
    ];
  };

  const getDaysArray = (yearStr: string, monthStr: string) => {
    const year = parseInt(yearStr) || currentYear;
    const month = parseInt(monthStr) || 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const [form, setForm] = useState({
    name: '',
    dateOfBirth: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    heightCm: 170,
    weightKg: 70,
    goal: 'MAINTAIN' as 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_WEIGHT',
  });

  // Pre-fill name from user object (e.g. from Telegram first_name)
  useEffect(() => {
    if (user?.name && !form.name) {
      setForm((prev) => ({ ...prev, name: user.name || '' }));
    }
  }, [user, form.name]);

  // Sync state to form.dateOfBirth
  useEffect(() => {
    if (dobYear && dobMonth && dobDay) {
      const m = dobMonth.padStart(2, '0');
      const d = dobDay.padStart(2, '0');
      setForm((prev) => ({ ...prev, dateOfBirth: `${dobYear}-${m}-${d}` }));
    } else {
      setForm((prev) => ({ ...prev, dateOfBirth: '' }));
    }
  }, [dobYear, dobMonth, dobDay]);

  // Adjust day if month length changes
  useEffect(() => {
    if (dobYear && dobMonth && dobDay) {
      const days = getDaysArray(dobYear, dobMonth);
      const dayNum = parseInt(dobDay);
      if (dayNum > days.length) {
        setDobDay(String(days.length));
      }
    }
  }, [dobYear, dobMonth]);

  const isDobValid = () => {
    if (!form.dateOfBirth) return false;
    const selected = new Date(form.dateOfBirth);
    const now = new Date();
    selected.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return selected <= now;
  };

  const updateForm = (key: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await api.post('/profile', form);
      if (user) setUser({ ...user, hasProfile: true });
      localStorage.setItem('user', JSON.stringify({ ...user, hasProfile: true }));
      toast.success(locale === 'ru' ? 'Профиль сохранен!' : locale === 'en' ? 'Profile saved!' : 'Profil saqlandi!');
      router.push('/dashboard');
    } catch {
      toast.error(locale === 'ru' ? 'Ошибка сохранения профиля' : locale === 'en' ? 'Failed to save profile' : 'Profilni saqlashda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.name.length >= 2 && form.dateOfBirth && isDobValid();
    if (step === 1) return form.heightCm >= 50 && form.weightKg >= 10;
    return true;
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-transparent">
      <div className="w-full max-w-md page-enter">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('onboarding_title')}</h1>
          {/* Step indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  i <= step
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                    : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                }`}>
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 ${i < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-800'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">{t(`step_${STEPS[step]}`)}</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-xl dark:bg-slate-900/50 dark:border-slate-800">
          {/* Step 1: Personal */}
          {step === 0 && (
            <div className="space-y-4 page-enter">
              <div>
                <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('name')}</label>
                <input id="profile-name" type="text" value={form.name} onChange={(e) => updateForm('name', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all"
                  placeholder="Abdulloh" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('dateOfBirth')}</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value)}
                    className="w-full px-2.5 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all text-xs font-semibold cursor-pointer"
                  >
                    <option value="">{locale === 'ru' ? 'Год' : locale === 'en' ? 'Year' : 'Yil'}</option>
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <select
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}
                    className="w-full px-2.5 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all text-xs font-semibold cursor-pointer"
                  >
                    <option value="">{locale === 'ru' ? 'Месяц' : locale === 'en' ? 'Month' : 'Oy'}</option>
                    {getMonthsList(locale).map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>

                  <select
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value)}
                    className="w-full px-2.5 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 transition-all text-xs font-semibold cursor-pointer"
                  >
                    <option value="">{locale === 'ru' ? 'День' : locale === 'en' ? 'Day' : 'Kun'}</option>
                    {getDaysArray(dobYear, dobMonth).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {form.dateOfBirth && !isDobValid() && (
                  <p className="text-red-500 text-[10px] font-bold mt-1.5 animate-pulse">
                    {locale === 'ru' ? '⚠️ Дата рождения не может быть в будущем!' : locale === 'en' ? '⚠️ Date of birth cannot be in the future!' : '⚠️ Tug\'ilgan sana kelajakda bo\'lishi mumkin emas!'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{t('gender')}</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['MALE', 'FEMALE'] as const).map((g) => (
                    <button key={g} type="button" onClick={() => updateForm('gender', g)}
                      className={`py-3 rounded-xl font-medium transition-all border ${
                        form.gender === g
                          ? 'border-green-500 bg-green-50 text-green-700 dark:border-emerald-500/50 dark:bg-emerald-950/20 dark:text-emerald-400 shadow-sm'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}>
                      {t(g === 'MALE' ? 'male' : 'female')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Body measurements */}
          {step === 1 && (
            <div className="space-y-5 page-enter">
              <div>
                <label htmlFor="profile-height" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('height')}</label>
                <div className="flex items-center gap-3">
                  <input id="profile-height" type="range" min={100} max={250} value={form.heightCm} onChange={(e) => updateForm('heightCm', Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
                  <span className="w-16 text-center font-semibold text-gray-900 dark:text-white">{form.heightCm}</span>
                </div>
              </div>
              <div>
                <label htmlFor="profile-weight" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('weight')}</label>
                <div className="flex items-center gap-3">
                  <input id="profile-weight" type="range" min={30} max={200} step={0.5} value={form.weightKg} onChange={(e) => updateForm('weightKg', Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
                  <span className="w-16 text-center font-semibold text-gray-900 dark:text-white">{form.weightKg}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Goal */}
          {step === 2 && (
            <div className="space-y-3 page-enter">
              {([
                { 
                  value: 'LOSE_WEIGHT', 
                  label: t('goal_lose'), 
                  emoji: '🏃', 
                  desc: locale === 'ru' ? '−500 ккал/день' : locale === 'en' ? '−500 kcal/day' : '−500 kkal/kun' 
                },
                { 
                  value: 'MAINTAIN', 
                  label: t('goal_maintain'), 
                  emoji: '⚖️', 
                  desc: locale === 'ru' ? 'Стабильное питание' : locale === 'en' ? 'Stable nutrition' : 'Barqaror ovqatlanish' 
                },
                { 
                  value: 'GAIN_WEIGHT', 
                  label: t('goal_gain'), 
                  emoji: '💪', 
                  desc: locale === 'ru' ? '+300 ккал/день' : locale === 'en' ? '+300 kcal/day' : '+300 kkal/kun' 
                },
              ] as const).map((g) => (
                <button key={g.value} type="button" onClick={() => updateForm('goal', g.value)}
                  className={`w-full p-4 rounded-xl text-left transition-all border flex items-center gap-4 hover-lift ${
                    form.goal === g.value
                      ? 'border-green-500 bg-green-50 text-green-700 dark:border-emerald-500/50 dark:bg-emerald-950/20 dark:text-emerald-400 shadow-md shadow-green-500/10'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700'
                  }`}>
                  <span className="text-2xl">{g.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{g.label}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
                {locale === 'ru' ? '← Назад' : locale === 'en' ? '← Back' : '← Orqaga'}
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep(step + 1)} disabled={!canNext()}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                {locale === 'ru' ? 'Далее →' : locale === 'en' ? 'Next →' : 'Keyingi →'}
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isLoading}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 transition-all disabled:opacity-60 cursor-pointer">
                {isLoading ? t('saving') : t('save')}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
