import { getResultKey, getObjectFromNcp } from "./ncp-storage";

const CLOVA_SECRET_KEY = process.env.CLOVA_SECRET_KEY;
const CLOVA_LONG_ENDPOINT = process.env.CLOVA_LONG_ENDPOINT;
const CLOVA_LONG_STATUS_ENDPOINT = process.env.CLOVA_LONG_STATUS_ENDPOINT;

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 300; // 300 * 2s = 10 min

interface CreateJobResponse {
  token?: string;
  result?: string;
  message?: string;
}

interface Segment {
  text?: string;
}

interface StatusResponse {
  result?: string;
  message?: string;
  text?: string;
  segments?: Segment[];
  [key: string]: unknown;
}

export interface PollResult {
  transcript: string;
  resultKey: string;
}

function logClovaResponse(prefix: string, status: number, body: string): void {
  const snippet = body.length > 500 ? body.slice(0, 500) + "..." : body;
  console.log(`[CLOVA] ${prefix} status=${status} body=${snippet}`);
}

/**
 * CLOVA 장문 인식(Object Storage) 작업 생성.
 * dataKey: NCP Object Storage 내 파일 경로 (도메인 '인식 대상 저장 경로' 하위부터).
 * 우리 업로드 경로가 input/{reportId}.wav 이므로, 인식 대상이 input 이면 dataKey = "/{reportId}.wav"
 */
export async function createClovaLongJob(
  dataKey: string
): Promise<{ token: string } | null> {
  if (!CLOVA_SECRET_KEY || !CLOVA_LONG_ENDPOINT) {
    console.error("[CLOVA] Missing CLOVA_SECRET_KEY or CLOVA_LONG_ENDPOINT");
    return null;
  }

  const body = JSON.stringify({
    dataKey,
    language: "ko-KR",
    completion: "async",
    resultToObs: true,
    fullText: true,
  });

  const res = await fetch(CLOVA_LONG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;UTF-8",
      "X-CLOVASPEECH-API-KEY": CLOVA_SECRET_KEY,
    },
    body,
  });

  const text = await res.text();
  logClovaResponse("createJob", res.status, text);

  if (!res.ok) {
    console.error("[CLOVA] createJob failed:", text);
    return null;
  }

  let json: CreateJobResponse;
  try {
    json = JSON.parse(text) as CreateJobResponse;
  } catch {
    console.error("[CLOVA] createJob invalid JSON:", text.slice(0, 200));
    return null;
  }

  const token = json?.token?.trim();
  if (!token) {
    console.error("[CLOVA] createJob no token in response:", text.slice(0, 300));
    return null;
  }
  return { token };
}

/** 결과 JSON에서 transcript 추출: text 우선, 없으면 segments[].text join */
function extractTranscriptFromResultJson(json: { text?: string; segments?: Segment[] }): string {
  const text = json?.text?.trim();
  if (text) return text;
  const segments = json?.segments;
  if (Array.isArray(segments) && segments.length > 0) {
    return segments.map((s) => s?.text ?? "").filter(Boolean).join(" ");
  }
  return "";
}

/**
 * 작업 상태 폴링 후 COMPLETED 시 NCP에서 결과 JSON 다운로드해 transcript 반환.
 * result key 규칙: {NCP_STT_RESULT_PREFIX}/{reportId}.wav_{token}.json
 */
export async function pollClovaResult(reportId: string, token: string): Promise<PollResult | null> {
  if (!CLOVA_SECRET_KEY || !CLOVA_LONG_STATUS_ENDPOINT) {
    console.error("[CLOVA] Missing CLOVA_SECRET_KEY or CLOVA_LONG_STATUS_ENDPOINT");
    return null;
  }

  const statusUrl = `${CLOVA_LONG_STATUS_ENDPOINT.replace(/\/$/, "")}/${token}`;
  console.log("[CLOVA] poll URL:", statusUrl);

  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const res = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "X-CLOVASPEECH-API-KEY": CLOVA_SECRET_KEY,
      },
    });

    const text = await res.text();
    if (attempt % 10 === 0 || res.status !== 200) {
      logClovaResponse(`poll#${attempt}`, res.status, text);
    }

    if (!res.ok) {
      console.error("[CLOVA] poll error:", res.status, text.slice(0, 300));
      return null;
    }

    let json: StatusResponse;
    try {
      json = JSON.parse(text) as StatusResponse;
    } catch {
      continue;
    }

    const result = (json?.result ?? "").toUpperCase();
    if (result === "FAILED" || result === "ERROR_TOKEN_INVALID") {
      console.error("[CLOVA] job failed:", json?.message ?? text.slice(0, 200));
      return null;
    }
    if (result === "SUCCEEDED" || result === "COMPLETED") {
      const resultKey = getResultKey(reportId, token);
      console.log("[CLOVA] resultKey=" + resultKey);

      let resultJsonStr: string;
      try {
        resultJsonStr = await getObjectFromNcp(resultKey);
      } catch (e) {
        console.error("[CLOVA] getObjectFromNcp failed:", e);
        return null;
      }

      const resultJsonSnippet = resultJsonStr.slice(0, 1000);
      console.log("[CLOVA] result JSON (first 1000):", resultJsonSnippet + (resultJsonStr.length > 1000 ? "..." : ""));

      let resultJson: { text?: string; segments?: Segment[] };
      try {
        resultJson = JSON.parse(resultJsonStr) as { text?: string; segments?: Segment[] };
      } catch {
        console.error("[CLOVA] result JSON parse failed:", resultJsonStr.slice(0, 300));
        return null;
      }

      const transcript = extractTranscriptFromResultJson(resultJson);
      console.log("[CLOVA] transcript length=" + transcript.length);
      return { transcript, resultKey };
    }
    await sleep(POLL_INTERVAL_MS);
  }

  console.error("[CLOVA] poll timeout after", POLL_MAX_ATTEMPTS, "attempts");
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
