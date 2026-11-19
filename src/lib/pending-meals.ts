"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "./api";
import { MEAL_LABEL, fmt } from "./format";
import type { Meal, MealType } from "./types";

/**
 * Meal analyses still running. The request keeps going while the user moves around the app,
 * so the capture screen does not have to block for the 10–90 s the AI can take.
 * If the app is closed, the server still saves the result as a draft ("belum dicek").
 */
export interface PendingMeal {
  id: string;
  date: string;
  mealType: MealType;
  label: string;
  status: "processing" | "error";
  error?: string;
}

let entries: PendingMeal[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (next: PendingMeal[]) => {
  entries = next;
  emit();
};

export function dismissPending(id: string) {
  set(entries.filter((e) => e.id !== id));
}

export function startMealAnalysis(opts: {
  form: FormData;
  date: string;
  mealType: MealType;
  label: string;
  onOpen: (mealId: string) => void;
}) {
  const id = crypto.randomUUID();
  set([...entries, { id, date: opts.date, mealType: opts.mealType, label: opts.label, status: "processing" }]);

  api<Meal>("/meals/analyze", { body: opts.form })
    .then((meal) => {
      dismissPending(id);
      const title =
        meal.status === "needs_manual"
          ? `${MEAL_LABEL[meal.mealType]}: AI belum bisa membaca, isi manual`
          : `${MEAL_LABEL[meal.mealType]}: sekitar ${fmt(meal.totalCalories)} kkal, cek dulu`;
      toast.success(title, {
        duration: 8000,
        action: { label: "Cek", onClick: () => opts.onOpen(meal.id) },
      });
    })
    .catch((err: unknown) => {
      const message = errorMessage(err);
      set(entries.map((e) => (e.id === id ? { ...e, status: "error", error: message } : e)));
      toast.error(`Gagal menghitung ${opts.label}: ${message}`);
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: PendingMeal[] = [];

export function usePendingMeals(date: string): PendingMeal[] {
  const all = useSyncExternalStore(subscribe, () => entries, () => EMPTY);
  return all.filter((e) => e.date === date);
}
