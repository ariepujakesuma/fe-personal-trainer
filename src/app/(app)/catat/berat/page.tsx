"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, ErrorState, Field, Input, LoadingState, PageHeader } from "@/components/ui";
import { ApiError, api, errorMessage, useApi } from "@/lib/api";
import { BODY_COMP, hasBodyComp, parseReading, readingError } from "@/lib/body-comp";
import { dayLabel, fmt1, isDate, shiftDate, todayLocal } from "@/lib/format";
import type { WeightLog } from "@/lib/types";

export default function BeratPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Berat />
    </Suspense>
  );
}

function Berat() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("date");
  const openComp = params.get("komposisi") === "1";
  const date = isDate(raw) ? raw : todayLocal();
  const q = date === todayLocal() ? "" : `?date=${date}`;
  const { data, error, isLoading, mutate } = useApi<WeightLog[]>(`/weights?from=${shiftDate(date, -29)}&to=${date}`);
  const current = data?.find((w) => w.date.slice(0, 10) === date);
  const recent = [...(data ?? [])].reverse().slice(0, 7);

  return (
    <>
      <PageHeader title="Berat & komposisi" back={openComp ? `/hari-ini${q}` : `/catat${q}`} />
      {/* Render the form only after history loads so a late load never resets what the user typed. */}
      {isLoading && <LoadingState />}
      {(data || error) && (
        <WeightForm
          key={current?.id ?? "new"}
          date={date}
          current={current}
          openComp={openComp}
          onSaved={() => router.push(`/hari-ini${q}`)}
        />
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

/** Number input with its unit shown inside the field, so "kg" vs "%" is never a guess. */
function UnitInput({ unit, ...props }: ComponentProps<typeof Input> & { unit: string }) {
  return (
    <div className="relative">
      <Input {...props} className={`${props.className ?? ""} ${unit ? "pr-14" : ""}`} />
      {unit && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted" aria-hidden>
          {unit}
        </span>
      )}
    </div>
  );
}

const WEIGHT_FIELD = { key: "weightKg", label: "Berat", scale: "Weight", unit: "kg", min: 25, max: 350 } as const;

function WeightForm({
  date,
  current,
  openComp,
  onSaved,
}: {
  date: string;
  current?: WeightLog;
  openComp: boolean;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [showComp, setShowComp] = useState(openComp || hasBodyComp(current));
  const compRef = useRef<HTMLDivElement>(null);

  // Arriving from "+ Komposisi tubuh": go straight to the first reading.
  useEffect(() => {
    if (!openComp) return;
    compRef.current?.scrollIntoView({ block: "start" });
    compRef.current?.querySelector("input")?.focus({ preventScroll: true });
  }, [openComp]);

  const check = (key: string, text: string) => {
    const field = key === "weightKg" ? WEIGHT_FIELD : BODY_COMP.find((f) => f.key === key)!;
    setErrors((e) => ({ ...e, [key]: readingError(field, text) }));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "");
    const next: Record<string, string | null> = {};
    const weightKg = parseReading(text("weightKg"));
    next.weightKg = weightKg == null ? "Isi berat badan dulu" : readingError(WEIGHT_FIELD, text("weightKg"));
    const comp: Record<string, number | null> = {};
    for (const field of BODY_COMP) {
      next[field.key] = readingError(field, text(field.key));
      comp[field.key] = parseReading(text(field.key));
    }
    setErrors(next);
    const bad = Object.entries(next).filter(([, v]) => v);
    if (bad.length) {
      if (bad.some(([k]) => k !== "weightKg")) setShowComp(true);
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
      <Field label={`Berat ${dayLabel(date).toLowerCase()}`} htmlFor="weightKg" error={errors.weightKg}>
        <UnitInput
          id="weightKg"
          name="weightKg"
          unit="kg"
          inputMode="decimal"
          defaultValue={value("weightKg")}
          placeholder="70,5"
          onBlur={(e) => e.target.value && check("weightKg", e.target.value)}
          onChange={() => errors.weightKg && setErrors((x) => ({ ...x, weightKg: null }))}
          className="numeral h-16 text-4xl"
        />
      </Field>

      <section className="rounded-[6px] border border-line" ref={compRef}>
        {showComp ? (
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 pt-2">
            <span>
              <span className="block font-display text-xl font-bold">Komposisi tubuh</span>
              <span className="text-sm text-muted">Salin dari aplikasi timbangan, semua opsional</span>
            </span>
            <button
              type="button"
              aria-expanded
              aria-controls="komposisi"
              onClick={() => setShowComp(false)}
              className="min-h-11 px-2 text-sm font-semibold text-muted"
            >
              Sembunyikan
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-expanded={false}
            aria-controls="komposisi"
            onClick={() => setShowComp(true)}
            className="pressable flex min-h-16 w-full flex-col justify-center px-4 py-3 text-left"
          >
            <span className="font-semibold text-accent-ink">+ Isi komposisi tubuh</span>
            <span className="text-sm text-muted">11 data dari timbangan pintar, semua opsional</span>
          </button>
        )}
        {/* Kept mounted while hidden so typed values are not lost. */}
        <div id="komposisi" hidden={!showComp} className="p-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {BODY_COMP.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                {/* Second line = the scale app's own label, so fields match while copying. */}
                <label htmlFor={f.key} className="flex flex-col">
                  <span className="text-sm font-semibold">{f.label}</span>
                  <span className="truncate text-xs text-muted" title={f.scale}>
                    {f.scale}
                  </span>
                </label>
                <UnitInput
                  id={f.key}
                  name={f.key}
                  unit={f.unit === "level" ? "" : f.unit}
                  inputMode={f.min < 0 ? "text" : f.int ? "numeric" : "decimal"}
                  defaultValue={value(f.key)}
                  onBlur={(e) => check(f.key, e.target.value)}
                  onChange={() => errors[f.key] && setErrors((x) => ({ ...x, [f.key]: null }))}
                  aria-invalid={errors[f.key] ? true : undefined}
                  aria-describedby={errors[f.key] ? `${f.key}-error` : undefined}
                />
                {errors[f.key] && (
                  <p id={`${f.key}-error`} className="text-sm text-danger" role="alert">
                    {errors[f.key]}
                  </p>
                )}
              </div>
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
