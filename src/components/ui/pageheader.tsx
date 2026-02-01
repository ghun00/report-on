"use client";

import { HTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowLeft, MoreVertical } from "lucide-react";

export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  rightAction?: ReactNode;
  onBackClick?: () => void;
}

export default function PageHeader({
  title,
  showBack = false,
  backHref,
  rightAction,
  onBackClick,
  className,
  ...props
}: PageHeaderProps) {
  const BackButton = () => {
    if (!showBack) return null;

    const buttonContent = (
      <ArrowLeft className="w-5 h-5 text-gray-900" />
    );

    if (backHref && !onBackClick) {
      return (
        <Link
          href={backHref}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
          aria-label="뒤로가기"
        >
          {buttonContent}
        </Link>
      );
    }

    return (
      <button
        onClick={onBackClick}
        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="뒤로가기"
      >
        {buttonContent}
      </button>
    );
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <BackButton />
        {title && (
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h1>
        )}
      </div>
      {rightAction && (
        <div className="flex-shrink-0">{rightAction}</div>
      )}
    </div>
  );
}

