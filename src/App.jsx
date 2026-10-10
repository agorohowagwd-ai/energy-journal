import { useEffect, useMemo, useState } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { supabase } from "./supabase"
import "./App.css"

const CATEGORIES = [
  "Работа",
  "Спорт",
  "Отдых",
  "Общение",
  "Дом",
  "Здоровье",
  "Дорога",
  "Другое",
]
const MOODS = [
  { value: "😣", label: "Тяжело" },
  { value: "😕", label: "Не очень" },
  { value: "😐", label: "Нейтрально" },
  { value: "🙂", label: "Хорошо" },
  { value: "😊", label: "Отлично" },
]

function localDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function energyLabel(value) {
  if (value <= 3) return "Сильно забирает силы"
  if (value <= 5) return "Скорее забирает силы"
  if (value <= 6) return "Нейтрально"
  if (value <= 8) return "Скорее даёт силы"
  return "Заряжает"
}

function energyTone(value) {
  if (value <= 3) return "low"
  if (value <= 5) return "medium-low"
  if (value <= 6) return "neutral"
  if (value <= 8) return "medium-high"
  return "high"
}

export default function App() {
  const [session, setSession] = useState(null)
  const [view, setView] = useState("landing")
  const [mode, setMode] = useState("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const [activity, setActivity] = useState("")
  const [notes, setNotes] = useState("")
  const [energy, setEnergy] = useState(6)
  const [category, setCategory] = useState("Работа")
  const [mood, setMood] = useState("🙂")
  const [entryDate, setEntryDate] = useState(localDate())
  const [entries, setEntries] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setErrorMessage(error.message)
      setSession(data?.session ?? null)
      if (data?.session) {
        setView("app")
        loadEntries()
      }
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setView(nextSession ? "app" : "landing")
      if (nextSession) loadEntries()
      else setEntries([])
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function loadEntries() {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) return

    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })

    if (error) {
      setErrorMessage(error.message)
      return
    }
    setEntries(data ?? [])
  }

  async function signUp(event) {
    event?.preventDefault()
    setLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    })

    setLoading(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }

    setMode("login")
    setSuccessMessage("Аккаунт создан. Если потребуется, подтверди почту и войди.")
  }

  async function signIn(event) {
    event?.preventDefault()
    setLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }

    setView("app")
    await loadEntries()
  }

  async function logout() {
    setErrorMessage("")
    const { error } = await supabase.auth.signOut()
    if (error) setErrorMessage(error.message)
    else {
      setSession(null)
      setEntries([])
      setView("landing")
    }
  }

  async function addEntry(event) {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    if (!activity.trim()) {
      setErrorMessage("Напиши, чем ты занимался(ась).")
      return
    }

    setSaving(true)
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      setSaving(false)
      setErrorMessage("Сессия завершилась. Войди в аккаунт ещё раз.")
      return
    }

    const { error } = await supabase.from("entries").insert({
      user_id: userData.user.id,
      activity: activity.trim(),
      notes: notes.trim(),
      energy: Number(energy),
      category,
      mood,
      date: entryDate,
    })

    setSaving(false)
    if (error) {
      setErrorMessage(error.message)
      return
    }

    setActivity("")
    setNotes("")
    setEnergy(6)
    setMood("🙂")
    setEntryDate(localDate())
    setSuccessMessage("Запись сохранена.")
    await loadEntries()
  }

  const averageEnergy = useMemo(() => {
    if (!entries.length) return null
    return (
      entries.reduce((sum, entry) => sum + Number(entry.energy || 0), 0) /
      entries.length
    ).toFixed(1)
  }, [entries])

  const todayEntries = useMemo(
    () => entries.filter((entry) => entry.date === localDate()),
    [entries],
  )

  const bestEntry = useMemo(() => {
    if (!entries.length) return null
    return entries.reduce((best, entry) =>
      Number(entry.energy) > Number(best.energy) ? entry : best,
    )
  }, [entries])

  const hardestEntry = useMemo(() => {
    if (!entries.length) return null
    return entries.reduce((worst, entry) =>
      Number(entry.energy) < Number(worst.energy) ? entry : worst,
    )
  }, [entries])

  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))
      const isoDate = localDate(date)
      const dayEntries = entries.filter((entry) => entry.date === isoDate)
      const average = dayEntries.length
        ? dayEntries.reduce((sum, entry) => sum + Number(entry.energy || 0), 0) /
          dayEntries.length
        : null

      return {
        day: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        energy: average === null ? null : Number(average.toFixed(1)),
      }
    })
  }, [entries])

  if (view === "landing") {
    return (
      <main className="landing">
        <div className="landing-glow landing-glow-one" />
        <div className="landing-glow landing-glow-two" />
        <section className="landing-content">
          <div className="brand-mark" aria-hidden="true">e.</div>
          <p className="eyebrow">ЛИЧНЫЙ ДНЕВНИК НАБЛЮДЕНИЙ</p>
          <h1>Замечай, что<br /><span>даёт тебе силы.</span></h1>
          <p className="landing-copy">
            Записывай повседневные дела, оценивай своё состояние и постепенно
            замечай, что наполняет энергией, а что истощает.
          </p>
          <button className="button button-primary landing-button" onClick={() => setView("auth")}>
            Открыть дневник <span aria-hidden="true">↗</span>
          </button>
          <p className="landing-footnote">Твои наблюдения. Твой темп. Без оценок и гонки за продуктивностью.</p>
        </section>
      </main>
    )
  }

  if (view === "auth") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <button className="back-link" onClick={() => { setView("landing"); setErrorMessage(""); }}>
            ← На главную
          </button>
          <div className="brand-mark small-mark">e.</div>
          <h1>{mode === "login" ? "С возвращением" : "Создать аккаунт"}</h1>
          <p className="muted">{mode === "login" ? "Продолжи наблюдать за своей энергией." : "Твои записи будут храниться в личном аккаунте."}</p>
          <form onSubmit={mode === "login" ? signIn : signUp} className="auth-form">
            {mode === "signup" && (
              <label>Имя
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Как к тебе обращаться" autoComplete="name" />
              </label>
            )}
            <label>Электронная почта
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </label>
            <label>Пароль
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Не менее 6 символов" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required />
            </label>
            {errorMessage && <p className="message message-error">{errorMessage}</p>}
            {successMessage && <p className="message message-success">{successMessage}</p>}
            <button className="button button-primary full-button" type="submit" disabled={loading}>
              {loading ? "Подожди…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>
          <button className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErrorMessage(""); setSuccessMessage(""); }}>
            {mode === "login" ? "Нет аккаунта? Создать" : "Уже есть аккаунт? Войти"}
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand brand-link" href="#top" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark small-mark">e.</span>
          <span>дневник энергии</span>
        </a>
        <div className="topbar-right">
          <span className="user-email">{session?.user?.email}</span>
          <button className="button button-quiet" onClick={logout}>Выйти</button>
        </div>
      </header>

      <div className="dashboard" id="top">
        <section className="main-column">
          <div className="page-heading">
            <p className="eyebrow">ТВОЁ ПРОСТРАНСТВО</p>
            <h1>Как ты сегодня?</h1>
            <p className="muted">Не нужно помнить всё — просто фиксируй то, что замечаешь.</p>
          </div>

          {errorMessage && <p className="message message-error">{errorMessage}</p>}
          {successMessage && <p className="message message-success">{successMessage}</p>}

          <section className="panel entry-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">НОВАЯ ЗАПИСЬ</p>
                <h2>Что ты делал(а)?</h2>
              </div>
              <span className="panel-icon" aria-hidden="true">＋</span>
            </div>

            <form onSubmit={addEntry} className="entry-form">
              <label className="field-full">Дело или занятие
                <input value={activity} onChange={(event) => setActivity(event.target.value)} placeholder="Например, прогулка, работа над проектом…" maxLength={120} required />
              </label>

              <div className="field-row">
                <label>Категория
                  <select value={category} onChange={(event) => setCategory(event.target.value)}>
                    {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>Дата
                  <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required />
                </label>
              </div>

              <fieldset className="rating-field">
                <div className="rating-heading">
                  <legend>Сколько энергии осталось после?</legend>
                  <strong className={`rating-number tone-${energyTone(Number(energy))}`}>{energy}<span>/10</span></strong>
                </div>
                <input className="energy-range" type="range" min="1" max="10" value={energy} onChange={(event) => setEnergy(Number(event.target.value))} aria-label="Уровень энергии от 1 до 10" />
                <div className="range-labels"><span>1 · Совсем без сил</span><span>10 · Полон(а) сил</span></div>
                <p className={`energy-hint tone-text-${energyTone(Number(energy))}`}>{energyLabel(Number(energy))}</p>
              </fieldset>

              <fieldset className="mood-field">
                <legend>Как ты себя чувствовал(а)?</legend>
                <div className="mood-options">
                  {MOODS.map((item) => (
                    <button key={item.value} type="button" className={`mood-option ${mood === item.value ? "selected" : ""}`} onClick={() => setMood(item.value)} aria-pressed={mood === item.value}>
                      <span>{item.value}</span><small>{item.label}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="field-full">Заметки <span className="optional-label">необязательно</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Что повлияло на состояние? Что хочется запомнить?" rows={3} maxLength={1000} />
              </label>

              <button className="button button-primary full-button" type="submit" disabled={saving}>
                {saving ? "Сохраняю…" : "Сохранить запись"}
              </button>
            </form>
          </section>

          <section className="panel chart-panel">
            <div className="panel-heading chart-heading">
              <div>
                <p className="eyebrow">ЗА ПОСЛЕДНИЕ 7 ДНЕЙ</p>
                <h2>Динамика энергии</h2>
              </div>
              <span className="chart-legend"><span />Средняя энергия</span>
            </div>
            {entries.length === 0 ? (
              <div className="chart-empty">
                <span aria-hidden="true">↗</span>
                <p>Здесь появится график, когда ты добавишь первые записи.</p>
              </div>
            ) : (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData} margin={{ top: 12, right: 12, bottom: 4, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ecebe7" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "#88877f", fontSize: 12 }} />
                    <YAxis domain={[1, 10]} ticks={[1, 3, 5, 7, 10]} tickLine={false} axisLine={false} tick={{ fill: "#88877f", fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e8e6e0", fontSize: 13 }} formatter={(value) => [`${value}/10`, "Энергия"]} />
                    <Line type="monotone" dataKey="energy" stroke="#617b63" strokeWidth={3} dot={{ r: 4, fill: "#617b63", strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="chart-note">Оценивай своё состояние после дела. Низкая оценка не означает, что занятие плохое — она помогает заметить его влияние на тебя.</p>
          </section>
        </section>

        <aside className="side-column">
          <section className="stats-grid">
            <article className="stat-card">
              <span className="stat-label">Записей сегодня</span>
              <strong>{todayEntries.length}</strong>
              <span className="stat-footnote">маленькие наблюдения важны</span>
            </article>
            <article className="stat-card">
              <span className="stat-label">Средняя энергия</span>
              <strong>{averageEnergy ?? "—"}<small>{averageEnergy !== null ? "/10" : ""}</small></strong>
              <span className="stat-footnote">за всё время</span>
            </article>
          </section>

          <section className="panel insight-panel">
            <p className="eyebrow">ТВОИ НАБЛЮДЕНИЯ</p>
            <h2>Что замечаешь?</h2>
            {bestEntry ? (
              <div className="insight-item">
                <span className="insight-symbol positive">↗</span>
                <div><span className="insight-label">Больше всего сил после</span><strong>{bestEntry.activity}</strong><span className="insight-score">{bestEntry.energy}/10 · {bestEntry.date}</span></div>
              </div>
            ) : <p className="muted insight-empty">Добавь несколько записей, чтобы увидеть первые наблюдения.</p>}
            {hardestEntry && (
              <div className="insight-item">
                <span className="insight-symbol negative">↘</span>
                <div><span className="insight-label">Меньше всего сил после</span><strong>{hardestEntry.activity}</strong><span className="insight-score">{hardestEntry.energy}/10 · {hardestEntry.date}</span></div>
              </div>
            )}
            <p className="insight-disclaimer">Это подсказки по твоим оценкам, а не окончательные выводы. Смотри на повторяющиеся закономерности.</p>
          </section>

          <section className="panel history-panel">
            <div className="panel-heading history-heading">
              <div><p className="eyebrow">ТВОИ ЗАМЕТКИ</p><h2>История</h2></div>
              <span className="history-count">{entries.length}</span>
            </div>
            {entries.length === 0 ? (
              <p className="muted history-empty">Пока пусто. Первая запись — начало наблюдения.</p>
            ) : (
              <div className="history-list">
                {entries.map((entry) => (
                  <article className="history-entry" key={entry.id ?? `${entry.date}-${entry.activity}-${entry.created_at}`}>
                    <div className="history-entry-top">
                      <span className="category-dot" />
                      <span className="history-category">{entry.category || "Другое"}</span>
                      <time>{entry.date}</time>
                    </div>
                    <div className="history-title-row">
                      <h3>{entry.activity}</h3>
                      <span className={`history-energy tone-${energyTone(Number(entry.energy))}`}>{entry.energy}/10</span>
                    </div>
                    <p className="history-meta">{entry.mood || "🙂"}{entry.notes ? ` · ${entry.notes}` : ""}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
          <p className="privacy-note">🔒 Записи доступны только в твоём аккаунте.</p>
        </aside>
      </div>
    </main>
  )
}
