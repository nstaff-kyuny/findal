// Fallback hero images by industry (Unsplash, free to use)
export const INDUSTRY_FALLBACK_IMAGE: Record<string, string> = {
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  motel: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
  resort: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
  hospital: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&q=80",
  nursing: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&q=80",
};

export const INDUSTRY_GRADIENT: Record<string, string> = {
  hotel: "from-blue-500 to-indigo-600",
  motel: "from-purple-500 to-pink-600",
  resort: "from-teal-400 to-cyan-600",
  restaurant: "from-orange-500 to-red-600",
  hospital: "from-emerald-500 to-teal-600",
  nursing: "from-rose-400 to-pink-500",
};

export const INDUSTRY_EMOJI: Record<string, string> = {
  hotel: "🏨",
  motel: "🛏️",
  resort: "🌴",
  restaurant: "🍽️",
  hospital: "🏥",
  nursing: "💊",
};

export function formatWorkDates(dates: string[] | null | undefined): string {
  if (!dates || dates.length === 0) return "협의";
  return dates
    .map(d => {
      const parts = d.split("-");
      if (parts.length !== 3) return d;
      return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
    })
    .join(", ");
}

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function formatWorkDatesWithWeekday(dates: string[] | null | undefined): string {
  if (!dates || dates.length === 0) return "";
  return dates
    .map(d => {
      const parts = d.split("-");
      if (parts.length !== 3) return d;
      const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return `${parseInt(parts[1])}/${parseInt(parts[2])} (${WEEKDAYS_KO[dt.getDay()]})`;
    })
    .join(", ");
}
