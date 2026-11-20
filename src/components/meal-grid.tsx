"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchImageUrl } from "@/lib/api";
import { MEAL_LABEL, fmt, timeLabel } from "@/lib/format";
import type { Meal } from "@/lib/types";

/**
 * Loaded photos by meal and stored file, so they survive moving between days and screens.
 * Only successes are kept: a photo that failed (storage not ready, offline) is tried again
 * the next time the card shows, instead of staying a placeholder until the app restarts.
 */
const photoCache = new Map<string, string>();

function useMealPhoto(meal: Meal) {
  const key = meal.photoUrl ? `${meal.id}:${meal.photoUrl}` : null;
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
  const cached = key ? photoCache.get(key) : undefined;
  useEffect(() => {
    if (!key || photoCache.has(key)) return;
    let live = true;
    fetchImageUrl(`/meals/${meal.id}/photo`)
      .then((u) => {
        if (!u) return;
        photoCache.set(key, u);
        if (live) setLoaded({ key, url: u });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key, meal.id]);
  return cached ?? (loaded && loaded.key === key ? loaded.url : null);
}

/** Meals as photo cards, two per row. Without a photo the card shows the food names instead. */
export function MealGrid({ meals, q }: { meals: Meal[]; q: string }) {
  return (
    <section aria-labelledby="makan" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="makan" className="text-lg font-semibold">
          Makanan
        </h2>
        <Link href={`/catat/makanan${q}`} className="flex min-h-11 items-center font-semibold text-accent-ink">
          Tambah
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {meals.map((m) => (
          <li key={m.id}>
            <MealCard m={m} />
          </li>
        ))}
        <li>
          <Link
            href={`/catat/makanan${q}`}
            className="pressable flex h-full min-h-48 flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] border-2 border-dashed border-line p-4 text-center"
          >
            <span aria-hidden className="text-3xl leading-none text-accent">
              +
            </span>
            <span className="font-semibold">Catat makanan</span>
            <span className="text-xs text-muted">Foto atau tulis</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}

function MealCard({ m }: { m: Meal }) {
  const photo = useMealPhoto(m);
  const names = m.items.map((i) => i.name).join(", ") || m.rawText || MEAL_LABEL[m.mealType];
  const unchecked = m.status !== "confirmed";
  return (
    <Link href={`/makanan?id=${m.id}`} className="pressable card flex h-full flex-col gap-2 p-2.5">
      <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-paper">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- authed blob URL
          <img src={photo} alt={names} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center p-3 text-center">
            <span className="line-clamp-3 font-display text-lg font-bold leading-tight">{names}</span>
          </span>
        )}
        {unchecked && (
          <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-paper">
            {m.status === "needs_manual" ? "Isi manual" : "Belum dicek"}
          </span>
        )}
      </span>
      <span className="flex items-baseline justify-between gap-2 px-1">
        <span className="font-semibold">{MEAL_LABEL[m.mealType]}</span>
        <span className="text-xs text-muted">{timeLabel(m.eatenAt)}</span>
      </span>
      {photo && <span className="-mt-1.5 truncate px-1 text-xs text-muted">{names}</span>}
      <span className="px-1 pb-1">
        <span className="numeral text-3xl">{fmt(m.totalCalories)}</span>
        <span className="ml-1 text-sm text-muted">kkal</span>
      </span>
    </Link>
  );
}
