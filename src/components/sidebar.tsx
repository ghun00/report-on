"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, FolderOpen, User, Send, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

const menuItems = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/storage", label: "상담 저장소", icon: FolderOpen },
  { href: "/mypage", label: "마이페이지", icon: User },
  { href: "#", label: "피드백 보내기", icon: Send },
];

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "bg-[#FAFAFA] flex flex-col h-screen fixed left-0 top-0 w-[272px] px-4 py-[60px] justify-between z-30",
        className
      )}
    >
      {/* 상단: 로고 + 메뉴 */}
      <div className="flex flex-col gap-8">
        {/* 로고 */}
        <Link href="/home" className="flex items-center">
          <Image
            src="/logo.png"
            alt="레포트온"
            width={160}
            height={44}
            className="object-contain"
            priority
          />
        </Link>

        {/* 메뉴 리스트 */}
        <nav className="flex flex-col gap-1">
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
      </div>

      {/* 하단: 플랜 업그레이드 버튼 */}
      <button className="bg-[#FFE2D2] text-[#F05705] rounded-[8px] px-4 py-3 flex items-center gap-[10px] hover:bg-[#FFD4B8] transition-colors">
        <Zap className="w-4 h-4" />
        <span className="text-[14px] font-bold leading-[18px]">플랜 업그레이드</span>
      </button>
    </aside>
  );
}

