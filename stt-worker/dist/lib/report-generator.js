"use strict";
/**
 * LLM(OpenAI)으로 상담 대본에서 report_json 생성.
 * 스키마 v2: meta(version 2) + summary_blocks(2~3) + detailed_sections(2개 이상)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportJson = generateReportJson;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const MIN_DETAILED_SECTION_CONTENT_LENGTH = 80;
const MIN_COVERAGE_RATIO = 0.85;
const MIN_DETAILED_TEXT_LENGTH = 1200;
const MAX_ATTEMPTS = 3;
const ALLOWED_META_VERSIONS = new Set([2, 4]);
const RETRY_USER_PROMPT_SUFFIX = "이전 결과가 원문 대비 지나치게 짧았습니다. 원문 길이의 85% 이상을 유지하도록 편집 중심으로 다시 작성하세요. 요약/축약은 금지입니다.";
const SYSTEM_PROMPT = `당신은 상담을 진행한 컨설턴트이며, 상담 종료 후 고객에게 전달할 “자세한 상담 보고서(상세본)”를 작성함.
이 작업은 요약이 아니라 ‘편집(Editing)’이다. transcript의 내용을 최대한 그대로 유지하면서 읽기 좋게 다듬는 것이 목적이다.

[출력 형식]
- 출력은 오직 JSON만 반환함. (설명/코드블록/추가 텍스트 금지)
- 한국어로 작성함.
- 아래 JSON 스키마를 절대 변경하지 않음.

[스키마]
{
  "meta": { "version": 4, "language": "ko" },
  "summary_blocks": [
    { "title": "", "content": "" }
  ],
  "detailed_sections": [
    { "title": "", "content": "" }
  ]
}

────────────────────────────
[절대 원칙: 편집만 / 요약·축약 금지]
────────────────────────────
- 당신은 정보를 ‘줄이거나 압축’하면 안 됨.
- transcript의 내용(사실/질문/답변/근거/수치/대학명/전형/전략/조언/결론/리스크/계획)을 가능한 한 그대로 담아야 함.
- 아래는 즉시 실패(금지):
  1) 여러 문장·문단을 1~2문장으로 압축(요약)
  2) 근거(수치/대학명/전형/조건/리스크)를 삭제하고 결론만 남김
  3) 상담에서 실제로 다룬 논점/질문/의사결정 과정을 생략
  4) “전반적으로/대체로/전체적으로” 같은 표현으로 세부를 대체
  5) 원문에 없는 내용을 추가 생성(환각)

────────────────────────────
[삭제 허용 범위: 아래만 삭제 가능]
────────────────────────────
삭제는 오직 다음 항목에 한해 허용됨(그 외 삭제 금지):
- 인사/의례 멘트(안녕하세요, 들어오세요 등)
- 광고/채널 멘트(구독/좋아요/홍보)
- 의미 없는 추임새(음/어/그/막 등) 및 발화 끊김 표현
- 같은 문장이 연속으로 2회 이상 반복되는 ‘명백한 중복’(단, 내용/근거가 조금이라도 다르면 삭제 금지)

────────────────────────────
[길이 강제 조건: 원문 대비 85% 이상]
────────────────────────────
- detailed_sections의 모든 content를 합친 총 글자 수는, 주어진 transcript 글자 수 대비 최소 85% 이상이어야 함.
  - 예: transcript가 4399자이면 상세 content 합계는 최소 3739자 이상이어야 함.
- 이 조건을 만족하지 못하면 실패로 간주되며, 절대 짧게 쓰지 말 것.
- 길이를 맞추기 위해 같은 말을 반복해서 늘리지 말 것. ‘원문 내용을 보존’하여 길이를 유지할 것.

────────────────────────────
[작업 방식(알고리즘): “원문 보존 편집”]
────────────────────────────
1) 원문 내용을 가능한 한 그대로 유지하되, 문장부호/띄어쓰기/맞춤법만 교정함.
2) 문단을 나누어 읽기 좋게 정렬함.
3) 내용의 주제 전환 지점에서 섹션을 나눔. (섹션 개수는 고정하지 않음)
4) 각 섹션 content는 ‘원문에 가까운 문장들’을 중심으로 구성함.
   - 원문 문장을 재작성해 요약하지 말고, 원문 표현을 다듬는 수준으로 유지함.
   - 원문에 있는 질문-답변 흐름, 수치 나열, 대학/전형 리스트는 보존함.

────────────────────────────
[summary_blocks 규칙(2~3개)]
────────────────────────────
- summary_blocks는 2~3개만 생성한다.
- 요약이더라도 “근거 없는 결론” 금지.
- 각 block은 3~6문장 내외로, 결론 + 핵심 근거(수치/조건/리스크)를 포함한다.
- summary_blocks는 detailed_sections를 줄여 적는 곳이 아니라, ‘상단 안내 요약’임.

────────────────────────────
[detailed_sections 규칙]
────────────────────────────
- 섹션 제목(title)은 주제 라벨이며 고정 목차 금지. 상담 흐름에 맞춰 자유롭게 생성.
- 섹션 content는 원문 대부분이 포함되도록 충분히 길게 작성.
- 숫자/대학명/전형/등급/성적/목표 등은 원문 그대로 보존.
- 원문에 없는 사실은 추가하지 말 것.

[문체]
- 보고서체(“~임/~함/~필요함/~권장함”)로 약하게 정리하되, 원문 의미를 바꾸는 재서술(요약) 금지.
- 가능하면 원문에 가까운 표현을 유지하면서 ‘읽기 좋은 문장’으로만 다듬는다.`;
const USER_PROMPT_TEMPLATE = `아래 상담 transcript를 바탕으로 “자세한 상담 보고서(상세본)” JSON을 생성하라.

중요:
- 요약/축약을 절대 하지 말고, 편집(맞춤법/문장부호/문단 정리/추임새 제거)만 수행하라.
- 삭제는 인사/광고/추임새/명백한 연속 중복만 허용된다.
- detailed_sections의 전체 content 합계 글자 수는 transcript 글자 수의 85% 이상이 되어야 한다.
- 상담에 나온 대학/전형/성적/수치/전략/질문-답변 흐름은 그대로 보존하라.

[Transcript]
{{TRANSCRIPT}}`;
function buildUserPrompt(transcript) {
    return USER_PROMPT_TEMPLATE.replace("{{TRANSCRIPT}}", transcript);
}
function validateReportJson(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    const o = obj;
    const meta = o.meta;
    const version = typeof meta?.version === "number" ? meta.version : null;
    if (!meta || version === null || !ALLOWED_META_VERSIONS.has(version) || meta.language !== "ko")
        return false;
    const summaryBlocks = o.summary_blocks;
    if (!Array.isArray(summaryBlocks) || summaryBlocks.length < 2 || summaryBlocks.length > 3)
        return false;
    for (const block of summaryBlocks) {
        if (!block || typeof block !== "object")
            return false;
        const b = block;
        if (typeof b.title !== "string" || typeof b.content !== "string")
            return false;
    }
    const detailedSections = o.detailed_sections;
    if (!Array.isArray(detailedSections) || detailedSections.length < 2)
        return false;
    for (const section of detailedSections) {
        if (!section || typeof section !== "object")
            return false;
        const s = section;
        if (typeof s.title !== "string" || typeof s.content !== "string")
            return false;
        const content = s.content;
        if (content.length < MIN_DETAILED_SECTION_CONTENT_LENGTH)
            return false;
    }
    return true;
}
function extractDetailedTextAndSectionCount(obj) {
    if (!obj || typeof obj !== "object") {
        return { detailedText: "", detailedSectionsCount: null };
    }
    const o = obj;
    const detailedSections = o.detailed_sections;
    if (Array.isArray(detailedSections)) {
        const sections = detailedSections
            .filter((s) => !!s && typeof s === "object")
            .map((s) => (typeof s.content === "string" ? s.content : ""))
            .filter(Boolean);
        return {
            detailedText: sections.join("\n\n"),
            detailedSectionsCount: detailedSections.length,
        };
    }
    const detailedReport = o.detailed_report;
    if (typeof detailedReport === "string") {
        return { detailedText: detailedReport, detailedSectionsCount: null };
    }
    // v3 호환
    const detailedNotes = o.detailed_notes;
    if (Array.isArray(detailedNotes)) {
        const notes = detailedNotes
            .filter((n) => !!n && typeof n === "object")
            .map((n) => (typeof n.content === "string" ? n.content : ""))
            .filter(Boolean);
        return { detailedText: notes.join("\n\n"), detailedSectionsCount: null };
    }
    return { detailedText: "", detailedSectionsCount: null };
}
function validateCoverageAndLength(transcript, parsed) {
    const transcriptLength = transcript.length;
    const { detailedText, detailedSectionsCount } = extractDetailedTextAndSectionCount(parsed);
    const detailedLength = detailedText.length;
    const coverageRatio = transcriptLength > 0 ? detailedLength / transcriptLength : 0;
    if (transcriptLength <= 0) {
        return {
            ok: false,
            detailedLength,
            transcriptLength,
            coverageRatio,
            failureReason: "empty transcript",
        };
    }
    if (coverageRatio < MIN_COVERAGE_RATIO) {
        return {
            ok: false,
            detailedLength,
            transcriptLength,
            coverageRatio,
            failureReason: `coverage too low (${coverageRatio.toFixed(3)} < ${MIN_COVERAGE_RATIO})`,
        };
    }
    // transcript가 매우 짧은 경우에는 고정 최소 길이 가드 적용하지 않음
    if (transcriptLength >= MIN_DETAILED_TEXT_LENGTH && detailedLength < MIN_DETAILED_TEXT_LENGTH) {
        return {
            ok: false,
            detailedLength,
            transcriptLength,
            coverageRatio,
            failureReason: `detailed text too short (${detailedLength} < ${MIN_DETAILED_TEXT_LENGTH})`,
        };
    }
    if (detailedSectionsCount !== null && detailedSectionsCount < 2) {
        return {
            ok: false,
            detailedLength,
            transcriptLength,
            coverageRatio,
            failureReason: `detailed_sections too few (${detailedSectionsCount} < 2)`,
        };
    }
    return {
        ok: true,
        detailedLength,
        transcriptLength,
        coverageRatio,
        failureReason: null,
    };
}
async function callOpenAI(transcript, extraUserInstruction = "") {
    const userPrompt = buildUserPrompt(transcript);
    const finalUserPrompt = extraUserInstruction
        ? `${userPrompt}\n\n${extraUserInstruction}`
        : userPrompt;
    const responseJsonSchema = {
        name: "report_json_schema",
        strict: true,
        schema: {
            type: "object",
            additionalProperties: false,
            properties: {
                meta: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        version: { type: "number", enum: [2, 4] },
                        language: { type: "string", enum: ["ko"] },
                    },
                    required: ["version", "language"],
                },
                summary_blocks: {
                    type: "array",
                    minItems: 2,
                    maxItems: 3,
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            title: { type: "string" },
                            content: { type: "string" },
                        },
                        required: ["title", "content"],
                    },
                },
                detailed_sections: {
                    type: "array",
                    minItems: 2,
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            title: { type: "string" },
                            content: { type: "string" },
                        },
                        required: ["title", "content"],
                    },
                },
            },
            required: ["meta", "summary_blocks", "detailed_sections"],
        },
    };
    const url = `${OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
    const requestBody = {
        model: OPENAI_MODEL,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: finalUserPrompt },
        ],
        response_format: { type: "json_schema", json_schema: responseJsonSchema },
        temperature: 0.3,
    };
    let res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
    });
    let nonOkBody = null;
    if (!res.ok) {
        let text = await res.text();
        nonOkBody = text;
        if (res.status === 400 &&
            /json_schema|response_format|schema/i.test(text)) {
            console.warn("[report-generator] json_schema response_format rejected, fallback to json_object");
            res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    ...requestBody,
                    response_format: { type: "json_object" },
                }),
            });
            if (res.ok) {
                nonOkBody = null;
            }
            else {
                text = await res.text();
                nonOkBody = text;
            }
        }
    }
    if (!res.ok) {
        const text = nonOkBody ?? "";
        const errSnippet = text.slice(0, 500);
        console.error("[report-generator] OpenAI API error:", "status=", res.status, "body=", errSnippet);
        throw new Error(`OpenAI API ${res.status}: ${errSnippet}`);
    }
    const data = (await res.json());
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
        console.error("[report-generator] OpenAI response missing content, keys=", data ? Object.keys(data) : "null");
        throw new Error("OpenAI response missing content");
    }
    const raw = content.trim().replace(/^```json\s*|\s*```$/g, "");
    try {
        return JSON.parse(raw);
    }
    catch (parseErr) {
        console.error("[report-generator] JSON parse error:", parseErr instanceof Error ? parseErr.message : String(parseErr), "raw length=", raw.length);
        throw parseErr;
    }
}
/**
 * transcript로부터 report_json 생성. 검증 통과 시 스키마 객체 반환.
 * 파싱/검증/길이검증 실패 시 최대 3회 시도.
 */
async function generateReportJson(transcript) {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required");
    }
    const transcriptLength = transcript.length;
    let lastError = null;
    let lastCoverage = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const extraInstruction = attempt > 1 ? RETRY_USER_PROMPT_SUFFIX : "";
        try {
            const parsed = await callOpenAI(transcript, extraInstruction);
            console.log("[report-generator] parsed preview:", JSON.stringify(parsed).slice(0, 800));
            if (!validateReportJson(parsed)) {
                lastError = new Error("schema validation failed");
                console.warn("[report-generator] attempt validation failed:", "attempt=", attempt, "reason=schema validation failed");
            }
            else {
                const coverage = validateCoverageAndLength(transcript, parsed);
                lastCoverage = coverage;
                console.log("[report-generator] attempt metrics:", "attempt=", attempt, "transcriptLen=", coverage.transcriptLength, "detailedLen=", coverage.detailedLength, "coverageRatio=", coverage.coverageRatio.toFixed(3));
                if (coverage.ok) {
                    return parsed;
                }
                lastError = new Error(coverage.failureReason ?? "coverage validation failed");
                console.warn("[report-generator] attempt validation failed:", "attempt=", attempt, "reason=", coverage.failureReason ?? "coverage validation failed");
            }
        }
        catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            console.error("[report-generator] attempt failed:", attempt, lastError.message);
        }
        if (attempt < MAX_ATTEMPTS) {
            console.warn("[report-generator] retry after failure, attempt=", attempt);
        }
    }
    if (lastCoverage) {
        const failureMessage = `report generation too short (coverageRatio=${lastCoverage.coverageRatio.toFixed(3)}, detailedLen=${lastCoverage.detailedLength}, transcriptLen=${lastCoverage.transcriptLength})`;
        console.error("[report-generator] report generation failed:", failureMessage);
        throw new Error(failureMessage);
    }
    const fallbackFailureMessage = `report generation too short (coverageRatio=0.000, detailedLen=0, transcriptLen=${transcriptLength})`;
    const err = lastError ?? new Error(fallbackFailureMessage);
    console.error("[report-generator] report generation failed:", err.message);
    throw err;
}
