/**
 * FCM HTTP v1 발송 (네이티브 앱: Android FCM / iOS APNs via Firebase).
 * 서비스 계정 JSON 은 FCM_SERVICE_ACCOUNT_JSON 시크릿으로 주입합니다.
 * WebCrypto 만 사용하므로 Worker 런타임에서 안전합니다.
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

function b64url(bytes: Uint8Array | string): string {
  let s = "";
  if (typeof bytes === "string") s = bytes;
  else for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const input = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input));
  const jwt = `${input}.${b64url(new Uint8Array(sigBuf))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`FCM token error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json: any = await res.json();
  cachedToken = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return cachedToken.token;
}

export function getServiceAccount(): ServiceAccount | null {
  const raw = process.env["FCM_SERVICE_ACCOUNT_JSON"];
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null;
    return sa as ServiceAccount;
  } catch {
    return null;
  }
}

export type FcmSendResult = { sent: number; staleTokens: string[] };

export async function sendFcmToTokens(
  tokens: Array<{ token: string; platform: string }>,
  msg: { title: string; body: string; link_url?: string; notification_id?: string; type?: string },
): Promise<FcmSendResult> {
  const sa = getServiceAccount();
  if (!sa || tokens.length === 0) return { sent: 0, staleTokens: [] };

  const accessToken = await getAccessToken(sa);
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const data: Record<string, string> = {
    link_url: msg.link_url ?? "/notifications",
  };
  if (msg.notification_id) data["notification_id"] = msg.notification_id;
  if (msg.type) data["type"] = msg.type;

  let sent = 0;
  const staleTokens: string[] = [];

  await Promise.all(
    tokens.map(async (t) => {
      const message: any = {
        token: t.token,
        notification: { title: msg.title, body: msg.body },
        data,
        android: {
          priority: "HIGH",
          notification: { sound: "default", default_vibrate_timings: true },
        },
        apns: {
          headers: { "apns-priority": "10" },
          payload: { aps: { sound: "default", badge: 1 } },
        },
      };
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        if (res.ok) {
          sent++;
          return;
        }
        const text = await res.text().catch(() => "");
        if (res.status === 404 || res.status === 400 || /UNREGISTERED|INVALID_ARGUMENT/i.test(text)) {
          staleTokens.push(t.token);
        }
        console.warn("[fcm] send failed", res.status, text.slice(0, 200));
      } catch (e: any) {
        console.warn("[fcm] error", e?.message || e);
      }
    }),
  );

  return { sent, staleTokens };
}
