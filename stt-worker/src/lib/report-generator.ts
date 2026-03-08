/**
 * LLM(OpenAI)으로 상담 대본에서 report_json 생성.
 * 스키마 v2: meta(version 2) + summary_blocks(2~3) + detailed_sections(2개 이상)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

/** v2 스키마 */
export interface ReportJsonSchemaV2 {
  meta: { version: 2; language: string };
  summary_blocks: Array<{ title: string; content: string }>;
  detailed_sections: Array<{ title: string; content: string }>;
}

const MIN_DETAILED_SECTION_CONTENT_LENGTH = 80;

const SYSTEM_PROMPT = `당신은 상담을 진행한 컨설턴트이며, 상담 종료 후 고객에게 전달할 “자세한 상담 보고서(상세본)”를 작성함.

[출력 형식]
- 출력은 오직 JSON만 반환함. (설명/코드블록/추가 텍스트 금지)
- 한국어로 작성함.
- 아래 JSON 스키마를 절대 변경하지 않음.

[스키마]
{
  "meta": { "version": 2, "language": "ko" },
  "summary_blocks": [
    { "title": "", "content": "" }
  ],
  "detailed_sections": [
    { "title": "", "content": "" }
  ]
}

[핵심 목표]
- 이 상세본의 목표는 “요약”이 아니라 “상담 흐름을 문서화”하는 것임.
- 상담에서 오간 주요 논리/근거/결론이 빠짐없이 포함되어야 함.
- 단, 회의록/속기록 형태(대화체 그대로)로 붙여넣는 것은 금지하며, ‘편집(교정/정리)’만 허용함.

[누락 없는 문서화(정량 기준)]
- transcript의 정보/내용을 85~95% 수준으로 반영해야 함.
- 아래 행위는 요약/축약으로 간주하며 금지:
  1) 여러 문단을 1~2문장으로 묶어 결론만 남기는 것
  2) 근거(숫자/레인지/대학명/전형/조건/리스크)를 생략하고 결론만 남기는 것
  3) 상담 흐름 중 특정 주제(성적/최저/생기부/카드/리스크/다음 계획 등)를 통째로 누락하는 것
- 허용되는 편집 범위(요약이 아님):
  - 맞춤법/띄어쓰기/문장부호 교정
  - 추임새/반복어 제거(예: 음, 어, 그, 막, 아…)
  - 인사/광고/채널 멘트/잡담 제거(예: 구독/좋아요 등)
  - 동일 의미 반복 문장 통합(단, 핵심 정보/근거는 유지)
  - 화자/문단 구분, 소제목 부여

[구조]
- 목차/섹션을 고정하지 않음(컨설턴트마다 상담 유형이 다름).
- 다만 문서가 읽히도록, 상담에서 실제로 다뤄진 흐름 요소(고민/진단/전략/리스크/의사결정/다음 액션)가 자연스럽게 드러나야 함.
- 위 요소 중 상담에서 다뤄진 것은 누락하지 않음.

[문체/톤]
- ‘컨설턴트가 직접 작성하는 보고서’ 톤을 유지함.
- 감정/상황 중계는 최소화하고 입시적 의미/판단/전략 중심으로 서술함.
- 수동태/유체이탈 화법(~로 평가됨/판단됨/권장됨 남발) 금지.
  - “~로 진단함”, “~를 리스크로 봄”, “~를 우선 전략으로 설정함” 등 주도적 서술 사용.
- 종결은 보고서체(“~임/~함/~필요함/~권장함”) 기반.

[summary_blocks 규칙]
- 2~3개만 생성(1개 또는 4개 이상 금지)
- 각 content는 3~6문장 내외
- 결론 + 핵심 근거(수치/조건/리스크)가 반드시 함께 포함

[detailed_sections 규칙]
- 개수 제한 없음(상담 흐름에 따라 유연하게)
- 각 섹션은 title(짧고 명확) + content(충분히 길고 상세)로 구성
- 섹션 title은 상담에서 실제로 논의된 주제를 반영해 자연스럽게 생성
- 각 content는 “편집된 문서화”이며, 상담 내용의 대부분이 포함되도록 작성
- 숫자/레인지/대학명/전형명 등 팩트는 transcript 그대로 보존
- transcript에 없는 사실은 만들지 않음(없으면 ‘상담에서 구체 언급 없음’ 명시)`;

const USER_PROMPT_TEMPLATE = `아래 상담 transcript를 바탕으로 “자세한 상담 보고서(상세본)” JSON을 생성함.
요약 섹션은 summary_blocks 2~3개로만 만들고,
세부 상담 내용은 detailed_sections로 나누어 상담 내용의 대부분이 반영되도록 충분히 상세히 작성함.
목차/섹션을 고정하지 말고 상담 흐름에 맞춰 자연스럽게 구성함.

[Transcript]
{{TRANSCRIPT}}`;

function buildUserPrompt(transcript: string): string {
  return USER_PROMPT_TEMPLATE.replace("{{TRANSCRIPT}}", transcript);
}

function validateReportJson(obj: unknown): obj is ReportJsonSchemaV2 {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;

  const meta = o.meta as Record<string, unknown> | undefined;
  if (!meta || meta.version !== 2 || meta.language !== "ko") return false;

  const summaryBlocks = o.summary_blocks;
  if (!Array.isArray(summaryBlocks) || summaryBlocks.length < 2 || summaryBlocks.length > 3)
    return false;
  for (const block of summaryBlocks) {
    if (!block || typeof block !== "object") return false;
    const b = block as Record<string, unknown>;
    if (typeof b.title !== "string" || typeof b.content !== "string") return false;
  }

  const detailedSections = o.detailed_sections;
  if (!Array.isArray(detailedSections) || detailedSections.length < 2) return false;
  for (const section of detailedSections) {
    if (!section || typeof section !== "object") return false;
    const s = section as Record<string, unknown>;
    if (typeof s.title !== "string" || typeof s.content !== "string") return false;
    const content = s.content as string;
    if (content.length < MIN_DETAILED_SECTION_CONTENT_LENGTH) return false;
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
export async function generateReportJson(transcript: string): Promise<ReportJsonSchemaV2> {
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
