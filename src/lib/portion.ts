/**
 * Portion math for the meal review screen.
 * Changing grams rescales calories and macros from a per-gram density, so typing
 * "150" one key at a time never compounds rounding. Editing a macro by hand
 * updates that macro's density, so later gram changes keep the user's number.
 */
export const MACROS = ["calories", "proteinG", "carbsG", "fatG"] as const;
export type Macro = (typeof MACROS)[number];
export type Macros = Record<Macro, number>;

export interface ItemRow {
  key: string;
  id?: string;
  name: string;
  portionDesc: string | null;
  confidence: number | null;
  /** Input text, so commas and partial numbers survive while typing. */
  grams: string;
  values: Record<Macro, string>;
  /** Per-gram values; null while grams is unknown. */
  density: Macros | null;
  /** The AI's original estimate, for the ½× 1× 1½× 2× shortcuts. */
  base: (Macros & { grams: number }) | null;
  open: boolean;
}

export const toNum = (v: string) => {
  const n = Number(v.trim().replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const fmtMacro = (m: Macro, n: number) => String(m === "calories" ? Math.round(n) : Math.round(n * 10) / 10);

export function rowFrom(item: { id?: string; name: string; portionDesc: string | null; confidence: number | null; grams: number } & Macros, open = false): ItemRow {
  const g = item.grams;
  return {
    key: item.id ?? crypto.randomUUID(),
    id: item.id,
    name: item.name,
    portionDesc: item.portionDesc,
    confidence: item.confidence,
    grams: g ? String(g) : "",
    values: Object.fromEntries(MACROS.map((m) => [m, String(item[m])])) as Record<Macro, string>,
    density: g > 0 ? (Object.fromEntries(MACROS.map((m) => [m, item[m] / g])) as Macros) : null,
    base: g > 0 ? { grams: g, calories: item.calories, proteinG: item.proteinG, carbsG: item.carbsG, fatG: item.fatG } : null,
    open,
  };
}

export function setGrams(row: ItemRow, text: string): ItemRow {
  const g = toNum(text);
  if (!row.density || g <= 0) {
    // First known weight: derive the density from what the user already typed.
    const density = g > 0 ? (Object.fromEntries(MACROS.map((m) => [m, toNum(row.values[m]) / g])) as Macros) : row.density;
    return { ...row, grams: text, density };
  }
  const density = row.density;
  const values = Object.fromEntries(MACROS.map((m) => [m, fmtMacro(m, density[m] * g)])) as Record<Macro, string>;
  return { ...row, grams: text, values };
}

export function setMacro(row: ItemRow, macro: Macro, text: string): ItemRow {
  const g = toNum(row.grams);
  const density = row.density && g > 0 ? { ...row.density, [macro]: toNum(text) / g } : row.density;
  return { ...row, values: { ...row.values, [macro]: text }, density };
}

export function applyMultiplier(row: ItemRow, multiplier: number): ItemRow {
  if (!row.base) return row;
  const base = row.base;
  const grams = Math.round(base.grams * multiplier);
  return {
    ...row,
    grams: String(grams),
    values: Object.fromEntries(MACROS.map((m) => [m, fmtMacro(m, base[m] * multiplier)])) as Record<Macro, string>,
    density: Object.fromEntries(MACROS.map((m) => [m, base[m] / base.grams])) as Macros,
  };
}

/** Which shortcut matches the current grams, if any. */
export function activeMultiplier(row: ItemRow): number | null {
  if (!row.base) return null;
  const ratio = toNum(row.grams) / row.base.grams;
  return [0.5, 1, 1.5, 2].find((m) => Math.abs(m - ratio) < 0.01) ?? null;
}
