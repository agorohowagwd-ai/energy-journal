import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

async function sendMessage(chatId, text) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  if (!response.ok) throw new Error(`Telegram sendMessage failed: ${response.status}`)
}

function timeInZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value
  return `${get("hour")}:${get("minute")}`
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).send("Method Not Allowed")
  const authorization = req.headers.authorization
  if (!process.env.CRON_SECRET || authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).send("Unauthorized")
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.TELEGRAM_BOT_TOKEN) {
    return res.status(500).send("Reminder environment is not configured")
  }

  try {
    const now = new Date()
    const { data: users, error } = await supabase.from("telegram_users")
      .select("user_id, chat_id, timezone, reminder_time")
      .eq("reminders_enabled", true)
    if (error) throw error

    let sent = 0
    for (const user of users || []) {
      const timezone = user.timezone || "Europe/Moscow"
      if (timeInZone(now, timezone) !== user.reminder_time) continue

      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      }).format(now)

      const { data: existing, error: checkError } = await supabase.from("telegram_reminder_log")
        .select("id").eq("user_id", user.user_id).eq("reminder_date", date).maybeSingle()
      if (checkError) throw checkError
      if (existing) continue

      const { data: entries, error: entriesError } = await supabase.from("entries")
        .select("energy").eq("user_id", user.user_id).eq("date", date)
      if (entriesError) throw entriesError

      const prompt = entries?.length
        ? `Как прошёл твой день? 🌿\nСегодня ты добавил(а) ${entries.length} ${entries.length === 1 ? "запись" : "записей"} в дневник. Средняя энергия — ${(entries.reduce((sum, entry) => sum + Number(entry.energy || 0), 0) / entries.length).toFixed(1)}/10.\n\nЧто сегодня дало тебе силы, а что их забрало? Можешь ответить прямо здесь: «Прогулка — энергия 8».`
        : "Небольшая пауза для себя 🌿\nКак ты сегодня себя чувствовал(а)? Запиши одно занятие и оцени энергию от 1 до 10. Например: «Прогулка — энергия 8»."
      await sendMessage(user.chat_id, prompt)
      const { error: logError } = await supabase.from("telegram_reminder_log").insert({
        user_id: user.user_id, reminder_date: date,
      })
      if (logError) throw logError
      sent += 1
    }
    return res.status(200).json({ ok: true, sent })
  } catch (error) {
    console.error("Reminder job error:", error?.message || error)
    return res.status(500).json({ error: "Reminder job failed" })
  }
}
