import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ClipboardList, Inbox, Plus, BookOpen, Monitor, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/employer/home")({ component: () => <RoleGate role="employer"><Page /></RoleGate> });

function Page() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [emp, setEmp] = useState<any>(null);
  const [activeJobs, setActiveJobs] = useState(0);
  const [pending, setPending] = useState(0);
  useEffect(() => { if (!user) return; (async () => {
    const { data: e } = await supabase.from("employer_profiles").select("*").eq("user_id", user.id).single();
    setEmp(e);
    const { count: c1 } = await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("employer_id", user.id).eq("is_active", true);
    setActiveJobs(c1 ?? 0);
    const { count: c2 } = await supabase.from("job_applications").select("*", { count: "exact", head: true }).eq("employer_id", user.id).eq("status", "pending");
    setPending(c2 ?? 0);
  })(); }, [user]);

  return (
    <MobileLayout role="employer">
      <div className="p-4 space-y-3">
        <Card className="bg-primary text-primary-foreground"><CardContent className="p-5">
          <p className="text-xs opacity-80">{emp?.company_name}</p>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-xs opacity-80">보유 크레딧</p>
              <p className="text-3xl font-bold">{emp?.credits ?? 0}</p>
            </div>
            <Link to="/employer/credits" className="text-xs underline opacity-90">충전 →</Link>
          </div>
        </CardContent></Card>

        <div className="grid grid-cols-2 gap-2">
          <Link to="/employer/jobs">
            <Card className="hover:bg-accent transition-colors"><CardContent className="p-4">
              <ClipboardList className="text-primary mb-1" size={20} />
              <p className="text-xs text-muted-foreground">공고 관리</p>
              <p className="text-2xl font-bold">{activeJobs}</p>
            </CardContent></Card>
          </Link>
          <Link to="/employer/applications">
            <Card className="hover:bg-accent transition-colors"><CardContent className="p-4">
              <Inbox className="text-primary mb-1" size={20} />
              <p className="text-xs text-muted-foreground">받은 신청 관리</p>
              <p className="text-2xl font-bold">{pending}</p>
            </CardContent></Card>
          </Link>
        </div>

        <Link to="/employer/jobs/new"><Button size="lg" className="w-full h-14 text-base"><Plus size={20} className="mr-1" />새 공고 등록</Button></Link>
        <Link to="/guide/$role" params={{ role: "employer" }}>
          <Button size="lg" variant="outline" className="w-full h-12 text-sm border-primary/40 text-primary"><BookOpen size={18} className="mr-1" />앱 사용법 확인</Button>
        </Link>
        <div className="pt-4">
          <Link to="/employer/history"><Button size="lg" variant="outline" className="w-full h-14 text-base">근로자 승인 및 출근 기록</Button></Link>
        </div>
        <div className="pt-4">
          <Link to="/seeker/home" search={{ preview: "1" } as any}><Button size="lg" variant="secondary" className="w-full h-14 text-base">👀 구직자 홈 미리보기</Button></Link>
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Monitor className="text-primary" size={18} />
              <p className="text-sm font-bold">{t("pc_admin_notice_title")}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{t("pc_admin_notice_body")}</p>
            <p className="text-xs text-muted-foreground">{t("pc_admin_site_url")}</p>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
