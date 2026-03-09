import type { LabeledSection } from "./section-labeler";

export interface DetailedSection {
  title: string;
  content: string;
}

const MIN_SECTION_CHAR_LENGTH = 200;

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

function mergeShortNeighborSections(sections: DetailedSection[]): DetailedSection[] {
  if (sections.length <= 1) return sections;

  const merged: DetailedSection[] = [];
  for (const sec of sections) {
    if (sec.content.length < MIN_SECTION_CHAR_LENGTH && merged.length > 0) {
      const last = merged[merged.length - 1];
      last.content = `${last.content}\n\n${sec.content}`.trim();
      last.title = `${last.title} / ${sec.title}`.slice(0, 80);
      continue;
    }
    merged.push({ ...sec });
  }

  return merged;
}

export function buildDetailedSections(
  sentences: string[],
  labeledSections: LabeledSection[]
): DetailedSection[] {
  const normalized = normalizeRanges(labeledSections, sentences.length);

  let built = normalized.map((sec) => {
    const slice = sentences.slice(sec.start, sec.end);
    return {
      title: sec.title?.trim() || "상담 내용",
      content: joinSentencesReadable(slice),
    };
  });

  built = built.filter((s) => s.content.trim().length > 0);
  built = mergeShortNeighborSections(built);

  if (built.length === 1 && sentences.length > 20) {
    const mid = Math.floor(sentences.length / 2);
    built = [
      {
        title: "상담 내용 (전반)",
        content: joinSentencesReadable(sentences.slice(0, mid)),
      },
      {
        title: "상담 내용 (후반)",
        content: joinSentencesReadable(sentences.slice(mid)),
      },
    ];
  }

  return built;
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
