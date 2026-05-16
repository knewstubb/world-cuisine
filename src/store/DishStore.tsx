import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Dish } from '../types/Dish';

const STORAGE_KEY = 'cooking-world-map-dishes';

// --- Pure logic functions (exported for testing) ---

export function loadDishesFromStorage(): Dish[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Dish[];
  } catch {
    return [];
  }
}

export function saveDishesToStorage(dishes: Dish[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dishes));
  } catch {
    // Silently handle quota exceeded or other write errors
  }
}

export function filterDishesForCountry(dishes: Dish[], countryCode: string): Dish[] {
  return dishes.filter((d) => d.countryCode === countryCode);
}

export function collectAllDishNames(dishes: Dish[]): string[] {
  return dishes.map((d) => d.name);
}

export function collectCountriesWithDishes(dishes: Dish[]): Set<string> {
  return new Set(dishes.map((d) => d.countryCode));
}

export function isValidDishName(name: string): boolean {
  return name.trim().length > 0;
}

export function createDish(countryCode: string, name: string): Dish {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    countryCode,
    createdAt: new Date().toISOString(),
  };
}

export function addDishPure(dishes: Dish[], countryCode: string, name: string): { dishes: Dish[]; added: boolean } {
  if (!isValidDishName(name)) {
    return { dishes, added: false };
  }
  const newDish = createDish(countryCode, name);
  return { dishes: [...dishes, newDish], added: true };
}

export function deleteDishPure(dishes: Dish[], dishId: string): Dish[] {
  return dishes.filter((d) => d.id !== dishId);
}

// --- React Context ---

interface DishStoreContextValue {
  dishes: Dish[];
  getDishesForCountry: (countryCode: string) => Dish[];
  addDish: (countryCode: string, name: string) => boolean;
  deleteDish: (dishId: string) => void;
  getAllDishNames: () => string[];
  getCountriesWithDishes: () => Set<string>;
}

const DishStoreContext = createContext<DishStoreContextValue | null>(null);

export function DishStoreProvider({ children }: { children: ReactNode }) {
  const [dishes, setDishes] = useState<Dish[]>(() => loadDishesFromStorage());

  // Sync to localStorage whenever dishes change via mutations
  // We write on mutation rather than via useEffect to avoid extra renders

  const getDishesForCountry = useCallback(
    (countryCode: string) => filterDishesForCountry(dishes, countryCode),
    [dishes],
  );

  const addDish = useCallback(
    (countryCode: string, name: string): boolean => {
      if (!isValidDishName(name)) {
        return false;
      }
      const newDish = createDish(countryCode, name);
      const updated = [...dishes, newDish];
      setDishes(updated);
      saveDishesToStorage(updated);
      return true;
    },
    [dishes],
  );

  const deleteDish = useCallback(
    (dishId: string) => {
      const updated = deleteDishPure(dishes, dishId);
      setDishes(updated);
      saveDishesToStorage(updated);
    },
    [dishes],
  );

  const getAllDishNames = useCallback(() => collectAllDishNames(dishes), [dishes]);

  const getCountriesWithDishes = useCallback(() => collectCountriesWithDishes(dishes), [dishes]);

  // Also read from localStorage on mount (already handled by useState initializer)
  // This useEffect ensures we pick up changes if the component remounts
  useEffect(() => {
    const loaded = loadDishesFromStorage();
    setDishes(loaded);
  }, []);

  return (
    <DishStoreContext.Provider
      value={{ dishes, getDishesForCountry, addDish, deleteDish, getAllDishNames, getCountriesWithDishes }}
    >
      {children}
    </DishStoreContext.Provider>
  );
}

export function useDishStore(): DishStoreContextValue {
  const ctx = useContext(DishStoreContext);
  if (!ctx) {
    throw new Error('useDishStore must be used within a DishStoreProvider');
  }
  return ctx;
}
