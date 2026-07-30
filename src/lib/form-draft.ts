import { useEffect, useRef } from "react";

const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7일

export function clearFormDraft(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

export function readFormDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; v?: T };
    if (!parsed || typeof parsed !== "object" || !parsed.v) return null;
    if (!parsed.at || Date.now() - parsed.at > MAX_AGE_MS) { clearFormDraft(key); return null; }
    return parsed.v as T;
  } catch { return null; }
}

/**
 * 작성 중인 폼 내용을 localStorage 에 자동 저장하고,
 * 다시 페이지로 돌아왔을 때 복원한다.
 */
export function useFormDraft<T extends Record<string, any>>(
  key: string,
  values: T,
  apply: (v: Partial<T>) => void,
  options?: { enabled?: boolean; onRestored?: () => void },
) {
  const enabled = options?.enabled ?? true;
  const restoredRef = useRef(false);
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const onRestoredRef = useRef(options?.onRestored);
  onRestoredRef.current = options?.onRestored;

  // 최초 1회 복원
  useEffect(() => {
    if (!enabled || restoredRef.current) return;
    restoredRef.current = true;
    const draft = readFormDraft<T>(key);
    if (draft) {
      applyRef.current(draft);
      onRestoredRef.current?.();
    }
  }, [enabled, key]);

  // 변경 시 자동 저장 (디바운스)
  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (!enabled || !restoredRef.current) return;
    const id = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), v: JSON.parse(serialized) })); } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [enabled, key, serialized]);
}
