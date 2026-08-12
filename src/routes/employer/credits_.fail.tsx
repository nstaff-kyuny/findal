import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

type FailSearch = { code?: string; message?: string; orderId?: string };

// 토스 리다이렉트 파라미터 검증으로 절대 throw 하지 않도록 처리
function parseSearch(raw: Record<string, unknown>): FailSearch {
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
  return { code: str(raw?.code), message: str(raw?.message), orderId: str(raw?.orderId) };
}

export const Route = createFileRoute("/employer/credits_/fail")({
  validateSearch: (s): FailSearch => parseSearch(s as Record<string, unknown>),
  component: () => <RoleGate role="employer"><Page /></RoleGate>,
});

function Page() {
  const search = useSearch({ from: "/employer/credits_/fail" });
  const nav = useNavigate();
  return (
    <MobileLayout role="employer">
      <div className="p-4">
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <XCircle className="w-14 h-14 text-destructive mx-auto" />
            <p className="text-lg font-bold">결제가 취소되었거나 실패했습니다</p>
            <p className="text-sm text-muted-foreground">{search.message || "다시 시도해 주세요."}</p>
            {search.code && <p className="text-xs text-muted-foreground">코드: {search.code}</p>}
            <Button className="w-full" onClick={() => nav({ to: "/employer/credits" })}>다시 시도</Button>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
