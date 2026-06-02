import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { seekerJobChat } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n, useDynamicTranslate } from "@/lib/i18n";
import { formatWorkDatesWithWeekday, INDUSTRY_EMOJI, INDUSTRY_GRADIENT } from "@/lib/job-visuals";

type Msg = { role: "user" | "assistant"; content: string };

export function SeekerAiJobChat() {
  const { t, tIndustry, lang } = useI18n();
  const nav = useNavigate();
  const ask = useServerFn(seekerJobChat);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, matches]);

  // initial greeting when opened
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: t("ai_match_greeting") }]);
    }
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setBusy(true);
    try {
      const r = await ask({ data: { language: lang as any, history: messages.slice(-12), message: text } });
      setMessages([...next, { role: "assistant", content: r.reply }]);
      if (r.ready && r.criteria) {
        // search jobs
        let q = supabase.from("jobs").select("*").eq("is_active", true).limit(6);
        if (r.criteria.industries?.length) q = q.in("industry", r.criteria.industries as any);
        if (r.criteria.roles?.length) q = q.in("job_role", r.criteria.roles as any);
        if (r.criteria.regions?.length) q = q.in("region", r.criteria.regions);
        if (r.criteria.minWage) q = q.gte("daily_wage", r.criteria.minWage);
        const { data } = await q;
        setMatches(data ?? []);
      }
    } catch (e: any) {
      setMessages([...next, { role: "assistant", content: t("ai_match_error") }]);
    } finally { setBusy(false); }
  };

  const titles = matches.map(m => m.title).concat(matches.map(m => m.place_name)).filter(Boolean);
  const tx = useDynamicTranslate(titles);

  return (
    <Card className="overflow-hidden border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm">{t("ai_match_title")}</p>
            <p className="text-[11px] text-muted-foreground truncate">{t("ai_match_subtitle")}</p>
          </div>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="border-t bg-background">
          <div className="p-3 space-y-2 max-h-[55vh] overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                <div className={`inline-block max-w-[90%] rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {busy && <p className="text-xs text-muted-foreground animate-pulse">{t("ai_match_thinking")}</p>}

            {matches.length > 0 && (
              <div className="pt-2 mt-2 border-t space-y-2">
                <p className="text-xs font-bold text-primary">{t("ai_match_results")} ({matches.length})</p>
                <div className="grid grid-cols-2 gap-2">
                  {matches.map(j => (
                    <Card key={j.id} className="p-2 cursor-pointer hover:shadow" onClick={() => nav({ to: "/seeker/jobs/$id", params: { id: j.id } })}>
                      {j.photo_url ? (
                        <img src={j.photo_url} className="w-full h-20 rounded object-cover mb-1" alt={j.title} />
                      ) : (
                        <div className={`w-full h-20 rounded mb-1 bg-gradient-to-br ${INDUSTRY_GRADIENT[j.industry] ?? "from-slate-400 to-slate-600"} flex items-center justify-center text-2xl text-white`}>
                          {INDUSTRY_EMOJI[j.industry] ?? "🏢"}
                        </div>
                      )}
                      <Badge variant="secondary" className="text-[10px]">{tIndustry(j.industry)}</Badge>
                      <p className="text-xs font-semibold mt-0.5 truncate">{tx[j.title] ?? j.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">🏨 {tx[j.place_name] ?? j.place_name}</p>
                      <p className="text-xs text-primary font-bold mt-0.5">{Number(j.daily_wage).toLocaleString()}{t("won")}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{formatWorkDatesWithWeekday(j.work_dates) || t("to_be_arranged")}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="p-2 border-t flex gap-2 bg-background">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("ai_match_placeholder")}
              disabled={busy}
            />
            <Button size="icon" onClick={send} disabled={busy || !input.trim()} aria-label={t("ai_match_send")}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
