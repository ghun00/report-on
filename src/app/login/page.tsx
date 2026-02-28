"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSupabaseClient } from "@/lib/supabase/use-client";
import type { User } from "@supabase/supabase-js";

export default function LoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (!supabase) return;
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleKakaoLogin = async () => {
    if (!supabase) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${origin}/auth/callback`,
        // 카카오 앱 동의항목에 설정한 것만 요청 (profile_image 미설정 시 KOE205 방지)
        scopes: "profile_nickname account_email",
        queryParams: { scope: "profile_nickname account_email" },
      },
    });
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  if (loading || !supabase) {
    return (
      <main
        className="h-screen flex flex-col"
        style={{ backgroundColor: "var(--color-brand-orange)" }}
      >
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-[400px] text-center text-white">로딩 중...</div>
        </div>
        <footer className="w-full px-6 py-5 border-t border-white/30">
          <div className="text-white/70 text-sm space-y-1">
            <p>프라이데이랩 | 대표자 : 한지훈</p>
            <p>사업자등록번호 : 481-11-03110</p>
            <p className="text-white/50">© Friday Lab. All rights reserved.</p>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main
      className="h-screen flex flex-col"
      style={{ backgroundColor: "var(--color-brand-orange)" }}
    >
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-[400px]">
          <div className="text-left text-white mb-12">
            <p className="text-2xl sm:text-3xl font-bold leading-relaxed">
              녹음만 하세요.
            </p>
            <p className="text-2xl sm:text-3xl font-bold leading-relaxed">
              전문적인 상담 보고서는
            </p>
            <p className="text-2xl sm:text-3xl font-bold leading-relaxed">
              레포트온이 만들어 드릴게요.
            </p>
          </div>

          {user ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/15 px-4 py-3 text-white">
                <p className="text-sm font-medium opacity-90">로그인된 계정</p>
                <p className="mt-1 truncate">
                  {user.email ??
                    user.user_metadata?.kakao_account?.email ??
                    user.user_metadata?.user_name ??
                    user.id}
                </p>
              </div>
              <Link
                href="/home"
                className="flex items-center justify-center w-full h-14 rounded-2xl font-medium text-white bg-white/20 transition-all duration-200 hover:bg-white/30"
              >
                홈으로 이동
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-14 rounded-2xl font-medium text-black transition-all duration-200 ease-out hover:brightness-95 border border-white/40 bg-transparent text-white"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleKakaoLogin}
              className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl font-medium text-black transition-all duration-200 ease-out hover:brightness-95 hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: "#FFEB00" }}
            >
              <Image
                src="/kakao.png"
                alt="카카오"
                width={24}
                height={24}
                className="shrink-0"
              />
              <span>카카오로 시작하기</span>
            </button>
          )}
        </div>
      </div>
      <footer className="w-full px-30 py-6 border-t border-white/30">
        <div className="text-white/70 text-sm space-y-1">
          <p>프라이데이랩 | 대표자 : 한지훈</p>
          <p>사업자등록번호 : 481-11-03110</p>
          <p className="text-white/50 mt-3">© Friday Lab. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
