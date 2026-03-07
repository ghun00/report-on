"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/topbar";
import MobileDrawer from "@/components/mobiledrawer";
import ActionCard from "@/components/ui/actioncard";
import StatCard from "@/components/ui/statcard";
import ReportRow from "@/components/ui/reportrow";
import TossStyleAlert from "@/components/ui/tossalert";
import Toast from "@/components/ui/toast";
import { useReportsFromDb, useMonthlyStats } from "@/lib/supabase/fetch-reports";
import { useCurrentUser } from "@/lib/supabase/use-current-user";
import { createTestReportRow } from "@/lib/supabase/reports";
import { Mic, Upload, Loader2 } from "lucide-react";
import PendingUploadsBanner from "@/components/pending-uploads-banner";

// 녹음 아이콘 (바 형태)
const RecordingIcon = () => (
  <div className="flex gap-[4.615px] h-[55.385px] items-center justify-center">
    {[36.923, 18.462, 30.769, 21.538, 36.923, 18.462].map((height, i) => (
      <div
        key={i}
        className="bg-[#FF6F0F] rounded-full w-[6.154px]"
        style={{ height: `${height}px` }}
      />
    ))}
  </div>
);

// 업로드 아이콘
const UploadIcon = () => (
  <div className="w-[60px] h-[60px] flex items-center justify-center">
    <Upload className="w-[60px] h-[60px] text-[#FF6F0F]" strokeWidth={2.5} />
  </div>
);

export default function HomePage() {
  const router = useRouter();
  const { displayName } = useCurrentUser();
  const {
    reports,
    isLoading,
    error,
    refetch,
    justCompletedCount,
    clearJustCompleted,
  } = useReportsFromDb();
  const { monthlyMinutes, monthlyCount } = useMonthlyStats(reports);
  const generatingReports = reports.filter(
    (r) => r.status === "generating" || r.status === "uploading"
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showMicAlert, setShowMicAlert] = useState(false);
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
      // TODO: POST /api/reports/[id]/retry 또는 /jobs/start-stt 연동
      await refetch();
    },
    [refetch]
  );

  const handleStartRecording = async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setShowMicAlert(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      router.push("/record");
    } catch {
      setShowMicAlert(true);
    }
  };

  const handleUploadFile = () => {
    setToastMessage("현재 개발중인 기능이에요");
  };

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
              Home
            </p>
            <h1 className="text-[24px] font-bold text-[#353644] leading-[1.5]">
              안녕하세요, {displayName}님
            </h1>
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600">보고서 목록을 불러오지 못했어요.</p>
          )}

          {/* 임시 저장된 녹음 배너 */}
          <PendingUploadsBanner />

          {/* 진행중 카드 (생성중이 하나라도 있을 때) */}
          {generatingReports.length > 0 && (
            <div className="mb-6 p-4 lg:p-5 bg-white rounded-[12px] border border-[#E5E5E5] shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[99px] bg-[#FFF5F0] text-[#F05705] text-[13px] font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      생성중
                    </span>
                  </div>
                  <h3 className="text-[18px] font-bold text-[#353644] leading-[1.4] mb-1">
                    보고서 생성 중
                  </h3>
                  <p className="text-[14px] text-[#626474] leading-[1.5]">
                    완료되면 알림톡으로 안내드릴게요.
                  </p>
                  {generatingReports[0] && (
                    <p className="text-[13px] text-[#9395A6] mt-2">
                      {generatingReports[0].title} · {generatingReports[0].date}
                    </p>
                  )}
                </div>
                <Link
                  href="/storage"
                  className="shrink-0 rounded-xl bg-[#F3F4FA] hover:bg-[#E5E7EB] px-4 py-2.5 text-[14px] font-semibold text-[#191F28] transition-colors"
                >
                  저장소 보기
                </Link>
              </div>
            </div>
          )}

          {/* 카드 그리드 (4개) */}
          <div className="mb-6 lg:mb-9 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 액션 카드: 녹음 시작 */}
            <ActionCard
              icon={<RecordingIcon />}
              label="녹음 시작"
              onClick={handleStartRecording}
            />

            {/* 액션 카드: 녹음 파일 업로드 */}
            <ActionCard
              icon={<UploadIcon />}
              label="녹음 파일 업로드"
              onClick={handleUploadFile}
            />

            {/* 통계 카드: 이번 달 상담 시간 */}
            <StatCard value={`${monthlyMinutes}분`} label="이번 달 상담 시간" />

            {/* 통계 카드: 이번 달 상담 수 */}
            <StatCard value={`${monthlyCount}개`} label="이번 달 상담 수" />
          </div>

          {/* 나의 상담 내역 섹션 */}
          <div className="space-y-4">
            <h2 className="text-[24px] font-bold text-[#353644] leading-[1.5]">
              나의 상담 내역
            </h2>
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
          </div>

          {/* [개발용] 테스트 보고서 생성 */}
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

      {/* 마이크 권한 거부/설정 꺼짐 시 토스 스타일 알럿 */}
      <TossStyleAlert
        open={showMicAlert}
        onClose={() => setShowMicAlert(false)}
        title="마이크 설정을 켜야 서비스를 이용할 수 있어요"
        description="브라우저 또는 시스템 설정에서 마이크 접근을 허용해주세요."
      />
      <Toast
        open={!!toastMessage}
        message={toastMessage ?? ""}
        onClose={() => setToastMessage(null)}
        autoHideMs={3000}
      />
    </div>
  );
}
