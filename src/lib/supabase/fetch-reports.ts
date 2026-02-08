"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReportItem } from "@/contexts/reports-context";
import type { ReportStatus } from "@/lib/constants/reports";
import { isReportStatus } from "@/lib/constants/reports";

function formatDurationFromSec(sec: number | null): string {
  if (sec == null || sec < 0) return "00:00";
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function dbRowToReportItem(row: {
  id: string;
  title: string | null;
  created_at: string;
  duration_sec: number | null;
  status: string;
}): ReportItem {
  const createdAt = new Date(row.created_at).getTime();
  const dateStr = new Date(row.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\. /g, ".").trim();
  return {
    id: row.id,
    title: row.title ?? `보고서 ${dateStr}`,
    date: dateStr,
    duration: formatDurationFromSec(row.duration_sec),
    status: isReportStatus(row.status) ? row.status : "done",
    createdAt,
  };
}

export function useReportsFromDb(): {
  reports: ReportItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("reports")
      .select("id, title, created_at, duration_sec, status")
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
      setReports([]);
      setIsLoading(false);
      return;
    }
    const items = (data ?? []).map(dbRowToReportItem);
    // generating/uploading 우선, 그 다음 최신순
    items.sort((a, b) => {
      const aPending = a.status === "generating" || a.status === "uploading";
      const bPending = b.status === "generating" || b.status === "uploading";
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return b.createdAt - a.createdAt;
    });
    setReports(items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { reports, isLoading, error, refetch };
}
