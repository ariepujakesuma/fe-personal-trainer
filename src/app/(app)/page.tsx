"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState, Segmented } from "@/components/ui";
import { errorMessage, useApi } from "@/lib/api";
import { fmt, fmt1, todayLocal } from "@/lib/format";
import { bodyShape, bodyShapes, dailyBalance, silhouettePath, simulate, type Point } from "@/lib/projection";
import type { ProjectionInput, Sex } from "@/lib/types";

type Period = "7" | "30" | "365";
const PERIODS: { value: Period; label: string; long: string }[] = [
  { value: "7", label: "7 hari", long: "7 hari lagi" },
  { value: "30", label: "30 hari", long: "30 hari lagi" },
  { value: "365", label: "1 tahun", long: "1 tahun lagi" },
];
/** Below this body fat the advice turns into a warning. */
const FLOOR: Record<Sex, number> = { male: 10, female: 18 };

/** Home: the projection once there is enough data, otherwise the day view. */
export default function HomePage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useApi<ProjectionInput>("/dashboard/projection");

  useEffect(() => {
    if (data && !data.ready) router.replace("/hari-ini");
  }, [data, router]);

  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />;
  if (isLoading || !data || !data.ready) return <LoadingState />;
  return <Projection p={data} />;
}

function Projection({ p }: { p: ProjectionInput }) {
  const [period, setPeriod] = useState<Period>("30");
  const now = useMemo(() => simulate(p, false), [p]);
  const target = useMemo(() => (p.targetDeficit == null ? null : simulate(p, true)), [p]);
  const meta = PERIODS.find((x) => x.value === period)!;
  const start = now[0];
  const end = now[Number(period)];
  const bfNow = start.bodyFat * 100;
  const bfEnd = end.bodyFat * 100;
  const deltaW = end.weightKg - start.weightKg;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="font-display text-lg font-bold text-accent-ink">Proyeksi</p>
        <h1 className="font-display text-4xl font-bold leading-none">Kalau pola ini terus</h1>
        <p className="mt-1 text-muted">
          Dari {p.loggedDays} hari tercatat minggu lalu: makan rata-rata {fmt(p.avgIntake ?? 0)} kkal, olahraga{" "}
          {fmt(p.avgBurn)} kkal per hari.
        </p>
      </header>

      <Segmented name="rentang" legend="Rentang proyeksi" value={period} options={PERIODS} onChange={setPeriod} />

      <section aria-live="polite" className="flex flex-col gap-1">
        <p className="font-semibold text-muted">Berat badan {meta.long}</p>
        <p className="numeral text-[clamp(5rem,28vw,7rem)] text-accent">
          {fmt1(end.weightKg)}
          <span className="ml-2 font-sans text-xl font-semibold text-muted">kg</span>
        </p>
        <p className="text-lg">
          <strong>
            {deltaW >= 0 ? "+" : "−"}
            {fmt1(Math.abs(deltaW))} kg
          </strong>{" "}
          dari sekarang ({fmt1(start.weightKg)} kg) · lemak tubuh <strong>{fmt1(bfEnd)}%</strong>
        </p>
      </section>

      <BodyShape sex={p.sex} bfNow={bfNow} bfEnd={bfEnd} periodLabel={meta.long} bodyFatDate={p.bodyFatDate} />
      <Chart now={now} target={target} period={Number(period)} />
      <Pace p={p} now={now} target={target} period={Number(period)} periodLabel={meta.long} />
      <Advice p={p} bfEnd={bfEnd} />

      <p className="text-sm text-muted">
        Perkiraan, bukan jaminan. Kebutuhan kalori ikut turun saat berat turun, jadi laju melambat seiring waktu. Hari
        yang lupa dicatat lengkap membuat rata-rata makan terlihat lebih kecil.
      </p>
    </div>
  );
}

function Figure({ sex, bf, overlayBf, tone }: { sex: Sex; bf: number; overlayBf?: number; tone: "now" | "future" }) {
  const fill = tone === "now" ? "text-muted opacity-50" : "text-ink";
  return (
    <svg viewBox="-10 0 140 240" className="h-56 w-auto" aria-hidden>
      <g className={fill} fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
        <circle cx={60} cy={22} r={13} />
        <path d={silhouettePath(sex, bf)} />
      </g>
      {overlayBf != null && (
        <path
          d={silhouettePath(sex, overlayBf)}
          className="text-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function BodyShape({
  sex,
  bfNow,
  bfEnd,
  periodLabel,
  bodyFatDate,
}: {
  sex: Sex;
  bfNow: number;
  bfEnd: number;
  periodLabel: string;
  bodyFatDate: string | null;
}) {
  const current = bodyShape(sex, bfNow);
  const future = bodyShape(sex, bfEnd);
  const bands = bodyShapes(sex);
  const stale = bodyFatDate && Date.parse(todayLocal()) - Date.parse(bodyFatDate) > 30 * 86400000;

  return (
    <section aria-labelledby="bentuk" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="bentuk" className="font-display text-2xl font-bold">
          Bentuk tubuhmu sekarang: {current.label}
        </h2>
        <p className="text-muted">{current.note}</p>
      </div>

      <div className="grid grid-cols-2 rounded-[6px] border border-line bg-surface p-4">
        <figure className="flex flex-col items-center gap-1">
          <Figure sex={sex} bf={bfNow} tone="now" />
          <figcaption className="text-center">
            <span className="block text-sm text-muted">Sekarang</span>
            <span className="numeral block text-3xl">{fmt1(bfNow)}%</span>
            <span className="block text-sm text-muted">{current.label}</span>
          </figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-1">
          <Figure sex={sex} bf={bfEnd} overlayBf={bfNow} tone="future" />
          <figcaption className="text-center">
            <span className="block text-sm text-muted">{periodLabel}</span>
            <span className="numeral block text-3xl text-accent-ink">{fmt1(bfEnd)}%</span>
            <span className="block text-sm text-muted">{future.label}</span>
          </figcaption>
        </figure>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted">
        <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-accent" />
        Garis putus-putus: bentuk tubuh sekarang
      </p>

      <ol aria-label="Kategori lemak tubuh" className="grid grid-cols-5 gap-1">
        {bands.map((b, i) => {
          const lo = i === 0 ? 0 : bands[i - 1].max;
          const range = i === 0 ? `<${b.max}%` : b.max === Infinity ? `${lo}%+` : `${lo}–${b.max - 1}%`;
          const isNow = i === current.index;
          const isFuture = i === future.index && future.index !== current.index;
          return (
            <li
              key={b.label}
              aria-current={isNow ? "true" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center rounded-[4px] px-1 py-1.5 text-center text-xs leading-tight ${
                isNow ? "bg-ink text-paper" : isFuture ? "border-2 border-accent" : "border border-line text-muted"
              }`}
            >
              <span className="font-semibold">{b.label}</span>
              <span>{range}</span>
            </li>
          );
        })}
      </ol>

      {stale && (
        <p className="text-sm">
          Data lemak tubuh terakhir sudah lebih dari 30 hari.{" "}
          <Link href="/catat/berat?komposisi=1" className="font-semibold text-accent-ink">
            Timbang lagi
          </Link>{" "}
          supaya proyeksi akurat.
        </p>
      )}
    </section>
  );
}

function Chart({ now, target, period }: { now: Point[]; target: Point[] | null; period: number }) {
  const all = [...now, ...(target ?? [])].map((x) => x.weightKg);
  const hi = Math.ceil(Math.max(...all));
  const lo = Math.floor(Math.min(...all));
  const span = Math.max(1, hi - lo);
  const X = (d: number) => 40 + (d / 365) * 300;
  const Y = (w: number) => 20 + ((hi - w) / span) * 120;
  const pts = (arr: Point[]) =>
    arr
      .filter((x) => x.day % 5 === 0 || x.day === 365)
      .map((x) => `${X(x.day).toFixed(1)},${Y(x.weightKg).toFixed(1)}`)
      .join(" ");
  const mark = now[period];

  return (
    <section aria-labelledby="arah" className="flex flex-col gap-2">
      <h2 id="arah" className="font-display text-2xl font-bold">
        Arah berat badan
      </h2>
      <svg
        viewBox="0 0 350 170"
        className="w-full"
        role="img"
        aria-label={`Proyeksi berat dari ${fmt1(now[0].weightKg)} kilogram hari ini ke ${fmt1(now[365].weightKg)} kilogram dalam 1 tahun`}
      >
        <g className="text-line" stroke="currentColor">
          {[20, 80, 140].map((y) => (
            <line key={y} x1={40} y1={y} x2={340} y2={y} />
          ))}
        </g>
        <g className="text-muted" fill="currentColor" fontSize={11}>
          <text x={34} y={24} textAnchor="end">{hi} kg</text>
          <text x={34} y={84} textAnchor="end">{fmt((hi + lo) / 2)} kg</text>
          <text x={34} y={144} textAnchor="end">{lo} kg</text>
          <text x={40} y={162}>Hari ini</text>
          <text x={340} y={162} textAnchor="end">1 tahun</text>
        </g>
        {target && (
          <polyline points={pts(target)} className="text-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="4 4" />
        )}
        <polyline points={pts(now)} className="text-accent" fill="none" stroke="currentColor" strokeWidth={3} />
        <circle cx={X(period)} cy={Y(mark.weightKg)} r={6} className="fill-accent stroke-paper" strokeWidth={2} />
      </svg>
      <div className="flex gap-4 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-[3px] w-4 bg-accent" />
          Pola sekarang
        </span>
        {target && (
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block w-4 border-t-2 border-dashed border-muted" />
            Kalau ikut target
          </span>
        )}
      </div>
    </section>
  );
}

function Pace({
  p,
  now,
  target,
  period,
  periodLabel,
}: {
  p: ProjectionInput;
  now: Point[];
  target: Point[] | null;
  period: number;
  periodLabel: string;
}) {
  const perWeek = now[7].weightKg - now[0].weightKg;
  const pct = (Math.abs(perWeek) / now[0].weightKg) * 100;
  const note =
    perWeek > 0.05
      ? "Naik, sebagian besar jadi lemak"
      : pct > 1
        ? "Terlalu cepat, otot ikut hilang"
        : pct >= 0.25
          ? "Aman untuk turun lemak sambil jaga otot"
          : "Hampir tetap";
  return (
    <dl className="grid grid-cols-2 border-y border-line">
      <div className="flex flex-col gap-0.5 border-r border-line py-3 pr-3">
        <dt className="text-sm text-muted">Laju</dt>
        <dd className="numeral text-2xl">
          {perWeek >= 0 ? "+" : "−"}
          {fmt1(Math.abs(perWeek))} kg/minggu
        </dd>
        <dd className="text-sm text-muted">{note}</dd>
      </div>
      <div className="flex flex-col gap-0.5 py-3 pl-3">
        <dt className="text-sm text-muted">Kalau ikut target {fmt(p.targetCalories)} kkal</dt>
        <dd className="numeral text-2xl">{target ? `${fmt1(target[period].weightKg)} kg` : "–"}</dd>
        <dd className="text-sm text-muted">{periodLabel}</dd>
      </div>
    </dl>
  );
}

function Advice({ p, bfEnd }: { p: ProjectionInput; bfEnd: number }) {
  const balance = Math.round(dailyBalance(p) / 10) * 10;
  let title: string;
  let body: string;
  if (balance > 50) {
    title = `Surplus rata-rata ${fmt(balance)} kkal per hari`;
    body = `Berat dan lemak tubuh ikut naik. Kurangi asupan sekitar ${fmt(balance + (p.targetDeficit ?? 0))} kkal per hari untuk kembali ke target.`;
  } else if (bfEnd < FLOOR[p.sex]) {
    title = "Lemak tubuh akan terlalu rendah";
    body = `Dengan pola ini lemak tubuh turun di bawah ${FLOOR[p.sex]}%. Naikkan asupan sebelum sampai ke sana.`;
  } else if (balance > -50) {
    title = "Kalori masuk dan keluar hampir seimbang";
    body = "Berat cenderung tetap. Kalau ingin turun lemak, ikuti target kalori harian di layar Hari ini.";
  } else {
    title = `Defisit rata-rata ${fmt(-balance)} kkal per hari`;
    body = `Pertahankan protein ${fmt(p.targetProteinG)} g per hari dan latihan beban 3x seminggu supaya yang turun lemak, bukan otot.`;
  }
  return (
    <section className="flex flex-col gap-1.5 rounded-[6px] border-2 border-ink p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted">{body}</p>
    </section>
  );
}
