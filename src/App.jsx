import { useEffect, useMemo, useState } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from "recharts"
import { supabase } from "./supabase"
import "./App.css"

const CATEGORIES = ["Work", "Health", "Study", "Social", "Rest", "Other"]
const MOODS = [
  { value: "🙂", label: "Good" },
  { value: "😐", label: "Neutral" },
  { value: "😃", label: "Great" },
  { value: "⚡", label: "Charged" },
]

function localDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function energyLabel(value) {
  if (value <= 3) return "Drains a lot of energy"
  if (value <= 5) return "Mostly drains energy"
  if (value <= 6) return "Neutral"
  if (value <= 8) return "Mostly gives energy"
  return "Energizing"
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
  const [category, setCategory] = useState("Work")
  const [mood, setMood] = useState("🙂")
  const [entryDate, setEntryDate] = useState(localDate())
  const [entries, setEntries] = useState([])
  const [saving, setSaving] = useState(false)
  const [telegramCode, setTelegramCode] = useState("")
  const [telegramLoading, setTelegramLoading] = useState(false)

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
    setSuccessMessage("Account created. Confirm your email if asked, then sign in.")
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

  async function createTelegramCode() {
    setTelegramLoading(true)
    setErrorMessage("")
    setSuccessMessage("")
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      setTelegramLoading(false)
      setErrorMessage("Sign in to connect Telegram.")
      return
    }
    const { error } = await supabase.from("telegram_link_codes").insert({
      code,
      user_id: userData.user.id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })
    setTelegramLoading(false)
    if (error) {
      setErrorMessage("Could not create a code. Check that the Telegram SQL setup has been run in Supabase.")
      return
    }
    setTelegramCode(code)
  }

  async function addEntry(event) {
    event.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    if (!activity.trim()) {
      setErrorMessage("Add an activity first.")
      return
    }

    setSaving(true)
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      setSaving(false)
      setErrorMessage("Your session has ended. Please sign in again.")
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
    setSuccessMessage("Entry saved.")
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

  const [range, setRange] = useState("week")
  const [selectedId, setSelectedId] = useState(null)

  const energyStats = useMemo(() => {
    if (!entries.length) return null
    const values = entries.map((entry) => Number(entry.energy || 0))
    const recent = values.slice(0, 14)
    return {
      highest: Math.max(...values),
      lowest: Math.min(...values),
      recentAverage: recent.reduce((sum, value) => sum + value, 0) / recent.length,
    }
  }, [entries])

  // Consecutive days with at least one entry, ending today (or yesterday).
  const streak = useMemo(() => {
    const days = new Set(entries.map((entry) => entry.date))
    const cursor = new Date()
    if (!days.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1)
    let count = 0
    while (days.has(localDate(cursor))) {
      count += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return count
  }, [entries])

  const groupedByDate = useMemo(() => {
    const map = new Map()
    entries.forEach((entry) => {
      if (!map.has(entry.date)) map.set(entry.date, [])
      map.get(entry.date).push(entry)
    })
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [entries])

  const chartData = useMemo(() => {
    const avg = (list) =>
      list.length
        ? Number((list.reduce((sum, entry) => sum + Number(entry.energy || 0), 0) / list.length).toFixed(1))
        : null

    if (range === "year") {
      return Array.from({ length: 12 }, (_, index) => {
        const date = new Date()
        date.setDate(1)
        date.setMonth(date.getMonth() - (11 - index))
        const prefix = localDate(date).slice(0, 7)
        return {
          day: date.toLocaleDateString("en-US", { month: "short" }),
          date: null,
          energy: avg(entries.filter((entry) => entry.date?.startsWith(prefix))),
        }
      })
    }

    const length = range === "month" ? 30 : 7
    return Array.from({ length }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (length - 1 - index))
      const isoDate = localDate(date)
      return {
        day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        date: isoDate,
        energy: avg(entries.filter((entry) => entry.date === isoDate)),
      }
    })
  }, [entries, range])

  const chartPeaks = useMemo(() => {
    const values = chartData.map((point) => point.energy).filter((value) => value !== null)
    if (!values.length) return []
    const max = Math.max(...values)
    return chartData.filter((point) => point.energy === max)
  }, [chartData])

  function handlePointClick(point) {
    if (!point?.date) return
    const match = entries.find((entry) => entry.date === point.date)
    if (!match) return
    setSelectedId(match.id)
    document.getElementById(`entry-${match.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const observation = !energyStats
    ? null
    : energyStats.recentAverage >= 7
      ? { text: "Your recent entries show consistently strong energy levels. You perform best when activity remains structured and predictable.", pattern: "High Stability", recovery: "Strong" }
      : energyStats.recentAverage >= 5
        ? { text: "Your energy remains stable but fluctuates throughout the week. Small improvements in routine consistency could increase performance.", pattern: "Moderate Stability", recovery: "Moderate" }
        : { text: "Recent entries indicate lower energy patterns. Recovery, sleep quality and workload balance may require attention.", pattern: "Variable Energy", recovery: "Needs Attention" }

  if (view === "landing") {
    return (
      <main className="landing">
        <div className="landing-bar">
          <span className="landing-logo">Thrive</span>
          <span>Personal energy system</span>
        </div>
        <section className="landing-content">
          <p className="eyebrow">Welcome to Thrive</p>
          <h1>Your personal<br /><span>energy operating system.</span></h1>
          <p className="landing-copy">
            Log daily activity, mood and energy levels. Understand patterns in your
            focus and performance, and build habits that improve your energy over time.
          </p>
          <button className="button button-primary landing-button" onClick={() => setView("auth")}>
            Start Thrive <span aria-hidden="true">↗</span>
          </button>
          <p className="landing-footnote">Track energy · Detect patterns · Build consistency</p>
        </section>
        <svg className="spin-badge" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <path id="badge-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
          </defs>
          <text fontSize="9.5" fill="currentColor" letterSpacing="2">
            <textPath href="#badge-circle">TRACK · DETECT · UNLOCK · THRIVE ·</textPath>
          </text>
        </svg>
      </main>
    )
  }

  if (view === "auth") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <button className="back-link" onClick={() => { setView("landing"); setErrorMessage(""); }}>
            ← Back
          </button>
          <div className="auth-logo">Thrive</div>
          <h1>{mode === "login" ? "Welcome back" : "Create account"}</h1>
          <p className="muted">{mode === "login" ? "Continue tracking your energy." : "Your entries are stored in your personal account."}</p>
          <form onSubmit={mode === "login" ? signIn : signUp} className="auth-form">
            {mode === "signup" && (
              <label>Name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="What should we call you" autoComplete="name" />
              </label>
            )}
            <label>Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </label>
            <label>Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required />
            </label>
            {errorMessage && <p className="message message-error">{errorMessage}</p>}
            {successMessage && <p className="message message-success">{successMessage}</p>}
            <button className="button button-primary full-button" type="submit" disabled={loading}>
              {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErrorMessage(""); setSuccessMessage(""); }}>
            {mode === "login" ? "No account? Create one" : "Already have an account? Sign in"}
          </button>
        </section>
      </main>
    )
  }

  const navItems = [
    { id: "overview", label: "Dashboard" },
    { id: "analytics", label: "Analytics" },
    { id: "journal", label: "Timeline" },
    { id: "insights", label: "Insights" },
  ]

  function goTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function selectEntry(id) {
    setSelectedId(id)
    document.getElementById(`entry-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  return (
    <main className="app-shell">
      {/* SIDEBAR (desktop) */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <span className="sidebar-brand">Thrive</span>
          <span className="eyebrow">Personal energy system</span>
        </div>

        <div className="sidebar-score">
          <p className="eyebrow">Energy Score</p>
          <strong>{averageEnergy ?? "0"}</strong>
          <span>Personal index</span>
        </div>

        <div className="sidebar-stats">
          <div><p className="eyebrow">Entries</p><strong>{entries.length}</strong></div>
          <div><p className="eyebrow">Streak</p><strong>{streak}</strong></div>
        </div>

        <nav className="sidebar-nav" aria-label="Navigation">
          <p className="eyebrow">Navigation</p>
          {navItems.map((item, index) => (
            <button key={item.id} type="button" onClick={() => goTo(item.id)}>
              <small>0{index + 1}</small>{item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-recent">
          <p className="eyebrow">Recent Activity</p>
          {groupedByDate.length === 0 && <p className="sidebar-empty">No entries yet</p>}
          {groupedByDate.slice(0, 7).map(([date, items]) => (
            <div key={date} className="sidebar-day">
              <time>{date}</time>
              {items.slice(0, 2).map((item) => (
                <button
                  type="button"
                  key={item.id ?? `${item.date}-${item.activity}`}
                  className="sidebar-entry"
                  onClick={() => selectEntry(item.id)}
                >
                  <span className="sidebar-entry-row"><span>{item.activity}</span><span>{item.energy}</span></span>
                  <span className="sidebar-entry-cat">{item.category}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-premium">
          <p className="eyebrow">Premium</p>
          <strong>AI Energy Insights</strong>
          <span>Forecast trends, detect patterns and discover your peak performance.</span>
        </div>

        <div className="sidebar-bottom">
          <span className="user-email">{session?.user?.email}</span>
          <button className="button button-quiet full-button" onClick={logout}>Logout</button>
        </div>
      </aside>

      <div className="content">
        {/* TOPBAR (mobile) */}
        <header className="topbar">
          <span className="brand">Thrive</span>
          <button className="button button-quiet" onClick={logout}>Logout</button>
        </header>

        {/* HERO */}
        <section className="hero-band" id="overview">
          <div className="hero-meta">
            <span>Thrive</span>
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
          </div>
          <div className="page-heading">
            <h1>Dashboard</h1>
            <p className="muted">Track energy, detect patterns, and unlock AI insights</p>
          </div>
          <svg className="spin-badge" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <path id="badge-circle-app" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
            </defs>
            <text fontSize="9.5" fill="currentColor" letterSpacing="2">
              <textPath href="#badge-circle-app">TRACK · DETECT · UNLOCK · THRIVE ·</textPath>
            </text>
          </svg>
        </section>

        <div className="page">
          {errorMessage && <p className="message message-error">{errorMessage}</p>}
          {successMessage && <p className="message message-success">{successMessage}</p>}

          {/* KPI */}
          <section className="kpi-grid" aria-label="Key numbers">
            {[
              { label: "Average", value: averageEnergy ?? "0", note: "Energy level" },
              { label: "Peak", value: energyStats?.highest ?? "0", note: "Highest value" },
              { label: "Low", value: energyStats?.lowest ?? "0", note: "Minimum energy" },
              { label: "Streak", value: streak, note: "Active days" },
            ].map((card) => (
              <article key={card.label} className="kpi">
                <p className="eyebrow">{card.label}</p>
                <strong>{card.value}</strong>
                <span>{card.note}</span>
              </article>
            ))}
          </section>
        </div>

        {/* AI COACH — black band */}
        <section className="band-dark" id="insights">
          <div className="page">
            <div className="band-head">
              <div>
                <p className="eyebrow">AI Coach</p>
                <h2>Energy Intelligence</h2>
              </div>
              <span className="live-pill"><span />Live Analysis</span>
            </div>
            <p className="band-lead">
              {observation ? observation.text : "Start logging entries to unlock personalized AI-powered energy insights."}
            </p>
            <div className="band-cells">
              <div><p className="eyebrow">Pattern</p><strong>{observation?.pattern ?? "—"}</strong></div>
              <div><p className="eyebrow">Peak Energy</p><strong>{energyStats?.highest ?? 0}/10</strong></div>
              <div><p className="eyebrow">Recovery</p><strong>{observation?.recovery ?? "—"}</strong></div>
            </div>
            {bestEntry && (
              <p className="band-note">
                Most energy after: {bestEntry.activity} ({bestEntry.energy}/10)
                {hardestEntry && hardestEntry !== bestEntry ? ` · Least energy after: ${hardestEntry.activity} (${hardestEntry.energy}/10)` : ""}
              </p>
            )}
          </div>
        </section>

        <div className="page">
          {/* CHART */}
          <section className="chart-section" id="analytics">
            <div className="range-switch" role="group" aria-label="Range">
              {["week", "month", "year"].map((key) => (
                <button key={key} type="button" className={`pill-sm ${range === key ? "active" : ""}`} onClick={() => setRange(key)} aria-pressed={range === key}>
                  {key.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="section-head">
              <div>
                <p className="eyebrow">Energy Timeline</p>
                <h2>{range.toUpperCase()} View</h2>
              </div>
              <span className="section-meta">{chartData.filter((point) => point.energy !== null).length} points</span>
            </div>
            {chartData.filter((point) => point.energy !== null).length < 2 ? (
              <div className="chart-empty">
                <p>Add at least two entries</p>
              </div>
            ) : (
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 16, right: 12, bottom: 4, left: -16 }}>
                    <CartesianGrid vertical={false} stroke="#000" strokeOpacity={0.08} />
                    <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: "#000" }} tick={{ fill: "#6d6d6d", fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
                    <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tick={{ fill: "#6d6d6d", fontSize: 11 }} width={40} />
                    <Tooltip cursor={{ stroke: "#000", strokeWidth: 1 }} contentStyle={{ borderRadius: 0, border: "1px solid #000", boxShadow: "none", fontSize: 13 }} formatter={(value) => [`${value}/10`, "Energy"]} />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="#000"
                      strokeWidth={1.5}
                      connectNulls
                      dot={{ r: 3.5, fill: "#fff", stroke: "#000", strokeWidth: 1, cursor: "pointer" }}
                      activeDot={{ r: 6, fill: "#000", stroke: "#000", cursor: "pointer", onClick: (_, payload) => handlePointClick(payload?.payload) }}
                    />
                    {chartPeaks.map((peak) => (
                      <ReferenceDot key={`${peak.day}-${peak.energy}`} x={peak.day} y={peak.energy} r={7} fill="#ffac2e" stroke="#000" strokeWidth={1} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* FORM + TIMELINE */}
          <div className="work-grid" id="journal">
            <section className="entry-panel">
              <p className="eyebrow">01 — Log</p>
              <h2>Log Energy</h2>

              <form onSubmit={addEntry} className="entry-form">
                <input aria-label="Activity" value={activity} onChange={(event) => setActivity(event.target.value)} placeholder="Activity" maxLength={120} required />
                <textarea aria-label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" rows={3} maxLength={1000} />

                <fieldset className="rating-field">
                  <div className="rating-heading">
                    <legend>Energy</legend>
                    <strong className={`rating-number tone-${energyTone(Number(energy))}`}>{energy}<span>/10</span></strong>
                  </div>
                  <input className="energy-range" type="range" min="1" max="10" value={energy} onChange={(event) => setEnergy(Number(event.target.value))} aria-label="Energy from 1 to 10" />
                  <p className={`energy-hint tone-text-${energyTone(Number(energy))}`}>{energyLabel(Number(energy))}</p>
                </fieldset>

                <div className="pill-row" role="group" aria-label="Category">
                  {CATEGORIES.map((item) => (
                    <button key={item} type="button" className={`pill-sm ${category === item ? "active" : ""}`} onClick={() => setCategory(item)} aria-pressed={category === item}>
                      {item}
                    </button>
                  ))}
                </div>

                <div className="mood-row" role="group" aria-label="Mood">
                  {MOODS.map((item) => (
                    <button key={item.value} type="button" title={item.label} className={`mood-dot ${mood === item.value ? "selected" : ""}`} onClick={() => setMood(item.value)} aria-pressed={mood === item.value}>
                      {item.value}
                    </button>
                  ))}
                </div>

                <label className="date-field">Date
                  <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required />
                </label>

                <button className="button button-primary full-button" type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Entry"}
                </button>
              </form>
            </section>

            <section className="journal-panel">
              <p className="eyebrow">02 — History</p>
              <h2 className="journal-title">Timeline</h2>
              {entries.length === 0 ? (
                <p className="history-empty">No entries yet</p>
              ) : (
                <div className="journal-list">
                  {entries.map((entry) => (
                    <article
                      className={`journal-entry ${selectedId === entry.id ? "selected" : ""}`}
                      key={entry.id ?? `${entry.date}-${entry.activity}-${entry.created_at}`}
                      id={`entry-${entry.id}`}
                      onClick={() => setSelectedId(entry.id)}
                    >
                      <div className="journal-main">
                        <h3>{entry.activity}</h3>
                        <div className="journal-top">
                          <span>{entry.category || "Other"}</span>
                          <time>{entry.date}</time>
                          <span>{entry.mood}</span>
                        </div>
                        {entry.notes && <p className="journal-meta">{entry.notes}</p>}
                      </div>
                      <strong className="journal-energy">{entry.energy}</strong>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* TELEGRAM — black band */}
        <section className="band-dark telegram-band" id="telegram">
          <div className="page telegram-inner">
            <div>
              <p className="eyebrow">Quick entries</p>
              <h2>Connect Telegram</h2>
              <p className="band-lead small">Log activities in the chat and they appear in your journal. The bot also reminds you in the evening to rate your day.</p>
            </div>
            <div className="telegram-action">
              <button className="button button-light" onClick={createTelegramCode} disabled={telegramLoading}>
                {telegramLoading ? "Creating code…" : "Create connection code"}
              </button>
              {telegramCode && <div className="telegram-code-box">
                <span>The code is valid for 10 minutes</span>
                <strong>{telegramCode}</strong>
                <p>Open your bot and send:</p>
                <code>/link {telegramCode}</code>
                <button className="text-button" onClick={() => { navigator.clipboard?.writeText("/link " + telegramCode)?.catch?.(() => {}) }}>Copy command</button>
              </div>}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
