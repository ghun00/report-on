"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import Sidebar from "@/components/sidebar";
import MobileDrawer from "@/components/mobiledrawer";
import ReportRow from "@/components/ui/reportrow";
import { useReports } from "@/contexts/reports-context";
import type { ReportItem, ReportStatus } from "@/contexts/reports-context";
import { Menu, X } from "lucide-react";

const DUMMY_REPORTS: Omit<ReportItem, "status" | "createdAt">[] = [
  { id: "rpt_1", title: "2026년 1월 6일 상담 보고서", date: "2026.10.24", duration: "01:20:33" },
  { id: "rpt_2", title: "2026년 1월 6일 상담 보고서", date: "2026.10.24", duration: "01:20:33" },
  { id: "rpt_3", title: "2026년 1월 6일 상담 보고서", date: "2026.10.24", duration: "01:20:33" },
  { id: "rpt_4", title: "2026년 1월 5일 상담 보고서", date: "2026.10.23", duration: "00:45:12" },
  { id: "rpt_5", title: "2026년 1월 4일 상담 보고서", date: "2026.10.22", duration: "01:15:45" },
];

const DUMMY_WITH_STATUS: ReportItem[] = DUMMY_REPORTS.map((r) => ({
  ...r,
  status: "done" as ReportStatus,
  createdAt: 0,
}));

export default function StoragePage() {
  const { reports: contextReports } = useReports();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const sortedReports = useMemo(() => {
    const fromDummy = DUMMY_WITH_STATUS.filter(
      (d) => !contextReports.some((c) => c.id === d.id)
    );
    const merged: ReportItem[] = [...contextReports, ...fromDummy].sort(
      (a, b) => {
        if (a.status === "generating" && b.status !== "generating") return -1;
        if (a.status !== "generating" && b.status === "generating") return 1;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      }
    );
    return merged;
  }, [contextReports]);

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
              Storage
            </p>
            <h1 className="text-[24px] font-bold text-[#353644] leading-[1.5]">
              상담 저장소
            </h1>
          </div>

          {/* 리스트 (generating 우선, 그 다음 최신순) */}
          <div className="space-y-6">
            {sortedReports.map((report) => (
              <ReportRow
                key={report.id}
                title={report.title}
                date={report.date}
                duration={report.duration}
                href={report.status === "generating" ? "#" : `/reports/${report.id}`}
                status={report.status}
              />
            ))}
          </div>
        </div>
      </main>

      {/* 모바일 Drawer */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
}

