import { ReactNode, useEffect } from "react";
import { useAuth, AppRole } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";

export function RoleGate({ role, children }: { role: AppRole; children: ReactNode }) {
  const { loading, user, roles } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth" });
    else if (!roles.includes(role)) nav({ to: "/onboarding" });
  }, [loading, user, roles, role]);
  if (loading || !user || !roles.includes(role)) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">불러오는 중…</div>;
  }
  return <>{children}</>;
}
