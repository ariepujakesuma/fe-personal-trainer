"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, ErrorState, Field, Input, LoadingState, PageHeader, Segmented, Select, Textarea } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { INTENSITY_LABEL, eatenAtFor, fmt, isDate, todayLocal } from "@/lib/format";
import type { ExerciseDraft, ExerciseLog, ExerciseType, Intensity } from "@/lib/types";

export default function OlahragaPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Olahraga />
    </Suspense>
  );
}

const OTHER = "other";

function Olahraga() {
  const router = useRouter();
  const raw = useSearchParams().get("date");
  const date = isDate(raw) ? raw : todayLocal();
  const q = date === todayLocal() ? "" : `?date=${date}`;
  const types = useApi<ExerciseType[]>("/exercise-types", { revalidateOnFocus: false });

  const [story, setStory] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [typeId, setTypeId] = useState<string>("");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [rawText, setRawText] = useState<string | null>(null);
  const [aiName, setAiName] = useState<string | null>(null);
  const [source, setSource] = useState<"manual" | "ai_parsed">("manual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ExerciseType[]>();
    for (const t of types.data ?? []) map.set(t.category, [...(map.get(t.category) ?? []), t]);
    return [...map.entries()];
  }, [types.data]);

  async function parse() {
    if (story.trim().length < 3) return setParseError("Ceritakan olahraganya dulu, misal \"lari 5 km 30 menit\".");
    setParsing(true);
    setParseError(null);
    try {
      const d = await api<ExerciseDraft>("/exercises/parse", { body: { text: story.trim() } });
      setTypeId(d.exerciseTypeId ? String(d.exerciseTypeId) : OTHER);
      setName(d.exerciseTypeId ? "" : d.name);
      setDuration(String(d.durationMin));
      setDistance(d.distanceKm ? String(d.distanceKm) : "");
      setIntensity(d.intensity);
      setRawText(d.rawText);
      setAiName(d.name);
      setSource("ai_parsed");
      toast.success(`Terbaca: ${d.name}, ${d.durationMin} menit, sekitar ${fmt(d.caloriesBurned)} kkal. Cek lalu simpan.`);
    } catch (err) {
      setParseError(errorMessage(err));
    } finally {
      setParsing(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const minutes = Number(duration);
    if (!typeId) return setError("Pilih jenis olahraga.");
    if (typeId === OTHER && !name.trim()) return setError("Isi nama olahraganya.");
    if (!minutes || minutes < 1 || minutes > 600) return setError("Isi durasi 1 sampai 600 menit.");
    setBusy(true);
    setError(null);
    try {
      const log = await api<ExerciseLog>("/exercises", {
        body: {
          exerciseTypeId: typeId === OTHER ? null : Number(typeId),
          name: typeId === OTHER ? name.trim() : (aiName ?? undefined),
          durationMin: minutes,
          intensity,
          distanceKm: distance ? Number(distance.replace(",", ".")) : null,
          rawText,
          source,
          performedAt: eatenAtFor(date),
        },
      });
      toast.success(`${log.name}: ${fmt(log.caloriesBurned)} kkal terbakar`);
      router.push(`/${q}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Olahraga" back={`/catat${q}`} />

      <section aria-labelledby="cerita" className="flex flex-col gap-3 rounded-[6px] border border-line bg-surface p-4">
        <h2 id="cerita" className="font-display text-xl font-bold">
          Ceritakan, biar AI yang isi
        </h2>
        <Textarea
          aria-labelledby="cerita"
          value={story}
          onChange={(e) => setStory(e.target.value)}
          maxLength={500}
          placeholder="Gym 1 jam: squat 4x8 60 kg, bench 3x10"
          className="min-h-20"
        />
        {parseError && (
          <p className="text-sm text-danger" role="alert">
            {parseError}
          </p>
        )}
        <Button variant="secondary" busy={parsing} onClick={parse}>
          Isi form dari cerita
        </Button>
      </section>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
        {types.isLoading && <LoadingState label="Memuat jenis olahraga" />}
        {types.error && <ErrorState message={errorMessage(types.error)} onRetry={() => types.mutate()} />}
        {types.data && (
          <Field label="Jenis olahraga" htmlFor="type">
            <Select
              id="type"
              value={typeId}
              onChange={(e) => {
                setTypeId(e.target.value);
                setAiName(null);
              }}
              required
            >
              <option value="" disabled>
                Pilih jenis
              </option>
              {grouped.map(([category, list]) => (
                <optgroup key={category} label={category}>
                  {list.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value={OTHER}>Lainnya</option>
            </Select>
          </Field>
        )}
        {typeId === OTHER && (
          <Field label="Nama olahraga" htmlFor="name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Padel" />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Durasi (menit)" htmlFor="duration">
            <Input id="duration" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="30" />
          </Field>
          <Field label="Jarak (km, opsional)" htmlFor="distance">
            <Input id="distance" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} />
          </Field>
        </div>
        <Segmented
          name="intensity"
          legend="Intensitas"
          value={intensity}
          onChange={setIntensity}
          options={(Object.keys(INTENSITY_LABEL) as Intensity[]).map((v) => ({ value: v, label: INTENSITY_LABEL[v] }))}
        />
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" busy={busy} className="w-full">
          Simpan olahraga
        </Button>
      </form>
    </>
  );
}
