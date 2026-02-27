"use client";

import { useState, useEffect, useCallback } from "react";
import { Noto_Sans_KR } from "next/font/google";
import { Loader2 } from "lucide-react";
import ReportMain from "@/components/reports/ReportMain";
import ReportTOC from "@/components/reports/ReportTOC";
import MobileTOCFloat from "@/components/reports/MobileTOCFloat";
import { parseReportJson, TOC_SECTIONS } from "@/components/reports/report-json-types";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

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

export default function ShareReportClient({ reportId }: ShareReportClientProps) {
  const [reportData, setReportData] = useState<PublicReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    TOC_SECTIONS[0]?.id ?? null
  );

  useEffect(() => {
    if (!reportId) return;

    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/public-report/${reportId}`)
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

  const reportJsonParsed = reportData
    ? parseReportJson(reportData.report_json)
    : null;

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

    const ids: string[] = TOC_SECTIONS.map((s) => s.id);
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

  const displayStatus =
    status === "generating" || status === "uploading"
      ? "generating"
      : status === "failed"
      ? "failed"
      : status;

  const displayErrorMessage =
    status === "failed" ? "보고서 생성에 실패했습니다." : null;

  return (
    <div className={`min-h-screen bg-[#F6F7F9] ${notoSansKr.className}`}>
      <main className="min-h-screen py-8 lg:py-12 px-4 lg:px-8 xl:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start justify-center">
            {/* 메인 보고서 영역 */}
            <div className="flex-1 min-w-0 w-full flex justify-center">
              <ReportMain
                reportId={reportId}
                title={title}
                status={displayStatus}
                reportJson={reportJsonParsed}
                reportJsonParseError={reportJsonParseError}
                errorMessage={displayErrorMessage}
                fontClassName={notoSansKr.className}
                createdAt={reportData?.created_at ?? null}
                durationSec={reportData?.duration_sec ?? null}
              />
            </div>

            {/* TOC - PC에서만 표시 */}
            <div className="hidden lg:block">
              <ReportTOC
                activeId={activeSectionId}
                onNav={handleTocNav}
                fontClassName={notoSansKr.className}
                stickyTop="3rem"
              />
            </div>
          </div>
        </div>
      </main>

      {/* 모바일용 플로팅 TOC 버튼 */}
      <MobileTOCFloat activeId={activeSectionId} onNav={handleTocNav} />
    </div>
  );
}
