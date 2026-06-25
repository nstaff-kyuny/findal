import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TEXT_MODEL = "google/gemini-3-flash-preview";
const FAST_MODEL = "google/gemini-2.5-flash-lite";
const IMAGE_MODEL = "google/gemini-2.5-flash-image";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type AiMessage = { role: "system" | "user" | "assistant"; content: any };

async function callAi(messages: AiMessage[], json = false, model = TEXT_MODEL) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI 기능을 사용할 수 없습니다");
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, ...(json ? { response_format: { type: "json_object" } } : {}) }),
  });
  if (!res.ok) throw new Error(`AI 요청 실패 (${res.status})`);
  const data = await res.json() as any;
  return String(data?.choices?.[0]?.message?.content ?? "").trim();
}

async function callAiJson<T>(messages: AiMessage[], fallback: T, model = FAST_MODEL): Promise<T> {
  try {
    const text = await callAi(messages, true, model);
    return JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "")) as T;
  } catch {
    return fallback;
  }
}

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("관리자 권한이 필요합니다");
}

const sensitiveWords = ["환불", "결제취소", "분쟁", "신고", "개인정보", "계정삭제", "임금체불", "폭행", "성희롱", "법적", "고소", "사기"];
const isSensitive = (text: string) => sensitiveWords.some((w) => text.includes(w));

export const generateJobDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    industry: z.string(), jobRole: z.string(), placeName: z.string().optional().default(""),
    region: z.string().optional().default(""), wage: z.string().optional().default(""), rooms: z.string().optional().default(""),
    tone: z.enum(["default", "friendly", "foreigner"]).optional().default("default"),
  }).parse(input))
  .handler(async ({ data }) => {
    return callAiJson<{ title: string; preparations: string; appeal: string }>([
      { role: "system", content: "한국의 단기 일자리 플랫폼 공고 작성 도우미입니다. 과장 없이 외국인도 이해하기 쉬운 한국어로 작성하고 JSON만 반환하세요." },
      { role: "user", content: `업종:${data.industry}\n직무:${data.jobRole}\n장소:${data.placeName}\n지역:${data.region}\n일당:${data.wage}\n객실수:${data.rooms}\n톤:${data.tone}\n반환 JSON: {"title":"20자 내외 공고 제목","preparations":"준비물/출근 안내 2~4문장","appeal":"구직자에게 보일 장점 1문장"}` },
    ], { title: data.placeName ? `${data.placeName} 근무자 모집` : "단기 근무자 모집", preparations: "출근 시간과 준비물을 확인해 주세요.", appeal: "조건이 맞는 구직자에게 추천됩니다." });
  });

export const generateJobImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ industry: z.string(), jobRole: z.string(), placeName: z.string().optional().default("") }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI 기능을 사용할 수 없습니다");
    const prompt = `한국 구인 공고 대표 이미지. 업종 ${data.industry}, 직무 ${data.jobRole}, 장소명 ${data.placeName || "근무지"}. 사람 얼굴과 글자 없이, 밝고 신뢰감 있는 실제 사진풍, 깨끗한 업무 현장, 모바일 카드용 가로형.`;
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: IMAGE_MODEL, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] }),
    });
    if (!res.ok) throw new Error(`이미지 생성 실패 (${res.status})`);
    const json = await res.json() as any;
    const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error("이미지를 생성하지 못했습니다");
    const base64 = String(url).includes(",") ? String(url).split(",").pop()! : String(url);
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const fileBody = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const safeFolder = (data.placeName || "ai").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "ai";
    const path = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error } = await supabaseAdmin.storage.from("job-photos").upload(path, fileBody, { contentType: "image/png", upsert: false });
    if (error) throw new Error(error.message);
    const { data: publicUrl } = supabaseAdmin.storage.from("job-photos").getPublicUrl(path);
    return { imageUrl: publicUrl.publicUrl };
  });

export const submitInquiryWithAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ subject: z.string().min(1).max(120), body: z.string().min(1).max(3000) }).parse(input))
  .handler(async ({ data, context }) => {
    const text = `${data.subject}\n${data.body}`;
    let answer: string | null = null;
    let status = "open";
    if (!isSensitive(text)) {
      const { data: faqs } = await context.supabase.from("faqs").select("question, answer").eq("active", true).limit(30);
      const faqText = (faqs ?? []).map((f: any) => `Q:${f.question}\nA:${f.answer}`).join("\n---\n");
      answer = await callAi([
        { role: "system", content: "Find AR 앱 1:1 문의의 AI 1차 답변입니다. FAQ와 앱 사용 흐름으로 답할 수 있으면 짧고 정확히 답하세요. 결제/분쟁/개인정보/임금체불/신고/법적 사안은 관리자 확인이 필요하다고 안내하세요." },
        { role: "user", content: `FAQ:\n${faqText}\n\n문의 제목:${data.subject}\n문의 내용:${data.body}` },
      ], false, FAST_MODEL).catch(() => null);
      if (answer) status = "answered";
    }
    const { error } = await context.supabase.from("inquiries").insert({
      user_id: context.userId, subject: data.subject, body: data.body,
      answer, status, answered_at: answer ? new Date().toISOString() : null,
    } as any);
    if (error) throw new Error(error.message);
    return { answer, escalated: !answer };
  });

export const getGuideAiReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ role: z.enum(["seeker", "employer"]), question: z.string().min(1).max(1000), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1200) })).max(8).optional().default([]) }).parse(input))
  .handler(async ({ data }) => {
    const guide = data.role === "seeker"
      ? "구직자: 홈/추천에서 공고 확인, 신청하기, 대기, 구인자 승인, 승인 후 연락처 확인, 갈께요 최종확정, 미출근 시 노쇼 불이익."
      : "구인자: 공고 등록, 신청 접수, 승인 시 1크레딧 차감, 연락하기, 구직자 확정 확인, 실제 미출근 시에만 노쇼 처리, 광고는 크레딧 사용.";
    const messages = [
      { role: "system" as const, content: `Find AR ${data.role === "seeker" ? "구직자" : "구인자"} 사용법 상담 AI입니다. 앱 사용법만 답하고 결제/분쟁/개인정보/법적 문제는 1:1 문의로 안내하세요. ${guide}` },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: data.question },
    ];
    return { answer: await callAi(messages, false, FAST_MODEL) };
  });

export const translateJobDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ jobId: z.string().uuid(), language: z.enum(["en", "mn", "ru", "zh"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: job, error } = await context.supabase.from("jobs").select("title, place_name, location, region, industry, job_role, daily_wage, pay_day, preparations, work_dates, rooms_per_day, headcount").eq("id", data.jobId).single();
    if (error) throw new Error(error.message);
    const langName = { en: "English", mn: "Mongolian (Монгол)", ru: "Russian (Русский)", zh: "Simplified Chinese (简体中文)" }[data.language];
    return callAiJson<{ title: string; place: string; location: string; industry: string; jobRole: string; summary: string; wage: string; schedule: string; preparation: string; caution: string }>([
      { role: "system", content: `You translate a Korean short-term job posting into ${langName}. Translate every field naturally (do not leave Korean). Keep numbers, dates, and place names accurate. Return JSON only with keys: title, place, location, industry, jobRole, summary, wage, schedule, preparation, caution.` },
      { role: "user", content: JSON.stringify(job) },
    ], { title: job.title, place: job.place_name, location: job.location, industry: String(job.industry), jobRole: String(job.job_role), summary: "", wage: String(job.daily_wage), schedule: (job.work_dates ?? []).join(", "), preparation: job.preparations ?? "", caution: "Contact is visible after approval." });
  });

export const translateTexts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    texts: z.array(z.string().max(2000)).min(1).max(40),
    language: z.enum(["en", "mn", "ru", "zh"]),
  }).parse(input))
  .handler(async ({ data }) => {
    const langName = { en: "English", mn: "Mongolian (Монгол)", ru: "Russian (Русский)", zh: "Simplified Chinese (简体中文)" }[data.language];
    return callAiJson<{ items: string[] }>([
      { role: "system", content: `Translate each Korean string into ${langName} naturally. Keep meaning, numbers, and emojis. Return JSON only: {"items":["...","..."]} in the same order and length as the input.` },
      { role: "user", content: JSON.stringify({ items: data.texts }) },
    ], { items: data.texts });
  });

export const generateScreeningQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: job } = await context.supabase.from("jobs").select("title, industry, job_role, preparations, work_dates, rooms_per_day").eq("id", data.jobId).single();
    return callAiJson<{ questions: string[] }>([
      { role: "system", content: "구직자가 신청 전 스스로 확인할 질문 3개를 쉬운 한국어로 만드세요. JSON만 반환하세요." },
      { role: "user", content: JSON.stringify(job) },
    ], { questions: ["근무일에 출근할 수 있나요?", "준비물을 확인했나요?", "승인 후 연락을 받을 수 있나요?"] });
  });

export const generateSeekerMatchReasons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    jobs: z.array(z.object({ id: z.string(), title: z.string().optional(), region: z.string().optional().nullable(), industry: z.string().optional(), daily_wage: z.number().optional().nullable() })).max(12),
    language: z.enum(["ko", "en", "mn", "ru", "zh"]).optional().default("ko"),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: sp } = await context.supabase.from("seeker_profiles").select("preferred_region, experience, korean_ok, nationality").eq("user_id", context.userId).maybeSingle();
    const langName = { ko: "Korean (한국어)", en: "English", mn: "Mongolian (Монгол)", ru: "Russian (Русский)", zh: "Simplified Chinese (简体中文)" }[data.language];
    const fallback = {
      ko: (r: string | null | undefined) => r ? `${r} 선호지역 공고` : "조건 확인 추천",
      en: (r: string | null | undefined) => r ? `Job in your preferred area ${r}` : "Recommended — check details",
      mn: (r: string | null | undefined) => r ? `Дуртай бүс ${r}-ийн ажил` : "Нөхцөл шалгаж зөвлөмж",
      ru: (r: string | null | undefined) => r ? `Вакансия в вашем районе ${r}` : "Рекомендуется — проверьте детали",
      zh: (r: string | null | undefined) => r ? `您偏好地区 ${r} 的职位` : "推荐 — 请查看详情",
    }[data.language];
    return callAiJson<Record<string, { score: number; reason: string }>>([
      { role: "system", content: `Compare the seeker profile with each job and return a JSON object keyed by job id with {score:0-100, reason:"..."}. Write the "reason" in ${langName}, about 18 characters/short phrase. Do NOT use Korean unless the target language is Korean.` },
      { role: "user", content: JSON.stringify({ profile: sp, jobs: data.jobs }) },
    ], Object.fromEntries(data.jobs.map((j) => [j.id, { score: 70, reason: fallback(j.region) }]))) ;
  });

export const analyzeApplications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ applications: z.array(z.object({ id: z.string(), jobTitle: z.string().optional(), applicantName: z.string().optional(), nationality: z.string().optional(), experience: z.string().optional(), koreanOk: z.boolean().optional(), message: z.string().optional().nullable(), status: z.string().optional() })).max(20) }).parse(input))
  .handler(async ({ data }) => {
    return callAiJson<Record<string, { summary: string; noShowRisk: "낮음" | "보통" | "높음"; question: string }>>([
      { role: "system", content: "구인자가 지원자를 빠르게 판단하도록 요약합니다. 차별적 표현 없이 경력/한국어/메시지 기반으로만 판단하고 JSON 객체로 반환하세요." },
      { role: "user", content: JSON.stringify(data.applications) },
    ], Object.fromEntries(data.applications.map((a) => [a.id, { summary: "프로필 확인 후 연락 권장", noShowRisk: "보통", question: "근무 가능 시간을 확인해 보세요." }]))) ;
  });

export const analyzeInquiryText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ subject: z.string().max(200), body: z.string().max(3000) }).parse(input))
  .handler(async ({ data }) => callAiJson<{ spamRisk: "낮음" | "보통" | "높음"; category: string; suggestedAnswer: string; needsHuman: boolean }>([
    { role: "system", content: "1:1 문의를 분류하고 욕설/스팸/민감 이슈 여부와 관리자 답변 초안을 JSON으로 반환하세요." },
    { role: "user", content: `${data.subject}\n${data.body}` },
  ], { spamRisk: "낮음", category: "일반", suggestedAnswer: "확인 후 안내드리겠습니다.", needsHuman: true }));

export const generateAdminAiInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [{ count: seekers }, { count: employers }, { count: jobs }, { data: apps }, { data: inquiries }, { data: referrers }] = await Promise.all([
      supabaseAdmin.from("seeker_profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("employer_profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("jobs").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("job_applications").select("status, created_at").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("inquiries").select("subject, body, status, created_at").order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("referrers").select("code, name, active").limit(200),
    ]);
    return callAiJson<{ summary: string; actions: string[]; riskSignals: string[]; referralChecks: string[] }>([
      { role: "system", content: "Find AR 관리자용 AI 인사이트입니다. 운영자가 바로 실행할 수 있는 요약/액션/위험신호/추천인 부정사용 점검 포인트를 한국어 JSON으로 반환하세요." },
      { role: "user", content: JSON.stringify({ seekers, employers, activeJobs: jobs, applications: apps, inquiries, referrers }) },
    ], { summary: "데이터를 기준으로 운영 현황을 확인하세요.", actions: ["대기 문의와 대기 신청을 우선 확인하세요."], riskSignals: [], referralChecks: [] }, TEXT_MODEL);
  });

export const moderateText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    text: z.string().min(1).max(5000),
    context: z.enum(["job", "application", "inquiry"]).optional().default("job"),
  }).parse(input))
  .handler(async ({ data }) => {
    return callAiJson<{ allow: boolean; risk: "낮음" | "보통" | "높음"; categories: string[]; reason: string; cleaned: string }>([
      { role: "system", content: "구인-구직 플랫폼의 사용자 입력 텍스트를 검수합니다. 욕설, 차별/혐오, 성적 표현, 스팸/광고/외부 연락 유도, 사기/허위 정보, 개인정보 노출(주민번호·카드·계좌)을 감지하세요. JSON으로 {allow, risk(낮음/보통/높음), categories[], reason(한국어 1문장), cleaned(부적절 표현을 ***로 마스킹한 텍스트)} 형식으로만 답하세요. 위험이 '높음'이면 allow=false." },
      { role: "user", content: `[${data.context}] ${data.text}` },
    ], { allow: true, risk: "낮음", categories: [], reason: "검수 결과 정상으로 간주합니다.", cleaned: data.text });
  });

// === 광고 배너 AI 생성 (관리자 전용, 16:5) ===
export const generateAdBannerImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    description: z.string().min(2).max(500),
    title: z.string().max(120).optional().default(""),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI 기능을 사용할 수 없습니다");
    const prompt = `한국 모바일 앱용 가로형 광고 배너 (16:5 비율, 640x200px 노출). 광고 주제: "${data.title || data.description}". 상세: ${data.description}. 텍스트나 글자는 절대 넣지 마세요(나중에 따로 합성). 사람 얼굴 클로즈업 금지. 밝고 깔끔한 일러스트 또는 사진풍, 모바일에서 한눈에 보이는 강한 시각적 임팩트, 좌측 또는 우측에 메인 비주얼 배치하여 텍스트 공간 확보, 한국적이면서 세련된 톤.`;
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: IMAGE_MODEL, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] }),
    });
    if (!res.ok) throw new Error(`이미지 생성 실패 (${res.status})`);
    const json = await res.json() as any;
    const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!url) throw new Error("이미지를 생성하지 못했습니다");
    const base64 = String(url).includes(",") ? String(url).split(",").pop()! : String(url);
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const fileBody = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const path = `ai/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error } = await supabaseAdmin.storage.from("ad-banners").upload(path, fileBody, { contentType: "image/png", upsert: false });
    if (error) throw new Error(error.message);
    const { data: publicUrl } = supabaseAdmin.storage.from("ad-banners").getPublicUrl(path);
    return { imageUrl: publicUrl.publicUrl };
  });

// === 구직자 AI 채팅 매칭 ===
export const seekerJobChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    language: z.enum(["ko", "en", "mn", "ru", "zh"]).default("ko"),
    history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().max(2000),
    })).max(20),
    message: z.string().min(1).max(1000),
  }).parse(input))
  .handler(async ({ data }) => {
    const langName = { ko: "Korean (한국어)", en: "English", mn: "Mongolian (Монгол)", ru: "Russian (Русский, дружелюбный естественный тон)", zh: "Simplified Chinese (简体中文)" }[data.language];
    const validIndustries = ["hotel","motel","resort","restaurant","hospital","nursing"];
    const validRoles = ["room_cleaning","dish_cleaning","hall_serving","care"];
    const validRegions = ["서울","경기","인천","강원","충북","충남","대전","세종","전북","전남","광주","경북","경남","대구","울산","부산","제주"];
    const sys = `You are a friendly Korean short-term job matching assistant on the Find AR app. Reply ALWAYS in ${langName}. Naturally ask the seeker about: desired job type (industry/role), preferred region, minimum daily wage, language ability, dates. Keep replies SHORT (1-3 sentences). When you have enough info (at least region or industry/role), call out the criteria.

ALWAYS return a single JSON object only, no markdown:
{
  "reply": "your conversational reply in ${langName}",
  "ready": true|false,           // true if criteria are usable for searching
  "criteria": {
    "industries": [],            // subset of ${JSON.stringify(validIndustries)}
    "roles": [],                 // subset of ${JSON.stringify(validRoles)}
    "regions": [],               // subset of ${JSON.stringify(validRegions)}
    "minWage": null              // KRW per day, integer or null
  }
}`;
    const messages: AiMessage[] = [
      { role: "system", content: sys },
      ...data.history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];
    return callAiJson<{ reply: string; ready: boolean; criteria: { industries: string[]; roles: string[]; regions: string[]; minWage: number | null } }>(
      messages,
      { reply: data.language === "ko" ? "조금 더 알려주세요." : "Could you tell me more?", ready: false, criteria: { industries: [], roles: [], regions: [], minWage: null } },
      TEXT_MODEL,
    );
  });