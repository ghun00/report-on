const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const OPENAI_MODEL_REWRITE =
  process.env.OPENAI_MODEL_REWRITE ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_TEMPERATURE_REWRITE = Number.parseFloat(
  process.env.OPENAI_TEMPERATURE_REWRITE ?? "0.2"
);

const SYSTEM_PROMPT_REWRITE = `당신은 상담 기록을 보고서체로 편집하는 문서화 편집자임.
목표는 문체 변환이지 요약이 아님.

[절대 금지]
1) 요약/축약/재구성/결론만 남기기
2) 근거 삭제(숫자/대학명/등급/전형/조건/리스크/조언)
3) 원문에 없는 내용 추가(환각)
4) "전반적으로/대체로" 같은 뭉뚱그림으로 대체

[반드시 수행]
- 맞춤법/띄어쓰기/문장부호 교정
- 대화체를 보고서체("~임/~함/~필요함/~권장함")로 변환
- 출력 길이는 입력의 최소 90% 이상 유지

출력은 리라이트된 텍스트만 반환한다(JSON 금지).`;

const USER_PROMPT_TEMPLATE_REWRITE = `아래 섹션 텍스트를 보고서 문체로 리라이트하라.
중요:
- 요약/축약/재구성 금지
- 숫자/대학명/등급/전형/조건/리스크/조언 삭제 금지
- 입력 길이의 90% 이상 유지
- 출력은 리라이트 텍스트만

[SECTION_TEXT]
{{SECTION_TEXT}}`;

function buildRewriteUserPrompt(sectionText: string, enforceLength = false): string {
  const base = USER_PROMPT_TEMPLATE_REWRITE.replace("{{SECTION_TEXT}}", sectionText);
  if (!enforceLength) return base;
  return `이전 결과가 너무 짧았습니다. 요약/축약 없이 원문 길이의 90% 이상을 유지하세요.\n\n${base}`;
}

async function callRewriteLLM(sectionText: string, enforceLength = false): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required");
  }

  const url = `${OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL_REWRITE,
      messages: [
        { role: "system", content: SYSTEM_PROMPT_REWRITE },
        { role: "user", content: buildRewriteUserPrompt(sectionText, enforceLength) },
      ],
      temperature: Number.isFinite(OPENAI_TEMPERATURE_REWRITE) ? OPENAI_TEMPERATURE_REWRITE : 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`rewrite API ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("rewrite response missing content");
  }
  return content.trim().replace(/^```[\w-]*\s*|\s*```$/g, "");
}

export async function rewriteSectionToReportTone(
  sectionText: string,
  opts?: { maxRetries?: number; minRatio?: number }
): Promise<{ text: string; ratio: number; attempts: number; usedFallback: boolean }> {
  const maxRetries = opts?.maxRetries ?? 2;
  const minRatio = opts?.minRatio ?? 0.9;
  const originalLen = sectionText.length;
  const hasDigitsOriginal = /[0-9]/.test(sectionText);

  let attempts = 0;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    attempts = attempt;
    try {
      const rewritten = await callRewriteLLM(sectionText, attempt > 1);
      const rewrittenLen = rewritten.length;
      const ratio = originalLen > 0 ? rewrittenLen / originalLen : 0;
      const hasDigitsRewritten = /[0-9]/.test(rewritten);

      console.log("[section-rewriter] attempt metrics", {
        attempt,
        originalLen,
        rewrittenLen,
        ratio: Number(ratio.toFixed(3)),
        hasDigitsOriginal,
        hasDigitsRewritten,
      });

      const digitCheckPassed = !hasDigitsOriginal || hasDigitsRewritten;
      if (ratio >= minRatio && digitCheckPassed) {
        return { text: rewritten, ratio, attempts, usedFallback: false };
      }
    } catch (e) {
      console.warn(
        "[section-rewriter] attempt failed:",
        "attempt=",
        attempt,
        "reason=",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  return { text: sectionText, ratio: 1, attempts, usedFallback: true };
}
