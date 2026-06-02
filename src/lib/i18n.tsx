import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { translateTexts } from "@/lib/ai.functions";
import {
  type Lang, LANG_LABEL, LANG_FLAG,
  UI, t as tStr, tIndustry, tRole, tRegion,
} from "@/lib/i18n-dict";

export type { Lang };
export { LANG_LABEL, LANG_FLAG };

const LS_KEY = "seeker_lang";

type CustomInd = { key: string; label: string; sort_order: number };
type CustomRole = { key: string; industry_key: string; label: string; sort_order: number };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => Promise<void>;
  t: (key: string) => string;
  tIndustry: (key: string) => string;
  tRole: (key: string) => string;
  tRegion: (key: string) => string;
  customIndustries: CustomInd[];
  customRoles: CustomRole[];
  refreshTaxonomy: () => Promise<void>;
};

const I18nCtx = createContext<Ctx>({
  lang: "ko",
  setLang: async () => {},
  t: (k) => UI[k]?.ko ?? k,
  tIndustry: (k) => k,
  tRole: (k) => k,
  tRegion: (k) => k,
  customIndustries: [],
  customRoles: [],
  refreshTaxonomy: async () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "ko";
    const v = localStorage.getItem(LS_KEY) as Lang | null;
    return v && ["ko","en","mn","ru","zh"].includes(v) ? v : "ko";
  });
  const [customIndustries, setCustomIndustries] = useState<CustomInd[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);

  const refreshTaxonomy = useCallback(async () => {
    const [{ data: i }, { data: r }] = await Promise.all([
      supabase.from("custom_industries" as any).select("*").order("sort_order"),
      supabase.from("custom_job_roles" as any).select("*").order("sort_order"),
    ]);
    setCustomIndustries((i ?? []) as any);
    setCustomRoles((r ?? []) as any);
  }, []);

  useEffect(() => { if (user) refreshTaxonomy(); }, [user, refreshTaxonomy]);

  // load preference from DB once we know the user is a seeker
  useEffect(() => {
    if (!user || !roles.includes("seeker")) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("seeker_profiles")
        .select("preferred_language").eq("user_id", user.id).maybeSingle();
      const dbLang = (data as any)?.preferred_language as Lang | undefined;
      if (!cancelled && dbLang && dbLang !== lang) {
        setLangState(dbLang);
        try { localStorage.setItem(LS_KEY, dbLang); } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [user, roles]);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LS_KEY, l); } catch {}
    if (user && roles.includes("seeker")) {
      await supabase.from("seeker_profiles")
        .update({ preferred_language: l } as any).eq("user_id", user.id);
    }
  }, [user, roles]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    t: (k) => tStr(k, lang),
    tIndustry: (k) => {
      const built = tIndustry(k, lang);
      if (built !== k) return built;
      const c = customIndustries.find((x) => x.key === k);
      return c?.label ?? k;
    },
    tRole: (k) => {
      const built = tRole(k, lang);
      if (built !== k) return built;
      const c = customRoles.find((x) => x.key === k);
      return c?.label ?? k;
    },
    tRegion: (k) => tRegion(k, lang),
    customIndustries,
    customRoles,
    refreshTaxonomy,
  }), [lang, setLang, customIndustries, customRoles, refreshTaxonomy]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() { return useContext(I18nCtx); }

// ---------- Dynamic AI translation with cache ----------
const memCache = new Map<string, string>(); // key: `${lang}::${text}` -> translated
const CACHE_LS_KEY = "seeker_tr_cache_v1";
let lsLoaded = false;

function loadLsCache() {
  if (lsLoaded || typeof window === "undefined") return;
  lsLoaded = true;
  try {
    const raw = localStorage.getItem(CACHE_LS_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, string>;
    Object.entries(obj).forEach(([k, v]) => memCache.set(k, v));
  } catch {}
}

function saveLsCache() {
  if (typeof window === "undefined") return;
  try {
    // cap to avoid LS quota: keep last ~500 entries
    const entries = Array.from(memCache.entries());
    const trimmed = entries.slice(Math.max(0, entries.length - 500));
    const obj = Object.fromEntries(trimmed);
    localStorage.setItem(CACHE_LS_KEY, JSON.stringify(obj));
  } catch {}
}

/**
 * Hook: translate an array of Korean strings into the current language.
 * Returns a map from original -> translated. For ko, returns identity.
 * Calls the AI gateway in a single batched request, caches results.
 */
export function useDynamicTranslate(texts: string[]): Record<string, string> {
  const { lang } = useI18n();
  const translate = useServerFn(translateTexts);
  const [map, setMap] = useState<Record<string, string>>({});
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    loadLsCache();
    const unique = Array.from(new Set(texts.filter((s) => typeof s === "string" && s.trim().length > 0)));
    if (lang === "ko" || unique.length === 0) { setMap({}); return; }

    // Build initial map from cache
    const next: Record<string, string> = {};
    const need: string[] = [];
    for (const s of unique) {
      const k = `${lang}::${s}`;
      const v = memCache.get(k);
      if (v) next[s] = v;
      else need.push(s);
    }
    setMap(next);

    // Skip API call if everything cached
    const key = `${lang}::${need.join("\u0001")}`;
    if (need.length === 0 || key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    let cancelled = false;
    (async () => {
      // batch in chunks of 30 (server allows up to 40)
      try {
        for (let i = 0; i < need.length; i += 30) {
          const chunk = need.slice(i, i + 30);
          const res = await translate({ data: { texts: chunk, language: lang as any } });
          const items = (res?.items ?? []) as string[];
          chunk.forEach((src, idx) => {
            const tr = items[idx] ?? src;
            memCache.set(`${lang}::${src}`, tr);
            next[src] = tr;
          });
          if (cancelled) return;
          setMap({ ...next });
        }
        saveLsCache();
      } catch {
        // silent fail -> keep ko
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, texts.join("\u0001")]);

  // Helper: identity for ko
  if (lang === "ko") return new Proxy({} as Record<string,string>, { get: (_, p: string) => p });
  return map;
}
