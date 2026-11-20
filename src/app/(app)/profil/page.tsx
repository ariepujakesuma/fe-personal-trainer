"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CalibrationCard } from "@/components/calibration-card";
import { ProfileForm } from "@/components/profile-form";
import { Button, ErrorState, LoadingState, PageHeader, Segmented } from "@/components/ui";
import { api, errorMessage, useApi } from "@/lib/api";
import { fmt } from "@/lib/format";
import { setSession, updateSession, useSession } from "@/lib/session";
import { setThemePref, useThemePref, type ThemePref } from "@/lib/theme";
import type { ProfileResponse } from "@/lib/types";

export default function ProfilPage() {
  const router = useRouter();
  const session = useSession();
  const { data, error, isLoading, mutate } = useApi<ProfileResponse>("/profile");
  const theme = useThemePref();
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminder, setReminder] = useState<boolean | null>(null);

  async function toggleReminder(enabled: boolean) {
    if (!data) return;
    const p = data.profile;
    setReminder(enabled); // optimistic: the switch answers the tap immediately
    setReminderBusy(true);
    try {
      const res = await api<ProfileResponse>("/profile", {
        method: "PUT",
        body: {
          sex: p.sex,
          birthDate: p.birthDate,
          heightCm: p.heightCm,
          activityLevel: p.activityLevel,
          goal: p.goal,
          emailReminderEnabled: enabled,
          targets: p.targetsOverridden
            ? { calories: p.targetCalories, proteinG: p.targetProteinG, carbsG: p.targetCarbsG, fatG: p.targetFatG }
            : null,
        },
      });
      await mutate(res, { revalidate: false });
      toast.success(enabled ? "Reminder email aktif" : "Reminder email dimatikan");
    } catch (err) {
      setReminder(!enabled);
      toast.error(errorMessage(err));
    } finally {
      setReminderBusy(false);
    }
  }

  function logout() {
    setSession(null);
    router.replace("/login");
  }

  return (
    <>
      <PageHeader title="Profil" />
      {isLoading && <LoadingState />}
      {error && <ErrorState message={errorMessage(error)} onRetry={() => mutate()} />}
      {data && (
        <div className="flex flex-col gap-10">
          <section aria-labelledby="target" className="flex flex-col gap-3">
            <h2 id="target" className="font-display text-2xl font-bold">
              Target harian
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-line py-4">
              <div>
                <dt className="text-sm text-muted">Kalori</dt>
                <dd className="numeral text-4xl text-accent">{fmt(data.profile.targetCalories)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Protein</dt>
                <dd className="numeral text-4xl">{data.profile.targetProteinG} g</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Karbohidrat</dt>
                <dd className="numeral text-3xl">{data.profile.targetCarbsG} g</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Lemak</dt>
                <dd className="numeral text-3xl">{data.profile.targetFatG} g</dd>
              </div>
            </dl>
            {data.suggested && (
              <p className="text-sm text-muted">
                Kebutuhan harian (TDEE) {fmt(data.suggested.tdee)} kkal
                {data.profile.targetsOverridden ? ", target diatur manual." : "."}
              </p>
            )}
            <CalibrationCard />
          </section>

          <section aria-labelledby="pengaturan" className="flex flex-col gap-5">
            <h2 id="pengaturan" className="font-display text-2xl font-bold">
              Pengaturan
            </h2>
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
              <span>
                <span className="block font-semibold">Reminder email</span>
                <span className="text-sm text-muted">
                  Jam 20:00 ke {session?.user.email ?? "email akun"} kalau hari itu belum ada catatan.
                </span>
              </span>
              <input
                type="checkbox"
                checked={reminder ?? data.profile.emailReminderEnabled}
                aria-busy={reminderBusy || undefined}
                onChange={(e) => !reminderBusy && toggleReminder(e.target.checked)}
                className="size-5 shrink-0 accent-[var(--accent)]"
              />
            </label>
            <Segmented<ThemePref>
              name="theme"
              legend="Tampilan"
              value={theme}
              onChange={setThemePref}
              options={[
                { value: "system", label: "Ikuti HP" },
                { value: "light", label: "Terang" },
                { value: "dark", label: "Gelap" },
              ]}
            />
          </section>

          <section aria-labelledby="data-diri" className="flex flex-col gap-4">
            <h2 id="data-diri" className="font-display text-2xl font-bold">
              Data diri & goal
            </h2>
            <ProfileForm
              initial={data}
              submitLabel="Simpan profil"
              onSaved={async (res) => {
                updateSession({ user: res.user });
                await mutate(res, { revalidate: false });
                toast.success(`Target baru: ${fmt(res.profile.targetCalories)} kkal`);
              }}
            />
          </section>

          <Button variant="secondary" onClick={logout} className="w-full">
            Keluar dari akun
          </Button>
        </div>
      )}
    </>
  );
}
