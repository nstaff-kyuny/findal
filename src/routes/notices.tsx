import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackToSettings } from "@/components/BackToSettings";

export const Route = createFileRoute("/notices")({
  component: Page,
  head: () => ({
    meta: [
      { title: "공지사항 | Find AR" },
      { name: "description", content: "Find AR(파인달) 서비스 공지사항. 운영 변경, 업데이트, 안내 사항을 확인하세요." },
      { property: "og:title", content: "공지사항 | Find AR" },
      { property: "og:description", content: "Find AR(파인달) 서비스 운영 공지." },
      { property: "og:url", content: "https://findar.nstaff.co.kr/notices" },
    ],
    links: [{ rel: "canonical", href: "https://findar.nstaff.co.kr/notices" }],
  }),
});

function Page() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("notices").select("*").eq("active", true).order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setList(data ?? []);
  })(); }, []);
  return (
    <div className="min-h-screen bg-muted/30 max-w-md mx-auto">
      <header className="sticky top-0 bg-background border-b px-4 py-3 flex items-center gap-2">
        <BackToSettings />
        <h1 className="font-bold">공지사항</h1>
      </header>
      <div className="p-3 space-y-2">
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">등록된 공지사항이 없습니다</p>}
        {list.map(n => (
          <Card key={n.id}><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {n.pinned && <Badge>중요</Badge>}
              <h2 className="font-semibold">{n.title}</h2>
            </div>
            <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString("ko-KR")}</p>
            <p className="text-sm mt-2 whitespace-pre-wrap">{n.body}</p>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
