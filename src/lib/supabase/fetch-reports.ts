"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReportItem } from "@/contexts/reports-context";
import type { ReportStatus } from "@/lib/constants/reports";
import { isReportStatus } from "@/lib/constants/reports";

const POLL_INTERVAL_MS = 5000;
const POLL_INTERVAL_HIDDEN_MS = 15000;
const POLL_MAX_COUNT = 120; // 10분 = 5s * 120

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
  error_message?: string | null;
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
    error_message: row.error_message ?? undefined,
  };
}

export function useReportsFromDb(): {
  reports: ReportItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** 폴링 중 generating → done 으로 바뀐 개수 (토스트용, 사용 후 clearJustCompleted 호출) */
  justCompletedCount: number;
  clearJustCompleted: () => void;
} {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [justCompletedCount, setJustCompletedCount] = useState(0);
  const previousGeneratingIdsRef = useRef<Set<string>>(new Set());
  const pollCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("reports")
      .select("id, title, created_at, duration_sec, status, error_message")
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
      setReports([]);
      setIsLoading(false);
      return;
    }
    const items = (data ?? []).map(dbRowToReportItem);
    items.sort((a, b) => {
      const aPending = a.status === "generating" || a.status === "uploading";
      const bPending = b.status === "generating" || b.status === "uploading";
      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;
      return b.createdAt - a.createdAt;
    });

    // generating → done 감지: 이전에 generating이었던 id 중 지금 done인 개수
    const prevIds = previousGeneratingIdsRef.current;
    const nowDoneCount = items.filter(
      (r) => r.status === "done" && prevIds.has(r.id)
    ).length;
    if (nowDoneCount > 0) {
      setJustCompletedCount(nowDoneCount);
    }

    const currentGeneratingIds = new Set(
      items
        .filter((r) => r.status === "generating" || r.status === "uploading")
        .map((r) => r.id)
    );
    previousGeneratingIdsRef.current = currentGeneratingIds;

    setReports(items);
    setIsLoading(false);
  }, []);

  const clearJustCompleted = useCallback(() => {
    setJustCompletedCount(0);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const hasGenerating = reports.some(
    (r) => r.status === "generating" || r.status === "uploading"
  );

  // 폴링: generating이 1개라도 있으면 주기적으로 refetch, 최대 10분. 탭 hidden이면 15초 주기.
  const startPolling = useCallback(() => {
    if (!hasGenerating || pollCountRef.current >= POLL_MAX_COUNT) return;
    const isHidden =
      typeof document !== "undefined" && document.visibilityState === "hidden";
    const intervalMs = isHidden ? POLL_INTERVAL_HIDDEN_MS : POLL_INTERVAL_MS;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      pollCountRef.current += 1;
      if (pollCountRef.current > POLL_MAX_COUNT) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      refetch();
    }, intervalMs);
  }, [hasGenerating, refetch]);

  useEffect(() => {
    if (!hasGenerating || pollCountRef.current >= POLL_MAX_COUNT) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    startPolling();
    const onVisibilityChange = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!hasGenerating || pollCountRef.current >= POLL_MAX_COUNT) return;
      startPolling(); // 5s or 15s according to current visibilityState
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasGenerating, startPolling]);

  // generating이 없어지면 폴링 카운트 리셋(다음 진입 시 다시 120회 가능)
  useEffect(() => {
    if (!hasGenerating) pollCountRef.current = 0;
  }, [hasGenerating]);

  return {
    reports,
    isLoading,
    error,
    refetch,
    justCompletedCount,
    clearJustCompleted,
  };
}
