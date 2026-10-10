import { useEffect, useRef } from "react"
import { startAnchors } from "./anchors"

// Landing backdrop: a human profile made of points, with memory "anchors" flashing inside.
export default function AnchorsBackground({ labels }) {
  const canvasRef = useRef(null)
  const labelsRef = useRef(labels)
  labelsRef.current = labels

  useEffect(() => {
    if (!canvasRef.current) return undefined
    return startAnchors(canvasRef.current, { getLabels: () => labelsRef.current })
  }, [])

  return <canvas ref={canvasRef} className="anchors-canvas" aria-hidden="true" />
}
