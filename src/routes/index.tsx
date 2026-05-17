import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { loading, user, roles } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) return nav({ to: "/auth" });
    if (roles.includes("admin")) return nav({ to: "/admin" });
    if (roles.includes("employer")) return nav({ to: "/employer/home" });
    if (roles.includes("seeker")) return nav({ to: "/seeker/home" });
    nav({ to: "/onboarding" });
  }, [loading, user, roles]);
  return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">불러오는 중…</div>;
}
