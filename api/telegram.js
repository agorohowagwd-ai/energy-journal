import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Telegram API error: ${response.status}`)
  return response.json()
}

// Messages use HTML formatting: bold headings, monospace commands.
// Anything the user typed must go through esc() before it is inserted.
function esc(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

async function say(chatId, text, extra = {}) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...extra,
  })
}

function parseEnergyMessage(text) {
  // Examples: "Прогулка — энергия 8", "Walk — energy 8", "Работа, 4/10", "Workout energy: 9"
  const match = text.match(/(?:(?:энергия|energy)\s*[:=]?\s*|\b)(10|[1-9])\s*(?:\/\s*10)?\s*$/i)
  if (!match) return null
  const score = Number(match[1])
  const activity = text.slice(0, match.index).replace(/[—–,:;\s-]+$/g, "").trim()
  if (!activity || activity.length > 120) return null
  return { activity, energy: score }
}

// Bot copy. The language follows the user's Telegram app language (ru → Russian, otherwise English).
const TEXT = {
  en: {
    help:
      "<b>THRIVE</b>\n" +
      "Hi! I help you notice what gives you energy.\n\n" +
      "<b>01 — Connect</b>\n" +
      "Open Thrive, create a connection code and send:\n<code>/link YOUR_CODE</code>\n\n" +
      "<b>02 — Entries</b>\n" +
      "Just send a message, for example:\n<code>Walk — energy 8</code>\n<code>Project work, 4/10</code>\n\n" +
      "<b>03 — Commands</b>\n" +
      "/today — today's entries\n/stats — average energy\n<code>/reminder 20:00</code> — daily reminder time\n<code>/reminder off</code> — turn reminders off",
    linkMissing: "Open the Thrive website and copy the connection code from your account. Then send <code>/link CODE</code>.",
    linkInvalid: "<b>Code not found or expired.</b>\nCreate a new code on the website and try again.",
    linked: "<b>Done.</b> Telegram is connected to your journal.\n\nThe daily reminder is set to 20:00 Moscow time by default.\nChange it: <code>/reminder 21:00</code>",
    notLinked: "Connect your account first: open the Thrive website, create a connection code and send <code>/link CODE</code>.",
    remindersOff: "Daily reminders are off.\nTo turn them back on, send <code>/reminder 20:00</code>",
    reminderFormat: "Use the HH:MM format, for example <code>/reminder 20:00</code>\nCurrent time zone: Europe/Moscow.",
    reminderSet: (value) => `<b>Done.</b> I'll remind you every day at ${value} Moscow time.\nTo turn off: <code>/reminder off</code>`,
    todayEmpty: "No entries today yet. Try:\n<code>Walk — energy 8</code>",
    todayTitle: "TODAY",
    statsEmpty: "Not enough entries for stats yet. Add your first one:\n<code>Walk — energy 8</code>",
    statsTitle: "YOUR STATS",
    avgLabel: "average energy",
    countLabel: "entries",
    most: "Most energy after",
    least: "Least energy after",
    statsNote: "These are early hints based on your ratings — look for recurring patterns rather than conclusions from a single entry.",
    unparsed: "I couldn't read that entry. Write the activity with a rating at the end, for example:\n<code>Walk — energy 8</code>\n<code>Project work, 4/10</code>",
    saved: "Saved",
    drained: "↘ Looks like this took energy.",
    boosted: "↗ Looks like this gave you energy.",
    neutral: "Noted — patterns will show over time.",
  },
  ru: {
    help:
      "<b>THRIVE</b>\n" +
      "Привет! Я помогу замечать, что даёт тебе силы.\n\n" +
      "<b>01 — Подключение</b>\n" +
      "Открой Thrive, создай код подключения и отправь:\n<code>/link ТВОЙ_КОД</code>\n\n" +
      "<b>02 — Записи</b>\n" +
      "Пиши обычным сообщением, например:\n<code>Прогулка — энергия 8</code>\n<code>Работа над проектом, 4/10</code>\n\n" +
      "<b>03 — Команды</b>\n" +
      "/today — записи за сегодня\n/stats — средняя энергия\n<code>/reminder 20:00</code> — время ежедневного напоминания\n<code>/reminder off</code> — отключить напоминания",
    linkMissing: "Открой сайт Thrive и скопируй код подключения из своего аккаунта. Затем отправь <code>/link КОД</code>.",
    linkInvalid: "<b>Код не найден или истёк.</b>\nСоздай новый код на сайте и попробуй ещё раз.",
    linked: "<b>Готово.</b> Telegram подключён к твоему дневнику.\n\nПо умолчанию ежедневное напоминание — в 20:00 по Москве.\nИзменить: <code>/reminder 21:00</code>",
    notLinked: "Сначала подключи аккаунт: открой сайт Thrive, создай код подключения и отправь <code>/link КОД</code>.",
    remindersOff: "Ежедневные напоминания отключены.\nЧтобы включить, отправь <code>/reminder 20:00</code>",
    reminderFormat: "Укажи время в формате ЧЧ:ММ, например <code>/reminder 20:00</code>\nЧасовой пояс сейчас — Europe/Moscow.",
    reminderSet: (value) => `<b>Готово.</b> Буду напоминать каждый день в ${value} по московскому времени.\nЧтобы отключить: <code>/reminder off</code>`,
    todayEmpty: "Сегодня записей пока нет. Напиши, например:\n<code>Прогулка — энергия 8</code>",
    todayTitle: "СЕГОДНЯ",
    statsEmpty: "Пока недостаточно записей для статистики. Добавь первую:\n<code>Прогулка — энергия 8</code>",
    statsTitle: "ТВОЯ СТАТИСТИКА",
    avgLabel: "средняя энергия",
    countLabel: "записей",
    most: "Больше всего сил",
    least: "Меньше всего сил",
    statsNote: "Это первые подсказки по оценкам — ищи повторяющиеся закономерности, а не делай вывод по одной записи.",
    unparsed: "Не совсем понял запись. Напиши занятие и оценку в конце, например:\n<code>Прогулка — энергия 8</code>\n<code>Работа над проектом, 4/10</code>",
    saved: "Записал(а)",
    drained: "↘ Похоже, это отняло силы.",
    boosted: "↗ Похоже, это добавило энергии.",
    neutral: "Отмечено — со временем увидим закономерности.",
  },
}

function languageOf(message) {
  return String(message.from?.language_code || "").toLowerCase().startsWith("ru") ? "ru" : "en"
}

function localDate(timeZone = "Europe/Moscow") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date())
}

async function linkedUser(chatId) {
  const { data, error } = await supabase
    .from("telegram_users").select("user_id, chat_id, timezone, reminder_time")
    .eq("chat_id", String(chatId)).maybeSingle()
  if (error) throw error
  return data
}

async function handleMessage(message) {
  const chatId = message.chat.id
  const text = (message.text || "").trim()
  if (!text) return
  const lang = languageOf(message)
  const t = TEXT[lang]

  if (text.startsWith("/start") || text.startsWith("/help")) {
    return say(chatId, t.help)
  }

  if (text.startsWith("/link")) {
    const code = text.split(/\s+/)[1]?.trim()
    if (!code) return say(chatId, t.linkMissing)
    const { data: pairing, error } = await supabase
      .from("telegram_link_codes")
      .select("user_id, expires_at")
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()
    if (error) throw error
    if (!pairing) return say(chatId, t.linkInvalid)

    const { error: linkError } = await supabase.from("telegram_users").upsert({
      user_id: pairing.user_id,
      chat_id: String(chatId),
      timezone: "Europe/Moscow",
      reminder_time: "20:00",
      reminders_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    if (linkError) throw linkError

    const { error: useError } = await supabase.from("telegram_link_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("code", code)
    if (useError) throw useError
    await rememberLanguage(chatId, lang)
    return say(chatId, t.linked)
  }

  const user = await linkedUser(chatId)
  if (!user) return say(chatId, t.notLinked)
  await rememberLanguage(chatId, lang)

  if (text.startsWith("/reminder")) {
    const value = text.split(/\s+/)[1]
    if (!value || value.toLowerCase() === "off") {
      const { error } = await supabase.from("telegram_users")
        .update({ reminders_enabled: false, updated_at: new Date().toISOString() })
        .eq("chat_id", String(chatId))
      if (error) throw error
      return say(chatId, t.remindersOff)
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      return say(chatId, t.reminderFormat)
    }
    const { error } = await supabase.from("telegram_users")
      .update({ reminder_time: value, reminders_enabled: true, updated_at: new Date().toISOString() })
      .eq("chat_id", String(chatId))
    if (error) throw error
    return say(chatId, t.reminderSet(esc(value)))
  }

  if (text.startsWith("/today")) {
    const { data, error } = await supabase.from("entries")
      .select("activity, energy, mood, notes, date")
      .eq("user_id", user.user_id)
      .eq("date", localDate(user.timezone))
      .order("created_at", { ascending: false })
    if (error) throw error
    if (!data?.length) return say(chatId, t.todayEmpty)
    const body = data.map((entry) =>
      `<b>${esc(entry.energy)}/10</b>  ${esc(entry.activity)} ${esc(entry.mood || "")}` +
      (entry.notes ? `\n<i>${esc(entry.notes)}</i>` : ""),
    ).join("\n\n")
    return say(chatId, `<b>${t.todayTitle}</b> · ${data.length}\n\n${body}`)
  }

  if (text.startsWith("/stats")) {
    const { data, error } = await supabase.from("entries")
      .select("energy, activity, date").eq("user_id", user.user_id)
    if (error) throw error
    if (!data?.length) return say(chatId, t.statsEmpty)
    const average = data.reduce((sum, item) => sum + Number(item.energy || 0), 0) / data.length
    const highest = [...data].sort((a, b) => Number(b.energy) - Number(a.energy))[0]
    const lowest = [...data].sort((a, b) => Number(a.energy) - Number(b.energy))[0]
    return say(chatId,
      `<b>${t.statsTitle}</b>\n\n` +
      `<b>${average.toFixed(1)}/10</b> — ${t.avgLabel}\n` +
      `<b>${data.length}</b> — ${t.countLabel}\n\n` +
      `↗ ${t.most}: ${esc(highest.activity)} (${esc(highest.energy)}/10)\n` +
      `↘ ${t.least}: ${esc(lowest.activity)} (${esc(lowest.energy)}/10)\n\n` +
      `<i>${t.statsNote}</i>`,
    )
  }

  const parsed = parseEnergyMessage(text)
  if (!parsed) return say(chatId, t.unparsed)

  const { error } = await supabase.from("entries").insert({
    user_id: user.user_id,
    activity: parsed.activity,
    notes: "",
    energy: parsed.energy,
    category: "Other",
    mood: "🙂",
    date: localDate(user.timezone),
  })
  if (error) throw error
  const verdict = parsed.energy <= 5 ? t.drained : parsed.energy >= 8 ? t.boosted : t.neutral
  return say(chatId, `<b>${t.saved}</b>\n${esc(parsed.activity)} — <b>${parsed.energy}/10</b>\n\n${verdict}`)
}

// Stores the user's Telegram language so evening reminders use it.
// Needs the optional `language` column (see supabase/telegram.sql); silently skipped without it.
async function rememberLanguage(chatId, lang) {
  try {
    await supabase.from("telegram_users").update({ language: lang }).eq("chat_id", String(chatId))
  } catch {
    // column missing or update failed: reminders fall back to English
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed")
  if (!BOT_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).send("Bot environment is not configured")
  }
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).send("Unauthorized")
  }
  try {
    if (req.body?.message) await handleMessage(req.body.message)
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error("Telegram webhook error:", error?.message || error)
    return res.status(200).json({ ok: true })
  }
}
