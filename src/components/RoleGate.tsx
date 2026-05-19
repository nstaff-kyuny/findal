import { ReactNode, useEffect } from "react";
import { useAuth, AppRole } from "@/lib/auth";
import { useNavigate, useSearch } from "@tanstack/react-router";

export function RoleGate({ role, children }: { role: AppRole; children: ReactNode }) {
  const { loading, user, roles } = useAuth();
  const nav = useNavigate();
  // Allow other authenticated users (e.g. employer/admin) to preview pages via ?preview=1
  const search = useSearch({ strict: false }) as { preview?: string };
  const isPreview = search?.preview === "1";
  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth" });
    else if (!roles.includes(role) && !isPreview) nav({ to: "/onboarding" });
  }, [loading, user, roles, role, isPreview]);
  if (loading || !user || (!roles.includes(role) && !isPreview)) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">불러오는 중…</div>;
  }
  return <>{children}</>;
}
