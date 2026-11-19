export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type MealStatus = "draft" | "confirmed" | "needs_manual";
export type Intensity = "light" | "moderate" | "vigorous";
export type Goal = "recomp" | "lose" | "maintain" | "gain";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
}

export interface Session {
  token: string;
  user: User;
  hasProfile: boolean;
}

export interface Macros {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Profile {
  sex: "male" | "female";
  birthDate: string;
  heightCm: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  targetsOverridden: boolean;
  emailReminderEnabled: boolean;
}

export interface ProfileResponse {
  user: User;
  profile: Profile;
  latestWeightKg: number | null;
  suggested: (Macros & { bmr: number; tdee: number }) | null;
}

export interface MealItem {
  id: string;
  name: string;
  portionDesc: string | null;
  grams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: number | null;
  editedByUser: boolean;
}

export interface Meal {
  id: string;
  eatenAt: string;
  mealType: MealType;
  photoUrl: string | null;
  rawText: string | null;
  status: MealStatus;
  totalCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  assumptions: string[] | null;
  aiModel: string | null;
  items: MealItem[];
}

export interface ExerciseType {
  id: number;
  name: string;
  category: string;
  metValue: number;
}

export interface ExerciseLog {
  id: string;
  performedAt: string;
  exerciseTypeId: number | null;
  name: string;
  durationMin: number;
  intensity: Intensity;
  distanceKm: number | null;
  caloriesBurned: number;
  source: "manual" | "ai_parsed";
}

export interface ExerciseDraft {
  exerciseTypeId: number | null;
  name: string;
  rawText: string;
  durationMin: number;
  intensity: Intensity;
  distanceKm: number | null;
  detail: Record<string, unknown> | null;
  caloriesBurned: number;
  source: "ai_parsed";
}

export interface BodyComp {
  bmi: number | null;
  bodyFatPct: number | null;
  visceralFat: number | null;
  muscleKg: number | null;
  waterPct: number | null;
  obesityDegreePct: number | null;
  bmrKcal: number | null;
  metabolicAge: number | null;
  leanMassKg: number | null;
  proteinPct: number | null;
  boneMassKg: number | null;
}

export interface WeightLog extends BodyComp {
  id: string;
  date: string;
  weightKg: number;
}

export interface DailyDashboard {
  date: string;
  goal: Goal;
  targets: Macros;
  intake: Macros;
  burn: number;
  net: number;
  remaining: number;
  meals: Meal[];
  exercises: ExerciseLog[];
  weightKg: number | null;
  weight: WeightLog | null;
  hasSummary: boolean;
  hasAnyLog: boolean;
}

export interface SummaryAi {
  score: number;
  summary: string;
  highlights: string[];
  warnings: string[];
  recommendations: { type: "nutrition" | "workout" | "habit"; text: string }[];
}

export interface DailySummary {
  id: string;
  date: string;
  intakeKcal: number;
  burnKcal: number;
  netKcal: number;
  aiJson: SummaryAi;
  aiModel: string | null;
  generatedAt: string;
}
