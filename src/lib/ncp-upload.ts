"use client";

/** 30MB 이상이면 NCP 업로드 경로 사용 (Supabase 413 방지) */
export const MAX_SUPABASE_UPLOAD_BYTES = 30 * 1024 * 1024;

export function shouldUseNcpUpload(blobSize: number): boolean {
  return blobSize >= MAX_SUPABASE_UPLOAD_BYTES;
}

export interface NcpPresignResponse {
  ok: boolean;
  uploadUrl?: string;
  objectKey?: string;
  bucket?: string;
  expiresInSec?: number;
  error?: string;
}

export interface NcpUploadResult {
  success: boolean;
  objectKey?: string;
  error?: string;
}

/**
 * NCP presigned PUT URL로 업로드
 */
export async function uploadToNcp(
  reportId: string,
  blob: Blob,
  contentType: string
): Promise<NcpUploadResult> {
  const res = await fetch("/api/ncp/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportId,
      contentType: contentType || "audio/webm",
    }),
  });

  const data: NcpPresignResponse = await res.json();

  if (!res.ok) {
    return {
      success: false,
      error: data.error ?? `presign failed (${res.status})`,
    };
  }

  if (!data.ok || !data.uploadUrl || !data.objectKey) {
    return {
      success: false,
      error: data.error ?? "Invalid presign response",
    };
  }

  const putRes = await fetch(data.uploadUrl, {
    method: "PUT",
    body: blob,
    headers: {
      "Content-Type": contentType || "audio/webm",
    },
  });

  if (!putRes.ok) {
    const bodyText = await putRes.text();
    return {
      success: false,
      error: `ncp upload failed: ${putRes.status} ${bodyText || putRes.statusText}`.slice(0, 500),
    };
  }

  return {
    success: true,
    objectKey: data.objectKey,
  };
}
