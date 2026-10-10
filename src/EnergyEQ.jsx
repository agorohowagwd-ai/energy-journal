import { useState } from "react"

// Energy "equalizer": a soft curve around the person's own average, with one slider per day below.
// Above the line = more energy than usual, below = less. Values are 1–10.

const MIN = 1
const MAX = 10

function yOf(value) {
  // 0 at the top of the panel, 100 at the bottom, with a little breathing room
  return 8 + (1 - (value - MIN) / (MAX - MIN)) * 84
}

// Smooth curve through points (Catmull-Rom converted to cubic Béziers)
function smoothPath(points) {
  if (points.length < 2) return ""
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
  }
  return d
}

export default function EnergyEQ({ data, baseline, labels, onPick }) {
  const [hover, setHover] = useState(null)
  const n = data.length
  const xOf = (i) => ((i + 0.5) / n) * 100
  const base = baseline ?? 5.5
  const yb = yOf(base)

  const points = data
    .map((point, i) => (point.energy === null ? null : { x: xOf(i), y: yOf(point.energy), i }))
    .filter(Boolean)
  const curve = smoothPath(points)
  const area = points.length > 1
    ? `${curve} L ${points[points.length - 1].x} ${yb} L ${points[0].x} ${yb} Z`
    : ""

  // label density: keep roughly 7–12 labels whatever the range
  const step = Math.max(1, Math.ceil(n / 10))
  const hovered = hover !== null ? data[hover] : null
  const items = hovered ? [...(hovered.items || [])].sort((a, b) => Number(b.energy) - Number(a.energy)) : []

  return (
    <div className="eq" style={{ "--cols": n }} onMouseLeave={() => setHover(null)}>
      <div className="eq-panel">
        <svg className="eq-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="eqUp" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={yb}>
              <stop offset="0" stopColor="#000" stopOpacity="0.16" />
              <stop offset="1" stopColor="#000" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="eqDown" gradientUnits="userSpaceOnUse" x1="0" y1={yb} x2="0" y2="100">
              <stop offset="0" stopColor="#000" stopOpacity="0.02" />
              <stop offset="1" stopColor="#000" stopOpacity="0.16" />
            </linearGradient>
            <clipPath id="eqAbove"><rect x="0" y="0" width="100" height={yb} /></clipPath>
            <clipPath id="eqBelow"><rect x="0" y={yb} width="100" height={100 - yb} /></clipPath>
          </defs>
          {data.map((_, i) => (
            <line key={i} x1={xOf(i)} x2={xOf(i)} y1="0" y2="100" className={`eq-grid ${hover === i ? "on" : ""}`} vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2="100" y1={yb} y2={yb} className="eq-base" vectorEffect="non-scaling-stroke" />
          {area && <path d={area} fill="url(#eqUp)" clipPath="url(#eqAbove)" />}
          {area && <path d={area} fill="url(#eqDown)" clipPath="url(#eqBelow)" />}
          {curve && <path d={curve} className="eq-curve" vectorEffect="non-scaling-stroke" />}
        </svg>
        {points.map((p) => (
          <span key={p.i} className={`eq-dot ${hover === p.i ? "on" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} />
        ))}
        <span className="eq-legend"><i />{labels.avg} {base}</span>
        {hovered && hovered.energy !== null && (
          <div className={`eq-tip ${xOf(hover) > 55 ? "to-left" : ""}`} style={{ left: `${xOf(hover)}%` }}>
            <p className="eq-tip-date">{hovered.full}</p>
            <p className="eq-tip-value"><strong>{hovered.energy}</strong> / 10</p>
            {items.length > 0 && (
              <ul>
                {items.slice(0, 4).map((item, k) => (
                  <li key={k}><span>{item.activity}</span><b>{item.energy}</b></li>
                ))}
                {items.length > 4 && <li className="eq-tip-more">+{items.length - 4}</li>}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="eq-axis">
        {data.map((point, i) => (
          <span key={i} className={hover === i ? "on" : ""}>{i % step === 0 || i === n - 1 ? point.day : ""}</span>
        ))}
      </div>

      <div className="eq-sliders">
        <div className="eq-scale" aria-hidden="true"><span style={{ top: "0%" }}>+</span><span style={{ top: `${yb}%` }}>{labels.avgShort}</span><span style={{ top: "100%" }}>−</span></div>
        <div className="eq-tracks">
          {data.map((point, i) => {
            const has = point.energy !== null
            const y = has ? yOf(point.energy) : yb
            const top = Math.min(y, yb)
            const height = Math.abs(y - yb)
            return (
              <button
                key={i}
                type="button"
                className={`eq-track ${has ? "" : "empty"} ${hover === i ? "on" : ""}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onClick={() => has && onPick?.(point)}
                aria-label={has ? `${point.full}: ${point.energy}/10` : point.full}
              >
                <span className="eq-ticks" />
                {has && <span className="eq-fill" style={{ top: `${top}%`, height: `${height}%` }} />}
                {has && <span className="eq-knob" style={{ top: `${y}%` }} />}
              </button>
            )
          })}
        </div>
        <div className="eq-scale" aria-hidden="true"><span style={{ top: "0%" }}>+</span><span style={{ top: `${yb}%` }}>{labels.avgShort}</span><span style={{ top: "100%" }}>−</span></div>
      </div>
    </div>
  )
}
