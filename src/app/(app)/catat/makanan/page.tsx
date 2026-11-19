"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Field, LoadingState, PageHeader, Segmented, Textarea } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { MEAL_LABEL, eatenAtFor, isDate, mealTypeNow, todayLocal } from "@/lib/format";
import { compressImage } from "@/lib/image";
import type { Meal, MealType } from "@/lib/types";

export default function CatatMakananPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CatatMakanan />
    </Suspense>
  );
}

const MEAL_OPTIONS = (Object.keys(MEAL_LABEL) as MealType[]).map((v) => ({
  value: v,
  label: v === "breakfast" ? "Pagi" : v === "lunch" ? "Siang" : v === "dinner" ? "Malam" : "Snack",
}));

function CatatMakanan() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const textMode = params.get("mode") === "text";
  const back = `/catat${date === todayLocal() ? "" : `?date=${date}`}`;

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
    if (textMode ? !text.trim() : !file) {
      setError(textMode ? "Tulis dulu makanannya." : "Pilih atau ambil foto dulu.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("mealType", mealType);
      form.set("eatenAt", eatenAtFor(date));
      if (text.trim()) form.set("text", text.trim());
      if (!textMode && file) form.set("photo", await compressImage(file), "meal.jpg");
      const meal = await api<Meal>("/meals/analyze", { body: form });
      router.replace(`/makanan?id=${meal.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title={textMode ? "Tulis makanan" : "Foto makanan"} back={back} />
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Segmented name="mealType" legend="Waktu makan" value={mealType} onChange={setMealType} options={MEAL_OPTIONS} />

        {!textMode && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Foto</span>
            <label
              htmlFor="photo"
              className={`pressable relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-[6px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                preview ? "bg-surface" : "border-2 border-dashed border-muted bg-surface"
              }`}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={preview} alt="Foto makanan yang dipilih" className="size-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 px-6 text-center">
                  <span className="font-display text-2xl font-bold">Ambil atau pilih foto</span>
                  <span className="text-sm text-muted">Foto dari atas, seluruh piring terlihat</span>
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
              <Button variant="ghost" className="self-start px-0 text-accent-ink" onClick={() => inputRef.current?.click()}>
                Ganti foto
              </Button>
            )}
          </div>
        )}

        <Field
          label={textMode ? "Makanan apa saja?" : "Catatan (opsional)"}
          htmlFor="text"
          hint={textMode ? "Sebut porsinya kalau bisa, misal \"nasi setengah porsi\"." : "Membantu AI, misal \"nasi setengah porsi, tanpa kuah\"."}
        >
          <Textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder={textMode ? "Nasi padang: nasi, rendang, sayur nangka" : ""}
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
            {busy ? "AI sedang menghitung" : "Hitung kalori"}
          </Button>
          {busy && <p className="text-center text-sm text-muted">Biasanya selesai dalam 15 detik.</p>}
        </div>
      </form>
    </>
  );
}
