
import React from 'react';
import { Diet, Food } from '../types';
import { useI18n } from '../i18n';

interface ShoppingListProps {
    diet: Diet;
    foods: Food[];
    activeWeekIdx: number;
}

interface ShoppingItem {
    food: Food;
    totalQuantity: number;
}

export const ShoppingList: React.FC<ShoppingListProps> = ({ diet, foods, activeWeekIdx }) => {
    const { t } = useI18n();
    const currentWeek = diet.weeks[activeWeekIdx] || diet.weeks[0];

    // Aggregate all food entries from all meals in the week
    const shoppingItems: ShoppingItem[] = React.useMemo(() => {
        const itemMap = new Map<string, { food: Food; totalQuantity: number }>();

        currentWeek.days.forEach(day => {
            day.meals.forEach(meal => {
                meal.foodEntries.forEach(entry => {
                    const food = foods.find(f => f.id === entry.foodId);
                    if (food) {
                        const existing = itemMap.get(food.id);
                        if (existing) {
                            existing.totalQuantity += entry.quantity;
                        } else {
                            itemMap.set(food.id, { food, totalQuantity: entry.quantity });
                        }
                    }
                });
            });
        });

        return Array.from(itemMap.values()).sort((a, b) => a.food.name.localeCompare(b.food.name));
    }, [currentWeek, foods]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-[10px] font-black text-sub uppercase tracking-[0.3em] flex items-center gap-2">
                    <i className="fas fa-shopping-cart text-green-500"></i>
                    {t('shopping_list')} - {t('week')} {currentWeek.weekNumber}
                </h2>
                <span className="text-[9px] font-bold text-sub bg-[var(--input-bg)] px-3 py-1.5 rounded-full">
                    {shoppingItems.length} items
                </span>
            </div>

            {shoppingItems.length > 0 ? (
                <div className="space-y-3">
                    {shoppingItems.map(item => (
                        <div
                            key={item.food.id}
                            className="ios-card rounded-[24px] p-5 flex items-center gap-4 border border-[var(--border-color)] group hover:border-green-500/30 transition-colors"
                        >
                            {/* Star indicator */}
                            <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-green-500 text-xl font-black">*</span>
                            </div>

                            {/* Food info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-main truncate">{item.food.name}</h3>
                                <p className="text-[10px] text-sub font-medium uppercase tracking-widest">
                                    {t('total_quantity')}: {Math.round(item.totalQuantity)} {item.food.unit === '100g' ? 'g' : 'u'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center text-sub italic ios-card rounded-[32px] border-dashed border-2 border-[var(--border-color)] flex flex-col items-center gap-4">
                    <i className="fas fa-shopping-basket opacity-10 text-5xl"></i>
                    <p className="px-10 text-xs">{t('no_items')}</p>
                </div>
            )}
        </div>
    );
};
