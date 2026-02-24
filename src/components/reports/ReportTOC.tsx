"use client";

import { TOC_SECTIONS } from "./report-json-types";
import { cn } from "@/lib/utils";

interface ReportTOCProps {
  activeId: string | null;
  onNav: (id: string) => void;
  fontClassName?: string;
}

export default function ReportTOC({
  activeId,
  onNav,
  fontClassName = "",
}: ReportTOCProps) {
  return (
    <aside
      className={cn("hidden lg:block w-[220px] shrink-0", fontClassName)}
      aria-label="목차"
    >
      <div className="sticky top-[12rem]">
        <nav className="flex flex-col gap-1">
          {TOC_SECTIONS.map((s) => {
            const isActive = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onNav(s.id)}
                className={cn(
                  "text-left py-3 px-6 rounded-[24px] transition-colors",
                  isActive
                    ? "bg-[#F05705] text-white font-medium"
                    : "text-[#1A1A1A] hover:bg-[#F3F4FA]"
                )}
              >
                {s.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
