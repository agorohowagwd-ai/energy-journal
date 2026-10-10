// Interface copy in English (default, as in the first Thrive version) and Russian.
// The chosen language is remembered per browser in localStorage.

export const LANGS = ["en", "ru"]

const STORAGE_KEY = "thrive-lang"

export function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LANGS.includes(saved)) return saved
  } catch {
    // storage unavailable: fall through to default
  }
  return "en"
}

export function saveLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // ignore
  }
}

// Categories are stored in the database by their English key.
// Older entries may contain Russian names, so both are mapped.
const CATEGORY_LABELS = {
  Work: { en: "Work", ru: "Работа" },
  Health: { en: "Health", ru: "Здоровье" },
  Study: { en: "Study", ru: "Учёба" },
  Social: { en: "Social", ru: "Общение" },
  Rest: { en: "Rest", ru: "Отдых" },
  Other: { en: "Other", ru: "Другое" },
  Sport: { en: "Sport", ru: "Спорт" },
  Home: { en: "Home", ru: "Дом" },
  Commute: { en: "Commute", ru: "Дорога" },
}
const RU_TO_KEY = Object.fromEntries(
  Object.entries(CATEGORY_LABELS).map(([key, labels]) => [labels.ru, key]),
)

export function categoryLabel(value, lang) {
  if (!value) return CATEGORY_LABELS.Other[lang]
  const key = CATEGORY_LABELS[value] ? value : RU_TO_KEY[value]
  return key ? CATEGORY_LABELS[key][lang] : value
}

// Mood is stored as a word key. Older entries stored an emoji, so map those for display.
const MOOD_FROM_EMOJI = { "😣": "hard", "😕": "low", "😐": "neutral", "🙂": "good", "😊": "great", "😃": "great", "⚡": "charged" }
const EXTRA_MOODS = { hard: { en: "Hard", ru: "Тяжело" }, low: { en: "Not great", ru: "Не очень" } }

export function moodLabel(value, lang) {
  if (!value) return ""
  const key = MOOD_FROM_EMOJI[value] || value
  return T[lang].moods[key] || EXTRA_MOODS[key]?.[lang] || ""
}

export const T = {
  en: {
    locale: "en-US",
    switchTo: "RU",
    switchLabel: "Переключить на русский",

    moods: { good: "Good", neutral: "Neutral", great: "Great", charged: "Charged" },
    energyLabels: ["Drains a lot of energy", "Mostly drains energy", "Neutral", "Mostly gives energy", "Energizing"],

    msgAccountCreated: "Account created. Confirm your email if asked, then sign in.",
    msgNeedActivity: "Add an activity first.",
    msgSessionEnded: "Your session has ended. Please sign in again.",
    msgSaved: "Entry saved.",

    landingTag: "Personal energy system",
    landingEyebrow: "Welcome to Thrive",
    landingTitle1: "Your personal",
    landingTitle2: "energy operating system.",
    landingCopy: "Log daily activity, mood and energy levels. Understand patterns in your focus and performance, and build habits that improve your energy over time.",
    landingButton: "Start Thrive",
    landingFootnote: "Track energy · Detect patterns · Build consistency",
    badge: "TRACK · DETECT · UNLOCK · THRIVE ·",

    back: "← Back",
    welcomeBack: "Welcome back",
    createAccount: "Create account",
    authLoginCopy: "Continue tracking your energy.",
    authSignupCopy: "Your entries are stored in your personal account.",
    name: "Name",
    namePlaceholder: "What should we call you",
    email: "Email",
    password: "Password",
    passwordPlaceholder: "At least 6 characters",
    wait: "Please wait…",
    signIn: "Sign in",
    toSignup: "No account? Create one",
    toLogin: "Already have an account? Sign in",

    energyScore: "Energy Score",
    personalIndex: "Personal index",
    entriesLabel: "Entries",
    streakLabel: "Streak",
    navigation: "Navigation",
    nav: { overview: "Dashboard", analytics: "Analytics", journal: "Timeline", insights: "Insights" },
    recentActivity: "Recent Activity",
    noEntries: "No entries yet",
    premium: "Premium",
    premiumTitle: "AI Energy Insights",
    premiumCopy: "Forecast trends, detect patterns and discover your peak performance.",
    logout: "Logout",

    dashboard: "Dashboard",
    dashboardCopy: "Track energy, detect patterns, and unlock AI insights",

    kpi: [
      ["Average", "Energy level"],
      ["Peak", "Highest value"],
      ["Low", "Minimum energy"],
      ["Streak", "Active days"],
    ],

    aiCoach: "AI Coach",
    aiTitle: "Energy Intelligence",
    live: "Live Analysis",
    aiEmpty: "Start logging entries to unlock personalized AI-powered energy insights.",
    observations: {
      high: { text: "Your recent entries show consistently strong energy levels. You perform best when activity remains structured and predictable.", pattern: "High Stability", recovery: "Strong" },
      mid: { text: "Your energy remains stable but fluctuates throughout the week. Small improvements in routine consistency could increase performance.", pattern: "Moderate Stability", recovery: "Moderate" },
      low: { text: "Recent entries indicate lower energy patterns. Recovery, sleep quality and workload balance may require attention.", pattern: "Variable Energy", recovery: "Needs Attention" },
    },
    pattern: "Pattern",
    peakEnergy: "Peak Energy",
    recovery: "Recovery",
    mostEnergy: "Most energy after",
    leastEnergy: "Least energy after",

    ranges: { week: "Week", month: "Month", year: "Year" },
    energyTimeline: "Energy Timeline",
    view: "View",
    points: "points",
    needTwo: "Add at least two entries",
    energyWord: "Energy",

    logEyebrow: "01 — Log",
    logTitle: "Log Energy",
    activity: "Activity",
    notes: "Notes",
    energy: "Energy",
    category: "Category",
    mood: "Mood",
    date: "Date",
    saving: "Saving…",
    save: "Save Entry",
    historyEyebrow: "02 — History",
    timeline: "Timeline",
  },

  ru: {
    locale: "ru-RU",
    switchTo: "EN",
    switchLabel: "Switch to English",

    moods: { good: "Хорошо", neutral: "Нейтрально", great: "Отлично", charged: "Заряжен(а)" },
    energyLabels: ["Сильно забирает силы", "Скорее забирает силы", "Нейтрально", "Скорее даёт силы", "Заряжает"],

    msgAccountCreated: "Аккаунт создан. Если потребуется, подтверди почту и войди.",
    msgNeedActivity: "Напиши, чем ты занимался(ась).",
    msgSessionEnded: "Сессия завершилась. Войди в аккаунт ещё раз.",
    msgSaved: "Запись сохранена.",

    landingTag: "Личная система энергии",
    landingEyebrow: "Добро пожаловать в Thrive",
    landingTitle1: "Твоя личная",
    landingTitle2: "система энергии.",
    landingCopy: "Записывай дела, настроение и уровень энергии. Замечай закономерности в своей концентрации и продуктивности и выстраивай привычки, которые со временем добавляют сил.",
    landingButton: "Начать",
    landingFootnote: "Отслеживай энергию · Замечай закономерности · Будь последовательным",
    badge: "ЗАМЕЧАЙ · ЗАПИСЫВАЙ · НАБЛЮДАЙ ·",

    back: "← Назад",
    welcomeBack: "С возвращением",
    createAccount: "Создать аккаунт",
    authLoginCopy: "Продолжи наблюдать за своей энергией.",
    authSignupCopy: "Твои записи будут храниться в личном аккаунте.",
    name: "Имя",
    namePlaceholder: "Как к тебе обращаться",
    email: "Электронная почта",
    password: "Пароль",
    passwordPlaceholder: "Не менее 6 символов",
    wait: "Подожди…",
    signIn: "Войти",
    toSignup: "Нет аккаунта? Создать",
    toLogin: "Уже есть аккаунт? Войти",

    energyScore: "Индекс энергии",
    personalIndex: "Личный показатель",
    entriesLabel: "Записей",
    streakLabel: "Серия",
    navigation: "Навигация",
    nav: { overview: "Обзор", analytics: "Аналитика", journal: "Журнал", insights: "Наблюдения" },
    recentActivity: "Недавние записи",
    noEntries: "Записей пока нет",
    premium: "Premium",
    premiumTitle: "AI-аналитика энергии",
    premiumCopy: "Прогнозируй тренды, замечай закономерности и находи свои пики продуктивности.",
    logout: "Выйти",

    dashboard: "Обзор",
    dashboardCopy: "Отслеживай энергию, замечай закономерности и получай подсказки",

    kpi: [
      ["Средняя", "Уровень энергии"],
      ["Пик", "Самая высокая оценка"],
      ["Минимум", "Самая низкая оценка"],
      ["Серия", "Дней подряд"],
    ],

    aiCoach: "AI-коуч",
    aiTitle: "Анализ энергии",
    live: "Живой анализ",
    aiEmpty: "Начни добавлять записи, чтобы получить персональные подсказки об энергии.",
    observations: {
      high: { text: "Последние записи показывают стабильно высокий уровень энергии. Лучше всего ты чувствуешь себя, когда день структурирован и предсказуем.", pattern: "Высокая стабильность", recovery: "Хорошее" },
      mid: { text: "Энергия в целом стабильна, но колеблется в течение недели. Небольшие улучшения в распорядке могут добавить сил.", pattern: "Умеренная стабильность", recovery: "Среднее" },
      low: { text: "Последние записи показывают сниженный уровень энергии. Стоит обратить внимание на восстановление, сон и нагрузку.", pattern: "Переменчивая энергия", recovery: "Требует внимания" },
    },
    pattern: "Закономерность",
    peakEnergy: "Пик энергии",
    recovery: "Восстановление",
    mostEnergy: "Больше всего сил после",
    leastEnergy: "Меньше всего сил после",

    ranges: { week: "Неделя", month: "Месяц", year: "Год" },
    energyTimeline: "Динамика энергии",
    view: "",
    points: "точек",
    needTwo: "Добавь хотя бы две записи",
    energyWord: "Энергия",

    logEyebrow: "01 — Запись",
    logTitle: "Записать энергию",
    activity: "Дело или занятие",
    notes: "Заметки",
    energy: "Энергия",
    category: "Категория",
    mood: "Настроение",
    date: "Дата",
    saving: "Сохраняю…",
    save: "Сохранить запись",
    historyEyebrow: "02 — История",
    timeline: "Журнал",
  },
}
