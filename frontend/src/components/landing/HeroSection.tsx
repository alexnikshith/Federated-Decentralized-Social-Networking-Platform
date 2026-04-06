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
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-purple-400 mb-6 drop-shadow-sm uppercase">
            Nexus Core
          </h1>
          <p className="text-xl md:text-2xl text-cyan-100/70 leading-relaxed max-w-3xl mx-auto font-light tracking-wide uppercase">
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

        {/* Feature Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 w-full max-w-4xl border-t border-white/10 pt-16 pointer-events-auto">
          {[
            { icon: Shield, label: "ENCRYPTED", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
            { icon: Cpu, label: "DISTRIBUTED", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
            { icon: Share2, label: "FEDERATED", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
            { icon: Zap, label: "REAL-TIME", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="flex flex-col items-center gap-4 group cursor-default"
            >
              <div className={`p-4 rounded-sm ${item.bg} border-t border-l-2 ${item.border} group-hover:border-current transition-all duration-300 ${item.color} group-hover:scale-110 shadow-lg`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono font-bold tracking-[0.3em] text-white/50 group-hover:text-white transition-colors duration-300">
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}