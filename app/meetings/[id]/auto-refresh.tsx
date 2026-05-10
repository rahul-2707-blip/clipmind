"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MeetingAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [router]);
  return null;
}
