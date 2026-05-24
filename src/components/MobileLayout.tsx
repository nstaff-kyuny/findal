import { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, Star, FileText, Settings, Briefcase, Inbox, CreditCard, LayoutDashboard, Heart } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useI18n } from "@/lib/i18n";


type Tab = { to: string; key: string; fallback: string; icon: any };

const seekerTabs: Tab[] = [
  { to: "/seeker/home", key: "tab_home", fallback: "홈", icon: Home },
  { to: "/seeker/featured", key: "tab_featured", fallback: "추천", icon: Star },
  { to: "/seeker/favorites", key: "tab_favorites", fallback: "즐겨찾기", icon: Heart },
  { to: "/seeker/applications", key: "tab_applications", fallback: "신청내역", icon: FileText },
  { to: "/seeker/me", key: "tab_me", fallback: "MY/설정", icon: Settings },
];

const employerTabs: Tab[] = [
  { to: "/employer/home", key: "", fallback: "홈", icon: LayoutDashboard },
  { to: "/employer/jobs", key: "", fallback: "공고", icon: Briefcase },
  { to: "/employer/applications", key: "", fallback: "신청/승인 내역", icon: Inbox },
  { to: "/employer/credits", key: "", fallback: "크레딧", icon: CreditCard },
  { to: "/employer/me", key: "", fallback: "MY/설정", icon: Settings },
];

export function MobileLayout({ children, role }: { children: ReactNode; role: "seeker" | "employer" }) {
  const tabs = role === "seeker" ? seekerTabs : employerTabs;
  const loc = useLocation();
  const cols = tabs.length === 5 ? "grid-cols-5" : "grid-cols-4";
  const { t } = useI18n();
  const label = (tab: Tab) => role === "seeker" && tab.key ? t(tab.key) : tab.fallback;
  return (
    <div className="min-h-screen bg-muted/30 flex flex-col max-w-md mx-auto shadow-xl">
      <header className="sticky top-0 z-40 bg-background border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg">{role === "seeker" ? "Find AR" : "구인자 콘솔"}</h1>
        <NotificationBell />
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-background border-t grid ${cols}`}>
        {tabs.map(t => {
          const active = loc.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link key={t.to} to={t.to} className={`flex flex-col items-center py-2 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon size={20} />
              <span className="mt-1">{label(t)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
