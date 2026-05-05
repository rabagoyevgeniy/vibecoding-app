"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getStoredProgress } from "@/lib/progress";

export default function MissionIndexPage() {
  const router = useRouter();
  const { loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const storedProgress = getStoredProgress();
    const currentDay = storedProgress?.current_day || 1;
    router.replace(`/mission/${Math.min(Math.max(currentDay, 1), 7)}`);
  }, [loading, router]);

  return null;
}
