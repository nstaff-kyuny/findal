import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { buildPushHTTPRequest } from "@pushforge/builder";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendFcmToTokens } from "@/lib/fcm.server";

// base64url helpers
function b64urlToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Convert raw VAPID keys (web-push format) to JWK that PushForge expects.
// Public key: uncompressed P-256 point (65 bytes: 0x04 || x(32) || y(32)) in base64url.
// Private key: 32-byte scalar (d) in base64url.
function vapidToJWK(publicRawB64u: string, privateRawB64u: string): JsonWebKey {
  const pub = b64urlToBytes(publicRawB64u);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY must be uncompressed P-256 point (65 bytes, base64url)");
  }
  const x = pub.slice(1, 33);
  const y = pub.slice(33, 65);
  const d = b64urlToBytes(privateRawB64u);
  if (d.length !== 32) throw new Error("VAPID_PRIVATE_KEY must be 32 bytes (base64url)");
  return {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(x),
    y: bytesToB64url(y),
    d: bytesToB64url(d),
  };
}

export const Route = createFileRoute("/api/public/send-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PUSH_WEBHOOK_SECRET;
        const vapidPub = process.env.VAPID_PUBLIC_KEY;
        const vapidPriv = process.env.VAPID_PRIVATE_KEY;
        const vapidSub = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

        if (!secret || !vapidPub || !vapidPriv) {
          return new Response("Server not configured", { status: 500 });
        }

        const body = await request.text();
        const sig = request.headers.get("x-webhook-signature") || "";
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        let ok = false;
        try {
          const a = Buffer.from(sig, "hex");
          const b = Buffer.from(expected, "hex");
          ok = a.length === b.length && timingSafeEqual(a, b);
        } catch {
          ok = false;
        }
        if (!ok) return new Response("Invalid signature", { status: 401 });

        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const userId: string | undefined = payload.user_id;
        if (!userId) return new Response("Missing user_id", { status: 400 });

        const pushPayload = {
          title: payload.title,
          body: payload.body,
          link_url: payload.link_url,
          notification_id: payload.notification_id,
          type: payload.type,
        };

        // ---- 1) 네이티브 앱(FCM/APNs) 발송 ----
        let nativeSent = 0;
        let nativeRemoved = 0;
        try {
          const { data: nativeTokens } = await supabaseAdmin
            .from("native_push_tokens")
            .select("token, platform")
            .eq("user_id", userId);
          if (nativeTokens && nativeTokens.length > 0) {
            const res = await sendFcmToTokens(nativeTokens as any, {
              title: String(payload.title ?? "Find AR"),
              body: String(payload.body ?? ""),
              link_url: payload.link_url,
              notification_id: payload.notification_id,
              type: payload.type,
            });
            nativeSent = res.sent;
            if (res.staleTokens.length > 0) {
              await supabaseAdmin.from("native_push_tokens").delete().in("token", res.staleTokens);
              nativeRemoved = res.staleTokens.length;
            }
          }
        } catch (e: any) {
          console.warn("[send-push] native push failed", e?.message || e);
        }

        // ---- 2) 웹푸시(브라우저/PWA) 발송 ----
        let privateJWK: JsonWebKey;
        try {
          privateJWK = vapidToJWK(vapidPub, vapidPriv);
        } catch (e: any) {
          console.error("[send-push] VAPID JWK build failed", e?.message);
          return new Response("VAPID config error", { status: 500 });
        }

        const { data: subs, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", userId);

        if (error) {
          console.error("[send-push] db error", error);
          return new Response("DB error", { status: 500 });
        }
        if (!subs || subs.length === 0) {
          return Response.json({ sent: nativeSent, native_sent: nativeSent, removed: nativeRemoved });
        }

        let sent = 0;
        const stale: string[] = [];

        await Promise.all(
          subs.map(async (s) => {
            try {
              const { endpoint, headers, body: reqBody } = await buildPushHTTPRequest({
                privateJWK,
                subscription: {
                  endpoint: s.endpoint,
                  keys: { p256dh: s.p256dh, auth: s.auth },
                },
                message: {
                  payload: pushPayload,
                  adminContact: vapidSub,
                  // NOTE: pushforge sets JWT exp = now + ttl. Apple web push rejects
                  // exp >= 24h with "BadJwtToken". Keep ttl < 24h (use 12h).
                  options: { ttl: 60 * 60 * 12, urgency: "high" },
                },
              });
              const res = await fetch(endpoint, { method: "POST", headers, body: reqBody });
              if (res.status === 201 || res.status === 202 || res.status === 200) {
                sent++;
              } else if (res.status === 404 || res.status === 410) {
                stale.push(s.id);
              } else {
                const text = await res.text().catch(() => "");
                console.warn("[send-push] push failed", res.status, text.slice(0, 200));
              }
            } catch (err: any) {
              console.warn("[send-push] error", err?.message || err);
            }
          })
        );

        if (stale.length > 0) {
          await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
        }

        return Response.json({
          sent: sent + nativeSent,
          web_sent: sent,
          native_sent: nativeSent,
          removed: stale.length + nativeRemoved,
        });
      },
    },
  },
});

