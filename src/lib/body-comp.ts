import type { BodyComp } from "./types";

/** Smart-scale readings in the order the user listed them. Units match the backend validation. */
export const BODY_COMP: { key: keyof BodyComp; label: string; unit: string; int?: boolean; hint: string }[] = [
  { key: "visceralFat", label: "Lemak visceral", unit: "level", hint: "1–60" },
  { key: "bmi", label: "BMI", unit: "", hint: "10–80" },
  { key: "muscleKg", label: "Massa otot", unit: "kg", hint: "5–150" },
  { key: "waterPct", label: "Air", unit: "%", hint: "20–80" },
  { key: "obesityDegreePct", label: "Derajat obesitas", unit: "%", hint: "−60–200" },
  { key: "bmrKcal", label: "Metabolisme", unit: "kkal", int: true, hint: "500–5000" },
  { key: "metabolicAge", label: "Usia tubuh", unit: "tahun", int: true, hint: "10–100" },
  { key: "bodyFatPct", label: "Lemak tubuh", unit: "%", hint: "2–75" },
  { key: "leanMassKg", label: "Berat tanpa lemak", unit: "kg", hint: "10–250" },
  { key: "proteinPct", label: "Protein", unit: "%", hint: "3–35" },
  { key: "boneMassKg", label: "Massa tulang", unit: "kg", hint: "0,5–10" },
];

export function hasBodyComp(w: Partial<BodyComp> | null | undefined): boolean {
  return !!w && BODY_COMP.some((f) => w[f.key] != null);
}
