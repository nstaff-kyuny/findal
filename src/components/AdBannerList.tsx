import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

type Banner = { id: string; title: string; image_url: string | null; link_url: string | null };

/** Active ad banners for one audience, shuffled, up to `limit` shown. */
export function AdBannerList({
  audience,
  title = "📢 광고",
  emptyText,
  limit = 3,
}: {
  audience: "seeker" | "employer";
  title?: string;
  emptyText?: string;
  limit?: number;
}) {
  const [ads, setAds] = useState<Banner[]>([]);
  useEffect(() => {
    (async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("ad_banners")
        .select("id,title,image_url,link_url")
        .eq("audience", audience)
        .eq("active", true)
        .lte("starts_at", now)
        .gte("ends_at", now)
        .limit(20);
      setAds(((data ?? []) as Banner[]).sort(() => Math.random() - 0.5).slice(0, limit));
    })();
  }, [audience, limit]);

  if (ads.length === 0 && !emptyText) return null;

  return (
    <section>
      <h2 className="font-bold mb-2">{title}</h2>
      <div className="space-y-2">
        {ads.length === 0 && <p className="text-xs text-muted-foreground">{emptyText}</p>}
        {ads.map((a) => (
          <a key={a.id} href={a.link_url ?? "#"} target="_blank" rel="noopener" className="block">
            <Card className="overflow-hidden">
              {a.image_url ? (
                <div className="w-full aspect-[16/5] bg-muted">
                  <img src={a.image_url} className="w-full h-full object-cover" alt={a.title} />
                </div>
              ) : (
                <div className="w-full aspect-[16/5] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <p className="font-semibold text-sm px-3 text-center">{a.title}</p>
                </div>
              )}
              {a.image_url && <div className="px-3 py-1.5 text-xs font-semibold truncate">{a.title}</div>}
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}
