import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { loading, user, roles } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/auth" }); return; }
    if (roles.includes("admin")) { nav({ to: "/admin" }); return; }
    if (roles.includes("employer")) { nav({ to: "/employer/home" }); return; }
    if (roles.includes("seeker")) { nav({ to: "/seeker/featured" }); return; }
    nav({ to: "/onboarding" });
  }, [loading, user, roles]);
  return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">불러오는 중…</div>;
}
