"use server";

import { createClient } from "@/lib/supabase/server";

export interface CreateReportRowInput {
  title: string;
  durationSec: number | null;
  status?: "uploading" | "generating";
}

export interface CreateReportRowResult {
  success: boolean;
  id?: string;
  error?: string;
}

/** reports row 생성 (status=uploading 또는 generating). 반환 id로 Storage 경로 구성. */
export async function createReportRow(
  input: CreateReportRowInput
): Promise<CreateReportRowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      title: input.title,
      duration_sec: input.durationSec ?? null,
      status: input.status ?? "uploading",
    })
    .select("id")
    .single();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[createReportRow]", error);
    }
    return { success: false, error: error.message };
  }
  return { success: true, id: data?.id };
}

/** 업로드 완료 후 reports 업데이트: audio_path, status='generating' */
export async function updateReportAfterUpload(
  reportId: string,
  audioPath: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ audio_path: audioPath, status: "generating" })
    .eq("id", reportId);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[updateReportAfterUpload]", error);
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** 업로드/처리 실패 시 reports.status = 'failed' */
export async function updateReportFailed(
  reportId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: "failed" })
    .eq("id", reportId);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[updateReportFailed]", error);
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** 테스트용: status='generating' row 1개 생성 (개발용) */
export async function createTestReportRow(): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  const dateStr = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\. /g, ".").trim();
  return createReportRow({
    title: `테스트 보고서 ${dateStr}`,
    durationSec: null,
    status: "generating",
  });
}

