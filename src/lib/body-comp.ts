import type { BodyComp } from "./types";

/**
 * Smart-scale readings in the order the scale app lists them. `scale` is the label shown
 * in the scale app, so the user can match fields while copying. Ranges mirror the backend.
 */
export const BODY_COMP: {
  key: keyof BodyComp;
  label: string;
  scale: string;
  unit: string;
  min: number;
  max: number;
  int?: boolean;
  /** Other unit some scales use (InBody: litres of water, kg of protein); converted to % of weight. */
  alt?: string;
}[] = [
  { key: "visceralFat", label: "Lemak visceral", scale: "Visceral Fat", unit: "level", min: 1, max: 60 },
  { key: "bmi", label: "BMI", scale: "BMI", unit: "", min: 10, max: 80 },
  { key: "muscleKg", label: "Otot", scale: "Muscle", unit: "kg", min: 5, max: 150 },
  { key: "waterPct", label: "Air", scale: "Water", unit: "%", min: 20, max: 80, alt: "L" },
  { key: "obesityDegreePct", label: "Derajat obesitas", scale: "Obesity Degree", unit: "%", min: -60, max: 200 },
  { key: "bmrKcal", label: "Metabolisme", scale: "Metabolism", unit: "kkal", min: 500, max: 5000, int: true },
  { key: "metabolicAge", label: "Usia tubuh", scale: "Actual Age", unit: "tahun", min: 10, max: 100, int: true },
  { key: "bodyFatPct", label: "Lemak tubuh", scale: "Fat", unit: "%", min: 2, max: 75 },
  { key: "leanMassKg", label: "Berat tanpa lemak", scale: "Weight Without Fat", unit: "kg", min: 10, max: 250 },
  { key: "proteinPct", label: "Protein", scale: "Protein", unit: "%", min: 3, max: 35, alt: "kg" },
  { key: "boneMassKg", label: "Massa tulang", scale: "Bone Mass", unit: "kg", min: 0.5, max: 10 },
];

export function hasBodyComp(w: Partial<BodyComp> | null | undefined): boolean {
  return !!w && BODY_COMP.some((f) => w[f.key] != null);
}

/** Short list of the readings people look at first. */
export function compBrief(w: Partial<BodyComp>): string[] {
  const one = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  return [
    w.bodyFatPct != null && `Lemak ${one(w.bodyFatPct)}%`,
    w.muscleKg != null && `Otot ${one(w.muscleKg)} kg`,
    w.waterPct != null && `Air ${one(w.waterPct)}%`,
    w.visceralFat != null && `Visceral ${one(w.visceralFat)}`,
  ].filter(Boolean) as string[];
}

const fmtNum = (n: number) => String(n).replace(".", ",");

/** Parses a typed value ("57,6", "−5"). Empty means "no reading". */
export function parseReading(text: string): number | null {
  const s = text.trim().replace(",", ".").replace("−", "-");
  return s === "" ? null : Number(s);
}

/** Same checks as the backend, so mistakes show while typing instead of after saving. */
export function readingError(field: { min: number; max: number; int?: boolean }, text: string): string | null {
  const v = parseReading(text);
  if (v == null) return null;
  if (Number.isNaN(v)) return "Harus berupa angka";
  if (field.int && !Number.isInteger(v)) return "Harus bilangan bulat";
  if (v < field.min || v > field.max) return `Antara ${fmtNum(field.min)} dan ${fmtNum(field.max)}`;
  return null;
}
