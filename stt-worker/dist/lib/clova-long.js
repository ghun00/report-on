"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClovaLongJob = createClovaLongJob;
exports.pollClovaResult = pollClovaResult;
const CLOVA_SECRET_KEY = process.env.CLOVA_SECRET_KEY;
const CLOVA_LONG_ENDPOINT = process.env.CLOVA_LONG_ENDPOINT;
const CLOVA_LONG_STATUS_ENDPOINT = process.env.CLOVA_LONG_STATUS_ENDPOINT;
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 300; // 300 * 2s = 10 min
function logClovaResponse(prefix, status, body) {
    const snippet = body.length > 500 ? body.slice(0, 500) + "..." : body;
    console.log(`[CLOVA] ${prefix} status=${status} body=${snippet}`);
}
/**
 * CLOVA 장문 인식(Object Storage) 작업 생성.
 * dataKey: NCP Object Storage 내 파일 경로 (도메인 '인식 대상 저장 경로' 하위부터).
 * 우리 업로드 경로가 input/{reportId}.wav 이므로, 인식 대상이 input 이면 dataKey = "/{reportId}.wav"
 */
async function createClovaLongJob(dataKey) {
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
    let json;
    try {
        json = JSON.parse(text);
    }
    catch {
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
/**
 * 작업 상태 폴링 후 완료 시 transcript 반환.
 */
async function pollClovaResult(token) {
    if (!CLOVA_SECRET_KEY || !CLOVA_LONG_STATUS_ENDPOINT) {
        console.error("[CLOVA] Missing CLOVA_SECRET_KEY or CLOVA_LONG_STATUS_ENDPOINT");
        return null;
    }
    const statusUrl = CLOVA_LONG_STATUS_ENDPOINT.includes("{{token}}")
        ? CLOVA_LONG_STATUS_ENDPOINT.replace("{{token}}", token)
        : CLOVA_LONG_STATUS_ENDPOINT.includes("?")
            ? `${CLOVA_LONG_STATUS_ENDPOINT}&token=${encodeURIComponent(token)}`
            : `${CLOVA_LONG_STATUS_ENDPOINT}?token=${encodeURIComponent(token)}`;
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
        let json;
        try {
            json = JSON.parse(text);
        }
        catch {
            continue;
        }
        const result = (json?.result ?? "").toUpperCase();
        if (result === "FAILED" || result === "ERROR_TOKEN_INVALID") {
            console.error("[CLOVA] job failed:", json?.message ?? text.slice(0, 200));
            return null;
        }
        if (result === "SUCCEEDED" || result === "COMPLETED") {
            const fullText = json?.text?.trim();
            if (fullText)
                return fullText;
            const segments = json?.segments;
            if (Array.isArray(segments) && segments.length > 0) {
                return segments.map((s) => s?.text ?? "").filter(Boolean).join(" ");
            }
            return "";
        }
        // PROCESSING or else: wait and retry
        await sleep(POLL_INTERVAL_MS);
    }
    console.error("[CLOVA] poll timeout after", POLL_MAX_ATTEMPTS, "attempts");
    return null;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
