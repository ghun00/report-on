"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ReportStatus } from "@/lib/constants/reports";

export type { ReportStatus };

export interface ReportItem {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: ReportStatus;
  createdAt: number;
  /** 실패 시 서버 메시지 (failed일 때 툴팁 등 표시용) */
  error_message?: string | null;
  /** 원본 초 단위 (이번 달 통계 등 계산용) */
  durationSec?: number | null;
}

interface ReportsContextValue {
  reports: ReportItem[];
  addReport: (report: Omit<ReportItem, "createdAt">) => void;
  updateReportStatus: (id: string, status: ReportStatus) => void;
  getGeneratingReports: () => ReportItem[];
}

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<ReportItem[]>([]);

  const addReport = useCallback((report: Omit<ReportItem, "createdAt">) => {
    setReports((prev) => [
      { ...report, createdAt: Date.now() },
      ...prev,
    ]);
  }, []);

  const updateReportStatus = useCallback((id: string, status: ReportStatus) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  }, []);

  const getGeneratingReports = useCallback(
    () =>
      reports.filter(
        (r) => r.status === "generating" || r.status === "uploading"
      ),
    [reports]
  );

  const value = useMemo(
    () => ({
      reports,
      addReport,
      updateReportStatus,
      getGeneratingReports,
    }),
    [reports, addReport, updateReportStatus, getGeneratingReports]
  );

  return (
    <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>
  );
}

export function useReports() {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error("useReports must be used within ReportsProvider");
  return ctx;
}
