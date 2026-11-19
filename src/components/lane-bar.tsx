import { fmt } from "@/lib/format";

/** Macro progress as a running-track lane: thick bar, square ends (identity motif). */
export function LaneBar({
  label,
  value,
  target,
  unit = "g",
  emphasis = false,
}: {
  label: string;
  value: number;
  target: number;
  unit?: string;
  emphasis?: boolean;
}) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const over = target > 0 && value > target;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-sm font-semibold ${emphasis ? "text-ink" : "text-muted"}`}>{label}</span>
        <span className="text-sm text-muted">
          <span className="numeral text-lg text-ink">{fmt(value)}</span> / {fmt(target)} {unit}
          {over && <span className="ml-1 font-semibold text-accent-ink">lebih {fmt(value - target)}</span>}
        </span>
      </div>
      <div
        className="h-2.5 w-full bg-line"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.round(value)}
      >
        <div className={`h-full ${emphasis ? "bg-accent" : "bg-ink"}`} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
