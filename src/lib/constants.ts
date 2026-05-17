export const INDUSTRY_LABEL: Record<string, string> = {
  hotel: "호텔",
  motel: "모텔",
  resort: "리조트",
  restaurant: "식당",
  hospital: "병원",
  nursing: "요양원",
};

export const ROLE_LABEL: Record<string, string> = {
  room_cleaning: "객실청소",
  dish_cleaning: "기물청소(설겆이)",
  hall_serving: "홀써빙",
  care: "간병",
};

export const ROLES_BY_INDUSTRY: Record<string, string[]> = {
  hotel: ["room_cleaning", "dish_cleaning"],
  motel: ["room_cleaning", "dish_cleaning"],
  resort: ["room_cleaning", "dish_cleaning"],
  restaurant: ["dish_cleaning", "hall_serving"],
  hospital: ["care"],
  nursing: ["care"],
};

export const VISA_LABEL: Record<string, string> = {
  student: "학생(D-2/D-4)",
  jobseeker: "구직(D-10)",
  resident: "거주(F-2/F-5/F-6)",
  other: "기타",
};

export const NATIONALITY_LABEL: Record<string, string> = {
  foreigner: "외국인",
  korean: "내국인",
};

export const REGIONS = [
  "서울", "경기", "인천", "강원", "충북", "충남", "대전", "세종",
  "전북", "전남", "광주", "경북", "경남", "대구", "울산", "부산", "제주",
];

export const PROMOTION_OPTIONS = [
  { value: "d2", label: "2일 (10 크레딧)", credits: 10 },
  { value: "d5", label: "5일 (20 크레딧)", credits: 20 },
  { value: "d10", label: "10일 (25 크레딧)", credits: 25 },
];

export const CREDIT_PACKS = [
  { qty: 20, price: 20000 },
  { qty: 50, price: 50000 },
  { qty: 100, price: 100000 },
];
