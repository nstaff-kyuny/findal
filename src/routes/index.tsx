import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Find AR (파인달) — 일용직 일자리 매칭 플랫폼" },
      { name: "description", content: "외식·호텔·요양 등 단기 근무 일자리와 구직자를 빠르게 연결하는 한국형 일용직 매칭 서비스입니다." },
      { property: "og:title", content: "Find AR (파인달) — 일용직 일자리 매칭 플랫폼" },
      { property: "og:description", content: "외식·호텔·요양 등 단기 근무 일자리와 구직자를 빠르게 연결하는 한국형 일용직 매칭 서비스입니다." },
      { property: "og:url", content: "https://findar.nstaff.co.kr/" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b960614b-6802-4c79-9831-baf58dfba981/id-preview-52e8e032--0901552f-1f39-43d3-90dd-086a05e6d476.lovable.app-1778999799501.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b960614b-6802-4c79-9831-baf58dfba981/id-preview-52e8e032--0901552f-1f39-43d3-90dd-086a05e6d476.lovable.app-1778999799501.png" },
    ],
    links: [{ rel: "canonical", href: "https://findar.nstaff.co.kr/" }],
  }),
});

function Index() {
  const { loading, user, roles } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/auth" }); return; }
    if (roles.includes("admin")) { nav({ to: "/admin" }); return; }
    if (roles.includes("manager")) { nav({ to: "/admin2" }); return; }
    if (roles.includes("employer")) { nav({ to: "/employer/home" }); return; }
    if (roles.includes("seeker")) { nav({ to: "/seeker/featured" }); return; }
    nav({ to: "/onboarding" });
  }, [loading, user, roles]);
  return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">불러오는 중…</div>;
}
