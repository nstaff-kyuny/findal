import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ChevronLeft, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({ component: NotificationsPage });

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  return new Date(iso).toLocaleDateString();
}

function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems(data ?? []);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`notif-list-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    toast.success("모두 읽음 처리했습니다");
    load();
  };

  const removeAll = async () => {
    if (!user) return;
    if (!confirm("모든 알림을 삭제할까요?")) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    load();
  };

  const onClick = async (n: any) => {
    if (!n.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    if (n.link_url) navigate({ to: n.link_url });
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col max-w-md mx-auto shadow-xl">
      <header className="sticky top-0 z-40 bg-background border-b px-3 py-3 flex items-center justify-between">
        <Link to="/" className="p-1 -ml-1"><ChevronLeft size={22} /></Link>
        <h1 className="font-bold text-lg flex items-center gap-1"><Bell size={18} /> 알림</h1>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={markAllRead} title="모두 읽음"><Check size={16} /></Button>
          <Button size="sm" variant="ghost" onClick={removeAll} title="모두 삭제"><Trash2 size={16} /></Button>
        </div>
      </header>
      <main className="flex-1 p-3 space-y-2">
        {items.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-20">받은 알림이 없습니다.</div>
        )}
        {items.map((n) => (
          <Card
            key={n.id}
            onClick={() => onClick(n)}
            className={`p-3 cursor-pointer hover:bg-muted/50 ${n.read_at ? "opacity-60" : "border-l-4 border-l-primary"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5 break-words">{n.body}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
              </div>
              {!n.read_at && <span className="w-2 h-2 rounded-full bg-red-500 mt-1 shrink-0" />}
            </div>
          </Card>
        ))}
      </main>
    </div>
  );
}
