
import React from 'react';
import { Diet, Food, Meal } from '../types';
import { useI18n } from '../i18n';

interface ClientWeeklyTableProps {
    diet: Diet;
    foods: Food[];
    activeWeekIdx: number;
}

export const ClientWeeklyTable: React.FC<ClientWeeklyTableProps> = ({ diet, foods, activeWeekIdx }) => {
    const { t } = useI18n();
    const currentWeek = diet.weeks[activeWeekIdx] || diet.weeks[0];
    const dayNames = [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')];

    const getMealSummary = (meal: Meal) => {
        const totalKcal = meal.foodEntries.reduce((acc, entry) => {
            const food = foods.find(f => f.id === entry.foodId);
            if (!food) return acc;
            const mult = food.unit === '100g' ? entry.quantity / 100 : entry.quantity;
            return acc + (food.calories * mult);
        }, 0);
        return Math.round(totalKcal);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-[10px] font-black text-sub uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                <i className="fas fa-calendar-week text-blue-500"></i>
                {t('weekly_view')} - {t('week')} {currentWeek.weekNumber}
            </h2>

            {/* Mobile-friendly horizontal scroll table */}
            <div className="overflow-x-auto no-scrollbar -mx-6 px-6">
                <div className="flex gap-3 min-w-max pb-4">
                    {currentWeek.days.map((day, idx) => (
                        <div
                            key={day.id}
                            className="ios-card rounded-[28px] p-5 w-40 flex-shrink-0 border border-[var(--border-color)] space-y-4"
                        >
                            {/* Day Header */}
                            <div className="text-center border-b border-[var(--border-color)] pb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                                    {dayNames[idx]}
                                </span>
                            </div>

                            {/* Meals List */}
                            <div className="space-y-3 min-h-[120px]">
                                {day.meals.length > 0 ? (
                                    day.meals.map((meal, mIdx) => (
                                        <div key={meal.id} className="space-y-1">
                                            <div className="flex items-start gap-2">
                                                <span className="text-[9px] font-black text-sub bg-[var(--input-bg)] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                                                    {mIdx + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-main truncate leading-tight">{meal.name}</p>
                                                    <p className="text-[9px] text-sub font-medium">{getMealSummary(meal)} kcal</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <span className="text-[9px] text-sub opacity-40 italic">-</span>
                                    </div>
                                )}
                            </div>

                            {/* Day Total */}
                            <div className="pt-3 border-t border-[var(--border-color)] text-center">
                                <span className="text-[9px] font-black text-sub uppercase tracking-widest">
                                    {day.meals.reduce((acc, m) => acc + getMealSummary(m), 0)} kcal
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
