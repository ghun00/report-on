"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * 로그인된 유저로 reports 테이블에 더미 행을 insert한 뒤 select하여 반환합니다.
 * RLS가 auth.uid() 기준으로 적용되는지 확인할 수 있습니다.
 * - reports 테이블에 user_id, title 컬럼이 있다고 가정합니다.
 * - 스키마가 다르면 이 파일의 insert payload를 수정하세요.
 */
export async function testReportsInsertSelect(): Promise<{
  success: boolean;
  message: string;
  inserted?: unknown;
  selected?: unknown;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "로그인이 필요합니다." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      status: "generating",
      title: `Dummy report ${Date.now()}`,
    })
    .select()
    .single();

  if (insertError) {
    console.error("[testReportsInsertSelect] insert error:", insertError);
    return {
      success: false,
      message: `insert 실패: ${insertError.message}`,
    };
  }

  const { data: selected, error: selectError } = await supabase
    .from("reports")
    .select("*")
    .eq("id", (inserted as { id: string }).id)
    .single();

  if (selectError) {
    console.error("[testReportsInsertSelect] select error:", selectError);
    return {
      success: false,
      message: `select 실패: ${selectError.message}`,
      inserted,
    };
  }

  console.log("[testReportsInsertSelect] inserted:", inserted);
  console.log("[testReportsInsertSelect] selected:", selected);

  return {
    success: true,
    message: "insert/select 성공 (콘솔 확인)",
    inserted,
    selected,
  };
}
