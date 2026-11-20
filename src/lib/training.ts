export type LiftKind = "weighted" | "bodyweight" | "time";

export interface Prescription {
  lift: string;
  sets: number;
  min: number;
  max: number;
}

export interface StrengthProgram {
  id: string;
  name: string;
  level: string;
  equipment: string;
  daysPerWeek: number;
  description: string;
  sessions: { key: string; title: string; exercises: Prescription[] }[];
}

export interface RunWeek {
  intervals?: { runMin: number; walkMin: number; rounds: number };
  durationMin: number;
  note: string;
}

export interface RunPlan {
  id: string;
  name: string;
  level: string;
  daysPerWeek: number;
  description: string;
  weeks: RunWeek[];
}

export interface Catalog {
  programs: StrengthProgram[];
  runPlans: RunPlan[];
  lifts: { id: string; name: string; kind: LiftKind; cue: string }[];
}

export interface TrainingPlan {
  strength: { programId: string; days: number[] } | null;
  run: { planId: string; days: number[] } | null;
  startDate?: string;
}

export interface SetLog {
  value: number;
  weightKg?: number | null;
}

export interface TodayExercise {
  lift: string;
  name: string;
  kind: LiftKind;
  cue: string;
  min: number;
  max: number;
  last: { date: string; sets: SetLog[] | null } | null;
  target: { sets: number; value: number; weightKg: number | null; note: string };
}

export interface TrainingToday {
  date: string;
  plan: TrainingPlan | null;
  strength: {
    programId: string;
    programName: string;
    scheduled: boolean;
    done: boolean;
    logged: { lift: string; sets: SetLog[] }[] | null;
    sessionKey: string;
    title: string;
    exercises: TodayExercise[];
  } | null;
  run: {
    planId: string;
    planName: string;
    week: number;
    totalWeeks: number;
    scheduled: boolean;
    done: boolean;
    logged: { durationMin: number; distanceKm: number | null } | null;
    target: RunWeek;
    last: { date: string; durationMin: number; distanceKm: number | null } | null;
    thisWeekKm: number;
    lastWeekKm: number;
    weekKmTarget: number | null;
  } | null;
  week?: { date: string; strength: boolean; run: boolean; strengthDone: boolean; runDone: boolean }[];
}

/** Monday first, as Indonesian calendars show it. Values are JS weekdays (0 = Sunday). */
export const WEEKDAYS: { value: number; short: string; long: string }[] = [
  { value: 1, short: "Sen", long: "Senin" },
  { value: 2, short: "Sel", long: "Selasa" },
  { value: 3, short: "Rab", long: "Rabu" },
  { value: 4, short: "Kam", long: "Kamis" },
  { value: 5, short: "Jum", long: "Jumat" },
  { value: 6, short: "Sab", long: "Sabtu" },
  { value: 0, short: "Min", long: "Minggu" },
];

const kg = (n: number) => String(n).replace(".", ",");

/** "3 × 8 @ 42,5 kg", "3 × 10", "3 × 35 detik" */
export function targetLabel(kind: LiftKind, t: { sets: number; value: number; weightKg: number | null }) {
  const unit = kind === "time" ? " detik" : "";
  return `${t.sets} × ${t.value}${unit}${t.weightKg ? ` @ ${kg(t.weightKg)} kg` : ""}`;
}

/** "8, 8, 7 @ 40 kg" */
export function setsLabel(kind: LiftKind, sets: SetLog[]) {
  const values = sets.map((s) => s.value).join(", ");
  const w = Math.max(0, ...sets.map((s) => s.weightKg ?? 0));
  return `${values}${kind === "time" ? " detik" : ""}${w ? ` @ ${kg(w)} kg` : ""}`;
}

/** min/km from distance and minutes, e.g. "6:15". */
export function pace(distanceKm: number | null | undefined, durationMin: number): string | null {
  if (!distanceKm) return null;
  const secPerKm = Math.round((durationMin * 60) / distanceKm);
  return `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, "0")}`;
}

/**
 * YouTube search for the exercise's technique. A search, not a fixed video, so the link
 * never dies and always shows current, popular tutorials.
 */
export function videoUrl(liftName: string): string {
  const name = liftName.replace(/\s*\(.*?\)/g, "").trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`cara ${name} yang benar`)}`;
}
