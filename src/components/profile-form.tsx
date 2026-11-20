"use client";

import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { fmt } from "@/lib/format";
import { useSession } from "@/lib/session";
import type { ActivityLevel, Goal, ProfileResponse } from "@/lib/types";
import { Button, Field, Input, Select, Segmented } from "./ui";

const GOALS: { value: Goal; label: string; hint: string }[] = [
  { value: "recomp", label: "Turun BB + naik otot", hint: "Defisit 400 kkal, protein 1,8 g/kg" },
  { value: "lose", label: "Turun berat badan", hint: "Defisit 500 kkal" },
  { value: "maintain", label: "Jaga berat badan", hint: "Kalori sama dengan kebutuhan harian" },
  { value: "gain", label: "Naik berat badan", hint: "Surplus 300 kkal" },
];

const ACTIVITY: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary", label: "Jarang bergerak (kerja duduk, tanpa olahraga)" },
  { value: "light", label: "Ringan (olahraga 1-3x seminggu)" },
  { value: "moderate", label: "Sedang (olahraga 3-5x seminggu)" },
  { value: "active", label: "Aktif (olahraga 6-7x seminggu)" },
  { value: "very_active", label: "Sangat aktif (latihan berat / kerja fisik)" },
];

export function ProfileForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial?: ProfileResponse;
  submitLabel: string;
  onSaved: (res: ProfileResponse) => void;
}) {
  const p = initial?.profile;
  const session = useSession();
  const [sex, setSex] = useState<"male" | "female">(p?.sex ?? "male");
  const [goal, setGoal] = useState<Goal>(p?.goal ?? "recomp");
  const [override, setOverride] = useState(p?.targetsOverridden ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => Number(String(f.get(k)).replace(",", "."));
    setBusy(true);
    setError(null);
    try {
      const res = await api<ProfileResponse>("/profile", {
        method: "PUT",
        body: {
          name: f.get("name") || undefined,
          sex,
          goal,
          birthDate: f.get("birthDate"),
          heightCm: num("heightCm"),
          weightKg: f.get("weightKg") ? num("weightKg") : undefined,
          targetWeightKg: f.get("targetWeightKg") ? num("targetWeightKg") : null,
          activityLevel: f.get("activityLevel"),
          targets: override
            ? { calories: num("tCalories"), proteinG: num("tProtein"), carbsG: num("tCarbs"), fatG: num("tFat") }
            : null,
        },
      });
      onSaved(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <Field label="Nama" htmlFor="name">
        <Input id="name" name="name" defaultValue={initial?.user.name ?? session?.user.name} autoComplete="name" required />
      </Field>

      <Segmented
        name="sex"
        legend="Jenis kelamin"
        value={sex}
        onChange={setSex}
        options={[
          { value: "male", label: "Laki-laki" },
          { value: "female", label: "Perempuan" },
        ]}
      />

      <Field label="Tanggal lahir" htmlFor="birthDate">
        <Input id="birthDate" name="birthDate" type="date" required defaultValue={p?.birthDate} max="2015-12-31" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tinggi (cm)" htmlFor="heightCm">
          <Input id="heightCm" name="heightCm" inputMode="decimal" required defaultValue={p?.heightCm} placeholder="170" />
        </Field>
        <Field label="Berat sekarang (kg)" htmlFor="weightKg">
          <Input
            id="weightKg"
            name="weightKg"
            inputMode="decimal"
            required={!initial}
            defaultValue={initial?.latestWeightKg ?? undefined}
            placeholder="70"
          />
        </Field>
      </div>

      <Field label="Target berat (kg)" htmlFor="targetWeightKg" hint="Opsional. Dipakai untuk perkiraan kapan target tercapai.">
        <Input
          id="targetWeightKg"
          name="targetWeightKg"
          inputMode="decimal"
          defaultValue={p?.targetWeightKg ?? undefined}
          placeholder="75"
        />
      </Field>

      <Field label="Aktivitas harian" htmlFor="activityLevel">
        <Select id="activityLevel" name="activityLevel" defaultValue={p?.activityLevel ?? "light"}>
          {ACTIVITY.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Goal</legend>
        {GOALS.map((g) => (
          <label
            key={g.value}
            className={`no-select flex min-h-14 cursor-pointer flex-col justify-center rounded-2xl border px-4 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
              goal === g.value ? "border-ink bg-surface" : "border-line"
            }`}
          >
            <input type="radio" name="goal" value={g.value} checked={goal === g.value} onChange={() => setGoal(g.value)} className="sr-only" />
            <span className="font-semibold">
              {goal === g.value && <span className="mr-2 inline-block size-2.5 bg-accent align-middle" aria-hidden />}
              {g.label}
            </span>
            <span className="text-sm text-muted">{g.hint}</span>
          </label>
        ))}
      </fieldset>

      {initial && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block font-semibold">Atur target manual</span>
              <span className="text-sm text-muted">
                {initial.suggested ? `Hitungan otomatis: ${fmt(initial.suggested.calories)} kkal` : "Hitungan otomatis dari profil"}
              </span>
            </span>
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="size-5 accent-[var(--accent)]" />
          </label>
          {override && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kalori (kkal)" htmlFor="tCalories">
                <Input id="tCalories" name="tCalories" inputMode="numeric" defaultValue={p?.targetCalories} required />
              </Field>
              <Field label="Protein (g)" htmlFor="tProtein">
                <Input id="tProtein" name="tProtein" inputMode="numeric" defaultValue={p?.targetProteinG} required />
              </Field>
              <Field label="Karbo (g)" htmlFor="tCarbs">
                <Input id="tCarbs" name="tCarbs" inputMode="numeric" defaultValue={p?.targetCarbsG} required />
              </Field>
              <Field label="Lemak (g)" htmlFor="tFat">
                <Input id="tFat" name="tFat" inputMode="numeric" defaultValue={p?.targetFatG} required />
              </Field>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" busy={busy} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
