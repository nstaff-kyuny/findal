import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { submitInquiryWithAi } from "@/lib/ai.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BackToSettings } from "@/components/BackToSettings";
import { toast } from "sonner";

export const Route = createFileRoute("/inquiry")({ component: Page });

function Page() {
  const { user } = useAuth();
  const submitWithAi = useServerFn(submitInquiryWithAi);
  const [list, setList] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("inquiries").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, [user]);
  const submit = async () => {
    if (!subject || !body || !user) return toast.error("제목과 내용을 입력하세요");
    setSubmitting(true);
    try {
      const res = await submitWithAi({ data: { subject, body } });
      setSubject(""); setBody("");
      toast.success(res.answer ? "AI 1차 답변이 등록되었습니다" : "문의가 접수되었습니다. 관리자 확인 후 답변됩니다");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "문의 등록 실패");
    } finally { setSubmitting(false); }
  };
  return (
    <div className="min-h-screen bg-muted/30 max-w-md mx-auto">
      <header className="sticky top-0 bg-background border-b px-4 py-3 flex items-center gap-2">
        <BackToSettings />
        <h1 className="font-bold">1:1 문의하기</h1>
      </header>
      <div className="p-3 space-y-3">
        <Card><CardContent className="p-4 space-y-2">
          <Input placeholder="제목" value={subject} onChange={e => setSubject(e.target.value)} />
          <Textarea placeholder="문의 내용을 입력하세요" rows={5} value={body} onChange={e => setBody(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">일반 문의는 AI가 즉시 1차 답변하고, 결제·분쟁·개인정보 등 민감 문의는 관리자 확인으로 접수됩니다.</p>
          <Button className="w-full" onClick={submit} disabled={submitting}>{submitting ? "등록 중..." : "문의 등록"}</Button>
        </CardContent></Card>
        <h3 className="font-bold text-sm">내 문의 내역</h3>
        {list.length === 0 && <p className="text-center text-xs text-muted-foreground py-6">문의 내역이 없습니다</p>}
        {list.map(q => (
          <Card key={q.id}><CardContent className="p-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">{q.subject}</h4>
              <Badge variant={q.status === "answered" ? "default" : "secondary"}>{q.status === "answered" ? "답변완료" : "접수"}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleString("ko-KR")}</p>
            <p className="text-sm mt-2 whitespace-pre-wrap">{q.body}</p>
            {q.answer && (
              <div className="mt-3 p-2 bg-primary/5 border-l-2 border-primary rounded">
                <p className="text-[10px] text-primary font-semibold">관리자 답변</p>
                <p className="text-sm whitespace-pre-wrap mt-1">{q.answer}</p>
              </div>
            )}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
