export interface LabeledSection {
  title: string;
  start: number;
  end: number;
}

interface ChunkRange {
  start: number;
  end: number;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

const MAX_SENTENCES_PER_CHUNK = 300;
const MAX_CHARS_PER_CHUNK = 15000;
const MAX_LABEL_ATTEMPTS = 2;

function createChunks(sentences: string[]): ChunkRange[] {
  const chunks: ChunkRange[] = [];
  let start = 0;

  while (start < sentences.length) {
    let end = start;
    let charCount = 0;
    while (end < sentences.length && end - start < MAX_SENTENCES_PER_CHUNK) {
      const nextLen = sentences[end].length + 1;
      if (end > start && charCount + nextLen > MAX_CHARS_PER_CHUNK) break;
      charCount += nextLen;
      end += 1;
    }
    chunks.push({ start, end });
    start = end;
  }

  return chunks;
}

function buildChunkPrompt(sentences: string[]): string {
  const numbered = sentences.map((s, i) => `[${i}] ${s}`).join("\n");
  return `아래 문장 배열을 주제 전환 기준으로 섹션화하세요.
- 문장을 다시 쓰지 말고, 오직 섹션 경계(start/end)와 제목(title)만 반환하세요.
- 범위는 start inclusive, end exclusive 입니다.
- 첫 섹션 start는 0, 마지막 섹션 end는 전체 문장 수(${sentences.length})여야 합니다.
- 모든 문장을 누락/중복 없이 정확히 한 번씩 포함해야 합니다.
- 너무 잘게 쪼개지지 않게, 주제 전환 지점에서만 분할하세요.
- 고정 목차는 금지하고 상담 흐름에 맞는 짧은 제목을 사용하세요.

[문장 목록]
${numbered}`;
}

function validateSections(sections: LabeledSection[], sentenceCount: number): string | null {
  if (!Array.isArray(sections) || sections.length === 0) return "sections empty";

  const sorted = [...sections].sort((a, b) => a.start - b.start);
  if (sorted[0].start !== 0) return "first section start must be 0";
  if (sorted[sorted.length - 1].end !== sentenceCount) return "last section end must equal sentence length";

  let cursor = 0;
  for (const s of sorted) {
    if (!s.title?.trim()) return "empty title";
    if (!Number.isInteger(s.start) || !Number.isInteger(s.end)) return "start/end must be integer";
    if (s.start !== cursor) return "gap or overlap exists";
    if (s.end <= s.start) return "invalid range";
    if (s.end > sentenceCount) return "range out of bound";
    cursor = s.end;
  }
  if (cursor !== sentenceCount) return "not fully covered";

  return null;
}

async function requestChunkSections(chunkSentences: string[]): Promise<LabeledSection[]> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required");

  const url = `${OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const responseJsonSchema = {
    name: "section_label_schema",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        sections: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              start: { type: "integer", minimum: 0 },
              end: { type: "integer", minimum: 1 },
            },
            required: ["title", "start", "end"],
          },
        },
      },
      required: ["sections"],
    },
  } as const;

  const reqBody = {
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "당신은 상담 대본 문장 배열의 섹션 라벨러다. 문장을 재작성/요약하지 말고 섹션 경계와 제목만 반환한다.",
      },
      { role: "user", content: buildChunkPrompt(chunkSentences) },
    ],
    response_format: { type: "json_schema", json_schema: responseJsonSchema },
    temperature: 0.1,
  } as const;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`section label API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("section label response missing content");

  const parsed = JSON.parse(content) as { sections?: LabeledSection[] };
  if (!Array.isArray(parsed.sections)) throw new Error("invalid sections payload");
  return parsed.sections;
}

function fallbackSections(sentenceCount: number): LabeledSection[] {
  if (sentenceCount <= 0) return [];
  if (sentenceCount < 12) return [{ title: "상담 내용", start: 0, end: sentenceCount }];
  const mid = Math.floor(sentenceCount / 2);
  return [
    { title: "상담 내용 (전반)", start: 0, end: mid },
    { title: "상담 내용 (후반)", start: mid, end: sentenceCount },
  ];
}

export async function labelSectionsWithLLM(sentences: string[]): Promise<{
  sections: LabeledSection[];
  chunkCount: number;
}> {
  const chunks = createChunks(sentences);
  const merged: LabeledSection[] = [];

  for (const chunk of chunks) {
    const chunkSentences = sentences.slice(chunk.start, chunk.end);
    let selected: LabeledSection[] | null = null;
    let lastReason = "unknown";

    for (let attempt = 1; attempt <= MAX_LABEL_ATTEMPTS; attempt++) {
      try {
        const candidate = await requestChunkSections(chunkSentences);
        const reason = validateSections(candidate, chunkSentences.length);
        if (!reason) {
          selected = candidate;
          break;
        }
        lastReason = reason;
        console.warn(
          "[section-labeler] chunk validation failed:",
          "chunkStart=",
          chunk.start,
          "chunkEnd=",
          chunk.end,
          "attempt=",
          attempt,
          "reason=",
          reason
        );
      } catch (e) {
        lastReason = e instanceof Error ? e.message : String(e);
        console.warn(
          "[section-labeler] chunk request failed:",
          "chunkStart=",
          chunk.start,
          "chunkEnd=",
          chunk.end,
          "attempt=",
          attempt,
          "reason=",
          lastReason
        );
      }
    }

    if (!selected) {
      selected = fallbackSections(chunkSentences.length);
      console.warn(
        "[section-labeler] fallback sections applied:",
        "chunkStart=",
        chunk.start,
        "chunkEnd=",
        chunk.end,
        "reason=",
        lastReason
      );
    }

    for (const s of selected) {
      merged.push({
        title: s.title.trim() || "상담 내용",
        start: s.start + chunk.start,
        end: s.end + chunk.start,
      });
    }
  }

  return { sections: merged, chunkCount: chunks.length };
}
