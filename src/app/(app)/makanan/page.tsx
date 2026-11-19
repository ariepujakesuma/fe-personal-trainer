"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, ErrorState, Input, LoadingState, PageHeader, Segmented } from "@/components/ui";
import { api, errorMessage, fetchImageUrl, useApi } from "@/lib/api";
import { MEAL_LABEL, MEAL_OPTIONS, fmt, fmt1, timeLabel, todayLocal } from "@/lib/format";
import {
  MACROS,
  activeMultiplier,
  applyMultiplier,
  rowFrom,
  setGrams,
  setMacro,
  toNum,
  type ItemRow,
  type Macro,
} from "@/lib/portion";
import type { Meal, MealType } from "@/lib/types";

export default function MakananPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Makanan />
    </Suspense>
  );
}

function Makanan() {
  const id = useSearchParams().get("id");
  const { data, error, isLoading, mutate } = useApi<Meal>(id ? `/meals/${id}` : null, { revalidateOnFocus: false });
  if (!id) return <ErrorState message="Data makanan tidak ditemukan." />;
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />;
  if (!data) return null;
  return <Editor meal={data} key={data.id} />;
}

function localDateOf(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

const MULTIPLIERS = [
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 1.5, label: "1½×" },
  { value: 2, label: "2×" },
];

const MACRO_FIELDS: { key: Macro; label: string; unit: string }[] = [
  { key: "calories", label: "Kalori", unit: "kkal" },
  { key: "proteinG", label: "Protein", unit: "g" },
  { key: "carbsG", label: "Karbo", unit: "g" },
  { key: "fatG", label: "Lemak", unit: "g" },
];

function Editor({ meal }: { meal: Meal }) {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>(meal.mealType);
  const [editingType, setEditingType] = useState(false);
  const [rows, setRows] = useState<ItemRow[]>(() => meal.items.map((i) => rowFrom(i)));
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const day = localDateOf(meal.eatenAt);
  const home = day === todayLocal() ? "/hari-ini" : `/hari-ini?date=${day}`;
  const confirmed = meal.status === "confirmed";

  useEffect(() => {
    if (!meal.photoUrl) return;
    let url: string | null = null;
    let alive = true;
    fetchImageUrl(`/meals/${meal.id}/photo`).then((u) => {
      url = u;
      if (alive) setPhoto(u);
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [meal.id, meal.photoUrl]);

  const totals = useMemo(
    () => Object.fromEntries(MACROS.map((m) => [m, rows.reduce((s, r) => s + toNum(r.values[m]), 0)])) as Record<Macro, number>,
    [rows],
  );

  const update = (key: string, fn: (r: ItemRow) => ItemRow) => setRows((rs) => rs.map((r) => (r.key === key ? fn(r) : r)));

  function addRow() {
    setRows((rs) => [
      ...rs,
      rowFrom({ name: "", portionDesc: null, confidence: null, grams: 0, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }, true),
    ]);
  }

  async function save() {
    if (!rows.length) return setError("Tambahkan minimal 1 item.");
    const unnamed = rows.find((r) => !r.name.trim());
    if (unnamed) {
      update(unnamed.key, (r) => ({ ...r, open: true }));
      return setError("Setiap item perlu nama.");
    }
    setBusy(true);
    setError(null);
    try {
      await api<Meal>(`/meals/${meal.id}`, {
        method: "PUT",
        body: {
          mealType,
          items: rows.map((r) => ({
            id: r.id,
            name: r.name.trim(),
            portionDesc: r.portionDesc,
            grams: toNum(r.grams),
            calories: Math.round(toNum(r.values.calories)),
            proteinG: toNum(r.values.proteinG),
            carbsG: toNum(r.values.carbsG),
            fatG: toNum(r.values.fatG),
          })),
        },
      });
      if (!confirmed) await api(`/meals/${meal.id}/confirm`, { method: "POST" });
      toast.success(`${MEAL_LABEL[mealType]} tersimpan: ${fmt(totals.calories)} kkal`);
      router.push(home);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    setDeleting(true);
    try {
      await api(`/meals/${meal.id}`, { method: "DELETE" });
      toast.success("Makanan dihapus");
      router.push(home);
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader title={confirmed ? "Edit makanan" : "Cek hasil AI"} back={home} />

      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- authed blob URL
        <img src={photo} alt="Foto makanan" className="mb-5 h-48 w-full rounded-[6px] object-cover" />
      )}

      {meal.status === "needs_manual" && (
        <p className="mb-5 rounded-[6px] border-2 border-ink p-4" role="status">
          AI belum bisa membaca makanan ini. Tambahkan item dan kalorinya manual, lalu simpan.
        </p>
      )}

      <section aria-label="Total" className="mb-6 border-b border-line pb-4">
        {editingType ? (
          <Segmented
            name="mealType"
            legend="Waktu makan"
            value={mealType}
            onChange={(v) => {
              setMealType(v);
              setEditingType(false);
            }}
            options={MEAL_OPTIONS}
          />
        ) : (
          <p className="flex items-center gap-2 font-semibold text-muted">
            {MEAL_LABEL[mealType]} · {timeLabel(meal.eatenAt)}
            <button
              type="button"
              onClick={() => setEditingType(true)}
              className="flex min-h-11 items-center px-2 font-semibold text-accent-ink"
              aria-label={`Ganti waktu makan, sekarang ${MEAL_LABEL[mealType]}`}
            >
              Ganti
            </button>
          </p>
        )}
        <p className="numeral mt-1 text-7xl text-accent">
          {fmt(totals.calories)}
          <span className="ml-2 font-sans text-xl font-semibold text-muted">kkal</span>
        </p>
        <p className="mt-2 text-muted">
          Protein <strong className="text-ink">{fmt1(totals.proteinG)} g</strong> · Karbo{" "}
          <strong className="text-ink">{fmt1(totals.carbsG)} g</strong> · Lemak <strong className="text-ink">{fmt1(totals.fatG)} g</strong>
        </p>
      </section>

      <div className="flex flex-col gap-6">
        <section aria-labelledby="items" className="flex flex-col gap-3">
          <h2 id="items" className="font-display text-2xl font-bold">
            Item
          </h2>
          {!confirmed && rows.length > 0 && (
            <p className="-mt-1 text-sm text-muted">
              Angka dari AI adalah perkiraan. Sesuaikan porsinya, kalori ikut berubah otomatis.
            </p>
          )}
          {rows.length === 0 && <p className="text-muted">Belum ada item.</p>}
          <ul className="flex flex-col gap-3">
            {rows.map((r, idx) => (
              <ItemCard
                key={r.key}
                row={r}
                index={idx}
                onChange={(fn) => update(r.key, fn)}
                onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              />
            ))}
          </ul>
          <Button variant="secondary" onClick={addRow}>
            Tambah item
          </Button>
        </section>

        {meal.assumptions && meal.assumptions.length > 0 && (
          <section aria-labelledby="asumsi" className="flex flex-col gap-2">
            <h2 id="asumsi" className="font-display text-xl font-bold">
              Asumsi AI
            </h2>
            <ul className="list-disc pl-5 text-muted">
              {meal.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {!confirmed && (
            <p className="text-center text-sm text-muted">Belum masuk hitungan harian sampai disimpan.</p>
          )}
          <Button busy={busy} onClick={save} className="w-full">
            {confirmed ? "Simpan perubahan" : "Simpan ke catatan"}
          </Button>
          <Button
            variant={confirmDelete ? "danger" : "ghost"}
            busy={deleting}
            onClick={remove}
            onBlur={() => setConfirmDelete(false)}
            className="w-full"
          >
            {confirmDelete ? "Ketuk lagi untuk menghapus" : "Hapus makanan ini"}
          </Button>
        </div>
      </div>
    </>
  );
}

/** One line per item; portion shortcuts always visible; full numbers behind "Detail". */
function ItemCard({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: ItemRow;
  index: number;
  onChange: (fn: (r: ItemRow) => ItemRow) => void;
  onRemove: () => void;
}) {
  const id = (f: string) => `item-${index}-${f}`;
  const active = activeMultiplier(row);
  const lowConfidence = row.confidence != null && row.confidence < 0.6;
  const meta = [
    row.portionDesc,
    toNum(row.grams) ? `${fmt(toNum(row.grams))} g` : null,
    `P ${fmt1(toNum(row.values.proteinG))} · K ${fmt1(toNum(row.values.carbsG))} · L ${fmt1(toNum(row.values.fatG))}`,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 rounded-[6px] border border-line bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{row.name || "Item baru"}</p>
          <p className="text-sm text-muted">{meta.join(" · ")}</p>
          {lowConfidence && <p className="text-sm font-semibold text-accent-ink">AI kurang yakin, cek lagi</p>}
        </div>
        <p className="shrink-0 text-right">
          <span className="numeral block text-3xl">{fmt(toNum(row.values.calories))}</span>
          <span className="text-xs text-muted">kkal</span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        {row.base && (
          <div className="grid flex-1 grid-cols-4 gap-1" role="group" aria-label={`Porsi ${row.name}`}>
            {MULTIPLIERS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={active === m.value}
                onClick={() => onChange((r) => applyMultiplier(r, m.value))}
                className={`pressable min-h-11 rounded-[4px] border text-sm font-semibold ${
                  active === m.value ? "border-ink bg-ink text-paper" : "border-line text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          aria-expanded={row.open}
          aria-controls={id("detail")}
          onClick={() => onChange((r) => ({ ...r, open: !r.open }))}
          className={`min-h-11 px-2 text-sm font-semibold text-accent-ink ${row.base ? "" : "ml-auto"}`}
        >
          {row.open ? "Tutup" : "Detail"}
        </button>
      </div>

      <div id={id("detail")} hidden={!row.open} className="flex flex-col gap-3 border-t border-line pt-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={id("name")} className="text-xs font-semibold text-muted">
            Nama
          </label>
          <Input id={id("name")} value={row.name} onChange={(e) => onChange((r) => ({ ...r, name: e.target.value }))} placeholder="Nama makanan" />
        </div>
        <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={id("grams")} className="text-xs font-semibold text-muted">
              Porsi (g)
            </label>
            <Input
              id={id("grams")}
              inputMode="decimal"
              value={row.grams}
              onChange={(e) => onChange((r) => setGrams(r, e.target.value))}
            />
          </div>
          {MACRO_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1">
              <label htmlFor={id(f.key)} className="text-xs font-semibold text-muted">
                {f.label} ({f.unit})
              </label>
              <Input
                id={id(f.key)}
                inputMode="decimal"
                value={row.values[f.key]}
                onChange={(e) => onChange((r) => setMacro(r, f.key, e.target.value))}
              />
            </div>
          ))}
        </div>
        <Button variant="danger" onClick={onRemove} className="self-start px-3 text-sm" aria-label={`Hapus ${row.name || "item"}`}>
          Hapus item
        </Button>
      </div>
    </li>
  );
}
