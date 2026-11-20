"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { WEEKDAYS, type Catalog, type TrainingPlan } from "@/lib/training";

/** Default days per program size, spread so there is a rest day between sessions. */
const DEFAULT_DAYS: Record<number, number[]> = { 2: [2, 6], 3: [1, 3, 5], 4: [1, 2, 4, 5] };

export default function ProgramPage() {
  const catalog = useApi<Catalog>("/training/catalog");
  const current = useApi<{ plan: TrainingPlan | null }>("/training/plan");
  if (catalog.error || current.error)
    return <ErrorState message={errorMessage(catalog.error ?? current.error)} onRetry={() => (catalog.mutate(), current.mutate())} />;
  if (!catalog.data || !current.data) return <LoadingState />;
  return <Picker catalog={catalog.data} plan={current.data.plan} />;
}

function Picker({ catalog, plan }: { catalog: Catalog; plan: TrainingPlan | null }) {
  const router = useRouter();
  const [programId, setProgramId] = useState<string | null>(plan ? (plan.strength?.programId ?? null) : catalog.programs[0].id);
  const [strengthDays, setStrengthDays] = useState<number[]>(plan?.strength?.days ?? DEFAULT_DAYS[3]);
  const [runId, setRunId] = useState<string | null>(plan?.run?.planId ?? null);
  const [runDays, setRunDays] = useState<number[]>(plan?.run?.days ?? DEFAULT_DAYS[2]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const program = catalog.programs.find((p) => p.id === programId);
  const runPlan = catalog.runPlans.find((p) => p.id === runId);

  async function save() {
    if (!programId && !runId) return setError("Pilih minimal satu program.");
    if (programId && !strengthDays.length) return setError("Pilih hari latihan beban.");
    if (runId && !runDays.length) return setError("Pilih hari lari.");
    setBusy(true);
    try {
      await api("/training/plan", {
        method: "PUT",
        body: {
          strength: programId ? { programId, days: strengthDays } : null,
          run: runId ? { planId: runId, days: runDays } : null,
        },
      });
      toast.success("Program latihan tersimpan");
      router.push("/latihan");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Program latihan" back={plan ? "/latihan" : "/catat"} />
      <div className="flex flex-col gap-8">
        <section aria-labelledby="beban" className="flex flex-col gap-3">
          <h2 id="beban" className="font-display text-2xl font-bold">
            Latihan beban
          </h2>
          <p className="text-sm text-muted">Untuk recomp, latihan beban adalah yang menjaga otot saat lemak turun.</p>
          <Choice
            name="program"
            options={[
              ...catalog.programs.map((p) => ({
                value: p.id,
                title: `${p.name} · ${p.equipment}`,
                desc: `${p.level}, ${p.daysPerWeek}x seminggu. ${p.description}`,
              })),
              { value: "", title: "Tanpa latihan beban", desc: "" },
            ]}
            value={programId ?? ""}
            onChange={(v) => {
              setProgramId(v || null);
              const p = catalog.programs.find((x) => x.id === v);
              if (p) setStrengthDays(DEFAULT_DAYS[p.daysPerWeek] ?? strengthDays);
            }}
          />
          {program && (
            <Days
              legend={`Hari latihan beban (disarankan ${program.daysPerWeek} hari, ada jeda istirahat)`}
              value={strengthDays}
              onChange={setStrengthDays}
            />
          )}
        </section>

        <section aria-labelledby="lari" className="flex flex-col gap-3">
          <h2 id="lari" className="font-display text-2xl font-bold">
            Lari
          </h2>
          <Choice
            name="run"
            options={[
              ...catalog.runPlans.map((p) => ({
                value: p.id,
                title: p.name,
                desc: `${p.level}, ${p.daysPerWeek}x seminggu. ${p.description}`,
              })),
              { value: "", title: "Tanpa program lari", desc: "Lari tetap bisa dicatat kapan saja." },
            ]}
            value={runId ?? ""}
            onChange={(v) => {
              setRunId(v || null);
              const p = catalog.runPlans.find((x) => x.id === v);
              if (p) setRunDays(DEFAULT_DAYS[p.daysPerWeek] ?? runDays);
            }}
          />
          {runPlan && (
            <Days legend={`Hari lari (disarankan ${runPlan.daysPerWeek} hari)`} value={runDays} onChange={setRunDays} />
          )}
        </section>

        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <Button onClick={save} busy={busy} className="w-full">
          Simpan program
        </Button>
      </div>
    </>
  );
}

function Choice({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: string; title: string; desc: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">Pilih program</legend>
      {options.map((o) => (
        <label
          key={o.value || "none"}
          className={`no-select flex min-h-14 cursor-pointer flex-col justify-center rounded-[6px] border px-4 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
            value === o.value ? "border-ink bg-surface" : "border-line"
          }`}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
          <span className="font-semibold">
            {value === o.value && <span className="mr-2 inline-block size-2.5 bg-accent align-middle" aria-hidden />}
            {o.title}
          </span>
          {o.desc && <span className="text-sm text-muted">{o.desc}</span>}
        </label>
      ))}
    </fieldset>
  );
}

function Days({ legend, value, onChange }: { legend: string; value: number[]; onChange: (v: number[]) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => {
          const on = value.includes(d.value);
          return (
            <label
              key={d.value}
              className={`no-select flex min-h-11 cursor-pointer items-center justify-center rounded-[4px] border text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                on ? "border-ink bg-ink text-paper" : "border-line text-muted"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? value.filter((x) => x !== d.value) : [...value, d.value])}
                className="sr-only"
                aria-label={d.long}
              />
              {d.short}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
