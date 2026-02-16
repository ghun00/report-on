import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_AUDIO = "audio";

/** Storage 업로드 경로: reports/{reportId}/raw.webm */
function getAudioUploadPath(reportId: string): string {
  return `reports/${reportId}/raw.webm`;
}

/**
 * MediaRecorder blob을 Supabase Storage audio 버킷에 업로드합니다.
 * path: reports/{reportId}/raw.webm
 * @returns 성공 시 업로드 경로, 실패 시 null
 */
export async function uploadRecordingBlob(
  supabase: SupabaseClient,
  reportId: string,
  blob: Blob
): Promise<string | null> {
  const path = getAudioUploadPath(reportId);
  const contentType = blob.type?.trim() || "audio/webm";
  const { error } = await supabase.storage
    .from(BUCKET_AUDIO)
    .upload(path, blob, {
      contentType,
      upsert: true,
    });

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[uploadRecordingBlob]", error);
    }
    return null;
  }
  return path;
}
