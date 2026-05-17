import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const HIDE_KEY = "findar.event.hide_until";

export function EventPopup() {
  const { user } = useAuth();
  const [evt, setEvt] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const hideUntil = Number(localStorage.getItem(HIDE_KEY) ?? 0);
    if (hideUntil > Date.now()) return;
    (async () => {
      const now = new Date().toISOString();
      const { data } = await supabase.from("events")
        .select("*").eq("active", true)
        .lte("starts_at", now).gte("ends_at", now)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) { setEvt(data); setOpen(true); }
    })();
  }, [user]);

  const hideToday = () => {
    const end = new Date(); end.setHours(23, 59, 59, 999);
    localStorage.setItem(HIDE_KEY, String(end.getTime()));
    setOpen(false);
  };

  if (!evt) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <div className="space-y-3">
          {evt.image_url && <img src={evt.image_url} alt={evt.title} className="w-full rounded" />}
          <h2 className="font-bold text-lg">{evt.title}</h2>
          {evt.body && <p className="text-sm whitespace-pre-wrap">{evt.body}</p>}
          {evt.link_url && <a href={evt.link_url} target="_blank" rel="noreferrer" className="text-primary text-sm underline">자세히 보기 →</a>}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={hideToday}>오늘 그만 보기</Button>
            <Button onClick={() => setOpen(false)}>닫기</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
