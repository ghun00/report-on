"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateReportTitle } from "@/lib/supabase/reports";
import EditTitleModal from "@/components/ui/edit-title-modal";
import Toast from "@/components/ui/toast";

type TabType = "detailed" | "summary";

interface ReportRow {
  id: string;
  title: string | null;
  status: string | null;
  transcript: string | null;
  report_json: unknown;
  created_at: string | null;
  duration_sec: number | null;
}

interface ReportJsonCompat {
  meta?: { version?: number };
  detailed_report?: string;
  summary_blocks?: Array<{ title: string; content: string }>;
  detailed_sections?: Array<{ title: string; content: string }>;
  status_analysis?: { content: string };
  executive_summary?: { position: string; solutions?: string[] };
  detailed_notes?: Array<{ title: string; content: string }>;
}

type NormalizedReport = {
  summaryBlocks: Array<{ title: string; content: string }>;
  detailedSections: Array<{ title: string; content: string }>;
};

type HelperProps = {
  text: string;
  text1: string;
  isSummaryTitle?: boolean;
};

function Helper({ text, text1, isSummaryTitle }: HelperProps) {
  return (
    <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full">
      <p
        className={`font-semibold relative shrink-0 w-full ${
          isSummaryTitle ? "text-[#f05705]" : "text-[#353644]"
        }`}
      >
        {text}
      </p>
      <p className="font-normal relative shrink-0 text-[#626474] w-full whitespace-pre-wrap leading-[1.5]">
        {text1}
      </p>
    </div>
  );
}

function normalizeReportJson(raw: unknown): NormalizedReport | null {
  if (raw == null) return null;
  let obj: ReportJsonCompat;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw) as ReportJsonCompat;
    } catch {
      return null;
    }
  } else if (typeof raw === "object" && raw !== null) {
    obj = raw as ReportJsonCompat;
  } else {
    return null;
  }

  const meta = obj.meta;
  const version = meta?.version ?? 0;

  let summaryBlocks: Array<{ title: string; content: string }> = [];
  let detailedSections: Array<{ title: string; content: string }> = [];

  if ((version === 2 || version === 10) && Array.isArray(obj.summary_blocks) && Array.isArray(obj.detailed_sections)) {
    summaryBlocks = obj.summary_blocks.filter(
      (b) => b && typeof b.title === "string" && typeof b.content === "string"
    );
    detailedSections = obj.detailed_sections.filter(
      (s) => s && typeof s.title === "string" && typeof s.content === "string"
    );
  } else if (typeof obj.detailed_report === "string") {
    detailedSections = [{ title: "세부 상담 내용", content: obj.detailed_report }];
  } else if (Array.isArray(obj.detailed_notes) && obj.detailed_notes.length > 0) {
    detailedSections = obj.detailed_notes.filter(
      (n) => n && typeof n.title === "string" && typeof n.content === "string"
    );
    if (obj.status_analysis?.content) {
      summaryBlocks.push({ title: "현재 상황 진단", content: obj.status_analysis.content });
    }
    if (obj.executive_summary) {
      const pos = obj.executive_summary.position ?? "";
      const sols = obj.executive_summary.solutions ?? [];
      const content = [pos, ...sols].filter(Boolean).join("\n\n");
      if (content) summaryBlocks.push({ title: "컨설팅 종합 요약", content });
    }
  } else {
    return null;
  }

  return { summaryBlocks, detailedSections };
}

function formatDateKor(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}초`;
  if (secs === 0) return `${mins}분`;
  return `${mins}분 ${secs}초`;
}

function formatTranscriptWithLineBreaks(text: string): string {
  if (!text?.trim()) return text ?? "";
  return text
    .replace(/([.?!])\s+/g, "$1\n\n")
    .replace(/(요\.)\s+/g, "$1\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface ReportDetailTestStyleProps {
  reportIdFromPath?: string;
  fallbackToLatestDone?: boolean;
}

export default function ReportDetailTestStyle({
  reportIdFromPath,
  fallbackToLatestDone = false,
}: ReportDetailTestStyleProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("detailed");
  const [report, setReport] = useState<ReportRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showSummaryDevToast, setShowSummaryDevToast] = useState(false);
  const [isEditTitleOpen, setIsEditTitleOpen] = useState(false);

  const effectiveReportId = useMemo(() => {
    if (reportIdFromPath) return reportIdFromPath;
    return searchParams.get("reportId") || undefined;
  }, [reportIdFromPath, searchParams]);

  const loadReport = useCallback(async () => {
    const supabase = createClient();

    if (effectiveReportId) {
      const { data, error } = await supabase
        .from("reports")
        .select("id, title, status, transcript, report_json, created_at, duration_sec")
        .eq("id", effectiveReportId)
        .single();

      if (error) {
        setLoadError(error.message);
        setReport(null);
        return;
      }
      setReport(data);
      setLoadError(null);
      return;
    }

    if (!fallbackToLatestDone) {
      setLoadError("reportId가 필요합니다.");
      setReport(null);
      return;
    }

    const { data, error } = await supabase
      .from("reports")
      .select("id, title, status, transcript, report_json, created_at, duration_sec")
      .eq("status", "done")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setLoadError(error.message);
      setReport(null);
      return;
    }

    setReport(data ?? null);
    setLoadError(data ? null : "완료된 보고서가 없습니다.");
  }, [effectiveReportId, fallbackToLatestDone]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleCopyUrl = useCallback(() => {
    if (!report) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${origin}/share/${report.id}`;
    navigator.clipboard.writeText(shareUrl);
    setShowCopyToast(true);
  }, [report]);

  const handleOpenShare = useCallback(() => {
    if (!report) return;
    window.open(`/share/${report.id}`, "_blank", "noopener,noreferrer");
  }, [report]);

  const handleClickSummaryTab = useCallback(() => {
    setShowSummaryDevToast(true);
  }, []);

  const handleTitleSave = useCallback(
    async (newTitle: string) => {
      if (!report?.id) throw new Error("보고서 정보를 찾지 못했습니다.");
      const result = await updateReportTitle(report.id, newTitle);
      if (!result.success) {
        throw new Error(result.error ?? "제목 변경에 실패했습니다.");
      }
      setReport((prev) => (prev ? { ...prev, title: newTitle } : prev));
    },
    [report]
  );

  const normalized = report?.report_json ? normalizeReportJson(report.report_json) : null;
  const hasContent =
    normalized != null &&
    (normalized.summaryBlocks.length > 0 || normalized.detailedSections.length > 0);
  const isGenerating = report?.status === "generating" || report?.status === "uploading";

  return (
    <div className="bg-white flex flex-col h-screen w-full">
      <header className="shrink-0 content-stretch flex items-center justify-between px-[48px] py-[16px] border-b border-[#e4e6f0] bg-white z-10 max-md:px-[20px]">
        <Link
          href="/storage"
          className="content-stretch flex gap-[8px] items-center relative shrink-0 cursor-pointer hover:opacity-70"
        >
          <ArrowLeft className="w-4 h-4 text-[#626474] shrink-0" strokeWidth={1.5} />
          <p className="font-medium leading-[1.5] not-italic relative shrink-0 text-[#626474] text-[16px] whitespace-nowrap">
            뒤로가기
          </p>
        </Link>
        <div className="content-stretch flex items-center relative shrink-0 max-md:hidden">
          <div className="content-stretch flex items-center px-[12px] py-[8px] relative rounded-[4px] shrink-0 cursor-pointer hover:bg-[#f3f4fa]">
            <p className="font-medium leading-[1.5] not-italic relative shrink-0 text-[#626474] text-[16px] whitespace-nowrap">
              보고서 템플릿 변경
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="content-stretch flex items-center px-[12px] py-[8px] relative rounded-[4px] shrink-0 cursor-pointer hover:bg-[#fff5f0]"
          >
            <p className="font-medium leading-[1.5] not-italic relative shrink-0 text-[#f05705] text-[16px] whitespace-nowrap">
              링크 복사하기
            </p>
          </button>
          <button
            type="button"
            onClick={handleOpenShare}
            className="content-stretch flex gap-[8px] items-center px-[12px] py-[8px] relative rounded-[4px] shrink-0 cursor-pointer hover:bg-[#f3f4fa]"
          >
            <p className="font-medium leading-[1.5] not-italic relative shrink-0 text-[#626474] text-[16px] whitespace-nowrap">
              공유용 보고서 보기
            </p>
            <ExternalLink className="w-4 h-4 shrink-0 text-[#626474]" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex min-h-0 overflow-hidden max-xl:flex-col">
        <div className="flex gap-[100px] flex-1 min-h-0 pl-[48px] pr-[100px] py-[32px] max-xl:flex-col max-xl:gap-[24px] max-md:px-[20px] max-md:py-[24px]">
          <aside
            className="shrink-0 w-[500px] max-xl:w-full max-xl:max-h-[400px] max-xl:min-h-[300px] flex flex-col"
            aria-label="스크립트"
          >
            <div className="flex-1 min-h-0 flex flex-col max-xl:min-h-0 max-xl:h-[400px]">
              <div className="bg-[#f0f1f3] rounded-[16px] border border-[#e5e7eb] shadow-[0px_0px_8px_0px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden flex-1 min-h-0">
                <div className="shrink-0 px-[20px] py-[16px] border-b border-[#e5e7eb]">
                  <p className="font-medium text-[#626474] text-[16px]">스크립트</p>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 px-[20px] py-[16px]">
                  {report ? (
                    <pre className="font-normal text-[#626474] text-[16px] leading-[1.6] whitespace-pre-wrap break-words">
                      {report.transcript ? formatTranscriptWithLineBreaks(report.transcript) : "—"}
                    </pre>
                  ) : loadError ? (
                    <p className="text-[#9395a6] text-[14px]">{loadError}</p>
                  ) : (
                    <p className="text-[#9395a6] text-[14px]">불러오는 중…</p>
                  )}
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0 overflow-y-auto content-stretch flex flex-col gap-[24px] items-start pb-8">
            <div className="content-stretch flex items-start justify-between relative shrink-0 w-full max-md:flex-col max-md:gap-[16px] gap-4 flex-wrap">
              <div className="content-stretch flex flex-col gap-[8px] items-start leading-[1.5] not-italic relative shrink-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold relative shrink-0 text-[#353644] text-[24px] max-md:text-[20px]">
                    {report?.title ?? "상담 보고서"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditTitleOpen(true)}
                    className="p-1.5 rounded-md text-[#9395a6] hover:bg-[#f3f4fa] hover:text-[#626474] transition-colors"
                    aria-label="상담 보고서 제목 변경"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
                <p className="font-medium relative shrink-0 text-[#9395a6] text-[14px]">
                  {report
                    ? `${formatDateKor(report.created_at)}${
                        report.duration_sec != null ? ` ・ ${formatDuration(report.duration_sec)}` : ""
                      }`
                    : "—"}
                </p>
              </div>
              <div className="bg-[#f3f4fa] content-stretch flex items-center p-[4px] relative rounded-[99px] shrink-0">
                <button
                  type="button"
                  className="content-stretch flex items-center px-[12px] py-[4px] relative rounded-[99px] shrink-0 cursor-pointer bg-[#f05705]"
                  onClick={() => setActiveTab("detailed")}
                >
                  <p className="font-medium leading-[1.5] not-italic relative shrink-0 text-[14px] whitespace-nowrap text-[#f8f8fc]">
                    자세한 상담 보고서
                  </p>
                </button>
                <button
                  type="button"
                  aria-disabled
                  onClick={handleClickSummaryTab}
                  className="content-stretch flex items-center px-[12px] py-[4px] relative rounded-[99px] shrink-0 cursor-not-allowed"
                >
                  <p className="font-medium leading-[1.5] not-italic relative shrink-0 text-[14px] whitespace-nowrap text-[#9395a6]">
                    핵심 요약 보고서
                  </p>
                </button>
              </div>
            </div>

            {isGenerating && <div className="text-[#626474] text-[16px] py-8">보고서를 생성 중이에요</div>}

            {!isGenerating && !hasContent && report && (
              <div className="text-[#9395a6] text-[16px] py-8">생성중/없음</div>
            )}

            {!isGenerating && hasContent && normalized && (
              <>
                {normalized.summaryBlocks.length > 0 && (
                  <div className="bg-orange-50 relative rounded-[12px] shrink-0 w-full">
                    <div className="content-stretch flex flex-col gap-[24px] items-start leading-[1.5] not-italic p-[16px] relative text-[16px] w-full">
                      {normalized.summaryBlocks.map((block, i) => (
                        <Helper key={i} text={block.title} text1={block.content} isSummaryTitle />
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "detailed" && normalized.detailedSections.length > 0 && (
                  <>
                    <div className="bg-[#e4e6f0] h-px shrink-0 w-full" />
                    <div className="content-stretch flex flex-col gap-[24px] items-start leading-[1.5] not-italic relative shrink-0 text-[16px] w-full">
                      {normalized.detailedSections.map((section, i) => (
                        <Helper key={i} text={section.title} text1={section.content} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <EditTitleModal
        isOpen={isEditTitleOpen}
        currentTitle={report?.title ?? "상담 보고서"}
        onClose={() => setIsEditTitleOpen(false)}
        onSave={handleTitleSave}
      />

      <Toast
        open={showCopyToast}
        message="공유용 상담 보고서 링크가 복사되었어요!"
        onClose={() => setShowCopyToast(false)}
        autoHideMs={3000}
      />
      <Toast
        open={showSummaryDevToast}
        message="아직 개발중인 기능이에요"
        onClose={() => setShowSummaryDevToast(false)}
        autoHideMs={2200}
      />
    </div>
  );
}
