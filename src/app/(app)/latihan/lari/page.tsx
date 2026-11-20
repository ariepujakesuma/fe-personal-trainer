"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button, Field, Input, LoadingState, PageHeader } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { fmt1, isDate, todayLocal } from "@/lib/format";
import { pace, type TrainingToday } from "@/lib/training";

export default function LariPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Lari />
    </Suspense>
  );
}

const num = (s: string) => {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? null : n;
};

function Lari() {
  const router = useRouter();
  const raw = useSearchParams().get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const q = date === todayLocal() ? "" : `?date=${date}`;
  const run = useApi<TrainingToday>(`/training/today?date=${date}`).data?.run;
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minutes = num(duration);
  const km = num(distance);
  const livePace = minutes && km ? pace(km, minutes) : null;

  async function save() {
    if (!minutes || minutes < 1) return setError("Isi durasi lari dalam menit.");
    if (km != null && (km <= 0 || km > 200)) return setError("Jarak antara 0 dan 200 km.");
    setBusy(true);
    setError(null);
    try {
      await api("/training/run", {
        body: { date, durationMin: Math.round(minutes), distanceKm: km, planId: run?.planId ?? null, week: run?.week ?? null },
      });
      toast.success(`Lari ${Math.round(minutes)} menit tercatat${km ? `, ${fmt1(km)} km` : ""}`);
      router.push(`/latihan${q}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Catat lari" back={`/latihan${q}`} />
      <div className="flex flex-col gap-5">
        {run && (
          <section className="flex flex-col gap-1 rounded-[6px] border border-line bg-surface p-4">
            <p className="text-sm font-semibold text-accent-ink">
              {run.planName} · minggu {Math.min(run.week, run.totalWeeks)}
            </p>
            <p className="font-semibold">Target: {run.target.note}</p>
            {run.target.intervals && (
              <p className="text-sm text-muted">Pemanasan jalan 5 menit dulu. Durasi diisi total termasuk jalan.</p>
            )}
          </section>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Durasi (menit)" htmlFor="duration">
            <Input
              id="duration"
              inputMode="numeric"
              value={duration}
              placeholder={run ? String(run.target.durationMin) : "30"}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Field>
          <Field label="Jarak (km)" htmlFor="distance" hint="Opsional, dari jam atau aplikasi lari">
            <Input id="distance" inputMode="decimal" value={distance} placeholder="4,5" onChange={(e) => setDistance(e.target.value)} />
          </Field>
        </div>
        {livePace && (
          <p aria-live="polite">
            Pace <strong>{livePace} /km</strong>
          </p>
        )}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button onClick={save} busy={busy} className="w-full">
          Simpan lari
        </Button>
      </div>
    </>
  );
}
