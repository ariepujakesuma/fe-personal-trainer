"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useApi } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { ProjectionInput } from "@/lib/types";
import { LoadingState } from "./ui";

type NavItem = { href: string; label: string; primary?: boolean };

const NAV: NavItem[] = [
  { href: "/hari-ini", label: "Hari ini" },
  { href: "/catat", label: "Catat", primary: true },
  { href: "/summary", label: "Summary" },
  { href: "/profil", label: "Profil" },
];
/** Shown first once the projection has enough data (body fat + a logged day). */
const PROJECTION: NavItem = { href: "/", label: "Proyeksi" };

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Guards signed-in screens and renders the bottom tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const onboarding = pathname.startsWith("/onboarding");
  const { data: projection } = useApi<ProjectionInput>(session?.hasProfile ? "/dashboard/projection" : null);
  const nav = projection?.ready ? [PROJECTION, ...NAV] : NAV;

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
          className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper pb-[env(safe-area-inset-bottom,0px)]"
        >
          <ul
            className="mx-auto grid max-w-lg gap-1 px-3 py-2"
            style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
          >
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`pressable no-select flex min-h-12 items-center justify-center rounded-[6px] font-display [transition-property:transform] ${nav.length > 4 ? "text-base" : "text-lg"} font-bold leading-none ${
                      item.primary
                        ? "bg-accent text-on-accent"
                        : active
                          ? "bg-ink text-paper"
                          : "text-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
