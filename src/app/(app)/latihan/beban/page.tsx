"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, ErrorState, Input, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { isDate, todayLocal } from "@/lib/format";
import { setsLabel, targetLabel, videoUrl, type TodayExercise, type TrainingToday } from "@/lib/training";

export default function BebanPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Beban />
    </Suspense>
  );
}

function Beban() {
  const raw = useSearchParams().get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const q = date === todayLocal() ? "" : `?date=${date}`;
  const { data, error, mutate } = useApi<TrainingToday>(`/training/today?date=${date}`);
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />;
  if (!data) return <LoadingState />;
  if (!data.strength) {
    return (
      <>
        <PageHeader title="Latihan beban" back={`/latihan${q}`} />
        <p className="mb-4 text-muted">Belum ada program latihan beban.</p>
        <LinkButton href="/latihan/program">Pilih program</LinkButton>
      </>
    );
  }
  return <Session key={data.strength.sessionKey} s={data.strength} date={date} q={q} />;
}

type Row = { weight: string; value: string };

const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? null : n;
};
const show = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));

function initialRows(e: TodayExercise): Row[] {
  const lastWeight = Math.max(0, ...(e.last?.sets ?? []).map((s) => s.weightKg ?? 0)) || null;
  const weight = show(e.target.weightKg ?? lastWeight);
  return Array.from({ length: e.target.sets }, () => ({ weight, value: String(e.target.value) }));
}

/**
 * A session takes an hour and the phone sleeps in between; on iOS the PWA may reload. The
 * draft is kept per day and session so nothing typed is lost.
 */
const draftKey = (date: string, s: { programId: string; sessionKey: string }) =>
  `pt.workout.${date}.${s.programId}.${s.sessionKey}`;

function readDraft(key: string): { rows: Row[][]; duration: string } | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Session({ s, date, q }: { s: NonNullable<TrainingToday["strength"]>; date: string; q: string }) {
  const router = useRouter();
  const key = draftKey(date, s);
  const [draft] = useState(() => readDraft(key));
  const [rows, setRows] = useState<Row[][]>(() =>
    draft?.rows.length === s.exercises.length ? draft.rows : s.exercises.map(initialRows),
  );
  const [duration, setDuration] = useState(
    draft?.duration ?? String(Math.max(30, s.exercises.reduce((n, e) => n + e.target.sets, 0) * 4)),
  );

  // Saved only once something is typed, so "continuing" never shows for an untouched session.
  const [touched, setTouched] = useState(Boolean(draft));
  useEffect(() => {
    if (!touched) return;
    try {
      localStorage.setItem(key, JSON.stringify({ rows, duration }));
    } catch {
      // Private mode or full storage: the session still works, only without the safety net.
    }
  }, [key, rows, duration, touched]);

  function reset() {
    setRows(s.exercises.map(initialRows));
    setTouched(false);
    try {
      localStorage.removeItem(key);
    } catch {}
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCell = (i: number, j: number, patch: Partial<Row>) => {
    setTouched(true);
    setRows((r) => r.map((sets, a) => (a !== i ? sets : sets.map((row, b) => (b === j ? { ...row, ...patch } : row)))));
  };
  const addSet = (i: number) => {
    setTouched(true);
    setRows((r) => r.map((sets, a) => (a === i ? [...sets, { ...sets[sets.length - 1] }] : sets)));
  };
  const removeSet = (i: number) => {
    setTouched(true);
    setRows((r) => r.map((sets, a) => (a === i && sets.length > 1 ? sets.slice(0, -1) : sets)));
  };

  async function save() {
    const minutes = num(duration);
    if (!minutes || minutes < 5) return setError("Isi durasi latihan, minimal 5 menit.");
    const exercises = s.exercises.map((e, i) => ({
      lift: e.lift,
      sets: rows[i]
        .map((r) => ({ value: num(r.value) ?? 0, weightKg: e.kind === "weighted" ? num(r.weight) : null }))
        .filter((x) => x.value > 0),
    }));
    if (!exercises.some((e) => e.sets.length)) return setError("Isi minimal 1 set.");
    setBusy(true);
    setError(null);
    try {
      await api("/training/strength", {
        body: { date, programId: s.programId, sessionKey: s.sessionKey, durationMin: Math.round(minutes), exercises },
      });
      try {
        localStorage.removeItem(key);
      } catch {}
      toast.success(`${s.title} tercatat. Target sesi berikutnya sudah diperbarui.`);
      router.push(`/latihan${q}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={s.title} back={`/latihan${q}`} />
      <p className="-mt-2 mb-6 text-sm text-muted">
        Angka sudah diisi dengan target. Ubah sesuai yang benar-benar kamu lakukan; kosongkan repetisi untuk set yang
        dilewati. Isian tersimpan otomatis kalau aplikasi tertutup.
      </p>
      {draft && (
        <p className="-mt-4 mb-6 flex flex-wrap items-center gap-x-3 text-sm">
          Melanjutkan isian sebelumnya.
          <button type="button" onClick={reset} className="min-h-11 font-semibold text-accent-ink">
            Mulai dari target lagi
          </button>
        </p>
      )}
      <div className="flex flex-col gap-8">
        {s.exercises.map((e, i) => (
          <section key={e.lift} aria-labelledby={`ex-${e.lift}`} className="flex flex-col gap-2">
            <h2 id={`ex-${e.lift}`} className="font-display text-2xl font-bold">
              {e.name}
            </h2>
            <p className="text-sm text-muted">{e.cue}</p>
            <a
              href={videoUrl(e.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center self-start text-sm font-semibold text-accent-ink"
            >
              Lihat video cara melakukannya (YouTube)
            </a>
            <p className="text-sm">
              Target <strong>{targetLabel(e.kind, e.target)}</strong>
              {e.last ? <span className="text-muted"> · terakhir {setsLabel(e.kind, e.last.sets ?? [])}</span> : null}
            </p>
            <p className="text-sm text-muted">{e.target.note}</p>
            <div className="flex flex-col gap-2">
              <div className={`grid gap-2 text-xs font-semibold text-muted ${e.kind === "weighted" ? "grid-cols-[3rem_1fr_1fr]" : "grid-cols-[3rem_1fr]"}`}>
                <span>Set</span>
                {e.kind === "weighted" && <span>Beban (kg)</span>}
                <span>{e.kind === "time" ? "Detik" : "Repetisi"}</span>
              </div>
              {rows[i].map((r, j) => (
                <div
                  key={j}
                  className={`grid items-center gap-2 ${e.kind === "weighted" ? "grid-cols-[3rem_1fr_1fr]" : "grid-cols-[3rem_1fr]"}`}
                >
                  <span className="numeral text-xl">{j + 1}</span>
                  {e.kind === "weighted" && (
                    <Input
                      inputMode="decimal"
                      aria-label={`${e.name} set ${j + 1}, beban kg`}
                      value={r.weight}
                      placeholder="kg"
                      onChange={(ev) => setCell(i, j, { weight: ev.target.value })}
                    />
                  )}
                  <Input
                    inputMode="numeric"
                    aria-label={`${e.name} set ${j + 1}, ${e.kind === "time" ? "detik" : "repetisi"}`}
                    value={r.value}
                    onChange={(ev) => setCell(i, j, { value: ev.target.value })}
                  />
                </div>
              ))}
              <div className="flex gap-4">
                <Button variant="ghost" className="px-0 text-accent-ink" onClick={() => addSet(i)}>
                  + Set
                </Button>
                {rows[i].length > 1 && (
                  <Button variant="ghost" className="px-0 text-muted" onClick={() => removeSet(i)}>
                    − Set
                  </Button>
                )}
              </div>
            </div>
          </section>
        ))}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Durasi latihan (menit)</span>
          <Input inputMode="numeric" value={duration} onChange={(e) => {
              setTouched(true);
              setDuration(e.target.value);
            }} />
          <span className="text-sm text-muted">Untuk menghitung kalori yang terbakar.</span>
        </label>

        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button onClick={save} busy={busy} className="w-full">
          Simpan latihan
        </Button>
      </div>
    </>
  );
}
