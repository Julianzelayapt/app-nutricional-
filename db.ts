
import { createClient } from '@supabase/supabase-js';
import { Food, Diet, TrackingLog, WeekPlan, DayPlan, Meal, FoodEntry } from './types';

// HARDCODED CREDENTIALS - Forced fonctionnement as requested
const supabaseUrl = 'https://gpvjpjtpsjpeztbwufld.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdmpwanRwc2pwZXp0Ynd1ZmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Njg4OTUsImV4cCI6MjA4NTQ0NDg5NX0.Lj0vfRi8X2H-AuRs3N_-S8lzH-VipixgCjvnduGQaQc';

export const supabase = createClient(supabaseUrl, supabaseKey);

export class DB {
  // --- UTILS ---
  private static genId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // --- FOODS ---
  static async getFoods(): Promise<Food[]> {
    const { data, error } = await supabase.from('foods').select('*').order('name');
    if (error) return [];
    return data.map(f => ({
      id: f.id,
      name: f.name,
      unit: f.unit,
      calories: Number(f.calories),
      protein: Number(f.protein),
      carbs: Number(f.carbs),
      fats: Number(f.fats),
      imageUrl: f.image_url
    }));
  }

  static async saveFood(food: Food) {
    await supabase.from('foods').upsert({
      id: food.id,
      name: food.name,
      unit: food.unit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      image_url: food.imageUrl
    });
  }

  static async deleteFood(id: string) {
    await supabase.from('foods').delete().eq('id', id);
  }

  // --- DIETS (HIERARCHICAL) ---
  static async getDiets(): Promise<Diet[]> {
    const { data: diets, error } = await supabase.from('diets').select('*').order('created_at', { ascending: false });
    if (error) return [];

    return diets.map(d => ({
      id: d.id,
      name: d.name,
      weeks: [], // Empty for list view to save time
      targetCalories: Number(d.target_calories),
      targetProtein: Number(d.target_protein),
      targetCarbs: Number(d.target_carbs),
      targetFats: Number(d.target_fats),
      createdAt: d.created_at
    }));
  }

  static async getDietById(id: string): Promise<Diet | null> {
    const { data: d, error } = await supabase
      .from('diets')
      .select(`
        *,
        weeks (
          *,
          days (
            *,
            meals (
              *,
              meal_items (
                id,
                food_id,
                quantity
              )
            )
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !d) return null;

    // Transform hierarchical data to match Diet type
    const weekPlans: WeekPlan[] = (d.weeks || [])
      .sort((a: any, b: any) => a.week_number - b.week_number)
      .map((w: any) => ({
        id: w.id,
        weekNumber: w.week_number,
        days: (w.days || [])
          .sort((a: any, b: any) => a.day_of_week - b.day_of_week)
          .map((day: any) => ({
            id: day.id,
            dayOfWeek: day.day_of_week,
            meals: (day.meals || [])
              .sort((a: any, b: any) => a.sort_order - b.sort_order)
              .map((m: any) => ({
                id: m.id,
                name: m.name,
                imageUrl: m.image_url,
                order: m.sort_order,
                foodEntries: (m.meal_items || []).map((i: any) => ({
                  id: i.id,
                  foodId: i.food_id,
                  quantity: Number(i.quantity)
                }))
              }))
          }))
      }));

    return {
      id: d.id,
      name: d.name,
      weeks: weekPlans,
      targetCalories: Number(d.target_calories),
      targetProtein: Number(d.target_protein),
      targetCarbs: Number(d.target_carbs),
      targetFats: Number(d.target_fats),
      createdAt: d.created_at
    };
  }

  static async saveDiet(diet: Diet) {
    try {
      // 1. Save Diet Info
      const { error: dErr } = await supabase.from('diets').upsert({
        id: diet.id,
        name: diet.name,
        target_calories: diet.targetCalories,
        target_protein: diet.targetProtein,
        target_carbs: diet.targetCarbs,
        target_fats: diet.targetFats
      });
      if (dErr) console.error("Error saving diet info:", dErr);

      // 2. Synchronization Logic (Weeks -> Days -> Meals -> Items)
      const validWeekIds = diet.weeks.map(w => w.id);

      // Deletions: Remove weeks no longer in the diet
      if (validWeekIds.length > 0) {
        await supabase.from('weeks').delete().eq('diet_id', diet.id).not('id', 'in', validWeekIds);
      } else {
        await supabase.from('weeks').delete().eq('diet_id', diet.id);
      }

      for (const w of diet.weeks) {
        await supabase.from('weeks').upsert({ id: w.id, diet_id: diet.id, week_number: w.weekNumber });

        const validDayIds = w.days.map(d => d.id);
        if (validDayIds.length > 0) {
          await supabase.from('days').delete().eq('week_id', w.id).not('id', 'in', validDayIds);
        } else {
          await supabase.from('days').delete().eq('week_id', w.id);
        }

        for (const d of w.days) {
          await supabase.from('days').upsert({ id: d.id, week_id: w.id, day_of_week: d.dayOfWeek });

          const validMealIds = d.meals.map(m => m.id);

          // 2.3.1. Identify meals to DELETE
          const { data: currentMeals } = await supabase.from('meals').select('id').eq('day_id', d.id);
          if (currentMeals) {
            const mealsToDelete = currentMeals.filter(cm => !validMealIds.includes(cm.id)).map(cm => cm.id);

            if (mealsToDelete.length > 0) {
              // FIRST: Delete items (child) of meals to be deleted
              await supabase.from('meal_items').delete().in('meal_id', mealsToDelete);

              // SECOND: Delete the meals (parent)
              await supabase.from('meals').delete().in('id', mealsToDelete);
            }
          }

          for (const m of d.meals) {
            await supabase.from('meals').upsert({
              id: m.id,
              day_id: d.id,
              name: m.name,
              sort_order: m.order,
              image_url: m.imageUrl
            });

            // Food Entries sync (Meal Items)
            // Always clean and re-insert for the remaining meals
            await supabase.from('meal_items').delete().eq('meal_id', m.id);
            if (m.foodEntries.length > 0) {
              const { error: itemError } = await supabase.from('meal_items').insert(
                m.foodEntries.map(fe => ({
                  id: fe.id,
                  meal_id: m.id,
                  food_id: fe.foodId,
                  quantity: fe.quantity
                }))
              );
              if (itemError) console.error("Error inserting meal items:", itemError);
            }
          }
        }
      }
    } catch (err) {
      console.error("Critical error in saveDiet:", err);
    }
  }

  static async deleteDiet(id: string) {
    await supabase.from('diets').delete().eq('id', id);
  }

  // --- TRACKING ---
  static async getTracking(dietId: string): Promise<Record<string, TrackingLog>> {
    const { data, error } = await supabase
      .from('tracking_logs') // You'll need to create this table too if tracking is needed
      .select('date, completed_meal_ids')
      .eq('diet_id', dietId);

    if (error) return {};
    const map: Record<string, TrackingLog> = {};
    data.forEach((row: any) => {
      map[row.date] = { date: row.date, completedMealIds: row.completed_meal_ids };
    });
    return map;
  }

  static async saveTrackingLog(dietId: string, log: TrackingLog) {
    await supabase.from('tracking_logs').upsert({
      diet_id: dietId,
      date: log.date,
      completed_meal_ids: log.completedMealIds
    });
  }
}
