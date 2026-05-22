import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { getGuideAiReply } from "@/lib/ai.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export function GuideAiChat({ role }: { role: "seeker" | "employer" }) {
  const askGuide = useServerFn(getGuideAiReply);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const question = text.trim();
    if (!question || busy) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setText("");
    setBusy(true);
    try {
      const { answer } = await askGuide({ data: { role, question, history: messages.slice(-8) } });
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "지금은 AI 답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-3 space-y-3 bg-primary/5 border-primary/30">
      <div className="flex items-center gap-2">
        <Bot size={18} className="text-primary" />
        <div>
          <p className="font-semibold text-sm">AI 사용법 도우미</p>
          <p className="text-[11px] text-muted-foreground">신청·승인·확정·노쇼 흐름을 바로 물어보세요.</p>
        </div>
      </div>
      {messages.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <div className={`inline-block max-w-[90%] rounded-md px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="예: 승인 후 무엇을 해야 하나요?" />
        <Button size="icon" onClick={submit} disabled={busy || !text.trim()} aria-label="AI 질문 보내기"><Send size={16} /></Button>
      </div>
    </Card>
  );
}