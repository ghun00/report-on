"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Rocket, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/supabase/use-current-user";

const menuItems = [
  { href: "/home", label: "홈" },
  { href: "/storage", label: "상담 저장소" },
  { href: "/mypage", label: "마이페이지" },
];

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { displayName } = useCurrentUser();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserDropdownOpen(false);
    router.push("/login");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 w-full bg-white/20 backdrop-blur-sm flex items-center justify-between px-4 lg:px-12 h-14 lg:h-16 border-b border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
    >
      {/* 좌측: 로고 */}
      <div className="flex items-center shrink-0">
        <Link href="/home" className="flex items-center">
          <Image
            src="/logo.png"
            alt="레포트온"
            width={100}
            height={28}
            className="h-6 lg:h-7 w-auto object-contain"
            priority
          />
        </Link>
      </div>

      {/* 중앙: 메뉴 (PC) */}
      <nav className="hidden lg:flex items-center gap-15 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (pathname === "/" && item.href === "/home") ||
            (pathname?.startsWith("/reports") && item.href === "/storage");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[16px] font-medium transition-colors",
                isActive ? "text-[#F05705]" : "text-[#626474] hover:text-[#1A1A1A]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 우측: 모바일 - 햄버거 메뉴만 / PC - 사용자 + PRO + 플랜 업그레이드 */}
      <div className="flex items-center gap-3 lg:gap-4 shrink-0">
        {/* 모바일 햄버거 메뉴 */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-[#353644]"
          aria-label="메뉴 열기"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* PC 전용: 사용자 이름 + chevron (드롭다운) */}
        <div className="relative hidden lg:block" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setUserDropdownOpen((v) => !v)}
            className="flex items-center gap-1 text-[#626474] hover:text-[#1A1A1A] transition-colors text-[14px] font-medium"
          >
            <span>{displayName}님</span>
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", userDropdownOpen && "rotate-180")}
            />
          </button>
          {/* 로그아웃 드롭다운 (스르륵 내려오는 형태) */}
          <div
            className={cn(
              "absolute right-0 top-full mt-1 overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
              userDropdownOpen ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="bg-white border border-gray-200 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] py-1 min-w-[120px]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-[14px] text-[#353644] hover:bg-gray-50 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {/* PC 전용: PRO 배지 */}
        <span className="hidden lg:inline-block px-4 py-1 rounded-[99px] bg-[#ADD8E6]/30 text-[#2563EB] text-[12px] font-bold">
          PRO
        </span>

        {/* PC 전용: 플랜 업그레이드 버튼 */}
        <Link
          href="/mypage"
          className="hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#F05705] hover:bg-[#D04A04] text-white text-[13px] font-semibold transition-colors"
        >
          <span>플랜 업그레이드</span>
          <Rocket className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
