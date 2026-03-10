import type { LabeledSection } from "./section-labeler";
import { rewriteSectionToReportTone } from "./section-rewriter";

export interface DetailedSection {
  title: string;
  content: string;
}

export interface DetailedSectionBuildStats {
  rewriteEnabled: boolean;
  sectionFallbackCount: number;
  totalRewriteTimeMs: number;
}

interface SectionDraft {
  title: string;
  content: string;
  slice: string[];
}

const MIN_SECTION_CHAR_LENGTH = 200;
const REWRITE_LONG_SECTION_THRESHOLD = 3500;
const REWRITE_MIN_RATIO = 0.9;
const REWRITE_CHUNK_MIN_SENTENCES = 10;
const REWRITE_CHUNK_MAX_SENTENCES = 20;
const REWRITE_CHUNK_MIN_CHARS = 2500;
const REWRITE_CHUNK_MAX_CHARS = 3200;
const REWRITE_SECTIONS_ENABLED = process.env.REWRITE_SECTIONS_ENABLED === "true";

function normalizeRanges(
  sections: LabeledSection[],
  sentenceCount: number
): LabeledSection[] {
  if (sentenceCount <= 0) return [];
  if (!sections.length) {
    return [{ title: "상담 내용", start: 0, end: sentenceCount }];
  }

  const sorted = [...sections].sort((a, b) => a.start - b.start);
  const normalized: LabeledSection[] = [];
  let cursor = 0;

  for (const sec of sorted) {
    const start = Math.max(0, Math.min(sec.start, sentenceCount));
    const end = Math.max(0, Math.min(sec.end, sentenceCount));
    if (end <= start) continue;

    if (start > cursor) {
      normalized.push({ title: "상담 내용", start: cursor, end: start });
      cursor = start;
    }
    if (start < cursor) {
      if (end <= cursor) continue;
      normalized.push({
        title: sec.title || "상담 내용",
        start: cursor,
        end,
      });
      cursor = end;
      continue;
    }
    normalized.push({ title: sec.title || "상담 내용", start, end });
    cursor = end;
  }

  if (cursor < sentenceCount) {
    normalized.push({ title: "상담 내용", start: cursor, end: sentenceCount });
  }

  if (!normalized.length) {
    return [{ title: "상담 내용", start: 0, end: sentenceCount }];
  }

  return normalized;
}

function joinSentencesReadable(sentences: string[]): string {
  if (!sentences.length) return "";

  const lines: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    lines.push(sentences[i]);
    if ((i + 1) % 6 === 0 && i !== sentences.length - 1) {
      lines.push("");
    }
  }
  return lines.join("\n").trim();
}

function splitSentencesForRewrite(sentences: string[]): string[][] {
  if (sentences.length <= REWRITE_CHUNK_MAX_SENTENCES) return [sentences];

  const chunks: string[][] = [];
  let cursor = 0;
  while (cursor < sentences.length) {
    const chunk: string[] = [];
    let chars = 0;

    while (cursor < sentences.length && chunk.length < REWRITE_CHUNK_MAX_SENTENCES) {
      const next = sentences[cursor];
      const nextLen = next.length + 1;
      if (
        chunk.length >= REWRITE_CHUNK_MIN_SENTENCES &&
        chars >= REWRITE_CHUNK_MIN_CHARS &&
        chars + nextLen > REWRITE_CHUNK_MAX_CHARS
      ) {
        break;
      }

      chunk.push(next);
      chars += nextLen;
      cursor += 1;

      if (chunk.length >= REWRITE_CHUNK_MIN_SENTENCES && chars >= REWRITE_CHUNK_MAX_CHARS) {
        break;
      }
    }

    if (chunk.length === 0) {
      chunk.push(sentences[cursor]);
      cursor += 1;
    }
    chunks.push(chunk);
  }
  return chunks;
}

async function rewriteSectionContentWithChunks(
  sectionSentences: string[],
  contentRaw: string
): Promise<{
  content: string;
  usedFallback: boolean;
  ratio: number;
}> {
  if (!REWRITE_SECTIONS_ENABLED) {
    return { content: contentRaw, usedFallback: false, ratio: 1 };
  }

  if (contentRaw.length <= REWRITE_LONG_SECTION_THRESHOLD) {
    const result = await rewriteSectionToReportTone(contentRaw, { maxRetries: 2, minRatio: REWRITE_MIN_RATIO });
    return {
      content: result.text,
      usedFallback: result.usedFallback,
      ratio: result.ratio,
    };
  }

  const sentenceChunks = splitSentencesForRewrite(sectionSentences);
  const rewrittenParts: string[] = [];
  let totalOriginalLen = 0;
  let totalRewrittenLen = 0;
  let hasFallback = false;

  for (const sentChunk of sentenceChunks) {
    const rawChunk = joinSentencesReadable(sentChunk);
    totalOriginalLen += rawChunk.length;
    const rewritten = await rewriteSectionToReportTone(rawChunk, {
      maxRetries: 2,
      minRatio: REWRITE_MIN_RATIO,
    });
    if (rewritten.usedFallback) hasFallback = true;
    totalRewrittenLen += rewritten.text.length;
    rewrittenParts.push(rewritten.text);
  }

  const totalRatio = totalOriginalLen > 0 ? totalRewrittenLen / totalOriginalLen : 1;
  console.log(
    "[build-detailed-sections] chunk rewrite metrics:",
    "chunkCount=",
    sentenceChunks.length,
    "totalOriginalLen=",
    totalOriginalLen,
    "totalRewrittenLen=",
    totalRewrittenLen,
    "totalRatio=",
    totalRatio.toFixed(3)
  );

  if (totalRatio < REWRITE_MIN_RATIO) {
    return { content: contentRaw, usedFallback: true, ratio: totalRatio };
  }

  return {
    content: rewrittenParts.join("\n\n").trim(),
    usedFallback: hasFallback,
    ratio: totalRatio,
  };
}

function mergeShortNeighborSections(sections: SectionDraft[]): SectionDraft[] {
  if (sections.length <= 1) return sections;

  const merged: SectionDraft[] = [];
  for (const sec of sections) {
    if (sec.content.length < MIN_SECTION_CHAR_LENGTH && merged.length > 0) {
      const last = merged[merged.length - 1];
      last.content = `${last.content}\n\n${sec.content}`.trim();
      last.title = `${last.title} / ${sec.title}`.slice(0, 80);
      last.slice = [...last.slice, ...sec.slice];
      continue;
    }
    merged.push({ ...sec });
  }

  return merged;
}

export async function buildDetailedSections(
  sentences: string[],
  labeledSections: LabeledSection[]
): Promise<{ sections: DetailedSection[]; stats: DetailedSectionBuildStats }> {
  const rewriteStartAt = Date.now();
  let sectionFallbackCount = 0;
  const normalized = normalizeRanges(labeledSections, sentences.length);

  let builtRaw: SectionDraft[] = normalized.map((sec) => {
    const slice = sentences.slice(sec.start, sec.end);
    return {
      title: sec.title?.trim() || "상담 내용",
      slice,
      content: joinSentencesReadable(slice),
    };
  });

  builtRaw = builtRaw.filter((s) => s.content.trim().length > 0);
  builtRaw = mergeShortNeighborSections(builtRaw);

  let built: DetailedSection[] = [];
  for (const sec of builtRaw) {
    try {
      const rewrite = await rewriteSectionContentWithChunks(
        sec.slice.length > 0 ? sec.slice : splitContentToPseudoSentences(sec.content),
        sec.content
      );
      if (rewrite.usedFallback) {
        sectionFallbackCount += 1;
      }
      built.push({
        title: sec.title,
        content: rewrite.content,
      });
    } catch (e) {
      sectionFallbackCount += 1;
      console.warn(
        "[build-detailed-sections] section rewrite failed, fallback to raw:",
        e instanceof Error ? e.message : String(e)
      );
      built.push({
        title: sec.title,
        content: sec.content,
      });
    }
  }

  if (built.length === 1 && sentences.length > 20) {
    const mid = Math.floor(sentences.length / 2);
    const splitBuilt: DetailedSection[] = [
      {
        title: "상담 내용 (핵심 이슈)",
        content: joinSentencesReadable(sentences.slice(0, mid)),
      },
      {
        title: "상담 내용 (전략/액션)",
        content: joinSentencesReadable(sentences.slice(mid)),
      },
    ];
    built = splitBuilt;
  }

  return {
    sections: built,
    stats: {
      rewriteEnabled: REWRITE_SECTIONS_ENABLED,
      sectionFallbackCount,
      totalRewriteTimeMs: Date.now() - rewriteStartAt,
    },
  };
}

function splitContentToPseudoSentences(content: string): string[] {
  return content
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function computeDetailedCoverageRatio(
  transcript: string,
  sections: DetailedSection[]
): { ratio: number; detailedLength: number; transcriptLength: number } {
  const detailedText = sections.map((s) => s.content).join("\n\n");
  const transcriptLength = transcript.length;
  const detailedLength = detailedText.length;
  const ratio = transcriptLength > 0 ? detailedLength / transcriptLength : 0;
  return { ratio, detailedLength, transcriptLength };
}
