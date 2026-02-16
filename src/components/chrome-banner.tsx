"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "report-on-chrome-banner-closed";

export default function ChromeBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const closed = localStorage.getItem(STORAGE_KEY);
      setIsVisible(closed !== "true");
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  };

  if (!isVisible) return null;

  return (
    <div className="w-full bg-[#1a1a1a] flex items-center justify-center px-4 py-2 relative min-h-[36px]">
      <p className="text-[11px] sm:text-xs text-white/90 pr-8 text-center">
        현재 저희 서비스는 PC 및 Chrome에서 안정적으로 동작합니다.
      </p>
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
        aria-label="닫기"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
}
