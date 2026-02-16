"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
  /** 자동 숨김 밀리초 (0이면 비활성) */
  autoHideMs?: number;
  className?: string;
}

export default function Toast({
  open,
  message,
  onClose,
  autoHideMs = 3000,
  className,
}: ToastProps) {
  useEffect(() => {
    if (!open || !autoHideMs) return;
    const t = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(t);
  }, [open, autoHideMs, onClose]);

  if (!open) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]",
        "px-4 py-3 rounded-[12px] bg-[#353644] text-white text-[14px] font-medium shadow-lg",
        "animate-in fade-in slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      {message}
    </div>
  );
}
