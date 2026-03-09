"use client";

import { Suspense } from "react";
import ReportDetailTestStyle from "@/components/reports/ReportDetailTestStyle";

export default function TestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">불러오는 중…</div>}>
      <ReportDetailTestStyle fallbackToLatestDone />
    </Suspense>
  );
}
