
import React from 'react';
import { Meal, Food } from '../types';

interface MealItemProps {
  meal: Meal;
  foods: Food[];
  isCompleted: boolean;
  onToggle: (mealId: string) => void;
  isCreatorView?: boolean;
  onEdit?: (meal: Meal) => void;
  onDelete?: (mealId: string) => void;
}

export const MealItem: React.FC<MealItemProps> = ({
  meal, foods, isCompleted, onToggle, isCreatorView, onEdit, onDelete
}) => {
  const mealMacros = meal.foodEntries.reduce((acc, entry) => {
    const food = foods.find(f => f.id === entry.foodId);
    if (!food) return acc;

    // Robust unit check: match "100" followed by "g", "gr", or "gramo" (case-insensitive)
    const is100g = /100\s*(g|gr|gramo)/i.test(food.unit || '');
    const mult = is100g ? entry.quantity / 100 : entry.quantity;

    return {
      kcal: acc.kcal + (food.calories * mult),
      pro: acc.pro + (food.protein * mult),
      carb: acc.carb + (food.carbs * mult),
      fat: acc.fat + (food.fats * mult)
    };
  }, { kcal: 0, pro: 0, carb: 0, fat: 0 });

  return (
    <div className={`ios-card meal-item-card rounded-[28px] overflow-hidden transition-all duration-300 ${isCompleted ? 'opacity-40 grayscale-[0.8]' : 'active:scale-[0.98]'}`}>
      {meal.imageUrl && (
        <div className="w-full h-40 overflow-hidden relative group meal-item-image-container">
          <img src={meal.imageUrl} alt={meal.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent no-print" />
        </div>
      )}

      <div className="p-6 meal-item-content">
        <div className="flex justify-between items-start mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black text-main tracking-tight">{meal.name}</h3>
              {meal.externalLink && (
                <a href={meal.externalLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 no-print">
                  <i className="fas fa-link text-xs"></i>
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-sub">
              <span>{Math.round(mealMacros.kcal)} kcal</span>
              <span className="opacity-20">|</span>
              <span>P: {Math.round(mealMacros.pro)}g</span>
              <span>C: {Math.round(mealMacros.carb)}g</span>
              <span>F: {Math.round(mealMacros.fat)}g</span>
            </div>
          </div>

          {!isCreatorView ? (
            <button
              onClick={() => onToggle(meal.id)}
              className={`h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-sm no-print ${isCompleted ? 'bg-green-500 text-white' : 'bg-[var(--input-bg)] border border-[var(--border-color)] text-sub'}`}
            >
              {isCompleted ? <i className="fas fa-check"></i> : <i className="fas fa-circle-notch opacity-20"></i>}
            </button>
          ) : (
            <div className="flex gap-1 no-print">
              <button onClick={() => onEdit?.(meal)} className="text-sub hover:text-blue-500 p-2 transition-colors">
                <i className="fas fa-pen-nib text-sm"></i>
              </button>
              <button onClick={() => onDelete?.(meal.id)} className="text-sub hover:text-red-500 p-2 transition-colors">
                <i className="fas fa-trash-alt text-sm"></i>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4 border-t border-[var(--border-color)] meal-item-ingredients">
          {meal.foodEntries.map((entry) => {
            const food = foods.find(f => f.id === entry.foodId);
            if (!food) return null;
            return (
              <div key={entry.id} className="flex justify-between items-center group ingredient-row">
                <span className="text-sm font-bold text-main">{food.name}</span>
                <span className="text-[10px] font-black uppercase bg-[var(--input-bg)] text-sub px-3 py-1.5 rounded-full border border-[var(--border-color)]">
                  {entry.quantity}{food.unit === '100g' ? 'g' : 'u'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
