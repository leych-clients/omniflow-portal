"use client";

import { supabase } from "@/lib/supabase";
import { isInvalidRefreshAuthError } from "@/lib/supabase-auth-session";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types";
import { useCallback, useEffect } from "react";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password", "/auth", "/set-password", "/logout", "/verify", "/demo"];
const isProtectedPath = (pathname: string) =>
  !PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

function redirectToLoginIfProtected() {
  if (typeof window === "undefined") return;
  if (isProtectedPath(window.location.pathname)) {
    window.location.replace("/login");
  }
}

export function useAuth() {
  const { user, setUser, setMustChangePassword } = useAuthStore();

  const markInvitesAsUsed = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      await fetch("/api/invites/mark-used", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch (error) {
      console.error("useAuth: Error marking invite as used:", error);
    }
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/profile?t=${Date.now()}`, {
        credentials: "include",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error("Error fetching user profile:", errBody || res.statusText);
        setUser(null);
        useAuthStore.getState().signOut();
        redirectToLoginIfProtected();
        return;
      }
      const text = await res.text();
      let data: User | null = null;
      try {
        if (text) data = JSON.parse(text) as User;
      } catch {
        console.error("Profile response invalid JSON");
      }
      setUser(data);
      await markInvitesAsUsed();
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser(null);
      useAuthStore.getState().signOut();
      redirectToLoginIfProtected();
    }
  }, [markInvitesAsUsed, setUser]);

  useEffect(() => {
    let finished = false;
    const refreshProfile = () => {
      supabase.auth
        .getSession()
        .then(async ({ data: { session }, error }) => {
          if (finished) return;
          if (error && isInvalidRefreshAuthError(error)) {
            await supabase.auth.signOut().catch(() => {});
            useAuthStore.getState().signOut();
            setUser(null);
            redirectToLoginIfProtected();
            return;
          }
          if (session?.user) {
            fetchUserProfile();
          } else {
            setUser(null);
            redirectToLoginIfProtected();
          }
        })
        .catch(async (error) => {
          if (finished) return;
          console.error("useAuth: Error getting session:", error);
          if (isInvalidRefreshAuthError(error)) {
            await supabase.auth.signOut().catch(() => {});
          }
          useAuthStore.getState().signOut();
          setUser(null);
          redirectToLoginIfProtected();
        });
    };

    refreshProfile();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshProfile();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleRefreshEvent = () => refreshProfile();
    document.addEventListener("auth:refreshProfile", handleRefreshEvent);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile();
      } else {
        setUser(null);
        redirectToLoginIfProtected();
      }
    });

    return () => {
      finished = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("auth:refreshProfile", handleRefreshEvent);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, setUser]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    setMustChangePassword(/Aa![0-9]{3,}$/.test(password));
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
      : (typeof window !== "undefined" ? window.location.origin : "") +
        "/auth/reset-password";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (error) throw error;
  };

  return { user, signIn, signOut, resetPassword };
}
