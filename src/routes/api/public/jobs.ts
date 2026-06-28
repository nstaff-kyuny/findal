import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/jobs")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      GET: async () => {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data, error } = await supabase
          .from("jobs")
          .select(
            "id, title, region, location, place_name, industry, job_role, contract_type, daily_wage, monthly_wage, contract_months, work_dates, headcount, photo_url, created_at",
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return Response.json({ data: [] }, { status: 200 });
        return Response.json(
          { data },
          {
            headers: {
              "access-control-allow-origin": "*",
              "cache-control": "public, max-age=60",
            },
          },
        );
      },
    },
  },
});
