"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ErrorState, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import { errorMessage, useApi } from "@/lib/api";
import { dayLabel, fmt1, isDate, todayLocal } from "@/lib/format";

/** "hari ini" / "kemarin" read lower-case mid-sentence; weekday names keep their capitals. */
const inSentence = (date: string) => {
  const l = dayLabel(date);
  return l === "Hari ini" || l === "Kemarin" ? l.toLowerCase() : l;
};
import { WEEKDAYS, pace, setsLabel, targetLabel, videoUrl, type TrainingToday } from "@/lib/training";

export default function LatihanPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Latihan />
    </Suspense>
  );
}

function Latihan() {
  const raw = useSearchParams().get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const q = date === todayLocal() ? "" : `?date=${date}`;
  const { data, error, isLoading, mutate } = useApi<TrainingToday>(`/training/today?date=${date}`);

  return (
    <>
      <PageHeader
        title="Latihan"
        action={
          data?.plan && (
            <Link href="/latihan/program" className="flex min-h-11 items-center font-semibold text-accent-ink">
              Ubah program
            </Link>
          )
        }
      />
      {isLoading && <LoadingState />}
      {error && <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />}
      {data && !data.plan && (
        <section className="flex flex-col gap-3 rounded-2xl border-2 border-ink p-4">
          <h2 className="font-display text-2xl font-bold">Pilih program latihan</h2>
          <p className="text-muted">
            Latihan beban dan lari dengan jadwal mingguan. Setiap gerakan punya target beban dan repetisi yang naik
            bertahap dari catatanmu sendiri.
          </p>
          <LinkButton href="/latihan/program">Pilih program</LinkButton>
        </section>
      )}
      {data?.plan && (
        <div className="flex flex-col gap-8">
          {data.week && <Week week={data.week} today={date} />}
          {data.strength && <StrengthCard s={data.strength} q={q} date={date} />}
          {data.run && <RunCard r={data.run} q={q} date={date} />}
        </div>
      )}
    </>
  );
}

function Week({ week, today }: { week: NonNullable<TrainingToday["week"]>; today: string }) {
  return (
    <div className="flex flex-col gap-1.5">
    <ol aria-label="Jadwal minggu ini" className="grid grid-cols-7 gap-1">
      {week.map((d) => {
        const wd = WEEKDAYS.find((w) => w.value === new Date(`${d.date}T00:00:00Z`).getUTCDay())!;
        const items = [
          d.strength && { label: "Beban", done: d.strengthDone },
          d.run && { label: "Lari", done: d.runDone },
        ].filter(Boolean) as { label: string; done: boolean }[];
        // Logged on a day without a schedule still counts.
        if (!d.strength && d.strengthDone) items.push({ label: "Beban", done: true });
        if (!d.run && d.runDone) items.push({ label: "Lari", done: true });
        return (
          <li
            key={d.date}
            aria-current={d.date === today ? "date" : undefined}
            aria-label={`${wd.long}: ${items.length ? items.map((i) => `${i.label}${i.done ? " selesai" : ""}`).join(", ") : "istirahat"}`}
            className={`flex min-h-16 flex-col items-center gap-1 rounded-xl border py-1.5 text-xs ${
              d.date === today ? "border-ink" : "border-line"
            }`}
          >
            <span className="font-semibold">{wd.short}</span>
            {items.length ? (
              items.map((i) => (
                <span
                  key={i.label}
                  aria-hidden
                  className={`rounded-md px-1 leading-4 ${i.done ? "bg-accent text-on-accent" : "border border-line text-muted"}`}
                >
                  {i.label === "Beban" ? "B" : "L"}
                  {i.done ? "✓" : ""}
                </span>
              ))
            ) : (
              <span aria-hidden className="text-muted">
                –
              </span>
            )}
          </li>
        );
      })}
    </ol>
      <p aria-hidden className="text-xs text-muted">
        B = latihan beban · L = lari · ✓ = selesai
      </p>
    </div>
  );
}

function StrengthCard({ s, q, date }: { s: NonNullable<TrainingToday["strength"]>; q: string; date: string }) {
  const status = s.done
    ? "Selesai"
    : s.scheduled
      ? `Jadwal ${inSentence(date)}`
      : "Hari ini istirahat. Ini sesi berikutnya kalau mau latihan sekarang.";
  return (
    <section aria-labelledby="sesi-beban" className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-accent-ink">{s.programName}</p>
        <h2 id="sesi-beban" className="font-display text-3xl font-bold">
          {s.title}
        </h2>
        <p className="text-sm text-muted">{status}</p>
      </div>
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {s.exercises.map((e) => {
          const logged = s.logged?.find((l) => l.lift === e.lift);
          return (
            <li key={e.lift} className="flex flex-col gap-0.5 py-3">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{e.name}</span>
                <a
                  href={videoUrl(e.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Video ${e.name} di YouTube`}
                  className="-my-3 flex min-h-11 shrink-0 items-center text-sm font-semibold text-accent-ink"
                >
                  Video
                </a>
              </span>
              {logged ? (
                <span className="text-sm">Tercatat: {setsLabel(e.kind, logged.sets)}</span>
              ) : (
                <>
                  <span className="text-sm">
                    Target <strong>{targetLabel(e.kind, e.target)}</strong>
                    {!e.target.weightKg && e.kind === "weighted" ? ` (${e.min}–${e.max} repetisi)` : ""}
                  </span>
                  <span className="text-sm text-muted">
                    {e.last ? `Terakhir ${setsLabel(e.kind, e.last.sets ?? [])}. ` : ""}
                    {e.target.note}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {!s.done && <LinkButton href={`/latihan/beban${q}`}>Mulai {s.title}</LinkButton>}
    </section>
  );
}

function RunCard({ r, q, date }: { r: NonNullable<TrainingToday["run"]>; q: string; date: string }) {
  const status = r.done ? "Selesai" : r.scheduled ? `Jadwal ${inSentence(date)}` : "Bukan jadwal lari hari ini";
  const kmPct = r.weekKmTarget ? Math.min(100, (r.thisWeekKm / r.weekKmTarget) * 100) : null;
  return (
    <section aria-labelledby="sesi-lari" className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold text-accent-ink">
          {r.planName} · minggu {Math.min(r.week, r.totalWeeks)} dari {r.totalWeeks}
          {r.week > r.totalWeeks ? " (lanjut)" : ""}
        </p>
        <h2 id="sesi-lari" className="font-display text-3xl font-bold">
          Lari {r.target.durationMin} menit
        </h2>
        <p className="text-sm text-muted">{status}</p>
      </div>
      <p>{r.target.note}</p>
      {r.done && r.logged && (
        <p className="text-sm">
          Tercatat: {r.logged.durationMin} menit
          {r.logged.distanceKm ? `, ${fmt1(r.logged.distanceKm)} km, pace ${pace(r.logged.distanceKm, r.logged.durationMin)}/km` : ""}
        </p>
      )}
      <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-3">
        <p className="text-sm">
          Jarak minggu ini <strong>{fmt1(r.thisWeekKm)} km</strong>
          {r.weekKmTarget ? ` dari target ${fmt1(r.weekKmTarget)} km` : ""}
        </p>
        {kmPct != null && (
          <div
            role="progressbar"
            aria-valuenow={Math.round(kmPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progres jarak minggu ini"
            className="h-2 overflow-hidden rounded-full bg-line"
          >
            <div className="h-full bg-accent" style={{ width: `${kmPct}%` }} />
          </div>
        )}
        <p className="text-xs text-muted">
          {r.weekKmTarget
            ? `Minggu lalu ${fmt1(r.lastWeekKm)} km. Target naik ±10% per minggu supaya aman untuk lutut.`
            : "Isi jarak saat mencatat lari supaya ada target jarak mingguan."}
        </p>
      </div>
      {r.last && (
        <p className="text-sm text-muted">
          Lari terakhir {inSentence(r.last.date)}: {r.last.durationMin} menit
          {r.last.distanceKm ? `, ${fmt1(r.last.distanceKm)} km (pace ${pace(r.last.distanceKm, r.last.durationMin)}/km)` : ""}
        </p>
      )}
      {!r.done && <LinkButton href={`/latihan/lari${q}`}>Catat lari</LinkButton>}
    </section>
  );
}
