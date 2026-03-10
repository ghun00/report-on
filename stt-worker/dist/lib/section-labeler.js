"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.labelSectionsWithLLM = labelSectionsWithLLM;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MAX_SENTENCES_PER_CHUNK = 300;
const MAX_CHARS_PER_CHUNK = 15000;
const MAX_LABEL_ATTEMPTS = 2;
const TITLE_BANNED_RE = /(전반|후반|파트|part|상담\s*내용|기타|종합|일반|소개|마무리|섹션\s*\d+)/i;
const TITLE_KEYWORD_RE = /(내신|성적|모의고사|최저|생기부|전공|지원|전략|리스크|액션|대학|카드|수능|목표|진단|합격|불합격|상향|하향)/;
function getMinSectionsBySentenceCount(sentenceCount) {
    if (sentenceCount >= 120)
        return 10;
    if (sentenceCount >= 80)
        return 8;
    if (sentenceCount >= 40)
        return 6;
    if (sentenceCount >= 20)
        return 5;
    if (sentenceCount >= 8)
        return 4;
    return 3;
}
function createChunks(sentences) {
    const chunks = [];
    let start = 0;
    while (start < sentences.length) {
        let end = start;
        let charCount = 0;
        while (end < sentences.length && end - start < MAX_SENTENCES_PER_CHUNK) {
            const nextLen = sentences[end].length + 1;
            if (end > start && charCount + nextLen > MAX_CHARS_PER_CHUNK)
                break;
            charCount += nextLen;
            end += 1;
        }
        chunks.push({ start, end });
        start = end;
    }
    return chunks;
}
function buildChunkPrompt(sentences, minSectionsForChunk, retryReason) {
    const sentencesJson = JSON.stringify(sentences.map((s, i) => ({ index: i, text: s })), null, 2);
    const retryHint = retryReason
        ? `\n[재시도 지시]\n- 이전 시도 실패 이유: ${retryReason}\n- 섹션 수가 너무 적거나 제목이 범용적이지 않도록 반드시 개선하라.\n`
        : "";
    return `아래는 상담 transcript를 문장 단위로 분리한 sentences 배열(현재 chunk 범위)입니다.
당신의 임무는 '주제 전환' 기준으로 섹션을 나누고, 각 섹션에 구체적인 제목을 붙이는 것입니다.

[출력 규칙]
- 출력은 오직 JSON만 반환한다.
- 스키마:
{
  "sections": [
    { "title": "string", "start": number, "end": number }
  ]
}
- start/end는 현재 chunk 내부 인덱스 기준이다. (0 .. ${sentences.length - 1})
- 범위는 start inclusive, end exclusive.

[절대 규칙]
1) 범위 커버리지:
- 첫 섹션 start는 반드시 0
- 마지막 섹션 end는 반드시 ${sentences.length}
- 섹션들은 순서대로 이어져야 한다(이전 end === 다음 start)
- 겹침/누락/역전 금지

2) 제목 품질(가장 중요):
- 금지 제목: 전반, 후반, 파트1/파트2, 상담 내용, 기타, 종합, 일반, 소개, 마무리 같은 범용 라벨
- 제목은 반드시 구체 주제를 포함해야 한다.
- 제목은 6~20자 내외의 짧고 선명한 라벨로 작성한다.

3) 섹션 개수:
- 최소 섹션 수: ${minSectionsForChunk}개 이상
- 두 덩어리로 대충 분할 금지
- 주제 전환마다 충분히 잘게 나누되, 1~2문장 섹션이 연속되면 적절히 합친다.

4) 분할 기준:
- 시간/전반후반이 아니라 주제 전환을 기준으로 나눈다.
- 전환 신호 예시(고정 목차 아님):
  - 내신/성적/학기 성적 논의 전환
  - 모의고사/수능 최저/전략 과목 전환
  - 생기부/세특/활동 강점·약점 피드백 전환
  - 전공/진로 변경 논쟁 전환
  - 지원 대학 리스트/카드 조합 전환
  - 리스크/변수/조건부 조언 전환
  - 결론/남은 기간 액션 플랜 전환

[중요]
- 문장 내용을 절대 재작성/요약/편집하지 않는다.
- 오직 sections 배열만 반환한다.
${retryHint}

[sentences]
${sentencesJson}`;
}
function validateSections(sections, sentenceCount, minSections) {
    if (!Array.isArray(sections) || sections.length === 0)
        return "sections empty";
    if (sections.length < minSections) {
        return `sections too few (${sections.length} < ${minSections})`;
    }
    const sorted = [...sections].sort((a, b) => a.start - b.start);
    if (sorted[0].start !== 0)
        return "first section start must be 0";
    if (sorted[sorted.length - 1].end !== sentenceCount)
        return "last section end must equal sentence length";
    let cursor = 0;
    for (const s of sorted) {
        const title = s.title?.trim() ?? "";
        if (!title)
            return "empty title";
        if (TITLE_BANNED_RE.test(title))
            return `generic title not allowed: ${title}`;
        if (!TITLE_KEYWORD_RE.test(title))
            return `title missing keyword: ${title}`;
        if (!Number.isInteger(s.start) || !Number.isInteger(s.end))
            return "start/end must be integer";
        if (s.start !== cursor)
            return "gap or overlap exists";
        if (s.end <= s.start)
            return "invalid range";
        if (s.end > sentenceCount)
            return "range out of bound";
        cursor = s.end;
    }
    if (cursor !== sentenceCount)
        return "not fully covered";
    return null;
}
async function requestChunkSections(chunkSentences, minSectionsForChunk, retryReason) {
    if (!OPENAI_API_KEY)
        throw new Error("OPENAI_API_KEY is required");
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
                    minItems: minSectionsForChunk,
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
    };
    const reqBody = {
        model: OPENAI_MODEL,
        messages: [
            {
                role: "system",
                content: "당신은 '상담 transcript 문장 목록'을 주제 전환 기준으로 챕터링하는 라벨러다. 역할은 오직 섹션 경계(start/end)와 제목(title)을 정하는 것이다. 문장 재작성/요약/편집/해석은 금지한다.",
            },
            { role: "user", content: buildChunkPrompt(chunkSentences, minSectionsForChunk, retryReason) },
        ],
        response_format: { type: "json_schema", json_schema: responseJsonSchema },
        temperature: 0.1,
    };
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
    const data = (await res.json());
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string")
        throw new Error("section label response missing content");
    const raw = content.trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.sections))
        throw new Error("invalid sections payload");
    return parsed.sections;
}
function inferKeywordTitle(slice) {
    const text = slice.join(" ").slice(0, 2000);
    if (/내신|성적|등급/.test(text))
        return "내신/성적 진단 및 상향 전략";
    if (/모의고사|최저|수능/.test(text))
        return "모의고사/최저 기준 대응 전략";
    if (/생기부|학생부|활동/.test(text))
        return "생기부 강점·약점 점검";
    if (/전공|학과|변경/.test(text))
        return "전공 변경 논의와 리스크";
    if (/대학|지원|카드|원서/.test(text))
        return "지원 대학/카드 조합 전략";
    if (/리스크|위험|불리|부담/.test(text))
        return "핵심 리스크와 대응 포인트";
    if (/계획|실행|액션|다음/.test(text))
        return "다음 액션 및 실행 계획";
    return "지원전략 및 리스크 점검";
}
function fallbackSections(sentences, minSections) {
    const sentenceCount = sentences.length;
    if (sentenceCount <= 0)
        return [];
    const target = Math.max(2, Math.min(minSections, sentenceCount));
    const chunkSize = Math.ceil(sentenceCount / target);
    const sections = [];
    let start = 0;
    while (start < sentenceCount) {
        const end = Math.min(sentenceCount, start + chunkSize);
        const title = inferKeywordTitle(sentences.slice(start, end));
        sections.push({ title, start, end });
        start = end;
    }
    if (sections.length === 1 && sentenceCount > 1) {
        const mid = Math.floor(sentenceCount / 2);
        return [
            { title: inferKeywordTitle(sentences.slice(0, mid)), start: 0, end: mid },
            { title: inferKeywordTitle(sentences.slice(mid)), start: mid, end: sentenceCount },
        ];
    }
    return sections;
}
function minSectionsForChunk(totalMinSections, totalSentences, chunkSentenceCount) {
    if (totalSentences <= 0)
        return 1;
    const proportional = Math.round((totalMinSections * chunkSentenceCount) / totalSentences);
    return Math.max(2, proportional);
}
async function labelSectionsWithLLM(sentences) {
    const minSections = getMinSectionsBySentenceCount(sentences.length);
    const chunks = createChunks(sentences);
    const merged = [];
    for (const chunk of chunks) {
        const chunkSentences = sentences.slice(chunk.start, chunk.end);
        const chunkMinSections = minSectionsForChunk(minSections, sentences.length, chunkSentences.length);
        let selected = null;
        let lastReason = "unknown";
        for (let attempt = 1; attempt <= MAX_LABEL_ATTEMPTS; attempt++) {
            try {
                const candidate = await requestChunkSections(chunkSentences, chunkMinSections, attempt > 1 ? `섹션 수가 너무 적음. 주제 전환마다 더 잘게 나누라. 이전 사유: ${lastReason}` : undefined);
                const reason = validateSections(candidate, chunkSentences.length, chunkMinSections);
                if (!reason) {
                    selected = candidate;
                    break;
                }
                lastReason = reason;
                console.warn("[section-labeler] chunk validation failed:", "chunkStart=", chunk.start, "chunkEnd=", chunk.end, "attempt=", attempt, "reason=", reason);
            }
            catch (e) {
                lastReason = e instanceof Error ? e.message : String(e);
                console.warn("[section-labeler] chunk request failed:", "chunkStart=", chunk.start, "chunkEnd=", chunk.end, "attempt=", attempt, "reason=", lastReason);
            }
        }
        if (!selected) {
            selected = fallbackSections(chunkSentences, chunkMinSections);
            console.warn("[section-labeler] fallback sections applied:", "chunkStart=", chunk.start, "chunkEnd=", chunk.end, "reason=", lastReason);
        }
        for (const s of selected) {
            merged.push({
                title: s.title.trim() || "상담 내용",
                start: s.start + chunk.start,
                end: s.end + chunk.start,
            });
        }
    }
    if (merged.length < minSections && sentences.length > 0) {
        console.warn("[section-labeler] merged sections too few, applying global fallback:", "sectionCount=", merged.length, "minSections=", minSections);
        const fallback = fallbackSections(sentences, minSections);
        return { sections: fallback, chunkCount: chunks.length };
    }
    return { sections: merged, chunkCount: chunks.length };
}
