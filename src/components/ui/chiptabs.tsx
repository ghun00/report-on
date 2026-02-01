"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ChipTabsProps extends HTMLAttributes<HTMLDivElement> {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function ChipTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
  ...props
}: ChipTabsProps) {
  return (
    <div
      className={cn("flex items-center justify-end gap-0 bg-[#F3F4FA] p-1 rounded-[99px]", className)}
      {...props}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={cn(
            "px-6 py-1 rounded-[99px] text-base font-medium transition-colors",
            {
              "bg-[#F05705] text-[#F8F8FC]": activeTab === tab.id,
              "text-[#B7B9C9] hover:text-[#626474]":
                activeTab !== tab.id,
            }
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

