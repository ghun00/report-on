/**
 * LLM(OpenAI)으로 상담 대본에서 report_json 생성.
 * 스키마: meta(version3, language ko) + status_analysis + executive_summary(3 solutions) + detailed_notes(1~5)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

export interface ReportJsonSchema {
  meta: { version: number; language: string };
  status_analysis: { content: string };
  executive_summary: { position: string; solutions: [string, string, string] };
  detailed_notes: Array<{ title: string; content: string }>;
}

const SYSTEM_PROMPT = `당신은 입시 컨설팅 상담 transcript를 전문 “상담 보고서”로 작성하는 작성자임.
반드시 아래 규칙을 준수함.

[출력 형식]
- 출력은 오직 JSON만 반환함. (설명/코드블록/여는말/닫는말/추가 텍스트 금지)
- 한국어로 작성함.
- 아래 스키마를 절대 변경하지 않음.

[사실성/환각 방지]
- transcript에 없는 사실/수치/학교/등급/기간/인물 정보를 임의로 만들지 않음.
- 정보가 불충분하면 “상담에서 구체 언급 없음” 또는 “추정 불가”로 명시함.
- 추정이 필요한 경우 “추정임”을 문장 내에 명시함.

[문체(필수)]
- 문체는 ‘보고서체’로 작성함.
- 문장 종결은 원칙적으로 “~임”, “~함”, “~됨”, “~필요함”, “~권장함”, “~확인됨”, “~추정됨” 형태를 사용함.
- “~다/이다” 형태 서술은 최소화함(불가피할 때만 제한적으로 사용함).
- 구어체/대화체/감탄/추임새/친근한 말투를 금지함. (예: ~같아요, ~거든요, ~했어요 금지)
- ‘~다가’ 문장 구조를 사용하지 않음.

[구성 원칙]
- detailed_notes는 “요약”이 아니라, 흩어진 transcript를 문맥으로 엮어 소주제별로 충분히 상세히 정리함.
- detailed_notes 소주제(title)는 최대 5개(1~5개)로 제한함.
- executive_summary.solutions는 정확히 3개로 고정함.
- solutions는 행동 중심으로 작성하되, 각 항목의 종결도 보고서체로 맞춤(예: “~필요함/권장함”).`;

const USER_PROMPT_TEMPLATE = `아래 상담 transcript를 바탕으로 “상담 보고서”를 생성함.

[출력 JSON 스키마]
{
  "meta": { "version": 3, "language": "ko" },
  "status_analysis": { "content": "" },
  "executive_summary": {
    "position": "",
    "solutions": ["", "", ""]
  },
  "detailed_notes": [
    { "title": "", "content": "" }
  ]
}

[작성 가이드]
1) status_analysis.content
- 현재 상황을 상담에서 언급된 근거를 바탕으로 진단하여 보고서체 문단으로 작성함.
- 내신/모의/비교과/학습 루틴 등이 언급되면 포함함.
- 언급되지 않은 객관 수치는 임의로 만들지 않으며 “상담에서 구체 언급 없음/추정 불가”로 처리함.

2) executive_summary
- position: 1~2문장으로 핵심 포지션 진단을 보고서체로 작성함.
- solutions: 정확히 3개 작성함.
  - 행동 중심, 우선순위/조건이 있으면 포함함.
  - 각 문장은 보고서체 종결(“~필요함/권장함/확인됨/추정됨”)로 마무리함.

3) detailed_notes (중요)
- 요약 금지임. transcript의 흩어진 내용을 문맥으로 엮어 “상세 상담 내용”을 구성함.
- 소주제(title)는 최대 5개로 제한함.
- 각 content는 길이 제한 없이 충분히 상세히 작성함.
- 불릿 남발은 피하고, 필요할 때만 문단 구분으로 가독성을 확보함.
- transcript에 없는 사실은 만들지 않음. 불확실하면 “추정임”을 명시함.

[문체 예시(보고서체)]
- “본 상담의 핵심 목적은 지원 전략 재정립임.”
- “학생 내신은 2.7로 언급됨. 영어 성적 개선이 우선 과제임.”
- “정시 대비 학습 루틴 고정이 필요함.”
- “현재 정보만으로는 비교과의 정량 평가는 추정 불가함.”

[Transcript]
{{TRANSCRIPT}}`;

function buildUserPrompt(transcript: string): string {
  return USER_PROMPT_TEMPLATE.replace("{{TRANSCRIPT}}", transcript);
}

function validateReportJson(obj: unknown): obj is ReportJsonSchema {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;

  const meta = o.meta as Record<string, unknown> | undefined;
  if (!meta || meta.version !== 3 || meta.language !== "ko") return false;

  const statusAnalysis = o.status_analysis as Record<string, unknown> | undefined;
  if (!statusAnalysis || typeof statusAnalysis.content !== "string") return false;

  const execSummary = o.executive_summary as Record<string, unknown> | undefined;
  if (!execSummary || typeof execSummary.position !== "string") return false;
  const solutions = execSummary.solutions;
  if (!Array.isArray(solutions) || solutions.length !== 3) return false;
  if (solutions.some((s) => typeof s !== "string")) return false;

  const detailedNotes = o.detailed_notes;
  if (!Array.isArray(detailedNotes) || detailedNotes.length < 1 || detailedNotes.length > 5)
    return false;
  for (const note of detailedNotes) {
    if (!note || typeof note !== "object") return false;
    const n = note as Record<string, unknown>;
    if (typeof n.title !== "string" || typeof n.content !== "string") return false;
  }

  return true;
}

async function callOpenAI(transcript: string): Promise<unknown> {
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

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    console.error("[report-generator] OpenAI response missing content, keys=", data ? Object.keys(data) : "null");
    throw new Error("OpenAI response missing content");
  }

  const raw = content.trim().replace(/^```json\s*|\s*```$/g, "");
  try {
    return JSON.parse(raw) as unknown;
  } catch (parseErr) {
    console.error("[report-generator] JSON parse error:", parseErr instanceof Error ? parseErr.message : String(parseErr), "raw length=", raw.length);
    throw parseErr;
  }
}

/**
 * transcript로부터 report_json 생성. 검증 통과 시 스키마 객체 반환.
 * 파싱/검증 실패 시 1회 재시도(총 2회).
 */
export async function generateReportJson(transcript: string): Promise<ReportJsonSchema> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required");
  }

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const parsed = await callOpenAI(transcript);
      if (validateReportJson(parsed)) {
        return parsed;
      }
      lastError = new Error("Schema validation failed");
      console.warn("[report-generator] schema validation failed, attempt=", attempt);
    } catch (e) {
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
