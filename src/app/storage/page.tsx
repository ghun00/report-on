"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/topbar";
import MobileDrawer from "@/components/mobiledrawer";
import ReportRow from "@/components/ui/reportrow";
import Toast from "@/components/ui/toast";
import { useReportsFromDb } from "@/lib/supabase/fetch-reports";
import { createTestReportRow } from "@/lib/supabase/reports";

export default function StoragePage() {
  const {
    reports,
    isLoading,
    error,
    refetch,
    justCompletedCount,
    clearJustCompleted,
  } = useReportsFromDb();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [testReportMessage, setTestReportMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (justCompletedCount <= 0) return;
    setToastMessage(
      justCompletedCount === 1
        ? "상담 보고서가 완성됐어요"
        : `보고서 ${justCompletedCount}개가 완성됐어요`
    );
    clearJustCompleted();
  }, [justCompletedCount, clearJustCompleted]);

  const handleRetryReport = useCallback(
    async (_reportId: string) => {
      await refetch();
    },
    [refetch]
  );

  const handleTestReportCreate = async () => {
    setTestReportMessage(null);
    const result = await createTestReportRow();
    setTestReportMessage(result.success ? "생성됨" : result.error ?? "실패");
    if (result.success) await refetch();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TopBar onMenuClick={() => setIsDrawerOpen(true)} />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 min-h-screen bg-white">
        {/* 메인 콘텐츠 */}
        <div className="px-4 lg:px-[176px] py-8 lg:py-[120px] max-w-[1440px] mx-auto page-transition">
          {/* 헤더 섹션 */}
          <div className="mb-6 lg:mb-9">
            <p className="text-[16px] font-medium text-[#626474] leading-[1.5] mb-2">
              Storage
            </p>
            <h1 className="text-[24px] font-bold text-[#353644] leading-[1.5]">
              상담 저장소
            </h1>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600">목록을 불러오지 못했어요.</p>
          )}

          <div className="space-y-6">
            {isLoading ? (
              <p className="text-[#626474] text-sm">불러오는 중...</p>
            ) : (
              reports.map((report) => (
                <ReportRow
                  key={report.id}
                  reportId={report.id}
                  title={report.title}
                  date={report.date}
                  duration={report.duration}
                  href={
                    report.status === "generating" || report.status === "uploading"
                      ? "#"
                      : `/reports/${report.id}`
                  }
                  status={report.status}
                  errorMessage={report.error_message}
                  onRetry={handleRetryReport}
                />
              ))
            )}
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleTestReportCreate}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                테스트 보고서 생성
              </button>
              {testReportMessage && (
                <p className="mt-2 text-sm text-gray-600">{testReportMessage}</p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 모바일 Drawer */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      <Toast
        open={!!toastMessage}
        message={toastMessage ?? ""}
        onClose={() => setToastMessage(null)}
        autoHideMs={3000}
      />
    </div>
  );
}

