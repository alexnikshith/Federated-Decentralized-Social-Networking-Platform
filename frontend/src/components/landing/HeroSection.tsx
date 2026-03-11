import { Shield, Zap, Share2, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import React, { useState, useCallback, useEffect } from "react";

// ─── Hero Section ─────────────────────────────────────────────────────────────
export function HeroSection() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // Track cursor across the entire page and forward into SplineScene
  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [handleMouseMove])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-transparent pt-20">
      <div className="container mx-auto px-4 lg:px-8 relative z-10 flex flex-col items-center justify-center text-center">

        {/* Main Title Typography */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-foreground via-cyan-500/80 to-purple-500/80 dark:from-white dark:via-cyan-100 dark:to-purple-400 mb-6 drop-shadow-sm uppercase">
            Nexus Core
          </h1>
          <p className="text-xl md:text-2xl text-foreground/70 dark:text-cyan-100/70 leading-relaxed max-w-3xl mx-auto font-light tracking-wide uppercase">
            The next evolution of social intelligence.
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-center mb-20 pointer-events-auto"
        >
          <Link to="/register">
            <button className="group relative px-10 py-5 bg-cyan-950/40 border border-cyan-500/40 border-b-2 border-r-2 rounded-sm text-cyan-300 font-bold overflow-hidden transition-all hover:bg-cyan-900/60 hover:border-cyan-300 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:text-white active:scale-95 shadow-lg backdrop-blur-sm">
              <span className="relative z-10 flex items-center gap-3 tracking-[0.25em] font-mono uppercase text-sm md:text-base">
                Get Started <Zap className="w-5 h-5 group-hover:animate-pulse text-cyan-400 group-hover:text-cyan-300" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-400/10 to-transparent group-hover:translate-x-full duration-1000 transition-transform" />
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}