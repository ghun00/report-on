"use client";

import { useEffect, useState, useCallback } from "react";
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

export async function updateUserName(newName: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    data: { name: newName },
  });
  if (error) {
    throw new Error(error.message);
  }
}

export function useCurrentUser(): {
  user: User | null;
  displayName: string;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u ?? null);
  }, []);

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
    refreshUser,
  };
}
