import { Button } from "@/components/ui/button";
import { REGIONS } from "@/lib/constants";
import { toast } from "sonner";

export const MAX_REGIONS = 3;

export function parseRegions(v: string | null | undefined): string[] {
  if (!v) return [];
  return v.split(",").map(s => s.trim()).filter(Boolean);
}
export function serializeRegions(arr: string[]): string {
  return arr.join(",");
}

export function RegionPicker({
  value, onChange, max = MAX_REGIONS, compact = false,
}: { value: string[]; onChange: (v: string[]) => void; max?: number; compact?: boolean }) {
  const toggle = (r: string) => {
    if (value.includes(r)) {
      onChange(value.filter(x => x !== r));
    } else {
      if (value.length >= max) {
        toast.error(`최대 ${max}개까지 선택할 수 있습니다`);
        return;
      }
      onChange([...value, r]);
    }
  };
  return (
    <div>
      <div className={compact ? "grid grid-cols-9 gap-1" : "grid grid-cols-4 gap-1.5"}>
        {REGIONS.map(r => (
          <Button
            key={r}
            type="button"
            size="sm"
            variant={value.includes(r) ? "default" : "outline"}
            className={compact ? "h-7 px-2 text-[11px]" : "h-10 text-sm"}
            onClick={() => toggle(r)}
          >
            {r}
          </Button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        선택됨 {value.length} / {max} {value.length > 0 && `· ${value.join(", ")}`}
      </p>
    </div>
  );
}
