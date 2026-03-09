"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ReportDetailTestStyle from "@/components/reports/ReportDetailTestStyle";

function ReportDetailPageContent() {
  const params = useParams();
  const reportId = params.id as string;
  return <ReportDetailTestStyle reportIdFromPath={reportId} />;
}

export default function ReportDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">불러오는 중…</div>}>
      <ReportDetailPageContent />
    </Suspense>
  );
}
