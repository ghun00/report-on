"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Noto_Sans_KR } from "next/font/google";
import Link from "next/link";
import TopBar from "@/components/topbar";
import MobileDrawer from "@/components/mobiledrawer";
import { createClient } from "@/lib/supabase/client";
import { Link2, ArrowLeft } from "lucide-react";
import ReportLayout from "@/components/reports/ReportLayout";
import ReportMain from "@/components/reports/ReportMain";
import ReportTOC from "@/components/reports/ReportTOC";
import TranscriptPanel, { type TranscriptPanelProps } from "@/components/reports/TranscriptPanel";
import { parseReportJson, TOC_SECTIONS } from "@/components/reports/report-json-types";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

interface ReportData {
  title: string | null;
  status: string | null;
  transcript: string | null;
  error_message: string | null;
  report_json: unknown;
}

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(TOC_SECTIONS[0]?.id ?? null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportLoadError, setReportLoadError] = useState<string | null>(null);
  const [transcriptMobileOpen, setTranscriptMobileOpen] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    const supabase = createClient();
    supabase
      .from("reports")
      .select("title, status, transcript, error_message, report_json")
      .eq("id", reportId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setReportLoadError(error.message);
          return;
        }
        setReportData({
          title: data?.title ?? null,
          status: data?.status ?? null,
          transcript: data?.transcript ?? null,
          error_message: data?.error_message ?? null,
          report_json: data?.report_json ?? null,
        });
      });
  }, [reportId]);

  const status = reportData?.status ?? null;
  const transcript = reportData?.transcript ?? null;
  const errorMessage = reportData?.error_message ?? null;
  const title = reportData?.title ?? "상담 보고서";

  const reportJsonParsed = reportData
    ? parseReportJson(reportData.report_json)
    : null;
  const reportJsonParseError =
    reportData?.status === "done" &&
    reportData?.report_json != null &&
    reportJsonParsed === null;

  const handleCopyTranscript = useCallback(() => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
  }, [transcript]);

  const handleCopyUrl = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url);
  }, []);

  const handleTocNav = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
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

  const handleRetry = useCallback((_id: string) => {
    // TODO: POST /api/reports/[id]/retry 또는 /api/stt/start 연동
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
      <TopBar onMenuClick={() => setIsDrawerOpen(true)} />

      <main className="flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 lg:top-16 z-20 flex shrink-0 items-center justify-between px-4 lg:px-8 xl:px-12 py-3 bg-[#F6F7F9] border-b border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Link
            href="/storage"
            className="inline-flex items-center gap-1.5 text-[16px] text-[#666] hover:text-[#1A1A1A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            뒤로가기
          </Link>
          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-transparent hover:bg-gray-400/10 text-[14px] font-medium text-[#F05705] hover:text-[#D04A04] transition-colors"
          >
            <Link2 className="w-4 h-4" />
            URL 복사
          </button>
        </div>

        <div className="flex-1 px-4 lg:px-8 xl:px-12 py-8 lg:py-12">
          <div className="max-w-[1440px] mx-auto">
            <ReportLayout
              transcriptPanel={
                <TranscriptPanel
                  status={status as TranscriptPanelProps["status"]}
                  transcript={transcript}
                  errorMessage={errorMessage}
                  loadError={reportLoadError}
                  onCopy={handleCopyTranscript}
                  mobileOpen={transcriptMobileOpen}
                  onMobileToggle={() => setTranscriptMobileOpen((o) => !o)}
                />
              }
              reportMain={
                <ReportMain
                  reportId={reportId}
                  title={title}
                  status={status}
                  reportJson={reportJsonParsed}
                  reportJsonParseError={reportJsonParseError}
                  errorMessage={errorMessage}
                  fontClassName={notoSansKr.className}
                  onRetry={handleRetry}
                />
              }
              toc={
                <ReportTOC
                  activeId={activeSectionId}
                  onNav={handleTocNav}
                  fontClassName={notoSansKr.className}
                />
              }
            />
          </div>
        </div>
      </main>

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
}
