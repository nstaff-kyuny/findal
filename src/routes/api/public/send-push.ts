import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

        webpush.setVapidDetails(vapidSub, vapidPub, vapidPriv);

        const { data: subs, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", userId);

        if (error) {
          console.error("[send-push] db error", error);
          return new Response("DB error", { status: 500 });
        }
        if (!subs || subs.length === 0) {
          return Response.json({ sent: 0 });
        }

        const pushPayload = JSON.stringify({
          title: payload.title,
          body: payload.body,
          link_url: payload.link_url,
          notification_id: payload.notification_id,
          type: payload.type,
        });

        let sent = 0;
        const stale: string[] = [];

        await Promise.all(
          subs.map(async (s) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: s.endpoint,
                  keys: { p256dh: s.p256dh, auth: s.auth },
                },
                pushPayload,
                { TTL: 60 * 60 * 24 }
              );
              sent++;
            } catch (err: any) {
              const status = err?.statusCode;
              if (status === 404 || status === 410) {
                stale.push(s.id);
              } else {
                console.warn("[send-push] failed", status, err?.body || err?.message);
              }
            }
          })
        );

        if (stale.length > 0) {
          await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
        }

        return Response.json({ sent, removed: stale.length });
      },
    },
  },
});
