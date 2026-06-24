import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/backup-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-backup-secret") ?? "";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: cfg } = await (supabaseAdmin as any)
            .from("cron_config")
            .select("value")
            .eq("key", "backup_secret")
            .maybeSingle();
          if (!cfg?.value || provided !== cfg.value) {
            return new Response("unauthorized", { status: 401 });
          }
          const { runBackup } = await import("@/lib/backups.server");
          const r = await runBackup("scheduled");
          return Response.json(r);
        } catch (e: any) {
          return Response.json({ error: String(e?.message ?? e) }, { status: 500 });
        }
      },
    },
  },
});
