import { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, Star, FileText, Settings, Briefcase, Inbox, CreditCard, LayoutDashboard, Heart } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Tab = { to: string; label: string; icon: any };

const seekerTabs: Tab[] = [
  { to: "/seeker/home", label: "홈", icon: Home },
  { to: "/seeker/featured", label: "추천", icon: Star },
  { to: "/seeker/favorites", label: "즐겨찾기", icon: Heart },
  { to: "/seeker/applications", label: "신청내역", icon: FileText },
  { to: "/seeker/me", label: "MY/설정", icon: Settings },
];

const employerTabs: Tab[] = [
  { to: "/employer/home", label: "홈", icon: LayoutDashboard },
  { to: "/employer/jobs", label: "공고", icon: Briefcase },
  { to: "/employer/applications", label: "신청/승인 내역", icon: Inbox },
  { to: "/employer/credits", label: "크레딧", icon: CreditCard },
  { to: "/employer/me", label: "MY/설정", icon: Settings },
];

export function MobileLayout({ children, role }: { children: ReactNode; role: "seeker" | "employer" }) {
  const tabs = role === "seeker" ? seekerTabs : employerTabs;
  const loc = useLocation();
  const { signOut } = useAuth();
  const cols = tabs.length === 5 ? "grid-cols-5" : "grid-cols-4";
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col max-w-md mx-auto shadow-xl">
      <header className="sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg">{role === "seeker" ? "Find AR" : "구인자 콘솔"}</h1>
        <button onClick={signOut} className="text-xs text-muted-foreground">로그아웃</button>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background border-t grid ${cols}`}>
        {tabs.map(t => {
          const active = loc.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link key={t.to} to={t.to} className={`flex flex-col items-center py-2 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon size={20} />
              <span className="mt-1">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
