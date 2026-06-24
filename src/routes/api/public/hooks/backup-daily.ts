import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/backup-daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-backup-secret");
        if (!secret || secret !== process.env.PUSH_WEBHOOK_SECRET) {
          return new Response("unauthorized", { status: 401 });
        }
        try {
          const { runScheduledBackup } = await import("@/lib/backups.functions");
          const r = await runScheduledBackup();
          return Response.json(r);
        } catch (e: any) {
          return Response.json({ error: String(e?.message ?? e) }, { status: 500 });
        }
      },
    },
  },
});
