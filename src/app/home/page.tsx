"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import MobileDrawer from "@/components/mobiledrawer";
import ActionCard from "@/components/ui/actioncard";
import StatCard from "@/components/ui/statcard";
import ReportRow from "@/components/ui/reportrow";
import TossStyleAlert from "@/components/ui/tossalert";
import { useReports } from "@/contexts/reports-context";
import { Mic, Upload, Menu, X, Loader2 } from "lucide-react";

// 더미 데이터
const DUMMY_USER_NAME = "한지훈";
const DUMMY_MONTHLY_TIME = 240; // 디자인에 맞춰 240으로 변경
const DUMMY_MONTHLY_COUNT = 6;
const DUMMY_RECENT_REPORTS = [
  {
    id: "rpt_1",
    title: "2026년 1월 6일 상담 보고서",
    date: "2026.10.24",
    duration: "01:20:33",
  },
  {
    id: "rpt_2",
    title: "2026년 1월 6일 상담 보고서",
    date: "2026.10.24",
    duration: "01:20:33",
  },
];

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
  const { getGeneratingReports } = useReports();
  const generatingReports = getGeneratingReports();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showMicAlert, setShowMicAlert] = useState(false);

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
    // TODO: 파일 업로드 로직
    console.log("파일 업로드");
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* PC 사이드바 */}
      <Sidebar className="hidden lg:flex" />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 lg:ml-[272px] min-h-screen bg-white">
        {/* 모바일 헤더 (햄버거 메뉴) */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <Link href="/storage" className="flex items-center">
            <Image
              src="/logo.png"
              alt="레포트온"
              width={96}
              height={24}
              className="h-6 w-auto"
              priority
            />
          </Link>
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors relative"
            aria-label={isDrawerOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
            <Menu
              className={`w-6 h-6 text-gray-700 absolute transition-all duration-300 ${
                isDrawerOpen ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
              }`}
            />
            <X
              className={`w-6 h-6 text-gray-700 absolute transition-all duration-300 ${
                isDrawerOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-0"
              }`}
            />
          </button>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="px-4 lg:px-[176px] py-8 lg:py-[120px] max-w-[1440px] mx-auto page-transition">
          {/* 헤더 섹션 */}
          <div className="mb-6 lg:mb-9">
            <p className="text-[16px] font-medium text-[#626474] leading-[1.5] mb-2">
              Home
            </p>
            <h1 className="text-[24px] font-bold text-[#353644] leading-[1.5]">
              안녕하세요, {DUMMY_USER_NAME}님
            </h1>
          </div>

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
            <StatCard value={`${DUMMY_MONTHLY_TIME}분`} label="이번 달 상담 시간" />

            {/* 통계 카드: 이번 달 상담 수 */}
            <StatCard value={`${DUMMY_MONTHLY_COUNT}개`} label="이번 달 상담 수" />
          </div>

          {/* 나의 상담 내역 섹션 */}
          <div className="space-y-4">
            <h2 className="text-[24px] font-bold text-[#353644] leading-[1.5]">
              나의 상담 내역
            </h2>
            <div className="space-y-6">
              {DUMMY_RECENT_REPORTS.map((report) => (
                <ReportRow
                  key={report.id}
                  title={report.title}
                  date={report.date}
                  duration={report.duration}
                  href={`/reports/${report.id}`}
                />
              ))}
            </div>
          </div>
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
    </div>
  );
}
