"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function getDisplayName(user: User | null): string {
  if (!user) return "사용자";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const name =
    (meta?.name as string) ??
    (meta?.user_name as string) ??
    (meta?.full_name as string) ??
    (meta?.nickname as string);
  if (typeof name === "string" && name.trim()) return name.trim();
  if (user.email) return user.email.split("@")[0];
  return "사용자";
}

export function useCurrentUser(): {
  user: User | null;
  displayName: string;
  isLoading: boolean;
} {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    displayName: getDisplayName(user),
    isLoading,
  };
}
