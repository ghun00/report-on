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

/** 업로드/처리 실패 시 reports.status = 'failed', 선택적으로 error_message 설정 */
export async function updateReportFailed(
  reportId: string,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ status: "failed", error_message: errorMessage ?? null })
    .eq("id", reportId);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[updateReportFailed]", error);
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** 워커 트리거 실패 등: status는 유지하고 error_message만 설정 (예: generating 유지) */
export async function updateReportErrorMessage(
  reportId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ error_message: message })
    .eq("id", reportId);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[updateReportErrorMessage]", error);
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

/** 보고서 제목 업데이트 */
export async function updateReportTitle(
  reportId: string,
  newTitle: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ title: newTitle })
    .eq("id", reportId);

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[updateReportTitle]", error);
    }
    return { success: false, error: error.message };
  }
  return { success: true };
}

