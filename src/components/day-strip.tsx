"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { shiftDate, todayLocal } from "@/lib/format";

const DAYS = 28;
const WEEKDAY = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/**
 * The last four weeks as tappable day pills, today at the right end and scrolled into view.
 * No future days: nothing can be logged there yet.
 */
export function DayStrip({ date, basePath }: { date: string; basePath: string }) {
  const today = todayLocal();
  const end = date > today ? date : today;
  const days = Array.from({ length: DAYS }, (_, i) => shiftDate(end, i - DAYS + 1));
  if (!days.includes(date)) days.unshift(date);
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>("[aria-current=date]");
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [date]);

  return (
    <nav aria-label="Pilih tanggal" className="-mx-5">
      <ol ref={ref} className="flex snap-x gap-2 overflow-x-auto px-5 py-1 [scrollbar-width:none]">
        {days.map((d) => {
          const on = d === date;
          const dt = new Date(`${d}T00:00:00Z`);
          return (
            <li key={d} className="snap-center">
              <Link
                href={d === today ? basePath : `${basePath}?date=${d}`}
                replace
                aria-current={on ? "date" : undefined}
                aria-label={new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(dt)}
                className={`pressable flex h-[4.25rem] w-12 flex-col items-center justify-center gap-0.5 rounded-full border ${
                  on ? "border-accent bg-accent text-on-accent" : "border-line bg-surface"
                }`}
              >
                <span className="numeral text-xl">{dt.getUTCDate()}</span>
                <span className={`text-xs ${on ? "" : d === today ? "font-semibold text-accent-ink" : "text-muted"}`}>
                  {d === today ? "Hari ini" : WEEKDAY[dt.getUTCDay()]}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
