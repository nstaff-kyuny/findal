import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const searchSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
  orderId: z.string().optional(),
});

export const Route = createFileRoute("/employer/credits_/fail")({
  validateSearch: (s) => searchSchema.parse(s),
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
