"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProfileForm } from "@/components/profile-form";
import { fmt } from "@/lib/format";
import { updateSession } from "@/lib/session";

export default function OnboardingPage() {
  const router = useRouter();
  return (
    <>
      <h1 className="numeral text-5xl">Kenalan dulu</h1>
      <p className="mt-3 mb-6 text-muted">Data ini dipakai untuk menghitung target kalori dan protein harianmu. Bisa diubah kapan saja di Profil.</p>
      <ProfileForm
        submitLabel="Hitung target saya"
        onSaved={(res) => {
          updateSession({ hasProfile: true, user: res.user });
          toast.success(`Target harian: ${fmt(res.profile.targetCalories)} kkal, protein ${res.profile.targetProteinG} g`);
          router.replace("/");
        }}
      />
    </>
  );
}
