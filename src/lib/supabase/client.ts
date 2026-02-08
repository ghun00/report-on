import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * 브라우저 전용 Supabase 클라이언트 (싱글톤).
 * 서버/빌드 환경에서는 호출하지 마세요.
 */
export function createClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY are required."
      );
    }
    client = createBrowserClient(url, key);
  }
  return client;
}
