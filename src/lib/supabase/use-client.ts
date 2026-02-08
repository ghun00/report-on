"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./client";

/**
 * 브라우저에서만 Supabase 클라이언트를 생성합니다.
 * 프리렌더/빌드 시에는 null을 반환해 env 미설정 시에도 빌드가 통과합니다.
 */
export function useSupabaseClient(): SupabaseClient | null {
  const [client, setClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    setClient(createClient());
  }, []);

  return client;
}
