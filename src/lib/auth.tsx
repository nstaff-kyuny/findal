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
      setSession(s);
      // 역할까지 로드한 뒤에 loading 해제 (라우팅 race 방지)
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
