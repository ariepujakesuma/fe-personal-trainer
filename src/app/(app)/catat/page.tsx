"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LoadingState, PageHeader } from "@/components/ui";
import { dayLabel, isDate, todayLocal } from "@/lib/format";

export default function CatatPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Catat />
    </Suspense>
  );
}

function Catat() {
  const raw = useSearchParams().get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const q = date === todayLocal() ? "" : `?date=${date}`;
  const withMode = (mode: string) => `/catat/makanan?mode=${mode}${date === todayLocal() ? "" : `&date=${date}`}`;

  const others = [
    { href: withMode("text"), title: "Tulis makanan", desc: "Tidak sempat foto? Ketik saja, misal \"nasi padang rendang\"." },
    { href: `/catat/olahraga${q}`, title: "Olahraga", desc: "Pilih dari daftar atau ceritakan, AI yang merapikan." },
    { href: `/catat/berat${q}`, title: "Berat badan", desc: "Plus komposisi tubuh dari timbangan pintar, kalau ada." },
  ];

  return (
    <>
      <PageHeader title="Catat" />
      {date !== todayLocal() && <p className="-mt-2 mb-4 text-muted">Untuk {dayLabel(date).toLowerCase()}</p>}

      <Link
        href={withMode("photo")}
        className="pressable flex min-h-40 flex-col justify-between gap-4 rounded-[6px] bg-accent p-5 text-on-accent"
      >
        <span className="numeral text-6xl">Foto makanan</span>
        <span className="max-w-[28ch] font-medium">Ambil foto piringmu. AI mengenali isinya dan menghitung kalori serta makronya.</span>
      </Link>

      <ul className="mt-4 flex flex-col divide-y divide-line border-y border-line">
        {others.map((o) => (
          <li key={o.href}>
            <Link href={o.href} className="pressable flex min-h-20 flex-col justify-center gap-0.5 py-3 hover:bg-surface">
              <span className="font-display text-2xl font-bold">{o.title}</span>
              <span className="text-sm text-muted">{o.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
