"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api, errorMessage, useApi } from "@/lib/api";
import { fmt, fmt1 } from "@/lib/format";
import type { Calibration } from "@/lib/types";
import { Button } from "./ui";

/** Below this gap the current target is already right; no point asking. */
const MIN_CHANGE = 50;

/**
 * Real calorie needs from the last 28 days. `compact` (Proyeksi) only shows up when there is a
 * change worth making; the full card (Profil) also shows progress toward enough data.
 */
export function CalibrationCard({ compact = false }: { compact?: boolean }) {
  const { data, mutate } = useApi<Calibration>("/profile/calibration");
  const [busy, setBusy] = useState(false);
  if (!data) return null;

  if (data.status === "not_enough") {
    if (compact) return null;
    return (
      <Shell title="Kalibrasi kebutuhan kalori">
        <p className="text-muted">
          Setelah cukup data, target kalori dihitung ulang dari makan dan perubahan beratmu yang sebenarnya, bukan
          hanya dari rumus.
        </p>
        <ul className="text-sm">
          <li>
            Catat makan seharian: <strong>{data.loggedDays}</strong> dari 14 hari
          </li>
          <li>
            Timbang: <strong>{data.weighIns}</strong> dari 4 kali, rentang <strong>{data.weighSpanDays}</strong> dari 14
            hari
          </li>
        </ul>
      </Shell>
    );
  }

  const change = data.suggestedCalories - data.currentTarget;
  if (compact && (data.status !== "ready" || Math.abs(change) < MIN_CHANGE)) return null;

  const trend =
    Math.abs(data.weightChangePerWeek) < 0.05
      ? "berat stabil"
      : `berat ${data.weightChangePerWeek < 0 ? "turun" : "naik"} ${fmt1(Math.abs(data.weightChangePerWeek))} kg/minggu`;

  async function apply() {
    setBusy(true);
    try {
      await api("/profile/calibration/apply", { body: {} });
      await mutate();
      toast.success(`Target kalori jadi ${fmt(data!.status === "not_enough" ? 0 : data!.suggestedCalories)} kkal`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title={data.status === "unreliable" ? "Kalibrasi belum bisa dipakai" : "Kebutuhan kalorimu yang sebenarnya"}>
      <p className="text-muted">
        28 hari terakhir: makan rata-rata {fmt(data.avgIntake)} kkal, {trend}. Artinya tubuhmu memakai sekitar{" "}
        <strong className="text-ink">{fmt(data.observedTdee)} kkal</strong> per hari (rumus: {fmt(data.formulaTdee)} kkal
        {data.avgBurn > 0 ? ` + olahraga ${fmt(data.avgBurn)} kkal` : ""}).
      </p>
      {data.status === "unreliable" ? (
        <p className="text-sm">
          Angkanya terlalu jauh dari rumus. Biasanya karena ada makanan yang tidak tercatat. Target tidak diubah; catat
          makan selengkap mungkin lalu cek lagi minggu depan.
        </p>
      ) : Math.abs(change) < MIN_CHANGE ? (
        <p className="text-sm">Target sekarang ({fmt(data.currentTarget)} kkal) sudah sesuai.</p>
      ) : (
        <>
          <p className="text-sm">
            Target disarankan <strong>{fmt(data.suggestedCalories)} kkal</strong> (sekarang {fmt(data.currentTarget)}{" "}
            kkal, {change > 0 ? "+" : "−"}
            {fmt(Math.abs(change))}). Protein tetap, karbo dan lemak menyesuaikan.
          </p>
          <Button onClick={apply} busy={busy} className="w-full">
            Pakai {fmt(data.suggestedCalories)} kkal
          </Button>
        </>
      )}
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border-2 border-ink p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
