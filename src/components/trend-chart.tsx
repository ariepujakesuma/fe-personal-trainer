"use client";

import { useState } from "react";
import { fmt1, shiftDate } from "@/lib/format";
import type { WeightLog } from "@/lib/types";
import { Segmented } from "./ui";

type Metric = "weightKg" | "bodyFatPct";
const UNIT: Record<Metric, string> = { weightKg: "kg", bodyFatPct: "%" };

const dayNum = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86400000;
const short = (date: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );

/**
 * Daily readings as dots, and the average of the 7 days up to each one as the line. Weight
 * swings 1-2 kg a day from water and food; the line is the part that means something.
 */
export function TrendChart({ logs, end, days, goalKg }: { logs: WeightLog[]; end: string; days: number; goalKg?: number | null }) {
  const hasFat = logs.filter((l) => l.bodyFatPct != null).length >= 2;
  const [metric, setMetric] = useState<Metric>("weightKg");
  const m = hasFat ? metric : "weightKg";

  const pts = logs
    .filter((l) => l[m] != null)
    .map((l) => ({ date: l.date.slice(0, 10), v: l[m] as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const avg = pts.map((p) => {
    const win = pts.filter((q) => q.date <= p.date && dayNum(p.date) - dayNum(q.date) < 7);
    return { date: p.date, v: win.reduce((s, q) => s + q.v, 0) / win.length };
  });

  const start = shiftDate(end, -(days - 1));
  const goal = m === "weightKg" && goalKg != null ? goalKg : null;
  const values = pts.map((p) => p.v).concat(goal ?? []);
  const hi = values.length ? Math.ceil(Math.max(...values) + 0.5) : 1;
  const lo = values.length ? Math.floor(Math.min(...values) - 0.5) : 0;
  const X = (date: string) => 40 + ((dayNum(date) - dayNum(start)) / (days - 1)) * 300;
  const Y = (v: number) => 16 + ((hi - v) / Math.max(1, hi - lo)) * 124;

  const latest = avg.at(-1);
  const monthAgo = avg.filter((a) => dayNum(a.date) <= dayNum(end) - 30).at(-1) ?? avg[0];
  const change = latest && monthAgo && latest.date !== monthAgo.date ? latest.v - monthAgo.v : null;

  return (
    <section aria-labelledby="tren" className="flex flex-col gap-3">
      <h2 id="tren" className="font-display text-2xl font-bold">
        Tren {days} hari
      </h2>
      {hasFat && (
        <Segmented
          name="metric"
          legend="Data"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "weightKg", label: "Berat" },
            { value: "bodyFatPct", label: "Lemak tubuh" },
          ]}
        />
      )}
      {pts.length < 2 ? (
        <p className="text-muted">Timbang minimal 2 kali untuk melihat tren.</p>
      ) : (
        <>
          <p>
            Rata-rata 7 hari: <strong>{fmt1(latest!.v)} {UNIT[m]}</strong>
            {change != null && (
              <span className="text-muted">
                {" "}
                ({change >= 0 ? "+" : "−"}
                {fmt1(Math.abs(change))} {UNIT[m]} sejak {short(monthAgo!.date)})
              </span>
            )}
          </p>
          <svg
            viewBox="0 0 350 166"
            className="w-full"
            role="img"
            aria-label={`Rata-rata 7 hari ${m === "weightKg" ? "berat" : "lemak tubuh"} dari ${fmt1(avg[0].v)} ke ${fmt1(latest!.v)} ${UNIT[m]}`}
          >
            <g className="text-line" stroke="currentColor">
              <line x1={40} y1={16} x2={340} y2={16} />
              <line x1={40} y1={140} x2={340} y2={140} />
            </g>
            <g className="text-muted" fill="currentColor" fontSize={11}>
              <text x={34} y={20} textAnchor="end">
                {hi}
              </text>
              <text x={34} y={144} textAnchor="end">
                {lo}
              </text>
              <text x={40} y={160}>
                {short(start)}
              </text>
              <text x={340} y={160} textAnchor="end">
                {short(end)}
              </text>
            </g>
            {goal != null && (
              <g className="text-ink">
                <line x1={40} y1={Y(goal)} x2={340} y2={Y(goal)} stroke="currentColor" strokeDasharray="2 3" />
                <text x={338} y={Y(goal) - 4} textAnchor="end" fontSize={11} fill="currentColor">
                  Target {fmt1(goal)}
                </text>
              </g>
            )}
            <g className="text-muted" fill="currentColor" opacity={0.6}>
              {pts.map((p) => (
                <circle key={p.date} cx={X(p.date)} cy={Y(p.v)} r={2.5} />
              ))}
            </g>
            <polyline
              points={avg.map((a) => `${X(a.date).toFixed(1)},${Y(a.v).toFixed(1)}`).join(" ")}
              className="text-accent"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-2 rounded-full bg-muted opacity-60" />
              Hasil timbang
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-[3px] w-4 bg-accent" />
              Rata-rata 7 hari
            </span>
          </div>
        </>
      )}
    </section>
  );
}
