"use client";

import { Copy, FileText, ChevronDown, ChevronUp } from "lucide-react";

function formatTranscriptWithLineBreaks(text: string): string {
  if (!text?.trim()) return text ?? "";
  return text
    .replace(/([.?!])\s+/g, "$1\n\n")
    .replace(/(요\.)\s+/g, "$1\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface TranscriptPanelProps {
  status: "generating" | "done" | "failed" | "uploading" | null;
  transcript: string | null;
  errorMessage: string | null;
  loadError?: string | null;
  onCopy?: () => void;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  className?: string;
}

export default function TranscriptPanel({
  status,
  transcript,
  errorMessage,
  loadError,
  onCopy,
  mobileOpen = false,
  onMobileToggle,
  className = "",
}: TranscriptPanelProps) {
  const content = (() => {
    if (loadError) {
      return <p className="text-[13px] text-[#999]">대본을 불러오지 못했어요.</p>;
    }
    if (status === null) {
      return <p className="text-[13px] text-[#999]">불러오는 중…</p>;
    }
    if (status === "generating" || status === "uploading") {
      return (
        <p className="text-[13px] text-[#888] italic">대본을 생성 중이에요…</p>
      );
    }
    if (status === "failed") {
      if (transcript) {
        const formatted = formatTranscriptWithLineBreaks(transcript);
        return (
          <pre className="text-[15px] text-[#666] leading-[1.6] whitespace-pre-wrap break-words font-normal">
            {formatted}
          </pre>
        );
      }
      return (
        <div className="space-y-1">
          <p className="text-[13px] text-[#999]">대본 생성 실패</p>
          {errorMessage && (
            <p className="text-[12px] text-[#999] break-words">{errorMessage}</p>
          )}
        </div>
      );
    }
    if (status === "done" && transcript) {
      const formatted = formatTranscriptWithLineBreaks(transcript);
      return (
        <pre className="text-[15px] text-[#666] leading-[1.6] whitespace-pre-wrap break-words font-normal">
          {formatted}
        </pre>
      );
    }
    return <p className="text-[13px] text-[#999]">대본이 없어요.</p>;
  })();

  const panelBody = (
    <div
      className={`
        bg-[#F0F1F3] rounded-[10px] border border-[#E5E7EB]
        flex flex-col overflow-hidden h-full max-h-[calc(100vh-12rem)]
        ${className}
      `}
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-[#E5E7EB]">
        <span className="text-[15px] font-medium text-[#6B7280]">원문</span>
        <div className="flex items-center gap-1">
          {(status === "done" || status === "failed") && transcript && (
            <button
              type="button"
              onClick={onCopy}
              className="p-1.5 rounded-md text-[#6B7280] hover:bg-[#E5E7EB] hover:text-[#374151] transition-colors"
              title="대본 복사"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">{content}</div>
    </div>
  );

  return (
    <>
      <aside
        className="hidden lg:block w-[min(360px,22vw)] max-w-[360px] min-w-[300px] shrink-0"
        aria-label="원문 대본"
      >
        <div className="sticky top-[8rem] h-[calc(100vh-8rem)]">{panelBody}</div>
      </aside>
      {onMobileToggle && (
        <div className="lg:hidden w-full shrink-0">
          <button
            type="button"
            onClick={onMobileToggle}
            className="w-full flex items-center justify-between gap-2 py-3 px-4 rounded-[10px] bg-[#F0F1F3] border border-[#E5E7EB] text-left"
          >
            <span className="text-[14px] font-medium text-[#6B7280] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {mobileOpen ? "대본 숨기기" : "대본 보기"}
            </span>
            {mobileOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {mobileOpen && (
            <div className="mt-2 rounded-[10px] border border-[#E5E7EB] overflow-hidden bg-[#F0F1F3] max-h-[50vh] overflow-y-auto">
              <div className="p-3">{content}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
