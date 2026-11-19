"use client";

import Link from "next/link";
import { dayLabel, shiftDate, todayLocal } from "@/lib/format";

function Arrow({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function DateSwitcher({ date, basePath }: { date: string; basePath: string }) {
  const today = todayLocal();
  const href = (d: string) => (d === today ? basePath : `${basePath}?date=${d}`);
  const btn = "pressable flex size-11 items-center justify-center rounded-[6px] border border-line text-ink hover:border-muted";
  return (
    <div className="flex items-center gap-2">
      <Link href={href(shiftDate(date, -1))} className={btn} aria-label="Hari sebelumnya">
        <Arrow dir="left" />
      </Link>
      <p className="min-w-0 flex-1 truncate text-center font-display text-xl font-bold" aria-live="polite">
        {dayLabel(date)}
      </p>
      {date < today ? (
        <Link href={href(shiftDate(date, 1))} className={btn} aria-label="Hari berikutnya">
          <Arrow dir="right" />
        </Link>
      ) : (
        <span className="size-11" aria-hidden />
      )}
    </div>
  );
}
