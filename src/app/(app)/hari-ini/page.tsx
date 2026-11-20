"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { CalorieGauge } from "@/components/calorie-gauge";
import { DayStrip } from "@/components/day-strip";
import { MealGrid } from "@/components/meal-grid";
import { Button, ErrorState, LinkButton, LoadingState, Spinner } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import { dismissPending, usePendingMeals } from "@/lib/pending-meals";
import { INTENSITY_LABEL, dateLabel, fmt, fmt1, isDate, todayLocal } from "@/lib/format";
import { compBrief } from "@/lib/body-comp";
import type { TrainingToday } from "@/lib/training";
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
  const session = useSession();
  const raw = params.get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const { data, error, isLoading, mutate } = useApi<DailyDashboard>(`/dashboard/daily?date=${date}`);
  const q = date === todayLocal() ? "" : `?date=${date}`;
  const firstName = session?.user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">Hai, {firstName}</h1>
          <p className="text-muted">{date === todayLocal() ? "Ini catatanmu hari ini" : `Catatan ${dateLabel(date)}`}</p>
        </div>
        <Link
          href="/profil"
          aria-label="Profil dan pengaturan"
          className="pressable flex size-12 shrink-0 items-center justify-center rounded-full bg-surface font-display text-xl font-bold shadow-[var(--card-shadow)]"
        >
          {firstName?.[0]?.toUpperCase()}
        </Link>
      </header>
      <DayStrip date={date} basePath="/hari-ini" />
      {isLoading && <LoadingState />}
      {error && <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />}
      <PendingAnalyses date={date} />
      {data && (
        <>
          <PendingMeals meals={data.meals} />
          <CalorieGauge d={data} />
          <MealGrid meals={data.meals} q={q} />
          <ExerciseList date={date} exercises={data.exercises} q={q} onChange={() => mutate()} />
          <WeightRow weight={data.weight} q={q} />
          <ProjectionHint />
          {data.hasAnyLog && (
            <LinkButton href={`/summary${q}`} variant="secondary" className="w-full">
              {data.hasSummary ? "Lihat summary & rekomendasi" : "Buat summary & rekomendasi"}
            </LinkButton>
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
    <section aria-labelledby="buka-proyeksi" className="card flex flex-col gap-2 p-5">
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
        <li key={p.id} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
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

function PendingMeals({ meals }: { meals: Meal[] }) {
  const pending = meals.filter((m) => m.status !== "confirmed");
  if (!pending.length) return null;
  return (
    <Link
      href={`/makanan?id=${pending[0].id}`}
      className="pressable flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 border-ink bg-surface px-4 py-3"
    >
      <span>
        <span className="block font-semibold">{pending.length} makanan belum dicek</span>
        <span className="text-sm text-muted">Belum masuk hitungan sampai kamu simpan.</span>
      </span>
      <span className="font-display text-lg font-bold text-accent-ink">Cek</span>
    </Link>
  );
}

/** Today's planned session from the training program, until it is logged. */
function TrainingDue({ date, q }: { date: string; q: string }) {
  const { data } = useApi<TrainingToday>(`/training/today?date=${date}`);
  if (!data) return null;
  if (!data.plan) {
    return (
      <Link href={`/latihan${q}`} className="text-sm font-semibold text-accent-ink">
        Pilih program latihan beban & lari
      </Link>
    );
  }
  const due = [
    data.strength?.scheduled && !data.strength.done && { title: data.strength.title, href: `/latihan/beban${q}` },
    data.run?.scheduled && !data.run.done && { title: `Lari ${data.run.target.durationMin} menit`, href: `/latihan/lari${q}` },
  ].filter(Boolean) as { title: string; href: string }[];
  if (!due.length) return null;
  return (
    <ul className="flex flex-col gap-2">
      {due.map((d) => (
        <li key={d.href}>
          <Link
            href={d.href}
            className="pressable flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 border-ink px-4 py-2"
          >
            <span>
              <span className="block text-sm text-muted">Jadwal latihan</span>
              <span className="font-semibold">{d.title}</span>
            </span>
            <span className="font-semibold text-accent-ink">Mulai</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ExerciseList({
  date,
  exercises,
  q,
  onChange,
}: {
  date: string;
  exercises: ExerciseLog[];
  q: string;
  onChange: () => void;
}) {
  return (
    <section aria-labelledby="olahraga" className="card flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between">
        <h2 id="olahraga" className="text-lg font-semibold">
          Olahraga
        </h2>
        <Link href={`/catat/olahraga${q}`} className="flex min-h-11 items-center font-semibold text-accent-ink">
          Tambah
        </Link>
      </div>
      <TrainingDue date={date} q={q} />
      {exercises.length === 0 ? (
        <p className="text-muted">Belum ada olahraga tercatat.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
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
    <section aria-labelledby="berat" className="card flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="berat" className="text-lg font-semibold">
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
