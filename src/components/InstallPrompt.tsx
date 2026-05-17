import { useEffect, useState } from "react";
import { X, Share, Plus } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "findar_install_dismissed_at";
const DISMISS_DAYS = 7;

function recentlyDismissed() {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    return Date.now() - Number(v) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // already installed
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;
    if (recentlyDismissed()) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

    if (isIOS && isSafari) {
      setIosHint(true);
      setDismissed(false);
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (dismissed || (!deferred && !iosHint)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setDismissed(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setDismissed(true);
  };

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md bg-background border shadow-lg rounded-xl p-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
    >
      <div className="flex items-start gap-3">
        <img
          src="https://adrnhxpzkqyqzfcihokt.supabase.co/storage/v1/object/public/app-icons/icon-192.png"
          alt=""
          className="w-10 h-10 rounded-lg"
        />
        <div className="flex-1 text-sm">
          <div className="font-semibold mb-0.5">홈화면에 Find AR 추가</div>
          {deferred ? (
            <p className="text-muted-foreground text-xs">앱처럼 빠르게 실행하세요.</p>
          ) : (
            <p className="text-muted-foreground text-xs flex items-center gap-1 flex-wrap">
              하단 <Share size={12} className="inline" /> 공유 → <Plus size={12} className="inline" /> "홈 화면에 추가"
            </p>
          )}
          {deferred && (
            <button
              onClick={install}
              className="mt-2 inline-flex items-center bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium"
            >
              설치하기
            </button>
          )}
        </div>
        <button onClick={dismiss} className="text-muted-foreground p-1" aria-label="닫기">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
