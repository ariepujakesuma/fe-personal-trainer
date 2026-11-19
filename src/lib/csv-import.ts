import { BODY_COMP } from "./body-comp";
import type { BodyComp } from "./types";

/**
 * What a CSV column can be imported as. Units live in the target, so "water in litres" and
 * "water in %" are separate choices and the conversion is explicit.
 */
export type Target =
  | "ignore"
  | "date"
  | "weightKg"
  | "weightLb"
  | "bodyFatPct"
  | "fatMassKg"
  | "waterPct"
  | "waterL"
  | "proteinPct"
  | "proteinKg"
  | Exclude<keyof BodyComp, "bodyFatPct" | "waterPct" | "proteinPct">;

export const TARGETS: { value: Target; label: string }[] = [
  { value: "ignore", label: "Abaikan" },
  { value: "date", label: "Tanggal" },
  { value: "weightKg", label: "Berat (kg)" },
  { value: "weightLb", label: "Berat (lb)" },
  { value: "bodyFatPct", label: "Lemak tubuh (%)" },
  { value: "fatMassKg", label: "Massa lemak (kg)" },
  { value: "bmi", label: "BMI" },
  { value: "visceralFat", label: "Lemak visceral (level)" },
  { value: "muscleKg", label: "Otot (kg)" },
  { value: "waterPct", label: "Air (%)" },
  { value: "waterL", label: "Air (liter)" },
  { value: "obesityDegreePct", label: "Derajat obesitas (%)" },
  { value: "bmrKcal", label: "Metabolisme (kkal)" },
  { value: "metabolicAge", label: "Usia tubuh (tahun)" },
  { value: "leanMassKg", label: "Berat tanpa lemak (kg)" },
  { value: "proteinPct", label: "Protein (%)" },
  { value: "proteinKg", label: "Protein (kg)" },
  { value: "boneMassKg", label: "Massa tulang (kg)" },
];

/**
 * Column names seen in scale exports (InBody, Tanita, Zepp/Mi Fit, Renpho, Withings, Omron,
 * Garmin, Indonesian apps), lower-cased with the unit removed. Matched whole, never as a
 * substring, so "Right Arm Fat Mass" does not become fat mass.
 */
const ALIASES: Record<Exclude<Target, "ignore">, string[]> = {
  date: ["date", "tanggal", "time", "waktu", "datetime", "date time", "timestamp", "measurement date", "measured at", "tanggal pengukuran", "tgl"],
  weightKg: ["weight", "berat", "berat badan", "body weight", "weight kg", "bb"],
  weightLb: ["weight lb", "weight lbs"],
  bodyFatPct: ["percent body fat", "body fat", "body fat percentage", "body fat rate", "body fat %", "fat", "fat %", "fat rate", "pbf", "lemak tubuh", "lemak", "persentase lemak tubuh", "body fat pct"],
  fatMassKg: ["body fat mass", "fat mass", "massa lemak"],
  bmi: ["bmi", "body mass index", "imt"],
  visceralFat: ["visceral fat level", "visceral fat", "visceral fat rating", "visceral fat index", "lemak visceral", "visceral"],
  muscleKg: ["muscle mass", "muscle", "skeletal muscle mass", "skeletal muscle", "smm", "otot", "massa otot"],
  waterPct: ["body water", "water", "water rate", "body water rate", "hydration", "body water percentage", "air", "air tubuh", "kadar air"],
  waterL: ["total body water", "tbw"],
  obesityDegreePct: ["obesity degree", "derajat obesitas", "obesity"],
  bmrKcal: ["basal metabolic rate", "bmr", "basal metabolism", "metabolism", "metabolisme", "metabolisme basal"],
  metabolicAge: ["metabolic age", "body age", "actual age", "usia tubuh", "usia metabolik"],
  leanMassKg: ["fat free mass", "fat-free mass", "lean body mass", "lean mass", "weight without fat", "ffm", "lbm", "berat tanpa lemak"],
  proteinPct: ["protein", "protein rate", "protein %"],
  proteinKg: ["protein mass"],
  boneMassKg: ["bone mass", "bone mineral content", "bone", "massa tulang", "tulang"],
};

/** "Total Body Water(L)" → { name: "total body water", unit: "l" } */
function splitHeader(header: string) {
  const unit = header.match(/[([]\s*([^)\]]+?)\s*[)\]]/)?.[1]?.toLowerCase().replace(/\s/g, "") ?? "";
  const name = header
    .replace(/[([][^)\]]*[)\]]/g, " ")
    .toLowerCase()
    .replace(/[_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { name, unit };
}

/** Best guess for a column; the user can change every guess before importing. */
export function guessTarget(header: string): Target {
  const { name, unit } = splitHeader(header);
  const hit = (Object.keys(ALIASES) as (keyof typeof ALIASES)[]).find((t) => ALIASES[t].includes(name));
  if (!hit) return "ignore";
  // The unit in the header overrides the name: "Water (L)" is litres, "Protein (kg)" is mass.
  if (hit === "weightKg" && /^lbs?$/.test(unit)) return "weightLb";
  if ((hit === "waterPct" || hit === "waterL") && unit) return unit === "%" ? "waterPct" : /^(l|liter|litre)$/.test(unit) ? "waterL" : hit;
  if ((hit === "proteinPct" || hit === "proteinKg") && unit) return unit === "%" ? "proteinPct" : unit === "kg" ? "proteinKg" : hit;
  if ((hit === "bodyFatPct" || hit === "fatMassKg") && unit) return unit === "%" ? "bodyFatPct" : unit === "kg" ? "fatMassKg" : hit;
  return hit;
}

/** Parses CSV text with quotes; detects "," ";" or tab as the delimiter. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delim = [",", ";", "\t"].reduce((a, b) => (firstLine.split(b).length > firstLine.split(a).length ? b : a));
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      row.push(cell.trim());
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((v) => v !== "")) rows.push(row);
  return rows;
}

const pad = (n: number) => String(n).padStart(2, "0");
function ymd(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Date in common export formats → YYYY-MM-DD. Slash/dash dates with the year last are read
 * day-first (Indonesian style) unless only month-first makes sense.
 */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{0,6})$/); // InBody: 20260118063808
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return b > 12 && a <= 12 ? ymd(y, a, b) : ymd(y, b, a);
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  return null;
}

/** "57,6" / "57.6" / "1.594" (thousands) / "-" → number or null. */
export function parseNumber(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "").replace("−", "-");
  if (s === "" || s === "-" || s === "--" || /^n\/?a$/i.test(s)) return null;
  if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // 1.594 kkal
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export interface ImportRow extends Partial<BodyComp> {
  date: string;
  weightKg: number;
}

export interface Prepared {
  rows: ImportRow[];
  /** Rows that could not be used, with the reason, for the preview. */
  skipped: { line: number; reason: string }[];
  /** Readings outside the allowed range were dropped, not imported. */
  dropped: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Turns CSV rows into weight logs using the chosen column targets. */
export function prepareRows(data: string[][], targets: Target[]): Prepared {
  const skipped: Prepared["skipped"] = [];
  const byDate = new Map<string, ImportRow>();
  let dropped = 0;

  data.forEach((cells, i) => {
    const line = i + 2; // header is line 1
    const raw: Partial<Record<Target, string>> = {};
    targets.forEach((t, c) => {
      if (t !== "ignore" && cells[c] != null && raw[t] == null) raw[t] = cells[c];
    });
    const date = raw.date ? parseDate(raw.date) : null;
    if (!date) return skipped.push({ line, reason: raw.date ? `Tanggal "${raw.date}" tidak terbaca` : "Tanggal kosong" });

    const num = (t: Target) => (raw[t] != null ? parseNumber(raw[t]!) : null);
    const lb = num("weightLb");
    const weightKg = num("weightKg") ?? (lb != null ? r1(lb * 0.45359237) : null);
    if (weightKg == null || weightKg < 25 || weightKg > 350)
      return skipped.push({ line, reason: "Berat kosong atau di luar 25–350 kg" });

    const pctOf = (v: number | null) => (v == null ? null : r1((v / weightKg) * 100));
    const comp: Partial<Record<keyof BodyComp, number | null>> = {};
    for (const f of BODY_COMP) if (f.key in raw) comp[f.key] = num(f.key as Target);
    comp.bodyFatPct = num("bodyFatPct") ?? pctOf(num("fatMassKg"));
    comp.waterPct = num("waterPct") ?? pctOf(num("waterL"));
    comp.proteinPct = num("proteinPct") ?? pctOf(num("proteinKg"));
    if (comp.leanMassKg == null && comp.bodyFatPct != null) comp.leanMassKg = r1(weightKg * (1 - comp.bodyFatPct / 100));

    const row: ImportRow = { date, weightKg };
    for (const f of BODY_COMP) {
      let v = comp[f.key];
      if (v == null) continue;
      if (f.int) v = Math.round(v);
      if (v < f.min || v > f.max) {
        dropped++;
        continue;
      }
      row[f.key] = v;
    }
    byDate.set(date, row); // the last measurement of a day wins
  });

  const rows = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { rows, skipped, dropped };
}
