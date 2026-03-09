"use client";

import { useState, useEffect, useCallback } from "react";
import { Noto_Sans_KR } from "next/font/google";
import { Loader2 } from "lucide-react";
import ReportTOC from "@/components/reports/ReportTOC";
import MobileTOCFloat from "@/components/reports/MobileTOCFloat";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const SHARE_TOC_SECTIONS = [
  { id: "summary-blocks", label: "핵심 요약" },
  { id: "detailed-sections", label: "세부 상담 내용" },
] as const;

interface PublicReportData {
  title: string | null;
  status: string | null;
  report_json: unknown;
  created_at: string | null;
  duration_sec: number | null;
}

interface ShareReportClientProps {
  reportId: string;
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

function parseShareReportJson(raw: unknown): NormalizedReport | null {
  if (raw == null) return null;
  let obj: ReportJsonCompat;

  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw) as ReportJsonCompat;
    } catch {
      return null;
    }
  } else if (typeof raw === "object") {
    obj = raw as ReportJsonCompat;
  } else {
    return null;
  }

  const version = obj.meta?.version ?? 0;
  let summaryBlocks: Array<{ title: string; content: string }> = [];
  let detailedSections: Array<{ title: string; content: string }> = [];

  if (version === 2 && Array.isArray(obj.summary_blocks) && Array.isArray(obj.detailed_sections)) {
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

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 || 12;
  return `${year}년 ${month}월 ${day}일 ${ampm} ${displayHour}:${minutes}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}초`;
  if (secs === 0) return `${mins}분`;
  return `${mins}분 ${secs}초`;
}

export default function ShareReportClient({ reportId }: ShareReportClientProps) {
  const [reportData, setReportData] = useState<PublicReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    SHARE_TOC_SECTIONS[0]?.id ?? null
  );

  useEffect(() => {
    if (!reportId) return;

    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/public-report/${reportId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error || `HTTP ${res.status}`);
        }
        return res.json() as Promise<PublicReportData>;
      })
      .then((data) => {
        setReportData(data);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [reportId]);

  const reportJsonParsed = reportData ? parseShareReportJson(reportData.report_json) : null;

  const reportJsonParseError =
    reportData?.status === "done" &&
    reportData?.report_json != null &&
    reportJsonParsed === null;

  const handleTocNav = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!reportJsonParsed) return;

    const ids: string[] = SHARE_TOC_SECTIONS.map((s) => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = e.target.id;
          if (ids.includes(id)) setActiveSectionId(id);
        }
      },
      { rootMargin: "-15% 0px -60% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [reportJsonParsed]);

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-[#F6F7F9] flex items-center justify-center ${notoSansKr.className}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#F05705] animate-spin" />
          <p className="text-[14px] text-[#666]">보고서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`min-h-screen bg-[#F6F7F9] flex items-center justify-center ${notoSansKr.className}`}>
        <div className="text-center px-4">
          <h1 className="text-[20px] font-bold text-[#1A1A1A] mb-2">
            보고서를 불러올 수 없습니다
          </h1>
          <p className="text-[14px] text-[#666]">
            {loadError === "Report not found"
              ? "존재하지 않는 보고서입니다."
              : loadError === "Invalid reportId format"
              ? "잘못된 보고서 주소입니다."
              : "잠시 후 다시 시도해 주세요."}
          </p>
        </div>
      </div>
    );
  }

  const status = reportData?.status ?? null;
  const title = reportData?.title ?? "상담 보고서";
  const isGenerating = status === "generating" || status === "uploading";
  const isFailed = status === "failed";

  return (
    <div className={`min-h-screen bg-[#F6F7F9] ${notoSansKr.className}`}>
      <main className="min-h-screen py-8 lg:py-12 px-4 lg:px-8 xl:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start justify-center">
            {/* 메인 보고서 영역 */}
            <div className="flex-1 min-w-0 w-full flex justify-center">
              <article
                className="flex-1 min-w-0 w-full max-w-[880px] bg-white rounded-[14px] px-6 lg:px-12 py-8 lg:py-12"
                style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                data-report-id={reportId}
              >
                <header className="mb-8">
                  <p className="text-[14px] text-[#999] mb-1">상담 보고서</p>
                  <h1 className="text-[26px] lg:text-[28px] font-bold text-[#1A1A1A] leading-[1.4]">
                    {title}
                  </h1>
                  <p className="text-[14px] text-[#9CA3AF] mt-3 flex items-center gap-4 flex-wrap">
                    {reportData?.created_at && <span>상담 일시 : {formatDateTime(reportData.created_at)}</span>}
                    {reportData?.duration_sec != null && (
                      <span>상담 시간 : {formatDuration(reportData.duration_sec)}</span>
                    )}
                  </p>
                </header>

                {isGenerating && (
                  <p className="text-[16px] text-[#666] mt-4">보고서를 생성 중이에요. 잠시 후 다시 확인해 주세요.</p>
                )}

                {isFailed && (
                  <p className="text-[16px] text-[#333] mt-4 mb-2">보고서 생성에 실패했어요.</p>
                )}

                {!isGenerating && !isFailed && reportJsonParseError && (
                  <p className="text-[16px] text-[#666] mt-4">보고서 데이터를 불러오지 못했어요.</p>
                )}

                {!isGenerating && !isFailed && reportJsonParsed && (
                  <>
                    
                    <section id="summary-blocks" className="scroll-mt-24 mb-8">
                      
                      {reportJsonParsed.summaryBlocks.length > 0 ? (
                        <div className="space-y-6">
                          {reportJsonParsed.summaryBlocks.map((block, i) => (
                            <div key={i} className="rounded-[12px] bg-[#FFF4EE] p-4">
                              <h3 className="text-[16px] font-bold text-[#F05705] mb-2">{block.title || "—"}</h3>
                              <p className="text-[15px] text-[#333] leading-[1.8] whitespace-pre-wrap">
                                {block.content || "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[15px] text-[#666] leading-[1.8]">요약 내용이 없습니다.</p>
                      )}
                    </section>

                    

                    <section id="detailed-sections" className="scroll-mt-24">
                      
                      {reportJsonParsed.detailedSections.length > 0 ? (
                        <div className="space-y-6">
                          {reportJsonParsed.detailedSections.map((section, i) => (
                            <div key={i} className="flex gap-3">
                              <span
                                className="shrink-0 w-3 h-3 rounded-full border-2 border-[#F05705] bg-white mt-1.5"
                                aria-hidden
                              />
                              <div className="min-w-0 flex-1">
                                <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-2">
                                  {section.title || "—"}
                                </h3>
                                <p className="text-[15px] text-[#333] leading-[1.8] whitespace-pre-wrap">
                                  {section.content || "—"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[15px] text-[#666] leading-[1.8]">세부 내용이 없습니다.</p>
                      )}
                    </section>
                  </>
                )}
              </article>
            </div>

            {/* TOC - PC에서만 표시
            <div className="hidden lg:block">
              <ReportTOC
                activeId={activeSectionId}
                onNav={handleTocNav}
                fontClassName={notoSansKr.className}
                stickyTop="3rem"
                sections={[...SHARE_TOC_SECTIONS]}
              />
            </div> */}
          </div>
        </div>
      </main>

      {/* 모바일용 플로팅 TOC 버튼 */}
      <MobileTOCFloat
        activeId={activeSectionId}
        onNav={handleTocNav}
        sections={[...SHARE_TOC_SECTIONS]}
      />
    </div>
  );
}
