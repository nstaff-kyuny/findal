// Static UI dictionaries for seeker side (ko/en/mn/ru/zh)
export type Lang = "ko" | "en" | "mn" | "ru" | "zh";

export const LANG_LABEL: Record<Lang, string> = {
  ko: "한국어",
  en: "English",
  mn: "Монгол",
  ru: "Русский",
  zh: "中文",
};

export const LANG_FLAG: Record<Lang, string> = {
  ko: "🇰🇷", en: "🇺🇸", mn: "🇲🇳", ru: "🇷🇺", zh: "🇨🇳",
};

type Dict = Record<string, Record<Lang, string>>;

// UI strings used across seeker screens
export const UI: Dict = {
  app_title: { ko: "Find AR", en: "Find AR", mn: "Find AR", ru: "Find AR", zh: "Find AR" },

  // tabs
  tab_home: { ko: "홈", en: "Home", mn: "Нүүр", ru: "Главная", zh: "首页" },
  tab_featured: { ko: "추천", en: "Featured", mn: "Санал болгох", ru: "Рекомендации", zh: "推荐" },
  tab_favorites: { ko: "즐겨찾기", en: "Favorites", mn: "Дуртай", ru: "Избранное", zh: "收藏" },
  tab_applications: { ko: "신청내역", en: "Applications", mn: "Хүсэлтүүд", ru: "Заявки", zh: "申请记录" },
  tab_me: { ko: "MY/설정", en: "My / Settings", mn: "Миний / Тохиргоо", ru: "Профиль / Настройки", zh: "我的/设置" },

  // common
  loading: { ko: "불러오는 중…", en: "Loading…", mn: "Ачааллаж байна…", ru: "Загрузка…", zh: "加载中…" },
  empty_jobs: { ko: "공고가 없습니다", en: "No jobs available", mn: "Зар алга", ru: "Вакансий нет", zh: "暂无职位" },
  empty_promoted: { ko: "진행중인 추천 공고가 없습니다", en: "No featured jobs", mn: "Санал болгох зар алга", ru: "Нет рекомендованных вакансий", zh: "暂无推荐职位" },
  empty_ads: { ko: "현재 광고가 없습니다", en: "No ads", mn: "Зар сурталчилгаа алга", ru: "Нет рекламы", zh: "暂无广告" },
  region: { ko: "지역", en: "Region", mn: "Бүс нутаг", ru: "Регион", zh: "地区" },
  all_regions: { ko: "전체 지역", en: "All regions", mn: "Бүх бүс", ru: "Все регионы", zh: "全部地区" },
  search_placeholder: { ko: "공고 검색", en: "Search jobs", mn: "Зар хайх", ru: "Поиск вакансий", zh: "搜索职位" },
  pull_to_search: { ko: "쓸어내려 검색하기", en: "Pull down to search", mn: "Доош татаж хайх", ru: "Потяните вниз для поиска", zh: "下拉搜索" },
  close_search: { ko: "검색 닫기", en: "Close search", mn: "Хайлт хаах", ru: "Закрыть поиск", zh: "关闭搜索" },
  pref_region_only: { ko: "선호지역만 보기", en: "Preferred regions only", mn: "Дуртай бүсээр", ru: "Только мои регионы", zh: "仅显示偏好地区" },
  my_pref_regions: { ko: "내 선호 지역", en: "My preferred regions", mn: "Миний дуртай бүс", ru: "Мои регионы", zh: "我的偏好地区" },
  no_pref_region: { ko: "설정된 선호 지역이 없습니다 · 전체 공고 표시", en: "No preferred region set · showing all", mn: "Дуртай бүс тохируулаагүй · бүгдийг харуулна", ru: "Регион не задан · показаны все", zh: "未设置偏好地区 · 显示全部" },

  // category buttons
  cat_all: { ko: "전체", en: "All", mn: "Бүгд", ru: "Все", zh: "全部" },
  cat_lodging: { ko: "호텔/모텔/리조트", en: "Hotel/Motel/Resort", mn: "Зочид буудал/Мотель/Амралт", ru: "Отель/Мотель/Курорт", zh: "酒店/汽车旅馆/度假村" },
  cat_restaurant: { ko: "식당", en: "Restaurant", mn: "Ресторан", ru: "Ресторан", zh: "餐厅" },
  cat_medical: { ko: "병원/요양", en: "Hospital/Care", mn: "Эмнэлэг/Сувилахуй", ru: "Больница/Уход", zh: "医院/护理" },

  // job card
  daily_wage: { ko: "일당", en: "Daily wage", mn: "Өдрийн цалин", ru: "Дневная оплата", zh: "日薪" },
  won: { ko: "원", en: "KRW", mn: "вон", ru: "вон", zh: "韩元" },
  work_dates: { ko: "근무일", en: "Work dates", mn: "Ажиллах өдөр", ru: "Рабочие дни", zh: "工作日" },
  to_be_arranged: { ko: "협의", en: "TBD", mn: "Тохиролцох", ru: "По договорённости", zh: "面议" },
  applicants: { ko: "지원", en: "Applicants", mn: "Өргөдөл", ru: "Откликов", zh: "申请人" },
  needed: { ko: "필요", en: "Needed", mn: "Шаардлагатай", ru: "Нужно", zh: "需要" },
  people: { ko: "명", en: "people", mn: "хүн", ru: "чел.", zh: "人" },
  ai_score: { ko: "AI 점수", en: "AI score", mn: "AI оноо", ru: "AI-оценка", zh: "AI 评分" },

  // sections / labels
  premium_section: { ko: "⭐ 프리미엄 추천", en: "⭐ Premium picks", mn: "⭐ Дээд зэрэглэлийн санал", ru: "⭐ Премиум подборка", zh: "⭐ 精选推荐" },
  today_section: { ko: "🎲 오늘의 추천", en: "🎲 Today's picks", mn: "🎲 Өнөөдрийн санал", ru: "🎲 Подборка дня", zh: "🎲 今日推荐" },
  ad_section: { ko: "📢 광고", en: "📢 Ads", mn: "📢 Зар сурталчилгаа", ru: "📢 Реклама", zh: "📢 广告" },
  guide_banner: { ko: "앱 사용법 확인 (신청·승인·확정·노쇼 안내)", en: "How to use the app (apply, approval, confirm, no-show)", mn: "Аппны заавар (хүсэлт, зөвшөөрөл, баталгаажуулалт, ирээгүй)", ru: "Как пользоваться (заявка, одобрение, подтверждение, не пришёл)", zh: "使用指南（申请·审批·确认·缺席）" },
  to_featured: { ko: "⭐ 추천 공고 보러가기 →", en: "⭐ See featured jobs →", mn: "⭐ Санал болгох зар үзэх →", ru: "⭐ К рекомендованным →", zh: "⭐ 查看推荐职位 →" },

  // favorites
  fav_title: { ko: "즐겨찾는 일터", en: "Favorite workplaces", mn: "Дуртай ажлын газар", ru: "Избранные места работы", zh: "收藏的工作地" },
  fav_empty: { ko: "즐겨찾는 일터가 없습니다.", en: "No favorite workplaces yet.", mn: "Дуртай ажлын газар алга.", ru: "Избранных мест нет.", zh: "暂无收藏的工作地。" },
  fav_hint: { ko: "공고 상세에서 ♥ 버튼을 눌러 등록하세요.", en: "Tap the heart on a job to add it.", mn: "Зарын дотор зүрхэн товчийг дарж нэмнэ.", ru: "Нажмите ♥ в вакансии, чтобы добавить.", zh: "在职位详情中点击 ♥ 添加。" },
  fav_active: { ko: "진행중 공고", en: "Active jobs", mn: "Идэвхтэй зар", ru: "Активные вакансии", zh: "进行中的职位" },
  fav_remove_confirm: { ko: "즐겨찾기에서 삭제하시겠습니까?", en: "Remove from favorites?", mn: "Дуртайгаас хасах уу?", ru: "Удалить из избранного?", zh: "从收藏中移除？" },
  fav_no_active: { ko: "현재 진행중인 공고가 없습니다", en: "No active jobs", mn: "Идэвхтэй зар алга", ru: "Нет активных вакансий", zh: "暂无进行中的职位" },
  count_suffix: { ko: "건", en: "", mn: "ш", ru: "шт.", zh: "条" },

  // applications
  apps_title: { ko: "나의 신청 내역", en: "My applications", mn: "Миний хүсэлтүүд", ru: "Мои заявки", zh: "我的申请记录" },
  apps_all: { ko: "전체 내역", en: "All", mn: "Бүгд", ru: "Все", zh: "全部" },
  apps_calendar: { ko: "일한 기록 보기", en: "Work calendar", mn: "Ажилласан хуанли", ru: "Календарь работ", zh: "工作记录" },
  apps_day: { ko: "일", en: "Day", mn: "Өдөр", ru: "День", zh: "日" },
  apps_week: { ko: "주", en: "Week", mn: "7 хоног", ru: "Неделя", zh: "周" },
  apps_month: { ko: "월", en: "Month", mn: "Сар", ru: "Месяц", zh: "月" },
  st_pending: { ko: "대기", en: "Pending", mn: "Хүлээгдэж буй", ru: "На рассмотрении", zh: "等待中" },
  st_approved: { ko: "승인", en: "Approved", mn: "Зөвшөөрсөн", ru: "Одобрено", zh: "已批准" },
  st_rejected: { ko: "거절", en: "Rejected", mn: "Татгалзсан", ru: "Отклонено", zh: "已拒绝" },
  st_confirmed: { ko: "✅ 승인 받음", en: "✅ Confirmed", mn: "✅ Баталгаажсан", ru: "✅ Подтверждено", zh: "✅ 已确认" },
  st_no_show: { ko: "노쇼", en: "No-show", mn: "Ирээгүй", ru: "Не явился", zh: "缺席" },
  st_cancelled: { ko: "취소됨", en: "Cancelled", mn: "Цуцалсан", ru: "Отменено", zh: "已取消" },
  apply_cancel: { ko: "신청 취소", en: "Cancel application", mn: "Хүсэлт цуцлах", ru: "Отменить заявку", zh: "取消申请" },
  apply_confirm_btn: { ko: "✋ 갈께요 (최종확정)", en: "✋ I'm going (Confirm)", mn: "✋ Очно (Баталгаажуулах)", ru: "✋ Приду (подтвердить)", zh: "✋ 我会去（确认）" },
  contact_btn: { ko: "연락하기", en: "Call", mn: "Холбоо барих", ru: "Позвонить", zh: "联系" },
  confirm_cancel: { ko: "신청을 취소하시겠습니까?", en: "Cancel this application?", mn: "Хүсэлтийг цуцлах уу?", ru: "Отменить заявку?", zh: "确定取消申请？" },

  // job detail / settings
  language_change: { ko: "언어 변경", en: "Language", mn: "Хэл", ru: "Язык", zh: "语言" },
  pick_language: { ko: "사용 언어 선택", en: "Choose your language", mn: "Хэлээ сонгоно уу", ru: "Выберите язык", zh: "选择您的语言" },
  pick_language_help: { ko: "메뉴와 공고가 선택한 언어로 표시됩니다.", en: "Menus and job posts will be shown in this language.", mn: "Цэс ба зарууд сонгосон хэлээр харагдана.", ru: "Меню и вакансии будут на этом языке.", zh: "菜单与职位将以所选语言显示。" },
  save: { ko: "저장", en: "Save", mn: "Хадгалах", ru: "Сохранить", zh: "保存" },
  cancel: { ko: "취소", en: "Cancel", mn: "Цуцлах", ru: "Отмена", zh: "取消" },

  // job detail
  ai_multilang_view: { ko: "AI 다국어 보기", en: "AI multilingual view", mn: "AI олон хэлээр", ru: "AI перевод", zh: "AI 多语言" },
  pay_day_label: { ko: "지급일", en: "Pay day", mn: "Цалин олгох өдөр", ru: "День выплаты", zh: "发薪日" },
  rooms_per_day: { ko: "일일 정비 객실수", en: "Rooms per day", mn: "Өдөрт цэвэрлэх өрөө", ru: "Комнат в день", zh: "每日客房数" },
  prep_label: { ko: "준비물", en: "Items to bring", mn: "Авч ирэх зүйл", ru: "Что взять с собой", zh: "需携带物品" },
  contact_after_approval: { ko: "📞 담당자 연락처는 승인 후 공개됩니다.", en: "📞 Contact info is revealed after approval.", mn: "📞 Холбоо барих мэдээллийг зөвшөөрсний дараа харуулна.", ru: "📞 Контакты будут видны после одобрения.", zh: "📞 联系方式将在批准后公开。" },
  approved_confirmed_job: { ko: "✅ 승인 확정된 공고입니다", en: "✅ Confirmed job", mn: "✅ Баталгаажсан зар", ru: "✅ Подтверждённая вакансия", zh: "✅ 已确认的职位" },
  approved_msg: { ko: "✅ 승인되었습니다", en: "✅ Approved", mn: "✅ Зөвшөөрсөн", ru: "✅ Одобрено", zh: "✅ 已批准" },
  contact_label: { ko: "담당자 연락처", en: "Contact", mn: "Холбоо барих", ru: "Контакт", zh: "联系人" },
  pending_btn: { ko: "신청 대기중…", en: "Pending…", mn: "Хүлээгдэж буй…", ru: "Ожидание…", zh: "等待中…" },
  rejected_btn: { ko: "거절됨", en: "Rejected", mn: "Татгалзсан", ru: "Отклонено", zh: "已拒绝" },
  cancelled_btn: { ko: "신청 취소됨", en: "Cancelled", mn: "Цуцалсан", ru: "Отменено", zh: "已取消" },
  ai_pre_questions: { ko: "AI 신청 전 확인 질문", en: "AI pre-apply questions", mn: "AI урьдчилсан асуулт", ru: "AI вопросы перед заявкой", zh: "AI 申请前问题" },
  msg_to_employer_ph: { ko: "구인자에게 보낼 메시지 (선택)", en: "Message to employer (optional)", mn: "Ажил олгогчид илгээх мессеж (заавал биш)", ru: "Сообщение работодателю (необязательно)", zh: "给雇主的留言（可选）" },
  want_to_work: { ko: "일하고 싶어요 (신청 보내기)", en: "I want to work (Apply)", mn: "Ажиллахыг хүсэж байна (Хүсэлт)", ru: "Хочу работать (Подать заявку)", zh: "我想工作（提交申请）" },
  back_to_apps: { ko: "← 신청/승인 내역으로", en: "← Back to applications", mn: "← Хүсэлт рүү буцах", ru: "← К моим заявкам", zh: "← 返回申请记录" },
  back: { ko: "← 뒤로", en: "← Back", mn: "← Буцах", ru: "← Назад", zh: "← 返回" },
  noshow_marked: { ko: "⚠️ 노쇼 처리됨", en: "⚠️ Marked as no-show", mn: "⚠️ Ирээгүй гэж тэмдэглэв", ru: "⚠️ Отмечено как не пришёл", zh: "⚠️ 已标记缺席" },
  see_approved_job: { ko: "일자리(승인) 확인", en: "View approved job", mn: "Зөвшөөрсөн зар үзэх", ru: "Открыть одобренную вакансию", zh: "查看已批准的职位" },
  delete_done: { ko: "삭제되었습니다", en: "Deleted", mn: "Устгасан", ru: "Удалено", zh: "已删除" },
  total_count: { ko: "총", en: "Total", mn: "Нийт", ru: "Всего", zh: "共" },
  no_records: { ko: "기록이 없습니다", en: "No records", mn: "Бичлэг алга", ru: "Нет записей", zh: "暂无记录" },
  pdf_download: { ko: "PDF 다운로드", en: "Download PDF", mn: "PDF татах", ru: "Скачать PDF", zh: "下载PDF" },
  confirmed_only_note: { ko: "확정 된 기록만 표시됩니다.", en: "Only confirmed records are shown.", mn: "Зөвхөн баталгаажсан бичлэг.", ru: "Показаны только подтверждённые.", zh: "仅显示已确认的记录。" },

  // onboarding
  onb_choose_lang: { ko: "사용 언어를 먼저 선택해 주세요", en: "Please choose your language first", mn: "Эхлээд хэлээ сонгоно уу", ru: "Сначала выберите язык, пожалуйста", zh: "请先选择您的语言" },

  // AI job match chat
  ai_match_title: { ko: "🤖 AI 채팅으로 추천받기", en: "🤖 Get AI recommendations", mn: "🤖 AI-аар санал авах", ru: "🤖 Подбор работы через AI", zh: "🤖 AI 智能推荐" },
  ai_match_subtitle: { ko: "원하는 직종·지역·급여를 채팅으로 알려주세요", en: "Tell me your preferred job, region, and pay", mn: "Хүссэн ажил, бүс, цалингаа надад хэлээрэй", ru: "Расскажите, какая работа, регион и зарплата вам подходят", zh: "告诉我您想要的职位、地区和薪资" },
  ai_match_greeting: { ko: "안녕하세요! 어떤 일을 찾고 계세요? 직종, 지역, 희망 일당을 알려주시면 맞춤 공고를 찾아드릴게요. 🙂", en: "Hi! What kind of job are you looking for? Tell me the role, region, and minimum daily wage and I'll find matching jobs.", mn: "Сайн байна уу! Ямар ажил хайж байна вэ? Ажлын төрөл, бүс, өдрийн доод цалингаа хэлбэл тохирох ажил олж өгье.", ru: "Здравствуйте! Какую работу вы ищете? Подскажите род занятий, регион и желаемую дневную оплату — подберу подходящие вакансии.", zh: "您好！您在找什么样的工作？告诉我职位、地区和最低日薪，我来帮您找匹配的岗位。" },
  ai_match_placeholder: { ko: "예: 서울에서 식당 일 하고 싶어요", en: "e.g., I want restaurant work in Seoul", mn: "ж: Сөүл хотод ресторанд ажиллахыг хүсч байна", ru: "Например: хочу работать в ресторане в Сеуле", zh: "例如：我想在首尔找餐厅工作" },
  ai_match_thinking: { ko: "AI가 생각 중…", en: "AI is thinking…", mn: "AI бодож байна…", ru: "AI думает…", zh: "AI 思考中…" },
  ai_match_results: { ko: "추천 공고", en: "Recommended jobs", mn: "Санал болгох зар", ru: "Рекомендуемые вакансии", zh: "推荐职位" },
  ai_match_send: { ko: "메시지 보내기", en: "Send message", mn: "Илгээх", ru: "Отправить", zh: "发送" },
  ai_match_error: { ko: "잠시 후 다시 시도해주세요.", en: "Please try again in a moment.", mn: "Түр хүлээгээд дахин оролдоно уу.", ru: "Попробуйте, пожалуйста, ещё раз чуть позже.", zh: "请稍后再试。" },

  // edit / save / saved
  edit: { ko: "수정", en: "Edit", mn: "Засах", ru: "Изменить", zh: "修改" },
  saved: { ko: "저장되었습니다", en: "Saved", mn: "Хадгалагдлаа", ru: "Сохранено", zh: "已保存" },

  // contract type
  contract_type: { ko: "급여 형태", en: "Wage type", mn: "Цалингийн төрөл", ru: "Тип оплаты", zh: "薪资类型" },
  contract_daily: { ko: "일당", en: "Daily wage", mn: "Өдрийн цалин", ru: "Подённая оплата", zh: "日薪" },
  contract_monthly: { ko: "단기계약(월급)", en: "Short-term (monthly)", mn: "Богино хугацаа (сарын)", ru: "Краткосрочный (месячный)", zh: "短期合同（月薪）" },
  monthly_wage: { ko: "월급여", en: "Monthly wage", mn: "Сарын цалин", ru: "Месячная зарплата", zh: "月薪" },
  contract_months: { ko: "계약 기간 (개월)", en: "Contract length (months)", mn: "Гэрээний хугацаа (сар)", ru: "Срок контракта (мес.)", zh: "合同期（月）" },
  one_month_plus: { ko: "1개월 이상", en: "1 month or more", mn: "1 сараас дээш", ru: "1 месяц и более", zh: "1个月以上" },
  per_month: { ko: "/월", en: "/mo", mn: "/сар", ru: "/мес", zh: "/月" },
  months_unit: { ko: "개월", en: "months", mn: "сар", ru: "мес.", zh: "个月" },

  // completed badge
  completed_badge: { ko: "완료", en: "Closed", mn: "Дууссан", ru: "Завершено", zh: "已结束" },
  show_completed: { ko: "마감 공고 보기", en: "Show closed jobs", mn: "Дууссан зар харах", ru: "Показать завершённые", zh: "显示已结束职位" },

  // detail location label (replaces "상세주소")
  detail_location: { ko: "상세위치", en: "Detailed location", mn: "Дэлгэрэнгүй байршил", ru: "Подробное место", zh: "详细位置" },

  // PC admin notice (employer mobile home)
  pc_admin_notice_title: { ko: "PC에서 더 편리하게 관리하세요", en: "Manage more easily on PC", mn: "PC дээр илүү тохиромжтой удирдаарай", ru: "Удобное управление с ПК", zh: "在电脑上更便捷地管理" },
  pc_admin_notice_body: { ko: "공고 등록, 신청 승인, 크레딧, 승인기록 다운로드 등은 아래 PC 관리자 페이지에서 더 빠르게 처리할 수 있습니다.", en: "Job posts, approvals, credits, and history downloads are faster on the PC admin page below.", mn: "Зар, зөвшөөрөл, кредит, түүхийг доорх PC удирдлагын хуудаснаас илүү хурдан хийнэ.", ru: "Объявления, одобрения, кредиты и история — быстрее на ПК по ссылке ниже.", zh: "在下方电脑管理页面可更快处理招聘、审批、积分和记录下载。" },
  pc_admin_site_url: { ko: "https://findar.nstaff.co.kr/manager", en: "https://findar.nstaff.co.kr/manager", mn: "https://findar.nstaff.co.kr/manager", ru: "https://findar.nstaff.co.kr/manager", zh: "https://findar.nstaff.co.kr/manager" },
};

export function t(key: string, lang: Lang): string {
  return UI[key]?.[lang] ?? UI[key]?.ko ?? key;
}

// Industry / role / region maps
export const INDUSTRY_I18N: Record<string, Record<Lang, string>> = {
  hotel: { ko: "호텔", en: "Hotel", mn: "Зочид буудал", ru: "Отель", zh: "酒店" },
  motel: { ko: "모텔", en: "Motel", mn: "Мотель", ru: "Мотель", zh: "汽车旅馆" },
  resort: { ko: "리조트", en: "Resort", mn: "Амралтын газар", ru: "Курорт", zh: "度假村" },
  restaurant: { ko: "식당", en: "Restaurant", mn: "Ресторан", ru: "Ресторан", zh: "餐厅" },
  hospital: { ko: "병원", en: "Hospital", mn: "Эмнэлэг", ru: "Больница", zh: "医院" },
  nursing: { ko: "요양원", en: "Nursing home", mn: "Асрамжийн газар", ru: "Дом ухода", zh: "养老院" },
};

export const ROLE_I18N: Record<string, Record<Lang, string>> = {
  room_cleaning: { ko: "객실청소", en: "Room cleaning", mn: "Өрөө цэвэрлэгээ", ru: "Уборка номеров", zh: "客房清洁" },
  dish_cleaning: { ko: "기물청소(설겆이)", en: "Dishwashing", mn: "Аяга таваг угаах", ru: "Мытьё посуды", zh: "洗碗" },
  hall_serving: { ko: "홀써빙", en: "Hall serving", mn: "Зал үйлчилгээ", ru: "Обслуживание зала", zh: "大厅服务" },
  care: { ko: "간병", en: "Patient care", mn: "Асаргаа", ru: "Уход за больными", zh: "护理" },
};

export const REGION_I18N: Record<string, Record<Lang, string>> = {
  서울: { ko: "서울", en: "Seoul", mn: "Сөүл", ru: "Сеул", zh: "首尔" },
  경기: { ko: "경기", en: "Gyeonggi", mn: "Гёнги", ru: "Кёнгидо", zh: "京畿" },
  인천: { ko: "인천", en: "Incheon", mn: "Инчон", ru: "Инчхон", zh: "仁川" },
  강원: { ko: "강원", en: "Gangwon", mn: "Канвон", ru: "Канвондо", zh: "江原" },
  충북: { ko: "충북", en: "Chungbuk", mn: "Чунбук", ru: "Чхунбук", zh: "忠北" },
  충남: { ko: "충남", en: "Chungnam", mn: "Чуннам", ru: "Чхуннам", zh: "忠南" },
  대전: { ko: "대전", en: "Daejeon", mn: "Дэжон", ru: "Тэджон", zh: "大田" },
  세종: { ko: "세종", en: "Sejong", mn: "Сэжон", ru: "Седжон", zh: "世宗" },
  전북: { ko: "전북", en: "Jeonbuk", mn: "Жонбук", ru: "Чонбук", zh: "全北" },
  전남: { ko: "전남", en: "Jeonnam", mn: "Жоннам", ru: "Чоннам", zh: "全南" },
  광주: { ko: "광주", en: "Gwangju", mn: "Кванжу", ru: "Кванджу", zh: "光州" },
  경북: { ko: "경북", en: "Gyeongbuk", mn: "Гёнбук", ru: "Кёнбук", zh: "庆北" },
  경남: { ko: "경남", en: "Gyeongnam", mn: "Гённам", ru: "Кённам", zh: "庆南" },
  대구: { ko: "대구", en: "Daegu", mn: "Дэгү", ru: "Тэгу", zh: "大邱" },
  울산: { ko: "울산", en: "Ulsan", mn: "Үлсан", ru: "Ульсан", zh: "蔚山" },
  부산: { ko: "부산", en: "Busan", mn: "Бусан", ru: "Пусан", zh: "釜山" },
  제주: { ko: "제주", en: "Jeju", mn: "Жэжү", ru: "Чеджу", zh: "Чеджу" }, // ru fallback
};

export function tIndustry(key: string, lang: Lang) { return INDUSTRY_I18N[key]?.[lang] ?? key; }
export function tRole(key: string, lang: Lang) { return ROLE_I18N[key]?.[lang] ?? key; }
export function tRegion(key: string, lang: Lang) { return REGION_I18N[key]?.[lang] ?? key; }
