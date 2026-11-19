import type { ProjectionInput, Sex } from "./types";

export interface Point {
  day: number;
  weightKg: number;
  /** Body fat as a fraction (0.25 = 25%). */
  bodyFat: number;
}

const KCAL_PER_KG = 7700;
/** Share of a weight change that is fat: most of a loss, a bit less of a gain. */
const FAT_SHARE_LOSS = 0.8;
const FAT_SHARE_GAIN = 0.6;

/**
 * Day-by-day projection for one year. TDEE is recomputed from each day's weight, so the
 * pace slows as weight moves. `followTarget` eats the profile target instead of the
 * recent average (the target already credits exercise back, like the Hari ini screen).
 */
export function simulate(p: ProjectionInput, followTarget: boolean, days = 365): Point[] {
  let w = p.weightKg ?? 0;
  const bf = (p.bodyFatPct ?? 0) / 100;
  let fat = w * bf;
  const out: Point[] = [{ day: 0, weightKg: w, bodyFat: bf }];
  for (let d = 1; d <= days; d++) {
    const bmr = 10 * w + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
    const tdee = bmr * p.activityFactor + p.avgBurn;
    const intake = followTarget ? tdee - (p.targetDeficit ?? 0) : (p.avgIntake ?? 0);
    const dw = (intake - tdee) / KCAL_PER_KG;
    w += dw;
    fat = Math.max(0, fat + dw * (dw < 0 ? FAT_SHARE_LOSS : FAT_SHARE_GAIN));
    out.push({ day: d, weightKg: w, bodyFat: fat / w });
  }
  return out;
}

/** Average daily balance at today's weight: negative is a deficit. */
export function dailyBalance(p: ProjectionInput): number {
  const bmr = 10 * (p.weightKg ?? 0) + 6.25 * p.heightCm - 5 * p.age + (p.sex === "male" ? 5 : -161);
  return (p.avgIntake ?? 0) - (bmr * p.activityFactor + p.avgBurn);
}

/** Body-fat bands (ACE). `max` is exclusive. */
const SHAPES: Record<Sex, { max: number; label: string; note: string }[]> = {
  male: [
    { max: 6, label: "Sangat kering", note: "Lemak di batas minimum. Sulit dan tidak sehat dipertahankan." },
    { max: 14, label: "Atletis", note: "Otot perut terlihat jelas, pembuluh darah di lengan tampak." },
    { max: 18, label: "Fit", note: "Garis otot perut samar terlihat, pinggang ramping." },
    { max: 25, label: "Rata-rata", note: "Otot belum terlihat jelas, ada lemak di perut dan pinggang." },
    { max: Infinity, label: "Berlebih", note: "Perut membulat, lemak menumpuk di pinggang dan dada." },
  ],
  female: [
    { max: 14, label: "Sangat kering", note: "Lemak di batas minimum. Sulit dan tidak sehat dipertahankan." },
    { max: 21, label: "Atletis", note: "Otot perut dan lengan terlihat, lekuk tubuh tegas." },
    { max: 25, label: "Fit", note: "Pinggang ramping, sedikit garis otot terlihat." },
    { max: 32, label: "Rata-rata", note: "Lekuk lembut, ada lemak di perut, pinggul, dan paha." },
    { max: Infinity, label: "Berlebih", note: "Lemak menumpuk di perut, pinggul, paha, dan lengan atas." },
  ],
};

export function bodyShapes(sex: Sex) {
  return SHAPES[sex];
}

export function bodyShape(sex: Sex, bodyFatPct: number) {
  const bands = SHAPES[sex];
  const i = bands.findIndex((b) => bodyFatPct < b.max);
  return { index: i, ...bands[i] };
}

const SIL: Record<Sex, { lean: number; heavy: number; sh: number[]; ch: number[]; wa: number[]; hp: number[]; arm: number[]; leg: number[] }> = {
  male: { lean: 8, heavy: 32, sh: [28, 34], ch: [22, 33], wa: [13, 38], hp: [17, 34], arm: [6, 14], leg: [9, 17] },
  female: { lean: 15, heavy: 40, sh: [21, 28], ch: [19, 30], wa: [11, 33], hp: [24, 41], arm: [5, 12], leg: [9, 18] },
};

/** Front silhouette (head drawn separately at 60,22 r13) in a 120×240 box; widens with body fat. */
export function silhouettePath(sex: Sex, bodyFatPct: number): string {
  const s = SIL[sex];
  const t = Math.max(0, Math.min(1, (bodyFatPct - s.lean) / (s.heavy - s.lean)));
  const k = (pair: number[]) => pair[0] + (pair[1] - pair[0]) * t;
  const [sh, ch, wa, hp, arm, leg] = [k(s.sh), k(s.ch), k(s.wa), k(s.hp), k(s.arm), k(s.leg)];
  const bulge = 8 * t;
  const gap = 3 - 2 * t;
  const outX = Math.max(wa + bulge * 0.6, hp) + arm / 2 + 4;
  const x = (m: number, dx: number) => (60 + m * dx).toFixed(1);

  const torso =
    `M${x(-1, 6)} 34 L${x(-1, 6)} 44 L${x(-1, sh)} 52 L${x(-1, ch)} 66 Q${x(-1, wa + bulge)} 100 ${x(-1, hp)} 134` +
    ` Q${x(-1, hp + 2)} 178 ${x(-1, leg + 3)} 230 L${x(-1, 3)} 230 L${x(-1, gap)} 150` +
    ` L${x(1, gap)} 150 L${x(1, 3)} 230 L${x(1, leg + 3)} 230 Q${x(1, hp + 2)} 178 ${x(1, hp)} 134` +
    ` Q${x(1, wa + bulge)} 100 ${x(1, ch)} 66 L${x(1, sh)} 52 L${x(1, 6)} 44 L${x(1, 6)} 34 Z`;
  const armPath = (m: number) => {
    const pts = [
      [sh - 3, 50],
      [sh + arm * 0.5, 54],
      [outX + arm / 2, 126],
      [outX - arm / 2, 128],
      [sh - arm * 0.6, 68],
    ];
    if (m > 0) pts.reverse(); // same winding as the torso so overlaps stay filled
    return ` M${pts.map(([dx, y]) => `${x(m, dx)} ${y}`).join(" L")} Z`;
  };
  return torso + armPath(-1) + armPath(1);
}
