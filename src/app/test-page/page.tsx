'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Menu, Share2, Pencil, CheckCircle2 } from 'lucide-react';

type BlockType = 'title' | 'heading' | 'body' | 'small';
type Block = { id: string; type: BlockType; text: string; bold?: boolean };
type Page = { id: string; label: string; blocks: Block[] };

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

const BLOCK_HEIGHT: Record<BlockType, number> = {
  title: 48,
  heading: 40,
  body: 80,
  small: 32,
};
const BLOCK_GAP = 8;

function getBlockLayout(blocks: Block[]) {
  const positions: { top: number; left: number; width: number; height: number }[] = [];
  let y = 0;
  for (const b of blocks) {
    const h = BLOCK_HEIGHT[b.type];
    positions.push({ top: y, left: 0, width: 100, height: h });
    y += h + BLOCK_GAP;
  }
  return positions;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const onchange = () => setIsMobile(mq.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onchange);
    return () => mq.removeEventListener('change', onchange);
  }, []);
  return isMobile;
}

function TestPageContent() {
  const searchParams = useSearchParams();
  const justCompleted = searchParams.get('completed') === '1';
  const isMobile = useIsMobile();

  const [pages, setPages] = useState<Page[]>(() => [
    {
      id: uid('p'),
      label: '1 페이지',
      blocks: [
        { id: uid('b'), type: 'title', text: '한지훈 학생 상담 보고서' },
        { id: uid('b'), type: 'small', text: '2026년 10월 24일' },
        { id: uid('b'), type: 'heading', text: '핵심 요약' },
        { id: uid('b'), type: 'body', text: '오늘 상담에서는 현재 학습 상태를 점검하고, 2주 계획을 합의했습니다.' },
        { id: uid('b'), type: 'heading', text: '액션 아이템' },
        { id: uid('b'), type: 'body', text: '1) 주 3회 루틴 고정  2) 약점 과목 오답 정리  3) 실기 기록 측정' },
      ],
    },
    {
      id: uid('p'),
      label: '2 페이지',
      blocks: [
        { id: uid('b'), type: 'heading', text: '상담 상세 내용' },
        { id: uid('b'), type: 'body', text: '학생의 현재 컨디션과 학습 패턴을 확인했고, 목표 대학 기준으로 전략을 조정했습니다.' },
      ],
    },
    {
      id: uid('p'),
      label: '3 페이지',
      blocks: [
        { id: uid('b'), type: 'heading', text: '다음 일정 / 체크포인트' },
        { id: uid('b'), type: 'body', text: '다음 상담은 2주 후 진행, 그 전까지 주간 기록을 공유하기로 했습니다.' },
      ],
    },
  ]);

  const [activePageId, setActivePageId] = useState(pages[0]?.id);
  const activePage = useMemo(
    () => pages.find((p) => p.id === activePageId) ?? pages[0],
    [pages, activePageId]
  );

  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const reportTitle = '한지훈 학생 상담 보고서';
  const reportDate = '2026.10.24';
  const coverImageUrl =
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80';

  const updateBlock = useCallback((blockId: string, patch: Partial<Block>) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id !== activePageId
          ? p
          : { ...p, blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) }
      )
    );
  }, [activePageId]);

  const toggleBold = useCallback((blockId: string) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== activePageId) return p;
        const b = p.blocks.find((x) => x.id === blockId);
        return b
          ? { ...p, blocks: p.blocks.map((x) => (x.id === blockId ? { ...x, bold: !x.bold } : x)) }
          : p;
      })
    );
  }, [activePageId]);

  const exitEdit = useCallback(() => {
    setEditingFrameId(null);
    setActiveFrameId(null);
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 300); // TODO: 실제 저장 연동
  }, []);

  const handleFrameClick = useCallback(
    (blockId: string) => {
      if (isMobile) {
        setToast('보고서 수정은 PC에서만 가능해요.');
        return;
      }
      setActiveFrameId(blockId);
      setEditingFrameId(blockId);
    },
    [isMobile]
  );

  const blockLayout = useMemo(() => getBlockLayout(activePage?.blocks ?? []), [activePage?.blocks]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      {/* Top header */}
      <div className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-black/5 lg:hidden"
              aria-label="메뉴 열기"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <div className="text-sm text-gray-500">{reportDate}</div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-gray-900">{reportTitle}</h1>
                <button className="rounded-lg p-2 hover:bg-black/5" aria-label="제목 수정">
                  <Pencil className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
              onClick={() => alert('공유 링크 생성 (TODO)')}
            >
              <Share2 className="h-4 w-4" />
              보고서 공유
            </button>
          </div>
        </div>
      </div>

      {justCompleted && (
        <div className="mx-auto max-w-[1200px] px-6 pt-5">
          <div className="rounded-2xl border bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#FF7A00]" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900">보고서 생성이 완료되었습니다.</div>
                <div className="mt-1 text-sm text-gray-600">
                  {pages.length}페이지로 정리되었고, 핵심 요약과 액션 아이템이 포함되어 있습니다. 필요한 부분만 가볍게 수정하고 바로 공유해보세요.
                </div>
              </div>
              <div className="hidden text-sm text-gray-500 md:block">방금</div>
            </div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-12 gap-6 px-6 py-6">
        {/* Left: page list */}
        <aside className="col-span-12 md:col-span-3">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-gray-900">페이지</div>
            <div className="space-y-1">
              {pages.map((p) => {
                const active = p.id === activePageId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePageId(p.id)}
                    className={[
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm',
                      active ? 'bg-[#FFF1E6] text-[#FF7A00]' : 'hover:bg-black/5 text-gray-700',
                    ].join(' ')}
                  >
                    <span className="font-medium">{p.label}</span>
                    {active && <span className="text-xs font-semibold">선택됨</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center: preview (A4, in-place edit) */}
        <main className="col-span-12 md:col-span-6">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-gray-900">미리보기</div>
            <div className="mx-auto w-full max-w-[520px]">
              {/* A4 고정 비율, 배경 이미지 + 텍스트 레이어 */}
              <div className="relative aspect-[210/297] w-full overflow-hidden rounded-2xl border bg-white shadow-sm">
                {/* 배경 이미지: z-0, absolute inset-0 */}
                <Image
                  src={coverImageUrl}
                  alt="report cover"
                  fill
                  className="object-cover"
                  style={{ zIndex: 0 }}
                  priority
                />
                <div className="absolute inset-0 z-[1] bg-black/15" aria-hidden />

                {/* 텍스트 레이어: z-10, relative, padding */}
                <div className="absolute inset-0 z-10 p-6">
                  <div className="relative h-full w-full overflow-hidden">
                    {(activePage?.blocks ?? []).map((b, i) => {
                      const pos = blockLayout[i];
                      if (!pos) return null;
                      return (
                        <TextFrame
                          key={b.id}
                          block={b}
                          position={pos}
                          isActive={activeFrameId === b.id}
                          isEditing={editingFrameId === b.id}
                          onClick={() => handleFrameClick(b.id)}
                          onBlur={exitEdit}
                          onTextChange={(t) => updateBlock(b.id, { text: t })}
                          onBoldToggle={() => toggleBold(b.id)}
                          onExitEdit={exitEdit}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center text-xs text-gray-500">
                {activePage?.label} 미리보기 (A4 비율)
              </div>
            </div>
          </div>
        </main>

        {/* Right: 안내/상태 패널 (라이트 편집기 제거), 모바일 숨김 */}
        <section className="col-span-12 hidden md:col-span-3 md:block">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-gray-900">안내</div>
            <div className="space-y-3 rounded-xl bg-[#F6F7F9] px-4 py-3 text-sm text-gray-600">
              <p>PC에서 미리보기 영역의 텍스트를 클릭해 바로 수정할 수 있어요.</p>
              <p>모바일에서는 편집이 지원되지 않아요.</p>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              저장 상태: <span className="font-medium text-gray-700">{saveStatus === 'saving' ? '저장 중' : '저장됨'}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-[280px] bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-sm font-semibold">메뉴</div>
            <div className="space-y-2 text-sm">
              <a className="block rounded-lg px-3 py-2 hover:bg-black/5" href="/home">홈</a>
              <a className="block rounded-lg px-3 py-2 hover:bg-black/5" href="/storage">상담 저장소</a>
              <a className="block rounded-lg px-3 py-2 hover:bg-black/5" href="/mypage">마이페이지</a>
            </div>
            <button
              className="mt-6 w-full rounded-xl bg-[#FFF1E6] px-4 py-2 text-sm font-semibold text-[#FF7A00]"
              onClick={() => alert('플랜 업그레이드 (TODO)')}
            >
              플랜 업그레이드
            </button>
          </div>
        </div>
      )}

      {/* 모바일 편집 불가 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">로딩 중...</div>}>
      <TestPageContent />
    </Suspense>
  );
}

type TextFrameProps = {
  block: Block;
  position: { top: number; left: number; width: number; height: number };
  isActive: boolean;
  isEditing: boolean;
  onClick: () => void;
  onBlur: () => void;
  onTextChange: (t: string) => void;
  onBoldToggle: () => void;
  onExitEdit: () => void;
};

function TextFrame({
  block,
  position,
  isActive,
  isEditing,
  onClick,
  onBlur,
  onTextChange,
  onBoldToggle,
  onExitEdit,
}: TextFrameProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const { top, left, width, height } = position;
  const bold = block.bold ?? false;

  const typeStyles = {
    title: 'text-xl text-gray-900',
    heading: 'text-sm text-gray-900',
    body: 'text-sm leading-6 text-gray-700',
    small: 'text-xs text-gray-500',
  };
  const styleCls = `${typeStyles[block.type]} ${bold ? 'font-semibold' : 'font-normal'} whitespace-pre-wrap`;

  useEffect(() => {
    if (isEditing) return;
    const el = textRef.current;
    if (!el) return;
    setHasOverflow(el.scrollHeight > el.clientHeight);
  }, [block.text, block.type, height, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onExitEdit();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onExitEdit();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      onBoldToggle();
    }
  };

  return (
    <div
      className="absolute cursor-text"
      style={{
        top: `${top}px`,
        left: `${left}%`,
        width: `${width}%`,
        height: `${height}px`,
      }}
      onClick={onClick}
      role="button"
      tabIndex={-1}
      onKeyDown={() => {}}
    >
      <div
        className={[
          'h-full w-full overflow-hidden rounded px-1.5 py-0.5',
          isActive ? 'outline outline-2 outline-[#FF7A00] outline-offset-0 bg-white/40' : 'outline-none',
        ].join(' ')}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className={`h-full w-full resize-none rounded border-0 bg-white/95 px-1 py-0.5 align-top outline-none ${styleCls}`}
            value={block.text}
            onChange={(e) => onTextChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            style={{ font: 'inherit' }}
          />
        ) : (
          <>
            <div ref={textRef} className={`h-full overflow-hidden break-words ${styleCls}`}>
              {block.text || '\u00A0'}
            </div>
            {hasOverflow && !isEditing && (
              <div className="mt-0.5 text-[10px] text-amber-600">내용이 넘칩니다</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
