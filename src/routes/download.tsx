import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, Download, Search, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const description = "Find AR(파인달) 앱 다운로드 안내. Google Play와 App Store에서 파인달을 검색하고 공식 앱을 설치하세요.";

export const Route = createFileRoute("/download")({
  component: DownloadPage,
  head: () => ({
    meta: [
      { title: "앱 다운로드 — Find AR · 파인달" },
      { name: "description", content: description },
      { property: "og:title", content: "앱 다운로드 — Find AR · 파인달" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://findar.nstaff.co.kr/download" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://findar.nstaff.co.kr/download" }],
  }),
});

function AppleMark() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-7"><path d="M17.05 12.54c.02 3.03 2.66 4.04 2.69 4.05-.02.07-.42 1.45-1.39 2.87-.84 1.23-1.72 2.45-3.1 2.47-1.35.03-1.79-.8-3.34-.8-1.55 0-2.04.78-3.32.83-1.34.05-2.36-1.33-3.21-2.55-1.75-2.53-3.09-7.15-1.29-10.27a4.98 4.98 0 0 1 4.2-2.55c1.31-.03 2.55.89 3.35.89.8 0 2.29-1.1 3.85-.94.65.03 2.49.26 3.67 1.99-.1.06-2.19 1.28-2.16 4.01ZM14.51 4.88c.7-.85 1.17-2.03 1.04-3.2-1.01.04-2.23.67-2.95 1.52-.65.75-1.22 1.95-1.06 3.1 1.12.09 2.27-.57 2.97-1.42Z" /></svg>;
}

function PlayMark() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-7"><path d="m3.7 2.8 10.1 9.2L3.7 21.2a1.8 1.8 0 0 1-.7-1.5V4.3c0-.6.2-1.1.7-1.5Zm1.9-1 12 6.9-2.7 2.5L5.6 1.8Zm0 20.4 9.3-9.4 2.7 2.5-12 6.9ZM18.9 9.5l2.2 1.3c1 .6 1 1.8 0 2.4l-2.2 1.3-2.8-2.5 2.8-2.5Z" /></svg>;
}

function DownloadPage() {
  return (
    <div className="download-page min-h-svh bg-background text-foreground">
      <header className="mx-auto flex max-w-xl items-center justify-between px-6 py-5">
        <span className="text-sm font-bold">Find AR <span className="ml-1 font-normal text-muted-foreground">파인달</span></span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Download className="size-3.5" /> 앱 다운로드</span>
      </header>

      <section className="mx-auto max-w-xl px-6 pb-8 pt-7 text-center sm:pt-12">
        <img src="/findar-app-icon-512.png" alt="Find AR 공식 앱 로고" width="100" height="100" className="mx-auto size-24 rounded-2xl border border-border sm:size-28" />
        <p className="mb-3 mt-6 text-sm font-semibold text-primary">일자리와 사람을 잇다</p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Find AR<span className="mt-2 block text-2xl font-semibold sm:text-3xl">파인달</span></h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">호텔 알바부터 일용직·단기 일자리까지.<br />지금 앱에서 만나보세요.</p>
      </section>

      <section aria-label="스토어 선택" className="mx-auto max-w-xl px-6 pb-8">
        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-medium"><Smartphone className="size-4 text-primary" /> 내 휴대전화에 맞는 스토어로 이동</div>
        <div className="grid gap-3">
          <Button asChild size="lg" className="h-20 w-full justify-start gap-4 rounded-lg px-5 text-left shadow-none [&_svg]:size-7">
            <a href="https://play.google.com/store/search?q=%ED%8C%8C%EC%9D%B8%EB%8B%AC&c=apps" aria-label="Google Play에서 파인달 검색 — Android 앱 다운로드">
              <PlayMark />
              <span className="min-w-0 flex-1"><span className="block text-xs font-normal opacity-80">Android 앱 다운로드</span><span className="mt-1 block text-xl font-semibold">Google Play</span></span>
              <ArrowUpRight className="size-5" />
            </a>
          </Button>
          <Button asChild size="lg" className="h-20 w-full justify-start gap-4 rounded-lg bg-download-store px-5 text-left text-download-store-foreground shadow-none hover:bg-download-store/90 [&_svg]:size-7">
            <a href="https://apps.apple.com/kr/iphone/search?term=%ED%8C%8C%EC%9D%B8%EB%8B%AC" aria-label="App Store에서 파인달 검색 — iPhone 앱 다운로드">
              <AppleMark />
              <span className="min-w-0 flex-1"><span className="block text-xs font-normal opacity-80">iPhone 앱 다운로드</span><span className="mt-1 block text-xl font-semibold">App Store</span></span>
              <ArrowUpRight className="size-5" />
            </a>
          </Button>
        </div>
        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">스토어의 ‘파인달’ 검색 결과로 연결됩니다.<br />공식 앱을 선택한 후 설치해 주세요.</p>
      </section>

      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto max-w-xl px-6 py-7">
          <h2 className="mb-4 text-base font-semibold">이 앱을 확인해 주세요</h2>
          <div className="flex items-center gap-4">
            <img src="/findar-app-icon-512.png" alt="검색 결과에서 확인할 Find AR 아이콘" width="56" height="56" className="size-14 shrink-0 rounded-lg border border-border" />
            <div className="min-w-0"><p className="font-bold">Find AR <span className="text-sm font-normal text-muted-foreground">파인달</span></p><p className="mt-1 text-sm text-muted-foreground">개발자 · 주식회사 엔스태프</p></div>
            <Check className="ml-auto size-5 shrink-0 text-primary" />
          </div>
          <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><Search className="mt-1 size-4 shrink-0" /><span>다른 앱과 헷갈리지 않도록<br className="sm:hidden" /> 로고와 개발자 이름을 확인해 주세요.</span></p>
        </div>
      </section>

      <footer className="mx-auto max-w-xl px-6 pb-8 pt-6 text-center">
        <Button asChild variant="link" className="h-auto py-1 text-sm"><Link to="/">웹에서 Find AR 열기 <ArrowUpRight /></Link></Button>
        <p className="mt-4 text-xs text-muted-foreground">© N STAFF · Find AR</p>
      </footer>
    </div>
  );
}