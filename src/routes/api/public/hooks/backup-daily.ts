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
