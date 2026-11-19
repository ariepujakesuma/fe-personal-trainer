"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Button,
  ErrorState,
  Field,
  Input,
  LoadingState,
  PageHeader,
} from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { dayLabel, fmt1, isDate, shiftDate, todayLocal } from "@/lib/format";

interface WeightLog {
  id: string;
  date: string;
  weightKg: number;
}

export default function BeratPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Berat />
    </Suspense>
  );
}

function Berat() {
  const router = useRouter();
  const raw = useSearchParams().get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const q = date === todayLocal() ? "" : `?date=${date}`;
  const { data, error, isLoading, mutate } = useApi<WeightLog[]>(
    `/weights?from=${shiftDate(date, -29)}&to=${date}`,
  );
  const current = data?.find((w) => w.date.slice(0, 10) === date);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(
      String(new FormData(e.currentTarget).get("weightKg")).replace(",", "."),
    );
    if (!value || value < 25 || value > 350)
      return setFieldError("Isi berat antara 25 dan 350 kg.");
    setBusy(true);
    setFieldError(null);
    try {
      await api("/weights", { body: { date, weightKg: value } });
      toast.success(`Berat ${fmt1(value)} kg tersimpan`);
      router.push(`/${q}`);
    } catch (err) {
      setFieldError(errorMessage(err));
      setBusy(false);
    }
  }

  const recent = [...(data ?? [])].reverse().slice(0, 7);

  return (
    <>
      <PageHeader title="Berat badan" back={`/catat${q}`} />
      {/* Render the form only after history loads so a late load never resets what the user typed. */}
      {(data || error) && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field
            label={`Berat ${dayLabel(date).toLowerCase()} (kg)`}
            htmlFor="weightKg"
            error={fieldError}
          >
            <Input
              id="weightKg"
              name="weightKg"
              inputMode="decimal"
              defaultValue={current ? String(current.weightKg) : ""}
              placeholder="70,5"
              enterKeyHint="done"
              className="numeral h-16 text-4xl"
            />
          </Field>
          <Button type="submit" busy={busy} className="w-full">
            Simpan berat
          </Button>
        </form>
      )}

      <section aria-labelledby="riwayat" className="mt-8 flex flex-col gap-3">
        <h2 id="riwayat" className="font-display text-2xl font-bold">
          30 hari terakhir
        </h2>
        {isLoading && <LoadingState />}
        {error && (
          <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />
        )}
        {data && recent.length === 0 && (
          <p className="text-muted">Belum ada catatan berat badan.</p>
        )}
        {recent.length > 0 && (
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {recent.map((w) => (
              <li
                key={w.id}
                className="flex min-h-12 items-center justify-between"
              >
                <span className="text-muted">
                  {dayLabel(w.date.slice(0, 10))}
                </span>
                <span className="numeral text-2xl">{fmt1(w.weightKg)} kg</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
