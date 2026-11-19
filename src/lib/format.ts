import type { Intensity, MealType } from "./types";

export const TIME_ZONE = "Asia/Jakarta";

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Sarapan",
  lunch: "Makan siang",
  dinner: "Makan malam",
  snack: "Snack",
};

/** Short labels for the meal-time picker. */
export const MEAL_OPTIONS = (Object.keys(MEAL_LABEL) as MealType[]).map((v) => ({
  value: v,
  label: v === "breakfast" ? "Pagi" : v === "lunch" ? "Siang" : v === "dinner" ? "Malam" : "Snack",
}));

export const INTENSITY_LABEL: Record<Intensity, string> = {
  light: "Ringan",
  moderate: "Sedang",
  vigorous: "Berat",
};

const nf = new Intl.NumberFormat("id-ID");
export const fmt = (n: number) => nf.format(Math.round(n));
export const fmt1 = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

export function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function dayLabel(date: string): string {
  const today = todayLocal();
  if (date === today) return "Hari ini";
  if (date === shiftDate(today, -1)) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** dayLabel, plus the year when it is not this year. */
export function dateLabel(date: string): string {
  const label = dayLabel(date);
  return date.slice(0, 4) === todayLocal().slice(0, 4) ? label : `${label} ${date.slice(0, 4)}`;
}

export function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(new Date(iso));
}

/** Default meal slot from the current Jakarta hour. */
export function mealTypeNow(): MealType {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(new Date()),
  );
  if (hour >= 4 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}

/** ISO timestamp for `date` (local) at the current local time, or now if today. */
export function eatenAtFor(date: string): string {
  if (date === todayLocal()) return new Date().toISOString();
  return new Date(`${date}T12:00:00+07:00`).toISOString();
}
