
import React, { useState, useEffect } from 'react';
import { Food } from '../types';
import { DB } from '../db';
import { useI18n } from '../i18n';

interface FoodLibraryProps {
  onClose: () => void;
}

export const FoodLibrary: React.FC<FoodLibraryProps> = ({ onClose }) => {
  const { t } = useI18n();
  const [foods, setFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newFood, setNewFood] = useState<Partial<Food>>({
    name: '', unit: '100g', calories: 0, protein: 0, carbs: 0, fats: 0, imageUrl: ''
  });

  useEffect(() => {
    loadFoods();
  }, []);

  const loadFoods = async () => {
    setLoading(true);
    const data = await DB.getFoods();
    setFoods(data);
    setLoading(false);
  };

  const filteredFoods = foods.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async () => {
    if (!newFood.name) return;
    const food: Food = {
      // Use crypto.randomUUID if available, else fallback, or let Supabase handle handle it?
      // Since our types expect ID, and we might use it for UI keys immediately.
      id: crypto.randomUUID ? crypto.randomUUID() : 'f-' + Date.now(),
      name: newFood.name!,
      unit: (newFood.unit as any) || '100g',
      calories: Number(newFood.calories) || 0,
      protein: Number(newFood.protein) || 0,
      carbs: Number(newFood.carbs) || 0,
      fats: Number(newFood.fats) || 0,
      imageUrl: newFood.imageUrl // Added image URL
    };

    // Optimistic update
    setFoods(prev => [...prev, food]);
    setIsAdding(false);
    setNewFood({ name: '', unit: '100g', calories: 0, protein: 0, carbs: 0, fats: 0, imageUrl: '' });

    // Save to DB
    await DB.saveFood(food);
    // Reload to confirm ID if needed, but for now optimistic is fine
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete_food_confirm'))) return;

    // Optimistic update
    setFoods(prev => prev.filter(f => f.id !== id));

    await DB.deleteFood(id);
  };

  return (
    <div className="fixed inset-0 z-[120] ios-blur flex flex-col animate-in fade-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="flex justify-between items-center p-8 pb-4">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-main">{t('catalog')}</h2>
        <button onClick={onClose} className="bg-[var(--input-bg)] h-12 w-12 rounded-full flex items-center justify-center text-main border border-[var(--border-color)]">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="px-8 mb-6 no-print flex gap-3">
        <div className="flex-1 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl px-5 flex items-center shadow-inner">
          <i className="fas fa-search text-sub mr-3 text-xs"></i>
          <input
            className="bg-transparent border-none outline-none py-3 w-full text-sm text-main font-bold placeholder:opacity-30"
            placeholder={t('search_food')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 px-8 pb-32 no-scrollbar">
        <div className="px-1 mb-2">
          <span className="text-[10px] font-black text-sub uppercase tracking-[0.2em]">{filteredFoods.length} {t('available_foods')}</span>
        </div>

        {loading ? (
          <div className="text-center py-10 opacity-50">Cargando...</div>
        ) : (
          filteredFoods.map(food => (
            <div key={food.id} className="ios-card rounded-[28px] p-5 flex justify-between items-center group active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4 flex-1">
                {food.imageUrl && (
                  <img src={food.imageUrl} alt={food.name} className="w-12 h-12 rounded-xl object-cover" />
                )}
                <div>
                  <h3 className="font-black text-lg text-main leading-tight mb-2">{food.name}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-black uppercase tracking-widest">
                    <span className="text-sub bg-[var(--input-bg)] px-2 py-0.5 rounded-lg border border-[var(--border-color)]">{food.calories} kcal</span>
                    <span className="text-orange-500">P: {food.protein}g</span>
                    <span className="text-emerald-500">C: {food.carbs}g</span>
                    <span className="text-yellow-500">F: {food.fats}g</span>
                    <span className="text-sub opacity-30 italic">{food.unit === '100g' ? '/ 100g' : '/ u'}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(food.id)}
                className="text-sub hover:text-red-500 p-3 bg-[var(--input-bg)] rounded-xl ml-3 transition-all opacity-40 group-hover:opacity-100"
              >
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
            </div>
          ))
        )}

        {!loading && filteredFoods.length === 0 && (
          <div className="py-20 text-center text-sub italic font-bold opacity-30 flex flex-col items-center gap-4">
            <i className="fas fa-search text-3xl opacity-10"></i>
            <span>{t('no_foods_found')}</span>
          </div>
        )}
      </div>

      {/* FIXED DRAWER FOR ADDING FOOD - ENSURES SCROLLING TO ALL FIELDS */}
      {isAdding && (
        <div className="absolute inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-end no-print">
          <div className="w-full ios-card rounded-t-[40px] p-8 space-y-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <i className="fas fa-plus-circle text-blue-500"></i>
                <h3 className="text-sm font-black uppercase tracking-widest text-main">{t('new_food')}</h3>
              </div>
              <button onClick={() => setIsAdding(false)} className="h-8 w-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center text-main">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[9px] text-sub font-black uppercase mb-2 block tracking-widest">{t('food_name')}</label>
                <input
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl p-4 text-main font-black outline-none focus:border-blue-500/30"
                  value={newFood.name}
                  onChange={e => setNewFood({ ...newFood, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[9px] text-sub font-black uppercase mb-2 block tracking-widest">{t('image_url')}</label>
                <input
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl p-4 text-[10px] text-blue-500 font-bold outline-none focus:border-blue-500/30"
                  placeholder="https://..."
                  value={newFood.imageUrl || ''}
                  onChange={e => setNewFood({ ...newFood, imageUrl: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-sub font-black uppercase mb-2 block tracking-widest">{t('unit')}</label>
                  <select
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl p-4 text-main font-black outline-none cursor-pointer"
                    value={newFood.unit}
                    onChange={e => setNewFood({ ...newFood, unit: e.target.value as any })}
                  >
                    <option value="100g">{t('every_100g')}</option>
                    <option value="1unit">{t('per_unit')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-sub font-black uppercase mb-2 block tracking-widest">{t('calories')}</label>
                  <input
                    type="number"
                    className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-2xl p-4 text-main font-black text-center outline-none focus:border-blue-500/30"
                    value={newFood.calories || ''}
                    onChange={e => setNewFood({ ...newFood, calories: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-500/5 p-3 rounded-2xl border border-orange-500/10">
                  <label className="text-[8px] text-orange-500 font-black uppercase mb-1 block text-center tracking-tighter">{t('protein')}</label>
                  <input type="number" className="w-full bg-transparent text-main font-black text-center outline-none text-base" value={newFood.protein || ''} onChange={e => setNewFood({ ...newFood, protein: Number(e.target.value) })} />
                </div>
                <div className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/10">
                  <label className="text-[8px] text-emerald-500 font-black uppercase mb-1 block text-center tracking-tighter">{t('carbs')}</label>
                  <input type="number" className="w-full bg-transparent text-main font-black text-center outline-none text-base" value={newFood.carbs || ''} onChange={e => setNewFood({ ...newFood, carbs: Number(e.target.value) })} />
                </div>
                <div className="bg-yellow-500/5 p-3 rounded-2xl border border-yellow-500/10">
                  <label className="text-[8px] text-yellow-500 font-black uppercase mb-1 block text-center tracking-tighter">{t('fats')}</label>
                  <input type="number" className="w-full bg-transparent text-main font-black text-center outline-none text-base" value={newFood.fats || ''} onChange={e => setNewFood({ ...newFood, fats: Number(e.target.value) })} />
                </div>
              </div>

              <button onClick={handleAdd} className="w-full bg-blue-600 py-5 rounded-2xl font-black text-white shadow-xl shadow-blue-600/30 active:scale-95 transition-all uppercase tracking-widest text-sm">
                {t('save_catalog')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
