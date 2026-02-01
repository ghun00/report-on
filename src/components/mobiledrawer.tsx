"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderOpen, User, Send, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/storage", label: "상담 저장소", icon: FolderOpen },
  { href: "/mypage", label: "마이페이지", icon: User },
  { href: "#", label: "피드백 보내기", icon: Send },
];

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer - 상단에서 내려오는 형태 */}
      <aside
        className={cn(
          "fixed left-0 right-0 top-0 bg-white z-50 flex flex-col shadow-lg transform transition-transform duration-300 ease-out lg:hidden",
          isOpen ? "translate-y-0" : "-translate-y-full"
        )}
      >
        {/* 헤더: 로고 + 닫기 버튼 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="레포트온"
              width={96}
              height={24}
              className="h-6 w-auto"
              priority
            />
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* 메뉴 리스트 */}
        <nav className="flex flex-col px-4 py-4">
          {menuItems.map((item) => {
            const isActive = 
              pathname === item.href || 
              (pathname === "/" && item.href === "/home") ||
              (pathname?.startsWith("/reports") && item.href === "/storage");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-[10px] px-4 py-3 rounded-[8px] transition-colors",
                  isActive
                    ? "bg-[#F3F4FA] text-[#353644]"
                    : "text-[#626474] hover:bg-gray-50"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[14px] font-medium leading-[18px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 하단: 플랜 업그레이드 버튼 */}
        <div className="px-4 py-4 border-t border-gray-100">
          <button className="w-full bg-[#FFE2D2] text-[#F05705] rounded-[8px] px-4 py-3 flex items-center justify-center gap-[10px] hover:bg-[#FFD4B8] transition-colors">
            <Zap className="w-4 h-4" />
            <span className="text-[14px] font-bold leading-[18px]">플랜 업그레이드</span>
          </button>
        </div>
      </aside>
    </>
  );
}

