import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "./supabase"
import { T, initialLang, saveLang, categoryLabel, moodLabel, friendlyError } from "./i18n"
import AnchorsBackground from "./AnchorsBackground"
import EnergyEQ from "./EnergyEQ"
import "./App.css"

const CATEGORIES = ["Work", "Health", "Study", "Social", "Rest", "Other"]
const MOODS = ["good", "neutral", "great", "charged"]

function localDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function energyLabel(value, labels) {
  if (value <= 3) return labels[0]
  if (value <= 5) return labels[1]
  if (value <= 6) return labels[2]
  if (value <= 8) return labels[3]
  return labels[4]
}

function energyTone(value) {
  if (value <= 3) return "low"
  if (value <= 5) return "medium-low"
  if (value <= 6) return "neutral"
  if (value <= 8) return "medium-high"
  return "high"
}

// Small white line of daily average energy for the dashboard header.
function Sparkline({ values }) {
  const W = 320, H = 96, P = 8
  const points = values
    .map((value, index) => (value === null ? null : {
      x: P + (index * (W - 2 * P)) / (values.length - 1),
      y: H - P - ((value - 1) / 9) * (H - 2 * P),
    }))
    .filter(Boolean)
  if (points.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="spark" aria-hidden="true">
        <line x1={P} y1={H / 2} x2={W - P} y2={H / 2} stroke="currentColor" strokeOpacity="0.35" strokeDasharray="2 6" />
      </svg>
    )
  }
  const d = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
  const last = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="spark" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="currentColor" />)}
      <circle cx={last.x} cy={last.y} r="5" fill="none" stroke="currentColor" />
    </svg>
  )
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
  const [mood, setMood] = useState("good")
  const [entryDate, setEntryDate] = useState(localDate())
  const [entries, setEntries] = useState([])
  const [saving, setSaving] = useState(false)
  const [lang, setLang] = useState(initialLang)
  const t = T[lang]

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  function toggleLang() {
    const next = lang === "en" ? "ru" : "en"
    setLang(next)
    saveLang(next)
  }

  const langSwitch = (extra = "") => (
    <button type="button" className={`lang-switch ${extra}`} onClick={toggleLang} aria-label={t.switchLabel}>
      {t.switchTo}
    </button>
  )

  // Opened from a password-reset email: show the "new password" form instead of the dashboard.
  const recoveringRef = useRef(
    typeof window !== "undefined" && window.location.hash.includes("type=recovery"),
  )

  function openRecovery() {
    recoveringRef.current = true
    setMode("recover")
    setView("auth")
  }

  useEffect(() => {
    let mounted = true
    if (recoveringRef.current) openRecovery()

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setErrorMessage(friendlyError(error, t))
      setSession(data?.session ?? null)
      if (data?.session && !recoveringRef.current) {
        setView("app")
        loadEntries()
      }
    })

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      if (event === "PASSWORD_RECOVERY") {
        openRecovery()
        return
      }
      if (recoveringRef.current && nextSession) return
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
      setErrorMessage(friendlyError(error, t))
      return
    }
    setEntries(data ?? [])
  }

  async function signUp(event) {
    event?.preventDefault()
    setLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    })

    setLoading(false)
    if (error) {
      setErrorMessage(friendlyError(error, t))
      return
    }

    setMode("login")
    // With email confirmation off the user is signed in at once; only explain when a confirmation is pending.
    if (!signUpData?.session) setSuccessMessage(t.msgAccountCreated)
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
      setErrorMessage(friendlyError(error, t))
      return
    }

    setView("app")
    await loadEntries()
  }

  async function sendReset(event) {
    event?.preventDefault()
    setLoading(true)
    setErrorMessage("")
    setSuccessMessage("")
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) {
      setErrorMessage(friendlyError(error, t))
      return
    }
    setSuccessMessage(t.resetSent)
  }

  async function saveNewPassword(event) {
    event?.preventDefault()
    setLoading(true)
    setErrorMessage("")
    setSuccessMessage("")
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setErrorMessage(friendlyError(error, t))
      return
    }
    recoveringRef.current = false
    window.history.replaceState(null, "", window.location.pathname)
    setPassword("")
    setMode("login")
    setSuccessMessage(t.passwordUpdated)
    setView("app")
    await loadEntries()
  }

  async function logout() {
    setErrorMessage("")
    const { error } = await supabase.auth.signOut()
    if (error) setErrorMessage(friendlyError(error, t))
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
      setErrorMessage(t.msgNeedActivity)
      return
    }

    setSaving(true)
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      setSaving(false)
      setErrorMessage(t.msgSessionEnded)
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
      setErrorMessage(friendlyError(error, t))
      return
    }

    setActivity("")
    setNotes("")
    setEnergy(6)
    setMood("good")
    setEntryDate(localDate())
    setSuccessMessage(t.msgSaved)
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
        const items = entries.filter((entry) => entry.date?.startsWith(prefix))
        return {
          day: date.toLocaleDateString(t.locale, { month: "short" }),
          full: date.toLocaleDateString(t.locale, { month: "long", year: "numeric" }),
          date: null,
          energy: avg(items),
          items,
        }
      })
    }

    const length = range === "month" ? 30 : 7
    return Array.from({ length }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (length - 1 - index))
      const isoDate = localDate(date)
      const items = entries.filter((entry) => entry.date === isoDate)
      return {
        day: date.toLocaleDateString(t.locale, { month: "short", day: "numeric" }),
        full: date.toLocaleDateString(t.locale, { weekday: "long", day: "numeric", month: "long" }),
        date: isoDate,
        energy: avg(items),
        items,
      }
    })
  }, [entries, range, t.locale])

  // Summary of the selected period: average, best and hardest day.
  const periodSummary = useMemo(() => {
    const filled = chartData.filter((point) => point.energy !== null)
    if (!filled.length) return null
    const average = filled.reduce((sum, point) => sum + point.energy, 0) / filled.length
    const best = filled.reduce((a, b) => (b.energy > a.energy ? b : a))
    const hardest = filled.reduce((a, b) => (b.energy < a.energy ? b : a))
    return { average: average.toFixed(1), best, hardest, count: filled.reduce((n, point) => n + point.items.length, 0) }
  }, [chartData])

  // Last 14 days for the small chart in the dashboard header.
  const sparkData = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (13 - index))
      const iso = localDate(date)
      const list = entries.filter((entry) => entry.date === iso)
      return list.length ? list.reduce((sum, entry) => sum + Number(entry.energy || 0), 0) / list.length : null
    })
  }, [entries])

  const activityRef = useRef(null)
  function focusNewEntry() {
    document.getElementById("log")?.scrollIntoView({ behavior: "smooth", block: "start" })
    setTimeout(() => activityRef.current?.focus({ preventScroll: true }), 350)
  }

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
      ? t.observations.high
      : energyStats.recentAverage >= 5
        ? t.observations.mid
        : t.observations.low

  if (view === "landing") {
    return (
      <main className="landing">
        <AnchorsBackground labels={t.anchors} />
        <div className="landing-bar">
          <span className="landing-logo">Thrive</span>
          <span className="landing-tag">{t.landingTag}</span>
          {langSwitch("on-dark")}
        </div>
        <section className="landing-content" key={lang}>
          <p className="eyebrow">{t.landingEyebrow}</p>
          <h1>{t.landingTitle1}<br /><span>{t.landingTitle2}</span></h1>
          <p className="landing-copy">{t.landingCopy}</p>
          <button className="button button-primary landing-button" onClick={() => setView("auth")}>
            {t.landingButton} <span aria-hidden="true">↗</span>
          </button>
          <p className="landing-footnote">{t.landingFootnote}</p>
        </section>
      </main>
    )
  }

  if (view === "auth") {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <button className="back-link" onClick={() => { setView("landing"); setErrorMessage(""); }}>
            {t.back}
          </button>
          <div className="auth-top"><span className="auth-logo">Thrive</span>{langSwitch()}</div>
          <h1>{{ login: t.welcomeBack, signup: t.createAccount, forgot: t.forgotTitle, recover: t.recoverTitle }[mode]}</h1>
          <p className="muted">{{ login: t.authLoginCopy, signup: t.authSignupCopy, forgot: t.forgotCopy, recover: t.recoverCopy }[mode]}</p>
          <form onSubmit={{ login: signIn, signup: signUp, forgot: sendReset, recover: saveNewPassword }[mode]} className="auth-form">
            {mode === "signup" && (
              <label>{t.name}
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t.namePlaceholder} autoComplete="name" />
              </label>
            )}
            {mode !== "recover" && (
              <label>{t.email}
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </label>
            )}
            {mode !== "forgot" && (
              <label>{mode === "recover" ? t.newPassword : t.password}
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t.passwordPlaceholder} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required />
              </label>
            )}
            {mode === "login" && (
              <button type="button" className="text-button forgot-link" onClick={() => { setMode("forgot"); setErrorMessage(""); setSuccessMessage(""); }}>
                {t.forgotLink}
              </button>
            )}
            {errorMessage && <p className="message message-error">{errorMessage}</p>}
            {successMessage && <p className="message message-success">{successMessage}</p>}
            <button className="button button-primary full-button" type="submit" disabled={loading}>
              {loading ? t.wait : { login: t.signIn, signup: t.createAccount, forgot: t.sendLink, recover: t.savePassword }[mode]}
            </button>
          </form>
          {(mode === "login" || mode === "signup") && (
            <button className="text-button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErrorMessage(""); setSuccessMessage(""); }}>
              {mode === "login" ? t.toSignup : t.toLogin}
            </button>
          )}
          {mode === "forgot" && (
            <button className="text-button" onClick={() => { setMode("login"); setErrorMessage(""); setSuccessMessage(""); }}>
              {t.backToLogin}
            </button>
          )}
        </section>
      </main>
    )
  }

  const navItems = ["overview", "analytics", "journal", "insights"].map((id) => ({ id, label: t.nav[id] }))

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
          {langSwitch("on-dark")}
        </div>

        <div className="sidebar-score">
          <p className="eyebrow">{t.energyScore}</p>
          <strong>{averageEnergy ?? "0"}</strong>
          <span>{t.personalIndex}</span>
        </div>

        <div className="sidebar-stats">
          <div><p className="eyebrow">{t.entriesLabel}</p><strong>{entries.length}</strong></div>
          <div><p className="eyebrow">{t.streakLabel}</p><strong>{streak}</strong></div>
        </div>

        <nav className="sidebar-nav" aria-label={t.navigation}>
          <p className="eyebrow">{t.navigation}</p>
          {navItems.map((item, index) => (
            <button key={item.id} type="button" onClick={() => goTo(item.id)}>
              <small>0{index + 1}</small>{item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-recent">
          <p className="eyebrow">{t.recentActivity}</p>
          {groupedByDate.length === 0 && <p className="sidebar-empty">{t.noEntries}</p>}
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
                  <span className="sidebar-entry-cat">{categoryLabel(item.category, lang)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-premium">
          <p className="eyebrow">{t.premium}</p>
          <strong>{t.premiumTitle}</strong>
          <span>{t.premiumCopy}</span>
        </div>

        <div className="sidebar-bottom">
          <span className="user-email">{session?.user?.email}</span>
          <button className="button button-quiet full-button" onClick={logout}>{t.logout}</button>
        </div>
      </aside>

      <div className="content">
        {/* TOPBAR (mobile) */}
        <header className="topbar">
          <span className="brand">Thrive</span>
          <span className="topbar-actions">{langSwitch("on-dark")}<button className="button button-quiet" onClick={logout}>{t.logout}</button></span>
        </header>

        {/* HERO */}
        <section className="hero-band" id="overview">
          <div className="hero-meta">
            <span>Thrive</span>
            <span>{new Date().toLocaleDateString(t.locale, { weekday: "long", month: "long", day: "numeric" })}</span>
          </div>
          <div className="hero-row">
            <div className="page-heading">
              <h1>{t.dashboard}</h1>
              <p className="muted">{t.dashboardCopy}</p>
            </div>
            <div className="hero-spark">
              <button type="button" className="hero-add" onClick={focusNewEntry} aria-label={t.logTitle} title={t.logTitle}>+</button>
              <div className="hero-spark-chart">
                <Sparkline values={sparkData} />
                <span className="hero-spark-label">{t.last14}</span>
              </div>
            </div>
          </div>
          <svg className="spin-badge" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <path id="badge-circle-app" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
            </defs>
            <text fontSize="9.5" fill="currentColor" letterSpacing="2">
              <textPath href="#badge-circle-app">{t.badge}</textPath>
            </text>
          </svg>
        </section>

        <div className="dash-body">
          <div className="dash-main">
            {errorMessage && <p className="message message-error dash-msg">{errorMessage}</p>}
            {successMessage && <p className="message message-success dash-msg">{successMessage}</p>}

            <section className="kpi-grid" aria-label={t.dashboard}>
              {[averageEnergy ?? "0", energyStats?.highest ?? "0", energyStats?.lowest ?? "0", streak].map((value, index) => ({
                label: t.kpi[index][0], value, note: t.kpi[index][1],
              })).map((card) => (
                <article key={card.label} className="kpi">
                  <p className="eyebrow">{card.label}</p>
                  <strong>{card.value}</strong>
                  <span>{card.note}</span>
                </article>
              ))}
            </section>

            <section className="band-dark dash-ai" id="insights">
                <p className="eyebrow">{t.aiCoach}</p>
                <div className="band-head">
                  <h2>{t.aiTitle}</h2>
                  <span className="live-pill"><span />{t.live}</span>
                </div>
                <p className="band-lead">
                  {observation ? observation.text : t.aiEmpty}
                </p>
                <div className="band-cells">
                  <div><p className="eyebrow">{t.pattern}</p><strong>{observation?.pattern ?? "—"}</strong></div>
                  <div><p className="eyebrow">{t.peakEnergy}</p><strong>{energyStats?.highest ?? 0}/10</strong></div>
                  <div><p className="eyebrow">{t.recovery}</p><strong>{observation?.recovery ?? "—"}</strong></div>
                </div>
                {bestEntry && (
                  <p className="band-note">
                    {t.mostEnergy}: {bestEntry.activity} ({bestEntry.energy}/10)
                    {hardestEntry && hardestEntry !== bestEntry ? ` · ${t.leastEnergy}: ${hardestEntry.activity} (${hardestEntry.energy}/10)` : ""}
                  </p>
                )}
            </section>

            <section className="chart-section" id="analytics">
              <div className="range-switch" role="group" aria-label={t.energyTimeline}>
                {["week", "month", "year"].map((key) => (
                  <button key={key} type="button" className={`pill-sm ${range === key ? "active" : ""}`} onClick={() => setRange(key)} aria-pressed={range === key}>
                    {t.ranges[key].toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="section-head">
                <div>
                  <p className="eyebrow">{t.energyTimeline}</p>
                  <h2>{t.ranges[range]} {t.view}</h2>
                </div>
                <span className="section-meta">{chartData.filter((point) => point.energy !== null).length} {t.points}</span>
              </div>
              {periodSummary && (
              <div className="chart-summary">
                <div><span>{t.periodAvg}</span><strong>{periodSummary.average}</strong></div>
                <div><span>{t.bestDay}</span><strong className="tone-high">{periodSummary.best.day} · {periodSummary.best.energy}</strong></div>
                <div><span>{t.hardDay}</span><strong className="tone-low">{periodSummary.hardest.day} · {periodSummary.hardest.energy}</strong></div>
                <div><span>{t.entriesLabel}</span><strong>{periodSummary.count}</strong></div>
              </div>
            )}
            {chartData.every((point) => point.energy === null) ? (
              <div className="chart-empty">
                <p>{t.needTwo}</p>
              </div>
            ) : (
              <EnergyEQ
                data={chartData}
                baseline={averageEnergy !== null ? Number(averageEnergy) : null}
                labels={{ avg: t.yourAvg, avgShort: t.avgShort }}
                onPick={handlePointClick}
              />
            )}
            <p className="chart-note">{t.chartHint}</p>
            </section>

            <section className="journal-panel" id="journal">
              <p className="eyebrow">{t.historyEyebrow}</p>
              <h2 className="journal-title">{t.timeline}</h2>
              {entries.length === 0 ? (
                <p className="history-empty">{t.noEntries}</p>
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
                          <span>{categoryLabel(entry.category, lang)}</span>
                          <time>{entry.date}</time>
                          <span>{moodLabel(entry.mood, lang)}</span>
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

          <aside className="dash-aside">
            <section className="entry-panel" id="log">
              <p className="eyebrow">{t.logEyebrow}</p>
              <h2>{t.logTitle}</h2>

              <form onSubmit={addEntry} className="entry-form">
                <input ref={activityRef} aria-label={t.activity} value={activity} onChange={(event) => setActivity(event.target.value)} placeholder={t.activity} maxLength={120} required />
                <textarea aria-label={t.notes} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t.notes} rows={3} maxLength={1000} />

                <fieldset className="rating-field">
                  <div className="rating-heading">
                    <legend>{t.energy}</legend>
                    <strong className={`rating-number tone-${energyTone(Number(energy))}`}>{energy}<span>/10</span></strong>
                  </div>
                  <input className="energy-range" type="range" min="1" max="10" value={energy} onChange={(event) => setEnergy(Number(event.target.value))} aria-label={t.energy} />
                  <p className={`energy-hint tone-text-${energyTone(Number(energy))}`}>{energyLabel(Number(energy), t.energyLabels)}</p>
                </fieldset>

                <div className="pill-row" role="group" aria-label={t.category}>
                  {CATEGORIES.map((item) => (
                    <button key={item} type="button" className={`pill-sm ${category === item ? "active" : ""}`} onClick={() => setCategory(item)} aria-pressed={category === item}>
                      {categoryLabel(item, lang)}
                    </button>
                  ))}
                </div>

                <div className="pill-row" role="group" aria-label={t.mood}>
                  {MOODS.map((item) => (
                    <button key={item} type="button" className={`pill-sm ${mood === item ? "active" : ""}`} onClick={() => setMood(item)} aria-pressed={mood === item}>
                      {t.moods[item]}
                    </button>
                  ))}
                </div>

                <label className="date-field">{t.date}
                  <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required />
                </label>

                <button className="button button-primary full-button" type="submit" disabled={saving}>
                  {saving ? t.saving : t.save}
                </button>
              </form>
            </section>
          </aside>
        </div>

      </div>
    </main>
  )
}
