"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { DateSwitcher } from "@/components/date-switcher";
import { LaneBar } from "@/components/lane-bar";
import { Button, ErrorState, LinkButton, LoadingState, Spinner } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { dismissPending, usePendingMeals } from "@/lib/pending-meals";
import { INTENSITY_LABEL, MEAL_LABEL, dateLabel, fmt, fmt1, isDate, timeLabel, todayLocal } from "@/lib/format";
import { compBrief } from "@/lib/body-comp";
import { bodyShape } from "@/lib/projection";
import type { DailyDashboard, ExerciseLog, Meal, ProjectionInput, WeightLog } from "@/lib/types";

export default function TodayPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Today />
    </Suspense>
  );
}

function Today() {
  const params = useSearchParams();
  const raw = params.get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const { data, error, isLoading, mutate } = useApi<DailyDashboard>(`/dashboard/daily?date=${date}`);
  const q = date === todayLocal() ? "" : `?date=${date}`;

  return (
    <div className="flex flex-col gap-8">
      <DateSwitcher date={date} basePath="/hari-ini" />
      {isLoading && <LoadingState />}
      {error && <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />}
      <PendingAnalyses date={date} />
      <ProjectionHint />
      {data && (
        <>
          <Scoreboard d={data} />
          {data.meals.length === 0 && data.exercises.length === 0 ? (
            <>
              <EmptyDay q={q} />
              <WeightRow weight={data.weight} q={q} />
            </>
          ) : (
            <>
              <PendingMeals meals={data.meals} />
              <section aria-labelledby="makro" className="flex flex-col gap-4">
                <h2 id="makro" className="font-display text-2xl font-bold">
                  Makro
                </h2>
                <LaneBar label="Protein" value={data.intake.proteinG} target={data.targets.proteinG} emphasis />
                <LaneBar label="Karbohidrat" value={data.intake.carbsG} target={data.targets.carbsG} />
                <LaneBar label="Lemak" value={data.intake.fatG} target={data.targets.fatG} />
              </section>
              <MealList meals={data.meals} q={q} />
              <ExerciseList exercises={data.exercises} q={q} onChange={() => mutate()} />
              <WeightRow weight={data.weight} q={q} />
              <LinkButton href={`/summary${q}`} variant="secondary" className="w-full">
                {data.hasSummary ? "Lihat summary & rekomendasi" : "Buat summary & rekomendasi"}
              </LinkButton>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Says what is still missing before the projection home screen opens. */
function ProjectionHint() {
  const { data } = useApi<ProjectionInput>("/dashboard/projection");
  if (!data || data.ready) return null;
  const needsComp = data.missing.includes("bodyComposition");
  const needsMeals = data.missing.includes("meals");
  return (
    <section aria-labelledby="buka-proyeksi" className="flex flex-col gap-2 rounded-[6px] border border-line bg-surface p-4">
      <h2 id="buka-proyeksi" className="font-semibold">
        Lihat proyeksi berat badanmu
      </h2>
      <p className="text-sm text-muted">Perkiraan berat dan bentuk tubuh 7 hari, 30 hari, dan 1 tahun lagi. Tinggal:</p>
      <ul className="flex flex-col gap-1 text-sm">
        {needsComp && (
          <li>
            <Link href="/catat/berat?komposisi=1" className="font-semibold text-accent-ink">
              Isi komposisi tubuh
            </Link>{" "}
            dari timbangan, minimal lemak tubuh (Fat).
          </li>
        )}
        {needsMeals && <li>Catat makan seharian. Proyeksi muncul mulai besok, dihitung dari hari yang sudah lewat.</li>}
      </ul>
    </section>
  );
}

/** Meals the AI is still working on: the capture screen no longer waits for it. */
function PendingAnalyses({ date }: { date: string }) {
  const pending = usePendingMeals(date);
  if (!pending.length) return null;
  return (
    <ul className="flex flex-col gap-2" aria-live="polite">
      {pending.map((p) => (
        <li key={p.id} className="flex min-h-14 items-center gap-3 rounded-[6px] border border-line bg-surface px-4 py-3">
          {p.status === "processing" ? (
            <>
              <Spinner />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">AI menghitung: {p.label}</span>
                <span className="text-sm text-muted">Boleh pindah layar. Hasilnya muncul di sini untuk dicek.</span>
              </span>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1" role="alert">
                <span className="block truncate font-semibold text-danger">Gagal menghitung: {p.label}</span>
                <span className="text-sm text-muted">{p.error}</span>
              </span>
              <Button variant="ghost" className="px-3 text-sm" onClick={() => dismissPending(p.id)}>
                Tutup
              </Button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function Scoreboard({ d }: { d: DailyDashboard }) {
  const over = d.remaining < 0;
  return (
    <section aria-label="Kalori hari ini" className="flex flex-col gap-4">
      <div>
        <p className="font-semibold text-muted">{over ? "Lewat dari target" : "Sisa kalori"}</p>
        <p className={`numeral text-[clamp(5rem,28vw,8rem)] ${over ? "text-ink" : "text-accent"}`}>
          {fmt(Math.abs(d.remaining))}
          <span className="ml-2 font-sans text-xl font-semibold text-muted">kkal</span>
        </p>
      </div>
      <dl className="grid grid-cols-3 border-y border-line py-3">
        <Stat label="Target" value={d.targets.calories} />
        <Stat label="Makan" value={d.intake.calories} sign="−" />
        <Stat label="Olahraga" value={d.burn} sign="+" />
      </dl>
    </section>
  );
}

function Stat({ label, value, sign }: { label: string; value: number; sign?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="numeral text-3xl">
        {sign && value > 0 && <span className="mr-0.5 text-muted">{sign}</span>}
        {fmt(value)}
      </dd>
    </div>
  );
}

function EmptyDay({ q }: { q: string }) {
  return (
    <section className="flex flex-col gap-4 rounded-[6px] border border-line bg-surface p-5">
      <h2 className="font-display text-2xl font-bold">Belum ada catatan</h2>
      <p className="text-muted">Mulai dari makanan terakhirmu. Foto atau tulis saja, AI yang menghitung kalorinya.</p>
      <div className="flex flex-col gap-2">
        <LinkButton href={`/catat/makanan${q}`}>Catat makanan</LinkButton>
        <LinkButton href={`/catat/olahraga${q}`} variant="secondary">
          Catat olahraga
        </LinkButton>
      </div>
    </section>
  );
}

function PendingMeals({ meals }: { meals: Meal[] }) {
  const pending = meals.filter((m) => m.status !== "confirmed");
  if (!pending.length) return null;
  return (
    <Link
      href={`/makanan?id=${pending[0].id}`}
      className="pressable flex min-h-14 items-center justify-between gap-3 rounded-[6px] border-2 border-ink bg-surface px-4 py-3"
    >
      <span>
        <span className="block font-semibold">{pending.length} makanan belum dicek</span>
        <span className="text-sm text-muted">Belum masuk hitungan sampai kamu simpan.</span>
      </span>
      <span className="font-display text-lg font-bold text-accent-ink">Cek</span>
    </Link>
  );
}

function MealList({ meals, q }: { meals: Meal[]; q: string }) {
  return (
    <section aria-labelledby="makan" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="makan" className="font-display text-2xl font-bold">
          Makan
        </h2>
        <Link href={`/catat/makanan${q}`} className="flex min-h-11 items-center font-semibold text-accent-ink">
          Tambah
        </Link>
      </div>
      {meals.length === 0 ? (
        <p className="text-muted">Belum ada makanan tercatat.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {meals.map((m) => (
            <li key={m.id}>
              <Link href={`/makanan?id=${m.id}`} className="flex min-h-16 items-center justify-between gap-4 py-3 hover:bg-surface">
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {MEAL_LABEL[m.mealType]} <span className="font-normal text-muted">· {timeLabel(m.eatenAt)}</span>
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {m.status === "needs_manual"
                      ? "Perlu diisi manual"
                      : m.items.map((i) => i.name).join(", ") || m.rawText}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="numeral block text-2xl">{fmt(m.totalCalories)}</span>
                  <span className="text-xs text-muted">{m.status === "confirmed" ? "kkal" : "belum dicek"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ExerciseList({ exercises, q, onChange }: { exercises: ExerciseLog[]; q: string; onChange: () => void }) {
  return (
    <section aria-labelledby="olahraga" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 id="olahraga" className="font-display text-2xl font-bold">
          Olahraga
        </h2>
        <Link href={`/catat/olahraga${q}`} className="flex min-h-11 items-center font-semibold text-accent-ink">
          Tambah
        </Link>
      </div>
      {exercises.length === 0 ? (
        <p className="text-muted">Belum ada olahraga tercatat.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {exercises.map((e) => (
            <ExerciseRow key={e.id} e={e} onChange={onChange} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ExerciseRow({ e, onChange }: { e: ExerciseLog; onChange: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirming) return setConfirming(true);
    setBusy(true);
    try {
      await api(`/exercises/${e.id}`, { method: "DELETE" });
      toast.success(`${e.name} dihapus`);
      onChange();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <li className="flex min-h-16 items-center justify-between gap-3 py-3">
      <span className="min-w-0">
        <span className="block truncate font-semibold">{e.name}</span>
        <span className="text-sm text-muted">
          {e.durationMin} menit · {INTENSITY_LABEL[e.intensity]}
          {e.distanceKm ? ` · ${fmt1(e.distanceKm)} km` : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-right">
          <span className="numeral block text-2xl">{fmt(e.caloriesBurned)}</span>
          <span className="text-xs text-muted">kkal</span>
        </span>
        <Button
          variant={confirming ? "danger" : "ghost"}
          className="px-3 text-sm"
          busy={busy}
          onClick={remove}
          onBlur={() => setConfirming(false)}
          aria-label={confirming ? `Yakin hapus ${e.name}` : `Hapus ${e.name}`}
        >
          {confirming ? "Yakin?" : "Hapus"}
        </Button>
      </span>
    </li>
  );
}

function WeightRow({ weight, q }: { weight: WeightLog | null; q: string }) {
  const sex = useApi<ProjectionInput>("/dashboard/projection").data?.sex;
  const last = useApi<{ log: WeightLog | null }>("/weights/composition/latest").data?.log;
  const showLast = !weight?.bodyFatPct && last && last.date.slice(0, 10) !== weight?.date.slice(0, 10);
  const brief = weight
    ? [
        weight.bodyFatPct != null && `Lemak ${fmt1(weight.bodyFatPct)}%`,
        weight.bodyFatPct != null && sex && `Bentuk tubuh: ${bodyShape(sex, weight.bodyFatPct).label}`,
        weight.muscleKg != null && `Otot ${fmt1(weight.muscleKg)} kg`,
        weight.visceralFat != null && `Visceral ${fmt1(weight.visceralFat)}`,
      ].filter(Boolean)
    : [];
  const compHref = `/catat/berat${q ? `${q}&` : "?"}komposisi=1`;
  return (
    <section aria-labelledby="berat" className="flex flex-col gap-2 border-y border-line py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="berat" className="font-display text-2xl font-bold">
            Berat badan
          </h2>
          {weight ? (
            <p className="numeral text-3xl">
              {fmt1(weight.weightKg)} <span className="font-sans text-base font-semibold text-muted">kg</span>
            </p>
          ) : (
            <p className="text-muted">Belum ditimbang hari ini.</p>
          )}
        </div>
        <LinkButton href={`/catat/berat${q}`} variant="secondary">
          {weight ? "Ubah" : "Catat"}
        </LinkButton>
      </div>
      {showLast && (
        <p className="text-sm text-muted">
          Komposisi terakhir ({dateLabel(last.date.slice(0, 10))}): {compBrief(last).join(" · ")}
          {last.bodyFatPct != null && sex && ` · Bentuk tubuh: ${bodyShape(sex, last.bodyFatPct).label}`}
        </p>
      )}
      {brief.length > 0 ? (
        <Link href={compHref} className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <span className="text-muted">{brief.join(" · ")}</span>
          <span className="font-semibold text-accent-ink">Komposisi tubuh</span>
        </Link>
      ) : (
        <Link href={compHref} className="flex min-h-11 items-center font-semibold text-accent-ink">
          + Komposisi tubuh dari timbangan pintar
        </Link>
      )}
    </section>
  );
}
