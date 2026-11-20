"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { setSession, useSession } from "@/lib/session";
import type { Session } from "@/lib/types";
import { Button, Field, Input } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";

  useEffect(() => {
    if (session) router.replace(session.hasProfile ? "/" : "/onboarding");
  }, [session, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const body = Object.fromEntries(form.entries());
      const next = await api<Session>(`/auth/${mode}`, { body });
      setSession(next);
      setBusy(false); // the page stays alive (hidden), and shows again after signing out
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 pt-[env(safe-area-inset-top,0px)] pb-[calc(env(safe-area-inset-bottom,0px)+24px)]">
      <p className="font-display text-lg font-bold text-accent-ink">AI Personal Trainer</p>
      <h1 className="numeral mt-2 text-6xl">{isRegister ? "Buat akun" : "Masuk"}</h1>
      <p className="mt-3 text-muted">
        {isRegister
          ? "Catat makan dari foto dan olahraga harian. AI menghitung kalori dan memberi saran tiap malam."
          : "Lanjutkan catatan makan dan latihanmu."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        {isRegister && (
          <Field label="Nama" htmlFor="name">
            <Input id="name" name="name" autoComplete="name" required placeholder="Nama kamu" />
          </Field>
        )}
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            inputMode="email"
            required
            placeholder="email@example.com"
          />
        </Field>
        <Field label="Password" htmlFor="password" hint={isRegister ? "Minimal 8 karakter" : undefined}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={isRegister ? 8 : undefined}
            enterKeyHint="go"
          />
        </Field>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" busy={busy} className="mt-2 w-full">
          {isRegister ? "Buat akun" : "Masuk"}
        </Button>
      </form>

      <p className="mt-6 text-center text-muted">
        {isRegister ? "Sudah punya akun? " : "Belum punya akun? "}
        <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-accent-ink underline underline-offset-4">
          {isRegister ? "Masuk" : "Daftar"}
        </Link>
      </p>
    </main>
  );
}
