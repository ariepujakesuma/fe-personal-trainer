"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, errorMessage, useApi } from "@/lib/api";
import { MEAL_LABEL, eatenAtFor, fmt } from "@/lib/format";
import type { MealType, RecentMeal } from "@/lib/types";

const SHOWN = 3;

/** One-tap re-logging of favorites and meals eaten in the last 30 days. */
export function RepeatMeals({ date, mealType, onLogged }: { date: string; mealType: MealType; onLogged: () => void }) {
  const { data, mutate } = useApi<RecentMeal[]>("/meals/recent");
  const [all, setAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  if (!data?.length) return null;

  const names = (m: RecentMeal) => m.items.map((i) => i.name).join(", ");

  async function log(m: RecentMeal) {
    setBusyId(m.id);
    try {
      const created = await api<{ id: string }>(`/meals/${m.id}/repeat`, { body: { mealType, eatenAt: eatenAtFor(date) } });
      // One tap logs straight away, so a mis-tap needs an equally quick way back.
      toast.success(`${MEAL_LABEL[mealType]} dicatat: ${names(m)} (${fmt(m.totalCalories)} kkal)`, {
        duration: 8000,
        action: {
          label: "Batalkan",
          onClick: () =>
            api(`/meals/${created.id}`, { method: "DELETE" })
              .then(() => toast("Dibatalkan"))
              .catch((err) => toast.error(errorMessage(err))),
        },
      });
      onLogged();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusyId(null);
    }
  }

  async function toggleFavorite(m: RecentMeal) {
    const favorite = !m.favorite;
    const next = data!.map((x) => (x.id === m.id ? { ...x, favorite } : x));
    await mutate(next, { revalidate: false }); // the star answers the tap immediately
    try {
      await api(`/meals/${m.id}/favorite`, { method: "PUT", body: { favorite } });
      toast.success(favorite ? "Ditambahkan ke favorit" : "Dihapus dari favorit");
    } catch (err) {
      toast.error(errorMessage(err));
    }
    await mutate();
  }

  const list = all ? data : data.slice(0, SHOWN);
  return (
    <section aria-labelledby="makan-lagi" className="flex flex-col gap-2">
      <h2 id="makan-lagi" className="font-display text-2xl font-bold">
        Makan lagi
      </h2>
      <p className="text-sm text-muted">
        Sekali ketuk, langsung tercatat sebagai {MEAL_LABEL[mealType].toLowerCase()}. Atau catat makanan baru di bawah.
      </p>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {list.map((m) => (
          <li key={m.id} className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={m.favorite}
              aria-label={`Favorit: ${names(m)}`}
              onClick={() => toggleFavorite(m)}
              className={`flex size-11 shrink-0 items-center justify-center text-xl ${m.favorite ? "text-accent" : "text-muted"}`}
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                <path
                  d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
                  fill={m.favorite ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              disabled={busyId != null}
              onClick={() => log(m)}
              className="pressable flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 py-2 pr-1 text-left disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{names(m)}</span>
                <span className="text-sm text-muted">
                  {fmt(m.totalCalories)} kkal · {Math.round(m.proteinG)} g protein
                  {m.timesEaten > 1 ? ` · ${m.timesEaten}x dalam 30 hari` : ""}
                </span>
              </span>
              <span className="shrink-0 font-semibold text-accent-ink">{busyId === m.id ? "Mencatat…" : "Catat"}</span>
            </button>
          </li>
        ))}
      </ul>
      {data.length > SHOWN && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="min-h-11 self-start font-semibold text-accent-ink"
        >
          {all ? "Tampilkan lebih sedikit" : `Lihat semua (${data.length})`}
        </button>
      )}
    </section>
  );
}
