"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:brightness-105",
  secondary: "bg-surface text-ink border border-line hover:border-muted",
  ghost: "text-ink hover:bg-surface",
  danger: "bg-surface text-danger border border-line hover:border-danger",
};

export function Button({
  variant = "primary",
  className = "",
  busy,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${className}`}
      disabled={busy || props.disabled}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent [animation-duration:600ms]"
    />
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const inputCls =
  "min-h-11 w-full rounded-2xl border border-line bg-surface px-3 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputCls} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${inputCls} appearance-auto ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${inputCls} min-h-24 py-2.5 ${className}`} {...props} />;
}

/* iOS-like spring: critically damped slide, no overshoot, settles in ~0.35s. */
const SLIDE = { type: "spring", bounce: 0, duration: 0.38 } as const;
const PRESS = { type: "spring", bounce: 0, duration: 0.2 } as const;
/* A choice can re-render a heavy screen (charts, a refetch). The control shows the new choice at
   once and hands it on only after the slide, so that render never lands mid-animation. */
const COMMIT_MS = 340;

/** Pending choice shown right away, committed after the slide. Cleared once the prop catches up. */
function useDeferredCommit<T>(committed: T) {
  const [pending, setPending] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const queued = useRef<(() => void) | null>(null);
  const [seen, setSeen] = useState(committed);
  if (seen !== committed) {
    setSeen(committed);
    setPending(null);
  }
  useEffect(() => () => clearTimeout(timer.current), []);
  /** Commit a waiting choice now (before a tap that does not slide builds on it). */
  const flush = () => {
    clearTimeout(timer.current);
    const fn = queued.current;
    queued.current = null;
    fn?.();
  };
  const run = (next: T, commit: () => void) => {
    clearTimeout(timer.current);
    setPending(next);
    queued.current = commit;
    timer.current = setTimeout(flush, COMMIT_MS);
  };
  return [pending, run, flush] as const;
}

/**
 * Segmented control. One thumb slides to the chosen segment and re-targets from where it is
 * if tapped again mid-slide; pressing the chosen segment squashes it slightly, as on iOS.
 * The slide runs even with Reduce Motion (small, contained); only the squash is dropped.
 */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  legend,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  legend: string;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const [pending, run] = useDeferredCommit<T>(value);
  const shown = pending ?? value;
  const select = (v: T) => (v === shown ? undefined : run(v, () => onChange(v)));
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-semibold">
        {legend}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        data-name={name}
        className="grid gap-0.5 rounded-full bg-line/60 p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        onKeyDown={(e) => {
          const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          const i = options.findIndex((o) => o.value === shown);
          const next = options[(i + step + options.length) % options.length];
          select(next.value);
          e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[options.indexOf(next)]?.focus();
        }}
      >
        {options.map((o) => {
          const active = o.value === shown;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              data-segment
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => select(o.value)}
              onPointerDown={() => active && setPressed(true)}
              onPointerUp={() => setPressed(false)}
              onPointerLeave={() => setPressed(false)}
              className={`relative min-h-10 rounded-full px-2 text-sm font-semibold transition-colors duration-200 ${
                active ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`seg-${id}`}
                  animate={{ scale: pressed && !reduce ? 0.94 : 1 }}
                  transition={{ ...SLIDE, scale: PRESS }}
                  className="absolute inset-0 rounded-full bg-surface shadow-[0_3px_8px_rgb(0_0_0/0.12),0_0_0_0.5px_rgb(0_0_0/0.04)]"
                />
              )}
              <span className="relative">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type ChipItem = { key: string; label: ReactNode; on: boolean; onClick: () => void };
type Box = { x: number; y: number; w: number; h: number };

/**
 * Chips where one capsule slides to the chosen chip (across wrapped rows too). With several on,
 * each fills on its own and the capsule steps aside. `single` = one choice at a time.
 */
export function ChipGroup({ items, single = false, label }: { items: ChipItem[]; single?: boolean; label: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const onKeys = items.filter((i) => i.on).map((i) => i.key);
  const committedSolo = onKeys.length === 1 ? onKeys[0] : null;
  const [pending, run, flush] = useDeferredCommit<string>(committedSolo ?? "");
  const solo = pending ?? committedSolo;
  const allKey = items[0]?.key;
  const predict = (key: string) => {
    if (!solo) return null;
    if (key === solo) return !single && key !== allKey ? allKey : null;
    return single || key === allKey || solo === allKey ? key : null;
  };
  const tap = (item: ChipItem) => {
    const target = predict(item.key);
    if (target) return run(target, item.onClick);
    flush();
    item.onClick();
  };
  const [box, setBox] = useState<Box | null>(null);
  const lastSolo = useRef<string | null>(null);
  const [instant, setInstant] = useState(true);
  const [curSolo, setCurSolo] = useState(solo);
  const [prevSolo, setPrevSolo] = useState<string | null>(null);
  if (curSolo !== solo) {
    setPrevSolo(curSolo);
    setCurSolo(solo);
  }

  useLayoutEffect(() => {
    const measure = (jump: boolean) => {
      const el = solo ? refs.current.get(solo) : null;
      if (!el) return setBox(null);
      setInstant(jump);
      setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure(lastSolo.current === null || solo === null);
    lastSolo.current = solo;
    const ro = new ResizeObserver(() => measure(true));
    if (wrap.current) ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [solo]);

  return (
    <div ref={wrap} role="group" aria-label={label} className="relative flex flex-wrap gap-2">
      {box && (
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: box.x, y: box.y, width: box.w, height: box.h }}
          transition={instant ? { duration: 0 } : SLIDE}
          className="pointer-events-none absolute left-0 top-0 rounded-full bg-ink"
        />
      )}
      {items.map((item) => {
        const on = pending ? item.key === pending : item.on;
        const own = on && !solo;
        // Text turns light as the capsule arrives, not before.
        const arriving = solo === item.key && prevSolo !== null && prevSolo !== solo;
        return (
          <button
            key={item.key}
            ref={(el) => {
              if (el) refs.current.set(item.key, el);
              else refs.current.delete(item.key);
            }}
            type="button"
            data-segment
            aria-pressed={on}
            onClick={() => tap(item)}
            className={`relative min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ring-inset transition-transform duration-150 active:scale-[0.96] ${
              on ? "text-paper ring-transparent" : "text-ink ring-line hover:bg-surface"
            } ${own ? "bg-ink" : ""}`}
            style={arriving ? { transition: "color 140ms 110ms, transform 150ms" } : undefined}
          >
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PageHeader({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 pb-4">
      <div className="flex items-center gap-1">
        {back && (
          <Link
            href={back}
            aria-label="Kembali"
            className="pressable -ml-2 flex size-11 items-center justify-center rounded-2xl text-ink hover:bg-surface"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
            </svg>
          </Link>
        )}
        <h1 className="font-display text-3xl font-bold leading-none">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function LoadingState({ label = "Memuat" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-12 text-muted" role="status">
      <Spinner />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-4" role="alert">
      <p className="font-semibold">Gagal memuat data</p>
      <p className="text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}
