import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_AUDIO = "audio";
const RETRY_DELAYS = [0, 2000, 5000];
const MAX_RETRIES = 3;

/** Storage 업로드 경로: reports/{reportId}/raw.webm */
function getAudioUploadPath(reportId: string): string {
  return `reports/${reportId}/raw.webm`;
}

export interface UploadResult {
  success: boolean;
  path?: string;
  error?: string;
  errorDetails?: {
    statusCode?: string;
    message?: string;
    name?: string;
  };
  attempt?: number;
}

export interface UploadProgress {
  attempt: number;
  maxAttempts: number;
  status: "uploading" | "retrying" | "success" | "failed";
  delayMs?: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 단일 업로드 시도
 */
async function attemptUpload(
  supabase: SupabaseClient,
  path: string,
  blob: Blob,
  contentType: string
): Promise<UploadResult> {
  const { error } = await supabase.storage
    .from(BUCKET_AUDIO)
    .upload(path, blob, {
      contentType,
      upsert: true,
    });

  if (error) {
    const errorDetails = {
      statusCode: (error as { statusCode?: string }).statusCode,
      message: error.message,
      name: error.name,
    };
    return {
      success: false,
      error: `${errorDetails.statusCode ?? "unknown"}: ${errorDetails.message ?? "unknown error"}`,
      errorDetails,
    };
  }

  return { success: true, path };
}

/**
 * MediaRecorder blob을 Supabase Storage audio 버킷에 업로드합니다.
 * 자동 재시도: 최대 3회 (0ms, 2000ms, 5000ms 간격)
 * path: reports/{reportId}/raw.webm
 */
export async function uploadRecordingBlob(
  supabase: SupabaseClient,
  reportId: string,
  blob: Blob,
  durationSec?: number,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const path = getAudioUploadPath(reportId);
  const contentType = blob.type?.trim() || "audio/webm";
  const blobSizeMB = (blob.size / (1024 * 1024)).toFixed(2);

  console.log(`[uploadRecordingBlob] Starting upload: reportId=${reportId}, size=${blobSizeMB}MB, duration=${durationSec ?? "unknown"}s, contentType=${contentType}`);

  let lastResult: UploadResult = { success: false, error: "Upload not attempted" };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const delayMs = RETRY_DELAYS[attempt - 1] ?? 0;

    if (delayMs > 0) {
      console.log(`[uploadRecordingBlob] Retry attempt ${attempt}/${MAX_RETRIES} after ${delayMs}ms delay...`);
      onProgress?.({
        attempt,
        maxAttempts: MAX_RETRIES,
        status: "retrying",
        delayMs,
      });
      await delay(delayMs);
    } else {
      onProgress?.({
        attempt,
        maxAttempts: MAX_RETRIES,
        status: "uploading",
      });
    }

    console.log(`[uploadRecordingBlob] Attempt ${attempt}/${MAX_RETRIES}...`);
    lastResult = await attemptUpload(supabase, path, blob, contentType);
    lastResult.attempt = attempt;

    if (lastResult.success) {
      console.log(`[uploadRecordingBlob] Upload success on attempt ${attempt}: path=${path}`);
      onProgress?.({
        attempt,
        maxAttempts: MAX_RETRIES,
        status: "success",
      });
      return lastResult;
    }

    console.error(`[uploadRecordingBlob] Attempt ${attempt}/${MAX_RETRIES} failed: ${lastResult.error}`, lastResult.errorDetails);
  }

  console.error(`[uploadRecordingBlob] All ${MAX_RETRIES} attempts failed. Last error: ${lastResult.error}`);
  onProgress?.({
    attempt: MAX_RETRIES,
    maxAttempts: MAX_RETRIES,
    status: "failed",
  });

  return lastResult;
}

/**
 * 단일 시도 업로드 (재시도 없음) - 수동 재시도용
 */
export async function uploadRecordingBlobOnce(
  supabase: SupabaseClient,
  reportId: string,
  blob: Blob,
  durationSec?: number
): Promise<UploadResult> {
  const path = getAudioUploadPath(reportId);
  const contentType = blob.type?.trim() || "audio/webm";
  const blobSizeMB = (blob.size / (1024 * 1024)).toFixed(2);

  console.log(`[uploadRecordingBlobOnce] Upload: reportId=${reportId}, size=${blobSizeMB}MB, duration=${durationSec ?? "unknown"}s`);

  const result = await attemptUpload(supabase, path, blob, contentType);

  if (result.success) {
    console.log(`[uploadRecordingBlobOnce] Success: path=${path}`);
  } else {
    console.error(`[uploadRecordingBlobOnce] Failed: ${result.error}`, result.errorDetails);
  }

  return result;
}
