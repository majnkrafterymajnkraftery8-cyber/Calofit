'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Camera, LogOut, TrendingUp, MessageSquare, Sparkles, Sun, Moon, Globe, ChevronDown, Check, X, Trash2 } from 'lucide-react';
import { useTheme } from '@/providers/theme-provider';
import { toast } from 'sonner';

interface DashboardData {
  profile: { name: string | null; dailyCalorieGoal: number };
  today: {
    date: string;
    consumed: { calories: number; protein: number; fat: number; carbs: number };
    remaining: { calories: number };
    progress: number;
  };
  recentLogs: Array<{
    id: string;
    mealType: string;
    foodName: string;
    portionSize?: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    imageUrl: string | null;
    loggedAt: string;
    ingredients?: string[];
    healthAdvice?: string | null;
    portionBreakdown?: string | null;
  }>;
}

const MEAL_EMOJI: Record<string, string> = {
  BREAKFAST: '🌅',
  LUNCH: '☀️',
  DINNER: '🌙',
  SNACK: '🍎',
};

const LANG_MAP = {
  uz: { label: "UZ", flag: "🇺🇿" },
  ru: { label: "RU", flag: "🇷🇺" },
  en: { label: "EN", flag: "🇬🇧" }
};

export default function DashboardPage({ params }: { params: { locale: string } }) {
  const t = useTranslations('dashboard');
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [locale, setLocale] = useState('uz');
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then((resolved) => {
      setLocale(resolved?.locale || 'uz');
    });
  }, [params]);

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard');
      return data;
    },
  });

  const [selectedMealLog, setSelectedMealLog] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/meals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(locale === 'ru' ? 'Успешно удалено!' : locale === 'en' ? 'Deleted successfully!' : "O'chirildi!");
      setSelectedMealLog(null);
    },
    onError: () => {
      toast.error(locale === 'ru' ? 'Ошибка удаления' : locale === 'en' ? 'Failed to delete' : "O'chirishda xatolik");
    },
  });

  if (isLoading || !data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const { profile, today, recentLogs } = data;
  const progressColor = today.progress > 100 ? 'from-red-500 to-red-650' : 'from-emerald-500 to-green-600';

  // Humanized Translations
  const uiText = {
    dailyGoal: locale === 'ru' ? 'Дневная цель:' : locale === 'en' ? 'Daily Goal:' : "Kunlik me'yor:",
    done: locale === 'ru' ? 'Выполнено' : locale === 'en' ? 'Achieved' : 'Bajarildi',
    caloriesGoal: locale === 'ru' ? 'Цель' : locale === 'en' ? 'Target' : 'Reja',
    consumed: locale === 'ru' ? 'Съедено' : locale === 'en' ? 'Consumed' : 'Qabul qilindi',
    remaining: locale === 'ru' ? 'Осталось' : locale === 'en' ? 'Remaining' : 'Qoldi',
    protein: locale === 'ru' ? 'Белки' : locale === 'en' ? 'Proteins' : 'Oqsillar',
    fat: locale === 'ru' ? 'Жиры' : locale === 'en' ? 'Fats' : "Yog'lar",
    carbs: locale === 'ru' ? 'Углеводы' : locale === 'en' ? 'Carbs' : 'Uglevodlar',
    recentLogsTitle: locale === 'ru' ? '📋 История приемов пищи' : locale === 'en' ? '📋 Meal History' : '📋 Bugungi taomlar ro\'yxati',
    latestAnalysisTitle: locale === 'ru' ? '📷 Последнее проанализированное блюдо' : locale === 'en' ? '📷 Latest Analyzed Food' : '📷 Oxirgi tahlil qilingan taom',
    latestPhotoPlaceholder: locale === 'ru' ? 'У вас еще нет добавленных блюд. Сделайте фото, чтобы искусственный интеллект проанализировал вашу еду!' : locale === 'en' ? 'You haven\'t logged any meals yet. Take a photo and let our AI analyze your food!' : 'Sizda hali tahlil qilingan taomlar yo\'q. Taom rasmini yuklang, sun\'iy intellekt uni tahlil qilib beradi!',
    mealTypeBreakfast: locale === 'ru' ? 'Завтрак' : locale === 'en' ? 'Breakfast' : 'Ertalabki nonushta',
    mealTypeLunch: locale === 'ru' ? 'Обед' : locale === 'en' ? 'Lunch' : 'Tushlik',
    mealTypeDinner: locale === 'ru' ? 'Ужин' : locale === 'en' ? 'Dinner' : 'Kechki ovqat',
    mealTypeSnack: locale === 'ru' ? 'Перекус' : locale === 'en' ? 'Snack' : 'Perekus / Yengil taom',
    noMealsDesc: locale === 'ru' ? 'Пока нет записей. Нажмите на кнопку ниже, чтобы сфотографировать тарелку.' : locale === 'en' ? 'No records yet. Press the button below to take a photo of your plate.' : 'Hozircha hech narsa yo\'q. Kamerani yoqib, taom rasmini yuklang.',
    addMealBtn: locale === 'ru' ? 'Добавить еду' : locale === 'en' ? 'Add Meal' : 'Taom tahlili',
  };

  const getMealTypeName = (type: string) => {
    if (type === 'BREAKFAST') return uiText.mealTypeBreakfast;
    if (type === 'LUNCH') return uiText.mealTypeLunch;
    if (type === 'DINNER') return uiText.mealTypeDinner;
    return uiText.mealTypeSnack;
  };

  const getHumanizedMacros = (p: number, f: number, c: number) => {
    if (locale === 'ru') {
      return `Белки: ${Math.round(p)}г · Жиры: ${Math.round(f)}г · Углеводы: ${Math.round(c)}г`;
    }
    if (locale === 'en') {
      return `P: ${Math.round(p)}g · F: ${Math.round(f)}g · C: ${Math.round(c)}g`;
    }
    return `Oqsil: ${Math.round(p)}g · Yog': ${Math.round(f)}g · Ugl: ${Math.round(c)}g`;
  };

  // Find the latest image from logged meals
  const latestLogWithImage = recentLogs.find(log => log.imageUrl);
  const latestMealDisplay = latestLogWithImage || recentLogs[0];

  return (
    <main className="min-h-screen pb-28 bg-transparent">

      {/* Header with Centered Navigation */}
      <header className="w-full max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/10 backdrop-blur-md sticky top-0 z-30 transition-all duration-300">

        {/* Logo Section */}
        <div className="flex items-center gap-3 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/15 shrink-0">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">CaloFit</span>
        </div>

        {/* Centered Navigation Menu */}
        <nav className="flex items-center justify-center bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-md px-2 py-1 rounded-2xl border border-gray-200/60 dark:border-slate-800 shadow-md gap-1">
          <Link href="/dashboard" className="px-4 py-2 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 transition-all">
            {locale === 'ru' ? 'Главная' : locale === 'en' ? 'Home' : 'Bosh sahifa'}
          </Link>
          <Link href="/chat" className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-450 flex items-center gap-1.5 transition-all">
            <Sparkles size={13} className="text-emerald-500" />
            {locale === 'ru' ? 'ИИ Диетолог' : locale === 'en' ? 'AI Dietician' : 'Sun\'iy intellekt'}
          </Link>
          <Link href="/support" className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-450 transition-all">
            {locale === 'ru' ? 'Помощь' : locale === 'en' ? 'Support' : 'Yordam'}
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Language Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-250 dark:border-slate-800 bg-white dark:bg-[#1e293b] text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 duration-200"
            >
              <span>{LANG_MAP[locale as 'uz' | 'ru' | 'en']?.flag || "🇺🇿"}</span>
              <span className="hidden sm:inline font-bold">{LANG_MAP[locale as 'uz' | 'ru' | 'en']?.label}</span>
              <ChevronDown size={12} className={`text-gray-400 transition-transform duration-300 ${langOpen ? 'rotate-180' : ''}`} />
            </button>

            {langOpen && (
              <div className="absolute right-0 mt-2 w-32 rounded-xl border border-gray-150 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-xl py-1.5 z-50 animate-fade-in">
                {(Object.keys(LANG_MAP) as Array<'uz' | 'ru' | 'en'>).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLangOpen(false);
                      router.replace(pathname, { locale: l });
                    }}
                    className="w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-left text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center justify-between transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <span>{LANG_MAP[l].flag}</span>
                      <span className="font-bold">{LANG_MAP[l].label}</span>
                    </span>
                    {locale === l && <Check size={12} className="text-emerald-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme Switch */}
          <button onClick={toggleTheme} className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-green-50/50 dark:hover:bg-slate-800 transition-all border border-gray-250/50 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-sm cursor-pointer active:scale-95 duration-200" title={theme === 'dark' ? "Kunduzgi rejim" : "Tungi rejim"}>
            {theme === 'dark' ? <Sun size={16} className="text-amber-500 animate-spin-slow" /> : <Moon size={16} className="text-indigo-650" />}
          </button>

          {/* Logout Button */}
          <button onClick={logout} className="p-2.5 rounded-xl text-slate-450 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-gray-250/50 dark:border-slate-800 bg-white dark:bg-[#1e293b] shadow-sm cursor-pointer active:scale-95 duration-200" aria-label="Chiqish" title="Tizimdan chiqish">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Responsive Grid Layout */}
      <div className="w-full max-w-6xl mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 page-enter">

        {/* Left Side: Profile Banner, Circular ring, and Macros Progress (Grid Span 8) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Profile Welcome Banner */}
          <div className="glass rounded-3xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/20 dark:via-emerald-950/5 dark:to-transparent border border-emerald-500/10 hover-lift">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {locale === 'ru'
                    ? `Привет, ${profile.name ?? 'Пользователь'} 👋`
                    : locale === 'en'
                      ? `Hello, ${profile.name ?? 'User'} 👋`
                      : `Salom, ${profile.name ?? 'Foydalanuvchi'} 👋`}
                </h1>
                <p className="text-xs text-slate-650 dark:text-slate-350 mt-1 font-semibold">
                  {locale === 'ru'
                    ? 'Рады видеть вас! Вот ваш баланс калорий на сегодня.'
                    : locale === 'en'
                      ? 'We are glad to see you! Here is your calorie balance for today.'
                      : 'Bugungi ovqatlanish balansingiz va statistika.'}
                </p>
              </div>
              <div className="self-start sm:self-center px-4 py-2 rounded-2xl text-xs font-black bg-white dark:bg-[#1e293b] text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 shadow-md">
                {uiText.dailyGoal} {profile.dailyCalorieGoal} {locale === 'ru' ? 'ккал' : 'kcal'}
              </div>
            </div>
          </div>

          {/* Prominent Latest Analyzed Meal Card (Visual Centerpiece) */}
          <div onClick={() => latestMealDisplay && setSelectedMealLog(latestMealDisplay)} className="glass rounded-3xl p-6 shadow-xl relative overflow-hidden dark:bg-slate-900/50 dark:border-slate-800 transition-all hover-lift cursor-pointer">
            <p className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-4">
              {uiText.latestAnalysisTitle}
            </p>

            {latestMealDisplay ? (
              <div className="flex flex-col md:flex-row gap-5 items-stretch">

                {/* Visual Image Preview */}
                <div className="relative w-full md:w-48 h-40 md:h-auto min-h-[140px] rounded-2xl overflow-hidden shadow-md shrink-0 border border-gray-150/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                  {latestMealDisplay.imageUrl ? (
                    <img src={latestMealDisplay.imageUrl} alt={latestMealDisplay.foodName} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-4xl">
                      {MEAL_EMOJI[latestMealDisplay.mealType] || '🍽️'}
                    </div>
                  )}
                  <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-xl text-[9px] font-black text-white bg-slate-950/70 backdrop-blur-md uppercase tracking-wider">
                    {getMealTypeName(latestMealDisplay.mealType)}
                  </span>
                </div>

                {/* Details Breakdown */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white line-clamp-2">
                      {latestMealDisplay.foodName}
                    </h3>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-450 flex items-center gap-1.5 mt-1">
                      <span>{MEAL_EMOJI[latestMealDisplay.mealType]}</span>
                      <span>{new Date(latestMealDisplay.loggedAt).toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'uz-Latn', { hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-150/50 dark:border-slate-800/80 flex flex-wrap gap-2 items-center">
                    <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                      {Math.round(latestMealDisplay.calories)} {locale === 'ru' ? 'ккал' : locale === 'en' ? 'kcal' : 'kkal'}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-650 dark:text-slate-350">
                      {getHumanizedMacros(latestMealDisplay.protein, latestMealDisplay.fat, latestMealDisplay.carbs)}
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-8 text-center bg-gradient-to-br from-emerald-500/5 via-emerald-500/0 to-transparent dark:from-emerald-950/20 dark:via-emerald-950/0 dark:to-transparent rounded-2xl border border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center justify-center">
                <p className="text-4xl mb-3 animate-bounce">📸</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-4">
                  {uiText.latestPhotoPlaceholder}
                </p>
                <Link
                  href="/analyze"
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-md shadow-green-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  {uiText.addMealBtn}
                </Link>
              </div>
            )}
          </div>

          {/* Calorie Ring Card */}
          <div className="glass rounded-3xl p-6 shadow-xl relative overflow-hidden dark:bg-slate-900/50 dark:border-slate-800 transition-all hover-lift">
            <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <p className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-5">{t('title')}</p>

            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Circular Dial */}
              <div className="relative w-36 h-36 shrink-0">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="8" />
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round"
                    className="transition-all duration-1000 ease-out glow-ring"
                    stroke="url(#progress-gradient)"
                    strokeDasharray={`${Math.min(today.progress, 100) * 3.267} 326.7`} />
                  <defs>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={today.progress > 100 ? '#f43f5e' : '#10b981'} />
                      <stop offset="100%" stopColor={today.progress > 100 ? '#e11d48' : '#059669'} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{today.progress}%</span>
                  <span className="text-[9px] text-gray-400 mt-1.5 uppercase font-black tracking-wider">{uiText.done}</span>
                </div>
              </div>

              {/* Stats Panel */}
              <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-150/70 dark:border-slate-800/80 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-1">{uiText.caloriesGoal}</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white">{profile.dailyCalorieGoal} <span className="text-[10px] font-normal text-gray-400">{locale === 'ru' ? 'ккал' : locale === 'en' ? 'kcal' : 'kkal'}</span></span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-55/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider block mb-1">{uiText.consumed}</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{Math.round(today.consumed.calories)} <span className="text-[10px] font-normal text-emerald-500/70">{locale === 'ru' ? 'ккал' : locale === 'en' ? 'kcal' : 'kkal'}</span></span>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-150/70 dark:border-slate-800/80 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block mb-1">{uiText.remaining}</span>
                  <span className="text-lg font-black text-slate-700 dark:text-slate-350">{Math.round(today.remaining.calories)} <span className="text-[10px] font-normal text-gray-450">{locale === 'ru' ? 'ккал' : locale === 'en' ? 'kcal' : 'kkal'}</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Macro Progress Cards Row (3-column grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: uiText.protein, value: today.consumed.protein, max: 150, color: 'from-blue-400 to-blue-600', bg: 'bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/40 dark:border-blue-900/20' },
              { label: uiText.fat, value: today.consumed.fat, max: 80, color: 'from-amber-400 to-amber-600', bg: 'bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/40 dark:border-amber-900/20' },
              { label: uiText.carbs, value: today.consumed.carbs, max: 250, color: 'from-purple-400 to-purple-600', bg: 'bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100/40 dark:border-purple-900/20' },
            ].map((m) => (
              <div key={m.label} className={`glass rounded-2xl p-5 shadow-sm space-y-3 transition-all hover-lift ${m.bg}`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{m.label}</span>
                  <span className="text-xs font-bold text-gray-400 dark:text-slate-500">Max: {m.max}g</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{Math.round(m.value)}</span>
                  <span className="text-xs text-gray-450 font-bold">g</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${m.color} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right Side: Recent Logs (Grid Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-3xl p-6 shadow-xl dark:bg-slate-900/50 dark:border-slate-800 flex flex-col h-full min-h-[400px] hover-lift">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">{uiText.recentLogsTitle}</h2>
              <Link
                href="/log"
                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors uppercase tracking-wider bg-green-50/50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-500/10 active:scale-95 cursor-pointer"
              >
                {locale === 'ru' ? 'Дневник ➔' : locale === 'en' ? 'Diary ➔' : 'Kundalik ➔'}
              </Link>
            </div>

            {recentLogs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <p className="text-5xl mb-3 animate-pulse">🥗</p>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 leading-relaxed max-w-[170px] mx-auto">{uiText.noMealsDesc}</p>
              </div>
            ) : (
              <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[580px] pr-1">
                {recentLogs.map((log) => (
                  <div key={log.id} onClick={() => setSelectedMealLog(log)} className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-gray-150/70 dark:border-slate-800/80 hover-lift flex items-center gap-3.5 shadow-sm cursor-pointer">
                    {log.imageUrl ? (
                      <img src={log.imageUrl} alt={log.foodName} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                        {MEAL_EMOJI[log.mealType] ?? '🍽️'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white truncate text-xs">{log.foodName}</p>
                      <p className="text-[9px] font-bold text-emerald-605 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                        <span>{MEAL_EMOJI[log.mealType]}</span>
                        <span>{new Date(log.loggedAt).toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'uz-Latn', { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900 dark:text-white text-xs">
                        {Math.round(Number(log.calories))} {locale === 'ru' ? 'ккал' : locale === 'en' ? 'kcal' : 'kkal'}
                      </p>
                      <p className="text-[8px] text-gray-400 dark:text-slate-500 font-bold mt-0.5">
                        {getHumanizedMacros(log.protein, log.fat, log.carbs)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Floating Action FAB */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Link href="/analyze"
          className="flex items-center gap-2.5 px-8 py-4.5 rounded-full font-black text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-2xl shadow-green-500/40 hover:shadow-green-500/60 hover:scale-105 active:scale-95 transition-all duration-300 group cursor-pointer">
          <Camera size={20} className="group-hover:rotate-12 transition-transform" />
          {uiText.addMealBtn}
        </Link>
      </div>

      {/* Detailed Modal Popup (Only opens when card is clicked) */}
      {selectedMealLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md page-enter">
          <div className="relative w-full max-w-lg glass rounded-3xl overflow-hidden shadow-2xl dark:bg-slate-900 dark:border-slate-800 border border-gray-150 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200/40 dark:border-slate-800/40 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{MEAL_EMOJI[selectedMealLog.mealType] || '🍽️'}</span>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                    {locale === 'ru' ? 'Детали блюда' : locale === 'en' ? 'Meal Details' : 'Taom tafsilotlari'}
                  </h2>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    {getMealTypeName(selectedMealLog.mealType)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMealLog(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Photo & Main Name */}
              <div className="flex flex-col sm:flex-row gap-5 items-center">
                {selectedMealLog.imageUrl && (
                  <div className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 border border-gray-150/60 dark:border-slate-800/80 shadow-md bg-slate-100 dark:bg-slate-950">
                    <img src={selectedMealLog.imageUrl} alt={selectedMealLog.foodName} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="text-center sm:text-left min-w-0">
                  <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">{selectedMealLog.foodName}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold mt-1 uppercase tracking-wide">
                    ⚖️ {selectedMealLog.portionSize || 'N/A'}
                  </p>
                  <p className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-black border border-red-100/50 dark:border-red-950/30">
                    🔥 {Math.round(Number(selectedMealLog.calories))} kcal
                  </p>
                </div>
              </div>

              {/* Nutrients Breakdown Progress bars */}
              <div className="bg-white/40 dark:bg-slate-950/20 p-4 rounded-2xl border border-gray-100/50 dark:border-slate-800/80 space-y-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                  {locale === 'ru' ? 'Состав макронутриентов' : locale === 'en' ? 'Macronutrient breakdown' : 'Makronutrient tarkibi'}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {/* Protein */}
                  <div>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">{uiText.protein}</span>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{Math.round(Number(selectedMealLog.protein))}g</p>
                  </div>
                  {/* Fat */}
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">{uiText.fat}</span>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{Math.round(Number(selectedMealLog.fat))}g</p>
                  </div>
                  {/* Carbs */}
                  <div>
                    <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wide">{uiText.carbs}</span>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{Math.round(Number(selectedMealLog.carbs))}g</p>
                  </div>
                </div>
              </div>

              {/* Ingredients list */}
              {selectedMealLog.ingredients && selectedMealLog.ingredients.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-455 dark:text-slate-400 uppercase tracking-wider">
                    🍎 {locale === 'ru' ? 'Ингредиенты' : locale === 'en' ? 'Ingredients' : 'Tarkibi'}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMealLog.ingredients.map((ing: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-green-50 dark:bg-emerald-950/20 text-green-700 dark:text-emerald-450 rounded-xl text-xs font-semibold border border-green-150/40 dark:border-emerald-900/25">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Portion breakdown */}
              {selectedMealLog.portionBreakdown && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-455 dark:text-slate-400 uppercase tracking-wider">
                    ⚖️ {locale === 'ru' ? 'Распределение веса' : locale === 'en' ? 'Weight breakdown' : 'Vazn taqsimoti'}
                  </h4>
                  <p className="text-xs text-gray-655 dark:text-slate-350 leading-relaxed font-bold bg-white/40 dark:bg-slate-950/40 p-4 rounded-2xl border border-gray-100/50 dark:border-slate-800/80">
                    {selectedMealLog.portionBreakdown}
                  </p>
                </div>
              )}

              {/* Health advice */}
              {selectedMealLog.healthAdvice && (
                <div className="space-y-2 bg-gradient-to-br from-emerald-500/5 via-emerald-500/5 to-transparent dark:from-slate-900/30 dark:to-transparent border border-green-200/40 dark:border-slate-800 rounded-3xl p-5">
                  <h4 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-emerald-500" />
                    {locale === 'ru' ? 'Рекомендация ИИ Диетолога' : locale === 'en' ? 'AI Dietologist recommendation' : 'AI Dietolog tavsiyasi'}
                  </h4>
                  <p className="text-xs text-emerald-900/80 dark:text-slate-300 leading-relaxed font-semibold bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-emerald-100/40 dark:border-slate-800 shadow-sm whitespace-pre-line">
                    {selectedMealLog.healthAdvice}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer / Delete Log Action */}
            <div className="px-6 py-4 border-t border-gray-200/40 dark:border-slate-800/40 bg-gray-50/40 dark:bg-slate-950/20 flex items-center justify-between shrink-0">
              <button
                onClick={() => setSelectedMealLog(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                {locale === 'ru' ? 'Закрыть' : locale === 'en' ? 'Close' : 'Yopish'}
              </button>
              
              <button
                onClick={() => deleteMutation.mutate(selectedMealLog.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                {locale === 'ru' ? 'Удалить' : locale === 'en' ? 'Delete' : 'O\'chirish'}
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
