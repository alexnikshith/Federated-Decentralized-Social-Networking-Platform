'use client'

import React, { Suspense, Component, ErrorInfo, ReactNode, useEffect, useRef } from 'react'
import * as SplineRuntime from '@splinetool/runtime'

const SplineApp = (SplineRuntime as any).Application ?? (SplineRuntime as any).default

// ── Module-level cache ──────────────────────────────────────────────────────
// The canvas element and the booted Spline app instance are stored here
// outside of React's lifecycle. This means navigating away and back does NOT
// destroy or re-create them — the robot keeps its state and never reloads.
let cachedCanvas: HTMLCanvasElement | null = null
let cachedApp: any = null

function getOrCreateSplineCanvas(scene: string): HTMLCanvasElement {
  if (cachedCanvas && cachedApp) {
    // Already booted — return the existing canvas as-is
    return cachedCanvas
  }

  // First visit — create and boot
  const canvas = document.createElement('canvas')
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.background = 'transparent'
  canvas.style.display = 'block'

  const app = new SplineApp(canvas) as any
  app.load(scene)

  cachedCanvas = canvas
  cachedApp = app

  return canvas
}
// ───────────────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

class SplineErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Spline Runtime Error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-cyan-500/5 rounded-3xl border border-cyan-500/10">
          <p className="text-cyan-400/50 text-xs font-bold tracking-widest uppercase mb-2">Neural Link Failed</p>
          <div className="w-12 h-[1px] bg-cyan-500/20" />
        </div>
      )
    }
    return this.props.children
  }
}

interface SplineSceneProps {
  scene: string
  className?: string
  style?: React.CSSProperties
  // Forwarded mouse position for cursor tracking from HeroSection
  mouseX?: number
  mouseY?: number
  onLoad?: () => void
}

function SplineSceneInner({ scene, className, style, mouseX, mouseY, onLoad }: SplineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Get or reuse the cached canvas (robot only loads once ever)
    const isAlreadyBooted = !!cachedCanvas && !!cachedApp
    const canvas = getOrCreateSplineCanvas(scene)

    if (isAlreadyBooted && onLoad) {
      // If the app was already booted previously in the cache, fire onLoad immediately
      onLoad()
    } else if (!isAlreadyBooted && cachedApp) {
      // If it's a fresh boot, listen for the spline 'load' event
      cachedApp.addEventListener('load', () => {
        if (onLoad) onLoad()
      })
    }

    // Re-attach canvas to this container
    if (canvas.parentElement !== container) {
      container.appendChild(canvas)
    }

    // Force a re-render if the app had paused
    if (isAlreadyBooted && cachedApp && typeof cachedApp.play === 'function') {
      cachedApp.play();
    }

    return () => {
      // Detach the canvas from the container when unmounting
      // The canvas + app stay alive in the cache.
      if (canvas.parentElement === container) {
        container.removeChild(canvas)
      }
    }
  }, [scene, onLoad])

  // Forward cursor position into Spline for head tracking
  useEffect(() => {
    if (mouseX === undefined || mouseY === undefined) return
    if (!cachedApp) return
    cachedApp.emitEvent?.('mousemove', { clientX: mouseX, clientY: mouseY })
  }, [mouseX, mouseY])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...style, overflow: 'hidden' }}
    />
  )
}

export function SplineScene(props: SplineSceneProps) {
  return (
    <SplineErrorBoundary>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        }
      >
        <SplineSceneInner {...props} />
      </Suspense>
    </SplineErrorBoundary>
  )
}