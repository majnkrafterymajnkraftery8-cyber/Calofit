'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/routing';
import { useParams } from 'next/navigation';
import { ArrowLeft, User, Sparkles, Scale, Ruler, Calendar, Target, Save, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useTheme } from '@/providers/theme-provider';

const STEPS = ['personal', 'size', 'goal'] as const;

interface ProfileData {
  id?: string;
  name: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  heightCm: number;
  weightKg: number;
  goal: 'LOSE_WEIGHT' | 'MAINTAIN' | 'GAIN_WEIGHT';
  dailyCalorieGoal: number;
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const params = useParams();
  const locale = (params?.locale as string) || 'uz';
  const { user, setUser } = useAuth();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [hasExistingProfile, setHasExistingProfile] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [dobYear, setDobYear] = useState<string>('');
  const [dobMonth, setDobMonth] = useState<string>('');
  const [dobDay, setDobDay] = useState<string>('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 110 }, (_, i) => currentYear - i);

  const [form, setForm] = useState<ProfileData>({
    name: '',
    dateOfBirth: '',
    gender: 'MALE',
    heightCm: 170,
    weightKg: 70,
    goal: 'MAINTAIN',
    dailyCalorieGoal: 2000,
  });

  // Fetch existing profile if available
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const { data } = await api.get<ProfileData>('/profile');
        if (data && isMounted) {
          setHasExistingProfile(true);
          setForm({
            name: data.name || '',
            dateOfBirth: data.dateOfBirth || '',
            gender: data.gender || 'MALE',
            heightCm: Number(data.heightCm) || 170,
            weightKg: Number(data.weightKg) || 70,
            goal: data.goal || 'MAINTAIN',
            dailyCalorieGoal: Number(data.dailyCalorieGoal) || 2000,
          });

          if (data.dateOfBirth) {
            const dateObj = new Date(data.dateOfBirth);
            if (!isNaN(dateObj.getTime())) {
              setDobYear(String(dateObj.getFullYear()));
              setDobMonth(String(dateObj.getMonth() + 1));
              setDobDay(String(dateObj.getDate()));
            }
          }
        }
      } catch (err: any) {
        // 404 means no profile created yet -> fallback to onboarding wizard
        if (err?.response?.status === 404) {
          setHasExistingProfile(false);
        }
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync year/month/day to form.dateOfBirth
  useEffect(() => {
    if (dobYear && dobMonth && dobDay) {
      const m = dobMonth.padStart(2, '0');
      const d = dobDay.padStart(2, '0');
      setForm((prev) => ({ ...prev, dateOfBirth: `${dobYear}-${m}-${d}` }));
    }
  }, [dobYear, dobMonth, dobDay]);

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

  const isDobValid = () => {
    if (!form.dateOfBirth) return false;
    const selected = new Date(form.dateOfBirth);
    const now = new Date();
    selected.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return selected <= now;
  };

  const updateForm = (key: keyof ProfileData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Calculated metrics (BMI)
  const heightM = form.heightCm / 100;
  const bmi = heightM > 0 ? (form.weightKg / (heightM * heightM)).toFixed(1) : '0';

  const getBmiCategory = (bmiVal: number) => {
    if (bmiVal < 18.5) return { label: locale === 'ru' ? 'Дефицит веса' : locale === 'en' ? 'Underweight' : 'Vazn kamligi', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' };
    if (bmiVal < 25) return { label: locale === 'ru' ? 'Нормальный вес' : locale === 'en' ? 'Healthy Weight' : 'Me\'yoriy vazn', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' };
    if (bmiVal < 30) return { label: locale === 'ru' ? 'Избыточный вес' : locale === 'en' ? 'Overweight' : 'Ortiqcha vazn', color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30' };
    return { label: locale === 'ru' ? 'Ожирение' : locale === 'en' ? 'Obesity' : 'Semizlik', color: 'text-red-500 bg-red-50 dark:bg-red-950/30' };
  };

  const bmiInfo = getBmiCategory(Number(bmi));

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      if (hasExistingProfile) {
        // Update existing profile using PATCH
        const { data } = await api.patch('/profile', form);
        if (data?.dailyCalorieGoal) {
          setForm((prev) => ({ ...prev, dailyCalorieGoal: data.dailyCalorieGoal }));
        }
        toast.success(
          locale === 'ru'
            ? 'Профиль успешно обновлен!'
            : locale === 'en'
            ? 'Profile updated successfully!'
            : 'Profil muvaffaqiyatli yangilandi!'
        );
      } else {
        // Create new profile using POST
        const { data } = await api.post('/profile', form);
        setHasExistingProfile(true);
        if (user) setUser({ ...user, hasProfile: true });
        localStorage.setItem('user', JSON.stringify({ ...user, hasProfile: true }));
        toast.success(
          locale === 'ru'
            ? 'Профиль сохранен!'
            : locale === 'en'
            ? 'Profile saved!'
            : 'Profil saqlandi!'
        );
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(
        locale === 'ru'
          ? 'Ошибка сохранения профиля'
          : locale === 'en'
          ? 'Failed to save profile'
          : 'Profilni saqlashda xatolik'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.name.length >= 2 && form.dateOfBirth && isDobValid();
    if (step === 1) return form.heightCm >= 50 && form.weightKg >= 10;
    return true;
  };

  if (initialLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20 bg-slate-50/50 dark:bg-[#0b0f19] text-gray-900 dark:text-white">
      {/* Header bar */}
      <header className="w-full max-w-5xl mx-auto px-6 py-4 flex items-center justify-between border-b border-gray-200/50 dark:border-slate-800/80 sticky top-0 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all border border-gray-200/50 dark:border-slate-800"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-bold text-lg leading-tight">
              {locale === 'ru' ? 'Мой Профиль' : locale === 'en' ? 'My Profile' : 'Mening Profilim'}
            </h1>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tracking-wide">
              CaloFit Health & Fitness
            </p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-500 hover:text-emerald-500 transition-all"
        >
          <Sparkles size={16} />
        </button>
      </header>

      <div className="w-full max-w-4xl mx-auto px-6 mt-8 page-enter">
        {/* VIEW / EDIT Profile Screen (for users with existing profiles) */}
        {hasExistingProfile ? (
          <div className="space-y-8">
            {/* Top Overview Card */}
            <div className="glass rounded-3xl p-6 sm:p-8 shadow-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 border border-emerald-500/20">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/20 shrink-0">
                    {form.name ? form.name.charAt(0).toUpperCase() : '👤'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                      {form.name || (locale === 'ru' ? 'Пользователь' : 'Foydalanuvchi')}
                    </h2>
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 mt-0.5">
                      {form.gender === 'MALE'
                        ? (locale === 'ru' ? 'Мужчина' : locale === 'en' ? 'Male' : 'Erkak')
                        : (locale === 'ru' ? 'Женщина' : locale === 'en' ? 'Female' : 'Ayol')}
                      {form.dateOfBirth && ` · ${new Date().getFullYear() - new Date(form.dateOfBirth).getFullYear()} ${locale === 'ru' ? 'лет' : 'yosh'}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full sm:w-auto">
                  {/* BMI Card */}
                  <div className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-gray-100 dark:border-slate-800 text-center shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">BMI / ИМТ</span>
                    <span className="text-xl font-black text-gray-900 dark:text-white">{bmi}</span>
                    <span className={`block text-[9px] font-extrabold px-2 py-0.5 rounded-full mt-1 ${bmiInfo.color}`}>
                      {bmiInfo.label}
                    </span>
                  </div>

                  {/* Calorie Goal Card */}
                  <div className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-emerald-500 text-white text-center shadow-md shadow-emerald-500/20">
                    <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider block">
                      {locale === 'ru' ? 'Цель калорий' : locale === 'en' ? 'Calorie Goal' : 'Kkal me\'yori'}
                    </span>
                    <span className="text-xl font-black">{form.dailyCalorieGoal}</span>
                    <span className="block text-[9px] font-extrabold text-emerald-100 mt-1">
                      {locale === 'ru' ? 'ккал/день' : 'kcal/day'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Form Card */}
            <div className="glass rounded-3xl p-6 sm:p-8 shadow-xl dark:bg-slate-900/60 dark:border-slate-800 space-y-6">
              <h3 className="text-lg font-black text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <User size={18} className="text-emerald-500" />
                {locale === 'ru' ? 'Редактировать параметры' : locale === 'en' ? 'Edit Profile Parameters' : 'Profil parametrlarini tahrirlash'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label htmlFor="name-input" className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                    {t('name')} (Имя и Фамилия)
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="Абдуллох"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                    {t('gender')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['MALE', 'FEMALE'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => updateForm('gender', g)}
                        className={`py-3 rounded-xl font-bold text-xs transition-all border ${
                          form.gender === g
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-950/40 dark:text-emerald-400 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
                        }`}
                      >
                        {t(g === 'MALE' ? 'male' : 'female')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Birth Date */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-emerald-500" />
                    {t('dateOfBirth')}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      value={dobYear}
                      onChange={(e) => setDobYear(e.target.value)}
                      className="px-3 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-semibold text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="">{locale === 'ru' ? 'Год' : locale === 'en' ? 'Year' : 'Yil'}</option>
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    <select
                      value={dobMonth}
                      onChange={(e) => setDobMonth(e.target.value)}
                      className="px-3 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-semibold text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="">{locale === 'ru' ? 'Месяц' : locale === 'en' ? 'Month' : 'Oy'}</option>
                      {getMonthsList(locale).map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>

                    <select
                      value={dobDay}
                      onChange={(e) => setDobDay(e.target.value)}
                      className="px-3 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-semibold text-xs cursor-pointer focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="">{locale === 'ru' ? 'День' : locale === 'en' ? 'Day' : 'Kun'}</option>
                      {getDaysArray(dobYear, dobMonth).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Height */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-gray-200/60 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <label htmlFor="height-num" className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Ruler size={14} className="text-emerald-500" />
                      {t('height')} (см)
                    </label>
                    <input
                      id="height-num"
                      type="number"
                      min={100}
                      max={260}
                      value={form.heightCm}
                      onChange={(e) => updateForm('heightCm', Number(e.target.value))}
                      className="w-20 px-3 py-1 rounded-xl text-center font-extrabold text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={260}
                    value={form.heightCm}
                    onChange={(e) => updateForm('heightCm', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Weight */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-gray-200/60 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <label htmlFor="weight-num" className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Scale size={14} className="text-emerald-500" />
                      {t('weight')} (кг)
                    </label>
                    <input
                      id="weight-num"
                      type="number"
                      min={30}
                      max={300}
                      step={0.1}
                      value={form.weightKg}
                      onChange={(e) => updateForm('weightKg', Number(e.target.value))}
                      className="w-20 px-3 py-1 rounded-xl text-center font-extrabold text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={300}
                    step={0.5}
                    value={form.weightKg}
                    onChange={(e) => updateForm('weightKg', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Goal Selection */}
                <div className="md:col-span-2 space-y-3">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={14} className="text-emerald-500" />
                    {locale === 'ru' ? 'Цель питания' : locale === 'en' ? 'Nutritional Goal' : 'Ovqatlanish maqsadi'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      {
                        value: 'LOSE_WEIGHT',
                        label: t('goal_lose'),
                        emoji: '🏃',
                        desc: locale === 'ru' ? '−500 ккал/день' : locale === 'en' ? '−500 kcal/day' : '−500 kkal/kun',
                      },
                      {
                        value: 'MAINTAIN',
                        label: t('goal_maintain'),
                        emoji: '⚖️',
                        desc: locale === 'ru' ? 'Баланс веса' : locale === 'en' ? 'Stable balance' : 'Barqaror vazn',
                      },
                      {
                        value: 'GAIN_WEIGHT',
                        label: t('goal_gain'),
                        emoji: '💪',
                        desc: locale === 'ru' ? '+300 ккал/день' : locale === 'en' ? '+300 kcal/day' : '+300 kkal/kun',
                      },
                    ] as const).map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => updateForm('goal', g.value)}
                        className={`p-4 rounded-2xl text-left transition-all border flex items-center gap-3.5 ${
                          form.goal === g.value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-950/30 dark:text-emerald-400 shadow-sm'
                            : 'border-gray-200 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 dark:border-slate-800'
                        }`}
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <div>
                          <p className="font-bold text-xs">{g.label}</p>
                          <p className="text-[10px] text-gray-500 dark:text-slate-400 font-semibold mt-0.5">{g.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="px-8 py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-60 flex items-center gap-2 cursor-pointer active:scale-95 text-xs uppercase tracking-wider"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {isLoading ? t('saving') : (locale === 'ru' ? 'Сохранить изменения' : locale === 'en' ? 'Save Changes' : 'O\'zgarishlarni saqlash')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* STEP-BY-STEP ONBOARDING WIZARD (First time setup) */
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('onboarding_title')}</h1>
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

            <div className="glass rounded-3xl p-6 shadow-xl dark:bg-slate-900/60 dark:border-slate-800">
              {step === 0 && (
                <div className="space-y-4 page-enter">
                  <div>
                    <label htmlFor="onboard-name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('name')}</label>
                    <input
                      id="onboard-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40"
                      placeholder="Абдуллох"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('dateOfBirth')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={dobYear}
                        onChange={(e) => setDobYear(e.target.value)}
                        className="w-full px-2.5 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 text-gray-900 dark:text-white text-xs font-semibold"
                      >
                        <option value="">{locale === 'ru' ? 'Год' : locale === 'en' ? 'Year' : 'Yil'}</option>
                        {years.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>

                      <select
                        value={dobMonth}
                        onChange={(e) => setDobMonth(e.target.value)}
                        className="w-full px-2.5 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 text-gray-900 dark:text-white text-xs font-semibold"
                      >
                        <option value="">{locale === 'ru' ? 'Месяц' : locale === 'en' ? 'Month' : 'Oy'}</option>
                        {getMonthsList(locale).map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>

                      <select
                        value={dobDay}
                        onChange={(e) => setDobDay(e.target.value)}
                        className="w-full px-2.5 py-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 text-gray-900 dark:text-white text-xs font-semibold"
                      >
                        <option value="">{locale === 'ru' ? 'День' : locale === 'en' ? 'Day' : 'Kun'}</option>
                        {getDaysArray(dobYear, dobMonth).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{t('gender')}</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(['MALE', 'FEMALE'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => updateForm('gender', g)}
                          className={`py-3 rounded-xl font-medium border ${
                            form.gender === g
                              ? 'border-green-500 bg-green-50 text-green-700 dark:border-emerald-500/50 dark:bg-emerald-950/20 dark:text-emerald-400'
                              : 'border-gray-200 bg-white text-gray-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {t(g === 'MALE' ? 'male' : 'female')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5 page-enter">
                  <div>
                    <label htmlFor="onboard-height" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('height')}</label>
                    <div className="flex items-center gap-3">
                      <input
                        id="onboard-height"
                        type="range"
                        min={100}
                        max={260}
                        value={form.heightCm}
                        onChange={(e) => updateForm('heightCm', Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                      <span className="w-16 text-center font-semibold text-gray-900 dark:text-white">{form.heightCm} cm</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="onboard-weight" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">{t('weight')}</label>
                    <div className="flex items-center gap-3">
                      <input
                        id="onboard-weight"
                        type="range"
                        min={30}
                        max={300}
                        step={0.5}
                        value={form.weightKg}
                        onChange={(e) => updateForm('weightKg', Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                      <span className="w-16 text-center font-semibold text-gray-900 dark:text-white">{form.weightKg} kg</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3 page-enter">
                  {([
                    { value: 'LOSE_WEIGHT', label: t('goal_lose'), emoji: '🏃', desc: '−500 kcal/day' },
                    { value: 'MAINTAIN', label: t('goal_maintain'), emoji: '⚖️', desc: 'Maintain weight' },
                    { value: 'GAIN_WEIGHT', label: t('goal_gain'), emoji: '💪', desc: '+300 kcal/day' },
                  ] as const).map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => updateForm('goal', g.value)}
                      className={`w-full p-4 rounded-xl text-left border flex items-center gap-4 ${
                        form.goal === g.value
                          ? 'border-green-500 bg-green-50 text-green-700 dark:border-emerald-500/50 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : 'border-gray-200 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span className="text-2xl">{g.emoji}</span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{g.label}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{g.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 py-3 rounded-xl font-medium text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    {locale === 'ru' ? '← Назад' : locale === 'en' ? '← Back' : '← Orqaga'}
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    disabled={!canNext()}
                    className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-40"
                  >
                    {locale === 'ru' ? 'Далее →' : locale === 'en' ? 'Next →' : 'Keyingi →'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-60"
                  >
                    {isLoading ? t('saving') : t('save')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
