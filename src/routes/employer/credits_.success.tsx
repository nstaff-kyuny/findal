import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { confirmCreditOrder } from "@/lib/toss.functions";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const searchSchema = z.object({
  paymentKey: z.string().optional(),
  orderId: z.string().optional(),
  amount: z.coerce.number().optional(),
});

export const Route = createFileRoute("/employer/credits_/success")({
  validateSearch: (s) => searchSchema.parse(s),
  component: () => <RoleGate role="employer"><Page /></RoleGate>,
});

function Page() {
  const search = useSearch({ from: "/employer/credits_/success" });
  const confirm = useServerFn(confirmCreditOrder);
  const nav = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const [msg, setMsg] = useState<string>("");
  const [pack, setPack] = useState<number>(0);

  useEffect(() => {
    if (!search.paymentKey || !search.orderId || !search.amount) {
      setState("fail");
      setMsg("결제 정보가 올바르지 않습니다.");
      return;
    }
    (async () => {
      try {
        const r = await confirm({ data: {
          paymentKey: search.paymentKey!,
          orderId: search.orderId!,
          amount: search.amount!,
        }});
        setPack(r.pack || 0);
        setState("ok");
      } catch (e: any) {
        setMsg(e?.message || "결제 승인에 실패했습니다.");
        setState("fail");
      }
    })();
  }, []);

  return (
    <MobileLayout role="employer">
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            {state === "loading" && (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="font-medium">결제를 확인하고 있습니다…</p>
              </>
            )}
            {state === "ok" && (
              <>
                <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />
                <p className="text-lg font-bold">결제가 완료되었습니다</p>
                <p className="text-sm text-muted-foreground">{pack} 크레딧이 적립되었습니다.</p>
                <Button className="w-full" onClick={() => nav({ to: "/employer/credits" })}>크레딧 페이지로</Button>
              </>
            )}
            {state === "fail" && (
              <>
                <XCircle className="w-14 h-14 text-destructive mx-auto" />
                <p className="text-lg font-bold">결제 처리 실패</p>
                <p className="text-sm text-muted-foreground">{msg}</p>
                <Button variant="outline" className="w-full" onClick={() => nav({ to: "/employer/credits" })}>돌아가기</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
