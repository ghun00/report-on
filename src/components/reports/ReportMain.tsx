"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportJsonV3 } from "./report-json-types";

function SectionDivider() {
  return <div className="h-[2px] bg-[#1A1A1A] my-8" aria-hidden />;
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 || 12;
  const displayMinute = minutes.toString().padStart(2, "0");
  
  return `${year}년 ${month}월 ${day}일 ${ampm} ${displayHour}:${displayMinute}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}초`;
  if (secs === 0) return `${mins}분`;
  return `${mins}분 ${secs}초`;
}

interface ReportMainProps {
  reportId: string;
  title: string;
  status: string | null;
  reportJson: ReportJsonV3 | null;
  reportJsonParseError?: boolean;
  errorMessage: string | null;
  fontClassName?: string;
  onRetry?: (reportId: string) => void;
  onEditTitle?: () => void;
  createdAt?: string | null;
  durationSec?: number | null;
}

export default function ReportMain({
  reportId,
  title,
  status,
  reportJson,
  reportJsonParseError,
  errorMessage,
  fontClassName = "",
  onRetry,
  onEditTitle,
  createdAt = null,
  durationSec = null,
}: ReportMainProps) {
  const isGenerating = status === "generating" || status === "uploading";
  const isFailed = status === "failed";
  const isDone = status === "done";

  if (isGenerating) {
    return (
      <article
        className={cn(
          "flex-1 min-w-0 w-full max-w-[880px] bg-white rounded-[14px] px-6 lg:px-12 py-8 lg:py-12",
          fontClassName
        )}
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        data-report-id={reportId}
      >
        <p className="text-[14px] text-[#999] mb-1">상담 보고서</p>
        <div className="flex items-center gap-2">
          <h1 className="text-[26px] lg:text-[28px] font-bold text-[#1A1A1A] leading-[1.4]">
            {title || "보고서"}
          </h1>
          {onEditTitle && (
            <button
              onClick={onEditTitle}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="제목 변경"
            >
              <Pencil className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          )}
        </div>
        {(createdAt || durationSec !== null) && (
          <p className="text-[14px] text-[#9CA3AF] mt-3 mb-6 flex items-center gap-4 flex-wrap">
            {createdAt && <span>상담 일시 : {formatDateTime(createdAt)}</span>}
            {durationSec !== null && <span>상담 시간 : {formatDuration(durationSec)}</span>}
          </p>
        )}
        {!(createdAt || durationSec !== null) && <div className="mb-6" />}
        <p className="text-[16px] text-[#666] mb-8">보고서를 생성 중이에요</p>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-[#E5E7EB] rounded animate-pulse max-w-[80%]" />
          ))}
        </div>
      </article>
    );
  }

  if (isFailed) {
    return (
      <article
        className={cn(
          "flex-1 min-w-0 w-full max-w-[880px] bg-white rounded-[14px] px-6 lg:px-12 py-8 lg:py-12",
          fontClassName
        )}
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        data-report-id={reportId}
      >
        <p className="text-[14px] text-[#999] mb-1">상담 보고서</p>
        <div className="flex items-center gap-2">
          <h1 className="text-[26px] lg:text-[28px] font-bold text-[#1A1A1A] leading-[1.4]">
            {title || "보고서"}
          </h1>
          {onEditTitle && (
            <button
              onClick={onEditTitle}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="상담 보고서 제목 변경"
            >
              <Pencil className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          )}
        </div>
        {(createdAt || durationSec !== null) && (
          <p className="text-[14px] text-[#9CA3AF] mt-3 flex items-center gap-4 flex-wrap">
            {createdAt && <span>상담 일시 : {formatDateTime(createdAt)}</span>}
            {durationSec !== null && <span>상담 시간 : {formatDuration(durationSec)}</span>}
          </p>
        )}
        <p className="text-[16px] text-[#333] mt-4 mb-2">보고서 생성에 실패했어요.</p>
        {errorMessage && (
          <p className="text-[14px] text-[#999] break-words mb-6">{errorMessage}</p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={() => onRetry(reportId)}
            className="px-4 py-2 rounded-lg bg-[#F05705] hover:bg-[#D04A04] text-white text-[14px] font-medium transition-colors"
          >
            다시 생성
          </button>
        )}
      </article>
    );
  }

  if (isDone && !reportJson && !reportJsonParseError) {
    return (
      <article
        className={cn(
          "flex-1 min-w-0 w-full max-w-[880px] bg-white rounded-[14px] px-6 lg:px-12 py-8 lg:py-12",
          fontClassName
        )}
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        data-report-id={reportId}
      >
        <p className="text-[14px] text-[#999] mb-1">상담 보고서</p>
        <div className="flex items-center gap-2">
          <h1 className="text-[26px] lg:text-[28px] font-bold text-[#1A1A1A] leading-[1.4]">
            {title || "보고서"}
          </h1>
          {onEditTitle && (
            <button
              onClick={onEditTitle}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="상담 보고서 제목 변경"
            >
              <Pencil className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          )}
        </div>
        {(createdAt || durationSec !== null) && (
          <p className="text-[14px] text-[#9CA3AF] mt-3 flex items-center gap-4 flex-wrap">
            {createdAt && <span>상담 일시 : {formatDateTime(createdAt)}</span>}
            {durationSec !== null && <span>상담 시간 : {formatDuration(durationSec)}</span>}
          </p>
        )}
        <p className="text-[16px] text-[#666] mt-4">보고서를 생성 중이에요. 잠시 후 다시 확인해 주세요.</p>
      </article>
    );
  }

  if (isDone && reportJsonParseError) {
    return (
      <article
        className={cn(
          "flex-1 min-w-0 w-full max-w-[880px] bg-white rounded-[14px] px-6 lg:px-12 py-8 lg:py-12",
          fontClassName
        )}
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        data-report-id={reportId}
      >
        <p className="text-[14px] text-[#999] mb-1">상담 보고서</p>
        <div className="flex items-center gap-2">
          <h1 className="text-[26px] lg:text-[28px] font-bold text-[#1A1A1A] leading-[1.4]">
            {title || "보고서"}
          </h1>
          {onEditTitle && (
            <button
              onClick={onEditTitle}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="제목 변경"
            >
              <Pencil className="w-4 h-4 text-[#9CA3AF]" />
            </button>
          )}
        </div>
        {(createdAt || durationSec !== null) && (
          <p className="text-[14px] text-[#9CA3AF] mt-3 flex items-center gap-4 flex-wrap">
            {createdAt && <span>상담 일시 : {formatDateTime(createdAt)}</span>}
            {durationSec !== null && <span>상담 시간 : {formatDuration(durationSec)}</span>}
          </p>
        )}
        <p className="text-[16px] text-[#666] mt-4">보고서 데이터를 불러오지 못했어요.</p>
      </article>
    );
  }

  if (isDone && reportJson) {
    const { status_analysis, executive_summary, detailed_notes } = reportJson;
    return (
      <article
        className={cn(
          "flex-1 min-w-0 w-full max-w-[880px] bg-white rounded-[14px] px-6 lg:px-12 py-8 lg:py-12",
          fontClassName
        )}
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        data-report-id={reportId}
      >
        <header className="mb-8">
          <p className="text-[14px] text-[#999] mb-1">상담 보고서</p>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] lg:text-[28px] font-bold text-[#1A1A1A] leading-[1.4]">
              {title || "상담 보고서"}
            </h1>
            {onEditTitle && (
              <button
                onClick={onEditTitle}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="제목 변경"
              >
                <Pencil className="w-4 h-4 text-[#9CA3AF]" />
              </button>
            )}
          </div>
          {(createdAt || durationSec !== null) && (
            <p className="text-[14px] text-[#9CA3AF] mt-3 flex items-center gap-4 flex-wrap">
              {createdAt && <span>상담 일시 : {formatDateTime(createdAt)}</span>}
              {durationSec !== null && <span>상담 시간 : {formatDuration(durationSec)}</span>}
            </p>
          )}
        </header>

        <SectionDivider />

        <section
          id="status-analysis"
          className="scroll-mt-24"
        >
          <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-4">현재 상황 진단</h2>
          <p className="text-[15px] lg:text-[16px] text-[#333] leading-[1.8]">
            {status_analysis.content || "—"}
          </p>
        </section>

        <SectionDivider />

        <section
          id="executive-summary"
          className="scroll-mt-24"
        >
          <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-4">컨설팅 종합 요약</h2>
          <p className="text-[15px] lg:text-[16px] text-[#333] leading-[1.8] mb-4">
            {executive_summary.position || "—"}
          </p>
          <ol className="list-decimal list-inside space-y-2 text-[15px] text-[#333] leading-[1.75]">
            {executive_summary.solutions.map((s, i) => (
              <li key={i}>{s || "—"}</li>
            ))}
          </ol>
        </section>

        <SectionDivider />

        <section
          id="detailed-notes"
          className="scroll-mt-24"
        >
          <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-4">세부 상담 내용</h2>
          <div className="space-y-6">
            {detailed_notes.map((note, i) => (
              <div key={i} className="flex gap-3">
                <span
                  className="shrink-0 w-3 h-3 rounded-full border-2 border-[#F05705] bg-white mt-1.5"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-2">{note.title || "—"}</h3>
                  <p className="text-[15px] text-[#333] leading-[1.8]">{note.content || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "flex-1 min-w-0 w-full max-w-[880px] bg-white rounded-[14px] px-6 lg:px-12 py-8 lg:py-12",
        fontClassName
      )}
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      data-report-id={reportId}
    >
      <p className="text-[14px] text-[#999]">불러오는 중…</p>
    </article>
  );
}
