import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Languages } from "lucide-react";
import { GuideAiChat } from "@/components/GuideAiChat";
import { translateTexts } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/guide/$role")({ component: Page });

type Step = { badge: string; title: string; desc: string };

const SEEKER_STEPS: Step[] = [
  { badge: "1", title: "공고 둘러보기", desc: "홈/추천 페이지에서 관심 있는 공고를 확인합니다. 선호지역을 설정하면 해당 지역 공고가 우선 추천됩니다." },
  { badge: "2", title: "공고 신청", desc: "공고 상세에서 [신청하기] 버튼을 누르면 구인자에게 지원 신청이 전달됩니다. 상태는 '대기'로 표시됩니다." },
  { badge: "3", title: "승인 확인", desc: "구인자가 승인하면 상태가 '승인'으로 바뀌고, 신청/승인 내역 페이지에서 확인할 수 있습니다." },
  { badge: "4", title: "근무 확정 (온데요)", desc: "근무 당일 출근 의사가 확실하다면 [✅ 확정(온데요)] 버튼을 눌러주세요. 구인자에게 출근 예정을 알리는 신호입니다." },
  { badge: "5", title: "근무 후", desc: "근무가 끝나면 자동으로 기록이 남습니다. 별도 버튼은 없습니다." },
  { badge: "⚠️", title: "노쇼(미출근) 주의", desc: "승인을 받고 출근하지 않으면 구인자가 '노쇼' 처리할 수 있습니다. 노쇼는 향후 매칭에 불이익이 갑니다. 사정이 생기면 미리 구인자에게 연락해주세요." },
];

const EMPLOYER_STEPS: Step[] = [
  { badge: "1", title: "공고 등록", desc: "[새 공고 등록]에서 업종/지역/근무일/일당을 입력해 공고를 게시합니다. 공고는 최대 2회까지 수정 가능합니다." },
  { badge: "2", title: "신청 접수", desc: "구직자가 지원하면 '받은 신청' 탭에 '대기' 상태로 표시됩니다. 프로필(국적/경력/한국어 가능 여부 등)을 확인하세요." },
  { badge: "3", title: "승인 또는 거절", desc: "[승인 (1크레딧)] 버튼으로 채용 확정 시 크레딧 1개가 차감됩니다. [거절]을 누르면 해당 신청은 종료됩니다." },
  { badge: "4", title: "연락하기", desc: "승인된 구직자에게는 [연락하기] 버튼이 나타납니다. 전화로 출근 일정과 장소를 안내해주세요." },
  { badge: "5", title: "구직자 확정 (온데요)", desc: "구직자가 [확정(온데요)]을 누르면 카드가 초록색으로 표시되어 출근 예정이 확실함을 알 수 있습니다." },
  { badge: "⚠️", title: "노쇼(미출근) 처리", desc: "승인했는데 출근하지 않은 경우에만 [노쇼(미출근) 표시]를 사용하세요. 구직자에게 불이익이 가는 처리이므로 두 번의 확인을 거칩니다. 신중하게 사용해주세요." },
  { badge: "★", title: "프리미엄 추천 광고", desc: "공고 목록의 [광고] 버튼으로 추천 페이지 상단에 노출시킬 수 있습니다. 동시에 노출 가능한 자리가 한정되어 있어 가득 찬 경우 안내가 표시됩니다." },
];

type Lang = "ko" | "en" | "mn" | "ru" | "zh";
const LANG_LABEL: Record<Exclude<Lang, "ko">, string> = { en: "English", mn: "Монгол", ru: "Русский", zh: "中文" };

function Page() {
  const { role } = useParams({ from: "/guide/$role" });
  const isSeeker = role === "seeker";
  const baseSteps = isSeeker ? SEEKER_STEPS : EMPLOYER_STEPS;
  const backTo = isSeeker ? "/seeker/home" : "/employer/home";
  const title = isSeeker ? "구직자 사용 설명서" : "구인자 사용 설명서";

  const translate = useServerFn(translateTexts);
  const [lang, setLang] = useState<Lang>("ko");
  const [busy, setBusy] = useState(false);
  const [tSteps, setTSteps] = useState<Step[] | null>(null);
  const [tTitle, setTTitle] = useState<string | null>(null);
  const [tIntro, setTIntro] = useState<string | null>(null);

  const intro = isSeeker
    ? "공고 신청부터 출근 확정, 노쇼 주의사항까지 순서대로 안내합니다."
    : "공고 등록부터 신청 승인, 출근 확인, 노쇼 처리까지 순서대로 안내합니다.";

  const runTranslate = async (target: Exclude<Lang, "ko">) => {
    if (busy) return;
    setBusy(true);
    setLang(target);
    try {
      const texts: string[] = [title, intro];
      baseSteps.forEach((s) => { texts.push(s.title); texts.push(s.desc); });
      const { items } = await translate({ data: { texts, language: target } });
      setTTitle(items[0] ?? title);
      setTIntro(items[1] ?? intro);
      const out: Step[] = baseSteps.map((s, i) => ({
        badge: s.badge,
        title: items[2 + i * 2] ?? s.title,
        desc: items[3 + i * 2] ?? s.desc,
      }));
      setTSteps(out);
    } catch (e: any) {
      toast.error(e?.message ?? "번역 실패");
      setLang("ko");
    } finally {
      setBusy(false);
    }
  };

  const resetLang = () => { setLang("ko"); setTSteps(null); setTTitle(null); setTIntro(null); };

  const displayedTitle = lang === "ko" ? title : (tTitle ?? title);
  const displayedIntro = lang === "ko" ? intro : (tIntro ?? intro);
  const displayedSteps = lang === "ko" || !tSteps ? baseSteps : tSteps;

  return (
    <div className="min-h-screen bg-muted/30 max-w-md mx-auto">
      <header className="sticky top-0 bg-background border-b px-4 py-3 flex items-center gap-2 z-10">
        <Link to={backTo} aria-label="뒤로 가기"><ChevronLeft size={20} /></Link>
        <h1 className="font-bold">{displayedTitle}</h1>
      </header>
      <div className="p-3 space-y-3">
        <Card className="p-3 bg-background">
          <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
            <Languages size={14} /> 다국어 보기 (AI 번역)
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            <Button size="sm" variant={lang === "ko" ? "default" : "outline"} onClick={resetLang} disabled={busy}>한국어</Button>
            {(Object.keys(LANG_LABEL) as Array<Exclude<Lang, "ko">>).map((k) => (
              <Button key={k} size="sm" variant={lang === k ? "default" : "outline"} onClick={() => runTranslate(k)} disabled={busy}>
                {busy && lang === k ? "..." : LANG_LABEL[k]}
              </Button>
            ))}
          </div>
        </Card>
        <Card className="p-4 bg-primary/5 border-primary/30">
          <p className="text-sm font-semibold mb-1">{lang === "ko" ? "앱 사용 흐름 안내" : displayedTitle}</p>
          <p className="text-xs text-muted-foreground">{displayedIntro}</p>
        </Card>
        <GuideAiChat role={isSeeker ? "seeker" : "employer"} />
        {displayedSteps.map((s, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Badge variant="default" className="text-base px-3 py-1 shrink-0">{s.badge}</Badge>
              <div className="min-w-0">
                <h3 className="font-semibold text-base">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">{s.desc}</p>
              </div>
            </div>
          </Card>
        ))}
        <Card className="p-4 bg-muted/40">
          <p className="text-xs text-muted-foreground leading-relaxed">
            추가 문의는 설정 → 자주 묻는 질문 또는 1:1 문의를 이용해주세요.
          </p>
        </Card>
      </div>
    </div>
  );
}
