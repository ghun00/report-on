"use strict";
/**
 * LLM(OpenAI)으로 상담 대본에서 report_json 생성.
 * 스키마: meta(version3, language ko) + status_analysis + executive_summary(3 solutions) + detailed_notes(1~5)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReportJson = generateReportJson;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const SYSTEM_PROMPT = `You are a counselor report writer. Output only valid JSON, no markdown or explanation.
Schema (strict):
{
  "meta": { "version": 3, "language": "ko" },
  "status_analysis": { "content": "<상담 대상의 현재 상태/맥락 요약, 한글 문자열>" },
  "executive_summary": {
    "position": "<한 문단 요약, 한글>",
    "solutions": ["<해결 방안 1, 한글>", "<해결 방안 2, 한글>", "<해결 방안 3, 한글>"]
  },
  "detailed_notes": [
    { "title": "<소제목>", "content": "<내용>" }
  ]
}
Rules:
- detailed_notes must have between 1 and 5 items.
- Output only the JSON object, no code block or extra text.`;
const USER_PROMPT_TEMPLATE = `Generate a counseling report from the following transcript. Output only the JSON object.

Transcript:
{{TRANSCRIPT}}`;
function buildUserPrompt(transcript) {
    return USER_PROMPT_TEMPLATE.replace("{{TRANSCRIPT}}", transcript);
}
function validateReportJson(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    const o = obj;
    const meta = o.meta;
    if (!meta || meta.version !== 3 || meta.language !== "ko")
        return false;
    const statusAnalysis = o.status_analysis;
    if (!statusAnalysis || typeof statusAnalysis.content !== "string")
        return false;
    const execSummary = o.executive_summary;
    if (!execSummary || typeof execSummary.position !== "string")
        return false;
    const solutions = execSummary.solutions;
    if (!Array.isArray(solutions) || solutions.length !== 3)
        return false;
    if (solutions.some((s) => typeof s !== "string"))
        return false;
    const detailedNotes = o.detailed_notes;
    if (!Array.isArray(detailedNotes) || detailedNotes.length < 1 || detailedNotes.length > 5)
        return false;
    for (const note of detailedNotes) {
        if (!note || typeof note !== "object")
            return false;
        const n = note;
        if (typeof n.title !== "string" || typeof n.content !== "string")
            return false;
    }
    return true;
}
async function callOpenAI(transcript) {
    const url = `${OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: buildUserPrompt(transcript) },
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
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
 * 파싱/검증 실패 시 1회 재시도(총 2회).
 */
async function generateReportJson(transcript) {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required");
    }
    let lastError = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const parsed = await callOpenAI(transcript);
            if (validateReportJson(parsed)) {
                return parsed;
            }
            lastError = new Error("Schema validation failed");
            console.warn("[report-generator] schema validation failed, attempt=", attempt);
        }
        catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            console.error("[report-generator] attempt failed:", attempt, lastError.message);
        }
        if (attempt < 2) {
            console.warn("[report-generator] retry after failure, attempt=", attempt);
        }
    }
    const err = lastError ?? new Error("report generation failed");
    console.error("[report-generator] report generation failed:", err.message);
    throw err;
}
