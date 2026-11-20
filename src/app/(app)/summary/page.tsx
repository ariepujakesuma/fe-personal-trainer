"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { DateSwitcher } from "@/components/date-switcher";
import { Button, ErrorState, LinkButton, LoadingState } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { fmt, isDate, timeLabel, todayLocal } from "@/lib/format";
import type { DailyDashboard, DailySummary } from "@/lib/types";

export default function SummaryPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Summary />
    </Suspense>
  );
}

const REC_LABEL = { nutrition: "Makan", workout: "Latihan", habit: "Kebiasaan" } as const;

function Summary() {
  const raw = useSearchParams().get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const q = date === todayLocal() ? "" : `?date=${date}`;
  const summary = useApi<{ date: string; summary: DailySummary | null }>(`/summaries/daily?date=${date}`);
  const day = useApi<DailyDashboard>(`/dashboard/daily?date=${date}`);
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setGenError(null);
    try {
      const res = await api<{ date: string; summary: DailySummary }>(`/summaries/daily/generate?date=${date}`, { method: "POST" });
      await summary.mutate(res, { revalidate: false });
      toast.success("Summary diperbarui");
    } catch (err) {
      setGenError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const s = summary.data?.summary;
  const pending = day.data?.meals.filter((m) => m.status !== "confirmed").length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <DateSwitcher date={date} basePath="/summary" />
      {summary.isLoading && <LoadingState />}
      {summary.error && <ErrorState message={errorMessage(summary.error)} onRetry={() => summary.mutate()} />}

      {summary.data && !s && (
        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <h1 className="font-display text-3xl font-bold">Belum ada summary</h1>
          {day.data && !day.data.hasAnyLog ? (
            <>
              <p className="text-muted">Summary dibuat dari catatan makan dan olahraga. Hari ini belum ada catatan.</p>
              <LinkButton href={`/catat${q}`}>Catat sekarang</LinkButton>
            </>
          ) : (
            <>
              <p className="text-muted">
                Summary otomatis dibuat jam 21:00. Mau lihat sekarang? AI akan merangkum hari ini dan memberi saran untuk besok.
              </p>
              {pending > 0 && (
                <p className="text-sm font-semibold">
                  {pending} makanan belum dicek dan belum ikut dihitung.
                </p>
              )}
              {genError && (
                <p className="text-sm text-danger" role="alert">
                  {genError}
                </p>
              )}
              <Button busy={busy} onClick={generate}>
                {busy ? "AI sedang merangkum" : "Buat summary sekarang"}
              </Button>
            </>
          )}
        </section>
      )}

      {s && (
        <>
          <section aria-label="Skor hari ini">
            <p className="font-semibold text-muted">Skor hari ini</p>
            <p className="numeral text-[clamp(5rem,28vw,8rem)] text-accent">
              {s.aiJson.score}
              <span className="ml-2 font-sans text-xl font-semibold text-muted">/ 100</span>
            </p>
            <p className="mt-3 text-lg leading-relaxed">{s.aiJson.summary}</p>
            <dl className="mt-5 grid grid-cols-3 border-y border-line py-3">
              <div>
                <dt className="text-sm text-muted">Makan</dt>
                <dd className="numeral text-3xl">{fmt(s.intakeKcal)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Olahraga</dt>
                <dd className="numeral text-3xl">{fmt(s.burnKcal)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Net</dt>
                <dd className="numeral text-3xl">{fmt(s.netKcal)}</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="rekomendasi" className="flex flex-col gap-3">
            <h2 id="rekomendasi" className="font-display text-2xl font-bold">
              Untuk besok
            </h2>
            <ol className="flex flex-col divide-y divide-line border-y border-line">
              {s.aiJson.recommendations.map((r, i) => (
                <li key={i} className="flex gap-4 py-4">
                  <span className="numeral w-6 shrink-0 text-3xl text-accent-ink">{i + 1}</span>
                  <span>
                    <span className="block text-sm font-semibold text-muted">{REC_LABEL[r.type]}</span>
                    <span className="text-lg">{r.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {s.aiJson.highlights.length > 0 && (
            <section aria-labelledby="bagus" className="flex flex-col gap-2">
              <h2 id="bagus" className="font-display text-xl font-bold">
                Yang sudah bagus
              </h2>
              <ul className="list-disc pl-5">
                {s.aiJson.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          )}

          {s.aiJson.warnings.length > 0 && (
            <section aria-labelledby="perhatikan" className="flex flex-col gap-2">
              <h2 id="perhatikan" className="font-display text-xl font-bold">
                Perlu diperhatikan
              </h2>
              <ul className="list-disc pl-5">
                {s.aiJson.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm text-muted">
              Dibuat {timeLabel(s.generatedAt)}. Saran AI bersifat umum, bukan saran medis.
            </p>
            {genError && (
              <p className="text-sm text-danger" role="alert">
                {genError}
              </p>
            )}
            <Button variant="secondary" busy={busy} onClick={generate}>
              Buat ulang dengan data terbaru
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
