
import React from 'react';
import { useI18n } from '../i18n';

interface MacroTrackerProps {
  current: { kcal: number; pro: number; carb: number; fat: number };
  target: { kcal: number; pro: number; carb: number; fat: number };
}

export const MacroTracker: React.FC<MacroTrackerProps> = ({ current, target }) => {
  const { t } = useI18n();
  const getProgress = (curr: number, tar: number) => Math.min((curr / Math.max(tar, 1)) * 100, 100);

  const ProgressBar = ({ label, curr, tar, color }: { label: string; curr: number; tar: number; color: string }) => (
    <div className="flex-1 px-1">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
        <span className="text-sub">{label}</span>
        <span className={`${curr > tar ? 'text-red-500' : 'text-main'}`}>{Math.round(curr)}g / {tar}g</span>
      </div>
      <div className="h-2 bg-[var(--progress-track)] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ease-out shadow-sm ${color}`}
          style={{ width: `${getProgress(curr, tar)}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="sticky top-0 z-50 ios-blur macro-tracker-print px-6 pt-6 pb-6 border-b border-[var(--border-color)]">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6 pr-24">
          <div className="h-14 w-14 rounded-full flex items-center justify-center relative shadow-sm">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="28" cy="28" r="24"
                stroke="var(--progress-track)" strokeWidth="4" fill="transparent"
              />
              <circle
                cx="28" cy="28" r="24"
                stroke="var(--accent-color)" strokeWidth="4" fill="transparent"
                strokeDasharray={150.8}
                strokeDashoffset={150.8 - (getProgress(current.kcal, target.kcal) / 100) * 150.8}
                className="transition-all duration-1000 ease-in-out"
                strokeLinecap="round"
              />
            </svg>
            <i className="fas fa-fire absolute text-blue-500 text-sm"></i>
          </div>
          <div className="text-right">
            <h2 className="text-[10px] font-black text-sub uppercase tracking-[0.2em] mb-1">{t('daily_targets')}</h2>
            <div className="text-3xl font-black text-main tracking-tighter">
              {Math.round(current.kcal)} <span className="text-sm text-sub font-bold">/ {target.kcal} kcal</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <ProgressBar label={t('protein').substring(0, 3)} curr={current.pro} tar={target.pro} color="bg-orange-500" />
          <ProgressBar label={t('carbs').substring(0, 4)} curr={current.carb} tar={target.carb} color="bg-emerald-500" />
          <ProgressBar label={t('fats').substring(0, 3)} curr={current.fat} tar={target.fat} color="bg-yellow-500" />
        </div>
      </div>
    </div>
  );
};
