import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "seeker" | "employer" | "admin";

type Ctx = {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  session: null,
  roles: [],
  loading: true,
  refreshRoles: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string | undefined) => {
    if (!uid) { setRoles([]); return; }
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r: any) => r.role));
  };

  useEffect(() => {
    let cancelled = false;
    // 안전장치: 5초 내 응답이 없으면 loading 해제
    const safety = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 5000);

    const finishWithSession = async (s: Session | null) => {
      if (cancelled) return;
      // 세션이 새로 들어오면 roles 로드가 끝날 때까지 loading=true 로 잠금
      // (그렇지 않으면 Index가 user는 있고 roles=[] 인 상태를 보고 /onboarding 으로 보내버림)
      if (s?.user) setLoading(true);
      setSession(s);
      try {
        await loadRoles(s?.user?.id);
      } finally {
        if (!cancelled) {
          setLoading(false);
          clearTimeout(safety);
        }
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      // setTimeout 0: supabase 콜백 안에서 직접 await 호출 금지 (deadlock 방지)
      setTimeout(() => { void finishWithSession(s); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      void finishWithSession(data.session);
    }).catch(() => {
      if (!cancelled) { setLoading(false); clearTimeout(safety); }
    });
    return () => {
      cancelled = true;
      clearTimeout(safety);
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user: session?.user ?? null,
        session,
        roles,
        loading,
        refreshRoles: () => loadRoles(session?.user?.id),
        signOut: async () => {
          await supabase.auth.signOut();
          window.location.href = "/auth";
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
