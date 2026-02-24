
import React, { useState, useEffect, useRef } from 'react';
import { Diet, Food, Meal, FoodEntry, WeekPlan, DayPlan } from '../types';
import { DB } from '../db';
import { FoodLibrary } from './FoodLibrary';
import { MealItem } from './MealItem';
import { useI18n } from '../i18n';

interface DietEditorProps {
  dietId: string; // "new" or an actual ID
  onBack: () => void;
}

export const DietEditor: React.FC<DietEditorProps> = ({ dietId, onBack }) => {
  const { t } = useI18n();
  const [diet, setDiet] = useState<Diet | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string>('');
  const [activeWeekIdx, setActiveWeekIdx] = useState(0);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [foods, setFoods] = useState<Food[]>([]);
  const [showFoodLibrary, setShowFoodLibrary] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isEditingMeal, setIsEditingMeal] = useState<Meal | null>(null);
  const [selectedFoodId, setSelectedFoodId] = useState('');
  const [foodQty, setFoodQty] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showDayCopyModal, setShowDayCopyModal] = useState(false);
  const [copyTargets, setCopyTargets] = useState<{ weekIdx: number; dayIdx: number }[]>([]);

  const initializedRef = useRef<string | null>(null);

  // 1. INITIAL LOAD
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const loadedFoods = await DB.getFoods();
      setFoods(loadedFoods);

      if (dietId && dietId !== 'new') {
        const found = await DB.getDietById(dietId);
        if (found) setDiet(found);
      } else {
        const dId = 'd-' + Math.random().toString(36).substr(2, 9);
        const newDiet: Diet = {
          id: dId,
          name: t('new_plan'),
          targetCalories: 2000,
          targetProtein: 150,
          targetCarbs: 200,
          targetFats: 70,
          weeks: [{
            id: 'w-1-' + Date.now(),
            weekNumber: 1,
            days: [0, 1, 2, 3, 4, 5, 6].map(d => ({
              id: `d-${d}-${Date.now()}`,
              dayOfWeek: d,
              meals: []
            }))
          }]
        };
        setDiet(newDiet);
      }
      setLoading(false);
      initializedRef.current = dietId;
    };
    loadData();
  }, [dietId, t]);

  // 2. AUTO-SAVE (Single Diet)
  useEffect(() => {
    if (diet && initializedRef.current && !loading) {
      setSaving(true);
      DB.saveDiet(diet)
        .catch(console.error)
        .finally(() => setTimeout(() => setSaving(false), 1000));
    }
  }, [diet, loading]);

  // 3. FOOD CATALOG SYNC (Reload on open/close library)
  useEffect(() => {
    if (!showFoodLibrary) {
      DB.getFoods().then(setFoods);
    }
  }, [showFoodLibrary]);

  if (loading || !diet) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sub font-black uppercase text-[10px] tracking-widest">{t('loading')}...</span>
      </div>
    );
  }

  const currentWeek = diet.weeks[activeWeekIdx] || diet.weeks[0];
  const currentDayPlan = currentWeek.days[activeDayIdx] || currentWeek.days[0];

  const updateDiet = (updater: (d: Diet) => Diet) => {
    setDiet(prev => prev ? updater(prev) : null);
  };

  const addWeek = () => {
    updateDiet(d => {
      const nextNum = d.weeks.length + 1;
      const newWeek: WeekPlan = {
        id: `w-${nextNum}-${Date.now()}`,
        weekNumber: nextNum,
        days: [0, 1, 2, 3, 4, 5, 6].map(day => ({
          id: `d-${day}-${Date.now()}`,
          dayOfWeek: day,
          meals: []
        }))
      };
      setTimeout(() => setActiveWeekIdx(nextNum - 1), 0);
      return { ...d, weeks: [...d.weeks, newWeek] };
    });
  };

  const deleteWeek = (idx: number) => {
    if (diet.weeks.length <= 1) return;
    if (!confirm('¿Eliminar esta semana?')) return;
    updateDiet(d => {
      const filtered = d.weeks.filter((_, i) => i !== idx);
      const renumbered = filtered.map((w, i) => ({ ...w, weekNumber: i + 1 }));
      return { ...d, weeks: renumbered };
    });
    setActiveWeekIdx(prev => Math.max(0, prev - 1));
  };

  const duplicateWeek = (idx: number) => {
    updateDiet(d => {
      const weekToCopy = JSON.parse(JSON.stringify(d.weeks[idx]));
      const nextNum = d.weeks.length + 1;
      weekToCopy.id = `w-${nextNum}-${Date.now()}`;
      weekToCopy.weekNumber = nextNum;
      weekToCopy.days.forEach((day: any) => {
        day.id = `d-${day.dayOfWeek}-${Date.now()}-${Math.random()}`;
        day.meals.forEach((m: any) => {
          m.id = 'm-' + Math.random().toString(36).substr(2, 9);
          m.foodEntries.forEach((fe: any) => fe.id = 'fe-' + Math.random().toString(36).substr(2, 9));
        });
      });
      setTimeout(() => setActiveWeekIdx(nextNum - 1), 0);
      return { ...d, weeks: [...d.weeks, weekToCopy] };
    });
  };

  const duplicateDayAcrossAllWeeks = (dayIdx: number) => {
    updateDiet(d => {
      const sourceDay = d.weeks[activeWeekIdx].days[activeDayIdx];
      const updatedWeeks = d.weeks.map((w) => {
        const mealsToCopy = JSON.parse(JSON.stringify(sourceDay.meals));
        mealsToCopy.forEach((m: any) => {
          m.id = 'm-' + Math.random().toString(36).substr(2, 9);
          m.foodEntries.forEach((fe: any) => fe.id = 'fe-' + Math.random().toString(36).substr(2, 9));
        });
        return {
          ...w,
          days: w.days.map((day, dIdx) => dIdx === dayIdx ? { ...day, meals: mealsToCopy } : day)
        };
      });
      return { ...d, weeks: updatedWeeks };
    });
    alert(`${t('done')}`);
  };

  const applyDayCopy = (targets: { weekIdx: number; dayIdx: number }[]) => {
    if (targets.length === 0) return;
    updateDiet(d => {
      const sourceDay = d.weeks[activeWeekIdx].days[activeDayIdx];
      const updatedWeeks = d.weeks.map((w, wIdx) => {
        const relevantTargets = targets.filter(t => t.weekIdx === wIdx);
        if (relevantTargets.length === 0) return w;

        const newDays = w.days.map((day, dIdx) => {
          const isTarget = relevantTargets.some(t => t.dayIdx === dIdx);
          if (!isTarget) return day;

          const mealsToCopy = JSON.parse(JSON.stringify(sourceDay.meals));
          mealsToCopy.forEach((m: any) => {
            m.id = 'm-' + Math.random().toString(36).substr(2, 9);
            m.foodEntries.forEach((fe: any) => fe.id = 'fe-' + Math.random().toString(36).substr(2, 9));
          });
          return { ...day, meals: mealsToCopy };
        });

        return { ...w, days: newDays };
      });
      return { ...d, weeks: updatedWeeks };
    });
    setShowDayCopyModal(false);
    alert(`${t('done')}`);
  };

  const clearDay = (idx: number) => {
    if (!confirm('¿Limpiar día?')) return;
    updateDiet(d => {
      const updatedWeeks = d.weeks.map((w, wIdx) => {
        if (wIdx === activeWeekIdx) {
          return {
            ...w,
            days: w.days.map((day, dIdx) => dIdx === idx ? { ...day, meals: [] } : day)
          };
        }
        return w;
      });
      return { ...d, weeks: updatedWeeks };
    });
  };

  const handleMacroChange = (key: keyof Diet, value: string) => {
    const cleaned = value.replace(/^0+/, '');
    const num = cleaned === '' ? 0 : parseInt(cleaned);
    updateDiet(d => ({ ...d, [key]: num }));
  };

  const dayNames = [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')];
  const selectedFood = foods.find(f => f.id === selectedFoodId);

  const copyLink = (role: 'CLIENT' | 'CREATOR') => {
    // USE HASH PARAMETERS to survive server redirects/rewrites
    const url = `${window.location.origin}${window.location.pathname}#dietId=${diet.id}&role=${role}`;
    navigator.clipboard.writeText(url);
    alert('Link Seguro Copiado! (Formato Hash)');
  };

  return (
    <div className="pb-40 max-w-lg mx-auto min-h-screen printable-content">
      <div className="flex justify-between items-center py-6 sticky top-0 ios-blur z-40 mb-4 px-6 no-print">
        <button onClick={onBack} className="text-sub hover:text-main font-black p-2"><i className="fas fa-chevron-left"></i></button>
        <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 truncate max-w-[50%]">{diet.name}</h1>
      </div>

      <div className="px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <section className="space-y-4 no-print">
          <div className="ios-card rounded-[32px] p-8 border border-[var(--border-color)]">
            <label className="text-[10px] text-sub font-black uppercase mb-3 block tracking-[0.2em] opacity-40">{t('plan_title')}</label>
            <input
              value={diet.name}
              onChange={e => setDiet(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="bg-transparent text-3xl font-black w-full outline-none text-main placeholder:opacity-10"
              placeholder="Nombre del plan..."
              autoFocus={dietId === 'new'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setShowFoodLibrary(true)} className="ios-card py-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all text-main border border-[var(--border-color)]">
              <i className="fas fa-layer-group text-orange-500 text-base"></i> {t('catalog')}
            </button>
            <button onClick={() => window.print()} className="ios-card py-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all text-main border border-[var(--border-color)]">
              <i className="fas fa-file-pdf text-blue-500 text-base"></i> {t('export_pdf')}
            </button>
            <button onClick={() => setShowShareOptions(true)} className="col-span-2 ios-card py-5 rounded-[24px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all text-main border border-[var(--border-color)]">
              <i className="fas fa-share-alt text-green-500 text-base"></i> Compartir Links
            </button>
          </div>
        </section>

        {showShareOptions && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 no-print" onClick={() => setShowShareOptions(false)}>
            <div className="ios-card w-full max-w-sm rounded-[40px] p-8 border border-[var(--border-color)] bg-[var(--card-bg)] space-y-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-main uppercase tracking-widest">Compartir Plan</h3>
                <button onClick={() => setShowShareOptions(false)} className="w-8 h-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center text-sub"><i className="fas fa-times"></i></button>
              </div>

              <div className="space-y-4">
                <button onClick={() => copyLink('CLIENT')} className="w-full bg-blue-600 text-white py-4 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                  <i className="fas fa-user mr-2"></i> Copiar Link Cliente
                </button>
                <button onClick={() => copyLink('CREATOR')} className="w-full bg-[var(--input-bg)] text-main py-4 rounded-[24px] font-black text-sm uppercase tracking-widest border border-[var(--border-color)] active:scale-95 transition-all">
                  <i className="fas fa-edit mr-2"></i> Copiar Link Editor
                </button>
              </div>
              <p className="text-[9px] text-center text-sub opacity-50 font-medium">
                Nota: Los datos se guardan en este dispositivo.
              </p>
            </div>
          </div>
        )}

        <section className="no-print grid grid-cols-2 gap-3">
          <div className="ios-card rounded-[28px] p-5 flex flex-col gap-1 relative overflow-hidden bg-gradient-to-br from-[var(--card-bg)] to-[var(--input-bg)] border border-[var(--border-color)]">
            <span className="text-[9px] font-black text-sub uppercase tracking-[0.2em] opacity-40">{t('week')}</span>
            <select
              className="bg-transparent font-black text-base uppercase outline-none text-main cursor-pointer"
              value={activeWeekIdx}
              onChange={e => setActiveWeekIdx(Number(e.target.value))}
            >
              {diet.weeks.map((w, i) => (
                <option key={w.id} value={i} className="bg-[var(--card-bg)] text-main">
                  {t('week')} {w.weekNumber}
                </option>
              ))}
            </select>
            <div className="flex gap-3 mt-3 pt-3 border-t border-[var(--border-color)]">
              <button onClick={addWeek} className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{t('new_week')}</button>
              <button onClick={() => duplicateWeek(activeWeekIdx)} className="text-[9px] font-black text-sub uppercase tracking-widest">Copy</button>
              <button onClick={() => deleteWeek(activeWeekIdx)} className="text-[9px] font-black text-red-500/40 uppercase tracking-widest">Del</button>
            </div>
          </div>

          <div className="ios-card rounded-[28px] p-5 flex flex-col gap-1 relative overflow-hidden bg-gradient-to-br from-[var(--card-bg)] to-[var(--input-bg)] border border-[var(--border-color)]">
            <span className="text-[9px] font-black text-sub uppercase tracking-[0.2em] opacity-40">{t('day')}</span>
            <select
              className="bg-transparent font-black text-base uppercase outline-none text-main cursor-pointer"
              value={activeDayIdx}
              onChange={e => setActiveDayIdx(Number(e.target.value))}
            >
              {dayNames.map((name, i) => (
                <option key={i} value={i} className="bg-[var(--card-bg)] text-main">{name}</option>
              ))}
            </select>
            <div className="flex gap-3 mt-3 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => setShowDayCopyModal(true)}
                className="text-[9px] font-black text-blue-500 uppercase tracking-widest"
              >
                {t('copy_to')}
              </button>
              <button onClick={() => clearDay(activeDayIdx)} className="text-[9px] font-black text-red-500/40 uppercase tracking-widest">Clear</button>
            </div>
          </div>
        </section>

        <section className="ios-card rounded-[40px] p-8 grid grid-cols-2 gap-8 relative overflow-hidden border border-[var(--border-color)]">
          <div className="col-span-2 flex justify-between items-center border-b border-[var(--border-color)] pb-4">
            <h3 className="text-[10px] font-black text-sub uppercase tracking-[0.2em] opacity-40">{t('daily_targets')}</h3>
            <i className="fas fa-bullseye text-blue-500 opacity-20"></i>
          </div>
          {[
            { key: 'targetCalories', label: t('calories'), unit: 'kcal' },
            { key: 'targetProtein', label: t('protein'), unit: 'g' },
            { key: 'targetCarbs', label: t('carbs'), unit: 'g' },
            { key: 'targetFats', label: t('fats'), unit: 'g' }
          ].map((item) => (
            <div key={item.key} className="relative">
              <label className="text-[9px] text-sub font-black uppercase mb-2 block tracking-widest opacity-40">{item.label}</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={diet[item.key as keyof Diet] === 0 ? '' : diet[item.key as keyof Diet] as any}
                  onChange={e => handleMacroChange(item.key as any, e.target.value)}
                  placeholder="0"
                  className="bg-[var(--input-bg)] p-5 rounded-[20px] text-2xl font-black w-full outline-none text-center text-main border border-transparent focus:border-blue-500/40 transition-all placeholder:opacity-5"
                />
              </div>
            </div>
          ))}
        </section>

        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-end px-2">
            <h3 className="text-3xl font-black uppercase tracking-tighter text-main">{t('meals')}</h3>
            <button
              onClick={() => setIsEditingMeal({ id: 'm-' + Date.now(), name: 'Nueva Comida', order: currentDayPlan.meals.length, foodEntries: [] })}
              className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 shadow-xl shadow-blue-600/30 transition-all"
            >
              <i className="fas fa-plus mr-2"></i> {t('add')}
            </button>
          </div>

          <div className="space-y-5">
            {currentDayPlan.meals.map(m => (
              <MealItem
                key={m.id}
                meal={m}
                foods={foods}
                isCompleted={false}
                onToggle={() => { }}
                isCreatorView
                onEdit={setIsEditingMeal}
                onDelete={(id) => {
                  if (!confirm(t('delete_meal_confirm'))) return;
                  updateDiet(d => {
                    const updatedWeeks = d.weeks.map((w, wIdx) => {
                      if (wIdx === activeWeekIdx) {
                        return {
                          ...w,
                          days: w.days.map((day, dIdx) => dIdx === activeDayIdx ? { ...day, meals: day.meals.filter(x => x.id !== id) } : day)
                        };
                      }
                      return w;
                    });
                    return { ...d, weeks: updatedWeeks };
                  });
                }}
              />
            ))}
            {currentDayPlan.meals.length === 0 && (
              <div className="py-24 text-center text-sub italic font-bold ios-card rounded-[40px] border-dashed border-2 border-[var(--border-color)] flex flex-col items-center justify-center gap-6 group hover:border-blue-500/20 transition-colors">
                <div className="w-20 h-20 bg-[var(--input-bg)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="fas fa-utensils opacity-20 text-4xl text-blue-500"></i>
                </div>
                <span className="text-[10px] px-12 uppercase tracking-widest opacity-30 leading-relaxed font-black">{t('add_meal_prompt')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEditingMeal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-2xl flex items-end no-print">
          <div className="ios-card w-full rounded-t-[56px] p-10 max-h-[95vh] overflow-y-auto no-scrollbar shadow-[0_-20px_80px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-500 border-t border-[var(--border-color)]">
            <div className="flex justify-between items-center mb-12">
              <h3 className="text-4xl font-black tracking-tighter uppercase text-main">{t('plate_editor')}</h3>
              <button onClick={() => setIsEditingMeal(null)} className="h-12 w-12 bg-[var(--input-bg)] rounded-full text-main flex items-center justify-center border border-[var(--border-color)] active:scale-90 transition-all"><i className="fas fa-times"></i></button>
            </div>

            <div className="space-y-12">
              <div className="space-y-8">
                <div className="ios-card bg-[var(--input-bg)] p-8 rounded-[32px] border border-[var(--border-color)]">
                  <label className="text-[10px] text-sub font-black uppercase mb-4 block tracking-[0.2em] opacity-40">{t('meal_name')}</label>
                  <input
                    value={isEditingMeal.name}
                    onChange={e => setIsEditingMeal({ ...isEditingMeal, name: e.target.value })}
                    className="bg-transparent w-full outline-none text-2xl font-black text-main placeholder:opacity-10"
                    placeholder="Nombre de la comida..."
                  />
                </div>
                <div className="ios-card bg-[var(--input-bg)] p-8 rounded-[32px] border border-[var(--border-color)]">
                  <label className="text-[10px] text-sub font-black uppercase mb-4 block tracking-[0.2em] opacity-40">{t('image_url')}</label>
                  <div className="flex gap-4">
                    <input
                      value={isEditingMeal.imageUrl || ''}
                      onChange={e => setIsEditingMeal({ ...isEditingMeal, imageUrl: e.target.value })}
                      className="flex-1 bg-transparent outline-none text-[10px] font-black uppercase tracking-widest text-blue-500 placeholder:opacity-20"
                      placeholder="https://images..."
                    />
                    {isEditingMeal.imageUrl && (
                      <div className="h-20 w-20 rounded-[20px] overflow-hidden border-2 border-[var(--border-color)] shadow-2xl rotate-3">
                        <img src={isEditingMeal.imageUrl} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[11px] text-sub font-black uppercase tracking-[0.3em] opacity-40 ml-2">{t('ingredients')}</label>
                <div className="space-y-4">
                  {isEditingMeal.foodEntries.map(fe => {
                    const f = foods.find(x => x.id === fe.foodId);
                    return (
                      <div key={fe.id} className="flex justify-between items-center bg-[var(--input-bg)] p-6 rounded-[24px] border border-[var(--border-color)] group animate-in fade-in">
                        <div className="flex flex-col">
                          <span className="text-lg font-black text-main leading-none mb-1">{f?.name}</span>
                          <span className="text-[9px] text-blue-500 font-black uppercase tracking-[0.2em]">
                            {fe.quantity} {f?.unit === '100g' ? 'gramos' : 'unidades'}
                          </span>
                        </div>
                        <button onClick={() => setIsEditingMeal({ ...isEditingMeal, foodEntries: isEditingMeal.foodEntries.filter(x => x.id !== fe.id) })} className="text-red-500/60 p-4 bg-red-500/5 rounded-2xl hover:bg-red-500/10 transition-colors"><i className="fas fa-trash-alt text-sm"></i></button>
                      </div>
                    );
                  })}
                </div>

                <div className="p-8 bg-blue-600/5 rounded-[40px] border border-blue-500/10 space-y-6 mt-8">
                  <div className="flex flex-col gap-3">
                    <label className="text-[9px] text-blue-500 font-black uppercase tracking-[0.2em] ml-1">{t('add_from_catalog')}</label>
                    <select
                      className="w-full bg-[var(--input-bg)] p-6 rounded-[24px] text-sm font-black outline-none border border-[var(--border-color)] text-main cursor-pointer"
                      value={selectedFoodId}
                      onChange={e => setSelectedFoodId(e.target.value)}
                    >
                      <option value="" className="bg-[var(--card-bg)]">{t('choose_food')}</option>
                      {foods.map(f => (
                        <option key={f.id} value={f.id} className="text-main bg-[var(--card-bg)]">
                          {f.name} ({f.unit === '100g' ? '100g' : 'u'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-1 flex flex-col gap-3">
                      <label className="text-[9px] text-blue-500 font-black uppercase tracking-[0.2em] ml-1">{t('quantity')}</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0"
                          className="w-full bg-[var(--input-bg)] p-6 rounded-[24px] text-center font-black text-3xl border border-[var(--border-color)] text-main outline-none focus:border-blue-500 transition-all"
                          value={foodQty}
                          onChange={e => setFoodQty(e.target.value.replace(/^0+/, ''))}
                        />
                        <span className="absolute right-6 bottom-3 text-[9px] font-black text-sub uppercase tracking-[0.2em] opacity-40">
                          {selectedFood?.unit === '100g' ? 'g' : 'u'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!selectedFoodId || !foodQty) return;
                        const newFe: FoodEntry = { id: 'fe-' + Math.random().toString(36).substr(2, 9), foodId: selectedFoodId, quantity: parseFloat(foodQty) };
                        setIsEditingMeal({ ...isEditingMeal, foodEntries: [...isEditingMeal.foodEntries, newFe] });
                        setFoodQty('');
                      }}
                      className="bg-blue-600 text-white w-24 h-24 self-end rounded-[32px] shadow-2xl shadow-blue-600/40 flex items-center justify-center active:scale-90 transition-all border-b-8 border-black/20"
                    >
                      <i className="fas fa-plus text-3xl"></i>
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={() => {
                if (!isEditingMeal) return;
                updateDiet(d => {
                  const updatedWeeks = d.weeks.map(w => {
                    if (w.id === currentWeek.id) {
                      const updatedDays = w.days.map(day => {
                        if (day.id === currentDayPlan.id) {
                          const exists = day.meals.find(m => m.id === isEditingMeal.id);
                          return {
                            ...day,
                            meals: exists
                              ? day.meals.map(m => m.id === isEditingMeal.id ? isEditingMeal : m)
                              : [...day.meals, isEditingMeal]
                          };
                        }
                        return day;
                      });
                      return { ...w, days: updatedDays };
                    }
                    return w;
                  });
                  return { ...d, weeks: updatedWeeks };
                });
                setIsEditingMeal(null);
              }} className="w-full bg-blue-600 py-8 rounded-[40px] font-black text-2xl shadow-2xl shadow-blue-600/40 text-white active:scale-95 transition-all mt-6 uppercase tracking-[0.2em]">
                {t('done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDayCopyModal && (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 no-print" onClick={() => setShowDayCopyModal(false)}>
          <div className="ios-card w-full max-w-sm rounded-[40px] p-8 border border-[var(--border-color)] bg-[var(--card-bg)] space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-main uppercase tracking-widest">Copiar {dayNames[activeDayIdx]}</h3>
              <button onClick={() => setShowDayCopyModal(false)} className="w-8 h-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center text-sub"><i className="fas fa-times"></i></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-sub uppercase tracking-widest opacity-40">Acciones rápidas</p>
                <button
                  onClick={() => {
                    const targets = dayNames.map((_, i) => ({ weekIdx: activeWeekIdx, dayIdx: i })).filter(t => t.dayIdx !== activeDayIdx);
                    applyDayCopy(targets);
                  }}
                  className="w-full bg-blue-600/10 text-blue-500 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all text-center"
                >
                  Copiar a todos los días (Semana {activeWeekIdx + 1})
                </button>
                <button
                  onClick={() => {
                    const targets = diet.weeks.map((_, i) => ({ weekIdx: i, dayIdx: activeDayIdx })).filter(t => !(t.weekIdx === activeWeekIdx && t.dayIdx === activeDayIdx));
                    applyDayCopy(targets);
                  }}
                  className="w-full bg-blue-600/10 text-blue-500 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all text-center"
                >
                  Copiar a todas las semanas ({dayNames[activeDayIdx]})
                </button>
                <button
                  onClick={() => {
                    const targets: { weekIdx: number; dayIdx: number }[] = [];
                    diet.weeks.forEach((_, w) => {
                      dayNames.forEach((_, d) => {
                        if (!(w === activeWeekIdx && d === activeDayIdx)) targets.push({ weekIdx: w, dayIdx: d });
                      });
                    });
                    applyDayCopy(targets);
                  }}
                  className="w-full bg-orange-500/10 text-orange-500 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all text-center"
                >
                  Copiar a TODO el plan
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-sub uppercase tracking-widest opacity-40">Seleccionar día específico</p>
                <div className="grid grid-cols-2 gap-2">
                  {dayNames.map((name, i) => (
                    <button
                      key={i}
                      disabled={i === activeDayIdx}
                      onClick={() => applyDayCopy([{ weekIdx: activeWeekIdx, dayIdx: i }])}
                      className="bg-[var(--input-bg)] py-3 rounded-xl font-black text-[9px] uppercase tracking-widest text-main border border-[var(--border-color)] disabled:opacity-20 active:scale-95 transition-all"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFoodLibrary && <FoodLibrary onClose={() => setShowFoodLibrary(false)} />}
    </div>
  );
};
