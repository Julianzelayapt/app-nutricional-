
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type Language = 'ES' | 'EN' | 'IT';

const translations = {
  ES: {
    app_title: "MacroMind",
    perfect_plan: "Construye el Plan Perfecto",
    im_builder: "Acceso Entrenador",
    im_client: "Acceso Cliente",
    my_plans: "Mis Planes",
    builder_panel: "Panel de Builder",
    close: "Cerrar",
    new_plan: "Nuevo Plan",
    diet_list: "Listado de Dietas",
    client_view: "Vista Cliente",
    builder_mode: "Modo Builder",
    logout: "Salir",
    save: "Guardar",
    back: "Volver",
    plan_title: "Título del Plan",
    catalog: "Catálogo",
    export_pdf: "Exportar PDF",
    week: "Semana",
    day: "Día",
    new_week: "+ Nueva",
    daily_targets: "Objetivos Diarios",
    calories: "Calorías",
    protein: "Proteína",
    carbs: "Carbos",
    fats: "Grasas",
    meals: "Comidas",
    add: "AGREGAR",
    copy_to: "Copiar a...",
    delete_meal_confirm: "¿Eliminar esta comida?",
    add_meal_prompt: "Toca 'Agregar' para este día.",
    plate_editor: "Editor de Plato",
    meal_name: "Nombre de la comida",
    image_url: "Imagen URL (Opcional)",
    ingredients: "Ingredientes",
    add_from_catalog: "Añadir del Catálogo",
    choose_food: "Elegir alimento...",
    quantity: "Cantidad",
    done: "LISTO",
    search_food: "Buscar por nombre...",
    new_food: "Nuevo Alimento",
    food_name: "Nombre",
    unit: "Unidad",
    every_100g: "Cada 100 gr",
    per_unit: "Por Unidad",
    save_catalog: "Guardar en Catálogo",
    available_foods: "Alimentos disponibles",
    no_foods_found: "No se encontraron alimentos.",
    delete_food_confirm: "¿Eliminar este alimento del catálogo global?",
    today: "Hoy",
    today_meals: "Comidas de Hoy",
    plan_view: "Vista de Plan",
    no_meals_assigned: "Sin comidas asignadas para este día.",
    mon: "Lunes", tue: "Martes", wed: "Miércoles", thu: "Jueves", fri: "Viernes", sat: "Sábado", sun: "Domingo",
    delete_plan_confirm: "¿Estás seguro de eliminar este plan?",
    calendar: "Calendario",
    weekly_view: "Vista Semanal",
    daily_view: "Vista Diaria",
    shopping_list: "Lista de Compras",
    shopping_items: "Artículos para Comprar",
    no_items: "Sin artículos en la lista",
    total_quantity: "Cantidad Total",
    delete: "Eliminar",
    cancel: "Cancelar",
    plan_deleted: "Plan eliminado",
    nutrition: "Nutrición"
  },
  EN: {
    app_title: "MacroMind",
    perfect_plan: "Build the Perfect Plan",
    im_builder: "Coach Access",
    im_client: "Client Access",
    my_plans: "My Plans",
    builder_panel: "Builder Panel",
    close: "Close",
    new_plan: "New Plan",
    diet_list: "Diets List",
    client_view: "Client View",
    builder_mode: "Builder Mode",
    logout: "Logout",
    save: "Save",
    back: "Back",
    plan_title: "Plan Title",
    catalog: "Catalog",
    export_pdf: "Export PDF",
    week: "Week",
    day: "Day",
    new_week: "+ New",
    daily_targets: "Daily Targets",
    calories: "Calories",
    protein: "Protein",
    carbs: "Carbs",
    fats: "Fats",
    meals: "Meals",
    add: "ADD",
    copy_to: "Copy to...",
    delete_meal_confirm: "Delete this meal?",
    add_meal_prompt: "Tap 'Add' for this day.",
    plate_editor: "Plate Editor",
    meal_name: "Meal Name",
    image_url: "Image URL (Optional)",
    ingredients: "Ingredients",
    add_from_catalog: "Add from Catalog",
    choose_food: "Choose food...",
    quantity: "Quantity",
    done: "DONE",
    search_food: "Search by name...",
    new_food: "New Food",
    food_name: "Name",
    unit: "Unit",
    every_100g: "Every 100g",
    per_unit: "Per Unit",
    save_catalog: "Save to Catalog",
    available_foods: "Available Foods",
    no_foods_found: "No foods found.",
    delete_food_confirm: "Delete this food from the global catalog?",
    today: "Today",
    today_meals: "Today's Meals",
    plan_view: "Plan View",
    no_meals_assigned: "No meals assigned for this day.",
    mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
    delete_plan_confirm: "Are you sure you want to delete this plan?",
    calendar: "Calendar",
    weekly_view: "Weekly View",
    daily_view: "Daily View",
    shopping_list: "Shopping List",
    shopping_items: "Items to Buy",
    no_items: "No items in the list",
    total_quantity: "Total Quantity",
    delete: "Delete",
    cancel: "Cancel",
    plan_deleted: "Plan deleted",
    nutrition: "Nutrition"
  },
  IT: {
    app_title: "MacroMind",
    perfect_plan: "Costruisci il Piano Perfetto",
    im_builder: "Accesso Allenatore",
    im_client: "Accesso Cliente",
    my_plans: "I Miei Piani",
    builder_panel: "Pannello Builder",
    close: "Chiudi",
    new_plan: "Nuovo Piano",
    diet_list: "Elenco Diete",
    client_view: "Vista Cliente",
    builder_mode: "Modalità Builder",
    logout: "Esci",
    save: "Salva",
    back: "Indietro",
    plan_title: "Titolo del Piano",
    catalog: "Catalogo",
    export_pdf: "Esporta PDF",
    week: "Settimana",
    day: "Giorno",
    new_week: "+ Nuova",
    daily_targets: "Obiettivi Giornalieri",
    calories: "Calorie",
    protein: "Proteine",
    carbs: "Carboidrati",
    fats: "Grassi",
    meals: "Pasti",
    add: "AGGIUNGI",
    copy_to: "Copia in...",
    delete_meal_confirm: "Eliminare questo pasto?",
    add_meal_prompt: "Tocca 'Aggiungi' per questo giorno.",
    plate_editor: "Editor del Piatto",
    meal_name: "Nome del pasto",
    image_url: "URL Immagine (Opzionale)",
    ingredients: "Ingredienti",
    add_from_catalog: "Aggiungi dal Catalogo",
    choose_food: "Scegli alimento...",
    quantity: "Quantità",
    done: "FATTO",
    search_food: "Cerca per nome...",
    new_food: "Nuovo Alimento",
    food_name: "Nome",
    unit: "Unità",
    every_100g: "Ogni 100g",
    per_unit: "Per Unità",
    save_catalog: "Salva nel Catalogo",
    available_foods: "Alimenti disponibili",
    no_foods_found: "Nessun alimento trovato.",
    delete_food_confirm: "Eliminare questo alimento dal catalogo globale?",
    today: "Oggi",
    today_meals: "Pasti di Oggi",
    plan_view: "Vista Piano",
    no_meals_assigned: "Nessun pasto assegnato per questo giorno.",
    mon: "Lunedì", tue: "Martedì", wed: "Mercoledì", thu: "Giovedì", fri: "Venerdì", sat: "Sabato", sun: "Domenica",
    delete_plan_confirm: "Sei sicuro di voler eliminare questo piano?",
    calendar: "Calendario",
    weekly_view: "Vista Settimanale",
    daily_view: "Vista Giornaliera",
    shopping_list: "Lista della Spesa",
    shopping_items: "Articoli da Acquistare",
    no_items: "Nessun articolo nella lista",
    total_quantity: "Quantità Totale",
    delete: "Elimina",
    cancel: "Annulla",
    plan_deleted: "Piano eliminato",
    nutrition: "Nutrizione"
  }
};

interface I18nContextType {
  lang: Language;
  t: (key: keyof typeof translations['ES']) => string;
  changeLanguage: (newLang: Language) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>((localStorage.getItem('mm_lang') as Language) || 'ES');

  const t = useCallback((key: keyof typeof translations['ES']): string => {
    return translations[lang][key] || translations['ES'][key] || key;
  }, [lang]);

  const changeLanguage = useCallback((newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('mm_lang', newLang);
  }, []);

  return (
    <I18nContext.Provider value={{ lang, t, changeLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
