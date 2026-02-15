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
const ncp_storage_1 = require("./ncp-storage");
const clova_long_1 = require("./clova-long");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const DELETE_NCP_AFTER_SUCCESS = process.env.DELETE_NCP_AFTER_SUCCESS !== "false";
function getAudioStoragePath(reportId) {
    return `reports/${reportId}/raw.webm`;
}
/**
 * 1) reports row 조회
 * 2) Supabase Storage에서 오디오 다운로드
 * 3) ffmpeg로 wav 16k mono 변환
 * 4) NCP Object Storage에 wav 업로드 (input/{reportId}.wav)
 * 5) CLOVA 장문 인식 작업 생성 → 폴링으로 완료 대기 → transcript 추출
 * 6) reports 업데이트 (transcript, status='done'; 선택 시 ncp_object_key, stt_job_id)
 * 7) (옵션) NCP input 파일 삭제
 * 8) 임시 파일 삭제
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
            const msg = fetchError?.message ?? "Report not found";
            console.error("[processReport]", reportId, "fetch error:", msg);
            await updateReportFailed(reportId, `report fetch: ${msg}`);
            return;
        }
        const storagePath = row.audio_path || getAudioStoragePath(reportId);
        const { data: fileData, error: downloadError } = await supabase_1.supabase.storage
            .from(supabase_1.STORAGE_BUCKET)
            .download(storagePath);
        if (downloadError || !fileData) {
            const msg = downloadError?.message ?? "Download failed";
            console.error("[processReport]", reportId, "download error:", msg);
            await updateReportFailed(reportId, `storage download: ${msg}`);
            return;
        }
        console.log("[processReport]", reportId, "download ok");
        await promises_1.default.writeFile(rawPath, Buffer.from(await fileData.arrayBuffer()));
        await convertToWav(rawPath, wavPath);
        console.log("[processReport]", reportId, "ffmpeg ok");
        const wavBuffer = await promises_1.default.readFile(wavPath);
        await (0, ncp_storage_1.uploadWavToNcp)(reportId, wavBuffer);
        console.log("[processReport]", reportId, "upload ncp ok");
        const ncpKey = (0, ncp_storage_1.getNcpObjectKey)(reportId);
        const dataKey = ncpKey.startsWith("input/") ? `/${reportId}.wav` : ncpKey;
        const job = await (0, clova_long_1.createClovaLongJob)(dataKey);
        if (!job) {
            await updateReportFailed(reportId, "CLOVA create job failed");
            return;
        }
        console.log("[processReport]", reportId, "job created token=", job.token.slice(0, 12) + "...");
        const transcript = await (0, clova_long_1.pollClovaResult)(job.token);
        if (transcript === null) {
            await updateReportFailed(reportId, "CLOVA polling failed or timeout");
            return;
        }
        console.log("[processReport]", reportId, "polling done, transcript length=", transcript.length);
        const updatePayload = {
            transcript,
            status: "done",
            error_message: null,
        };
        try {
            const { error: updateError } = await supabase_1.supabase
                .from("reports")
                .update(updatePayload)
                .eq("id", reportId);
            if (updateError) {
                console.error("[processReport] update done error:", updateError);
                await updateReportFailed(reportId, updateError.message);
                return;
            }
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await updateReportFailed(reportId, `db update: ${msg}`);
            return;
        }
        if (DELETE_NCP_AFTER_SUCCESS) {
            try {
                await (0, ncp_storage_1.deleteNcpObject)(reportId);
                console.log("[processReport]", reportId, "ncp object deleted");
            }
            catch (e) {
                console.warn("[processReport] ncp delete failed (non-fatal):", e);
            }
        }
        console.log("[processReport]", reportId, "done");
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[processReport]", reportId, "error:", err);
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
