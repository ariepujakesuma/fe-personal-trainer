import { fmt } from "@/lib/format";
import type { DailyDashboard } from "@/lib/types";

const TICKS = 31;

/**
 * Daily progress: a half-circle of ticks filling with what was eaten against the target, and
 * the three macros underneath with their own colour.
 */
export function CalorieGauge({ d }: { d: DailyDashboard }) {
  const eaten = d.intake.calories;
  const target = d.targets.calories + d.burn; // exercise earns calories back
  const ratio = target > 0 ? eaten / target : 0;
  const filled = Math.round(Math.min(1, ratio) * TICKS);
  const over = d.remaining < 0;

  const cx = 150;
  const cy = 150;
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const a = Math.PI - (i / (TICKS - 1)) * Math.PI;
    const [r1, r2] = [104, 132];
    return {
      x1: cx + r1 * Math.cos(a),
      y1: cy - r1 * Math.sin(a),
      x2: cx + r2 * Math.cos(a),
      y2: cy - r2 * Math.sin(a),
      on: i < filled,
    };
  });

  return (
    <section aria-labelledby="progres" className="card flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="progres" className="text-lg font-semibold">
          Progres harian
        </h2>
        <p className="text-sm text-muted">
          <span className="numeral text-2xl text-ink">{fmt(eaten)}</span> / {fmt(target)} kkal
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-[300px]">
        <svg viewBox="0 0 300 160" className="w-full" aria-hidden>
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              strokeWidth={9}
              strokeLinecap="round"
              className={t.on ? (over ? "text-danger" : "text-accent") : "text-line"}
              stroke="currentColor"
              opacity={t.on ? 0.55 + (0.45 * i) / TICKS : 1}
            />
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
          <span className="numeral text-6xl">{fmt(eaten)}</span>
          <span className="text-sm text-muted">kkal masuk</span>
        </div>
      </div>
      <p className={`-mt-1 text-center font-semibold ${over ? "text-danger" : ""}`} aria-live="polite">
        {over ? `Lewat ${fmt(-d.remaining)} kkal dari target` : `Sisa ${fmt(d.remaining)} kkal`}
        {d.burn > 0 && <span className="font-normal text-muted"> · olahraga +{fmt(d.burn)}</span>}
      </p>

      <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3">
        <Macro label="Karbo" value={d.intake.carbsG} target={d.targets.carbsG} color="bg-carb" />
        <Macro label="Protein" value={d.intake.proteinG} target={d.targets.proteinG} color="bg-protein" />
        <Macro label="Lemak" value={d.intake.fatG} target={d.targets.fatG} color="bg-fat" />
      </dl>
    </section>
  );
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1.5 px-1">
      <dt className="order-3 font-semibold">{label}</dt>
      <dd className="order-1 flex w-full flex-col items-center gap-1.5 text-sm">
        <span>
          <span className="font-semibold">{Math.round(value)}</span>
          <span className="text-muted"> / {target} g</span>
        </span>
        <span
          role="progressbar"
          aria-label={`${label} ${Math.round(value)} dari ${target} gram`}
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 w-full overflow-hidden rounded-full bg-line"
        >
          <span className={`block h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </span>
      </dd>
    </div>
  );
}
