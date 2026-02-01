"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "저장함", icon: Home },
  { href: "/record", label: "녹음", icon: Mic },
  { href: "/mypage", label: "마이페이지", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="max-w-[480px] mx-auto">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href || (pathname === "/" && item.href === "/home");
            const Icon = item.icon;
            const isCenter = index === 1; // 녹음 버튼 (가운데)

            if (isCenter) {
              // 가운데 녹음 버튼 - 원형 강조
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-16 rounded-full bg-[#F05705] text-white shadow-lg -translate-y-2 transition-all hover:scale-105 active:scale-95",
                    isActive && "ring-4 ring-[#F05705]/20"
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium mt-0.5">{item.label}</span>
                </Link>
              );
            }

            // 일반 탭
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors",
                  isActive
                    ? "text-[#F05705]"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

