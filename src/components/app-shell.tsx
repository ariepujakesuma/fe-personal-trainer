"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session";
import { LoadingState } from "./ui";

type NavItem = { href: string; label: string; icon: ReactNode; primary?: boolean };

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
);

const NAV: NavItem[] = [
  { href: "/hari-ini", label: "Hari ini", icon: svg(<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />) },
  { href: "/proyeksi", label: "Proyeksi", icon: svg(<path d="M4 19h16M5 15l4-4 3 3 7-7M15 7h4v4" />) },
  { href: "/catat", label: "Catat", primary: true, icon: svg(<path d="M12 5v14M5 12h14" />) },
  {
    href: "/latihan",
    label: "Latihan",
    icon: svg(<path d="M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12" />),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: svg(
      <>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" />
      </>,
    ),
  },
];

function isActive(pathname: string, href: string) {
  // Summary and meal review are opened from Hari ini, so that tab stays lit.
  if (href === "/hari-ini") return ["/hari-ini", "/summary", "/makanan"].some((p) => pathname.startsWith(p));
  return pathname.startsWith(href);
}

/** Guards signed-in screens and renders the bottom tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const onboarding = pathname.startsWith("/onboarding");

  useEffect(() => {
    if (session === null) router.replace("/login");
    else if (session && !session.hasProfile && !onboarding) router.replace("/onboarding");
  }, [session, onboarding, router]);

  if (!session || (!session.hasProfile && !onboarding)) {
    return (
      <main className="mx-auto w-full max-w-lg px-5 pt-[calc(env(safe-area-inset-top,0px)+16px)]">
        <LoadingState />
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 px-5 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-[calc(env(safe-area-inset-bottom,0px)+96px)]">
        {children}
      </main>
      {!onboarding && (
        <nav
          aria-label="Navigasi utama"
          className="fixed inset-x-0 bottom-0 z-10 rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_24px_-12px_rgb(21_22_26/0.18)] dark:border-t dark:border-line"
        >
          <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pt-2 pb-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="flex justify-center">
                  {item.primary ? (
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      className="pressable -mt-7 flex size-16 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_8px_20px_-6px_rgb(240_83_18/0.6)] ring-4 ring-paper"
                    >
                      {item.icon}
                    </Link>
                  ) : (
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`pressable no-select flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                        active ? "text-accent-ink" : "text-muted hover:text-ink"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
