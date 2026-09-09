import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { COMPANY_INFO } from "@/lib/company";
import { ArrowLeft, Trash2, Mail, Shield, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "계정 삭제 안내 — Find AR (파인달)" },
      { name: "description", content: "Find AR(파인달) 계정 및 관련 데이터 삭제 방법과 삭제 요청 절차를 안내합니다." },
      { property: "og:title", content: "계정 삭제 안내 — Find AR (파인달)" },
      { property: "og:description", content: "Find AR(파인달) 계정 및 관련 데이터 삭제 방법과 삭제 요청 절차를 안내합니다." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const contactEmail = COMPANY_INFO.email || "findar@nstaff.co.kr";

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl py-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft size={16} className="mr-1" /> 홈으로
          </Link>
        </Button>

        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          계정 삭제 안내
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {COMPANY_INFO.appName}를 더 이상 이용하지 않으시려면 아래 방법으로 계정과 데이터를 삭제할 수 있습니다.
        </p>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">1. 앱에서 직접 삭제</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    로그인 상태에서 <b>설정(마이페이지) → 회원 탈퇴</b>를 누르면 즉시 계정과 관련 데이터가 삭제됩니다.
                  </p>
                  <ol className="mt-2 ml-4 list-decimal text-sm text-muted-foreground space-y-1">
                    <li>하단 메뉴 또는 상단 프로필에서 <b>설정/마이페이지</b> 진입</li>
                    <li>화면 하단의 <b>회원 탈퇴</b> 선택</li>
                    <li>안내 문구 확인 후 탈퇴 완료</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  <Mail size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">2. 이메일로 삭제 요청</h2>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    앱에 접속할 수 없는 경우 아래 이메일로 삭제를 요청해 주세요. 본인 확인을 위해 가입한 이메일 주소와 휴대폰 번호를 함께 보내주시면 빠르게 처리해 드립니다.
                  </p>
                  <div className="mt-3 flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm">
                    <Mail size={16} className="text-primary" />
                    <a href={`mailto:${contactEmail}`} className="font-medium text-primary hover:underline">
                      {contactEmail}
                    </a>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    담당자 확인 후 영업일 기준 7일 이내에 계정과 관련 데이터를 삭제 처리하고 회신 드립니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-destructive/10 p-2 text-destructive">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">삭제 시 주의사항</h2>
                  <ul className="mt-2 ml-4 list-disc text-sm text-muted-foreground space-y-1 leading-relaxed">
                    <li>탈퇴 후에는 동일한 계정으로 로그인할 수 없습니다.</li>
                    <li>프로필, 공고, 신청 내역, 알림, 크레딧·결제 기록 등 <b>모든 개인 데이터가 함께 삭제</b>됩니다.</li>
                    <li>관련 법령(전자상거래법, 국세법 등)에 따라 일부 거래 기록은 법정 보관 기간 동안 별도 보관될 수 있습니다.</li>
                    <li>미사용 크레딧·결제 건에 대한 환불은 탈퇴 전에 먼저 신청해 주세요.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  <Shield size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">삭제되는 데이터</h2>
                  <ul className="mt-2 ml-4 list-disc text-sm text-muted-foreground space-y-1 leading-relaxed">
                    <li>계정 정보(이메일, 인증 정보)</li>
                    <li>프로필 정보(이름, 연락처, 희망 지역, 경력 등)</li>
                    <li>구인자/구직자 역할별 프로필 및 설정</li>
                    <li>공고·신청·즐겨찾기·알림 기록</li>
                    <li>푸시 알림 구독 정보</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center pt-4">
            <Button asChild>
              <Link to="/">홈으로 돌아가기</Link>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            문의: {contactEmail} | {COMPANY_INFO.name}
          </p>
        </div>
      </div>
    </div>
  );
}
