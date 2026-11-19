"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Field, LoadingState, PageHeader, Segmented, Textarea } from "@/components/ui";
import { MEAL_LABEL, MEAL_OPTIONS, eatenAtFor, isDate, mealTypeNow, todayLocal } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { startMealAnalysis } from "@/lib/pending-meals";
import type { MealType } from "@/lib/types";

export default function CatatMakananPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CatatMakanan />
    </Suspense>
  );
}

/** One entry for meals: photo, text, or both. The AI runs in the background afterwards. */
function CatatMakanan() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const q = date === todayLocal() ? "" : `?date=${date}`;

  const [mealType, setMealType] = useState<MealType>(mealTypeNow);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  function pick(next: File | null) {
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file && !text.trim()) {
      setError("Ambil foto atau tulis makanannya dulu.");
      return;
    }
    setBusy(true);
    const form = new FormData();
    form.set("mealType", mealType);
    form.set("eatenAt", eatenAtFor(date));
    if (text.trim()) form.set("text", text.trim());
    if (file) form.set("photo", await compressImage(file), "meal.jpg");

    startMealAnalysis({
      form,
      date,
      mealType,
      label: text.trim() ? text.trim().slice(0, 40) : MEAL_LABEL[mealType].toLowerCase(),
      onOpen: (id) => router.push(`/makanan?id=${id}`),
    });
    router.push(`/hari-ini${q}`);
  }

  return (
    <>
      <PageHeader title="Catat makanan" back={`/catat${q}`} />
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Segmented name="mealType" legend="Waktu makan" value={mealType} onChange={setMealType} options={MEAL_OPTIONS} />

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Foto</span>
          <label
            htmlFor="photo"
            className={`pressable relative flex cursor-pointer items-center justify-center overflow-hidden rounded-[6px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
              preview ? "aspect-[4/3] bg-surface" : "min-h-28 border-2 border-dashed border-muted bg-surface"
            }`}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={preview} alt="Foto makanan yang dipilih" className="size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 px-6 py-4 text-center">
                <span className="font-display text-2xl font-bold">Ambil atau pilih foto</span>
                <span className="text-sm text-muted">Boleh dilewati kalau cukup ditulis</span>
              </span>
            )}
            <input
              ref={inputRef}
              id="photo"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </label>
          {preview && (
            <div className="flex gap-4">
              <Button variant="ghost" className="px-0 text-accent-ink" onClick={() => inputRef.current?.click()}>
                Ganti foto
              </Button>
              <Button variant="ghost" className="px-0 text-muted" onClick={() => pick(null)}>
                Hapus foto
              </Button>
            </div>
          )}
        </div>

        <Field
          label={file ? "Keterangan (opsional)" : "Makanan apa saja?"}
          htmlFor="text"
          hint={
            file
              ? "Membantu AI, misal \"nasi setengah porsi, tanpa kuah\"."
              : "Tanpa foto juga bisa. Sebut porsinya, misal \"mangga 3/4 potong\"."
          }
        >
          <Textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Nasi padang: nasi, rendang, sayur nangka"
            enterKeyHint="done"
          />
        </Field>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button type="submit" busy={busy} className="w-full">
            Hitung kalori
          </Button>
          <p className="text-center text-sm text-muted">
            AI menghitung di latar belakang. Hasilnya muncul di Hari ini untuk dicek.
          </p>
        </div>
      </form>
    </>
  );
}
