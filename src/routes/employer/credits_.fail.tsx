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
            {isMerchantSuspended && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-left text-[12px] leading-relaxed text-amber-900">
                <p className="font-semibold">결제사(토스페이먼츠) 상점 상태 문제입니다.</p>
                <p className="mt-1">
                  앱 오류가 아니라 토스페이먼츠에서 해당 상점의 결제를 아직 허용하지 않는 상태입니다. 아래를 확인해
                  주세요.
                </p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>토스페이먼츠 상점 심사/계약이 완료되었는지 (심사 중에는 실결제 불가)</li>
                  <li>카드 등 사용할 결제수단이 신청·활성화되어 있는지</li>
                  <li>등록한 라이브 클라이언트/시크릿 키가 같은 상점(MID)의 키인지</li>
                </ul>
                <p className="mt-1">
                  심사 완료 전이라면 관리자 페이지에서 결제 모드를 <b>테스트</b>로 두고 테스트 키로 진행해 주세요.
                </p>
              </div>
            )}
            <Button className="w-full" onClick={() => nav({ to: "/employer/credits" })}>다시 시도</Button>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
