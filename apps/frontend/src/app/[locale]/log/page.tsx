'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from '@/i18n/routing';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Sparkles, Trash2, X, Loader2 } from 'lucide-react';
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

  // Fetch logs for the selected date
  const { data, isLoading } = useQuery<LogData>({
    queryKey: ['daily-logs', selectedDate],
    queryFn: async () => {
      const { data } = await api.get(`/meals?date=${selectedDate}`);
      return data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/meals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(locale === 'ru' ? 'Успешно удалено!' : "O'chirildi!");
      setSelectedMealLog(null);
    },
    onError: () => {
      toast.error(locale === 'ru' ? 'Ошибка удаления' : "O'chirishda xatolik");
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
        return { emoji: '🌅', name: mt('breakfast') };
      case 'LUNCH':
        return { emoji: '☀️', name: mt('lunch') };
      case 'DINNER':
        return { emoji: '🌙', name: mt('dinner') };
      case 'SNACK':
      default:
        return { emoji: '🍎', name: mt('snack') };
    }
  };

  const caloriesSummary = data?.summary.totalCalories || 0;
  const proteinSummary = data?.summary.totalProtein || 0;
  const fatSummary = data?.summary.totalFat || 0;
  const carbsSummary = data?.summary.totalCarbs || 0;

  return (
    <main className="min-h-screen pb-16 bg-transparent">
      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-200/40 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/10 backdrop-blur-md sticky top-0 z-30 transition-all">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-xs font-bold text-gray-505 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-all hover:-translate-x-1"
        >
          <ArrowLeft size={16} />
          {locale === 'ru' ? 'В дашборд' : locale === 'en' ? 'Dashboard' : 'Dashboardga'}
        </button>
        <h1 className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          {t('history_title')}
        </h1>
      </header>

      <div className="max-w-4xl mx-auto px-6 mt-6 space-y-6">
        
        {/* Date Navigation Panel */}
        <div className="glass rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={handlePrevDay}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-gray-650 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-gray-50 transition-all active:scale-95 cursor-pointer"
              title={t('prev_day')}
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="text-center sm:text-left min-w-[140px] xs:min-w-[180px] sm:min-w-[200px] px-2">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sana / Дата</p>
              <p className="text-xs font-black text-gray-900 dark:text-white capitalize truncate mt-0.5">
                {formatFriendlyDate(selectedDate)}
              </p>
            </div>

            <button
              onClick={handleNextDay}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-gray-650 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-gray-50 transition-all active:scale-95 cursor-pointer"
              title={t('next_day')}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Quick Today Button */}
            <button
              onClick={handleSetToday}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-xs font-bold text-gray-700 dark:text-slate-300 hover:text-emerald-500 dark:hover:text-emerald-400 transition-all active:scale-95 shadow-sm cursor-pointer"
            >
              {locale === 'ru' ? 'Сегодня' : locale === 'en' ? 'Today' : 'Bugun'}
            </button>

            {/* Datepicker Picker */}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-xs font-bold text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all cursor-pointer"
              />
              <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="glass rounded-3xl p-16 shadow-xl flex justify-center items-center dark:bg-slate-900/50 dark:border-slate-800">
            <Loader2 size={32} className="text-emerald-500 animate-spin" />
          </div>
        )}

        {/* Content after load */}
        {!isLoading && data && (
          <>
            {/* Daily Summary Stats Card */}
            {data.logs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Calories summary */}
                <div className="glass rounded-3xl p-5 shadow-xl dark:bg-slate-900/50 dark:border-slate-800 md:col-span-1 flex flex-col justify-center">
                  <p className="text-[10px] text-gray-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                    {t('consumed')}
                  </p>
                  <p className="text-xl font-black text-gray-900 dark:text-white mt-1">
                    {Math.round(caloriesSummary)} <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450">kkal</span>
                  </p>
                </div>

                {/* Macronutrient breakdown */}
                <div className="glass rounded-3xl p-5 shadow-xl dark:bg-slate-900/50 dark:border-slate-800 md:col-span-3">
                  <p className="text-[10px] text-gray-455 dark:text-slate-500 font-bold uppercase tracking-wider mb-3">
                    Makronutrientlar / Макронутриенты
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Protein bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">{t('protein')}</span>
                        <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300">{Math.round(proteinSummary)}g</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (proteinSummary / 100) * 100)}%` }} />
                      </div>
                    </div>

                    {/* Fat bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">{t('fat')}</span>
                        <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300">{Math.round(fatSummary)}g</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (fatSummary / 80) * 100)}%` }} />
                      </div>
                    </div>

                    {/* Carbs bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wide">{t('carbs')}</span>
                        <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300">{Math.round(carbsSummary)}g</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (carbsSummary / 300) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Meals Log List */}
            {data.logs.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center shadow-xl dark:bg-slate-900/50 dark:border-slate-800 flex flex-col justify-center items-center space-y-3">
                <span className="text-3xl">🍽️</span>
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400">{t('no_meals_date')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.logs.map((log) => {
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
                          <div className="w-full h-full flex items-center justify-center text-xl bg-green-50 dark:bg-slate-950/20">
                            {mealDetails.emoji}
                          </div>
                        )}
                      </div>

                      {/* Text info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-green-50/80 dark:bg-emerald-950/30 px-2 py-0.5 rounded-md">
                            {mealDetails.name}
                          </span>
                        </div>
                        <p className="font-black text-gray-900 dark:text-white truncate mt-1.5 text-sm">{log.foodName}</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wide mt-0.5">
                          {log.portionSize}
                        </p>
                      </div>

                      {/* Calories badge */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-slate-800/50 px-3 py-1.5 rounded-xl block">
                          {Math.round(Number(log.calories))} <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-450">kcal</span>
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
                  <p className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-450 rounded-xl text-xs font-black border border-red-100/50 dark:border-red-950/30">
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
                  <h4 className="text-[10px] font-bold text-gray-450 dark:text-slate-400 uppercase tracking-wider">
                    🍎 Tarkibi
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMealLog.ingredients.map((ing, idx) => (
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
                    ⚖️ Vazn taqsimoti
                  </h4>
                  <p className="text-xs text-gray-650 dark:text-slate-350 leading-relaxed font-bold bg-white/40 dark:bg-slate-950/40 p-4 rounded-2xl border border-gray-100/50 dark:border-slate-800/80">
                    {selectedMealLog.portionBreakdown}
                  </p>
                </div>
              )}

              {/* Health advice */}
              {selectedMealLog.healthAdvice && (
                <div className="space-y-2 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-transparent dark:from-slate-900/30 dark:to-transparent border border-green-200/40 dark:border-slate-800 rounded-3xl p-5">
                  <h4 className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
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
