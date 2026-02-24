
import React, { useState, useEffect } from 'react';
import { Diet, TrackingLog, Food } from '../types';
import { DB } from '../db';
import { MacroTracker } from './MacroTracker';
import { MealItem } from './MealItem';
import { ClientWeeklyTable } from './ClientWeeklyTable';
import { ShoppingList } from './ShoppingList';
import { useI18n } from '../i18n';

interface DietViewerProps {
  dietId: string;
}

type ViewTab = 'daily' | 'weekly' | 'shopping';

export const DietViewer: React.FC<DietViewerProps> = ({ dietId }) => {
  const { t } = useI18n();
  const [diet, setDiet] = useState<Diet | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [tracking, setTracking] = useState<Record<string, TrackingLog>>({});
  const [activeWeekIdx, setActiveWeekIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<ViewTab>('daily');
  const [loading, setLoading] = useState(true);

  // Start with today, but allow user to change
  const [selectedDayIdx, setSelectedDayIdx] = useState((new Date().getDay() + 6) % 7);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      // 1. Load Foods
      const loadedFoods = await DB.getFoods();
      setFoods(loadedFoods);

      // 2. Load Diet
      try {
        const found = await DB.getDietById(dietId);
        if (found) {
          setDiet(found);
          const logs = await DB.getTracking(dietId);
          setTracking(logs);
        } else {
          setDiet(null);
        }
      } catch (err) {
        console.error("Error loading diet:", err);
        setDiet(null);
      }
      setLoading(false);
    };

    if (dietId) {
      initData();
    } else {
      setLoading(false);
    }
  }, [dietId]);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-black">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-white/40 text-xs font-black uppercase tracking-widest">Cargando Plan...</p>
      </div>
    );
  }

  if (!diet) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center bg-black">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <i className="fas fa-exclamation-triangle text-3xl text-red-500"></i>
        </div>
        <h2 className="text-2xl font-black text-white mb-2">{t('plan_deleted') || 'Plan no encontrado'}</h2>
        <p className="text-white/40 text-sm mb-8 leading-relaxed">
          El enlace que intentas abrir no es válido o ha sido eliminado por el entrenador.
        </p>
        <button
          onClick={() => window.location.href = window.location.origin}
          className="bg-blue-600 text-white px-8 py-4 rounded-[20px] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20"
        >
          {t('back')}
        </button>
      </div>
    );
  }

  const currentWeek = diet.weeks?.[activeWeekIdx] || diet.weeks?.[0];

  if (!currentWeek) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10 text-center bg-black">
        <h2 className="text-xl font-black text-white mb-4">Plan en preparación</h2>
        <p className="text-white/40 text-sm mb-8">El entrenador aún no ha configurado las semanas de este plan.</p>
        <button onClick={() => window.location.reload()} className="text-blue-500 font-bold uppercase tracking-widest text-xs">Reintentar</button>
      </div>
    );
  }

  const currentDayPlan = currentWeek.days?.find(d => d.dayOfWeek === selectedDayIdx);
  const todayTracking = tracking[todayStr] || { date: todayStr, completedMealIds: [] };

  const currentMacros = todayTracking.completedMealIds.reduce((acc, mealId) => {
    // FIX: Only count meals that belong to the current day plan being viewed
    if (!currentDayPlan.meals.some(m => m.id === mealId)) return acc;

    const meal = currentDayPlan.meals.find(m => m.id === mealId);
    if (!meal) return acc;
    return meal.foodEntries.reduce((mAcc, entry) => {
      const food = foods.find(f => f.id === entry.foodId);
      if (!food) return mAcc;

      // Robust unit check: match "100" followed by "g", "gr", or "gramo" (case-insensitive)
      const is100g = /100\s*(g|gr|gramo)/i.test(food.unit || '');
      const mult = is100g ? entry.quantity / 100 : entry.quantity;

      return {
        kcal: mAcc.kcal + (food.calories * mult),
        pro: mAcc.pro + (food.protein * mult),
        carb: mAcc.carb + (food.carbs * mult),
        fat: mAcc.fat + (food.fats * mult)
      };
    }, acc);
  }, { kcal: 0, pro: 0, carb: 0, fat: 0 });

  const toggleMeal = async (mealId: string) => {
    // Optimistic Update
    const isCompleted = todayTracking.completedMealIds.includes(mealId);
    const newCompleted = isCompleted
      ? todayTracking.completedMealIds.filter(id => id !== mealId)
      : [...todayTracking.completedMealIds, mealId];

    const newLog = { ...todayTracking, completedMealIds: newCompleted };
    const newTracking = { ...tracking, [todayStr]: newLog };

    setTracking(newTracking);

    // Save to DB
    await DB.saveTrackingLog(dietId, newLog);
  };

  const dayNames = [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')];
  const formattedDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="pb-40 printable-content">
      <MacroTracker
        current={currentMacros}
        target={{ kcal: diet.targetCalories, pro: diet.targetProtein, carb: diet.targetCarbs, fat: diet.targetFats }}
      />

      <div className="max-w-md mx-auto px-6 mt-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 no-print">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'daily'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'ios-card border border-[var(--border-color)] text-sub'
              }`}
          >
            <i className="fas fa-calendar-day"></i>
            {t('daily_view')}
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'weekly'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'ios-card border border-[var(--border-color)] text-sub'
              }`}
          >
            <i className="fas fa-calendar-week"></i>
            {t('weekly_view')}
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={`flex-1 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'shopping'
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
              : 'ios-card border border-[var(--border-color)] text-sub'
              }`}
          >
            <i className="fas fa-shopping-cart"></i>
            {t('shopping_list')}
          </button>
        </div>

        {/* Week Selector (shown for all tabs) */}
        <div className="ios-card rounded-[24px] p-4 flex items-center justify-between mb-6 no-print">
          <button
            onClick={() => setActiveWeekIdx(Math.max(0, activeWeekIdx - 1))}
            disabled={activeWeekIdx === 0}
            className="w-10 h-10 rounded-full bg-[var(--input-bg)] flex items-center justify-center text-sub disabled:opacity-20"
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className="text-center">
            <span className="text-[9px] font-black text-sub uppercase tracking-widest">{t('week')}</span>
            <p className="text-2xl font-black text-main">{currentWeek.weekNumber}</p>
          </div>
          <button
            onClick={() => setActiveWeekIdx(Math.min(diet.weeks.length - 1, activeWeekIdx + 1))}
            disabled={activeWeekIdx >= diet.weeks.length - 1}
            className="w-10 h-10 rounded-full bg-[var(--input-bg)] flex items-center justify-center text-sub disabled:opacity-20"
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        {/* Daily View */}
        {activeTab === 'daily' && (
          <>
            <div className="flex justify-between items-start mb-8 no-print">
              <div>
                <h1 className="text-4xl font-black text-main tracking-tighter capitalize">{dayNames[selectedDayIdx]}</h1>
                <p className="text-sub font-bold text-sm tracking-wide mt-1">
                  {selectedDayIdx === (new Date().getDay() + 6) % 7 ? `${t('today')}, ${formattedDate}` : t('plan_view')}
                </p>
              </div>
              <button onClick={() => window.print()} className="bg-[var(--input-bg)] h-12 w-12 rounded-2xl flex items-center justify-center border border-[var(--border-color)] text-blue-500">
                <i className="fas fa-file-pdf"></i>
              </button>
            </div>

            {/* Day Selector */}
            <div className="ios-card rounded-[24px] p-4 mb-6 no-print">
              <div className="flex justify-between">
                {dayNames.map((name, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDayIdx(i)}
                    className={`w-10 h-10 rounded-full font-black text-[10px] uppercase transition-all ${selectedDayIdx === i
                      ? 'bg-blue-600 text-white'
                      : i === (new Date().getDay() + 6) % 7
                        ? 'bg-green-500/20 text-green-500'
                        : 'text-sub hover:bg-[var(--input-bg)]'
                      }`}
                  >
                    {name.charAt(0)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 px-1 mb-2">
                <div className={`h-2 w-2 rounded-full ${selectedDayIdx === (new Date().getDay() + 6) % 7 ? 'bg-green-500 animate-pulse' : 'bg-blue-600'}`}></div>
                <h2 className="text-[10px] font-black text-sub uppercase tracking-[0.3em]">
                  {selectedDayIdx === (new Date().getDay() + 6) % 7 ? t('today_meals') : `${t('day')} ${dayNames[selectedDayIdx]}`}
                </h2>
              </div>

              {currentDayPlan ? (
                currentDayPlan.meals.map(meal => (
                  <MealItem
                    key={meal.id}
                    meal={meal}
                    foods={foods}
                    isCompleted={todayTracking.completedMealIds.includes(meal.id)}
                    onToggle={toggleMeal}
                  />
                ))
              ) : (
                <div className="py-20 text-center text-sub italic ios-card rounded-[32px] border-dashed border-2 border-[var(--border-color)]">
                  <p className="px-10 text-xs">No hay comidas configuradas para este día.</p>
                </div>
              )}
            </div>

            {currentDayPlan && currentDayPlan.meals.length === 0 && (
              <div className="py-24 text-center text-sub italic ios-card rounded-[32px] border-dashed border-2 border-[var(--border-color)] flex flex-col items-center gap-4">
                <i className="fas fa-utensils opacity-10 text-5xl"></i>
                <p className="px-10 text-xs">{t('no_meals_assigned')}</p>
              </div>
            )}
          </>
        )}

        {/* Weekly View */}
        {activeTab === 'weekly' && (
          <ClientWeeklyTable
            diet={diet}
            foods={foods}
            activeWeekIdx={activeWeekIdx}
          />
        )}

        {/* Shopping List */}
        {activeTab === 'shopping' && (
          <ShoppingList
            diet={diet}
            foods={foods}
            activeWeekIdx={activeWeekIdx}
          />
        )}
      </div>
    </div>
  );
};
