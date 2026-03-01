import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_AUDIO = "audio";

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
}

/**
 * MediaRecorder blob을 Supabase Storage audio 버킷에 업로드합니다.
 * path: reports/{reportId}/raw.webm
 */
export async function uploadRecordingBlob(
  supabase: SupabaseClient,
  reportId: string,
  blob: Blob,
  durationSec?: number
): Promise<UploadResult> {
  const path = getAudioUploadPath(reportId);
  const contentType = blob.type?.trim() || "audio/webm";
  const blobSizeMB = (blob.size / (1024 * 1024)).toFixed(2);

  console.log(`[uploadRecordingBlob] Starting upload: reportId=${reportId}, size=${blobSizeMB}MB, duration=${durationSec ?? "unknown"}s, contentType=${contentType}`);

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
    const errorStr = `${errorDetails.statusCode ?? "unknown"}: ${errorDetails.message ?? "unknown error"}`;
    
    console.error(`[uploadRecordingBlob] Upload failed: ${errorStr}`, error);
    
    return {
      success: false,
      error: errorStr,
      errorDetails,
    };
  }

  console.log(`[uploadRecordingBlob] Upload success: path=${path}`);
  return { success: true, path };
}
