import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const refresh = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    setUnread(count ?? 0);
  };

  useEffect(() => {
    if (!user) return;
    refresh();

    // Request browser notification permission once
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setUnread((n) => n + 1);
          const n = payload.new;
          toast(n.title, { description: n.body });
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              const notif = new Notification(n.title, { body: n.body ?? "", tag: n.id });
              notif.onclick = () => { window.focus(); if (n.link_url) window.location.href = n.link_url; };
            } catch {}
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <Link to="/notifications" className="relative p-2 -mr-2" aria-label="알림">
      <Bell size={22} />
      {unread > 0 && (
        <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
