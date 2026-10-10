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
  // Examples: "Прогулка — энергия 8", "Работа, 4/10", "Тренировка энергия: 9"
  const match = text.match(/(?:энергия\s*[:=]?\s*|\b)(10|[1-9])\s*(?:\/\s*10)?\s*$/i)
  if (!match) return null
  const score = Number(match[1])
  const activity = text.slice(0, match.index).replace(/[—–,:;\s-]+$/g, "").trim()
  if (!activity || activity.length > 120) return null
  return { activity, energy: score }
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

  if (text.startsWith("/start") || text.startsWith("/help")) {
    return say(chatId,
      "<b>ДНЕВНИК ЭНЕРГИИ</b>\n" +
      "Привет! Я помогу замечать, что даёт тебе силы.\n\n" +
      "<b>01 — Подключение</b>\n" +
      "Открой Energy Journal, создай код подключения и отправь:\n<code>/link ТВОЙ_КОД</code>\n\n" +
      "<b>02 — Записи</b>\n" +
      "Пиши обычным сообщением, например:\n<code>Прогулка — энергия 8</code>\n<code>Работа над проектом, 4/10</code>\n\n" +
      "<b>03 — Команды</b>\n" +
      "/today — записи за сегодня\n/stats — средняя энергия\n<code>/reminder 20:00</code> — время ежедневного напоминания\n<code>/reminder off</code> — отключить напоминания",
    )
  }

  if (text.startsWith("/link")) {
    const code = text.split(/\s+/)[1]?.trim()
    if (!code) return say(chatId, "Открой сайт Energy Journal и скопируй код подключения из своего аккаунта. Затем отправь <code>/link КОД</code>.")
    const { data: pairing, error } = await supabase
      .from("telegram_link_codes")
      .select("user_id, expires_at")
      .eq("code", code)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()
    if (error) throw error
    if (!pairing) return say(chatId, "<b>Код не найден или истёк.</b>\nСоздай новый код на сайте и попробуй ещё раз.")

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
    return say(chatId, "<b>Готово.</b> Telegram подключён к твоему дневнику.\n\nПо умолчанию ежедневное напоминание — в 20:00 по Москве.\nИзменить: <code>/reminder 21:00</code>")
  }

  const user = await linkedUser(chatId)
  if (!user) return say(chatId, "Сначала подключи аккаунт: открой сайт Energy Journal, создай код подключения и отправь <code>/link КОД</code>.")

  if (text.startsWith("/reminder")) {
    const value = text.split(/\s+/)[1]
    if (!value || value.toLowerCase() === "off") {
      const { error } = await supabase.from("telegram_users")
        .update({ reminders_enabled: false, updated_at: new Date().toISOString() })
        .eq("chat_id", String(chatId))
      if (error) throw error
      return say(chatId, "Ежедневные напоминания отключены.\nЧтобы включить, отправь <code>/reminder 20:00</code>")
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      return say(chatId, "Укажи время в формате ЧЧ:ММ, например <code>/reminder 20:00</code>\nЧасовой пояс сейчас — Europe/Moscow.")
    }
    const { error } = await supabase.from("telegram_users")
      .update({ reminder_time: value, reminders_enabled: true, updated_at: new Date().toISOString() })
      .eq("chat_id", String(chatId))
    if (error) throw error
    return say(chatId, `<b>Готово.</b> Буду напоминать каждый день в ${esc(value)} по московскому времени.\nЧтобы отключить: <code>/reminder off</code>`)
  }

  if (text.startsWith("/today")) {
    const { data, error } = await supabase.from("entries")
      .select("activity, energy, mood, notes, date")
      .eq("user_id", user.user_id)
      .eq("date", localDate(user.timezone))
      .order("created_at", { ascending: false })
    if (error) throw error
    if (!data?.length) return say(chatId, "Сегодня записей пока нет. Напиши, например:\n<code>Прогулка — энергия 8</code>")
    const body = data.map((entry) =>
      `<b>${esc(entry.energy)}/10</b>  ${esc(entry.activity)} ${esc(entry.mood || "")}` +
      (entry.notes ? `\n<i>${esc(entry.notes)}</i>` : ""),
    ).join("\n\n")
    return say(chatId, `<b>СЕГОДНЯ</b> · ${data.length}\n\n${body}`)
  }

  if (text.startsWith("/stats")) {
    const { data, error } = await supabase.from("entries")
      .select("energy, activity, date").eq("user_id", user.user_id)
    if (error) throw error
    if (!data?.length) return say(chatId, "Пока недостаточно записей для статистики. Добавь первую:\n<code>Прогулка — энергия 8</code>")
    const average = data.reduce((sum, item) => sum + Number(item.energy || 0), 0) / data.length
    const highest = [...data].sort((a, b) => Number(b.energy) - Number(a.energy))[0]
    const lowest = [...data].sort((a, b) => Number(a.energy) - Number(b.energy))[0]
    return say(chatId,
      `<b>ТВОЯ СТАТИСТИКА</b>\n\n` +
      `<b>${average.toFixed(1)}/10</b> — средняя энергия\n` +
      `<b>${data.length}</b> — записей\n\n` +
      `↗ Больше всего сил: ${esc(highest.activity)} (${esc(highest.energy)}/10)\n` +
      `↘ Меньше всего сил: ${esc(lowest.activity)} (${esc(lowest.energy)}/10)\n\n` +
      `<i>Это первые подсказки по оценкам — ищи повторяющиеся закономерности, а не делай вывод по одной записи.</i>`,
    )
  }

  const parsed = parseEnergyMessage(text)
  if (!parsed) {
    return say(chatId, "Не совсем понял запись. Напиши занятие и оценку в конце, например:\n<code>Прогулка — энергия 8</code>\n<code>Работа над проектом, 4/10</code>")
  }

  const { error } = await supabase.from("entries").insert({
    user_id: user.user_id,
    activity: parsed.activity,
    notes: "",
    energy: parsed.energy,
    category: "Другое",
    mood: "🙂",
    date: localDate(user.timezone),
  })
  if (error) throw error
  const verdict = parsed.energy <= 5
    ? "↘ Похоже, это отняло силы."
    : parsed.energy >= 8
      ? "↗ Похоже, это добавило энергии."
      : "Отмечено — со временем увидим закономерности."
  return say(chatId, `<b>Записал(а)</b>\n${esc(parsed.activity)} — <b>${parsed.energy}/10</b>\n\n${verdict}`)
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
