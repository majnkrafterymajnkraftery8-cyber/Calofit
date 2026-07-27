'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from '@/i18n/routing';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Sparkles, Trash2, X, Loader2, Search, Filter, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

interface MealLog {
  id: string;
  mealType: string;
  foodName: string;
  portionSize: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
  imageUrl: string | null;
  loggedAt: string;
  ingredients?: string[];
  healthAdvice?: string | null;
  portionBreakdown?: string | null;
}

interface LogData {
  date: string;
  summary: {
    totalCalories: number;
    totalProtein: number;
    totalFat: number;
    totalCarbs: number;
    logCount: number;
    dailyCalorieGoal?: number;
    remainingCalories?: number;
    diffCalories?: number;
  };
  logs: MealLog[];
}

export default function LogPage() {
  const t = useTranslations('dashboard');
  const mt = useTranslations('meal');
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'uz';
  const queryClient = useQueryClient();

  // Selected date state (defaults to local today formatted as YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    return localToday.toISOString().split('T')[0];
  });

  // Selected meal log for detailed modal view
  const [selectedMealLog, setSelectedMealLog] = useState<MealLog | null>(null);

  // Search query & meal type filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Fetch logs for the selected date
  const { data, isLoading } = useQuery<LogData>({
    queryKey: ['daily-logs', selectedDate],
    queryFn: async () => {
      const { data } = await api.get(`/meals?date=${selectedDate}`);
      return data;
    },
  });

  const filteredLogs = (data?.logs || []).filter((log) => {
    const matchesCategory = activeCategory === 'ALL' || log.mealType.toUpperCase() === activeCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || (
      log.foodName.toLowerCase().includes(query) ||
      log.mealType.toLowerCase().includes(query) ||
      (log.ingredients && log.ingredients.some(ing => ing.toLowerCase().includes(query)))
    );
    return matchesCategory && matchesQuery;
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/meals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(locale === 'ru' ? 'Успешно удалено!' : locale === 'en' ? 'Deleted successfully!' : "O'chirildi!");
      setSelectedMealLog(null);
    },
    onError: () => {
      toast.error(locale === 'ru' ? 'Ошибка удаления' : locale === 'en' ? 'Failed to delete' : "O'chirishda xatolik");
    },
  });

  // Date navigation handlers
  const handlePrevDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    setSelectedDate(localToday.toISOString().split('T')[0]);
  };

  // Generate 7-day strip centered around selectedDate
  const get7DaysStrip = (centerDateStr: string) => {
    const dates = [];
    const center = new Date(centerDateStr);
    for (let i = -3; i <= 3; i++) {
      const d = new Date(center);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
      const dayNum = d.getDate();
      dates.push({ iso, weekday, dayNum });
    }
    return dates;
  };

  // Localized date formatter
  const formatFriendlyDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Helper for meal type emoji & localized name
  const getMealTypeDetails = (type: string) => {
    switch (type.toUpperCase()) {
      case 'BREAKFAST':
        return { emoji: '🌅', name: locale === 'ru' ? 'Завтрак' : locale === 'en' ? 'Breakfast' : 'Ertalabki nonushta' };
      case 'LUNCH':
        return { emoji: '☀️', name: locale === 'ru' ? 'Обед' : locale === 'en' ? 'Lunch' : 'Tushlik' };
      case 'DINNER':
        return { emoji: '🌙', name: locale === 'ru' ? 'Ужин' : locale === 'en' ? 'Dinner' : 'Kechki ovqat' };
      case 'SNACK':
      default:
        return { emoji: '🍎', name: locale === 'ru' ? 'Перекус' : locale === 'en' ? 'Snack' : 'Perekus / Yengil taom' };
    }
  };

  const caloriesSummary = data?.summary.totalCalories || 0;
  const dailyGoal = data?.summary.dailyCalorieGoal || 2000;
  const diffCalories = caloriesSummary - dailyGoal;
  const progressPct = Math.min(100, Math.round((caloriesSummary / dailyGoal) * 100));

  const proteinSummary = data?.summary.totalProtein || 0;
  const fatSummary = data?.summary.totalFat || 0;
  const carbsSummary = data?.summary.totalCarbs || 0;

  const daysStrip = get7DaysStrip(selectedDate);

  return (
    <main className="min-h-screen pb-20 bg-slate-50/50 dark:bg-[#0b0f19] text-gray-900 dark:text-white">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between border-b border-gray-200/50 dark:border-slate-800/80 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md sticky top-0 z-30 transition-all">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={16} />
          {locale === 'ru' ? 'В дашборд' : locale === 'en' ? 'Dashboard' : 'Dashboardga'}
        </button>
        <h1 className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          {locale === 'ru' ? '📋 Календарь и Дневник Поиска' : locale === 'en' ? '📋 Food Log & Daily History' : '📋 Ovqatlanish Kundaligi'}
        </h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 mt-6 space-y-6 page-enter">
        
        {/* Main Date Picker Navigator Panel */}
        <div className="glass rounded-3xl p-6 shadow-xl dark:bg-slate-900/60 dark:border-slate-800 space-y-5">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left/Right Prev/Next Day controls */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={handlePrevDay}
                className="p-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-gray-700 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all active:scale-95 cursor-pointer shadow-sm"
                title={locale === 'ru' ? 'Предыдущий день' : 'Previous day'}
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="text-center sm:text-left px-3 min-w-[200px]">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider">
                  {locale === 'ru' ? 'Выбранная дата' : locale === 'en' ? 'Selected Date' : 'Tanlangan sana'}
                </p>
                <p className="text-sm font-black text-gray-900 dark:text-white capitalize mt-0.5">
                  {formatFriendlyDate(selectedDate)}
                </p>
              </div>

              <button
                onClick={handleNextDay}
                className="p-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-gray-700 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all active:scale-95 cursor-pointer shadow-sm"
                title={locale === 'ru' ? 'Следующий день' : 'Next day'}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Quick Actions (Today + Datepicker) */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSetToday}
                className="px-4 py-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                {locale === 'ru' ? 'Сегодня' : locale === 'en' ? 'Today' : 'Bugun'}
              </button>

              <div className="relative flex-1 sm:flex-initial">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-xs font-extrabold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/40 outline-none transition-all cursor-pointer shadow-sm"
                />
                <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 7-Day Quick Strip Bar */}
          <div className="pt-2 border-t border-gray-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
              {daysStrip.map((item) => {
                const isSelected = item.iso === selectedDate;
                return (
                  <button
                    key={item.iso}
                    onClick={() => setSelectedDate(item.iso)}
                    className={`flex-1 min-w-[48px] py-2 px-1 rounded-2xl flex flex-col items-center transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-emerald-500 to-green-600 text-white font-black shadow-md shadow-emerald-500/20 scale-105'
                        : 'bg-white/60 dark:bg-slate-950/30 text-gray-600 dark:text-slate-400 hover:bg-emerald-50/50 dark:hover:bg-slate-800/60 border border-gray-100/50 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wider">{item.weekday}</span>
                    <span className="text-sm font-black mt-0.5">{item.dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="glass rounded-3xl p-16 shadow-xl flex justify-center items-center dark:bg-slate-900/50 dark:border-slate-800">
            <Loader2 size={32} className="text-emerald-500 animate-spin" />
          </div>
        )}

        {/* Loaded Content */}
        {!isLoading && data && (
          <>
            {/* Day Comparison & Target vs Consumed Card ("вот в такой день ты кушал вот стоко хотя надо вот стоко") */}
            <div className="glass rounded-3xl p-6 shadow-xl dark:bg-slate-900/60 dark:border-slate-800 space-y-5 border border-gray-150">
              
              {/* Header Status Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-black text-gray-900 dark:text-white leading-tight">
                    {locale === 'ru' ? 'Баланс калорий за день' : locale === 'en' ? 'Daily Calorie Balance' : 'Kunlik kkal balansi'}
                  </h2>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-0.5">
                    {locale === 'ru' ? 'Сравнение съеденной пищи с вашей дневной нормой' : 'Comparison of consumed food with your target goal'}
                  </p>
                </div>

                {/* Status Badge */}
                <div>
                  {caloriesSummary === 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Info size={14} />
                      {locale === 'ru' ? 'Нет записей' : locale === 'en' ? 'No records yet' : 'Yozuvlar yo\'q'}
                    </span>
                  ) : diffCalories <= 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                      <CheckCircle size={14} />
                      {locale === 'ru' ? `Норма соблюдена (Осталось ${Math.abs(Math.round(diffCalories))} ккал)` : `Goal met (${Math.abs(Math.round(diffCalories))} kcal remaining)`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-500/20 shadow-sm">
                      <AlertCircle size={14} />
                      {locale === 'ru' ? `Превышение нормы на +${Math.round(diffCalories)} ккал` : `Exceeded goal by +${Math.round(diffCalories)} kcal`}
                    </span>
                  )}
                </div>
              </div>

              {/* Numerical Comparison Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Consumed */}
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                    {locale === 'ru' ? 'Съедено за день' : locale === 'en' ? 'Consumed Today' : 'Qabul qilindi'}
                  </span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {Math.round(caloriesSummary)}
                    <span className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80 ml-1">kcal</span>
                  </span>
                </div>

                {/* Target Goal */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    {locale === 'ru' ? 'Ваша норма (Цель)' : locale === 'en' ? 'Target Goal' : 'Sizning me\'yoringiz'}
                  </span>
                  <span className="text-2xl font-black text-gray-900 dark:text-white">
                    {dailyGoal}
                    <span className="text-xs font-bold text-gray-400 ml-1">kcal</span>
                  </span>
                </div>

                {/* Remaining / Difference */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    {diffCalories <= 0 ? (locale === 'ru' ? 'Остаток нормы' : 'Remaining') : (locale === 'ru' ? 'Избыток' : 'Excess')}
                  </span>
                  <span className={`text-2xl font-black ${diffCalories <= 0 ? 'text-slate-800 dark:text-slate-200' : 'text-red-500'}`}>
                    {Math.abs(Math.round(diffCalories))}
                    <span className="text-xs font-bold text-gray-400 ml-1">kcal</span>
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-slate-400">
                  <span>{locale === 'ru' ? 'Прогресс выполнения нормы' : 'Goal Progress'}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{progressPct}%</span>
                </div>
                <div className="h-3 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-gray-200/50 dark:border-slate-700/50">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      diffCalories > 0
                        ? 'bg-gradient-to-r from-amber-500 to-red-600'
                        : 'bg-gradient-to-r from-emerald-400 to-green-600 shadow-md shadow-emerald-500/20'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Macro breakdown row */}
              <div className="pt-2 grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/20">
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">{t('protein')}</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{Math.round(proteinSummary)}g</span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/20">
                  <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block">{t('fat')}</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{Math.round(fatSummary)}g</span>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/50 dark:border-purple-900/20">
                  <span className="text-[9px] font-bold text-purple-500 uppercase tracking-wider block">{t('carbs')}</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{Math.round(carbsSummary)}g</span>
                </div>
              </div>

            </div>

            {/* Category Filter Tabs & Search Bar */}
            <div className="glass rounded-3xl p-5 shadow-xl dark:bg-slate-900/60 dark:border-slate-800 space-y-4">
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  {[
                    { id: 'ALL', label: locale === 'ru' ? 'Все' : 'All', emoji: '🍽️' },
                    { id: 'BREAKFAST', label: locale === 'ru' ? 'Завтрак' : 'Breakfast', emoji: '🌅' },
                    { id: 'LUNCH', label: locale === 'ru' ? 'Обед' : 'Lunch', emoji: '☀️' },
                    { id: 'DINNER', label: locale === 'ru' ? 'Ужин' : 'Dinner', emoji: '🌙' },
                    { id: 'SNACK', label: locale === 'ru' ? 'Перекус' : 'Snack', emoji: '🍎' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        activeCategory === cat.id
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                          : 'bg-white/80 dark:bg-slate-950/40 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-800 hover:bg-emerald-50/50'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder={
                      locale === 'ru' ? 'Поиск по блюду...' :
                      locale === 'en' ? 'Search meals...' :
                      'Taom qidiruvi...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                  />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Meals Log List Cards */}
            {data.logs.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center shadow-xl dark:bg-slate-900/50 dark:border-slate-800 flex flex-col justify-center items-center space-y-3">
                <span className="text-4xl">🍽️</span>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
                  {locale === 'ru' ? 'За эту дату приема пищи пока нет' : 'No meals recorded for this date'}
                </p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center shadow-xl dark:bg-slate-900/50 dark:border-slate-800 flex flex-col justify-center items-center space-y-3">
                <span className="text-4xl">🔍</span>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400">
                  {locale === 'ru' ? 'Ничего не найдено по фильтрам' : 'No meals match your filter'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLogs.map((log) => {
                  const mealDetails = getMealTypeDetails(log.mealType);
                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedMealLog(log)}
                      className="glass rounded-3xl p-5 shadow-xl hover-lift border border-gray-150/60 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 flex items-center gap-4 cursor-pointer relative group transition-all"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-gray-100 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 shadow-inner">
                        {log.imageUrl ? (
                          <img src={log.imageUrl} alt={log.foodName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl bg-emerald-50 dark:bg-slate-950/20">
                            {mealDetails.emoji}
                          </div>
                        )}
                      </div>

                      {/* Text info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                            {mealDetails.name}
                          </span>
                        </div>
                        <p className="font-black text-gray-900 dark:text-white truncate mt-1 text-sm">{log.foodName}</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wide mt-0.5">
                          ⚖️ {log.portionSize}
                        </p>
                      </div>

                      {/* Calories badge */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800 px-3 py-1.5 rounded-xl block">
                          {Math.round(Number(log.calories))} <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">kcal</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Detailed Modal Popup (Only opens when card is clicked) */}
      {selectedMealLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md page-enter">
          <div className="relative w-full max-w-lg glass rounded-3xl overflow-hidden shadow-2xl dark:bg-slate-900 dark:border-slate-800 border border-gray-150 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200/40 dark:border-slate-800/40 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getMealTypeDetails(selectedMealLog.mealType).emoji}</span>
                <div>
                  <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                    {t('meal_details')}
                  </h2>
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                    {getMealTypeDetails(selectedMealLog.mealType).name}
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
                    ⚖️ {selectedMealLog.portionSize}
                  </p>
                  <p className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-black border border-red-100/50 dark:border-red-950/30">
                    🔥 {Math.round(Number(selectedMealLog.calories))} kcal
                  </p>
                </div>
              </div>

              {/* Nutrients Breakdown Progress bars */}
              <div className="bg-white/40 dark:bg-slate-950/20 p-4 rounded-2xl border border-gray-100/50 dark:border-slate-800/80 space-y-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Makronutrient tarkibi</p>
                <div className="grid grid-cols-3 gap-4">
                  {/* Protein */}
                  <div>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">{t('protein')}</span>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{Math.round(Number(selectedMealLog.protein))}g</p>
                  </div>
                  {/* Fat */}
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">{t('fat')}</span>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{Math.round(Number(selectedMealLog.fat))}g</p>
                  </div>
                  {/* Carbs */}
                  <div>
                    <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wide">{t('carbs')}</span>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{Math.round(Number(selectedMealLog.carbs))}g</p>
                  </div>
                </div>
              </div>

              {/* Ingredients list */}
              {selectedMealLog.ingredients && selectedMealLog.ingredients.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                    🍎 Tarkibi
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMealLog.ingredients.map((ing, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-semibold border border-emerald-100/40 dark:border-emerald-900/25">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Portion breakdown */}
              {selectedMealLog.portionBreakdown && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                    ⚖️ Vazn taqsimoti
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-slate-350 leading-relaxed font-bold bg-white/40 dark:bg-slate-950/40 p-4 rounded-2xl border border-gray-100/50 dark:border-slate-800/80">
                    {selectedMealLog.portionBreakdown}
                  </p>
                </div>
              )}

              {/* Health advice */}
              {selectedMealLog.healthAdvice && (
                <div className="space-y-2 bg-gradient-to-br from-emerald-500/5 via-emerald-500/5 to-transparent dark:from-slate-900/30 dark:to-transparent border border-emerald-200/40 dark:border-slate-800 rounded-3xl p-5">
                  <h4 className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-emerald-500" />
                    AI Dietolog tavsiyasi
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
                <Trash2 size={14} />
                {locale === 'ru' ? 'Удалить' : locale === 'en' ? 'Delete' : 'O\'chirish'}
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
