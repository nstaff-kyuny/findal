import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const checkEmailDuplicate = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data }) => {
    const target = data.email.trim().toLowerCase();
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      for (const u of list.users) {
        if (u.email?.toLowerCase() === target) {
          return { exists: true };
        }
      }
      if (list.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }
    return { exists: false };
  });
