"use client";

import Image from "next/image";
import { HTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";

export interface AppBarProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "main" | "recording";
  logoSrc?: string;
  onCancel?: () => void;
  onFinish?: () => void;
  disabled?: boolean;
}

export default function AppBar({
  variant = "main",
  logoSrc = "/logo.png",
  onCancel,
  onFinish,
  disabled = false,
  className,
  ...props
}: AppBarProps) {
  const [logoError, setLogoError] = useState(false);

  if (variant === "main") {
    return (
      <div
        className={cn(
          "flex items-center px-4 h-[60px] bg-transparent",
          className
        )}
        {...props}
      >
        <div className="flex items-center h-6">
          {!logoError ? (
            <Image
              src={logoSrc}
              alt="레포트온"
              width={96}
              height={24}
              className="h-6 w-auto"
              onError={() => setLogoError(true)}
              priority
            />
          ) : (
            <span className="text-lg font-bold text-gray-900">레포트온.</span>
          )}
        </div>
      </div>
    );
  }

  // recording variant
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 h-[60px] bg-transparent",
        className
      )}
      {...props}
    >
      <button
        onClick={onCancel}
        disabled={disabled}
        className={`p-2 -ml-2 font-medium transition-colors ${
          disabled
            ? "text-gray-300 cursor-not-allowed"
            : "text-[#9395A6] hover:text-gray-600"
        }`}
        aria-label="취소"
      >
        취소
      </button>
      <div className="flex-1" /> {/* 가운데 공간 */}
      <button
        onClick={onFinish}
        disabled={disabled}
        className={`p-2 -mr-2 font-semibold transition-colors ${
          disabled
            ? "text-gray-300 cursor-not-allowed"
            : "text-[#F05705] hover:text-[#D04A04]"
        }`}
        aria-label="종료"
      >
        종료
      </button>
    </div>
  );
}

