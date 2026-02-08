"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReport = processReport;
const child_process_1 = require("child_process");
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const supabase_1 = require("./supabase");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const CLOVA_ENDPOINT = process.env.CLOVA_ENDPOINT;
const CLOVA_CLIENT_ID = process.env.CLOVA_CLIENT_ID ?? process.env.CLOVA_API_KEY;
const CLOVA_CLIENT_SECRET = process.env.CLOVA_CLIENT_SECRET ?? process.env.CLOVA_API_KEY;
function getAudioStoragePath(reportId) {
    return `reports/${reportId}/raw.webm`;
}
/**
 * 1) reports row 조회
 * 2) Storage에서 오디오 다운로드 (audio_path 우선, 없으면 reports/{reportId}/raw.webm)
 * 3) 임시 파일로 저장
 * 4) ffmpeg로 wav 16k mono 변환
 * 5) CLOVA Speech STT 호출
 * 6) reports 업데이트: transcript, status='done' / 실패 시 status='failed', error_message
 * 7) 임시 파일 삭제
 */
async function processReport(reportId) {
    const tmpDir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), "stt-"));
    const rawPath = path_1.default.join(tmpDir, "raw.webm");
    const wavPath = path_1.default.join(tmpDir, "out.wav");
    try {
        const { data: row, error: fetchError } = await supabase_1.supabase
            .from("reports")
            .select("id, audio_path, status")
            .eq("id", reportId)
            .single();
        if (fetchError || !row) {
            await updateReportFailed(reportId, fetchError?.message ?? "Report not found");
            return;
        }
        const storagePath = row.audio_path || getAudioStoragePath(reportId);
        const { data: fileData, error: downloadError } = await supabase_1.supabase.storage
            .from(supabase_1.STORAGE_BUCKET)
            .download(storagePath);
        if (downloadError || !fileData) {
            await updateReportFailed(reportId, downloadError?.message ?? "Download failed");
            return;
        }
        await promises_1.default.writeFile(rawPath, Buffer.from(await fileData.arrayBuffer()));
        await convertToWav(rawPath, wavPath);
        const transcript = await callClovaStt(wavPath);
        if (transcript === null) {
            await updateReportFailed(reportId, "CLOVA STT failed or returned no text");
            return;
        }
        const { error: updateError } = await supabase_1.supabase
            .from("reports")
            .update({
            transcript,
            status: "done",
            error_message: null,
        })
            .eq("id", reportId);
        if (updateError) {
            console.error("[processReport] update done error:", updateError);
            await updateReportFailed(reportId, updateError.message);
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[processReport]", reportId, err);
        await updateReportFailed(reportId, message);
    }
    finally {
        await safeUnlink(rawPath);
        await safeUnlink(wavPath);
        await promises_1.default.rm(tmpDir, { recursive: true, force: true });
    }
}
async function convertToWav(rawPath, wavPath) {
    await execFileAsync("ffmpeg", [
        "-y",
        "-i", rawPath,
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        wavPath,
    ]);
}
async function callClovaStt(wavPath) {
    if (!CLOVA_ENDPOINT || !CLOVA_CLIENT_ID || !CLOVA_CLIENT_SECRET) {
        console.error("[CLOVA] Missing CLOVA_ENDPOINT or CLOVA_CLIENT_ID/CLOVA_CLIENT_SECRET");
        return null;
    }
    const url = `${CLOVA_ENDPOINT}${CLOVA_ENDPOINT.includes("?") ? "&" : "?"}lang=Kor`;
    const body = await promises_1.default.readFile(wavPath);
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "X-NCP-APIGW-API-KEY-ID": CLOVA_CLIENT_ID,
            "X-NCP-APIGW-API-KEY": CLOVA_CLIENT_SECRET,
        },
        body,
    });
    if (!res.ok) {
        const text = await res.text();
        console.error("[CLOVA] STT error:", res.status, text);
        return null;
    }
    const json = (await res.json());
    const text = json?.text?.trim();
    return text ?? null;
}
async function updateReportFailed(reportId, errorMessage) {
    const { error } = await supabase_1.supabase
        .from("reports")
        .update({
        status: "failed",
        error_message: errorMessage,
    })
        .eq("id", reportId);
    if (error) {
        console.error("[processReport] update failed error:", error);
    }
}
async function safeUnlink(p) {
    try {
        await promises_1.default.unlink(p);
    }
    catch {
        // ignore
    }
}
