import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/notices")({ component: Page });

function Page() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("notices").select("*").eq("active", true).order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setList(data ?? []);
  })(); }, []);
  return (
    <div className="min-h-screen bg-muted/30 max-w-md mx-auto">
      <header className="sticky top-0 bg-background border-b px-4 py-3 flex items-center gap-2">
        <Link to="/seeker/me"><ChevronLeft size={20} /></Link>
        <h1 className="font-bold">공지사항</h1>
      </header>
      <div className="p-3 space-y-2">
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">등록된 공지사항이 없습니다</p>}
        {list.map(n => (
          <Card key={n.id}><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {n.pinned && <Badge>중요</Badge>}
              <h3 className="font-semibold">{n.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString("ko-KR")}</p>
            <p className="text-sm mt-2 whitespace-pre-wrap">{n.body}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
