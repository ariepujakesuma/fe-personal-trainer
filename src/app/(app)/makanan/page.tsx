"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, ErrorState, Input, LoadingState, PageHeader, Segmented } from "@/components/ui";
import { api, errorMessage, fetchImageUrl, useApi } from "@/lib/api";
import { MEAL_LABEL, fmt, fmt1, timeLabel, todayLocal } from "@/lib/format";
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

interface Row {
  key: string;
  id?: string;
  name: string;
  portionDesc: string | null;
  grams: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  confidence: number | null;
}

const toNum = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const MEAL_OPTIONS = (Object.keys(MEAL_LABEL) as MealType[]).map((v) => ({
  value: v,
  label: v === "breakfast" ? "Pagi" : v === "lunch" ? "Siang" : v === "dinner" ? "Malam" : "Snack",
}));

function localDateOf(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

function Editor({ meal }: { meal: Meal }) {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>(meal.mealType);
  const [rows, setRows] = useState<Row[]>(() =>
    meal.items.map((i) => ({
      key: i.id,
      id: i.id,
      name: i.name,
      portionDesc: i.portionDesc,
      grams: String(i.grams),
      calories: String(i.calories),
      proteinG: String(i.proteinG),
      carbsG: String(i.carbsG),
      fatG: String(i.fatG),
      confidence: i.confidence,
    })),
  );
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const day = localDateOf(meal.eatenAt);
  const home = day === todayLocal() ? "/" : `/?date=${day}`;
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
    () => ({
      calories: rows.reduce((s, r) => s + toNum(r.calories), 0),
      proteinG: rows.reduce((s, r) => s + toNum(r.proteinG), 0),
      carbsG: rows.reduce((s, r) => s + toNum(r.carbsG), 0),
      fatG: rows.reduce((s, r) => s + toNum(r.fatG), 0),
    }),
    [rows],
  );

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function addRow() {
    setRows((rs) => [
      ...rs,
      { key: crypto.randomUUID(), name: "", portionDesc: null, grams: "", calories: "", proteinG: "0", carbsG: "0", fatG: "0", confidence: null },
    ]);
  }

  async function save() {
    if (!rows.length) return setError("Tambahkan minimal 1 item.");
    if (rows.some((r) => !r.name.trim())) return setError("Setiap item perlu nama.");
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
            calories: Math.round(toNum(r.calories)),
            proteinG: toNum(r.proteinG),
            carbsG: toNum(r.carbsG),
            fatG: toNum(r.fatG),
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
        <img src={photo} alt="Foto makanan" className="mb-5 aspect-[4/3] w-full rounded-[6px] object-cover" />
      )}

      {meal.status === "needs_manual" && (
        <p className="mb-5 rounded-[6px] border-2 border-ink p-4" role="status">
          AI belum bisa membaca makanan ini. Tambahkan item dan kalorinya manual, lalu simpan.
        </p>
      )}

      <section aria-label="Total" className="mb-6 border-b border-line pb-4">
        <p className="font-semibold text-muted">Total · {timeLabel(meal.eatenAt)}</p>
        <p className="numeral text-7xl text-accent">
          {fmt(totals.calories)}
          <span className="ml-2 font-sans text-xl font-semibold text-muted">kkal</span>
        </p>
        <p className="mt-2 text-muted">
          Protein <strong className="text-ink">{fmt1(totals.proteinG)} g</strong> · Karbo{" "}
          <strong className="text-ink">{fmt1(totals.carbsG)} g</strong> · Lemak <strong className="text-ink">{fmt1(totals.fatG)} g</strong>
        </p>
      </section>

      <div className="flex flex-col gap-6">
        <Segmented name="mealType" legend="Waktu makan" value={mealType} onChange={setMealType} options={MEAL_OPTIONS} />

        <section aria-labelledby="items" className="flex flex-col gap-3">
          <h2 id="items" className="font-display text-2xl font-bold">
            Item
          </h2>
          {!confirmed && rows.length > 0 && (
            <p className="-mt-1 text-sm text-muted">Angka dari AI adalah perkiraan. Ubah porsi atau kalori kalau kurang pas.</p>
          )}
          {rows.length === 0 && <p className="text-muted">Belum ada item.</p>}
          {rows.map((r, idx) => (
            <ItemCard key={r.key} row={r} index={idx} onChange={(p) => update(r.key, p)} onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} />
          ))}
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

function ItemCard({
  row,
  index,
  onChange,
  onRemove,
}: {
  row: Row;
  index: number;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}) {
  const id = (f: string) => `item-${index}-${f}`;
  const num = (field: keyof Row, label: string, unit: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id(field)} className="text-xs font-semibold text-muted">
        {label} ({unit})
      </label>
      <Input
        id={id(field)}
        inputMode="decimal"
        value={row[field] as string}
        onChange={(e) => onChange({ [field]: e.target.value })}
        className="px-2"
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 rounded-[6px] border border-line bg-surface p-3">
      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={id("name")} className="text-xs font-semibold text-muted">
            Nama
            {row.portionDesc ? ` · ${row.portionDesc}` : ""}
            {row.confidence != null ? ` · keyakinan AI ${Math.round(row.confidence * 100)}%` : ""}
          </label>
          <Input id={id("name")} value={row.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Nama makanan" />
        </div>
        <Button variant="danger" onClick={onRemove} className="px-3 text-sm" aria-label={`Hapus ${row.name || "item"}`}>
          Hapus
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 min-[480px]:grid-cols-5">
        {num("grams", "Porsi", "g")}
        {num("calories", "Kalori", "kkal")}
        {num("proteinG", "Protein", "g")}
        {num("carbsG", "Karbo", "g")}
        {num("fatG", "Lemak", "g")}
      </div>
    </div>
  );
}
