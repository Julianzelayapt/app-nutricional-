
export enum UserRole {
  CREATOR = 'CREATOR',
  CLIENT = 'CLIENT'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface Food {
  id: string;
  name: string;
  unit: '100g' | 'unit' | 'ml';
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  imageUrl?: string;
}

export interface FoodEntry {
  id: string;
  foodId: string;
  quantity: number;
}

export interface Meal {
  id: string;
  name: string;
  imageUrl?: string;
  foodEntries: FoodEntry[];
  order: number;
}

export interface DayPlan {
  id: string;
  dayOfWeek: number; // 0 (Mon) to 6 (Sun)
  meals: Meal[];
}

export interface WeekPlan {
  id: string;
  weekNumber: number;
  days: DayPlan[];
}

export interface Diet {
  id: string;
  name: string;
  weeks: WeekPlan[];
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  createdAt?: string;
}

export interface TrackingLog {
  date: string; // ISO Date
  completedMealIds: string[];
}
