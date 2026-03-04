import { ArrowRight, Shield, Zap, Share2, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { SplineScene } from "@/components/ui/SplineScene";
import { CircularSpaceDevice } from "@/components/ui/CircularSpaceDevice";

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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-transparent">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-500/[0.01] to-transparent pointer-events-none" />

      {/* Dynamic Cosmic Auras */}
      <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div
        className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none"
        style={{ animationDelay: "1s" }}
      />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">

          {/* ── Left Content ── */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left pointer-events-none">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-cyan-100/60 mb-8 leading-relaxed max-w-2xl font-light tracking-wide uppercase"
            >
              The next evolution of social intelligence.
              <span className="text-cyan-400 font-medium block mt-2">
                Own your identity. Secure your data. Connect across galaxies.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mb-16 pointer-events-auto"
            >
              <Link to="/register">
                <button className="group relative px-8 py-4 bg-transparent border border-cyan-500/30 text-cyan-400 font-bold rounded-full overflow-hidden transition-all hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] active:scale-95">
                  <span className="relative z-10 flex items-center gap-3 tracking-[0.2em] uppercase text-sm">
                    Initialize Node <Zap className="w-4 h-4 text-cyan-400 group-hover:animate-pulse" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </Link>

              <Link to="/login">
                <button className="px-8 py-4 text-white/40 hover:text-white transition-all font-bold tracking-[0.2em] uppercase text-sm flex items-center gap-3 group">
                  Authentication{" "}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </motion.div>

            {/* Celestial Grid Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-2xl border-t border-white/5 pt-10 pointer-events-auto">
              {[
                { icon: Shield, label: "ENCRYPTED", color: "text-cyan-400" },
                { icon: Cpu, label: "DISTRIBUTED", color: "text-purple-400" },
                { icon: Share2, label: "FEDERATED", color: "text-blue-400" },
                { icon: Zap, label: "REAL-TIME", color: "text-white" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="flex flex-col items-center lg:items-start gap-3 group cursor-default"
                >
                  <div
                    className={`p-3 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-current transition-all ${item.color}`}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.3em] text-white/30 group-hover:text-white/60 transition-colors">
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── Right Column: Robot + Hologram Platform ── */}
          <div className="hidden lg:flex flex-col items-center justify-center relative h-full min-h-[700px]">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="relative flex flex-col items-center justify-end w-full"
              style={{ height: 700, transform: "translateY(-60px)" }}
            >
              {/* Holographic Field */}
              <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none z-0">
                <div className="absolute inset-0 bg-purple-500/5 blur-[120px] animate-pulse" />
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: "linear-gradient(rgba(168,85,247,0.5) 1px, transparent 1px)",
                    backgroundSize: "100% 4px",
                  }}
                />
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-full opacity-20"
                  style={{
                    background: "linear-gradient(to top, rgba(168,85,247,0.4) 0%, rgba(139,92,246,0.1) 30%, transparent 60%)",
                    clipPath: "polygon(38% 100%, 62% 100%, 100% 0%, 0% 0%)",
                    filter: "blur(40px)",
                  }}
                />
              </div>

              {/* ── Robot via SplineScene (canvas is cached — never re-loads) ── */}
              <div
                className="relative z-10 pointer-events-auto w-full overflow-hidden"
                style={{ height: 600, marginBottom: -90, transform: "translateY(-30px)" }}
              >
                <SplineScene
                  scene="https://prod.spline.design/ai6lzqNJSNRo6frt/scene.splinecode"
                  className="w-full h-full"
                  style={{ background: "transparent" }}
                  mouseX={mousePos.x}
                  mouseY={mousePos.y}
                />
              </div>

              {/* Circular Hologram Platform */}
              <div className="relative z-20 w-full flex justify-center">
                <CircularSpaceDevice size={480} />
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}