"use client";

import { useState } from "react";
import TopBar from "@/components/topbar";
import MobileDrawer from "@/components/mobiledrawer";
import StatCard from "@/components/ui/statcard";
import { useCurrentUser } from "@/lib/supabase/use-current-user";
import { useReportsFromDb, useMonthlyStats } from "@/lib/supabase/fetch-reports";

export default function MyPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { displayName } = useCurrentUser();
  const { reports } = useReportsFromDb();
  const { monthlyMinutes, monthlyCount } = useMonthlyStats(reports);

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
              Mypage
            </p>
            <h1 className="text-[24px] font-bold text-[#353644] leading-[1.5]">
              {displayName}님
            </h1>
          </div>

          {/* 내 정보 섹션 */}
          <div className="space-y-4">
            <h2 className="text-[24px] font-bold text-[#353644] leading-[1.5]">
              내 정보
            </h2>
            <div className="space-y-16">
              {/* 사용 시간 / 상담 수 - StatCard 그리드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  value={`${monthlyMinutes}분`}
                  label="이번 달 사용 시간"
                />
                <StatCard
                  value={`${monthlyCount}개`}
                  label="이번 달 상담 수"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 모바일 Drawer */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
}
