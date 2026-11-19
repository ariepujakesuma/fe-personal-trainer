"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] px-4 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50";

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
  "min-h-11 w-full rounded-[6px] border border-line bg-surface px-3 text-ink placeholder:text-muted focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputCls} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${inputCls} appearance-auto ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${inputCls} min-h-24 py-2.5 ${className}`} {...props} />;
}

/** Segmented choice: radio group styled as a row of tabs. */
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
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="grid gap-1 rounded-[6px] border border-line bg-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <label
            key={o.value}
            className={`no-select flex min-h-10 cursor-pointer items-center justify-center rounded-[4px] px-2 text-center text-sm font-semibold transition-colors duration-100 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
              value === o.value ? "bg-ink text-paper" : "text-muted hover:text-ink"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
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
            className="pressable -ml-2 flex size-11 items-center justify-center rounded-[6px] text-ink hover:bg-surface"
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
    <div className="flex flex-col items-start gap-3 rounded-[6px] border border-line bg-surface p-4" role="alert">
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
