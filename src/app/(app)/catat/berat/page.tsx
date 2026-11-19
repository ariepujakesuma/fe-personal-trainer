"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, ErrorState, Field, Input, LoadingState, PageHeader } from "@/components/ui";
import { ApiError, api, errorMessage, useApi } from "@/lib/api";
import { BODY_COMP, hasBodyComp } from "@/lib/body-comp";
import { dayLabel, fmt1, isDate, shiftDate, todayLocal } from "@/lib/format";
import type { WeightLog } from "@/lib/types";

export default function BeratPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Berat />
    </Suspense>
  );
}

const parseNum = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "")
    .trim()
    .replace(",", ".")
    .replace("−", "-");
  return s === "" ? null : Number(s);
};

function Berat() {
  const router = useRouter();
  const raw = useSearchParams().get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const q = date === todayLocal() ? "" : `?date=${date}`;
  const { data, error, isLoading, mutate } = useApi<WeightLog[]>(`/weights?from=${shiftDate(date, -29)}&to=${date}`);
  const current = data?.find((w) => w.date.slice(0, 10) === date);
  const recent = [...(data ?? [])].reverse().slice(0, 7);

  return (
    <>
      <PageHeader title="Berat badan" back={`/catat${q}`} />
      {/* Render the form only after history loads so a late load never resets what the user typed. */}
      {isLoading && <LoadingState />}
      {(data || error) && (
        <WeightForm key={current?.id ?? "new"} date={date} current={current} onSaved={() => router.push(`/${q}`)} />
      )}

      <section aria-labelledby="riwayat" className="mt-10 flex flex-col gap-3">
        <h2 id="riwayat" className="font-display text-2xl font-bold">
          30 hari terakhir
        </h2>
        {error && <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />}
        {data && recent.length === 0 && <p className="text-muted">Belum ada catatan berat badan.</p>}
        {recent.length > 0 && (
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {recent.map((w) => (
              <HistoryRow key={w.id} w={w} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function WeightForm({ date, current, onSaved }: { date: string; current?: WeightLog; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showComp, setShowComp] = useState(hasBodyComp(current));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const weightKg = parseNum(f.get("weightKg"));
    const next: Record<string, string> = {};
    if (weightKg == null || Number.isNaN(weightKg) || weightKg < 25 || weightKg > 350) {
      next.weightKg = "Isi berat antara 25 dan 350 kg.";
    }
    const comp: Record<string, number | null> = {};
    for (const field of BODY_COMP) {
      const v = parseNum(f.get(field.key));
      if (v != null && Number.isNaN(v)) next[field.key] = "Harus berupa angka";
      comp[field.key] = v;
    }
    setErrors(next);
    if (Object.keys(next).length) {
      if (Object.keys(next).some((k) => k !== "weightKg")) setShowComp(true);
      return;
    }

    setBusy(true);
    try {
      await api("/weights", { body: { date, weightKg, ...comp } });
      const filled = Object.values(comp).filter((v) => v != null).length;
      toast.success(`Berat ${fmt1(weightKg!)} kg tersimpan${filled ? ` + ${filled} data komposisi tubuh` : ""}`);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.issues?.length) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
        setShowComp(true);
      } else {
        toast.error(errorMessage(err));
      }
      setBusy(false);
    }
  }

  const value = (k: keyof WeightLog) => (current?.[k] != null ? String(current[k]).replace(".", ",") : "");

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label={`Berat ${dayLabel(date).toLowerCase()} (kg)`} htmlFor="weightKg" error={errors.weightKg}>
        <Input
          id="weightKg"
          name="weightKg"
          inputMode="decimal"
          defaultValue={value("weightKg")}
          placeholder="70,5"
          className="numeral h-16 text-4xl"
        />
      </Field>

      <section className="rounded-[6px] border border-line">
        <button
          type="button"
          aria-expanded={showComp}
          aria-controls="komposisi"
          onClick={() => setShowComp((s) => !s)}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
        >
          <span>
            <span className="block font-semibold">Komposisi tubuh</span>
            <span className="text-sm text-muted">Opsional, salin dari aplikasi timbangan pintar</span>
          </span>
          <span className="font-display text-lg font-bold text-accent-ink">{showComp ? "Tutup" : "Isi"}</span>
        </button>
        {/* Kept mounted while collapsed so typed values are not lost. */}
        <div id="komposisi" hidden={!showComp} className="border-t border-line p-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {BODY_COMP.map((f) => (
              <Field
                key={f.key}
                label={f.unit ? `${f.label} (${f.unit})` : f.label}
                htmlFor={f.key}
                error={errors[f.key]}
              >
                <Input
                  id={f.key}
                  name={f.key}
                  inputMode={f.key === "obesityDegreePct" ? "text" : f.int ? "numeric" : "decimal"}
                  defaultValue={value(f.key)}
                  placeholder={f.hint}
                />
              </Field>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Kosongkan yang tidak ada di timbanganmu.</p>
        </div>
      </section>

      <Button type="submit" busy={busy} className="w-full">
        Simpan
      </Button>
    </form>
  );
}

function HistoryRow({ w }: { w: WeightLog }) {
  const day = dayLabel(w.date.slice(0, 10));
  const weight = (
    <span className="numeral shrink-0 text-2xl">
      {fmt1(w.weightKg)} <span className="font-sans text-sm font-semibold text-muted">kg</span>
    </span>
  );
  if (!hasBodyComp(w)) {
    return (
      <li className="flex min-h-12 items-center justify-between">
        <span className="text-muted">{day}</span>
        {weight}
      </li>
    );
  }
  const brief = [
    w.bodyFatPct != null && `Lemak ${fmt1(w.bodyFatPct)}%`,
    w.muscleKg != null && `Otot ${fmt1(w.muscleKg)} kg`,
  ].filter(Boolean);
  return (
    <li>
      <details className="group">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-2 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-muted">{day}</span>
            <span className="text-sm">
              {brief.join(" · ") || "Komposisi tubuh"}
              <span className="ml-2 font-semibold text-accent-ink group-open:hidden">Detail</span>
              <span className="ml-2 hidden font-semibold text-accent-ink group-open:inline">Tutup</span>
            </span>
          </span>
          {weight}
        </summary>
        <dl className="grid grid-cols-1 gap-x-4 pb-4 min-[420px]:grid-cols-2">
          {BODY_COMP.filter((f) => w[f.key] != null).map((f) => (
            <div key={f.key} className="flex items-baseline justify-between gap-2 border-b border-line py-1.5">
              <dt className="text-sm text-muted">{f.label}</dt>
              <dd className="font-semibold">
                {fmt1(w[f.key] as number)}
                {f.unit && f.unit !== "level" && (
                  <span className="ml-0.5 text-sm font-normal text-muted">{f.unit === "%" ? "%" : ` ${f.unit}`}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </li>
  );
}
