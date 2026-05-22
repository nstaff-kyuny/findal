import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 추천인 코드: 영문 대문자 + 숫자만 허용, 최대 50자
export function normalizeReferrerCode(v: string): string {
  return (v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 50);
}
