import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { supabase, STORAGE_BUCKET } from "./supabase";
import {
  uploadWavToNcp,
  deleteNcpObject,
  getClovaDataKey,
  deleteNcpResultKey,
} from "./ncp-storage";
import { createClovaLongJob, pollClovaResult } from "./clova-long";
import { generateReportJson } from "./report-generator";

const execFileAsync = promisify(execFile);

const DELETE_NCP_AFTER_SUCCESS = process.env.DELETE_NCP_AFTER_SUCCESS !== "false";
const DELETE_NCP_RESULT_AFTER_SUCCESS = process.env.DELETE_NCP_RESULT_AFTER_SUCCESS === "true";

function getAudioStoragePath(reportId: string): string {
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
export async function processReport(reportId: string): Promise<void> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "stt-"));
  const rawPath = path.join(tmpDir, "raw.webm");
  const wavPath = path.join(tmpDir, "out.wav");

  try {
    const { data: row, error: fetchError } = await supabase
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

    const storagePath = (row.audio_path as string) || getAudioStoragePath(reportId);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !fileData) {
      const msg = downloadError?.message ?? "Download failed";
      console.error("[processReport]", reportId, "download error:", msg);
      await updateReportFailed(reportId, `storage download: ${msg}`);
      return;
    }
    console.log("[processReport]", reportId, "download ok");

    await fs.writeFile(rawPath, Buffer.from(await fileData.arrayBuffer()));

    await convertToWav(rawPath, wavPath);
    console.log("[processReport]", reportId, "ffmpeg ok");

    const wavBuffer = await fs.readFile(wavPath);
    await uploadWavToNcp(reportId, wavBuffer);
    console.log("[processReport]", reportId, "upload ncp ok");

    const dataKey = getClovaDataKey(reportId);
    const job = await createClovaLongJob(dataKey);
    if (!job) {
      await updateReportFailed(reportId, "CLOVA create job failed");
      return;
    }
    console.log("[processReport]", reportId, "job created token=", job.token.slice(0, 12) + "...");

    const pollResult = await pollClovaResult(reportId, job.token);
    if (pollResult === null) {
      await updateReportFailed(reportId, "CLOVA polling failed or timeout");
      return;
    }
    const { transcript, resultKey } = pollResult;
    console.log("[processReport]", reportId, "resultKey=", resultKey, "transcript length=", transcript.length);

    const updatePayload: Record<string, unknown> = {
      transcript,
      status: "done",
      error_message: null,
    };
    try {
      const { error: updateError } = await supabase
        .from("reports")
        .update(updatePayload)
        .eq("id", reportId);

      if (updateError) {
        console.error("[processReport] update done error:", updateError);
        await updateReportFailed(reportId, updateError.message);
        return;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await updateReportFailed(reportId, `db update: ${msg}`);
      return;
    }

    // report_json 생성 (transcript 200자 미만이면 스킵)
    if (transcript.length < 200) {
      console.log("[processReport]", reportId, "report generation skipped (transcript length < 200)");
      const { error: skipError } = await supabase
        .from("reports")
        .update({
          report_json: null,
          error_message: "transcript too short for report generation",
        })
        .eq("id", reportId);
      if (skipError) console.error("[processReport] update report_json skip error:", skipError);
    } else {
      try {
        const reportJson = await generateReportJson(transcript);
        const { error: reportUpdateError } = await supabase
          .from("reports")
          .update({
            report_json: reportJson,
            error_message: null,
          })
          .eq("id", reportId);
        if (reportUpdateError) {
          console.error("[processReport]", reportId, "report_json update error:", reportUpdateError);
          await supabase
            .from("reports")
            .update({
              error_message: `report save failed: ${reportUpdateError.message}`,
            })
            .eq("id", reportId);
        } else {
          console.log("[processReport]", reportId, "report_json generated and saved");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[processReport]", reportId, "report generation failed:", msg);
        await supabase
          .from("reports")
          .update({
            report_json: null,
            error_message: `report generation failed: ${msg.slice(0, 200)}`,
          })
          .eq("id", reportId);
      }
    }

    if (DELETE_NCP_AFTER_SUCCESS) {
      try {
        await deleteNcpObject(reportId);
        console.log("[processReport]", reportId, "ncp input wav deleted");
      } catch (e) {
        console.warn("[processReport] ncp input delete failed (non-fatal):", e);
      }
    }
    if (DELETE_NCP_RESULT_AFTER_SUCCESS) {
      try {
        await deleteNcpResultKey(resultKey);
        console.log("[processReport]", reportId, "ncp result json deleted");
      } catch (e) {
        console.warn("[processReport] ncp result delete failed (non-fatal):", e);
      }
    }

    console.log("[processReport]", reportId, "done");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[processReport]", reportId, "error:", err);
    await updateReportFailed(reportId, message);
  } finally {
    await safeUnlink(rawPath);
    await safeUnlink(wavPath);
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function convertToWav(rawPath: string, wavPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i", rawPath,
    "-acodec", "pcm_s16le",
    "-ar", "16000",
    "-ac", "1",
    wavPath,
  ]);
}

async function updateReportFailed(reportId: string, errorMessage: string): Promise<void> {
  const { error } = await supabase
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

async function safeUnlink(p: string): Promise<void> {
  try {
    await fs.unlink(p);
  } catch {
    // ignore
  }
}
