import Link from "next/link";
import { HTMLAttributes } from "react";
import { Play, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportStatus } from "@/contexts/reports-context";

export interface ReportRowProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  date: string;
  duration: string;
  href: string;
  status?: ReportStatus;
  /** 실패 시 툴팁/안내문 (failed일 때) */
  errorMessage?: string | null;
  /** 실패 row에서 "다시 생성" 클릭 시 (선택) */
  onRetry?: (reportId: string) => void;
  reportId?: string;
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  uploading: "업로드 중",
  generating: "생성중",
  done: "완료",
  failed: "실패",
};

export default function ReportRow({
  title,
  date,
  duration,
  href,
  status = "done",
  errorMessage,
  onRetry,
  reportId,
  className,
  ...props
}: ReportRowProps) {
  const isGenerating = status === "generating" || status === "uploading";
  const isFailed = status === "failed";
  const failTooltip =
    errorMessage?.trim() || "음성 인식에 실패했어요. 다시 시도해 주세요.";

  // 녹음 아이콘 (작은 바 형태)
  const RecordIcon = () => (
    <div className="bg-[#FFE2D2] rounded-[12px] p-[3.556px] w-8 h-8 flex items-center justify-center">
      <div className="flex gap-[1.185px] h-[14.222px] items-center justify-center w-full">
        {[9.481, 4.741, 7.901, 5.531, 9.481, 4.741].map((height, i) => (
          <div
            key={i}
            className="bg-[#F05705] rounded-[19.753px] w-[1.58px]"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
    </div>
  );

  const content = (
    <div
      className={cn(
        "bg-white rounded-[12px] px-0 py-0 sm:px-3 sm:py-4 flex flex-row items-center justify-between gap-3 sm:gap-4 transition-all border border-transparent",
        !isGenerating && "hover:bg-[#F057050D]",
        className
      )}
      {...props}
    >
      {/* 아이콘 | 타이틀(일시 아래 모바일) | 타이틀 | 일시(PC 한 줄) | 소요 시간 / 상태 */}
      <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
        <RecordIcon />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-8 gap-0.5 min-w-0 flex-1">
          <p className="text-[16px] sm:text-[20px] font-medium text-[#353644] leading-[1.4] sm:leading-[1.5] truncate">
            {title}
          </p>
          <p className="text-[13px] sm:text-[20px] font-normal text-[#626474] leading-[1.4] sm:leading-[1.5] shrink-0">
            {date}
          </p>
        </div>
      </div>
      {/* 상태 배지: generating / done / failed + duration / 재생(또는 비활성) */}
      <div className="shrink-0 flex items-center gap-2">
        <span
          className={cn(
            "text-[12px] sm:text-[13px] font-medium px-2 py-0.5 rounded-[99px]",
            (status === "generating" || status === "uploading") &&
              "bg-[#FFF5F0] text-[#F05705]",
            status === "done" && "bg-[#E8F5E9] text-[#2E7D32]",
            status === "failed" && "bg-[#FFEBEE] text-[#C62828]"
          )}
        >
          {(status === "generating" || status === "uploading") && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {STATUS_LABEL[status]}
            </span>
          )}
          {(status === "done" || status === "failed") && STATUS_LABEL[status]}
        </span>
        {/* 재생: generating이면 비활성 + 툴팁 */}
        <div
          className={cn(
            "bg-[#FFF5F0] flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-[99px]",
            isGenerating && "opacity-60 pointer-events-none"
          )}
          title={isGenerating ? "보고서를 생성 중이에요" : undefined}
        >
          <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F05705]" fill="currentColor" />
          <span className="text-[14px] sm:text-[16px] font-medium text-[#F05705] leading-[1.4] sm:leading-[1.5] whitespace-nowrap">
            {duration}
          </span>
        </div>
        {isFailed && reportId && onRetry && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRetry(reportId);
            }}
            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-medium text-[#C62828] hover:bg-[#FFEBEE] transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            다시 생성
          </button>
        )}
      </div>
    </div>
  );

  if (isGenerating) {
    return <div className="block cursor-default" title="보고서를 생성 중이에요">{content}</div>;
  }
  return (
    <Link href={href} className="block" title={isFailed ? failTooltip : undefined}>
      {content}
    </Link>
  );
}

