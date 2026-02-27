"use client";

import { useState } from "react";
import { List, X } from "lucide-react";
import { TOC_SECTIONS } from "./report-json-types";
import { cn } from "@/lib/utils";

interface MobileTOCFloatProps {
  activeId: string | null;
  onNav: (id: string) => void;
}

export default function MobileTOCFloat({ activeId, onNav }: MobileTOCFloatProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (id: string) => {
    onNav(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* 플로팅 버튼 - 모바일에서만 표시 */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed right-4 bottom-6 z-40 w-14 h-14 rounded-full bg-[#f05705] text-white shadow-lg flex items-center justify-center hover:bg-[#333] transition-colors"
        aria-label="목차 열기"
      >
        <List className="w-6 h-6" />
      </button>

      {/* 모달 백드롭 */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 목차 모달 */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div
            className="bg-white rounded-2xl w-full max-w-[280px] py-4 shadow-xl pointer-events-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            

            {/* 목차 항목 */}
            <nav className="py-2">
              {TOC_SECTIONS.map((s) => {
                const isActive = activeId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleItemClick(s.id)}
                    className={cn(
                      "w-full text-center py-3 px-6 transition-colors",
                      isActive
                        ? "bg-[#FFF4EE] text-[#F05705] font-medium"
                        : "text-[#1A1A1A] hover:bg-gray-50"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
