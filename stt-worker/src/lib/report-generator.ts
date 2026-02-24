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

const SYSTEM_PROMPT = `당신은 입시 컨설턴트이며, 상담 종료 후 “컨설턴트가 직접 작성하는” 전문 상담보고서를 작성함.
반드시 아래 규칙을 준수함.

[출력 형식]
- 출력은 오직 JSON만 반환함. (설명/코드블록/추가 텍스트 금지)
- 한국어로 작성함. 아래 스키마를 절대 변경하지 않음.

[사실성/환각 방지]
- transcript에 없는 사실/수치/학교/등급/기간/인물 정보를 임의로 만들지 않음.
- 불충분한 정보는 “상담에서 구체 언급 없음” 또는 “추정 불가함”으로 명시함.
- 추정이 필요한 경우 “추정임”을 명시함.

[문체/관점(핵심)]
- 문체는 ‘컨설턴트 진단서’ 톤으로 작성함.
- 감정/대화 흐름/현장 상황을 중계하지 않음. (예: 아쉬움, 만족, 표현함, 느꼈음, 말했다 등 금지)
- 수동태/유체이탈 화법을 금지함. (예: ~로 평가됨/판단됨/권장됨/확인됨 남발 금지)
- 능동형 전문가 서술로 작성함. 다음 동사를 우선 사용함:
  - “~로 진단함”, “~로 규정함”, “리스크로 판단함”, “우선순위를 설정함”, “전략을 수립함”, “타겟팅함”, “제외함/배제함”, “보완 과제로 설정함”
- 주어는 ‘학생은’ 반복을 피하고, 가능하면 ‘전략/리스크/지원 조건/성적 지표/반영 구조’ 중심으로 서술함.
  - 단, 사실 전달이 필요할 때만 ‘학생’ 표현을 사용함.

[구성 원칙]
- detailed_notes는 요약이 아니라, 흩어진 transcript를 “입시 및 관리의 의사결정 관점”으로 재구성함.
- detailed_notes 소주제(title)는 최대 5개(1~5개)로 제한함.
- executive_summary.solutions는 정확히 3개로 고정함.
- solutions는 실행 가능한 처방 형태로 작성함(“~필요함/~권장함/~로 수립함” 형태).
- 문장 종결은 원칙적으로 “~임/~함/~필요함/~권장함/~로 수립함”을 사용함. (~다/이다 최소화)`;

const USER_PROMPT_TEMPLATE = `아래 상담 transcript를 바탕으로 “입시 컨설턴트 진단서”를 생성함.

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
- 상담에서 언급된 성적/지원 조건을 “입시적 의미”로 해석하여 진단함.
- 감정/대화 상황 묘사 금지임. (아쉬움/만족/표현 등 금지)
- 수치가 언급되면 ‘지원 전략에 주는 영향’까지 연결함.
- 언급되지 않은 수치/정보는 만들지 말고 “상담에서 구체 언급 없음/추정 불가함”으로 처리함.

2) executive_summary
- position: “현재 포지션을 입시 의사결정 관점으로” 1~2문장 진단함.
  - 예: “영어 2등급은 특정 대학군에서 감점 리스크로 작동함. 정시축을 확보하되 상향 지원은 조건부로 설계함.” 같은 방식
- solutions: 정확히 3개 처방을 제시함.
  - 각 솔루션은 ‘행동+판단기준/조건’이 포함된 처방문으로 작성함.
  - 종결은 보고서체(필요함/권장함/~로 수립함/~로 타겟팅함)로 작성함.

3) detailed_notes (중요)
- 소주제 최대 5개로 제한함. (최대이기 때문에 문맥상 소주제가 적다면 적은 형태로 적용. 너무 흩어지지 않도록 조절)
- 요약 금지임. 다만 “회의록처럼 대화 재현”은 금지임.
- 상담에서 나온 내용을 “입시 판단 포인트(유불리/리스크/조건/대안/카드 구성)” 기준으로 재구성하여 구체적으로 적용해야함.
- 다음을 우선 포함함:
  - 지원 가능/불가 판단의 근거
  - 리스크 요인(감점, 반영비, 변표 등)과 대응
  - 지원 카드 조합(상향/적정/안정) 또는 제외 전략
  - 확인해야 할 추가 변수(추정 불가한 부분은 ‘추정 불가함’으로 명시)
  - 학생 관리 관련 조언
- 중요: 요약이 아닌, 문맥상 내용을 가져오는 형태로 해야함. 단순 요약은 금지.
- 금지: 감정/상담장 분위기/대화 흐름 묘사, “학생은 ~했다” 반복, “~로 평가됨/권장됨” 남발, 단순 요약은 금지

[문체 예시(진단서 톤)]
- “영어 2등급은 연세대 라인에서 감점 리스크로 작동함.”
- “서강대 사회과학부는 적정 카드로 배치함.”
- “성균관대는 우선 제외 전략으로 설정함.”
- “변환표준점수 확인 전까지 최종 원서 조합은 확정 불가함.”

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
