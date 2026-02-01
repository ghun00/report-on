"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar";
import MobileDrawer from "@/components/mobiledrawer";
import StatCard from "@/components/ui/statcard";
import { Menu } from "lucide-react";

// 더미 데이터 (Home과 동일 체계)
const DUMMY_USER_NAME = "한지훈";
const DUMMY_MONTHLY_TIME = 240;

export default function MyPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex">
      {/* PC 사이드바 */}
      <Sidebar className="hidden lg:flex" />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 lg:ml-[272px] min-h-screen bg-white">
        {/* 모바일 헤더 (햄버거 메뉴) */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-[4.615px] h-[55.385px] items-center justify-center">
              {[36.923, 18.462, 30.769, 21.538, 36.923, 18.462].map((height, i) => (
                <div
                  key={i}
                  className="bg-[#FF6F0F] rounded-full w-[6.154px]"
                  style={{ height: `${height}px` }}
                />
              ))}
            </div>
            <span className="text-[16px] font-semibold bg-gradient-to-r from-[#FF5C00] to-[#FFAC7E] bg-clip-text text-transparent">
              레포트온.
            </span>
          </div>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="메뉴 열기"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="px-4 lg:px-[176px] py-8 lg:py-[120px] max-w-[1440px] mx-auto page-transition">
          {/* 헤더 섹션 */}
          <div className="mb-6 lg:mb-9">
            <p className="text-[16px] font-medium text-[#626474] leading-[1.5] mb-2">
              Mypage
            </p>
            <h1 className="text-[24px] font-bold text-[#353644] leading-[1.5]">
              {DUMMY_USER_NAME}님
            </h1>
          </div>

          {/* 내 정보 섹션 */}
          <div className="space-y-4">
            <h2 className="text-[24px] font-bold text-[#353644] leading-[1.5]">
              내 정보
            </h2>
            <div className="space-y-16">
              
              {/* 사용 시간 - StatCard와 동일한 그리드 스타일 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  value={`${DUMMY_MONTHLY_TIME}분`}
                  label="이번 달 사용 시간"
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
