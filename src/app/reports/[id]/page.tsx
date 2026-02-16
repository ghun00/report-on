"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Noto_Sans_KR } from "next/font/google";
import Link from "next/link";
import TopBar from "@/components/topbar";
import MobileDrawer from "@/components/mobiledrawer";
import { createClient } from "@/lib/supabase/client";
import { Link2, Check, ArrowLeft, List, Copy, FileText, ChevronDown, ChevronUp } from "lucide-react";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

/** 문장 단위 줄바꿈: ., ?, !, 요. 등 기준으로 개행만 추가 (내용 변형 없음) */
function formatTranscriptWithLineBreaks(text: string): string {
  if (!text?.trim()) return text ?? "";
  return text
    .replace(/([.?!])\s+/g, "$1\n\n")
    .replace(/(요\.)\s+/g, "$1\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── 대본(Transcript) 패널 ───────────────────────────────────────────────────
interface TranscriptPanelProps {
  status: "generating" | "done" | "failed" | "uploading" | null;
  transcript: string | null;
  errorMessage: string | null;
  loadError?: string | null;
  onCopy?: () => void;
  /** 모바일에서 패널 열림 여부 */
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
  className?: string;
}

function TranscriptPanel({
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
      return (
        <p className="text-[13px] text-[#999]">대본을 불러오지 못했어요.</p>
      );
    }
    if (status === null) {
      return (
        <p className="text-[13px] text-[#999]">불러오는 중…</p>
      );
    }
    if (status === "generating" || status === "uploading") {
      return (
        <p className="text-[13px] text-[#888] italic">
          대본을 생성 중이에요…
        </p>
      );
    }
    if (status === "failed") {
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
        <pre className="text-[13px] text-[#666] leading-[1.6] whitespace-pre-wrap break-words font-normal">
          {formatted}
        </pre>
      );
    }
    return (
      <p className="text-[13px] text-[#999]">대본이 없어요.</p>
    );
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
        <span className="text-[12px] font-medium text-[#6B7280]">
          대본(원문)
        </span>
        <div className="flex items-center gap-1">
          {status === "done" && transcript && (
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
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {content}
      </div>
    </div>
  );

  return (
    <>
      {/* PC: 좌측 고정폭 패널 (280~360px, sticky) */}
      <aside
        className="hidden lg:block w-[min(360px,22vw)] max-w-[360px] min-w-[280px] shrink-0"
        aria-label="원문 대본"
      >
        <div className="sticky top-[8rem] h-[calc(100vh-8rem)]">{panelBody}</div>
      </aside>
      {/* 모바일: 기본 숨김, "대본 보기" 토글로 펼침 */}
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

// ─── 더미 보고서 데이터 ─────────────────────────────────────────────────────
const DUMMY_REPORT = {
  caption: "상담 보고서",
  title: "상담보고서 - 한지훈",
  meta: {
    target: "한지훈",
    date: "2026.10.24 14:30",
    duration: "01:20:33",
    counselor: "김OO",
  },
  sections: [
    {
      id: "summary",
      title: "핵심 요약",
      type: "paragraph" as const,
      content:
        "한지훈 학생은 이번 상담에서 수능 대비 전략과 약점 과목 보완 방안을 중심으로 논의하였다. 현재 국어와 영어의 독서·문학 파트에서 시간 부족이 자주 발생하고 있으며, 수학의 경우 3등급 구간에서 오답 패턴이 반복되고 있다. 11월 모의고사까지 학습 루틴을 고정하고 오답 노트를 주 3회 이상 작성하기로 하였다.",
    },
    {
      id: "discussion",
      title: "상담 내용",
      type: "subtopics" as const,
      items: [
        {
          subTitle: "학습 루틴",
          body: "오전 6시 기상, 7시까지 조식·세면 후 7시 30분부터 1타임(90분) 시험 대비 공부를 시작하기로 했다. 오후에는 학교 수업, 저녁 7시부터 3타임(각 50분) 자습을 진행한다.",
          points: ["1타임당 과목 1개 집중", "50분 공부 후 10분 휴식 고수"],
        },
        {
          subTitle: "약점 과목",
          body: "국어 독서는 지문 당 4분 이내로 제한하고, 수학은 4점 문항 위주로 매일 2문항 이상 풀기로 하였다. 영어는 listening 파트 오답을 스크립트와 대조하여 쉐도잉하는 습관을 들이기로 했다.",
          points: ["국어: 시간 배분 연습, 수학: 4점 문항 반복", "영어: listening 쉐도잉 주 3회"],
        },
        {
          subTitle: "실기 기록",
          body: "매일 공부한 과목·페이지·문항 수를 간단히 메모하고, 주말에 주간复盘을 하기로 했다. 이 기록을 다음 상담 때 공유하여 피드백을 받기로 하였다.",
          points: ["일별 메모: 과목, 페이지, 문항 수", "주말 주간复盘"],
        },
      ],
    },
    {
      id: "action",
      title: "액션 아이템",
      type: "checklist" as const,
      items: [
        { label: "오답 노트 주 3회 이상 작성", done: false },
        { label: "수학 4점 문항 매일 2문항 이상", done: false },
        { label: "영어 listening 쉐도잉 주 3회", done: false },
        { label: "일별 학습 실기 기록 메모", done: false },
      ],
    },
    {
      id: "next",
      title: "다음 일정 / 확인사항",
      type: "keyvalue" as const,
      items: [
        { key: "다음 상담", value: "2026.11.07 14:00" },
        { key: "과제", value: "오답노트 3회, 수학 4점 2문항/일" },
        { key: "제출", value: "주간 학습 기록(다음 상담 전일까지)" },
      ],
    },
  ],
};

// ─── TOC (Table of Contents) ───────────────────────────────────────────────
interface ReportTOCProps {
  meta: (typeof DUMMY_REPORT)["meta"];
  sections: (typeof DUMMY_REPORT)["sections"];
  activeId: string | null;
  onNav: (id: string) => void;
  fontClassName?: string;
}

function ReportTOC({ meta, sections, activeId, onNav, fontClassName = "" }: ReportTOCProps) {
  return (
    <aside
      className={`hidden lg:block w-[220px] shrink-0 ${fontClassName}`}
      aria-label="목차"
    >
      <div className="sticky top-[12rem]">
        {/* 목차 리스트 */}
        <nav className="flex flex-col gap-1">
          {sections.map((s) => {
            const isActive = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onNav(s.id)}
                className={`
                  text-left py-3 px-6 rounded-[24px] transition-colors
                  ${isActive ? "bg-[#F05705] text-white font-medium" : "text-[#1A1A1A] hover:bg-[#F3F4FA]"}
                `}
              >
                {s.title}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

// ─── 모바일 목차 모달 ─────────────────────────────────────────────────────
interface MobileTOCModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: (typeof DUMMY_REPORT)["sections"];
  activeId: string | null;
  onNav: (id: string) => void;
  fontClassName?: string;
}

function MobileTOCModal({ isOpen, onClose, sections, activeId, onNav, fontClassName = "" }: MobileTOCModalProps) {
  const handleNav = (id: string) => {
    onNav(id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className={`fixed inset-x-0 top-1/2 -translate-y-1/2 z-50 lg:hidden ${fontClassName}`}
        role="dialog"
        aria-label="목차"
      >
        <div className="mx-4 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* 헤더 */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-[18px] font-bold text-[#1A1A1A]">목차</h2>
          </div>
          
          {/* 목차 리스트 */}
          <nav className="flex flex-col p-2 max-h-[60vh] overflow-y-auto">
            {sections.map((s) => {
              const isActive = activeId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleNav(s.id)}
                  className={`
                    text-left py-3 px-4 rounded-[12px] transition-colors
                    ${isActive ? "bg-[#F05705] text-white font-medium" : "text-[#1A1A1A] hover:bg-[#F3F4FA]"}
                  `}
                >
                  {s.title}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}

// ─── 섹션 블랙 구분선 ──────────────────────────────────────────────────────
function SectionDivider() {
  return <div className="h-[2px] bg-[#1A1A1A] my-8" aria-hidden />;
}

// ─── 페이지 컴포넌트 ───────────────────────────────────────────────────────
interface ReportData {
  title: string | null;
  status: string | null;
  transcript: string | null;
  error_message: string | null;
}

export default function ReportDetailPage() {
  const params = useParams();
  const reportId = params.id as string;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTOCModalOpen, setIsTOCModalOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(DUMMY_REPORT.sections[0]?.id ?? null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportLoadError, setReportLoadError] = useState<string | null>(null);
  const [transcriptMobileOpen, setTranscriptMobileOpen] = useState(false);

  // Report 데이터 fetch (title, status, transcript, error_message)
  useEffect(() => {
    if (!reportId) return;
    const supabase = createClient();
    supabase
      .from("reports")
      .select("title, status, transcript, error_message")
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
        });
      });
  }, [reportId]);

  const status = reportData?.status ?? null;
  const transcript = reportData?.transcript ?? null;
  const errorMessage = reportData?.error_message ?? null;

  const handleCopyTranscript = useCallback(() => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
  }, [transcript]);

  // URL 복사
  const handleCopyUrl = useCallback(() => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard.writeText(url).then(() => {
      // 간단 피드백: 토스트 없이 잠깐 버튼 텍스트 변경 가능 (MVP에서는 생략)
    });
  }, []);

  // TOC 클릭 → 해당 섹션으로 스크롤
  const handleTocNav = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // IntersectionObserver: 뷰포트에 들어온 섹션을 active로
  useEffect(() => {
    const ids = DUMMY_REPORT.sections.map((s) => s.id);
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
  }, []);

  const r = DUMMY_REPORT;
  const reportTitle = reportData?.title ?? r.title;

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
      <TopBar onMenuClick={() => setIsDrawerOpen(true)} />

      <main className="flex-1 min-h-screen flex flex-col">
        {/* 섹션 1: 뒤로가기, 링크 복사하기 (TopBar 하단에 sticky) */}
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

        {/* 섹션 2: 대본(좌) + 상담 보고서(중앙) + 목차(우) */}
        <div className="flex-1 px-4 lg:px-8 xl:px-12 py-8 lg:py-12">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 xl:gap-12 justify-center">
          {/* 좌측: 대본 패널 (PC 고정폭, 모바일 토글) */}
          <TranscriptPanel
            status={status as TranscriptPanelProps["status"]}
            transcript={transcript}
            errorMessage={errorMessage}
            loadError={reportLoadError}
            onCopy={handleCopyTranscript}
            mobileOpen={transcriptMobileOpen}
            onMobileToggle={() => setTranscriptMobileOpen((o) => !o)}
          />

          {/* 메인 문서 카드 (보고서 영역만 Noto Sans KR) */}
          <article className={`flex-1 min-w-0 w-full max-w-[880px] bg-white rounded-[14px] px-6 lg:px-12 py-8 lg:py-12 ${notoSansKr.className}`} style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }} data-report-id={reportId}>
            {/* 헤더 */}
            <header className="mb-8">
              <div className="mb-2">
                <p className="text-[14px] text-[#999] mb-1">{r.caption}</p>
                <h1 className="text-[26px] lg:text-[28px] font-bold text-[#1A1A1A] leading-[1.4]">
                  {reportTitle}
                </h1>
              </div>
              <p className="text-[14px] text-[#666] mt-3">
                상담 대상: {r.meta.target} · 상담 일시: {r.meta.date} · 소요시간: {r.meta.duration} · 상담자: {r.meta.counselor}
              </p>
            </header>

            <SectionDivider />

            {/* 섹션들 (map) */}
            {r.sections.map((sec, idx) => (
              <section
                key={sec.id}
                id={sec.id}
                className="scroll-mt-24"
              >
                <h2 className="text-[18px] font-bold text-[#1A1A1A] mb-4">{sec.title}</h2>

                {sec.type === "paragraph" && (
                  <p className="text-[15px] lg:text-[16px] text-[#333] leading-[1.8]">
                    {sec.content}
                  </p>
                )}

                {sec.type === "subtopics" && (
                  <div className="space-y-6">
                    {sec.items.map((item, i) => (
                      <div key={i}>
                        <div className="flex gap-2.5 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb] shrink-0" />
                          <h3 className="text-[16px] font-bold text-[#1A1A1A]">{item.subTitle}</h3>
                        </div>
                        <p className="ml-4 mt-2 text-[15px] text-[#333] leading-[1.8]">
                          {item.body}
                        </p>
                        {item.points && item.points.length > 0 && (
                          <ul className="ml-4 mt-2 space-y-1">
                            {item.points.map((p, j) => (
                              <li key={j} className="flex gap-2 items-center">
                                <span className="w-1 h-1 rounded-full bg-[#2563eb] shrink-0" />
                                <span className="text-[14px] text-[#555] leading-[1.75]">{p}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {sec.type === "checklist" && (
                  <ul className="space-y-3">
                    {sec.items.map((item, i) => (
                      <li key={i} className="flex gap-3 items-center">
                        <span
                          className="w-5 h-5 rounded border-2 border-[#333] flex items-center justify-center shrink-0"
                          aria-hidden
                        >
                          {item.done && <Check className="w-3 h-3 text-[#333]" />}
                        </span>
                        <span className="text-[15px] text-[#333] leading-[1.75]">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {sec.type === "keyvalue" && (
                  <dl className="space-y-2">
                    {sec.items.map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <dt className="text-[14px] font-medium text-[#1A1A1A] shrink-0 w-[120px]">
                          {item.key}
                        </dt>
                        <dd className="text-[15px] text-[#333] leading-[1.75]">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {idx < r.sections.length - 1 && <SectionDivider />}
              </section>
            ))}
          </article>

          {/* 우측 목차 (보고서와 같은 수직선, 스크롤 시 sticky) */}
          <ReportTOC
            meta={r.meta}
            sections={r.sections}
            activeId={activeSectionId}
            onNav={handleTocNav}
            fontClassName={notoSansKr.className}
          />
            </div>
          </div>
        </div>
      </main>

      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
      
      {/* 모바일 목차 모달 (보고서 영역) */}
      <MobileTOCModal
        isOpen={isTOCModalOpen}
        onClose={() => setIsTOCModalOpen(false)}
        sections={r.sections}
        activeId={activeSectionId}
        onNav={handleTocNav}
        fontClassName={notoSansKr.className}
      />
      
      {/* 플로팅 버튼 (모바일 전용) */}
      <button
        onClick={() => setIsTOCModalOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-[#F05705] rounded-full shadow-lg flex items-center justify-center hover:bg-[#D04A04] transition-colors active:scale-95"
        aria-label="목차 열기"
      >
        <List className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}
