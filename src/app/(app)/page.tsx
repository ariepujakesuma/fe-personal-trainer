"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@/components/ui";
import { useApi } from "@/lib/api";
import type { ProjectionInput } from "@/lib/types";

/** Landing after sign-in: the projection once it has data, otherwise the day view. */
export default function HomePage() {
  const router = useRouter();
  const { data, error } = useApi<ProjectionInput>("/dashboard/projection");
  useEffect(() => {
    if (data) router.replace(data.ready ? "/proyeksi" : "/hari-ini");
    else if (error) router.replace("/hari-ini");
  }, [data, error, router]);
  return <LoadingState />;
}
